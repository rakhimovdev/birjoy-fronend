'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, MapPin, Phone, Tag, Trash2, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { AdCard } from '@/components/ads/AdCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCategoryBySlug } from '@/lib/mock-data';
import { Ad } from '@/lib/types';
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useToast } from '@/hooks/use-toast';
import { fetchAdById, fetchAds, getConditionLabel } from '@/lib/ads';
import { deleteAdminAd } from '@/lib/admin';
import { createOrderRequest } from '@/lib/orders';
import { useAdminSession } from '@/hooks/use-admin-session';

export function AdDetailsView({ adId }: { adId: string }) {
  const router = useRouter();
  const { isFavorite, user } = useAuth();
  const { locale, messages } = useI18n();
  const { toast } = useToast();
  const { isAdmin } = useAdminSession();
  const [ad, setAd] = useState<Ad | null>(null);
  const [relatedAds, setRelatedAds] = useState<Ad[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    message: '',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAd() {
      try {
        setIsLoading(true);
        const [currentAd, allAds] = await Promise.all([fetchAdById(adId), fetchAds()]);

        if (!cancelled) {
          setAd(currentAd);
          setSelectedImageIndex(0);
          setRelatedAds(
            allAds.filter((item) => item.id !== currentAd.id && item.category === currentAd.category).slice(0, 3)
          );
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAd(null);
          setRelatedAds([]);
          setError(loadError instanceof Error ? loadError.message : messages.adDetails.notFound);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAd();

    return () => {
      cancelled = true;
    };
  }, [adId, messages.adDetails.notFound]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setOrderForm((previous) => ({
      customerName: previous.customerName || user.name || '',
      customerEmail: previous.customerEmail || user.email || '',
      customerPhone: previous.customerPhone || user.phone || '',
      message: previous.message,
    }));
  }, [user]);

  if (isLoading) {
    return (
      <MarketplaceShell>
        <main className="marketplace-main">
          <div className="surface-card rounded-[1.75rem] px-6 py-12 text-center">
            <h1 className="text-2xl font-bold tracking-tight">{messages.adDetails.loading}</h1>
          </div>
        </main>
      </MarketplaceShell>
    );
  }

  if (!ad) {
    return (
      <MarketplaceShell>
        <main className="marketplace-main">
          <div className="surface-card rounded-[1.75rem] px-6 py-12 text-center">
            <h1 className="mb-3 text-2xl font-bold tracking-tight">{messages.adDetails.notFound}</h1>
            <p className="mb-8 text-muted-foreground">{error || messages.adDetails.notFound}</p>
            <Button asChild>
              <Link href="/">{messages.adDetails.backToListings}</Link>
            </Button>
          </div>
        </main>
      </MarketplaceShell>
    );
  }

  const category = getCategoryBySlug(ad.category);
  const localizedTitle = getLocalizedText(ad.title, locale);
  const localizedDescription = getLocalizedText(ad.description, locale);
  const localizedLocation = getLocalizedText(ad.location, locale);
  const localizedCategory = category ? getLocalizedText(category.name, locale) : messages.adDetails.category;
  const localizedCondition = getConditionLabel(ad.condition, locale);
  const selectedImage = ad.images[selectedImageIndex] || ad.images[0];
  const shouldDisableOptimization =
    selectedImage.startsWith('data:') || selectedImage.startsWith('blob:');
  const formattedPrice = new Intl.NumberFormat(languageMeta[locale].numberLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(ad.price);
  const postedAgo = formatDistanceToNow(new Date(ad.createdAt), {
    addSuffix: true,
    locale: languageMeta[locale].dateLocale,
  });
  const orderCopy =
    locale === 'ru'
      ? {
          title: 'Оставить заявку',
          description: 'Запрос попадет в админ-панель, и продавец сможет связаться с вами.',
          name: 'Имя',
          email: 'Email',
          phone: 'Телефон',
          message: 'Комментарий',
          messagePlaceholder: 'Например, когда вам удобно созвониться?',
          submit: 'Отправить заявку',
          successTitle: 'Заявка отправлена',
          successDescription: 'Администратор и продавец получили ваш запрос.',
          errorTitle: 'Заявка не отправлена',
          statusNote: 'После отправки заявка появится в панели администратора.',
        }
      : locale === 'en'
        ? {
            title: 'Send an order request',
            description: 'Your request will go to the admin panel so the seller can follow up.',
            name: 'Name',
            email: 'Email',
            phone: 'Phone',
            message: 'Message',
            messagePlaceholder: 'For example, what time should we contact you?',
            submit: 'Send request',
            successTitle: 'Request sent',
            successDescription: 'The admin and seller received your request.',
            errorTitle: 'Request was not sent',
            statusNote: 'After submission the request appears in the admin panel.',
          }
        : {
            title: 'Buyurtma qoldirish',
            description: 'So‘rov admin panelga tushadi va sotuvchi siz bilan bog‘lana oladi.',
            name: 'Ism',
            email: 'Email',
            phone: 'Telefon',
            message: 'Izoh',
            messagePlaceholder: 'Masalan, qachon bog‘lanish qulayligini yozing',
            submit: 'Buyurtma yuborish',
            successTitle: 'Buyurtma yuborildi',
            successDescription: 'Admin va sotuvchiga so‘rovingiz yetkazildi.',
            errorTitle: 'Buyurtma yuborilmadi',
            statusNote: 'Yuborilganidan keyin buyurtma admin panelda ko‘rinadi.',
          };
  const deleteCopy =
    locale === 'ru'
      ? {
          action: 'Удалить',
          confirmTitle: 'Удалить объявление?',
          confirmDescription:
            'Это действие необратимо. Объявление будет снято с публикации для всех пользователей.',
          confirm: 'Удалить',
          cancel: 'Отмена',
          successTitle: 'Объявление удалено',
          successDescription: 'Объявление было успешно удалено администратором.',
          errorTitle: 'Не удалось удалить объявление',
        }
      : locale === 'en'
        ? {
            action: 'Delete',
            confirmTitle: 'Delete this listing?',
            confirmDescription:
              'This action cannot be undone. The listing will be removed from the marketplace for all users.',
            confirm: 'Delete',
            cancel: 'Cancel',
            successTitle: 'Listing deleted',
            successDescription: 'The listing was removed by the admin.',
            errorTitle: 'Listing could not be deleted',
          }
        : {
            action: "O‘chirish",
            confirmTitle: "Eʼlonni o‘chirasizmi?",
            confirmDescription:
              "Bu amal qaytarilmaydi. Eʼlon barcha foydalanuvchilar uchun marketplace'dan olib tashlanadi.",
            confirm: "O‘chirish",
            cancel: 'Bekor qilish',
            successTitle: "Eʼlon o‘chirildi",
            successDescription: 'Eʼlon admin tomonidan muvaffaqiyatli olib tashlandi.',
            errorTitle: "Eʼlon o‘chirilmadi",
          };

  const handleOrderSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsOrderSubmitting(true);

    try {
      await createOrderRequest({
        adId: ad.id,
        customerName: orderForm.customerName,
        customerEmail: orderForm.customerEmail,
        customerPhone: orderForm.customerPhone,
        customerUserId: user?.id,
        message: orderForm.message,
      });

      toast({
        title: orderCopy.successTitle,
        description: orderCopy.successDescription,
      });

      setOrderForm((previous) => ({
        ...previous,
        message: '',
      }));
    } catch (submitError) {
      toast({
        title: orderCopy.errorTitle,
        description:
          submitError instanceof Error ? submitError.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsOrderSubmitting(false);
    }
  };

  const handleDeleteAd = async () => {
    if (!ad) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAdminAd(ad.id);
      toast({
        title: deleteCopy.successTitle,
        description: deleteCopy.successDescription,
      });
      router.push('/');
    } catch (deleteError) {
      toast({
        title: deleteCopy.errorTitle,
        description:
          deleteError instanceof Error ? deleteError.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <div className="mb-2 flex flex-col items-start justify-between gap-3 min-[481px]:mb-4 min-[481px]:flex-row min-[481px]:items-center">
          <Button asChild variant="ghost" className="px-0 text-primary hover:bg-transparent">
            <Link href="/">{messages.adDetails.backToListings}</Link>
          </Button>
          {isAdmin ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2 min-[481px]:w-auto" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleteCopy.action}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{deleteCopy.confirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{deleteCopy.confirmDescription}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{deleteCopy.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void handleDeleteAd()}
                    disabled={isDeleting}
                  >
                    {deleteCopy.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>

        <div className="detail-grid">
          <div className="space-y-6">
            <div className="surface-card relative aspect-[4/3] overflow-hidden rounded-[1.75rem] sm:aspect-[16/10] sm:rounded-[1.9rem]">
              <Image
                src={selectedImage}
                alt={localizedTitle}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 92vw, 64vw"
                data-ai-hint="classified product detail"
                unoptimized={shouldDisableOptimization}
              />
              {ad.isFeatured ? (
                <Badge className="absolute left-4 top-4 bg-accent font-bold text-accent-foreground">
                  {messages.adCard.featured}
                </Badge>
              ) : null}
            </div>
            {ad.images.length > 1 ? (
              <div className="grid grid-cols-3 gap-3 min-[481px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
                {ad.images.map((image, index) => (
                  <button
                    key={`${image.slice(0, 32)}-${index}`}
                    type="button"
                    className={`relative aspect-square overflow-hidden rounded-2xl border transition-colors ${index === selectedImageIndex ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                      }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <Image
                      src={image}
                      alt={`${localizedTitle} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 22vw, (max-width: 1024px) 18vw, 120px"
                      loading="lazy"
                      unoptimized={image.startsWith('data:') || image.startsWith('blob:')}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="surface-card rounded-[1.75rem] p-5 sm:rounded-[1.9rem] sm:p-6">
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">
                    {localizedCategory}
                  </p>
                  <h1 className="page-title font-bold">{localizedTitle}</h1>
                </div>
                <div className="text-xl font-bold text-primary min-[481px]:text-2xl sm:text-3xl">{formattedPrice}</div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-y py-5 text-sm text-muted-foreground min-[481px]:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.location}</p>
                    <p>{localizedLocation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.posted}</p>
                    <p>{postedAgo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.category}</p>
                    <p>{localizedCategory}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.condition}</p>
                    <p>{localizedCondition}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <h2 className="mb-3 text-xl font-semibold">{messages.adDetails.description}</h2>
                <p className="body-lead whitespace-pre-line text-muted-foreground">{localizedDescription}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="surface-card border-none shadow-none min-[900px]:sticky min-[900px]:top-24">
              <CardHeader>
                <CardTitle>{messages.adDetails.overview}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-4">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{messages.adDetails.seller}</p>
                    <p className="font-semibold">{ad.userName}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">{messages.adDetails.category}: </span>
                    {localizedCategory}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">{messages.adDetails.condition}: </span>
                    {localizedCondition}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">{messages.adDetails.location}: </span>
                    {localizedLocation}
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <p>
                      <span className="font-medium text-foreground">{messages.auth.phoneLabel}: </span>
                      {ad.sellerPhone}
                    </p>
                  </div>
                  <p>
                    <span className="font-medium text-foreground">{messages.adDetails.posted}: </span>
                    {postedAgo}
                  </p>
                </div>

                <div className="grid gap-3">
                  <Button asChild className="h-11">
                    <Link href="/ads/create">{messages.adDetails.createSimilar}</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11">
                    <Link href="/">{messages.adDetails.browseMore}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="surface-card border-none shadow-none">
              <CardHeader>
                <CardTitle>{orderCopy.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(event) => void handleOrderSubmit(event)} className="space-y-4">
                  <p className="text-sm text-muted-foreground">{orderCopy.description}</p>
                  <div className="space-y-2">
                    <Label htmlFor="order-customer-name">{orderCopy.name}</Label>
                    <Input
                      id="order-customer-name"
                      value={orderForm.customerName}
                      onChange={(event) =>
                        setOrderForm((previous) => ({
                          ...previous,
                          customerName: event.target.value,
                        }))
                      }
                      placeholder={orderCopy.name}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-customer-email">{orderCopy.email}</Label>
                    <Input
                      id="order-customer-email"
                      type="email"
                      value={orderForm.customerEmail}
                      onChange={(event) =>
                        setOrderForm((previous) => ({
                          ...previous,
                          customerEmail: event.target.value,
                        }))
                      }
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-customer-phone">{orderCopy.phone}</Label>
                    <Input
                      id="order-customer-phone"
                      value={orderForm.customerPhone}
                      onChange={(event) =>
                        setOrderForm((previous) => ({
                          ...previous,
                          customerPhone: event.target.value,
                        }))
                      }
                      placeholder="+998 90 123 45 67"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-message">{orderCopy.message}</Label>
                    <Textarea
                      id="order-message"
                      value={orderForm.message}
                      onChange={(event) =>
                        setOrderForm((previous) => ({
                          ...previous,
                          message: event.target.value,
                        }))
                      }
                      placeholder={orderCopy.messagePlaceholder}
                    />
                  </div>
                  <Button type="submit" className="h-11 w-full" disabled={isOrderSubmitting}>
                    {isOrderSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {orderCopy.submit}
                  </Button>
                  <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    {orderCopy.statusNote}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="surface-card border-none shadow-none">
              <CardHeader>
                <CardTitle>{messages.adDetails.safetyTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {messages.adDetails.safetyTips.map((tip) => (
                  <div key={tip} className="rounded-2xl bg-muted/50 p-4">
                    {tip}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {relatedAds.length > 0 ? (
          <section className="mt-12">
            <div className="mb-6 flex flex-col items-start justify-between gap-3 min-[481px]:flex-row min-[481px]:items-center">
              <h2 className="text-2xl font-bold tracking-tight">{messages.adDetails.relatedListings}</h2>
              <Button asChild variant="ghost" className="px-0 text-primary hover:bg-transparent">
                <Link href="/">{messages.adDetails.browseMore}</Link>
              </Button>
            </div>
            <div className="listing-grid">
              {relatedAds.map((item) => (
                <AdCard
                  key={item.id}
                  ad={item}
                  isFavorite={isFavorite(item.id)}
                  canDelete={isAdmin}
                  onDeleted={(deletedAdId) => {
                    setRelatedAds((previous) => previous.filter((relatedAd) => relatedAd.id !== deletedAdId));
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </MarketplaceShell>
  );
}
