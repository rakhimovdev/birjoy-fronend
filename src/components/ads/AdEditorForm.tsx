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
import { AD_CONDITIONS, createAd, updateAd, type CreateAdInput } from '@/lib/ads';
import {
  deleteUploadedAdImage,
  uploadAdImagesToImageKit,
  type UploadedAdImage,
} from '@/lib/imagekit-upload';
import { restoreAuthSession, syncStoredUser } from '@/lib/auth';
import { chooseNativeImages, takeNativePhoto } from '@/lib/native-media';
import { isNativeApp } from '@/lib/native-app';
import {
  getRealEstateListingTypeLabel,
  REAL_ESTATE_LISTING_TYPE_ORDER,
} from '@/lib/real-estate-listing-types';
import {
  MARKETPLACE_VERTICALS,
  REAL_ESTATE_CATEGORIES,
  getCategoriesForVertical,
  getVerticalById,
  getVerticalHref,
} from '@/lib/mock-data';
import {
  AUTO_FUEL_OPTIONS,
  AUTO_SPECIAL_EQUIPMENT_SUGGESTIONS,
  AUTO_TRANSMISSION_OPTIONS,
  buildManufactureYears,
  getAutoEngineUnitForCategory,
  isMotorcycleCategory,
  isSpecialEquipmentCategory,
  isSparePartsCategory,
  normalizeAutoCategory,
  shouldShowAutoEngineField,
  shouldShowAutoFuelField,
  shouldShowAutoMileageField,
  shouldShowAutoTransmissionField,
  shouldShowAutoYearField,
  shouldShowCompatibleModelField,
  shouldShowSpecialEquipmentTypeField,
} from '@/lib/auto-config';
import type { Ad, AdVertical, RealEstateListingType, UserProfile } from '@/lib/types';
import type { Location, ResolvedLocation } from '@/lib/map-types';
import {
  UZBEKISTAN_REGION_OPTIONS,
  buildFullAddress,
  buildLocationLabel,
  findDistrictByText,
  findRegionByText,
  getDistrictsForRegion,
  stripLocationPrefix,
} from '@/lib/uzbekistan-regions';

type FormState = {
  title: string;
  vertical: AdVertical;
  category: string;
  condition: string;
  price: string;
  description: string;
  location: string;
  address: string;
  region: string;
  district: string;
  contactPhone: string;
  listingType: RealEstateListingType | '';
  rooms: string;
  area: string;
  floor: string;
  fuelType: string;
  manufactureYear: string;
  engineDisplacement: string;
  engineUnit: string;
  mileage: string;
  transmission: string;
  specialEquipmentType: string;
  compatibleModel: string;
};

type LocationMetaState = {
  formattedAddress: string;
  city: string;
  district: string;
  country: string;
};

const DEFAULT_COUNTRY = 'O‘zbekiston';

function buildInitialFormState(initialVertical: AdVertical = 'market'): FormState {
  const defaultCategory = getCategoriesForVertical(initialVertical)[0]?.slug || '';
  const defaultEngineUnit = initialVertical === 'auto' ? getAutoEngineUnitForCategory(defaultCategory) : '';

  return {
    title: '',
    vertical: initialVertical,
    category: defaultCategory,
    condition: '',
    price: '',
    description: '',
    location: '',
    address: '',
    region: '',
    district: '',
    contactPhone: '',
    listingType: initialVertical === 'real_estate' ? 'sale' : '',
    rooms: '',
    area: '',
    floor: '',
    fuelType: '',
    manufactureYear: '',
    engineDisplacement: '',
    engineUnit: defaultEngineUnit,
    mileage: '',
    transmission: '',
    specialEquipmentType: '',
    compatibleModel: '',
  };
}

function buildFormStateFromAd(ad: Ad): FormState {
  const savedLocation = getLocalizedText(ad.location, 'uz');
  const savedAddress = getLocalizedText(ad.formattedAddress, 'uz') || getLocalizedText(ad.address, 'uz');
  const region = getLocalizedText(ad.city, 'uz') || findRegionByText([savedAddress, savedLocation].join(', '));
  const district =
    getLocalizedText(ad.district, 'uz') ||
    (region ? findDistrictByText(region, [savedAddress, savedLocation].join(', ')) : '');

  return {
    title: getLocalizedText(ad.title, 'uz'),
    vertical: ad.vertical,
    category: ad.category,
    condition: ad.condition,
    price: String(ad.price),
    description: getLocalizedText(ad.description, 'uz'),
    location: savedLocation || buildLocationLabel({ region, district }),
    address: stripLocationPrefix(savedAddress, region, district),
    region,
    district,
    contactPhone: ad.sellerPhone,
    listingType: ad.vertical === 'real_estate' ? ad.listingType || 'sale' : '',
    rooms: ad.rooms !== null ? String(ad.rooms) : '',
    area: ad.area !== null ? String(ad.area) : '',
    floor: ad.floor !== null ? String(ad.floor) : '',
    fuelType: ad.fuelType || '',
    manufactureYear: ad.manufactureYear !== null ? String(ad.manufactureYear) : '',
    engineDisplacement: ad.engineDisplacement !== null ? String(ad.engineDisplacement) : '',
    engineUnit: ad.engineUnit || getAutoEngineUnitForCategory(ad.category),
    mileage: ad.mileage !== null ? String(ad.mileage) : '',
    transmission: ad.transmission || '',
    specialEquipmentType: ad.specialEquipmentType || '',
    compatibleModel: ad.compatibleModel || '',
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
    country: DEFAULT_COUNTRY,
  };
}

function buildLocationMetaFromAd(ad: Ad): LocationMetaState {
  return {
    formattedAddress: getLocalizedText(ad.formattedAddress, 'uz'),
    city: getLocalizedText(ad.city, 'uz'),
    district: getLocalizedText(ad.district, 'uz'),
    country: getLocalizedText(ad.country, 'uz') || DEFAULT_COUNTRY,
  };
}

function requiresAdminPostingApproval(vertical: AdVertical) {
  return vertical === 'market' || vertical === 'food';
}

function hasPostingPermission(user: UserProfile | null, vertical: AdVertical) {
  if (!requiresAdminPostingApproval(vertical)) {
    return true;
  }

  if (!user) {
    return false;
  }

  return vertical === 'market'
    ? Boolean(user.postingPermissions?.market)
    : Boolean(user.postingPermissions?.food);
}

export function AdEditorForm({
  mode,
  initialAd,
  initialVertical = 'market',
  preferAccessibleVertical = false,
}: {
  mode: 'create' | 'edit';
  initialAd?: Ad | null;
  initialVertical?: AdVertical;
  preferAccessibleVertical?: boolean;
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
  const isAutoVertical = formData.vertical === 'auto';
  const normalizedCategory = normalizeAutoCategory(formData.category);
  const shouldShowVehicleFuelField = isAutoVertical && shouldShowAutoFuelField(normalizedCategory);
  const shouldShowVehicleYearField = isAutoVertical && shouldShowAutoYearField(normalizedCategory);
  const shouldShowVehicleEngineField = isAutoVertical && shouldShowAutoEngineField(normalizedCategory);
  const shouldShowVehicleMileageField = isAutoVertical && shouldShowAutoMileageField(normalizedCategory);
  const shouldShowVehicleTransmissionField = isAutoVertical && shouldShowAutoTransmissionField(normalizedCategory);
  const shouldShowVehicleSpecialEquipmentField = isAutoVertical && shouldShowSpecialEquipmentTypeField(normalizedCategory);
  const shouldShowVehicleCompatibleModelField = isAutoVertical && shouldShowCompatibleModelField(normalizedCategory);
  const isVehicleMotorcycle = isAutoVertical && isMotorcycleCategory(normalizedCategory);
  const isVehicleSpecialEquipment = isAutoVertical && isSpecialEquipmentCategory(normalizedCategory);
  const isVehicleSpareParts = isAutoVertical && isSparePartsCategory(normalizedCategory);
  const regionOptions = UZBEKISTAN_REGION_OPTIONS.map((option) => option.name);
  const selectedDistrictOptions = getDistrictsForRegion(formData.region);
  const selectedLocationLabel = buildLocationLabel({
    region: formData.region,
    district: formData.district,
  });
  const currentVerticalConfig = getVerticalById(formData.vertical);
  const isEditMode = mode === 'edit';
  const isTransitioningIntoApprovalGatedVertical =
    !isEditMode
      ? requiresAdminPostingApproval(formData.vertical)
      : Boolean(initialAd) &&
      formData.vertical !== initialAd?.vertical &&
      requiresAdminPostingApproval(formData.vertical);
  const hasSelectedVerticalPostingAccess = hasPostingPermission(user, formData.vertical);
  const isPostingBlocked = isTransitioningIntoApprovalGatedVertical && !hasSelectedVerticalPostingAccess;
  const currentVerticalLabel = currentVerticalConfig
    ? getLocalizedText(currentVerticalConfig.name, locale)
    : formData.vertical;

  const editorCopy =
    locale === 'ru'
      ? {
        editTitle: 'Редактировать объявление',
        editDescription: 'Обновите информацию, категорию и карту, не ломая существующее объявление.',
        vertical: 'Вертикаль',
        selectVertical: 'Выберите вертикаль',
        mapTitle: 'Точка на карте',
        mapDescription: 'Ищите адрес или нажмите по карте, затем перетащите метку для точности.',
        regionLabel: 'Область',
        regionPlaceholder: 'Выберите область',
        districtLabel: 'Район',
        districtPlaceholder: 'Выберите район',
        streetAddressLabel: 'Улица и дом',
        streetAddressPlaceholder: 'Например, улица Шахрисабз, 12',
        searchAddress: 'Найти на карте',
        searchAddressPending: 'Поиск...',
        locationSelectRequired: 'Сначала выберите область и район.',
        listingType: 'Тип сделки',
        selectListingType: 'Выберите тип сделки',
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
          regionLabel: 'Region',
          regionPlaceholder: 'Select a region',
          districtLabel: 'District',
          districtPlaceholder: 'Select a district',
          streetAddressLabel: 'Street and house',
          streetAddressPlaceholder: 'For example, 12 Shahrisabz Street',
          searchAddress: 'Find on map',
          searchAddressPending: 'Searching...',
          locationSelectRequired: 'Please select a region and district first.',
          listingType: 'Deal type',
          selectListingType: 'Select deal type',
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
          regionLabel: 'Viloyat',
          regionPlaceholder: 'Viloyatni tanlang',
          districtLabel: 'Tuman',
          districtPlaceholder: 'Tumanni tanlang',
          streetAddressLabel: 'Ko‘cha va uy',
          streetAddressPlaceholder: 'Masalan, Shahrisabz ko‘chasi, 12',
          searchAddress: 'Xaritadan topish',
          searchAddressPending: 'Qidirilmoqda...',
          locationSelectRequired: 'Avval viloyat va tumanni tanlang.',
          listingType: 'Bitim turi',
          selectListingType: 'Bitim turini tanlang',
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

  const postingAccessCopy =
    locale === 'ru'
      ? {
        title: 'Нужно одобрение администратора',
        description: `Публикация в разделе "${currentVerticalLabel}" доступна только пользователям, которых одобрил администратор.`,
      }
      : locale === 'en'
        ? {
          title: 'Admin approval required',
          description: `Posting in "${currentVerticalLabel}" is available only to users approved by an admin.`,
        }
        : {
          title: 'Admin ruxsati kerak',
          description: `"${currentVerticalLabel}" bo‘limiga e’lon joylash faqat admin ruxsat bergan foydalanuvchilar uchun ochiq.`,
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
    void restoreAuthSession();
  }, []);

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
      location:
        previous.vertical === 'real_estate'
          ? previous.location
          : previous.location || (user.location ? getLocalizedText(user.location, locale) : ''),
      contactPhone: previous.contactPhone || user.phone || '',
    }));
  }, [locale, user]);

  useEffect(() => {
    if (isEditMode || !preferAccessibleVertical || !user) {
      return;
    }

    if (!requiresAdminPostingApproval(formData.vertical) || hasPostingPermission(user, formData.vertical)) {
      return;
    }

    const fallbackVertical: AdVertical = 'real_estate';
    const nextCategories = getCategoriesForVertical(fallbackVertical);

    setFormData((previous) => ({
      ...previous,
      vertical: fallbackVertical,
      category: nextCategories[0]?.slug || previous.category,
      listingType: 'sale',
    }));
  }, [formData.vertical, isEditMode, preferAccessibleVertical, user]);

  useEffect(() => {
    const nextCategories = getCategoriesForVertical(formData.vertical);

    if (!nextCategories.some((category) => category.slug === formData.category)) {
      setFormData((previous) => ({
        ...previous,
        category: nextCategories[0]?.slug || '',
      }));
    }
  }, [formData.category, formData.vertical]);

  const syncRealEstateLocationMeta = (region: string, district: string, addressLine: string) => {
    setLocationMeta((previous) => ({
      ...previous,
      formattedAddress: buildFullAddress({
        region,
        district,
        addressLine,
      }),
      city: region,
      district,
      country: DEFAULT_COUNTRY,
    }));
  };

  const handleResolvedLocation = (resolved: ResolvedLocation) => {
    const resolvedText = [
      resolved.city,
      resolved.district,
      resolved.formattedAddress,
      resolved.address,
    ]
      .filter(Boolean)
      .join(', ');
    const nextRegion = formData.region || findRegionByText(resolvedText);
    const nextDistrict =
      formData.district || (nextRegion ? findDistrictByText(nextRegion, resolvedText) : '');
    const nextAddressLine = stripLocationPrefix(
      resolved.formattedAddress || resolved.address,
      nextRegion,
      nextDistrict
    );

    setFormData((previous) => ({
      ...previous,
      region: nextRegion || previous.region,
      district: nextDistrict || previous.district,
      location:
        buildLocationLabel({
          region: nextRegion || previous.region,
          district: nextDistrict || previous.district,
        }) || previous.location,
      address: nextAddressLine || previous.address,
    }));
    setLocationMeta({
      formattedAddress:
        resolved.formattedAddress ||
        resolved.address ||
        buildFullAddress({
          region: nextRegion || formData.region,
          district: nextDistrict || formData.district,
          addressLine: nextAddressLine || formData.address,
        }),
      city: nextRegion || resolved.city || formData.region,
      district: nextDistrict || resolved.district || formData.district,
      country: resolved.country || DEFAULT_COUNTRY,
    });
  };

  const yandexLocationPickerCopy: YandexLocationPickerCopy = {
    mapTitle: editorCopy.mapTitle,
    mapDescription: editorCopy.mapDescription,
    regionLabel: editorCopy.regionLabel,
    regionPlaceholder: editorCopy.regionPlaceholder,
    districtLabel: editorCopy.districtLabel,
    districtPlaceholder: editorCopy.districtPlaceholder,
    streetAddressLabel: editorCopy.streetAddressLabel,
    streetAddressPlaceholder: editorCopy.streetAddressPlaceholder,
    searchAddress: editorCopy.searchAddress,
    searchAddressPending: editorCopy.searchAddressPending,
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

  const resolveImageUploadErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) {
      return messages.createAd.imageReadError;
    }

    const normalizedMessage = error.message.trim().toLowerCase();

    if (!normalizedMessage || normalizedMessage === 'load failed' || normalizedMessage === 'failed to fetch') {
      return messages.createAd.imageReadError;
    }

    return error.message;
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
      });

      setIsUploadingImages(true);
      const nextImages = await uploadAdImagesToImageKit(filesToProcess);
      setUploadedImages((previous) => [...previous, ...nextImages]);
    } catch (error) {
      toast({
        title: messages.createAd.imageUploadErrorTitle,
        description: resolveImageUploadErrorMessage(error),
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
        description: resolveImageUploadErrorMessage(error),
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
        description: resolveImageUploadErrorMessage(error),
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
      listingType: normalizedVertical === 'real_estate' ? previous.listingType || 'sale' : '',
      fuelType: normalizedVertical === 'auto' ? '' : '',
      manufactureYear: '',
      engineDisplacement: '',
      engineUnit: normalizedVertical === 'auto' ? getAutoEngineUnitForCategory(nextCategories[0]?.slug || '') : '',
      mileage: '',
      transmission: '',
      specialEquipmentType: '',
      compatibleModel: '',
    }));
  };

  const handleCategoryChange = (categorySlug: string) => {
    setFormData((previous) => {
      const normalizedCategoryValue = normalizeAutoCategory(categorySlug);
      const shouldKeepCompatibleModel = isSparePartsCategory(normalizedCategoryValue);

      return {
        ...previous,
        category: categorySlug,
        fuelType: shouldShowAutoFuelField(normalizedCategoryValue) ? '' : '',
        manufactureYear: shouldShowAutoYearField(normalizedCategoryValue) ? '' : '',
        engineDisplacement: shouldShowAutoEngineField(normalizedCategoryValue) ? '' : '',
        engineUnit: shouldShowAutoEngineField(normalizedCategoryValue)
          ? getAutoEngineUnitForCategory(normalizedCategoryValue)
          : '',
        mileage: shouldShowAutoMileageField(normalizedCategoryValue) ? '' : '',
        transmission: shouldShowAutoTransmissionField(normalizedCategoryValue) ? '' : '',
        specialEquipmentType: shouldShowSpecialEquipmentTypeField(normalizedCategoryValue) ? '' : '',
        compatibleModel: shouldKeepCompatibleModel ? previous.compatibleModel : '',
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isPostingBlocked) {
      toast({
        title: postingAccessCopy.title,
        description: postingAccessCopy.description,
        variant: 'destructive',
      });
      return;
    }

    if (isRealEstate && (!formData.region.trim() || !formData.district.trim())) {
      toast({
        title: messages.createAd.location,
        description: editorCopy.locationSelectRequired,
        variant: 'destructive',
      });
      return;
    }

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

      const realEstateLocation = buildLocationLabel({
        region: formData.region,
        district: formData.district,
      }).trim();
      const realEstateAddress = buildFullAddress({
        region: formData.region,
        district: formData.district,
        addressLine: formData.address,
      }).trim();

      const payload: CreateAdInput = {
        title: formData.title.trim(),
        vertical: formData.vertical,
        category: formData.category.trim(),
        condition: formData.condition as 'new' | 'like-new' | 'used' | 'needs-repair',
        price: Number(formData.price),
        description: formData.description.trim(),
        location: (isRealEstate ? realEstateLocation || realEstateAddress : formData.location).trim(),
        address: isRealEstate ? realEstateAddress : '',
        formattedAddress: isRealEstate
          ? (locationMeta.formattedAddress || realEstateAddress).trim()
          : '',
        city: isRealEstate ? (formData.region.trim() || locationMeta.city.trim()) : '',
        district: isRealEstate ? (formData.district.trim() || locationMeta.district.trim()) : '',
        country: isRealEstate ? (locationMeta.country.trim() || DEFAULT_COUNTRY) : '',
        latitude: isRealEstate ? selectedMapPoint?.lat ?? null : null,
        longitude: isRealEstate ? selectedMapPoint?.lng ?? null : null,
        propertyType:
          isRealEstate && REAL_ESTATE_CATEGORIES.some((category) => category.slug === formData.category)
            ? (formData.category as Ad['propertyType'])
            : '',
        listingType: isRealEstate ? ((formData.listingType || 'sale') as RealEstateListingType) : '',
        rooms: isRealEstate && formData.rooms ? Number(formData.rooms) : null,
        area: isRealEstate && formData.area ? Number(formData.area) : null,
        floor: isRealEstate && formData.floor ? Number(formData.floor) : null,
        fuelType: isAutoVertical ? ((formData.fuelType || '') as CreateAdInput['fuelType']) : '',
        manufactureYear: isAutoVertical && formData.manufactureYear ? Number(formData.manufactureYear) : null,
        engineDisplacement: isAutoVertical && formData.engineDisplacement ? Number(formData.engineDisplacement) : null,
        engineUnit: isAutoVertical ? ((formData.engineUnit || getAutoEngineUnitForCategory(formData.category)) as CreateAdInput['engineUnit']) : '',
        mileage: isAutoVertical && formData.mileage ? Number(formData.mileage) : null,
        transmission: isAutoVertical ? ((formData.transmission || '') as CreateAdInput['transmission']) : '',
        specialEquipmentType: isAutoVertical ? formData.specialEquipmentType.trim() : '',
        compatibleModel: isAutoVertical ? formData.compatibleModel.trim() : '',
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

  const editorAction = isEditMode ? editorCopy.editAction : editorCopy.createAction;

  return (
    <MarketplaceShell>
      <ProtectedRoute>
        <main className="marketplace-main">
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

          {isPostingBlocked ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{postingAccessCopy.title}</AlertTitle>
              <AlertDescription>{postingAccessCopy.description}</AlertDescription>
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

                    {isAutoVertical ? (
                      <div className="grid grid-cols-1 gap-4 min-[481px]:grid-cols-2 xl:grid-cols-3">
                        {shouldShowVehicleFuelField ? (
                          <div className="space-y-2">
                            <Label htmlFor="fuelType">{locale === 'ru' ? 'Топливо' : locale === 'en' ? 'Fuel' : 'Yonilg‘i'}</Label>
                            <Select
                              value={formData.fuelType}
                              onValueChange={(value) =>
                                setFormData((previous) => ({ ...previous, fuelType: value }))
                              }
                            >
                              <SelectTrigger id="fuelType">
                                <SelectValue placeholder={locale === 'ru' ? 'Выберите топливо' : locale === 'en' ? 'Select fuel' : 'Yonilg‘i tanlang'} />
                              </SelectTrigger>
                              <SelectContent>
                                {AUTO_FUEL_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {getLocalizedText(option.label, locale)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                        {shouldShowVehicleYearField ? (
                          <div className="space-y-2">
                            <Label htmlFor="manufactureYear">{locale === 'ru' ? 'Год выпуска' : locale === 'en' ? 'Year' : 'Ishlab chiqarilgan yil'}</Label>
                            <Select
                              value={formData.manufactureYear}
                              onValueChange={(value) =>
                                setFormData((previous) => ({ ...previous, manufactureYear: value }))
                              }
                            >
                              <SelectTrigger id="manufactureYear">
                                <SelectValue placeholder={locale === 'ru' ? 'Выберите год' : locale === 'en' ? 'Select year' : 'Yilni tanlang'} />
                              </SelectTrigger>
                              <SelectContent>
                                {buildManufactureYears().map((year) => (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                        {shouldShowVehicleEngineField ? (
                          <div className="space-y-2">
                            <Label htmlFor="engineDisplacement">{locale === 'ru' ? 'Двигатель' : locale === 'en' ? 'Engine' : 'Dvigatel'}</Label>
                            <div className="grid grid-cols-[1fr_auto] gap-2">
                              <Input
                                id="engineDisplacement"
                                type="number"
                                min="0"
                                placeholder={locale === 'ru' ? 'Объём' : locale === 'en' ? 'Displacement' : 'Sig‘im'}
                                value={formData.engineDisplacement}
                                onChange={(event) =>
                                  setFormData((previous) => ({ ...previous, engineDisplacement: event.target.value }))
                                }
                              />
                              <Select
                                value={formData.engineUnit}
                                onValueChange={(value) =>
                                  setFormData((previous) => ({ ...previous, engineUnit: value }))
                                }
                              >
                                <SelectTrigger id="engineUnit" className="w-[88px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="L">L</SelectItem>
                                  <SelectItem value="cc">cc</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ) : null}
                        {shouldShowVehicleMileageField ? (
                          <div className="space-y-2">
                            <Label htmlFor="mileage">{locale === 'ru' ? 'Пробег' : locale === 'en' ? 'Mileage' : 'Bosib o‘tilgan masofa'}</Label>
                            <Input
                              id="mileage"
                              type="number"
                              min="0"
                              placeholder="0"
                              value={formData.mileage}
                              onChange={(event) =>
                                setFormData((previous) => ({ ...previous, mileage: event.target.value }))
                              }
                            />
                          </div>
                        ) : null}
                        {shouldShowVehicleTransmissionField ? (
                          <div className="space-y-2">
                            <Label htmlFor="transmission">{locale === 'ru' ? 'Коробка' : locale === 'en' ? 'Transmission' : 'Uzatish qutisi'}</Label>
                            <Select
                              value={formData.transmission}
                              onValueChange={(value) =>
                                setFormData((previous) => ({ ...previous, transmission: value }))
                              }
                            >
                              <SelectTrigger id="transmission">
                                <SelectValue placeholder={locale === 'ru' ? 'Выберите коробку' : locale === 'en' ? 'Select transmission' : 'Uzatish qutisini tanlang'} />
                              </SelectTrigger>
                              <SelectContent>
                                {AUTO_TRANSMISSION_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {getLocalizedText(option.label, locale)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                        {shouldShowVehicleSpecialEquipmentField ? (
                          <div className="space-y-2">
                            <Label htmlFor="specialEquipmentType">{locale === 'ru' ? 'Тип спецтехники' : locale === 'en' ? 'Equipment type' : 'Maxsus texnika turi'}</Label>
                            <Select
                              value={formData.specialEquipmentType}
                              onValueChange={(value) =>
                                setFormData((previous) => ({ ...previous, specialEquipmentType: value }))
                              }
                            >
                              <SelectTrigger id="specialEquipmentType">
                                <SelectValue placeholder={locale === 'ru' ? 'Выберите тип' : locale === 'en' ? 'Select type' : 'Turini tanlang'} />
                              </SelectTrigger>
                              <SelectContent>
                                {AUTO_SPECIAL_EQUIPMENT_SUGGESTIONS[locale].map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                        {shouldShowVehicleCompatibleModelField ? (
                          <div className="space-y-2">
                            <Label htmlFor="compatibleModel">{locale === 'ru' ? 'Совместимая модель' : locale === 'en' ? 'Compatible model' : 'Mos keluvchi model'}</Label>
                            <Input
                              id="compatibleModel"
                              placeholder={locale === 'ru' ? 'Введите модель' : locale === 'en' ? 'Enter model' : 'Modelni kiriting'}
                              value={formData.compatibleModel}
                              onChange={(event) =>
                                setFormData((previous) => ({ ...previous, compatibleModel: event.target.value }))
                              }
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
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
                    <Label htmlFor="description" className="sr-only">
                      {messages.createAd.descriptionTitle}
                    </Label>
                    <Textarea
                      id="description"
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
                        <div className="grid gap-4 min-[481px]:grid-cols-2 xl:grid-cols-4">
                          <div className="space-y-2">
                            <Label htmlFor="listingType">{editorCopy.listingType}</Label>
                            <Select
                              value={formData.listingType || 'sale'}
                              onValueChange={(value) =>
                                setFormData((previous) => ({
                                  ...previous,
                                  listingType: value as RealEstateListingType,
                                }))
                              }
                            >
                              <SelectTrigger id="listingType">
                                <SelectValue placeholder={editorCopy.selectListingType} />
                              </SelectTrigger>
                              <SelectContent>
                                {REAL_ESTATE_LISTING_TYPE_ORDER.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {getRealEstateListingTypeLabel(value, locale)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
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
                          region={formData.region}
                          district={formData.district}
                          regions={regionOptions}
                          districts={selectedDistrictOptions}
                          address={formData.address}
                          locale={locale}
                          copy={yandexLocationPickerCopy}
                          onChange={setSelectedMapPoint}
                          onRegionChange={(value) => {
                            setFormData((previous) => ({
                              ...previous,
                              region: value,
                              district: '',
                              location: buildLocationLabel({
                                region: value,
                              }),
                            }));
                            syncRealEstateLocationMeta(value, '', formData.address);
                          }}
                          onDistrictChange={(value) => {
                            setFormData((previous) => ({
                              ...previous,
                              district: value,
                              location: buildLocationLabel({
                                region: previous.region,
                                district: value,
                              }),
                            }));
                            syncRealEstateLocationMeta(formData.region, value, formData.address);
                          }}
                          onAddressChange={(value) => {
                            setFormData((previous) => ({ ...previous, address: value }));
                            syncRealEstateLocationMeta(formData.region, formData.district, value);
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
                            className="touch-target absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-colors hover:bg-black/75"
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
                          ? selectedLocationLabel ||
                          (selectedMapPoint ? `${selectedMapPoint.lat}, ${selectedMapPoint.lng}` : editorCopy.notSelected)
                          : formData.location || messages.createAd.locationPlaceholder}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="h-12 w-full gap-2 rounded-2xl text-lg font-bold"
                    disabled={loading || isUploadingImages || isPostingBlocked}
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
