'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  PencilLine,
  Phone,
  Square,
  Tag,
  Trash2,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { AdCard } from '@/components/ads/AdCard';
import { AdShareActions } from '@/components/ads/AdShareActions';
import {
  AdDetailsSkeleton,
  MarketplaceErrorState,
  MarketplaceStatusCard,
} from '@/components/marketplace/MarketplaceStates';
import { RealEstateListingsMap } from '@/components/maps/RealEstateListingsMap';
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
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getCategoryBySlug } from '@/lib/mock-data';
import { getVerticalHref } from '@/lib/mock-data';
import { Ad } from '@/lib/types';
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useToast } from '@/hooks/use-toast';
import { deleteAd, fetchAdById, fetchAds, getConditionLabel, updateAdStatus } from '@/lib/ads';
import { deleteAdminAd } from '@/lib/admin';
import { createChatConversation } from '@/lib/chat';
import { useAdminSession } from '@/hooks/use-admin-session';
import { getAdDisplayLocation } from '@/lib/listing-utils';
import { getRealEstateListingTypeLabel } from '@/lib/real-estate-listing-types';

const NEARBY_PROPERTIES_RADIUS_KM = 5;
const MOBILE_DETAIL_SHELL_BACKGROUND = '';

function hasCoordinates(ad: Ad): ad is Ad & { latitude: number; longitude: number } {
  return (
    typeof ad.latitude === 'number' &&
    Number.isFinite(ad.latitude) &&
    typeof ad.longitude === 'number' &&
    Number.isFinite(ad.longitude)
  );
}

function getDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const startLatitude = toRadians(from.lat);
  const endLatitude = toRadians(to.lat);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function AdDetailsView({
  adId,
  initialAd = null,
}: {
  adId: string;
  initialAd?: Ad | null;
}) {
  const router = useRouter();
  const { isFavorite, toggleFavorite, user } = useAuth();
  const { locale, messages } = useI18n();
  const { toast } = useToast();
  const { isAdmin } = useAdminSession();
  const [ad, setAd] = useState<Ad | null>(initialAd);
  const [relatedAds, setRelatedAds] = useState<Ad[]>([]);
  const [nearbyAds, setNearbyAds] = useState<Ad[]>([]);
  const [selectedMapAdId, setSelectedMapAdId] = useState<string | undefined>(undefined);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [mobileDetailCarouselApi, setMobileDetailCarouselApi] = useState<CarouselApi>();
  const [desktopDetailCarouselApi, setDesktopDetailCarouselApi] = useState<CarouselApi>();
  const [isLoading, setIsLoading] = useState(!initialAd);
  const [error, setError] = useState<string | null>(null);
  const [loadRequestNonce, setLoadRequestNonce] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const retryLabel = locale === 'ru' ? 'Повторить' : locale === 'en' ? 'Retry' : 'Qayta urinish';

  useEffect(() => {
    const abortController = new AbortController();

    if (initialAd && initialAd.id === adId) {
      setAd(initialAd);
      setSelectedMapAdId(initialAd.id);
      setSelectedImageIndex(0);
      setError(null);
      setIsLoading(false);
      return () => {
        abortController.abort();
      };
    }

    async function loadAd() {
      try {
        setIsLoading(true);
        const currentAd = await fetchAdById(adId, {
          signal: abortController.signal,
        });

        setAd(currentAd);
        setSelectedMapAdId(currentAd.id);
        setSelectedImageIndex(0);
        setError(null);
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return;
        }

        setAd(null);
        setSelectedMapAdId(undefined);
        setRelatedAds([]);
        setNearbyAds([]);
        setError(loadError instanceof Error ? loadError.message : messages.adDetails.notFound);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadAd();

    return () => {
      abortController.abort();
    };
  }, [adId, initialAd, loadRequestNonce, messages.adDetails.notFound]);

  useEffect(() => {
    const currentAd = ad;

    if (!currentAd) {
      return;
    }

    const stableAd = currentAd;

    const abortController = new AbortController();
    setRelatedAds([]);
    setNearbyAds([]);

    async function loadRecommendations() {
      try {
        const recommendationPool = await fetchAds({
          vertical: stableAd.vertical,
          ...(stableAd.vertical !== 'real_estate' ? { category: stableAd.category } : {}),
          excludeId: stableAd.id,
          fields: 'card',
          status: 'active',
          limit: stableAd.vertical === 'real_estate' ? 30 : 12,
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        setRelatedAds(
          recommendationPool
            .filter(
              (item) =>
                item.id !== stableAd.id &&
                item.vertical === stableAd.vertical &&
                item.category === stableAd.category
            )
            .slice(0, 3)
        );

        if (stableAd.vertical !== 'real_estate' || !hasCoordinates(stableAd)) {
          setNearbyAds([]);
          return;
        }

        const currentAdPoint = {
          lat: stableAd.latitude,
          lng: stableAd.longitude,
        };

        setNearbyAds(
          recommendationPool
            .filter(
              (
                item
              ): item is Ad & {
                latitude: number;
                longitude: number;
              } =>
                item.id !== stableAd.id &&
                item.vertical === 'real_estate' &&
                hasCoordinates(item)
            )
            .filter(
              (item) =>
                getDistanceKm(currentAdPoint, {
                  lat: item.latitude,
                  lng: item.longitude,
                }) <= NEARBY_PROPERTIES_RADIUS_KM
            )
            .sort(
              (left, right) =>
                getDistanceKm(currentAdPoint, {
                  lat: left.latitude,
                  lng: left.longitude,
                }) -
                getDistanceKm(currentAdPoint, {
                  lat: right.latitude,
                  lng: right.longitude,
                })
            )
            .slice(0, 6)
        );
      } catch {
        if (!abortController.signal.aborted) {
          setRelatedAds([]);
          setNearbyAds([]);
        }
      }
    }

    void loadRecommendations();

    return () => {
      abortController.abort();
    };
  }, [ad]);

  useEffect(() => {
    if (!mobileDetailCarouselApi) {
      return;
    }

    const syncSelectedImage = () => {
      setSelectedImageIndex(mobileDetailCarouselApi.selectedScrollSnap());
    };

    syncSelectedImage();
    mobileDetailCarouselApi.on('select', syncSelectedImage);
    mobileDetailCarouselApi.on('reInit', syncSelectedImage);

    return () => {
      mobileDetailCarouselApi.off('select', syncSelectedImage);
      mobileDetailCarouselApi.off('reInit', syncSelectedImage);
    };
  }, [mobileDetailCarouselApi]);

  useEffect(() => {
    if (!desktopDetailCarouselApi) {
      return;
    }

    const syncSelectedImage = () => {
      setSelectedImageIndex(desktopDetailCarouselApi.selectedScrollSnap());
    };

    syncSelectedImage();
    desktopDetailCarouselApi.on('select', syncSelectedImage);
    desktopDetailCarouselApi.on('reInit', syncSelectedImage);

    return () => {
      desktopDetailCarouselApi.off('select', syncSelectedImage);
      desktopDetailCarouselApi.off('reInit', syncSelectedImage);
    };
  }, [desktopDetailCarouselApi]);

  useEffect(() => {
    const imageCount = ad?.images.length ?? 0;

    if (!isImageGalleryOpen || imageCount <= 1) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedImageIndex((currentIndex) => {
          const nextIndex = (currentIndex - 1 + imageCount) % imageCount;
          mobileDetailCarouselApi?.scrollTo(nextIndex);
          desktopDetailCarouselApi?.scrollTo(nextIndex);
          return nextIndex;
        });
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedImageIndex((currentIndex) => {
          const nextIndex = (currentIndex + 1) % imageCount;
          mobileDetailCarouselApi?.scrollTo(nextIndex);
          desktopDetailCarouselApi?.scrollTo(nextIndex);
          return nextIndex;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [ad, desktopDetailCarouselApi, isImageGalleryOpen, mobileDetailCarouselApi]);

  if (isLoading) {
    return (
      <MarketplaceShell contentClassName={MOBILE_DETAIL_SHELL_BACKGROUND}>
        <main className="marketplace-main">
          <AdDetailsSkeleton title={messages.adDetails.loading} />
        </main>
      </MarketplaceShell>
    );
  }

  if (!ad) {
    return (
      <MarketplaceShell contentClassName={MOBILE_DETAIL_SHELL_BACKGROUND}>
        <main className="marketplace-main">
          {error ? (
            <MarketplaceErrorState
              title={messages.adDetails.notFound}
              description={error}
              retryLabel={retryLabel}
              onRetry={() => {
                setLoadRequestNonce((currentValue) => currentValue + 1);
              }}
              secondaryAction={{
                label: messages.adDetails.backToListings,
                href: '/',
                variant: 'outline',
              }}
            />
          ) : (
            <MarketplaceStatusCard
              title={messages.adDetails.notFound}
              description={messages.adDetails.notFound}
              primaryAction={{
                label: messages.adDetails.backToListings,
                href: '/',
              }}
            />
          )}
        </main>
      </MarketplaceShell>
    );
  }

  const category = getCategoryBySlug(ad.category);
  const localizedTitle = getLocalizedText(ad.title, locale);
  const localizedDescription = getLocalizedText(ad.description, locale);
  const localizedLocation = getLocalizedText(getAdDisplayLocation(ad), locale);
  const localizedDistrict = getLocalizedText(ad.district, locale);
  const localizedCategory = category ? getLocalizedText(category.name, locale) : messages.adDetails.category;
  const localizedCondition = getConditionLabel(ad.condition, locale);
  const isRealEstate = ad.vertical === 'real_estate';
  const localizedListingType = getRealEstateListingTypeLabel(ad.listingType, locale);
  const realEstateFacts = [
    isRealEstate && localizedListingType
      ? {
        icon: Tag,
        label: locale === 'ru' ? 'Тип сделки' : locale === 'en' ? 'Deal type' : 'Bitim turi',
        value: localizedListingType,
      }
      : null,
    isRealEstate && ad.rooms !== null
      ? {
        icon: Building2,
        label: locale === 'ru' ? 'Комнаты' : locale === 'en' ? 'Rooms' : 'Xonalar',
        value: String(ad.rooms),
      }
      : null,
    isRealEstate && ad.area !== null
      ? {
        icon: Square,
        label: locale === 'ru' ? 'Площадь' : locale === 'en' ? 'Area' : 'Maydon',
        value: `${ad.area} m²`,
      }
      : null,
    isRealEstate && ad.floor !== null
      ? {
        icon: Building2,
        label: locale === 'ru' ? 'Этаж' : locale === 'en' ? 'Floor' : 'Qavat',
        value: String(ad.floor),
      }
      : null,
  ].filter(Boolean) as Array<{
    icon: LucideIcon;
    label: string;
    value: string;
  }>;
  const propertyMapAds = isRealEstate ? [ad, ...nearbyAds] : [ad];
  const isOwnListing = user?.id === ad.userId;
  const canDeleteListing = isAdmin || isOwnListing;
  const shouldDeleteAsAdmin = isAdmin && !isOwnListing;
  const isCurrentAdFavorite = isFavorite(ad.id);
  const formattedPrice = new Intl.NumberFormat(languageMeta[locale].numberLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(ad.price);
  const postedAgo = formatDistanceToNow(new Date(ad.createdAt), {
    addSuffix: true,
    locale: languageMeta[locale].dateLocale,
  });
  const manageCopy =
    locale === 'ru'
      ? {
        action: 'Удалить',
        title: 'Что сделать с объявлением?',
        description:
          'Вы можете отметить объявление как проданное или удалить его навсегда.',
        manageButton: 'Продано / Удалить',
        soldAction: 'Продано',
        deleteAction: 'Удалить',
        cancel: 'Отмена',
        soldSuccessTitle: 'Объявление отмечено как проданное',
        soldSuccessDescription: 'Объявление снято с активной витрины.',
        deleteSuccessTitle: 'Объявление удалено',
        deleteSuccessDescription: 'Объявление было успешно удалено.',
        errorTitle: 'Не удалось выполнить действие',
        soldStatus: 'Продано',
      }
      : locale === 'en'
        ? {
          action: 'Delete',
          title: 'What would you like to do with this listing?',
          description:
            'You can mark the listing as sold or delete it permanently.',
          manageButton: 'Sold / Delete',
          soldAction: 'Mark sold',
          deleteAction: 'Delete',
          cancel: 'Cancel',
          soldSuccessTitle: 'Listing marked as sold',
          soldSuccessDescription: 'The listing was removed from active browsing.',
          deleteSuccessTitle: 'Listing deleted',
          deleteSuccessDescription: 'The listing was removed successfully.',
          errorTitle: 'The action could not be completed',
          soldStatus: 'Sold',
        }
        : {
          action: "O‘chirish",
          title: 'Eʼlon bilan nima qilmoqchisiz?',
          description:
            'Uni sotildi deb belgilab aktiv ro‘yxatdan yashirishingiz yoki butunlay o‘chirishingiz mumkin.',
          manageButton: 'Sotildi / O‘chirish',
          soldAction: 'Sotildi',
          deleteAction: "O‘chirish",
          cancel: 'Bekor qilish',
          soldSuccessTitle: 'Eʼlon sotildi deb belgilandi',
          soldSuccessDescription: 'Eʼlon aktiv ro‘yxatdan olib tashlandi.',
          deleteSuccessTitle: "Eʼlon o‘chirildi",
          deleteSuccessDescription: 'Eʼlon muvaffaqiyatli o‘chirildi.',
          errorTitle: 'Amal bajarilmadi',
          soldStatus: 'Sotildi',
        };
  const chatCopy =
    locale === 'ru'
      ? {
        action: 'Написать продавцу',
        loading: 'Открываем чат...',
        helper: 'Продолжите общение в реальном чате внутри приложения.',
        ownListing: 'Это ваше объявление, поэтому чат с самим собой недоступен.',
        errorTitle: 'Не удалось открыть чат',
      }
      : locale === 'en'
        ? {
          action: 'Message seller',
          loading: 'Opening chat...',
          helper: 'Continue the conversation in the real in-app chat.',
          ownListing: 'This is your own listing, so self-chat is disabled.',
          errorTitle: 'Chat could not be opened',
        }
        : {
          action: 'Sotuvchiga yozish',
          loading: 'Chat ochilmoqda...',
          helper: 'Suhbatni ilova ichidagi haqiqiy chatda davom ettiring.',
          ownListing: 'Bu sizning eʼloningiz, shuning uchun o‘zingizga chat ochib bo‘lmaydi.',
          errorTitle: 'Chatni ochib bo‘lmadi',
        };
  const mobileDetailCopy =
    locale === 'ru'
      ? {
        callAction: 'Позвонить',
        sellerLabel: 'Кто разместил',
        areaLabel: 'Площадь, м²',
        floorLabel: 'Этаж',
        listingTypeLabel: 'Тип сделки',
        roomsLabel: 'Комнаты',
        mapTitle: 'Локация на карте',
      }
      : locale === 'en'
        ? {
          callAction: 'Call',
          sellerLabel: 'Listed by',
          areaLabel: 'Area, m²',
          floorLabel: 'Floor',
          listingTypeLabel: 'Deal type',
          roomsLabel: 'Rooms',
          mapTitle: 'Map location',
        }
        : {
          callAction: 'Qo‘ng‘iroq',
          sellerLabel: 'Kim joylashtirdi',
          areaLabel: 'Maydon, m²',
          floorLabel: 'Qavat',
          listingTypeLabel: 'Bitim turi',
          roomsLabel: 'Xonalar',
          mapTitle: 'Xaritadagi joylashuv',
        };
  const nearbyCopy =
    locale === 'ru'
      ? {
        title: 'Объявления рядом',
        description: 'Жильё в радиусе 5 км от этой точки.',
      }
      : locale === 'en'
        ? {
          title: 'Nearby properties',
          description: 'Homes within 5 km of this location.',
        }
        : {
          title: 'Yaqin uylar',
          description: 'Ushbu joydan 5 km radiusdagi uylar.',
        };
  const mobileMetaPills = [
    ad.status === 'sold' ? manageCopy.soldStatus : '',
    localizedListingType,
    localizedCondition,
    localizedCategory,
    postedAgo,
  ].filter(Boolean);
  const mobileOverviewItems = [
    {
      label: mobileDetailCopy.sellerLabel,
      value: ad.userName || '—',
    },
    isRealEstate
      ? {
        label: mobileDetailCopy.listingTypeLabel,
        value: localizedListingType || '—',
      }
      : null,
    isRealEstate
      ? {
        label: mobileDetailCopy.areaLabel,
        value: ad.area !== null ? String(ad.area) : '—',
      }
      : null,
    isRealEstate
      ? {
        label: mobileDetailCopy.floorLabel,
        value: ad.floor !== null ? String(ad.floor) : '—',
      }
      : null,
    isRealEstate
      ? {
        label: mobileDetailCopy.roomsLabel,
        value: ad.rooms !== null ? String(ad.rooms) : '—',
      }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
  }>;
  const galleryCopy =
    locale === 'ru'
      ? {
        title: 'Просмотр фото',
        open: 'Открыть все фото',
        previous: 'Предыдущее фото',
        next: 'Следующее фото',
        counter: 'Фото',
        thumbnails: 'Все фото',
      }
      : locale === 'en'
        ? {
          title: 'Photo viewer',
          open: 'Open all photos',
          previous: 'Previous photo',
          next: 'Next photo',
          counter: 'Photo',
          thumbnails: 'All photos',
        }
        : {
          title: 'Rasm ko‘rish',
          open: 'Barcha rasmlarni ochish',
          previous: 'Oldingi rasm',
          next: 'Keyingi rasm',
          counter: 'Rasm',
          thumbnails: 'Barcha rasmlar',
        };
  const activeGalleryImage = ad.images[selectedImageIndex] || ad.images[0] || null;

  const scrollToImage = (index: number, target: 'mobile' | 'desktop') => {
    setSelectedImageIndex(index);
    if (target === 'mobile') {
      mobileDetailCarouselApi?.scrollTo(index);
      return;
    }

    desktopDetailCarouselApi?.scrollTo(index);
  };

  const syncAllImageViews = (index: number) => {
    setSelectedImageIndex(index);
    mobileDetailCarouselApi?.scrollTo(index);
    desktopDetailCarouselApi?.scrollTo(index);
  };

  const openImageGallery = (index: number) => {
    syncAllImageViews(index);
    setIsImageGalleryOpen(true);
  };

  const stepGalleryImage = (direction: 'previous' | 'next') => {
    if (ad.images.length <= 1) {
      return;
    }

    const nextIndex =
      direction === 'previous'
        ? (selectedImageIndex - 1 + ad.images.length) % ad.images.length
        : (selectedImageIndex + 1) % ad.images.length;

    syncAllImageViews(nextIndex);
  };

  const handleDeleteAd = async () => {
    if (!ad) {
      return;
    }

    setIsDeleting(true);

    try {
      if (shouldDeleteAsAdmin) {
        await deleteAdminAd(ad.id);
      } else {
        await deleteAd(ad.id);
      }

      toast({
        title: manageCopy.deleteSuccessTitle,
        description: manageCopy.deleteSuccessDescription,
      });
      router.push(getVerticalHref(ad.vertical));
    } catch (deleteError) {
      toast({
        title: manageCopy.errorTitle,
        description:
          deleteError instanceof Error ? deleteError.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAsSold = async () => {
    if (!ad) {
      return;
    }

    setIsDeleting(true);

    try {
      const updatedAd = await updateAdStatus(ad.id, 'sold');
      setAd(updatedAd);
      toast({
        title: manageCopy.soldSuccessTitle,
        description: manageCopy.soldSuccessDescription,
      });
    } catch (statusError) {
      toast({
        title: manageCopy.errorTitle,
        description:
          statusError instanceof Error ? statusError.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleFavorite = () => {
    if (!user) {
      toast({
        title: messages.auth.favoriteLoginTitle,
        description: messages.auth.favoriteLoginDescription,
        variant: 'destructive',
      });
      router.push(`/sign-in?redirect=${encodeURIComponent(`/ads/${ad.id}`)}`);
      return;
    }

    void (async () => {
      const result = await toggleFavorite(ad.id);

      if (!result.ok) {
        toast({
          title: messages.auth.requestFailedTitle,
          description: result.message || messages.auth.requestFailedDescription,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: result.isFavorite
          ? messages.auth.favoriteAddedTitle
          : messages.auth.favoriteRemovedTitle,
        description: result.isFavorite
          ? messages.auth.favoriteAddedDescription
          : messages.auth.favoriteRemovedDescription,
      });
    })();
  };

  const handleStartChat = async () => {
    if (!ad) {
      return;
    }

    if (!user) {
      router.push(`/sign-in?redirect=${encodeURIComponent(`/chat?adId=${ad.id}`)}`);
      return;
    }

    if (isOwnListing) {
      return;
    }

    setIsStartingChat(true);

    try {
      const conversation = await createChatConversation(ad.id);
      router.push(`/chat?conversation=${encodeURIComponent(conversation.id)}`);
    } catch (startChatError) {
      toast({
        title: chatCopy.errorTitle,
        description:
          startChatError instanceof Error ? startChatError.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <MarketplaceShell contentClassName={MOBILE_DETAIL_SHELL_BACKGROUND}>
      <main className="marketplace-main">
        <div className="hidden min-[769px]:block surface-card section-shell--compact rounded-[1.85rem]">
          <div className="section-header">
            <div className="action-cluster items-center">
              <Button asChild variant="ghost" className="px-0 text-primary hover:bg-transparent">
                <Link href={getVerticalHref(ad.vertical)}>{messages.adDetails.backToListings}</Link>
              </Button>
              <Badge variant="secondary">{localizedCategory}</Badge>
              {ad.status === 'sold' ? <Badge variant="secondary">{manageCopy.soldStatus}</Badge> : null}
              {ad.isFeatured ? <Badge>{messages.adCard.featured}</Badge> : null}
            </div>
            <div className="action-cluster w-full min-[481px]:w-auto">
              <Button
                type="button"
                variant="outline"
                className={`w-full min-[481px]:w-auto ${isCurrentAdFavorite ? 'text-red-500 hover:text-red-500' : ''}`}
                onClick={handleToggleFavorite}
                aria-pressed={isCurrentAdFavorite}
              >
                <Heart className={`h-4 w-4 ${isCurrentAdFavorite ? 'fill-current' : ''}`} />
                {messages.navbar.favorites}
              </Button>
              <AdShareActions
                ad={ad}
                locale={locale}
                showQuickAction
                quickActionClassName="w-full min-[481px]:w-auto"
                menuButtonClassName="h-11 w-11 rounded-[1.15rem]"
              />
              {canDeleteListing ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full gap-2 min-[481px]:w-auto" disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {manageCopy.action}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{manageCopy.title}</AlertDialogTitle>
                      <AlertDialogDescription>{manageCopy.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{manageCopy.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => void handleMarkAsSold()}
                        disabled={isDeleting}
                      >
                        {manageCopy.soldAction}
                      </AlertDialogAction>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => void handleDeleteAd()}
                        disabled={isDeleting}
                      >
                        {manageCopy.deleteAction}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </div>
        </div>

        <section className="phone-nav-only mx-[calc(var(--page-gutter)*-1)] flex-col overflow-hidden text-foreground">
          <div className="relative">
            <Carousel
              setApi={(api) => {
                setMobileDetailCarouselApi(api);
              }}
              opts={{
                align: 'start',
                loop: ad.images.length > 1,
              }}
              className="touch-pan-y"
            >
              <CarouselContent className="-ml-0">
                {ad.images.map((image, index) => (
                  <CarouselItem key={`${ad.id}-detail-${index}`} className="pl-0">
                    <button
                      type="button"
                      className="block w-full cursor-zoom-in"
                      onClick={() => openImageGallery(index)}
                      aria-label={`${galleryCopy.open} ${index + 1}`}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Image
                          src={image}
                          alt={`${localizedTitle} ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="100vw"
                          priority={index === 0}
                          unoptimized={image.startsWith('data:') || image.startsWith('blob:')}
                        />
                      </div>
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/35 to-transparent" />

            <div className="absolute left-4 top-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-md hover:bg-black/60 hover:text-white"
                onClick={() => router.back()}
                aria-label={messages.adDetails.backToListings}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>

            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-[1.35rem] border border-white/10 bg-black/40 p-2 backdrop-blur-md">
              <AdShareActions
                ad={ad}
                locale={locale}
                menuButtonClassName="!h-10 !w-10 !rounded-full !border-white/10 !bg-transparent !text-white hover:!bg-white/10 hover:!text-white"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={handleToggleFavorite}
                aria-pressed={isCurrentAdFavorite}
                aria-label={messages.navbar.favorites}
              >
                <Heart className={`h-5 w-5 ${isCurrentAdFavorite ? 'fill-current text-white' : ''}`} />
              </Button>
            </div>

            <div className="absolute bottom-14 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <User className="h-4 w-4" />
              </div>
              <span className="max-w-[12rem] truncate text-sm font-semibold">{ad.userName}</span>
            </div>

            {ad.images.length > 1 ? (
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
                {ad.images.map((_, index) => (
                  <button
                    key={`${ad.id}-detail-dot-${index}`}
                    type="button"
                    className={`h-2.5 rounded-full transition-all ${selectedImageIndex === index ? 'w-8 bg-amber-400' : 'w-2.5 bg-white/55'}`}
                    onClick={() => scrollToImage(index, 'mobile')}
                    aria-label={`Go to image ${index + 1}`}
                    aria-current={selectedImageIndex === index}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div
            id="mobile-detail-info"
            className="surface-card relative -mt-6 space-y-5 rounded-t-[1.9rem] px-5 pb-6 pt-5 shadow-[0_-18px_36px_rgba(7,28,85,0.12)]"
          >
            <div className="flex flex-wrap gap-2">
              {mobileMetaPills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-border/70 bg-background/78 px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur"
                >
                  {pill}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              <h1 className="text-[2rem] font-semibold leading-[1.02] tracking-[-0.03em] text-foreground">
                {localizedTitle}
              </h1>
              <p className="text-[2.2rem] font-black leading-none tracking-[-0.04em] text-foreground">
                {formattedPrice}
              </p>
              <p className="whitespace-pre-line text-[0.98rem] leading-7 text-muted-foreground">
                {localizedDescription}
              </p>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-5">
              {mobileOverviewItems.map((item) => (
                <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                  <span className="text-base font-semibold text-muted-foreground">{item.label}</span>
                  <span className="text-base font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
              {!isOwnListing ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-14 rounded-full bg-white text-base font-semibold text-black shadow-none hover:bg-white/90"
                  onClick={() => void handleStartChat()}
                  disabled={isStartingChat}
                >
                  {isStartingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  {isStartingChat ? chatCopy.loading : chatCopy.action}
                </Button>
              ) : (
                <Button asChild variant="secondary" className="min-h-14 rounded-full bg-white text-base font-semibold text-black shadow-none hover:bg-white/90">
                  <Link href={`/ads/${ad.id}/edit`}>
                    <PencilLine className="h-4 w-4" />
                    {locale === 'ru' ? 'Редактировать' : locale === 'en' ? 'Edit listing' : 'Tahrirlash'}
                  </Link>
                </Button>
              )}

              {isOwnListing ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-14 rounded-full bg-white text-base font-semibold text-black shadow-none hover:bg-white/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {manageCopy.manageButton}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{manageCopy.title}</AlertDialogTitle>
                      <AlertDialogDescription>{manageCopy.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{manageCopy.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => void handleMarkAsSold()}
                        disabled={isDeleting}
                      >
                        {manageCopy.soldAction}
                      </AlertDialogAction>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => void handleDeleteAd()}
                        disabled={isDeleting}
                      >
                        {manageCopy.deleteAction}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}

              <Button asChild variant="secondary" className="min-h-14 rounded-full bg-white text-base font-semibold text-black shadow-none hover:bg-white/90">
                <Link href={getVerticalHref(ad.vertical)}>
                  <Info className="h-4 w-4" />
                  {messages.adDetails.browseMore}
                </Link>
              </Button>
            </div>

            {ad.sellerPhone ? (
              <Button
                asChild
                className="min-h-16 rounded-full border-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-100 text-lg font-bold text-black shadow-none hover:opacity-95"
              >
                <a href={`tel:${ad.sellerPhone}`}>
                  <Phone className="h-5 w-5" />
                  {mobileDetailCopy.callAction}
                </a>
              </Button>
            ) : null}
          </div>
        </section>

        {isRealEstate && typeof ad.latitude === 'number' && typeof ad.longitude === 'number' ? (
          <section className="phone-nav-only flex-col surface-card rounded-[1.85rem] p-4">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                {mobileDetailCopy.mapTitle}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{localizedLocation}</p>
            </div>
            <RealEstateListingsMap
              ads={propertyMapAds}
              locale={locale}
              selectedAdId={selectedMapAdId}
              onSelectAd={setSelectedMapAdId}
              userLocation={null}
              userLocationLabel={
                locale === 'ru' ? 'Вы здесь' : locale === 'en' ? 'You are here' : 'Siz turgan joy'
              }
              nearbyRadiusKm={NEARBY_PROPERTIES_RADIUS_KM}
              popupActionLabel={messages.adDetails.browseMore}
              isVisible
              previewMode="address-only"
            />
          </section>
        ) : null}

        <div className="detail-grid">
          <div className="hidden min-[769px]:block space-y-6">
            <div className="surface-card relative overflow-hidden rounded-[1.9rem] shadow-[0_24px_56px_rgba(7,28,85,0.16)] sm:rounded-[2rem]">
              <Carousel
                setApi={(api) => {
                  setDesktopDetailCarouselApi(api);
                }}
                opts={{
                  align: 'start',
                  loop: ad.images.length > 1,
                }}
                className="touch-pan-y"
              >
                <CarouselContent className="-ml-0">
                  {ad.images.map((image, index) => (
                    <CarouselItem key={`${ad.id}-desktop-detail-${index}`} className="pl-0">
                      <button
                        type="button"
                        className="block w-full cursor-zoom-in"
                        onClick={() => openImageGallery(index)}
                        aria-label={`${galleryCopy.open} ${index + 1}`}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/10]">
                          <Image
                            src={image}
                            alt={`${localizedTitle} ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 92vw, 64vw"
                            data-ai-hint="classified product detail"
                            unoptimized={image.startsWith('data:') || image.startsWith('blob:')}
                          />
                        </div>
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/52 via-slate-950/10 to-transparent" />
              <div className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {selectedImageIndex + 1}/{ad.images.length}
              </div>
            </div>
            {ad.images.length > 1 ? (
              <div className="grid grid-cols-3 gap-3 min-[481px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
                {ad.images.map((image, index) => (
                  <button
                    key={`${image.slice(0, 32)}-${index}`}
                    type="button"
                    className={`relative aspect-square overflow-hidden rounded-[1.15rem] border transition-all ${index === selectedImageIndex ? 'border-primary ring-2 ring-primary/20' : 'border-border/70 hover:border-primary/20'
                      }`}
                    onClick={() => scrollToImage(index, 'desktop')}
                  >
                    <Image
                      src={image}
                      alt={`${localizedTitle} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 18vw, 120px"
                      loading="lazy"
                      unoptimized={image.startsWith('data:') || image.startsWith('blob:')}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="surface-card rounded-[1.9rem] p-5 sm:p-6">
              <div className="section-header">
                <div className="section-header__copy">
                  <p className="section-kicker">{localizedCategory}</p>
                  <h1 className="page-title font-bold">{localizedTitle}</h1>
                  <p className="section-caption">{localizedLocation}</p>
                </div>
                <div className="text-2xl font-extrabold tracking-[-0.03em] text-primary min-[481px]:text-3xl">
                  {formattedPrice}
                </div>
              </div>

              <div className="detail-fact-grid border-y border-border/70 py-5 text-sm text-muted-foreground">
                <div className="detail-fact-card">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.location}</p>
                    <p>{localizedLocation}</p>
                  </div>
                </div>
                <div className="detail-fact-card">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.posted}</p>
                    <p>{postedAgo}</p>
                  </div>
                </div>
                <div className="detail-fact-card">
                  <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.category}</p>
                    <p>{localizedCategory}</p>
                  </div>
                </div>
                <div className="detail-fact-card">
                  <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{messages.adDetails.condition}</p>
                    <p>{localizedCondition}</p>
                  </div>
                </div>
                {isRealEstate
                  ? realEstateFacts.map((fact) => {
                    const Icon = fact.icon;

                    return (
                      <div key={fact.label} className="detail-fact-card">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">{fact.label}</p>
                          <p>{fact.value}</p>
                        </div>
                      </div>
                    );
                  })
                  : null}
              </div>

              <div className="space-y-6 pt-6">
                <div>
                  <h2 className="mb-3 text-xl font-semibold">{messages.adDetails.description}</h2>
                  <p className="body-lead whitespace-pre-line text-muted-foreground">{localizedDescription}</p>
                </div>

                {isRealEstate && typeof ad.latitude === 'number' && typeof ad.longitude === 'number' ? (
                  <div className="space-y-4 border-t border-border/70 pt-6">
                    <div className="soft-panel">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                        {locale === 'ru' ? 'Локация' : locale === 'en' ? 'Location' : 'Joylashuv'}
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">{localizedLocation}</p>
                      {localizedDistrict ? <p className="mt-1 text-sm text-muted-foreground">{localizedDistrict}</p> : null}
                    </div>
                    <div>
                      <h2 className="mb-3 text-xl font-semibold">
                        {locale === 'ru' ? 'Локация на карте' : locale === 'en' ? 'Map location' : 'Xaritadagi joylashuv'}
                      </h2>
                      <RealEstateListingsMap
                        ads={propertyMapAds}
                        locale={locale}
                        selectedAdId={selectedMapAdId}
                        onSelectAd={setSelectedMapAdId}
                        userLocation={null}
                        userLocationLabel={
                          locale === 'ru' ? 'Вы здесь' : locale === 'en' ? 'You are here' : 'Siz turgan joy'
                        }
                        nearbyRadiusKm={NEARBY_PROPERTIES_RADIUS_KM}
                        popupActionLabel={messages.adDetails.browseMore}
                        isVisible
                        previewMode="address-only"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="hidden min-[769px]:block surface-card rounded-[1.9rem] border-none shadow-none min-[900px]:sticky min-[900px]:top-24">
              <CardHeader>
                <CardTitle>{messages.adDetails.overview}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="soft-panel flex items-center gap-3">
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
                  {isRealEstate && localizedListingType ? (
                    <p>
                      <span className="font-medium text-foreground">
                        {locale === 'ru' ? 'Тип сделки: ' : locale === 'en' ? 'Deal type: ' : 'Bitim turi: '}
                      </span>
                      {localizedListingType}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-medium text-foreground">{messages.adDetails.location}: </span>
                    {localizedLocation}
                  </p>
                  {isRealEstate && localizedDistrict ? (
                    <p>
                      <span className="font-medium text-foreground">
                        {locale === 'ru' ? 'Район: ' : locale === 'en' ? 'District: ' : 'Tuman: '}
                      </span>
                      {localizedDistrict}
                    </p>
                  ) : null}
                  {isRealEstate && ad.area !== null ? (
                    <p>
                      <span className="font-medium text-foreground">
                        {locale === 'ru' ? 'Площадь: ' : locale === 'en' ? 'Area: ' : 'Maydon: '}
                      </span>
                      {ad.area} m²
                    </p>
                  ) : null}
                  {isRealEstate && ad.rooms !== null ? (
                    <p>
                      <span className="font-medium text-foreground">
                        {locale === 'ru' ? 'Комнаты: ' : locale === 'en' ? 'Rooms: ' : 'Xonalar: '}
                      </span>
                      {ad.rooms}
                    </p>
                  ) : null}
                  {isRealEstate && ad.floor !== null ? (
                    <p>
                      <span className="font-medium text-foreground">
                        {locale === 'ru' ? 'Этаж: ' : locale === 'en' ? 'Floor: ' : 'Qavat: '}
                      </span>
                      {ad.floor}
                    </p>
                  ) : null}
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
                  {!isOwnListing ? (
                    <Button type="button" className="h-11 gap-2" onClick={() => void handleStartChat()} disabled={isStartingChat}>
                      {isStartingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                      {isStartingChat ? chatCopy.loading : chatCopy.action}
                    </Button>
                  ) : (
                    <div className="soft-panel text-sm text-muted-foreground">
                      {chatCopy.ownListing}
                    </div>
                  )}
                  {!isOwnListing && ad.sellerPhone ? (
                    <Button asChild variant="outline" className="h-11">
                      <a href={`tel:${ad.sellerPhone}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        {locale === 'ru' ? 'Позвонить' : locale === 'en' ? 'Call seller' : 'Qo‘ng‘iroq qilish'}
                      </a>
                    </Button>
                  ) : null}
                  {isOwnListing ? (
                    <Button asChild variant="outline" className="h-11">
                      <Link href={`/ads/${ad.id}/edit`}>
                        <PencilLine className="mr-2 h-4 w-4" />
                        {locale === 'ru' ? 'Редактировать объявление' : locale === 'en' ? 'Edit listing' : 'E’lonni tahrirlash'}
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild className="h-11">
                    <Link href={`/ads/create?vertical=${ad.vertical}`}>{messages.adDetails.createSimilar}</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11">
                    <Link href={getVerticalHref(ad.vertical)}>{messages.adDetails.browseMore}</Link>
                  </Button>
                </div>
                {!isOwnListing ? (
                  <div className="soft-panel text-sm text-muted-foreground">
                    {chatCopy.helper}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="surface-card rounded-[1.9rem] border-none shadow-none">
              <CardHeader>
                <CardTitle>{messages.adDetails.safetyTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {messages.adDetails.safetyTips.map((tip) => (
                  <div key={tip} className="soft-panel">
                    {tip}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {nearbyAds.length > 0 ? (
          <section className="surface-card section-shell rounded-[1.85rem]">
            <div className="section-header">
              <div className="section-header__copy">
                <p className="section-kicker">{nearbyCopy.title}</p>
                <h2 className="section-title">{nearbyCopy.title}</h2>
                <p className="section-caption">{nearbyCopy.description}</p>
              </div>
              <Badge variant="secondary">{nearbyAds.length}</Badge>
            </div>
            <div className="listing-grid">
              {nearbyAds.map((item) => (
                <AdCard
                  key={item.id}
                  ad={item}
                  isFavorite={isFavorite(item.id)}
                  canDelete={isAdmin}
                  onDeleted={(deletedAdId) => {
                    setNearbyAds((previous) => previous.filter((nearbyAd) => nearbyAd.id !== deletedAdId));
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        {relatedAds.length > 0 ? (
          <section className="surface-card section-shell rounded-[1.85rem]">
            <div className="section-header">
              <div className="section-header__copy">
                <p className="section-kicker">{messages.adDetails.relatedListings}</p>
                <h2 className="section-title">{messages.adDetails.relatedListings}</h2>
              </div>
              <Button asChild variant="ghost" className="px-0 text-primary hover:bg-transparent">
                <Link href={getVerticalHref(ad.vertical)}>{messages.adDetails.browseMore}</Link>
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

        {ad.images.length > 0 ? (
          <Dialog open={isImageGalleryOpen} onOpenChange={setIsImageGalleryOpen}>
            <DialogContent
              className="h-[100dvh] max-h-[100dvh] w-screen max-w-none border-none bg-black/96 p-0 text-white shadow-none sm:rounded-none [&>button]:hidden"
            >
              <DialogTitle className="sr-only">{galleryCopy.title}</DialogTitle>

              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/92">{galleryCopy.title}</p>
                    <p className="text-xs text-white/55">
                      {galleryCopy.counter} {selectedImageIndex + 1} / {ad.images.length}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {ad.images.length > 1 ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                          onClick={() => stepGalleryImage('previous')}
                          aria-label={galleryCopy.previous}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                          onClick={() => stepGalleryImage('next')}
                          aria-label={galleryCopy.next}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </>
                    ) : null}

                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                        aria-label="Close image viewer"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </DialogClose>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="relative flex-1 px-3 py-3 sm:px-6 sm:py-5">
                    <div className="relative h-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/40">
                      {activeGalleryImage ? (
                        <Image
                          src={activeGalleryImage}
                          alt={`${localizedTitle} ${selectedImageIndex + 1}`}
                          fill
                          className="object-contain"
                          sizes="100vw"
                          priority
                          unoptimized={
                            activeGalleryImage.startsWith('data:') ||
                            activeGalleryImage.startsWith('blob:')
                          }
                        />
                      ) : null}
                    </div>
                  </div>

                  {ad.images.length > 1 ? (
                    <div className="border-t border-white/10 px-3 py-3 sm:px-6">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                        {galleryCopy.thumbnails}
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {ad.images.map((image, index) => (
                          <button
                            key={`${image.slice(0, 32)}-gallery-${index}`}
                            type="button"
                            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] border transition-all sm:h-24 sm:w-24 ${index === selectedImageIndex
                              ? 'border-amber-400 ring-2 ring-amber-300/30'
                              : 'border-white/10 hover:border-white/30'
                              }`}
                            onClick={() => syncAllImageViews(index)}
                            aria-label={`${galleryCopy.open} ${index + 1}`}
                            aria-current={index === selectedImageIndex}
                          >
                            <Image
                              src={image}
                              alt={`${localizedTitle} ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="96px"
                              loading="lazy"
                              unoptimized={image.startsWith('data:') || image.startsWith('blob:')}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </main>
    </MarketplaceShell>
  );
}
