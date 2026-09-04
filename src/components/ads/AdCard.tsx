'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BadgeCheck, BedDouble, ChevronLeft, ChevronRight, Clock, Heart, ImageOff, Loader2, MapPin, MoreHorizontal, PencilLine, Phone, RotateCcw, Ruler, Trash2 } from 'lucide-react';
import { AdShareActions } from '@/components/ads/AdShareActions';
import { Card, CardContent } from '@/components/ui/card';
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
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Ad } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { getCategoryBySlug } from '@/lib/mock-data';
import { formatAutoEngineDisplacement, formatAutoMileage, getAutoFuelLabel, getAutoTransmissionLabel } from '@/lib/auto-config';
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useToast } from '@/hooks/use-toast';
import { deleteAd, getConditionLabel, updateAdStatus } from '@/lib/ads';
import { deleteAdminAd } from '@/lib/admin';
import { getAdDisplayLocation } from '@/lib/listing-utils';
import { useAdminSession } from '@/hooks/use-admin-session';

interface AdCardProps {
  ad: Ad;
  className?: string;
  isFavorite?: boolean;
  canDelete?: boolean;
  showManageActions?: boolean;
  onDeleted?: (adId: string) => void;
  onUpdated?: (ad: Ad) => void;
  variant?: 'default' | 'mobile' | 'mobile_compact' | 'real_estate_mobile' | 'real_estate_mobile_compact';
  featuredLabel?: string;
}

export function AdCard({
  ad,
  className,
  isFavorite = false,
  canDelete = false,
  showManageActions = true,
  onDeleted,
  onUpdated,
  variant = 'default',
  featuredLabel,
}: AdCardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, toggleFavorite } = useAuth();
  const { isAdmin } = useAdminSession();
  const { locale, messages } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const category = getCategoryBySlug(ad.category);
  const localizedTitle = getLocalizedText(ad.title, locale);
  const localizedLocation = getLocalizedText(getAdDisplayLocation(ad), locale);
  const localizedCategory = category
    ? getLocalizedText(category.name, locale)
    : messages.adCard.categoryFallback;
  const localizedCondition = getConditionLabel(ad.condition, locale);
  const mobileSecondaryLabel = ad.vertical === 'real_estate' ? '' : localizedCategory;
  const realEstateMeta =
    ad.vertical === 'real_estate'
      ? [ad.rooms ? `${ad.rooms}R` : '', ad.area ? `${ad.area} m²` : ''].filter(Boolean).join(' · ')
      : '';
  const secondaryMetaLabel = ad.vertical === 'real_estate' && realEstateMeta ? realEstateMeta : localizedCondition;
  const autoMetaSummary = ad.vertical === 'auto'
    ? [
      ad.manufactureYear ? String(ad.manufactureYear) : '',
      ad.mileage !== null ? formatAutoMileage(ad.mileage, locale) : '',
      ad.engineDisplacement !== null
        ? formatAutoEngineDisplacement(ad.engineDisplacement, ad.engineUnit, locale)
        : '',
      ad.fuelType ? getAutoFuelLabel(ad.fuelType, locale) : '',
      ad.transmission ? getAutoTransmissionLabel(ad.transmission, locale) : '',
    ].filter(Boolean).join(' • ')
    : '';
  const manageCopy =
    locale === 'ru'
      ? {
        action: 'Управление объявлением',
        title: 'Что сделать с объявлением?',
        description:
          'Объявление можно отредактировать, отметить проданным или удалить навсегда.',
        editAction: 'Редактировать',
        soldAction: 'Продано',
        activateAction: 'Вернуть в продажу',
        deleteAction: 'Удалить',
        cancel: 'Отмена',
        soldSuccessTitle: 'Объявление отмечено как проданное',
        soldSuccessDescription: 'Объявление снято с активной витрины.',
        activatedSuccessTitle: 'Объявление снова активно',
        activatedSuccessDescription: 'Объявление вернулось в активную витрину.',
        deleteSuccessTitle: 'Объявление удалено',
        deleteSuccessDescription: 'Объявление было успешно удалено.',
        errorTitle: 'Не удалось выполнить действие',
        soldStatus: 'Продано',
      }
      : locale === 'en'
        ? {
          action: 'Manage listing',
          title: 'What would you like to do with this listing?',
          description:
            'You can edit the listing, mark it as sold, or delete it permanently.',
          editAction: 'Edit listing',
          soldAction: 'Mark sold',
          activateAction: 'Put back on sale',
          deleteAction: 'Delete',
          cancel: 'Cancel',
          soldSuccessTitle: 'Listing marked as sold',
          soldSuccessDescription: 'The listing was removed from active browsing.',
          activatedSuccessTitle: 'Listing is active again',
          activatedSuccessDescription: 'The listing is back in active browsing.',
          deleteSuccessTitle: 'Listing deleted',
          deleteSuccessDescription: 'The listing was removed successfully.',
          errorTitle: 'The action could not be completed',
          soldStatus: 'Sold',
        }
        : {
          action: "Eʼlonni boshqarish",
          title: 'Eʼlon bilan nima qilmoqchisiz?',
          description:
            'Eʼlonni tahrirlashingiz, sotildi deb belgilashingiz yoki butunlay o‘chirishingiz mumkin.',
          editAction: 'Tahrirlash',
          soldAction: 'Sotildi',
          activateAction: 'Qayta sotuvga qo‘yish',
          deleteAction: "O‘chirish",
          cancel: 'Bekor qilish',
          soldSuccessTitle: 'Eʼlon sotildi deb belgilandi',
          soldSuccessDescription: 'Eʼlon aktiv ro‘yxatdan olib tashlandi.',
          activatedSuccessTitle: 'Eʼlon yana faol',
          activatedSuccessDescription: 'Eʼlon aktiv ro‘yxatga qaytarildi.',
          deleteSuccessTitle: "Eʼlon o‘chirildi",
          deleteSuccessDescription: 'Eʼlon muvaffaqiyatli o‘chirildi.',
          errorTitle: 'Amal bajarilmadi',
          soldStatus: 'Sotildi',
        };

  const formattedPrice = new Intl.NumberFormat(languageMeta[locale].numberLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(ad.price);
  const adHref = `/ads/${ad.id}`;
  const mobileRibbonLabel =
    featuredLabel || (ad.isFeatured ? messages.adCard.featured : '');
  const hasLocation = localizedLocation.trim().length > 0;
  const hasImages = ad.images.length > 0;
  const hasMultipleImages = ad.images.length > 1;
  const isOwner = user?.id === ad.userId;
  const isSoldListing = ad.status === 'sold';
  const canManageAd = showManageActions && (canDelete || isAdmin || isOwner);
  const shouldDeleteAsAdmin = canDelete || (isAdmin && !isOwner);
  const postedAtLabel = mounted
    ? formatDistanceToNow(new Date(ad.createdAt), {
      addSuffix: true,
      locale: languageMeta[locale].dateLocale,
    })
    : messages.adCard.loadingTime;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const syncSelectedImage = () => {
      setSelectedImageIndex(carouselApi.selectedScrollSnap());
    };

    syncSelectedImage();
    carouselApi.on('select', syncSelectedImage);
    carouselApi.on('reInit', syncSelectedImage);

    return () => {
      carouselApi.off('select', syncSelectedImage);
      carouselApi.off('reInit', syncSelectedImage);
    };
  }, [carouselApi]);

  const handleUpdateStatus = async (nextStatus: 'active' | 'sold') => {
    setIsDeleting(true);

    try {
      const updatedAd = await updateAdStatus(ad.id, nextStatus);

      if (onUpdated) {
        onUpdated(updatedAd);
      } else if (updatedAd.status !== 'active') {
        onDeleted?.(ad.id);
      }

      toast({
        title: nextStatus === 'sold' ? manageCopy.soldSuccessTitle : manageCopy.activatedSuccessTitle,
        description:
          nextStatus === 'sold' ? manageCopy.soldSuccessDescription : manageCopy.activatedSuccessDescription,
      });
    } catch (error) {
      toast({
        title: manageCopy.errorTitle,
        description: error instanceof Error ? error.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAd = async () => {
    setIsDeleting(true);

    try {
      if (shouldDeleteAsAdmin) {
        await deleteAdminAd(ad.id);
      } else {
        await deleteAd(ad.id);
      }

      onDeleted?.(ad.id);
      toast({
        title: manageCopy.deleteSuccessTitle,
        description: manageCopy.deleteSuccessDescription,
      });
    } catch (error) {
      toast({
        title: manageCopy.errorTitle,
        description: error instanceof Error ? error.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Boshqaruv oynasi ikkala ko'rinishda ham bir xil bo'lishi uchun bitta joydan
  // chiziladi, faqat tugma (trigger) ko'rinishga qarab farq qiladi.
  const renderManageDialog = (trigger: React.ReactNode) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{manageCopy.title}</AlertDialogTitle>
          <AlertDialogDescription>{manageCopy.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {/* Mobil ko'rinishda footer teskari tartibda chiziladi, shuning uchun
            eng xavfli amal ("o'chirish") ekranda pastda, "tahrirlash" esa
            tepada turadi. */}
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="mt-0">{manageCopy.cancel}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              void handleDeleteAd();
            }}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {manageCopy.deleteAction}
          </AlertDialogAction>
          <AlertDialogAction
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={(event) => {
              event.preventDefault();
              void handleUpdateStatus(isSoldListing ? 'active' : 'sold');
            }}
            disabled={isDeleting}
          >
            {isSoldListing ? <RotateCcw className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
            {isSoldListing ? manageCopy.activateAction : manageCopy.soldAction}
          </AlertDialogAction>
          {isOwner ? (
            <AlertDialogAction asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href={`/ads/${ad.id}/edit`}>
                <PencilLine className="h-4 w-4" />
                {manageCopy.editAction}
              </Link>
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (variant !== 'default') {
    const isCompactVariant = variant === 'mobile_compact' || variant === 'real_estate_mobile_compact';
    // Diqqat: Tailwind masshtabida 2.25 / 2.75 / 1.25 qadamlari yo'q — eski
    // `pb-2.25` kabi klasslar umuman CSS bermagani uchun karta matni pastki
    // chetga yopishib turardi.
    const mobileOverlayPaddingClass = isCompactVariant ? 'px-3 pb-3 pt-6' : 'px-3.5 pb-3.5 pt-7';
    const mobilePriceClass = isCompactVariant ? 'text-[0.92rem]' : 'text-[1rem]';
    const mobileTitleClass = isCompactVariant ? 'text-[0.76rem] leading-[1.2]' : 'text-[0.82rem] leading-[1.25]';
    const mobileMetaClass = isCompactVariant ? 'text-[0.64rem]' : 'text-[0.68rem]';
    const mobileBadgeClass = isCompactVariant ? 'px-1.5 py-0.5 text-[0.58rem]' : 'px-2 py-0.5 text-[0.6rem]';

    return (
      <article
        className={cn(
          'group relative overflow-hidden rounded-[1.6rem] border border-border/55 bg-card/92 shadow-[0_18px_42px_rgba(7,28,85,0.14)] dark:shadow-[0_18px_42px_rgba(0,0,0,0.32)]',
          className
        )}
      >
        <Link
          href={adHref}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {!hasImages ? (
            // Belgi rasm maydonining faqat yuqori qismida turadi: pastki qismni
            // narx va sarlavha egallaydi, ilgari ular ustma-ust tushardi.
            <div className={cn('relative bg-muted', isCompactVariant ? 'aspect-[92/100]' : 'aspect-[94/100]')}>
              <div className="absolute inset-x-0 top-0 flex h-[58%] flex-col items-center justify-center gap-1.5 text-muted-foreground">
                <ImageOff className="h-7 w-7 opacity-40" aria-hidden="true" />
                <span className="text-[0.66rem] font-medium opacity-60">{messages.adCard.noPhoto}</span>
              </div>
            </div>
          ) : (
          <Carousel
            setApi={(api) => {
              setCarouselApi(api);
            }}
            opts={{
              align: 'start',
              loop: hasMultipleImages,
            }}
            className="touch-pan-y"
          >
            <CarouselContent className="-ml-0">
              {ad.images.map((image, index) => {
                const shouldDisableOptimization = image.startsWith('data:') || image.startsWith('blob:');

                return (
                  <CarouselItem key={`${ad.id}-${index}`} className="pl-0">
                    <div
                      className={cn(
                        'relative overflow-hidden',
                        isCompactVariant ? 'aspect-[92/100]' : 'aspect-[94/100]'
                      )}
                    >
                      <Image
                        src={image}
                        alt={`${localizedTitle} ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes={isCompactVariant ? '184px' : '(max-width: 768px) 50vw, 33vw'}
                        loading="lazy"
                        data-ai-hint="classified ad product"
                        draggable={false}
                        unoptimized={shouldDisableOptimization}
                      />
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
          )}

          {/* Gradient faqat matn turgan pastki qismni qoraytiradi, aks holda
              butun rasm xira ko'rinardi. */}
          <div
            className={cn('pointer-events-none absolute inset-x-0 bottom-0', hasImages ? 'h-3/5' : 'h-full')}
            style={{
              // Rasmsiz kartaning foni och: matn o'qilishi uchun gradient butun
              // kartaga yumshoq yoyiladi, aks holda o'rtada keskin chegara chiqadi.
              backgroundImage: hasImages
                ? 'linear-gradient(to top, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.58) 45%, rgba(0, 0, 0, 0) 100%)'
                : 'linear-gradient(to top, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.68) 30%, rgba(0, 0, 0, 0.28) 62%, rgba(0, 0, 0, 0.06) 100%)',
            }}
          />

          {/* Status va rasm hisoblagichi bitta qatorda: ilgari hisoblagich pastki
              o'ng burchakda matn ustiga tushib qolardi. */}
          {isSoldListing || hasMultipleImages ? (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
              {isSoldListing ? (
                <span className="rounded-full bg-black/60 px-2 py-[3px] text-[0.58rem] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-sm">
                  {manageCopy.soldStatus}
                </span>
              ) : null}
              {hasMultipleImages ? (
                <span className="rounded-full bg-black/45 px-2 py-[3px] text-[0.6rem] font-semibold text-white backdrop-blur-sm">
                  {selectedImageIndex + 1}/{ad.images.length}
                </span>
              ) : null}
            </div>
          ) : null}

          {mobileRibbonLabel ? (
            <div className="absolute -right-9 top-4 z-10 rotate-45 bg-[#FFD028] px-10 py-1 text-[0.72rem] font-black uppercase tracking-[0.16em] text-black shadow-[0_8px_18px_rgba(0,0,0,0.26)]">
              {mobileRibbonLabel}
            </div>
          ) : null}

          <div className={cn('absolute inset-x-0 bottom-0 z-10 text-white', mobileOverlayPaddingClass)}>
            <div className="space-y-1">
              <p
                className={cn(
                  'font-black leading-none tracking-[-0.03em] !text-white',
                  mobilePriceClass
                )}
              >
                {formattedPrice}
              </p>
              <h3
                className={cn(
                  'line-clamp-2 font-semibold !text-white',
                  mobileTitleClass
                )}
              >
                {localizedTitle}
              </h3>
            </div>

            <div className={cn('mt-2 flex items-center gap-1.5 text-white/84', mobileMetaClass)}>
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0 !text-white/92" />
                <span className="truncate !text-white/84">{hasLocation ? localizedLocation : localizedCategory}</span>
              </div>
              {mobileSecondaryLabel ? (
                <span className={cn('rounded-full bg-white/12 font-medium !text-white/92 backdrop-blur-sm', mobileBadgeClass)}>
                  {mobileSecondaryLabel}
                </span>
              ) : null}
            </div>

            {ad.vertical === 'real_estate' && (ad.rooms || ad.area) ? (
              <div className={cn('mt-1.5 flex flex-wrap items-center gap-2.5 text-white/84', mobileMetaClass)}>
                {ad.rooms ? (
                  <span className="inline-flex items-center gap-1 !text-white/84">
                    <BedDouble className="h-3 w-3 shrink-0 !text-white/92" />
                    {ad.rooms}
                  </span>
                ) : null}
                {ad.area ? (
                  <span className="inline-flex items-center gap-1 !text-white/84">
                    <Ruler className="h-3 w-3 shrink-0 !text-white/92" />
                    {ad.area} m²
                  </span>
                ) : null}
              </div>
            ) : null}

            {ad.vertical === 'auto' && autoMetaSummary ? (
              <div className={cn('mt-1.5 flex items-center gap-1 !text-white/72', isCompactVariant ? 'text-[0.6rem]' : 'text-[0.64rem]')}>
                <span className="truncate !text-white/72">{autoMetaSummary}</span>
              </div>
            ) : null}

            {ad.vertical !== 'real_estate' ? (
              <div className={cn('mt-1.5 flex items-center gap-1 !text-white/72', isCompactVariant ? 'text-[0.6rem]' : 'text-[0.64rem]')}>
                <Clock className="h-3 w-3 shrink-0 !text-white/88" />
                <span className="truncate !text-white/72">{postedAtLabel}</span>
              </div>
            ) : null}
          </div>
        </Link>

        {canManageAd
          ? renderManageDialog(
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-3 z-20 h-9 w-9 rounded-full border border-white/15 bg-black/45 text-white shadow-sm backdrop-blur-md after:absolute after:-inset-2 after:content-[''] hover:bg-black/60 hover:text-white",
                mobileRibbonLabel ? 'top-14' : 'top-3'
              )}
              onClick={(event) => {
                event.stopPropagation();
              }}
              disabled={isDeleting}
              aria-label={manageCopy.action}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
            </Button>
          )
          : null}
      </article>
    );
  }

  return (
    <Card
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-[1.45rem] border-border/50 bg-card/96 shadow-[0_16px_32px_rgba(7,28,85,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_42px_rgba(7,28,85,0.12)] sm:rounded-[1.65rem]',
        className
      )}
    >
      <div className="relative overflow-hidden bg-muted/70">
        {!hasImages ? (
          <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 bg-muted text-muted-foreground sm:aspect-[4/3]">
            <ImageOff className="h-8 w-8 opacity-45" aria-hidden="true" />
            <span className="text-xs font-medium opacity-70">{messages.adCard.noPhoto}</span>
          </div>
        ) : (
        <Carousel
          setApi={(api) => {
            setCarouselApi(api);
          }}
          opts={{
            align: 'start',
            loop: hasMultipleImages,
          }}
          className="touch-pan-y"
        >
          <CarouselContent className="-ml-0">
            {ad.images.map((image, index) => {
              const shouldDisableOptimization = image.startsWith('data:') || image.startsWith('blob:');

              return (
                <CarouselItem key={`${ad.id}-${index}`} className="pl-0">
                  <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[4/3]">
                    <Image
                      src={image}
                      alt={`${localizedTitle} ${index + 1}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 16vw"
                      loading="lazy"
                      data-ai-hint="classified ad product"
                      draggable={false}
                      unoptimized={shouldDisableOptimization}
                    />
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/45 via-slate-950/10 to-transparent" />
        <div className="absolute left-2 top-2 z-20 flex flex-wrap items-center gap-2">
          {ad.status === 'sold' ? (
            <Badge className="rounded-full border-transparent bg-amber-500/18 px-2.5 py-1 text-[0.68rem] font-bold text-amber-100 shadow-sm dark:text-amber-200">
              {manageCopy.soldStatus}
            </Badge>
          ) : null}
          {featuredLabel || ad.isFeatured ? (
            <Badge className="rounded-full bg-accent px-2.5 py-1 text-[0.68rem] font-bold text-accent-foreground shadow-sm">
              {featuredLabel || messages.adCard.featured}
            </Badge>
          ) : null}
        </div>
        <div className="absolute right-2 top-2 z-20 flex items-center gap-2 sm:right-3 sm:top-3">
          {canManageAd
            ? renderManageDialog(
              <Button
                variant="ghost"
                size="icon"
                className="touch-target h-11 w-11 rounded-full border border-border/60 bg-background/88 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background sm:h-10 sm:w-10"
                onClick={(event) => {
                  event.stopPropagation();
                }}
                disabled={isDeleting}
                aria-label={manageCopy.action}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
              </Button>
            )
            : null}

          <AdShareActions
            ad={ad}
            locale={locale}
            preventNavigation
            menuButtonClassName="h-9 w-9 sm:h-10 sm:w-10"
          />

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-9 w-9 rounded-full border border-border/60 bg-background/88 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background sm:h-10 sm:w-10',
              isFavorite ? 'text-red-500' : 'text-muted-foreground'
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();

              if (!user) {
                toast({
                  title: messages.auth.favoriteLoginTitle,
                  description: messages.auth.favoriteLoginDescription,
                  variant: 'destructive',
                });
                router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
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
            }}
            aria-label={messages.navbar.favorites}
          >
            <Heart className={cn('h-5 w-5', isFavorite && 'fill-current')} />
          </Button>
        </div>
        {hasMultipleImages ? (
          <>
            <div className="absolute inset-y-0 left-0 right-0 z-10 hidden items-center justify-between px-2 sm:flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full border border-border/60 bg-background/88 text-primary shadow-sm backdrop-blur-sm hover:bg-background"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  carouselApi?.scrollPrev();
                }}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full border border-border/60 bg-background/88 text-primary shadow-sm backdrop-blur-sm hover:bg-background"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  carouselApi?.scrollNext();
                }}
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
              {ad.images.map((_, index) => (
                <button
                  key={`${ad.id}-dot-${index}`}
                  type="button"
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    selectedImageIndex === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    carouselApi?.scrollTo(index);
                  }}
                  aria-label={`Go to image ${index + 1}`}
                  aria-current={selectedImageIndex === index}
                />
              ))}
            </div>
            <div className="absolute bottom-2 right-2 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[0.68rem] font-semibold text-white backdrop-blur-sm">
              {selectedImageIndex + 1}/{ad.images.length}
            </div>
          </>
        ) : null}
      </div>

      <CardContent className="flex flex-1 p-0">
        <Link
          href={adHref}
          className="flex flex-1 flex-col gap-3 p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-[1rem] font-extrabold leading-tight tracking-[-0.02em] text-primary sm:text-[1.12rem]">
              {formattedPrice}
            </span>
          </div>
          <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-5 text-foreground transition-colors group-hover:text-primary sm:min-h-[3rem] sm:text-base sm:leading-6">
            {localizedTitle}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[0.66rem] text-primary/90">
              {localizedCategory}
            </Badge>
            <Badge variant="outline" className="text-[0.66rem]">
              {secondaryMetaLabel}
            </Badge>
          </div>
          <div className="mt-auto grid gap-2 text-[0.76rem] text-muted-foreground sm:text-sm">
            {hasLocation ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{localizedLocation}</span>
              </div>
            ) : null}
            {ad.vertical === 'auto' && autoMetaSummary ? (
              <div className="flex items-center gap-1.5">
                <span className="truncate">{autoMetaSummary}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{postedAtLabel}</span>
            </div>
            {ad.sellerPhone ? (
              <div className="hidden items-center gap-1.5 sm:flex">
                <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{ad.sellerPhone}</span>
              </div>
            ) : null}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
