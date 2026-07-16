'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BedDouble, ChevronLeft, ChevronRight, Clock, Heart, Loader2, MapPin, Phone, Ruler, Trash2 } from 'lucide-react';
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
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useToast } from '@/hooks/use-toast';
import { deleteAd, getConditionLabel } from '@/lib/ads';
import { deleteAdminAd } from '@/lib/admin';
import { getAdDisplayLocation } from '@/lib/listing-utils';
import { useAdminSession } from '@/hooks/use-admin-session';

interface AdCardProps {
  ad: Ad;
  className?: string;
  isFavorite?: boolean;
  canDelete?: boolean;
  onDeleted?: (adId: string) => void;
  variant?: 'default' | 'real_estate_mobile' | 'real_estate_mobile_compact';
  featuredLabel?: string;
}

export function AdCard({
  ad,
  className,
  isFavorite = false,
  canDelete = false,
  onDeleted,
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
  const realEstateMeta =
    ad.vertical === 'real_estate'
      ? [ad.rooms ? `${ad.rooms}R` : '', ad.area ? `${ad.area} m²` : ''].filter(Boolean).join(' · ')
      : '';
  const secondaryMetaLabel = ad.vertical === 'real_estate' && realEstateMeta ? realEstateMeta : localizedCondition;
  const deleteCopy =
    locale === 'ru'
      ? {
          action: 'Удалить',
          confirmTitle: 'Удалить объявление?',
          confirmDescription:
            'Это действие необратимо. Объявление исчезнет из витрины для всех пользователей.',
          confirm: 'Удалить',
          cancel: 'Отмена',
          successTitle: 'Объявление удалено',
          successDescription: 'Объявление было успешно удалено.',
          errorTitle: 'Не удалось удалить объявление',
        }
      : locale === 'en'
        ? {
            action: 'Delete',
            confirmTitle: 'Delete this listing?',
            confirmDescription:
              'This action cannot be undone. The listing will disappear from the marketplace for everyone.',
            confirm: 'Delete',
            cancel: 'Cancel',
            successTitle: 'Listing deleted',
            successDescription: 'The listing was removed successfully.',
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
            successDescription: 'Eʼlon muvaffaqiyatli o‘chirildi.',
            errorTitle: "Eʼlon o‘chirilmadi",
          };

  const formattedPrice = new Intl.NumberFormat(languageMeta[locale].numberLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(ad.price);
  const adHref = `/ads/${ad.id}`;
  const userChipLabel = ad.userName.trim() || localizedCategory;
  const userInitials = userChipLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'B';
  const mobileRibbonLabel =
    featuredLabel || (ad.isFeatured ? messages.adCard.featured : '');
  const hasLocation = localizedLocation.trim().length > 0;
  const hasMultipleImages = ad.images.length > 1;
  const isOwner = user?.id === ad.userId;
  const canManageAd = canDelete || isAdmin || isOwner;
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
        title: deleteCopy.successTitle,
        description: deleteCopy.successDescription,
      });
    } catch (error) {
      toast({
        title: deleteCopy.errorTitle,
        description: error instanceof Error ? error.message : messages.auth.requestFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (variant !== 'default') {
    const isCompactVariant = variant === 'real_estate_mobile_compact';

    return (
      <article
        className={cn(
          'group relative overflow-hidden rounded-[1.7rem] border border-border/55 bg-card/92 shadow-[0_18px_42px_rgba(7,28,85,0.14)] dark:shadow-[0_18px_42px_rgba(0,0,0,0.32)]',
          className
        )}
      >
        <Link
          href={adHref}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
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
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <Image
                        src={image}
                        alt={`${localizedTitle} ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes={isCompactVariant ? '188px' : '(max-width: 768px) 50vw, 33vw'}
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

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

          <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-5.5rem)] items-center gap-2 rounded-full border border-white/10 bg-black/45 px-2.5 py-1.5 text-white backdrop-blur-md">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[0.68rem] font-bold">
              {userInitials}
            </span>
            <span className="truncate text-[0.82rem] font-semibold">{userChipLabel}</span>
          </div>

          {mobileRibbonLabel ? (
            <div className="absolute -right-9 top-4 z-10 rotate-45 bg-[#FFD028] px-10 py-1 text-[0.72rem] font-black uppercase tracking-[0.16em] text-black shadow-[0_8px_18px_rgba(0,0,0,0.26)]">
              {mobileRibbonLabel}
            </div>
          ) : null}

          {hasMultipleImages ? (
            <div className="absolute bottom-3 right-3 z-10 rounded-full bg-black/55 px-2 py-1 text-[0.66rem] font-semibold text-white backdrop-blur-sm">
              {selectedImageIndex + 1}/{ad.images.length}
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 z-10 p-3.5">
            <div className="space-y-1.5">
              <p
                className={cn(
                  'font-black leading-none tracking-[-0.03em] text-white',
                  isCompactVariant ? 'text-[1.05rem]' : 'text-[1.15rem]'
                )}
              >
                {formattedPrice}
              </p>
              <h3
                className={cn(
                  'line-clamp-2 font-semibold text-white',
                  isCompactVariant ? 'text-[0.98rem] leading-5' : 'text-[1.02rem] leading-[1.35]'
                )}
              >
                {localizedTitle}
              </h3>
            </div>

            <div className="mt-2 space-y-1.5 text-[0.78rem] text-white/82">
              {hasLocation ? (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-white/92" />
                  <span className="truncate">{localizedLocation}</span>
                </div>
              ) : null}

              {ad.vertical === 'real_estate' && (ad.rooms || ad.area) ? (
                <div className="flex flex-wrap items-center gap-3">
                  {ad.rooms ? (
                    <span className="inline-flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5 text-white/92" />
                      {ad.rooms}
                    </span>
                  ) : null}
                  {ad.area ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5 text-white/92" />
                      {ad.area} m²
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </Link>

        {canManageAd ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'absolute right-3 z-10 h-9 w-9 rounded-full border border-white/10 bg-black/45 text-white shadow-sm backdrop-blur-md hover:bg-black/60 hover:text-white',
                  mobileRibbonLabel ? 'top-14' : 'top-3'
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                disabled={isDeleting}
                aria-label={deleteCopy.action}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                  onClick={(event) => {
                    event.preventDefault();
                    void handleDeleteAd();
                  }}
                  disabled={isDeleting}
                >
                  {deleteCopy.confirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/45 via-slate-950/10 to-transparent" />
        {ad.isFeatured ? (
          <Badge className="absolute left-2 top-2 z-20 rounded-full bg-accent px-2.5 py-1 text-[0.68rem] font-bold text-accent-foreground shadow-sm">
            {messages.adCard.featured}
          </Badge>
        ) : null}
        <div className="absolute right-2 top-2 z-20 flex items-center gap-2 sm:right-3 sm:top-3">
          {canManageAd ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full border border-border/60 bg-background/88 text-destructive shadow-sm backdrop-blur-sm transition-colors hover:bg-background sm:h-10 sm:w-10"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  disabled={isDeleting}
                  aria-label={deleteCopy.action}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDeleteAd();
                    }}
                    disabled={isDeleting}
                  >
                    {deleteCopy.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}

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
