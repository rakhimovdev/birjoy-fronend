'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Loader2, MapPin, Clock, Phone, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const previewImage = ad.images[0];
  const shouldDisableOptimization = previewImage.startsWith('data:') || previewImage.startsWith('blob:');

  return (
    <Card
      className={cn(
        'group overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg',
        className
      )}
    >
      <Link href={`/ads/${ad.id}`} className="relative block aspect-[4/3] overflow-hidden">
        <Image
          src={previewImage}
          alt={localizedTitle}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          data-ai-hint="classified ad product"
          unoptimized={shouldDisableOptimization}
        />
        {ad.isFeatured ? (
          <Badge className="absolute left-2 top-2 bg-accent font-bold text-accent-foreground">
            {messages.adCard.featured}
          </Badge>
        ) : null}
        {canDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-12 top-2 h-8 w-8 rounded-full bg-white/85 text-destructive backdrop-blur-sm transition-colors hover:bg-white"
                onClick={(event) => {
                  event.preventDefault();
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
            'absolute right-2 top-2 h-8 w-8 rounded-full bg-white/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-white',
            isFavorite ? 'text-red-500' : 'text-muted-foreground'
          )}
          onClick={(event) => {
            event.preventDefault();

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
      </Link>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <span className="text-xl font-bold text-primary">{formattedPrice}</span>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant="secondary" className="shrink-0">
              {localizedCategory}
            </Badge>
            <Badge variant="outline" className="shrink-0">
              {localizedCondition}
            </Badge>
          </div>
        </div>
        <Link href={`/ads/${ad.id}`} className="mb-3 block">
          <h3 className="line-clamp-2 text-lg font-semibold transition-colors group-hover:text-primary">
            {localizedTitle}
          </h3>
        </Link>
        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{localizedLocation}</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" />
            <span>{ad.sellerPhone}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {mounted
                ? formatDistanceToNow(new Date(ad.createdAt), {
                    addSuffix: true,
                    locale: languageMeta[locale].dateLocale,
                  })
                : messages.adCard.loadingTime}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
