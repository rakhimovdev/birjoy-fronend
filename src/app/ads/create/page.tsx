'use client';

import Image from 'next/image';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES, getCategoryBySlug } from '@/lib/mock-data';
import { Wand2, ImagePlus, Loader2, Languages, ShieldCheck, AlertCircle, X } from 'lucide-react';
import { smartAdDescriptionTool } from '@/ai/flows/smart-ad-description-tool';
import { translateAdDescription } from '@/ai/flows/ad-description-translation';
import { automateAdContentModeration } from '@/ai/flows/automated-ad-content-moderation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatMessage, getLocalizedText, languageMeta } from '@/lib/i18n';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { AD_CONDITIONS, createAd } from '@/lib/ads';
import { syncStoredUser } from '@/lib/auth';
import { chooseNativeImages, takeNativePhoto } from '@/lib/native-media';
import { isNativeAndroidApp } from '@/lib/native-app';

export default function CreateAdPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CreateAdPageContent />
    </Suspense>
  );
}

function CreateAdPageContent() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { locale, messages } = useI18n();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [moderationResult, setModerationResult] = useState<{ flagged: boolean; reason: string } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    condition: '',
    price: '',
    description: '',
    location: '',
    contactPhone: '',
  });
  const [keywords, setKeywords] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const nativeAndroidApp = isNativeAndroidApp();

  const nativeMediaCopy = {
    uz: {
      camera: 'Kamera',
      gallery: 'Galereya',
    },
    ru: {
      camera: 'Камера',
      gallery: 'Галерея',
    },
    en: {
      camera: 'Camera',
      gallery: 'Gallery',
    },
  } as const;

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      location:
        previous.location || (user.location ? getLocalizedText(user.location, locale) : ''),
      contactPhone: previous.contactPhone || user.phone || '',
    }));
  }, [locale, user]);

  const handleSmartImprove = async () => {
    const selectedCategory = getCategoryBySlug(formData.category);

    if (!formData.title || !selectedCategory) {
      toast({
        title: messages.createAd.missingInfoTitle,
        description: messages.createAd.missingInfoDescription,
        variant: 'destructive',
      });
      return;
    }

    setAiLoading(true);
    try {
      const result = await smartAdDescriptionTool({
        title: formData.title,
        category: selectedCategory.name.en,
        description: formData.description,
      });

      setFormData((previous) => ({
        ...previous,
        description: result.suggestedDescriptionImprovements,
      }));
      setKeywords(result.relevantKeywords);

      toast({
        title: messages.createAd.improveSuccessTitle,
        description: messages.createAd.improveSuccessDescription,
      });
    } catch {
      toast({
        title: messages.createAd.aiErrorTitle,
        description: messages.createAd.aiErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleTranslateDescription = async () => {
    if (!formData.description) {
      return;
    }

    setAiLoading(true);
    try {
      const result = await translateAdDescription({
        description: formData.description,
        targetLanguage: languageMeta[locale].aiLanguageName,
      });

      setFormData((previous) => ({
        ...previous,
        description: `${previous.description}\n\n[${languageMeta[locale].label}]: ${result.translatedDescription}`,
      }));
    } catch {
      toast({
        title: messages.createAd.translationError,
        variant: 'destructive',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    const availableSlots = 10 - uploadedImages.length;

    if (availableSlots <= 0) {
      toast({
        title: messages.createAd.imageLimitTitle,
        description: messages.createAd.imageLimitDescription,
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    const filesToProcess = selectedFiles.slice(0, availableSlots);

    try {
      const nextImages = await Promise.all(
        filesToProcess.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              if (!file.type.startsWith('image/')) {
                reject(new Error(messages.createAd.imageFormatError));
                return;
              }

              if (file.size > 800 * 1024) {
                reject(new Error(messages.createAd.imageSizeError));
                return;
              }

              const reader = new FileReader();

              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  resolve(reader.result);
                  return;
                }

                reject(new Error(messages.createAd.imageReadError));
              };

              reader.onerror = () => reject(new Error(messages.createAd.imageReadError));
              reader.readAsDataURL(file);
            })
        )
      );

      setUploadedImages((previous) => [...previous, ...nextImages]);

      if (selectedFiles.length > availableSlots) {
        toast({
          title: messages.createAd.imageLimitTitle,
          description: messages.createAd.imageLimitDescription,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: messages.createAd.imageUploadErrorTitle,
        description: error instanceof Error ? error.message : messages.createAd.imageReadError,
        variant: 'destructive',
      });
    } finally {
      event.target.value = '';
    }
  };

  const removeImage = (imageIndex: number) => {
    setUploadedImages((previous) => previous.filter((_, index) => index !== imageIndex));
  };

  const getAvailableSlots = () => 10 - uploadedImages.length;

  const handleNativeGalleryUpload = async () => {
    const availableSlots = getAvailableSlots();

    if (availableSlots <= 0) {
      toast({
        title: messages.createAd.imageLimitTitle,
        description: messages.createAd.imageLimitDescription,
        variant: 'destructive',
      });
      return;
    }

    try {
      const nextImages = await chooseNativeImages(availableSlots);
      setUploadedImages((previous) => [...previous, ...nextImages]);
    } catch (error) {
      toast({
        title: messages.createAd.imageUploadErrorTitle,
        description: error instanceof Error ? error.message : messages.createAd.imageReadError,
        variant: 'destructive',
      });
    }
  };

  const handleNativeCameraUpload = async () => {
    const availableSlots = getAvailableSlots();

    if (availableSlots <= 0) {
      toast({
        title: messages.createAd.imageLimitTitle,
        description: messages.createAd.imageLimitDescription,
        variant: 'destructive',
      });
      return;
    }

    try {
      const photo = await takeNativePhoto();
      setUploadedImages((previous) => [...previous, photo]);
    } catch (error) {
      toast({
        title: messages.createAd.imageUploadErrorTitle,
        description: error instanceof Error ? error.message : messages.createAd.imageReadError,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const moderation = await automateAdContentModeration({
        title: formData.title,
        description: formData.description,
      });

      if (moderation.flagged) {
        setModerationResult(moderation);
        toast({
          title: messages.createAd.moderationToastTitle,
          description: messages.createAd.moderationToastDescription,
          variant: 'destructive',
        });
      } else {
        await createAd({
          title: formData.title.trim(),
          category: formData.category.trim(),
          condition: formData.condition as 'new' | 'like-new' | 'used' | 'needs-repair',
          price: Number(formData.price),
          description: formData.description.trim(),
          location: formData.location.trim(),
          contactPhone: formData.contactPhone.trim(),
          images: uploadedImages,
        });

        if (user) {
          syncStoredUser({
            ...user,
            phone: formData.contactPhone.trim(),
            location: {
              uz: formData.location.trim(),
              ru: formData.location.trim(),
              en: formData.location.trim(),
            },
          });
        }

        setModerationResult(null);
        toast({
          title: messages.createAd.submitSuccessTitle,
          description: messages.createAd.submitSuccessDescription,
        });
        router.push('/');
      }
    } catch (error) {
      toast({
        title: messages.createAd.submitError,
        description: error instanceof Error ? error.message : messages.createAd.submitError,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketplaceShell>
      <ProtectedRoute>
        <main className="marketplace-main">
          <div className="surface-card rounded-[1.75rem] px-5 py-6 sm:px-6">
            <h1 className="page-title mb-3 font-bold text-primary">{messages.createAd.title}</h1>
            <p className="body-lead text-muted-foreground">{messages.createAd.description}</p>
          </div>

          {moderationResult?.flagged ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{messages.createAd.moderationTitle}</AlertTitle>
              <AlertDescription>
                {formatMessage(messages.createAd.moderationDescription, {
                  reason: moderationResult.reason,
                })}
              </AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="page-stack">
            <div className="two-pane-grid">
              <div className="page-stack">
                <Card className="surface-card rounded-[1.75rem] border-none shadow-none">
                  <CardHeader>
                    <CardTitle>{messages.createAd.basicInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">{messages.createAd.adTitle}</Label>
                      <Input
                        id="title"
                        placeholder={messages.createAd.adTitlePlaceholder}
                        value={formData.title}
                        onChange={(event) =>
                          setFormData((previous) => ({ ...previous, title: event.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 min-[481px]:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="category">{messages.createAd.category}</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) =>
                            setFormData((previous) => ({ ...previous, category: value }))
                          }
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder={messages.createAd.selectCategory} />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((category) => (
                              <SelectItem key={category.id} value={category.slug}>
                                {getLocalizedText(category.name, locale)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">{messages.createAd.price}</Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(event) =>
                            setFormData((previous) => ({ ...previous, price: event.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="condition">{messages.createAd.condition}</Label>
                        <Select
                          value={formData.condition}
                          onValueChange={(value) =>
                            setFormData((previous) => ({ ...previous, condition: value }))
                          }
                        >
                          <SelectTrigger id="condition">
                            <SelectValue placeholder={messages.createAd.selectCondition} />
                          </SelectTrigger>
                          <SelectContent>
                            {AD_CONDITIONS.map((condition) => (
                              <SelectItem key={condition.value} value={condition.value}>
                                {getLocalizedText(condition.label, locale)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="surface-card rounded-[1.75rem] border-none shadow-none">
                  <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 min-[640px]:flex-row min-[640px]:items-center">
                    <div className="space-y-1">
                      <CardTitle>{messages.createAd.descriptionTitle}</CardTitle>
                      <CardDescription>{messages.createAd.descriptionHelp}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1 border-primary/20 text-primary hover:bg-primary/5"
                        onClick={handleSmartImprove}
                        disabled={aiLoading}
                      >
                        {aiLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        {messages.createAd.smartImprove}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={handleTranslateDescription}
                        disabled={aiLoading || !formData.description}
                      >
                        <Languages className="h-3 w-3" />
                        {messages.createAd.translateDescription}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder={messages.createAd.descriptionPlaceholder}
                      className="min-h-[180px] sm:min-h-[200px]"
                      value={formData.description}
                      onChange={(event) =>
                        setFormData((previous) => ({ ...previous, description: event.target.value }))
                      }
                      required
                    />
                    {keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="mr-2 text-sm font-medium text-muted-foreground">
                          {messages.createAd.keywords}
                        </span>
                        {keywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="surface-card rounded-[1.75rem] border-none shadow-none">
                  <CardHeader>
                    <CardTitle>{messages.createAd.location}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 min-[481px]:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="location">{messages.createAd.location}</Label>
                      <Input
                        id="location"
                        placeholder={messages.createAd.locationPlaceholder}
                        value={formData.location}
                        onChange={(event) =>
                          setFormData((previous) => ({ ...previous, location: event.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">{messages.auth.phoneLabel}</Label>
                      <Input
                        id="contactPhone"
                        placeholder={messages.auth.phonePlaceholder}
                        value={formData.contactPhone}
                        onChange={(event) =>
                          setFormData((previous) => ({ ...previous, contactPhone: event.target.value }))
                        }
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="page-stack">
                <Card className="surface-card rounded-[1.75rem] border-none shadow-none">
                  <CardHeader>
                    <CardTitle>{messages.createAd.media}</CardTitle>
                    <CardDescription>{messages.createAd.mediaDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 min-[481px]:grid-cols-3 min-[900px]:grid-cols-2 xl:grid-cols-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      {nativeAndroidApp ? (
                        <>
                          <button
                            type="button"
                            className="flex aspect-square min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 text-center text-muted-foreground transition-colors hover:bg-muted/50"
                            onClick={() => void handleNativeGalleryUpload()}
                          >
                            <ImagePlus className="h-6 w-6" />
                            <span className="text-xs">{nativeMediaCopy[locale].gallery}</span>
                          </button>
                          <button
                            type="button"
                            className="flex aspect-square min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 text-center text-muted-foreground transition-colors hover:bg-muted/50"
                            onClick={() => void handleNativeCameraUpload()}
                          >
                            <ShieldCheck className="h-6 w-6" />
                            <span className="text-xs">{nativeMediaCopy[locale].camera}</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="flex aspect-square min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 text-center text-muted-foreground transition-colors hover:bg-muted/50"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImagePlus className="h-6 w-6" />
                          <span className="text-xs">{messages.createAd.addPhoto}</span>
                        </button>
                      )}
                      {uploadedImages.map((image, index) => (
                        <div key={`${image.slice(0, 32)}-${index}`} className="relative aspect-square overflow-hidden rounded-2xl border bg-muted/30">
                          <Image
                            src={image}
                            alt={`${messages.createAd.addPhoto} ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 44vw, (max-width: 1024px) 28vw, 18vw"
                            unoptimized
                          />
                          <button
                            type="button"
                            className="touch-target absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/75"
                            onClick={() => removeImage(index)}
                            aria-label={messages.createAd.removePhoto}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {messages.createAd.imageUploadHint.replace('{count}', String(uploadedImages.length))}
                    </p>
                  </CardContent>
                </Card>

                <div className="surface-card rounded-[1.75rem] p-4 min-[900px]:sticky min-[900px]:top-24">
                  <Button type="submit" className="h-12 w-full gap-2 rounded-2xl text-lg font-bold" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-5 w-5" />
                    )}
                    {messages.createAd.publish}
                  </Button>
                  <p className="mt-4 text-center text-xs text-muted-foreground">{messages.createAd.terms}</p>
                </div>
              </div>
            </div>
          </form>
        </main>
      </ProtectedRoute>
    </MarketplaceShell>
  );
}
