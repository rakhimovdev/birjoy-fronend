'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, Heart, Loader2, MapPin, Phone, Trash2 } from 'lucide-react';
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
import { getConditionLabel } from '@/lib/ads';
import { deleteAdminAd } from '@/lib/admin';

interface AdCardProps {
  ad: Ad;
  className?: string;
  isFavorite?: boolean;
  canDelete?: boolean;
  onDeleted?: (adId: string) => void;
}

export function AdCard({
  ad,
  className,
  isFavorite = false,
  canDelete = false,
  onDeleted,
}: AdCardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, toggleFavorite } = useAuth();
  const { locale, messages } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const category = getCategoryBySlug(ad.category);
  const localizedTitle = getLocalizedText(ad.title, locale);
  const localizedLocation = getLocalizedText(ad.location, locale);
  const localizedCategory = category
    ? getLocalizedText(category.name, locale)
    : messages.adCard.categoryFallback;
  const localizedCondition = getConditionLabel(ad.condition, locale);
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
          successDescription: 'Объявление было успешно удалено администратором.',
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

  const formattedPrice = new Intl.NumberFormat(languageMeta[locale].numberLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(ad.price);
  const adHref = `/ads/${ad.id}`;
  const hasLocation = localizedLocation.trim().length > 0;
  const hasMultipleImages = ad.images.length > 1;
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
      await deleteAdminAd(ad.id);
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

  return (
    <Card
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-[1.3rem] border-border/50 bg-card/95 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_42px_rgba(7,28,85,0.12)] sm:rounded-[1.6rem]',
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
        {ad.isFeatured ? (
          <Badge className="absolute left-2 top-2 z-20 rounded-full bg-accent px-2.5 py-1 text-[0.68rem] font-bold text-accent-foreground shadow-sm">
            {messages.adCard.featured}
          </Badge>
        ) : null}
        {canDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-11 top-2 z-20 h-9 w-9 rounded-full border border-border/60 bg-background/88 text-destructive shadow-sm backdrop-blur-sm transition-colors hover:bg-background sm:right-14 sm:top-3 sm:h-10 sm:w-10"
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
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute right-2 top-2 z-20 h-9 w-9 rounded-full border border-border/60 bg-background/88 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background sm:right-3 sm:top-3 sm:h-10 sm:w-10',
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

            const favoriteState = toggleFavorite(ad.id);

            toast({
              title: favoriteState
                ? messages.auth.favoriteAddedTitle
                : messages.auth.favoriteRemovedTitle,
              description: favoriteState
                ? messages.auth.favoriteAddedDescription
                : messages.auth.favoriteRemovedDescription,
            });
          }}
          aria-label={messages.navbar.favorites}
        >
          <Heart className={cn('h-5 w-5', isFavorite && 'fill-current')} />
        </Button>
        {hasMultipleImages ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
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
          </>
        ) : null}
      </div>

      <CardContent className="flex flex-1 p-0">
        <Link href={adHref} className="flex flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[0.98rem] font-bold leading-tight text-primary sm:text-lg">{formattedPrice}</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden rounded-full px-2.5 py-1 text-[0.68rem] font-semibold text-primary/85 sm:inline-flex">
                {localizedCategory}
              </Badge>
              <Badge variant="outline" className="hidden rounded-full px-2.5 py-1 text-[0.68rem] font-semibold sm:inline-flex">
                {localizedCondition}
              </Badge>
            </div>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground transition-colors group-hover:text-primary sm:text-base sm:leading-6">
            {localizedTitle}
          </h3>
          <div className="mt-auto grid gap-1.5 text-[0.72rem] text-muted-foreground sm:text-sm">
            {hasLocation ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{localizedLocation}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{postedAtLabel}</span>
            </div>
            {ad.sellerPhone ? (
              <div className="hidden items-center gap-1.5 sm:flex">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{ad.sellerPhone}</span>
              </div>
            ) : null}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
