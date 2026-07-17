'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CarFront,
  Phone,
  Search,
  ShoppingBasket,
  Store,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { AdCard } from '@/components/ads/AdCard';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import {
  ListingsShowcaseSkeleton,
  MarketplaceErrorState,
  MarketplaceStatusCard,
} from '@/components/marketplace/MarketplaceStates';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAds } from '@/lib/ads';
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import { MARKETPLACE_VERTICALS, getVerticalHref } from '@/lib/mock-data';
import type { Ad, AdVertical } from '@/lib/types';
import { cn } from '@/lib/utils';

const RECENT_SEARCHES_STORAGE_KEY = 'birjoy-recent-searches';
const MAX_RECENT_SEARCHES = 5;

type SearchScope = 'all' | 'users' | AdVertical;

type SellerSearchResult = {
  key: string;
  name: string;
  phone: string;
  ads: Ad[];
  latestAd: Ad;
  verticals: AdVertical[];
};

function isSearchScope(value: string | null): value is SearchScope {
  return (
    value === 'all' ||
    value === 'users' ||
    value === 'real_estate' ||
    value === 'auto' ||
    value === 'market' ||
    value === 'food'
  );
}

function buildRecentSearches(nextQuery: string, currentSearches: string[]) {
  const trimmedQuery = nextQuery.trim();

  if (!trimmedQuery) {
    return currentSearches.slice(0, MAX_RECENT_SEARCHES);
  }

  return [trimmedQuery, ...currentSearches.filter((value) => value !== trimmedQuery)].slice(
    0,
    MAX_RECENT_SEARCHES
  );
}

function buildVerticalHrefWithQuery(vertical: AdVertical, query: string) {
  const href = getVerticalHref(vertical);
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return href;
  }

  const params = new URLSearchParams();
  params.set('q', trimmedQuery);

  return `${href}?${params.toString()}`;
}

function getSearchPageCopy(locale: 'uz' | 'ru' | 'en') {
  if (locale === 'ru') {
    return {
      kicker: 'Глобальный поиск',
      title: 'Ищите по всем разделам BirJoy',
      description:
        'Один запрос ищет жильё, авто, маркет, еду и продавцов, которые публикуют подходящие объявления.',
      placeholder: 'Ищите товары, услуги, места или продавцов...',
      clear: 'Очистить',
      searchHint: 'Быстрые разделы',
      recentSearches: 'Недавние запросы',
      recentEmpty: 'Ваши последние поиски появятся здесь.',
      verticalsTitle: 'Открыть разделы',
      verticalsDescription: 'Перейдите сразу в нужную витрину или начните поиск отсюда.',
      resultsTitle: 'Результаты по всему маркетплейсу',
      resultsDescription:
        'Ниже собраны объявления и продавцы, которые лучше всего подходят под ваш запрос.',
      sellersTitle: 'Продавцы',
      sellersDescription: 'Люди, у которых есть подходящие объявления по этому запросу.',
      matchingAds: 'объявлений',
      openListing: 'Открыть объявление',
      noResultsTitle: 'Ничего не найдено',
      noResultsDescription:
        'Попробуйте другой запрос или откройте один из разделов маркетплейса.',
      noScopeTitle: 'В этом разделе пока пусто',
      noScopeDescription: 'По вашему запросу есть результаты в других разделах. Переключитесь на "Все".',
      allScope: 'Все',
      usersScope: 'Продавцы',
      retry: 'Повторить',
    };
  }

  if (locale === 'en') {
    return {
      kicker: 'Global search',
      title: 'Search across all of BirJoy',
      description:
        'One search covers homes, cars, market items, food offers, and the sellers behind matching listings.',
      placeholder: 'Search products, services, places, or sellers...',
      clear: 'Clear',
      searchHint: 'Quick sections',
      recentSearches: 'Recent searches',
      recentEmpty: 'Your recent searches will appear here.',
      verticalsTitle: 'Jump into a section',
      verticalsDescription: 'Open a vertical directly or start a cross-market search from here.',
      resultsTitle: 'Marketplace-wide results',
      resultsDescription:
        'Listings and sellers are grouped below so mobile users can search everything from one screen.',
      sellersTitle: 'Sellers',
      sellersDescription: 'People who currently have matching listings for this search.',
      matchingAds: 'listings',
      openListing: 'Open listing',
      noResultsTitle: 'No matches yet',
      noResultsDescription:
        'Try another phrase or open one of the marketplace sections to browse manually.',
      noScopeTitle: 'Nothing in this section yet',
      noScopeDescription:
        'Your search has matches in other sections. Switch back to the full marketplace view.',
      allScope: 'All',
      usersScope: 'Users',
      retry: 'Retry',
    };
  }

  return {
    kicker: 'Global qidiruv',
    title: 'BirJoy bo‘ylab hamma narsani qidiring',
    description:
      'Bitta qidiruv bilan uy-joy, avtomobil, market, taomlar va mos eʼlon joylagan userlarni toping.',
    placeholder: 'Mahsulot, xizmat, joy yoki user qidiring...',
    clear: 'Tozalash',
    searchHint: 'Tezkor bo‘limlar',
    recentSearches: 'So‘nggi qidiruvlar',
    recentEmpty: 'Oxirgi qidiruvlaringiz shu yerda chiqadi.',
    verticalsTitle: 'Bo‘limlarga tez o‘tish',
    verticalsDescription: 'Kerakli vertikalni darrov oching yoki qidiruvni shu yerdan boshlang.',
    resultsTitle: 'Marketplace bo‘ylab natijalar',
    resultsDescription:
      'Telefon foydalanuvchisi bir oynaning ichida hamma narsani qidira olishi uchun natijalar bo‘limlarga ajratildi.',
    sellersTitle: 'Userlar',
    sellersDescription: 'Ushbu qidiruvga mos eʼlonlari bor userlar shu yerda chiqadi.',
    matchingAds: 'ta eʼlon',
    openListing: 'Eʼlonni ochish',
    noResultsTitle: 'Hozircha mos natija topilmadi',
    noResultsDescription:
      'Boshqa so‘z bilan urinib ko‘ring yoki marketplace bo‘limlaridan birini ochib qo‘lda ko‘rib chiqing.',
    noScopeTitle: 'Bu bo‘limda hali mos natija yo‘q',
    noScopeDescription:
      'Sizning qidiruvingiz boshqa bo‘limlarda natija berdi. "Hammasi" ko‘rinishiga qayting.',
    allScope: 'Hammasi',
    usersScope: 'Userlar',
    retry: 'Qayta urinish',
  };
}

export function MarketplaceSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, messages } = useI18n();
  const { isFavorite } = useAuth();
  const { isAdmin } = useAdminSession();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [activeScope, setActiveScope] = useState<SearchScope>(
    isSearchScope(searchParams.get('scope')) ? (searchParams.get('scope') as SearchScope) : 'all'
  );
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [loadRequestNonce, setLoadRequestNonce] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(searchQuery.trim());
  const copy = getSearchPageCopy(locale);
  const queryCountFormatter = useMemo(
    () => new Intl.NumberFormat(languageMeta[locale].numberLocale),
    [locale]
  );
  const currentQueryParam = searchParams.get('q')?.trim() ?? '';
  const currentScopeParam = isSearchScope(searchParams.get('scope'))
    ? (searchParams.get('scope') as SearchScope)
    : 'all';

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
    setActiveScope(isSearchScope(searchParams.get('scope')) ? currentScopeParam : 'all');
  }, [currentScopeParam, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedRecentSearches = JSON.parse(
        window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) || '[]'
      );

      if (Array.isArray(storedRecentSearches)) {
        setRecentSearches(
          storedRecentSearches
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .slice(0, MAX_RECENT_SEARCHES)
        );
      }
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    if (deferredQuery === currentQueryParam && activeScope === currentScopeParam) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (deferredQuery) {
      params.set('q', deferredQuery);
    } else {
      params.delete('q');
    }

    if (activeScope !== 'all') {
      params.set('scope', activeScope);
    } else {
      params.delete('scope');
    }

    const nextUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    router.replace(nextUrl, { scroll: false });
  }, [activeScope, currentQueryParam, currentScopeParam, deferredQuery, router, searchParams]);

  useEffect(() => {
    if (!deferredQuery) {
      setAds([]);
      setResultsError(null);
      setIsLoadingResults(false);
      return;
    }

    const abortController = new AbortController();

    async function loadResults() {
      try {
        setIsLoadingResults(true);
        const response = await fetchAds({
          search: deferredQuery,
          fields: 'card',
          status: 'active',
          limit: 100,
          signal: abortController.signal,
        });

        setAds(response);
        setResultsError(null);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setAds([]);
        setResultsError(error instanceof Error ? error.message : 'Unable to load search results.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingResults(false);
        }
      }
    }

    void loadResults();

    return () => {
      abortController.abort();
    };
  }, [deferredQuery, loadRequestNonce]);

  const persistRecentSearch = (value: string) => {
    const nextRecentSearches = buildRecentSearches(value, recentSearches);
    setRecentSearches(nextRecentSearches);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(nextRecentSearches));
    }
  };

  const adsByVertical = useMemo(
    () =>
      ads.reduce<Record<AdVertical, Ad[]>>(
        (accumulator, ad) => {
          accumulator[ad.vertical].push(ad);
          return accumulator;
        },
        {
          real_estate: [],
          auto: [],
          market: [],
          food: [],
        }
      ),
    [ads]
  );

  const sellerResults = useMemo<SellerSearchResult[]>(() => {
    const sellers = new Map<string, SellerSearchResult>();

    ads.forEach((ad) => {
      const sellerName = ad.userName.trim() || 'BirJoy';
      const sellerPhone = ad.sellerPhone.trim();
      const sellerKey = ad.userId.trim() || `${sellerName.toLowerCase()}-${sellerPhone}`;
      const existingSeller = sellers.get(sellerKey);

      if (!existingSeller) {
        sellers.set(sellerKey, {
          key: sellerKey,
          name: sellerName,
          phone: sellerPhone,
          ads: [ad],
          latestAd: ad,
          verticals: [ad.vertical],
        });
        return;
      }

      existingSeller.ads.push(ad);

      if (!existingSeller.phone && sellerPhone) {
        existingSeller.phone = sellerPhone;
      }

      if (!existingSeller.verticals.includes(ad.vertical)) {
        existingSeller.verticals.push(ad.vertical);
      }

      if (new Date(ad.createdAt).getTime() > new Date(existingSeller.latestAd.createdAt).getTime()) {
        existingSeller.latestAd = ad;
      }
    });

    return [...sellers.values()].sort((left, right) => {
      if (left.ads.length !== right.ads.length) {
        return right.ads.length - left.ads.length;
      }

      return new Date(right.latestAd.createdAt).getTime() - new Date(left.latestAd.createdAt).getTime();
    });
  }, [ads]);

  const scopeItems = useMemo(
    () => [
      {
        id: 'all' as const,
        label: copy.allScope,
        icon: Search,
        count: ads.length,
      },
      {
        id: 'real_estate' as const,
        label: getLocalizedText(MARKETPLACE_VERTICALS[0].name, locale),
        icon: Building2,
        count: adsByVertical.real_estate.length,
      },
      {
        id: 'auto' as const,
        label: getLocalizedText(MARKETPLACE_VERTICALS[1].name, locale),
        icon: CarFront,
        count: adsByVertical.auto.length,
      },
      {
        id: 'market' as const,
        label: getLocalizedText(MARKETPLACE_VERTICALS[2].name, locale),
        icon: ShoppingBasket,
        count: adsByVertical.market.length,
      },
      {
        id: 'food' as const,
        label: getLocalizedText(MARKETPLACE_VERTICALS[3].name, locale),
        icon: UtensilsCrossed,
        count: adsByVertical.food.length,
      },
      {
        id: 'users' as const,
        label: copy.usersScope,
        icon: Users,
        count: sellerResults.length,
      },
    ],
    [ads.length, adsByVertical, copy.allScope, copy.usersScope, locale, sellerResults.length]
  );

  const hasQuery = deferredQuery.length > 0;
  const visibleScopedAds =
    activeScope === 'all' || activeScope === 'users' ? [] : adsByVertical[activeScope];
  const hasScopedMatches =
    activeScope === 'users'
      ? sellerResults.length > 0
      : activeScope === 'all'
        ? ads.length > 0 || sellerResults.length > 0
        : visibleScopedAds.length > 0;

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    setSearchQuery(trimmedQuery);

    if (trimmedQuery) {
      persistRecentSearch(trimmedQuery);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setResultsError(null);
  };

  const renderSellerResults = () => {
    if (sellerResults.length === 0) {
      return null;
    }

    return (
      <section className="surface-card section-shell rounded-[1.85rem]">
        <div className="section-header">
          <div className="section-header__copy">
            <p className="section-kicker">{copy.sellersTitle}</p>
            <h2 className="section-title">{copy.sellersTitle}</h2>
            <p className="section-caption">{copy.sellersDescription}</p>
          </div>
          <Badge variant="outline">
            {queryCountFormatter.format(sellerResults.length)} {copy.usersScope}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sellerResults.map((seller) => {
            const initials =
              seller.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase())
                .join('') || 'BJ';

            return (
              <article
                key={seller.key}
                className="rounded-[1.5rem] border border-border/60 bg-card/92 p-5 shadow-[0_14px_32px_rgba(7,28,85,0.08)] dark:shadow-[0_18px_36px_rgba(0,0,0,0.22)]"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 border border-primary/15">
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="truncate text-lg font-semibold">{seller.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {queryCountFormatter.format(seller.ads.length)} {copy.matchingAds}
                    </p>
                    {seller.phone ? (
                      <a
                        href={`tel:${seller.phone}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                      >
                        <Phone className="h-4 w-4" />
                        <span>{seller.phone}</span>
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {seller.verticals.map((vertical) => {
                    const verticalConfig = MARKETPLACE_VERTICALS.find((item) => item.id === vertical);

                    return verticalConfig ? (
                      <Badge key={`${seller.key}-${vertical}`} variant="secondary">
                        {getLocalizedText(verticalConfig.name, locale)}
                      </Badge>
                    ) : null;
                  })}
                </div>

                <Button asChild className="mt-5 w-full gap-2">
                  <Link href={`/ads/${seller.latestAd.id}`}>
                    {copy.openListing}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  const renderListingSection = ({
    vertical,
    items,
    limit,
  }: {
    vertical: AdVertical;
    items: Ad[];
    limit?: number;
  }) => {
    if (items.length === 0) {
      return null;
    }

    const verticalConfig = MARKETPLACE_VERTICALS.find((item) => item.id === vertical);

    if (!verticalConfig) {
      return null;
    }

    const visibleItems = typeof limit === 'number' ? items.slice(0, limit) : items;

    return (
      <section className="surface-card section-shell rounded-[1.85rem]">
        <div className="section-header">
          <div className="section-header__copy">
            <p className="section-kicker">{getLocalizedText(verticalConfig.name, locale)}</p>
            <h2 className="section-title">{getLocalizedText(verticalConfig.name, locale)}</h2>
            <p className="section-caption">{getLocalizedText(verticalConfig.description, locale)}</p>
          </div>
          <Button asChild variant="ghost" className="gap-1 px-0 font-semibold text-primary hover:bg-transparent">
            <Link href={buildVerticalHrefWithQuery(vertical, deferredQuery)}>
              {copy.searchHint}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="listing-grid">
          {visibleItems.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              isFavorite={isFavorite(ad.id)}
              canDelete={isAdmin}
              onDeleted={(adId) => {
                setAds((previous) => previous.filter((item) => item.id !== adId));
              }}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <section className="surface-card section-shell rounded-[1.85rem]">
          <div className="section-header">
            <div className="section-header__copy">
              <p className="section-kicker">{copy.kicker}</p>
              <h1 className="page-title font-bold text-primary">{copy.title}</h1>
              <p className="section-caption max-w-3xl">{copy.description}</p>
            </div>
            {hasQuery ? (
              <Button type="button" variant="outline" className="w-full min-[481px]:w-auto" onClick={handleClearSearch}>
                {copy.clear}
              </Button>
            ) : null}
          </div>

          <form onSubmit={handleSearchSubmit} className="grid gap-4">
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
                className="h-14 rounded-[1.35rem] border-white/55 bg-background/80 pl-12 pr-20 text-base shadow-none focus-visible:ring-primary"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  {copy.clear}
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {scopeItems.map((scopeItem) => {
                const Icon = scopeItem.icon;
                const isActive = activeScope === scopeItem.id;

                return (
                  <button
                    key={scopeItem.id}
                    type="button"
                    className={cn(
                      'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                      isActive
                        ? 'border-primary/15 bg-primary/10 text-primary'
                        : 'border-border/60 bg-background/72 text-foreground hover:border-primary/20 hover:bg-primary/5 hover:text-primary'
                    )}
                    onClick={() => {
                      setActiveScope(scopeItem.id);
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{scopeItem.label}</span>
                    {hasQuery ? (
                      <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
                        {queryCountFormatter.format(scopeItem.count)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </form>
        </section>

        {!hasQuery ? (
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="surface-card section-shell rounded-[1.85rem]">
              <div className="section-header">
                <div className="section-header__copy">
                  <p className="section-kicker">{copy.recentSearches}</p>
                  <h2 className="section-title">{copy.recentSearches}</h2>
                  <p className="section-caption">{copy.recentEmpty}</p>
                </div>
              </div>

              {recentSearches.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {recentSearches.map((recentSearch) => (
                    <button
                      key={recentSearch}
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
                      onClick={() => {
                        setSearchQuery(recentSearch);
                        persistRecentSearch(recentSearch);
                      }}
                    >
                      {recentSearch}
                    </button>
                  ))}
                </div>
              ) : (
                <MarketplaceStatusCard
                  title={copy.recentSearches}
                  description={copy.recentEmpty}
                  className="rounded-[1.5rem] px-0 py-8 shadow-none"
                />
              )}
            </section>

            <section className="surface-card section-shell rounded-[1.85rem]">
              <div className="section-header">
                <div className="section-header__copy">
                  <p className="section-kicker">{copy.verticalsTitle}</p>
                  <h2 className="section-title">{copy.verticalsTitle}</h2>
                  <p className="section-caption">{copy.verticalsDescription}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {MARKETPLACE_VERTICALS.map((vertical) => {
                  const Icon =
                    vertical.id === 'real_estate'
                      ? Building2
                      : vertical.id === 'auto'
                        ? CarFront
                        : vertical.id === 'market'
                          ? ShoppingBasket
                          : Store;

                  return (
                    <Link
                      key={vertical.id}
                      href={getVerticalHref(vertical.id)}
                      className="rounded-[1.4rem] border border-border/60 bg-background/84 p-4 transition-colors hover:border-primary/20 hover:bg-primary/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold">
                            {getLocalizedText(vertical.name, locale)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {getLocalizedText(vertical.tagline, locale)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        ) : isLoadingResults ? (
          <ListingsShowcaseSkeleton
            title={copy.resultsTitle}
            description={copy.resultsDescription}
            count={6}
          />
        ) : resultsError ? (
          <MarketplaceErrorState
            title={messages.createAd.submitError}
            description={resultsError}
            retryLabel={copy.retry}
            onRetry={() => {
              setLoadRequestNonce((currentValue) => currentValue + 1);
            }}
            secondaryAction={{
              label: messages.home.clearFilters,
              onClick: handleClearSearch,
              variant: 'outline',
            }}
          />
        ) : !hasScopedMatches ? (
          <MarketplaceStatusCard
            title={activeScope === 'all' ? copy.noResultsTitle : copy.noScopeTitle}
            description={activeScope === 'all' ? copy.noResultsDescription : copy.noScopeDescription}
            primaryAction={
              activeScope === 'all'
                ? {
                    label: messages.home.clearFilters,
                    onClick: handleClearSearch,
                  }
                : {
                    label: copy.allScope,
                    onClick: () => {
                      setActiveScope('all');
                    },
                  }
            }
            secondaryAction={{
              label: messages.home.startSelling,
              href: '/ads/create',
              variant: 'outline',
            }}
          />
        ) : (
          <>
            <section className="surface-card section-shell rounded-[1.85rem]">
              <div className="section-header">
                <div className="section-header__copy">
                  <p className="section-kicker">{copy.resultsTitle}</p>
                  <h2 className="section-title">{copy.resultsTitle}</h2>
                  <p className="section-caption">{copy.resultsDescription}</p>
                </div>
                <div className="status-strip">
                  <Badge variant="secondary">{deferredQuery}</Badge>
                  <Badge variant="outline">{queryCountFormatter.format(ads.length)}</Badge>
                  <Badge variant="outline">{queryCountFormatter.format(sellerResults.length)} {copy.usersScope}</Badge>
                </div>
              </div>
            </section>

            {activeScope === 'users' ? (
              renderSellerResults()
            ) : activeScope === 'all' ? (
              <>
                {renderSellerResults()}
                {renderListingSection({
                  vertical: 'real_estate',
                  items: adsByVertical.real_estate,
                  limit: 8,
                })}
                {renderListingSection({
                  vertical: 'auto',
                  items: adsByVertical.auto,
                  limit: 8,
                })}
                {renderListingSection({
                  vertical: 'market',
                  items: adsByVertical.market,
                  limit: 8,
                })}
                {renderListingSection({
                  vertical: 'food',
                  items: adsByVertical.food,
                  limit: 8,
                })}
              </>
            ) : (
              renderListingSection({
                vertical: activeScope,
                items: visibleScopedAds,
              })
            )}
          </>
        )}
      </main>
    </MarketplaceShell>
  );
}
