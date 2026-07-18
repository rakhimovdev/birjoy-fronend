'use client';

import { Eye, Loader2, Phone, RefreshCcw, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { fetchAds } from '@/lib/ads';
import { getLocalizedText } from '@/lib/i18n';
import type { Ad } from '@/lib/types';
import { cn } from '@/lib/utils';

type RealEstateTopUsersSheetProps = {
  className?: string;
};

type RankedUser = {
  key: string;
  name: string;
  listingCount: number;
  totalViews: number;
  totalContacts: number;
  topAd: Ad;
};

function buildRankedUsers(ads: Ad[]) {
  const groupedUsers = new Map<string, RankedUser>();

  ads.forEach((ad) => {
    const sellerName = ad.userName.trim() || 'BirJoy user';
    const userKey = ad.userId.trim() || sellerName.toLowerCase();
    const existing = groupedUsers.get(userKey);

    if (existing) {
      existing.listingCount += 1;
      existing.totalViews += ad.viewCount;
      existing.totalContacts += ad.contactCount;

      if (new Date(ad.createdAt).getTime() > new Date(existing.topAd.createdAt).getTime()) {
        existing.topAd = ad;
      }

      return;
    }

    groupedUsers.set(userKey, {
      key: userKey,
      name: sellerName,
      listingCount: 1,
      totalViews: ad.viewCount,
      totalContacts: ad.contactCount,
      topAd: ad,
    });
  });

  return [...groupedUsers.values()]
    .sort((left, right) => {
      if (right.listingCount !== left.listingCount) {
        return right.listingCount - left.listingCount;
      }

      if (right.totalViews !== left.totalViews) {
        return right.totalViews - left.totalViews;
      }

      if (right.totalContacts !== left.totalContacts) {
        return right.totalContacts - left.totalContacts;
      }

      return new Date(right.topAd.createdAt).getTime() - new Date(left.topAd.createdAt).getTime();
    })
    .slice(0, 10);
}

export function RealEstateTopUsersSheet({ className }: RealEstateTopUsersSheetProps) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadNonce, setLoadNonce] = useState(0);

  const copy =
    locale === 'ru'
      ? {
          button: 'TOP 10',
          title: 'TOP 10 пользователей',
          listings: 'объявлений',
          views: 'просмотры',
          contacts: 'контакты',
          empty: 'Пока нет пользователей для рейтинга.',
          retry: 'Повторить',
          close: 'Закрыть',
        }
      : locale === 'en'
        ? {
            button: 'TOP 10',
            title: 'TOP 10 users',
            listings: 'listings',
            views: 'views',
            contacts: 'contacts',
            empty: 'No ranked users yet.',
            retry: 'Retry',
            close: 'Close',
          }
        : {
            button: 'TOP 10',
            title: 'TOP 10 userlar',
            listings: 'eʼlon',
            views: 'ko‘rish',
            contacts: 'kontakt',
            empty: 'Hozircha reyting uchun userlar yo‘q.',
            retry: 'Qayta urinish',
            close: 'Yopish',
          };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleViewportChange = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    handleViewportChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);

      return () => {
        mediaQuery.removeEventListener('change', handleViewportChange);
      };
    }

    mediaQuery.addListener(handleViewportChange);

    return () => {
      mediaQuery.removeListener(handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const abortController = new AbortController();

    async function loadTopUsers() {
      try {
        setIsLoading(true);
        const response = await fetchAds({
          vertical: 'real_estate',
          fields: 'card',
          status: 'active',
          limit: 100,
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        setAds(response);
        setError(null);
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return;
        }

        setAds([]);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load users.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadTopUsers();

    return () => {
      abortController.abort();
    };
  }, [loadNonce, open]);

  const rankedUsers = useMemo(() => buildRankedUsers(ads), [ads]);
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'uz-UZ'),
    [locale]
  );
  const sheetSide = isMobileViewport ? 'bottom' : 'right';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-11 rounded-full border border-white/55 bg-background/78 px-3.5 text-[0.78rem] font-black tracking-[-0.04em] shadow-none hover:bg-background sm:h-12 sm:px-4 sm:text-xs',
            className
          )}
        >
          {copy.button}
        </Button>
      </SheetTrigger>

      <SheetContent
        side={sheetSide}
        className={cn(
          'flex overflow-hidden bg-background/98 p-0',
          isMobileViewport
            ? 'h-[min(88dvh,820px)] flex-col rounded-t-[1.85rem] border-t border-border/60'
            : 'h-full w-full flex-col border-l border-border/60 sm:max-w-lg'
        )}
      >
        <SheetHeader className="shrink-0 px-5 pb-4 pt-6 pr-14 sm:px-6">
          <SheetTitle>{copy.title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
          {isLoading ? (
            <div className="flex h-full min-h-52 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="soft-panel space-y-4 rounded-[1.4rem] p-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button type="button" variant="outline" className="gap-2" onClick={() => setLoadNonce((value) => value + 1)}>
                <RefreshCcw className="h-4 w-4" />
                {copy.retry}
              </Button>
            </div>
          ) : rankedUsers.length === 0 ? (
            <div className="soft-panel rounded-[1.4rem] p-4 text-sm text-muted-foreground">
              {copy.empty}
            </div>
          ) : (
            <div className="space-y-3">
              {rankedUsers.map((user, index) => {
                const localizedLocation =
                  getLocalizedText(user.topAd.formattedAddress, locale) ||
                  getLocalizedText(user.topAd.location, locale);

                return (
                  <div
                    key={user.key}
                    className="soft-panel flex items-start gap-3 rounded-[1.45rem] p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-black text-primary">
                      {index + 1}
                    </div>

                    <Avatar className="h-11 w-11 shrink-0 border border-white/15">
                      <AvatarFallback className="bg-primary/10 font-bold text-primary">
                        {user.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part.charAt(0).toUpperCase())
                          .join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                        {localizedLocation ? (
                          <p className="truncate text-xs text-muted-foreground">{localizedLocation}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          <Users className="mr-1 h-3 w-3" />
                          {numberFormatter.format(user.listingCount)} {copy.listings}
                        </Badge>
                        <Badge variant="outline">
                          <Eye className="mr-1 h-3 w-3" />
                          {numberFormatter.format(user.totalViews)} {copy.views}
                        </Badge>
                        <Badge variant="outline">
                          <Phone className="mr-1 h-3 w-3" />
                          {numberFormatter.format(user.totalContacts)} {copy.contacts}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 border-t border-border/60 bg-background px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:pb-4">
          <Button type="button" variant="ghost" className="h-11 rounded-[1.15rem]" onClick={() => setOpen(false)}>
            {copy.close}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
