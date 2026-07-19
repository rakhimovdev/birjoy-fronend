'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Mail, MapPin, Phone, Search, Users } from 'lucide-react';
import { AdCard } from '@/components/ads/AdCard';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import {
  ListingsShowcaseSkeleton,
  MarketplaceErrorState,
  MarketplaceStatusCard,
} from '@/components/marketplace/MarketplaceStates';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAdsPage } from '@/lib/ads';
import { getSearchableUsers } from '@/lib/auth';
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import { MARKETPLACE_VERTICALS } from '@/lib/mock-data';
import { filterAds, getAdDisplayLocation } from '@/lib/listing-utils';
import type { Ad, AdVertical, UserProfile } from '@/lib/types';

type SearchUserResult = {
  key: string;
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  location?: string;
  adsCount: number;
  latestAdId?: string;
  verticals: AdVertical[];
};

function getSearchPageCopy(locale: 'uz' | 'ru' | 'en') {
  if (locale === 'ru') {
    return {
      placeholder: 'Поиск товаров, услуг и пользователей...',
      usersTitle: 'Пользователи',
      usersDescription: 'Пользователи и продавцы, которые подходят под ваш запрос.',
      listingsTitle: 'Объявления',
      listingsDescription: 'Найденные объявления по всем разделам BirJoy.',
      openProfile: 'Открыть профиль',
      listings: 'объявлений',
      noResultsTitle: 'Ничего не найдено',
      noResultsDescription: 'Попробуйте другое слово, имя, телефон, адрес или категорию.',
      loadingTitle: 'Ищем по всему BirJoy',
      loadingDescription: 'Загружаем объявления и пользователей для глобального поиска.',
      retry: 'Повторить',
      searchErrorTitle: 'Поиск не загрузился',
    };
  }

  if (locale === 'en') {
    return {
      placeholder: 'Search products, services, and users...',
      usersTitle: 'Users',
      usersDescription: 'Users and sellers that match your search.',
      listingsTitle: 'Listings',
      listingsDescription: 'Matching listings across all BirJoy sections.',
      openProfile: 'Open profile',
      listings: 'listings',
      noResultsTitle: 'No results found',
      noResultsDescription: 'Try another word, name, phone, address, or category.',
      loadingTitle: 'Searching across BirJoy',
      loadingDescription: 'Loading listings and users for global search.',
      retry: 'Retry',
      searchErrorTitle: 'Search could not be loaded',
    };
  }

  return {
    placeholder: 'Mahsulot, xizmat va user qidiring...',
    usersTitle: 'Userlar',
    usersDescription: 'So‘rovingizga mos userlar va sotuvchilar.',
    listingsTitle: 'Eʼlonlar',
    listingsDescription: 'BirJoy bo‘ylab topilgan mos eʼlonlar.',
    openProfile: 'Profilni ochish',
    listings: 'eʼlon',
    noResultsTitle: 'Hech narsa topilmadi',
    noResultsDescription: 'Boshqa so‘z, ism, telefon, manzil yoki kategoriya bilan urinib ko‘ring.',
    loadingTitle: 'BirJoy bo‘ylab qidirilmoqda',
    loadingDescription: 'Global qidiruv uchun eʼlonlar va userlar yuklanmoqda.',
    retry: 'Qayta urinish',
    searchErrorTitle: 'Qidiruvni yuklab bo‘lmadi',
  };
}

function normalizeQueryValue(value: string) {
  return value.trim().toLowerCase();
}

function getAdUserKey(ad: Ad) {
  const normalizedUserId = ad.userId.trim();
  const normalizedName = ad.userName.trim().toLowerCase();
  const normalizedPhone = ad.sellerPhone.trim();

  return normalizedUserId || `${normalizedName}-${normalizedPhone}`;
}

function getKnownUserKey(user: UserProfile) {
  const normalizedEmail = user.email.trim().toLowerCase();
  const normalizedPhone = user.phone?.trim() || '';
  const normalizedName = user.name.trim().toLowerCase();

  return user.id.trim() || normalizedEmail || `${normalizedName}-${normalizedPhone}`;
}

function getUserLocationLabel(user: UserProfile, locale: 'uz' | 'ru' | 'en') {
  return user.location ? getLocalizedText(user.location, locale) : '';
}

function matchesUserQuery(user: UserProfile, query: string, locale: 'uz' | 'ru' | 'en') {
  if (!query) {
    return false;
  }

  const searchableValues = [
    user.name,
    user.email,
    user.phone || '',
    getUserLocationLabel(user, locale),
    user.accountType || '',
  ];

  return searchableValues.some((value) => normalizeQueryValue(value).includes(query));
}

export function MarketplaceSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const { isFavorite } = useAuth();
  const { isAdmin } = useAdminSession();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [allAds, setAllAds] = useState<Ad[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [loadRequestNonce, setLoadRequestNonce] = useState(0);
  const normalizedSearchQuery = searchQuery.trim();
  const deferredQuery = useDeferredValue(normalizedSearchQuery);
  const currentQueryParam = searchParams.get('q')?.trim() ?? '';
  const hasQuery = normalizedSearchQuery.length > 0;
  const copy = getSearchPageCopy(locale);
  const countFormatter = useMemo(
    () => new Intl.NumberFormat(languageMeta[locale].numberLocale),
    [locale]
  );

  useEffect(() => {
    if (currentQueryParam !== normalizedSearchQuery) {
      setSearchQuery(currentQueryParam);
    }
  }, [currentQueryParam]);

  useEffect(() => {
    if (normalizedSearchQuery === currentQueryParam) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (normalizedSearchQuery) {
      params.set('q', normalizedSearchQuery);
    } else {
      params.delete('q');
    }

    params.delete('scope');

    const nextUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    router.replace(nextUrl, { scroll: false });
  }, [currentQueryParam, normalizedSearchQuery, router, searchParams]);

  useEffect(() => {
    if (!hasQuery) {
      setResultsError(null);
      setIsLoadingResults(false);
      return;
    }

    const abortController = new AbortController();

    async function loadAllAds() {
      try {
        setIsLoadingResults(true);
        const collectedAds: Ad[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && !abortController.signal.aborted) {
          const response = await fetchAdsPage({
            page,
            limit: 100,
            fields: 'full',
            status: 'active',
            signal: abortController.signal,
          });

          collectedAds.push(...response.ads);
          hasMore = response.pagination.hasMore;
          page += 1;
        }

        if (abortController.signal.aborted) {
          return;
        }

        setAllAds(collectedAds);
        setResultsError(null);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setAllAds([]);
        setResultsError(error instanceof Error ? error.message : copy.searchErrorTitle);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingResults(false);
        }
      }
    }

    void loadAllAds();

    return () => {
      abortController.abort();
    };
  }, [copy.searchErrorTitle, hasQuery, loadRequestNonce]);

  const filteredAds = useMemo(() => {
    if (!hasQuery) {
      return [] as Ad[];
    }

    return [...filterAds(allAds, { query: deferredQuery })].sort((left, right) => {
      if (Boolean(left.isFeatured) !== Boolean(right.isFeatured)) {
        return left.isFeatured ? -1 : 1;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [allAds, deferredQuery, hasQuery]);

  const userResults = useMemo<SearchUserResult[]>(() => {
    if (!hasQuery) {
      return [];
    }

    const matchingQuery = normalizeQueryValue(deferredQuery);
    const allAdsByUser = new Map<string, Ad[]>();
    const resultMap = new Map<string, SearchUserResult>();

    allAds.forEach((ad) => {
      const userKey = getAdUserKey(ad);
      const existingAds = allAdsByUser.get(userKey);

      if (existingAds) {
        existingAds.push(ad);
      } else {
        allAdsByUser.set(userKey, [ad]);
      }
    });

    filteredAds.forEach((ad) => {
      const userKey = getAdUserKey(ad);
      const sellerAds = allAdsByUser.get(userKey) || [ad];
      const latestAd = [...sellerAds].sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      })[0];

      resultMap.set(userKey, {
        key: userKey,
        id: ad.userId.trim() || undefined,
        name: ad.userName.trim() || 'BirJoy user',
        phone: ad.sellerPhone.trim() || undefined,
        location: getLocalizedText(getAdDisplayLocation(latestAd), locale),
        adsCount: sellerAds.length,
        latestAdId: latestAd.id,
        verticals: [...new Set(sellerAds.map((item) => item.vertical))],
      });
    });

    getSearchableUsers().forEach((user) => {
      const knownUserKey = getKnownUserKey(user);
      const matchingAdsForUser =
        allAdsByUser.get(user.id.trim()) ||
        allAdsByUser.get(knownUserKey) ||
        [];
      const matchedByUserFields = matchesUserQuery(user, matchingQuery, locale);

      if (!matchedByUserFields && matchingAdsForUser.length === 0) {
        return;
      }

      const latestAd = [...matchingAdsForUser].sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      })[0];
      const existingResult = resultMap.get(user.id) || resultMap.get(knownUserKey);
      const matchingVerticals = [...new Set(matchingAdsForUser.map((item) => item.vertical))];

      resultMap.set(user.id, {
        key: user.id,
        id: user.id,
        name: user.name.trim(),
        email: user.email.trim(),
        phone: user.phone?.trim() || existingResult?.phone,
        avatar: user.avatar,
        location:
          getUserLocationLabel(user, locale) ||
          existingResult?.location ||
          (latestAd ? getLocalizedText(getAdDisplayLocation(latestAd), locale) : ''),
        adsCount: matchingAdsForUser.length || existingResult?.adsCount || 0,
        latestAdId: latestAd?.id || existingResult?.latestAdId,
        verticals: matchingVerticals.length > 0 ? matchingVerticals : (existingResult?.verticals ?? []),
      });
    });

    return [...resultMap.values()].sort((left, right) => {
      if (left.adsCount !== right.adsCount) {
        return right.adsCount - left.adsCount;
      }

      return left.name.localeCompare(right.name);
    });
  }, [allAds, deferredQuery, filteredAds, hasQuery, locale]);

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <div className="mx-auto w-full max-w-3xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              autoFocus
              autoComplete="off"
              placeholder={copy.placeholder}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
              className="h-14 rounded-[1.35rem] border-white/55 bg-background/80 pl-12 pr-5 text-base shadow-none focus-visible:ring-primary"
            />
          </div>
        </div>

        {!hasQuery ? null : isLoadingResults ? (
          <ListingsShowcaseSkeleton
            title={copy.loadingTitle}
            description={copy.loadingDescription}
            count={4}
          />
        ) : resultsError ? (
          <MarketplaceErrorState
            title={copy.searchErrorTitle}
            description={resultsError}
            retryLabel={copy.retry}
            onRetry={() => {
              setLoadRequestNonce((currentValue) => currentValue + 1);
            }}
          />
        ) : userResults.length === 0 && filteredAds.length === 0 ? (
          <MarketplaceStatusCard
            title={copy.noResultsTitle}
            description={copy.noResultsDescription}
          />
        ) : (
          <div className="page-stack">
            {userResults.length > 0 ? (
              <section className="surface-card section-shell rounded-[1.85rem]">
                <div className="section-header">
                  <div className="section-header__copy">
                    <p className="section-kicker">{copy.usersTitle}</p>
                    <h2 className="section-title">{copy.usersTitle}</h2>
                    <p className="section-caption">{copy.usersDescription}</p>
                  </div>
                  <Badge variant="outline">
                    {countFormatter.format(userResults.length)}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {userResults.map((userResult) => {
                    const initials =
                      userResult.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part.charAt(0).toUpperCase())
                        .join('') || 'BJ';
                    const profileHref = userResult.id
                      ? `/users/${encodeURIComponent(userResult.id)}`
                      : userResult.latestAdId
                        ? `/ads/${userResult.latestAdId}`
                        : null;

                    return (
                      <article
                        key={userResult.key}
                        className="rounded-[1.5rem] border border-border/60 bg-card/92 p-5 shadow-[0_14px_32px_rgba(7,28,85,0.08)] dark:shadow-[0_18px_36px_rgba(0,0,0,0.22)]"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12 border border-primary/15">
                            <AvatarImage src={userResult.avatar} alt={userResult.name} />
                            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-lg font-semibold">{userResult.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {countFormatter.format(userResult.adsCount)} {copy.listings}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                          {userResult.phone ? (
                            <div className="flex items-center gap-2 break-all">
                              <Phone className="h-4 w-4 shrink-0" />
                              <span>{userResult.phone}</span>
                            </div>
                          ) : null}
                          {userResult.email ? (
                            <div className="flex items-center gap-2 break-all">
                              <Mail className="h-4 w-4 shrink-0" />
                              <span>{userResult.email}</span>
                            </div>
                          ) : null}
                          {userResult.location ? (
                            <div className="flex items-center gap-2 break-all">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span>{userResult.location}</span>
                            </div>
                          ) : null}
                        </div>

                        {userResult.verticals.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {userResult.verticals.map((vertical) => {
                              const verticalConfig = MARKETPLACE_VERTICALS.find((item) => item.id === vertical);

                              return verticalConfig ? (
                                <Badge key={`${userResult.key}-${vertical}`} variant="secondary">
                                  {getLocalizedText(verticalConfig.name, locale)}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        ) : null}

                        {profileHref ? (
                          <Button asChild className="mt-5 w-full gap-2">
                            <Link href={profileHref}>
                              <Users className="h-4 w-4" />
                              {copy.openProfile}
                            </Link>
                          </Button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {filteredAds.length > 0 ? (
              <section className="surface-card section-shell rounded-[1.85rem]">
                <div className="section-header">
                  <div className="section-header__copy">
                    <p className="section-kicker">{copy.listingsTitle}</p>
                    <h2 className="section-title">{copy.listingsTitle}</h2>
                    <p className="section-caption">{copy.listingsDescription}</p>
                  </div>
                  <Badge variant="outline">
                    {countFormatter.format(filteredAds.length)}
                  </Badge>
                </div>

                <div className="listing-grid">
                  {filteredAds.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      isFavorite={isFavorite(ad.id)}
                      canDelete={isAdmin}
                      onDeleted={(adId) => {
                        setAllAds((previous) => previous.filter((item) => item.id !== adId));
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </MarketplaceShell>
  );
}
