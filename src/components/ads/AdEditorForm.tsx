'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wand2, ImagePlus, Loader2, Languages, ShieldCheck, AlertCircle, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { YandexLocationPicker, type YandexLocationPickerCopy } from '@/components/maps/YandexLocationPicker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { smartAdDescriptionTool } from '@/ai/flows/smart-ad-description-tool';
import { translateAdDescription } from '@/ai/flows/ad-description-translation';
import { automateAdContentModeration } from '@/ai/flows/automated-ad-content-moderation';
import { useToast } from '@/hooks/use-toast';
import { formatMessage, getLocalizedText, languageMeta } from '@/lib/i18n';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { AD_CONDITIONS, createAd, updateAd } from '@/lib/ads';
import {
  deleteUploadedAdImage,
  uploadAdImagesToImageKit,
  type UploadedAdImage,
} from '@/lib/imagekit-upload';
import { syncStoredUser } from '@/lib/auth';
import { chooseNativeImages, takeNativePhoto } from '@/lib/native-media';
import { isNativeApp } from '@/lib/native-app';
import {
  MARKETPLACE_VERTICALS,
  REAL_ESTATE_CATEGORIES,
  getCategoriesForVertical,
  getVerticalById,
  getVerticalHref,
} from '@/lib/mock-data';
import type { Ad, AdVertical } from '@/lib/types';
import type { Location, ResolvedLocation } from '@/lib/map-types';

type FormState = {
  title: string;
  vertical: AdVertical;
  category: string;
  condition: string;
  price: string;
  description: string;
  location: string;
  address: string;
  contactPhone: string;
  rooms: string;
  area: string;
  floor: string;
};

type LocationMetaState = {
  formattedAddress: string;
  city: string;
  district: string;
  country: string;
};

function buildInitialFormState(initialVertical: AdVertical = 'market'): FormState {
  const defaultCategory = getCategoriesForVertical(initialVertical)[0]?.slug || '';

  return {
    title: '',
    vertical: initialVertical,
    category: defaultCategory,
    condition: '',
    price: '',
    description: '',
    location: '',
    address: '',
    contactPhone: '',
    rooms: '',
    area: '',
    floor: '',
  };
}

function buildFormStateFromAd(ad: Ad): FormState {
  return {
    title: getLocalizedText(ad.title, 'uz'),
    vertical: ad.vertical,
    category: ad.category,
    condition: ad.condition,
    price: String(ad.price),
    description: getLocalizedText(ad.description, 'uz'),
    location: getLocalizedText(ad.location, 'uz'),
    address: getLocalizedText(ad.formattedAddress, 'uz') || getLocalizedText(ad.address, 'uz'),
    contactPhone: ad.sellerPhone,
    rooms: ad.rooms !== null ? String(ad.rooms) : '',
    area: ad.area !== null ? String(ad.area) : '',
    floor: ad.floor !== null ? String(ad.floor) : '',
  };
}

function buildUploadedImagesFromAd(ad: Ad): UploadedAdImage[] {
  return ad.images.map((image, index) => ({
    url: image,
    fileId: '',
    name: `listing-image-${index + 1}`,
    thumbnailUrl: image,
  }));
}

function normalizeVerticalInput(value: string | null | undefined): AdVertical {
  if (value === 'market' || value === 'real_estate' || value === 'food' || value === 'auto') {
    return value;
  }

  return 'market';
}

function buildInitialLocationMeta(): LocationMetaState {
  return {
    formattedAddress: '',
    city: '',
    district: '',
    country: '',
  };
}

function buildLocationMetaFromAd(ad: Ad): LocationMetaState {
  return {
    formattedAddress: getLocalizedText(ad.formattedAddress, 'uz'),
    city: getLocalizedText(ad.city, 'uz'),
    district: getLocalizedText(ad.district, 'uz'),
    country: getLocalizedText(ad.country, 'uz'),
  };
}

export function AdEditorForm({
  mode,
  initialAd,
  initialVertical = 'market',
}: {
  mode: 'create' | 'edit';
  initialAd?: Ad | null;
  initialVertical?: AdVertical;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { locale, messages } = useI18n();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [moderationResult, setModerationResult] = useState<{ flagged: boolean; reason: string } | null>(null);
  const [formData, setFormData] = useState<FormState>(() =>
    initialAd ? buildFormStateFromAd(initialAd) : buildInitialFormState(initialVertical)
  );
  const [keywords, setKeywords] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedAdImage[]>(() =>
    initialAd ? buildUploadedImagesFromAd(initialAd) : []
  );
  const [selectedMapPoint, setSelectedMapPoint] = useState<Location | null>(
    initialAd && typeof initialAd.latitude === 'number' && typeof initialAd.longitude === 'number'
      ? { lat: initialAd.latitude, lng: initialAd.longitude }
      : null
  );
  const [locationMeta, setLocationMeta] = useState<LocationMetaState>(() =>
    initialAd ? buildLocationMetaFromAd(initialAd) : buildInitialLocationMeta()
  );
  const nativeApp = isNativeApp();
  const categories = getCategoriesForVertical(formData.vertical);
  const selectedCategoryConfig = categories.find((category) => category.slug === formData.category);
  const isRealEstate = formData.vertical === 'real_estate';
  const currentVerticalConfig = getVerticalById(formData.vertical);
  const isEditMode = mode === 'edit';

  const editorCopy =
    locale === 'ru'
      ? {
          editTitle: 'Редактировать объявление',
          editDescription: 'Обновите информацию, категорию и карту, не ломая существующее объявление.',
          vertical: 'Вертикаль',
          selectVertical: 'Выберите вертикаль',
          mapTitle: 'Точка на карте',
          mapDescription: 'Ищите адрес или нажмите по карте, затем перетащите метку для точности.',
          address: 'Точный адрес',
          addressPlaceholder: 'Например, Ташкент, улица Шахрисабз, 12',
          searchAddress: 'Найти на карте',
          searchAddressPending: 'Поиск...',
          locationHint: 'Район / ориентир',
          locationHintPlaceholder: 'Например, рядом с метро Айбек',
          rooms: 'Комнаты',
          area: 'Площадь, м²',
          floor: 'Этаж',
          mapRequiredHint: 'Для жилья точка на карте обязательна.',
          selectedPoint: 'Координаты',
          notSelected: 'Не выбрано',
          myLocation: 'Моя локация',
          myLocationPending: 'Определяем...',
          geolocationDenied: 'Доступ к геолокации закрыт. Выберите точку вручную.',
          geolocationUnsupported: 'Геолокация в этом браузере недоступна.',
          geolocationError: 'Текущую локацию получить не удалось.',
          apiKeyMissing: 'NEXT_PUBLIC_YANDEX_MAPS_API_KEY не найден.',
          mapError: 'Yandex Maps не загрузился.',
          retry: 'Повторить',
          editAction: 'Сохранить изменения',
          createAction: 'Опубликовать объявление',
          updateSuccessTitle: 'Объявление обновлено',
          updateSuccessDescription: 'Изменения сохранены успешно.',
          submitRouteLabel: 'Открыть объявление',
        }
      : locale === 'en'
        ? {
            editTitle: 'Edit Listing',
            editDescription: 'Update the content, vertical, and map details without breaking the current ad.',
            vertical: 'Vertical',
            selectVertical: 'Select a vertical',
            mapTitle: 'Map location',
            mapDescription: 'Search an address or tap the map, then drag the marker to refine the location.',
            address: 'Full address',
            addressPlaceholder: 'For example, 12 Shahrisabz Street, Tashkent',
            searchAddress: 'Find on map',
            searchAddressPending: 'Searching...',
            locationHint: 'Area / landmark',
            locationHintPlaceholder: 'For example, near Oybek metro',
            rooms: 'Rooms',
            area: 'Area, m²',
            floor: 'Floor',
            mapRequiredHint: 'Real-estate listings require a selected map point.',
            selectedPoint: 'Coordinates',
            notSelected: 'Not selected',
            myLocation: 'My Location',
            myLocationPending: 'Locating...',
            geolocationDenied: 'Location access was denied. You can still place the marker manually.',
            geolocationUnsupported: 'Geolocation is not supported on this device.',
            geolocationError: 'Current location could not be resolved.',
            apiKeyMissing: 'NEXT_PUBLIC_YANDEX_MAPS_API_KEY is missing.',
            mapError: 'Yandex Maps could not be loaded.',
            retry: 'Retry',
            editAction: 'Save Changes',
            createAction: 'Publish Listing',
            updateSuccessTitle: 'Listing updated',
            updateSuccessDescription: 'Your changes were saved successfully.',
            submitRouteLabel: 'Open listing',
          }
        : {
            editTitle: 'E’lonni tahrirlash',
            editDescription: 'Mavjud e’lonni buzmasdan ma’lumot, vertikal va xarita nuqtasini yangilang.',
            vertical: 'Vertikal',
            selectVertical: 'Vertikalni tanlang',
            mapTitle: 'Xaritadagi nuqta',
            mapDescription: 'Manzilni qidiring yoki xaritaga bosib marker qo‘ying, keyin uni aniq joyga suring.',
            address: 'Aniq manzil',
            addressPlaceholder: 'Masalan, Toshkent, Shahrisabz ko‘chasi, 12',
            searchAddress: 'Xaritadan topish',
            searchAddressPending: 'Qidirilmoqda...',
            locationHint: 'Hudud / orientir',
            locationHintPlaceholder: 'Masalan, Oybek metro yaqinida',
            rooms: 'Xonalar',
            area: 'Maydon, m²',
            floor: 'Qavat',
            mapRequiredHint: 'Uy-joy e’lonlari uchun xaritadagi nuqta majburiy.',
            selectedPoint: 'Koordinatalar',
            notSelected: 'Tanlanmagan',
            myLocation: 'Mening joylashuvim',
            myLocationPending: 'Aniqlanmoqda...',
            geolocationDenied: 'Joylashuv ruxsati berilmadi. Nuqtani qo‘lda tanlashingiz mumkin.',
            geolocationUnsupported: 'Bu qurilmada geolokatsiya qo‘llab-quvvatlanmaydi.',
            geolocationError: 'Joriy joylashuvni aniqlab bo‘lmadi.',
            apiKeyMissing: 'NEXT_PUBLIC_YANDEX_MAPS_API_KEY topilmadi.',
            mapError: 'Yandex Maps yuklanmadi.',
            retry: 'Qayta urinish',
            editAction: 'O‘zgarishlarni saqlash',
            createAction: 'E’lonni chop etish',
            updateSuccessTitle: 'E’lon yangilandi',
            updateSuccessDescription: 'O‘zgarishlar muvaffaqiyatli saqlandi.',
            submitRouteLabel: 'E’lonni ochish',
          };

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
    if (!initialAd) {
      return;
    }

    setFormData(buildFormStateFromAd(initialAd));
    setUploadedImages(buildUploadedImagesFromAd(initialAd));
    setLocationMeta(buildLocationMetaFromAd(initialAd));
    setSelectedMapPoint(
      typeof initialAd.latitude === 'number' && typeof initialAd.longitude === 'number'
        ? { lat: initialAd.latitude, lng: initialAd.longitude }
        : null
    );
  }, [initialAd]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      location: previous.location || (user.location ? getLocalizedText(user.location, locale) : ''),
      contactPhone: previous.contactPhone || user.phone || '',
    }));
  }, [locale, user]);

  useEffect(() => {
    const nextCategories = getCategoriesForVertical(formData.vertical);

    if (!nextCategories.some((category) => category.slug === formData.category)) {
      setFormData((previous) => ({
        ...previous,
        category: nextCategories[0]?.slug || '',
      }));
    }
  }, [formData.category, formData.vertical]);

  const handleResolvedLocation = (resolved: ResolvedLocation) => {
    setFormData((previous) => ({
      ...previous,
      address: resolved.formattedAddress || resolved.address || previous.address,
      location: resolved.locationHint || previous.location,
    }));
    setLocationMeta({
      formattedAddress: resolved.formattedAddress || resolved.address,
      city: resolved.city,
      district: resolved.district,
      country: resolved.country,
    });
  };

  const yandexLocationPickerCopy: YandexLocationPickerCopy = {
    mapTitle: editorCopy.mapTitle,
    mapDescription: editorCopy.mapDescription,
    address: editorCopy.address,
    addressPlaceholder: editorCopy.addressPlaceholder,
    searchAddress: editorCopy.searchAddress,
    searchAddressPending: editorCopy.searchAddressPending,
    locationHint: editorCopy.locationHint,
    locationHintPlaceholder: editorCopy.locationHintPlaceholder,
    mapRequiredHint: editorCopy.mapRequiredHint,
    selectedPoint: editorCopy.selectedPoint,
    notSelected: editorCopy.notSelected,
    myLocation: editorCopy.myLocation,
    myLocationPending: editorCopy.myLocationPending,
    geolocationDenied: editorCopy.geolocationDenied,
    geolocationUnsupported: editorCopy.geolocationUnsupported,
    geolocationError: editorCopy.geolocationError,
    apiKeyMissing: editorCopy.apiKeyMissing,
    mapError: editorCopy.mapError,
    retry: editorCopy.retry,
  };

  const handleSmartImprove = async () => {
    const selectedCategory = categories.find((category) => category.slug === formData.category);

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
      filesToProcess.forEach((file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error(messages.createAd.imageFormatError);
        }

        if (file.size > 800 * 1024) {
          throw new Error(messages.createAd.imageSizeError);
        }
      });

      setIsUploadingImages(true);
      const nextImages = await uploadAdImagesToImageKit(filesToProcess);
      setUploadedImages((previous) => [...previous, ...nextImages]);
    } catch (error) {
      toast({
        title: messages.createAd.imageUploadErrorTitle,
        description: error instanceof Error ? error.message : messages.createAd.imageReadError,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImages(false);
      event.target.value = '';
    }
  };

  const handleNativeGalleryUpload = async () => {
    const availableSlots = 10 - uploadedImages.length;

    if (availableSlots <= 0) {
      toast({
        title: messages.createAd.imageLimitTitle,
        description: messages.createAd.imageLimitDescription,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploadingImages(true);
      const selectedImages = await chooseNativeImages(availableSlots);
      const nextImages = await uploadAdImagesToImageKit(selectedImages);
      setUploadedImages((previous) => [...previous, ...nextImages]);
    } catch (error) {
      toast({
        title: messages.createAd.imageUploadErrorTitle,
        description: error instanceof Error ? error.message : messages.createAd.imageReadError,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleNativeCameraUpload = async () => {
    const availableSlots = 10 - uploadedImages.length;

    if (availableSlots <= 0) {
      toast({
        title: messages.createAd.imageLimitTitle,
        description: messages.createAd.imageLimitDescription,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploadingImages(true);
      const photo = await takeNativePhoto();
      const [nextImage] = await uploadAdImagesToImageKit([photo]);

      if (!nextImage) {
        throw new Error(messages.createAd.imageReadError);
      }

      setUploadedImages((previous) => [...previous, nextImage]);
    } catch (error) {
      toast({
        title: messages.createAd.imageUploadErrorTitle,
        description: error instanceof Error ? error.message : messages.createAd.imageReadError,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeImage = (imageIndex: number) => {
    const image = uploadedImages[imageIndex];

    setUploadedImages((previous) => previous.filter((_, index) => index !== imageIndex));

    if (image?.fileId) {
      void deleteUploadedAdImage(image.fileId).catch((error) => {
        console.error('Failed to delete uploaded image:', error);
      });
    }
  };

  const handleVerticalChange = (nextVertical: string) => {
    const normalizedVertical = normalizeVerticalInput(nextVertical);
    const nextCategories = getCategoriesForVertical(normalizedVertical);

    setFormData((previous) => ({
      ...previous,
      vertical: normalizedVertical,
      category: nextCategories.some((category) => category.slug === previous.category)
        ? previous.category
        : nextCategories[0]?.slug || '',
    }));
  };

  const handleCategoryChange = (categorySlug: string) => {
    setFormData((previous) => ({
      ...previous,
      category: categorySlug,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isRealEstate && !selectedMapPoint) {
      toast({
        title: editorCopy.mapTitle,
        description: editorCopy.mapRequiredHint,
        variant: 'destructive',
      });
      return;
    }

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
        return;
      }

      const payload = {
        title: formData.title.trim(),
        vertical: formData.vertical,
        category: formData.category.trim(),
        condition: formData.condition as 'new' | 'like-new' | 'used' | 'needs-repair',
        price: Number(formData.price),
        description: formData.description.trim(),
        location: (isRealEstate ? formData.location || formData.address : formData.location).trim(),
        address: isRealEstate ? formData.address.trim() : '',
        formattedAddress: isRealEstate
          ? (locationMeta.formattedAddress || formData.address).trim()
          : '',
        city: isRealEstate ? locationMeta.city.trim() : '',
        district: isRealEstate ? locationMeta.district.trim() : '',
        country: isRealEstate ? locationMeta.country.trim() : '',
        latitude: isRealEstate ? selectedMapPoint?.lat ?? null : null,
        longitude: isRealEstate ? selectedMapPoint?.lng ?? null : null,
        propertyType:
          isRealEstate && REAL_ESTATE_CATEGORIES.some((category) => category.slug === formData.category)
            ? (formData.category as Ad['propertyType'])
            : '',
        rooms: isRealEstate && formData.rooms ? Number(formData.rooms) : null,
        area: isRealEstate && formData.area ? Number(formData.area) : null,
        floor: isRealEstate && formData.floor ? Number(formData.floor) : null,
        contactPhone: formData.contactPhone.trim(),
        images: uploadedImages,
      };

      const savedAd =
        isEditMode && initialAd
          ? await updateAd(initialAd.id, payload)
          : await createAd(payload);

      if (user) {
        syncStoredUser({
          ...user,
          phone: formData.contactPhone.trim(),
          location: {
            uz: payload.location,
            ru: payload.location,
            en: payload.location,
          },
        });
      }

      setModerationResult(null);
      toast({
        title: isEditMode ? editorCopy.updateSuccessTitle : messages.createAd.submitSuccessTitle,
        description: isEditMode
          ? editorCopy.updateSuccessDescription
          : messages.createAd.submitSuccessDescription,
      });
      router.push(isEditMode ? `/ads/${savedAd.id}` : getVerticalHref(savedAd.vertical));
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

  const editorTitle = isEditMode ? editorCopy.editTitle : messages.createAd.title;
  const editorDescription = isEditMode ? editorCopy.editDescription : messages.createAd.description;
  const editorAction = isEditMode ? editorCopy.editAction : editorCopy.createAction;

  return (
    <MarketplaceShell>
      <ProtectedRoute>
        <main className="marketplace-main">
          <div className="surface-card section-shell rounded-[1.9rem]">
            <div className="section-header">
              <div className="section-header__copy">
                <p className="section-kicker">{isEditMode ? editorCopy.editAction : messages.createAd.title}</p>
                <h1 className="page-title font-bold text-primary">{editorTitle}</h1>
                <p className="body-lead text-muted-foreground">{editorDescription}</p>
              </div>
              {currentVerticalConfig ? (
                <Badge variant="secondary" className="w-fit">
                  {getLocalizedText(currentVerticalConfig.name, locale)}
                </Badge>
              ) : null}
            </div>
          </div>

          {moderationResult?.flagged ? (
            <Alert variant="destructive">
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
                <Card className="surface-card rounded-[1.9rem] border-none shadow-none">
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

                    <div className="grid grid-cols-1 gap-4 min-[481px]:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="vertical">{editorCopy.vertical}</Label>
                        <Select value={formData.vertical} onValueChange={handleVerticalChange}>
                          <SelectTrigger id="vertical">
                            <SelectValue placeholder={editorCopy.selectVertical} />
                          </SelectTrigger>
                          <SelectContent>
                            {MARKETPLACE_VERTICALS.map((vertical) => (
                              <SelectItem key={vertical.id} value={vertical.id}>
                                {getLocalizedText(vertical.name, locale)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">{messages.createAd.category}</Label>
                        <Select value={formData.category} onValueChange={handleCategoryChange}>
                          <SelectTrigger id="category">
                            <SelectValue placeholder={messages.createAd.selectCategory} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
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

                <Card className="surface-card rounded-[1.9rem] border-none shadow-none">
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
                        {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
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

                <Card className="surface-card rounded-[1.9rem] border-none shadow-none">
                  <CardHeader>
                    <CardTitle>{messages.createAd.location}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isRealEstate ? (
                      <>
                        <div className="grid gap-4 min-[481px]:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="rooms">{editorCopy.rooms}</Label>
                            <Input
                              id="rooms"
                              type="number"
                              min="0"
                              value={formData.rooms}
                              onChange={(event) =>
                                setFormData((previous) => ({ ...previous, rooms: event.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="area">{editorCopy.area}</Label>
                            <Input
                              id="area"
                              type="number"
                              min="0"
                              value={formData.area}
                              onChange={(event) =>
                                setFormData((previous) => ({ ...previous, area: event.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="floor">{editorCopy.floor}</Label>
                            <Input
                              id="floor"
                              type="number"
                              min="0"
                              value={formData.floor}
                              onChange={(event) =>
                                setFormData((previous) => ({ ...previous, floor: event.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <YandexLocationPicker
                          value={selectedMapPoint}
                          address={formData.address}
                          locationHint={formData.location}
                          locale={locale}
                          copy={yandexLocationPickerCopy}
                          onChange={setSelectedMapPoint}
                          onAddressChange={(value) => {
                            setFormData((previous) => ({ ...previous, address: value }));
                            setLocationMeta((previous) => ({
                              ...previous,
                              formattedAddress: value,
                            }));
                          }}
                          onLocationHintChange={(value) => {
                            setFormData((previous) => ({ ...previous, location: value }));
                            setLocationMeta((previous) => ({
                              ...previous,
                              district: value,
                            }));
                          }}
                          onResolvedLocationChange={handleResolvedLocation}
                        />
                      </>
                    ) : (
                      <div className="grid gap-4 min-[481px]:grid-cols-2">
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
                      </div>
                    )}

                    {isRealEstate ? (
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
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="page-stack">
                <Card className="surface-card rounded-[1.9rem] border-none shadow-none">
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
                      {nativeApp ? (
                        <>
                          <button
                            type="button"
                            className="upload-tile disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => void handleNativeGalleryUpload()}
                            disabled={isUploadingImages}
                          >
                            {isUploadingImages ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                            <span className="text-xs">{nativeMediaCopy[locale].gallery}</span>
                          </button>
                          <button
                            type="button"
                            className="upload-tile disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => void handleNativeCameraUpload()}
                            disabled={isUploadingImages}
                          >
                            {isUploadingImages ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
                            <span className="text-xs">{nativeMediaCopy[locale].camera}</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="upload-tile disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImages}
                        >
                          {isUploadingImages ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                          <span className="text-xs">{messages.createAd.addPhoto}</span>
                        </button>
                      )}
                      {uploadedImages.map((image, index) => (
                        <div
                          key={`${image.fileId || image.url.slice(0, 32)}-${index}`}
                          className="relative aspect-square overflow-hidden rounded-[1.3rem] border border-border/70 bg-muted/30 shadow-[0_12px_24px_rgba(7,28,85,0.06)]"
                        >
                          <Image
                            src={image.thumbnailUrl || image.url}
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

                <div className="surface-card rounded-[1.9rem] p-4 min-[900px]:sticky min-[900px]:top-24">
                  <div className="soft-panel mb-4 space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between gap-3">
                      <span>{messages.createAd.category}</span>
                      <span className="font-semibold text-foreground">
                        {selectedCategoryConfig
                          ? getLocalizedText(selectedCategoryConfig.name, locale)
                          : messages.createAd.selectCategory}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{messages.createAd.media}</span>
                      <span className="font-semibold text-foreground">{uploadedImages.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{messages.createAd.location}</span>
                      <span className="max-w-[11rem] truncate text-right font-semibold text-foreground">
                        {isRealEstate
                          ? selectedMapPoint
                            ? `${selectedMapPoint.lat}, ${selectedMapPoint.lng}`
                            : editorCopy.notSelected
                          : formData.location || messages.createAd.locationPlaceholder}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full gap-2 rounded-2xl text-lg font-bold"
                    disabled={loading || isUploadingImages}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                    {editorAction}
                  </Button>
                  {isEditMode && initialAd ? (
                    <Button asChild variant="outline" className="mt-3 h-11 w-full rounded-2xl">
                      <Link href={`/ads/${initialAd.id}`}>{editorCopy.submitRouteLabel}</Link>
                    </Button>
                  ) : null}
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
