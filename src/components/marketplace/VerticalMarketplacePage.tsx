'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpDown } from 'lucide-react';
import { CategoryBar } from '@/components/ads/CategoryBar';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { AdCard } from '@/components/ads/AdCard';
import {
  ListingsShowcaseSkeleton,
  MarketplaceErrorState,
  MarketplaceStatusCard,
} from '@/components/marketplace/MarketplaceStates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAdsPage } from '@/lib/ads';
import { AUTO_FUEL_OPTIONS, AUTO_TRANSMISSION_OPTIONS } from '@/lib/auto-config';
import { getLocalizedText } from '@/lib/i18n';
import { getCategoriesForVertical, getCategoryBySlug, getVerticalHref } from '@/lib/mock-data';
import type { Ad, AdVertical } from '@/lib/types';

export function VerticalMarketplacePage({ vertical }: { vertical: AdVertical }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isFavorite } = useAuth();
  const { locale, messages } = useI18n();
  const { isAdmin } = useAdminSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ hasMore: false, limit: 12, page: 1, total: 0 });
  const [loadRequestNonce, setLoadRequestNonce] = useState(0);
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest');
  const [fuelType, setFuelType] = useState(searchParams.get('fuelType') ?? '');
  const [transmission, setTransmission] = useState(searchParams.get('transmission') ?? '');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page') ?? '1'));
  const query = searchParams.get('q')?.trim() ?? '';
  const category = searchParams.get('category')?.trim() ?? '';
  const basePath = getVerticalHref(vertical);
  const activeCategory = category || null;
  const activeCategoryRecord = activeCategory ? getCategoryBySlug(activeCategory) : null;
  const activeCategoryLabel = activeCategoryRecord
    ? getLocalizedText(activeCategoryRecord.name, locale)
    : activeCategory;
  const retryLabel = locale === 'ru' ? 'Повторить' : locale === 'en' ? 'Retry' : 'Qayta urinish';
  const verticalCategories = useMemo(() => getCategoriesForVertical(vertical), [vertical]);
  const shouldShowCategoryBar = vertical === 'auto';
  const shouldShowAutoFilters = vertical === 'auto';
  const hasActiveAutoFilters = shouldShowAutoFilters && (sort !== 'newest' || Boolean(fuelType) || Boolean(transmission));

  useEffect(() => {
    setSort(searchParams.get('sort') ?? 'newest');
    setFuelType(searchParams.get('fuelType') ?? '');
    setTransmission(searchParams.get('transmission') ?? '');
    setCurrentPage(Number(searchParams.get('page') ?? '1'));
  }, [searchParams]);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadAds() {
      try {
        setIsLoadingAds(true);
        const response = await fetchAdsPage({
          vertical,
          category: activeCategory || undefined,
          search: query || undefined,
          fields: 'card',
          status: 'active',
          limit: 12,
          page: currentPage,
          sort: sort as 'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc',
          fuelType: fuelType || undefined,
          transmission: transmission || undefined,
          signal: abortController.signal,
        });
        setAds(response.ads);
        setPagination(response.pagination);
        setAdsError(null);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setAdsError(error instanceof Error ? error.message : 'Unable to load ads.');
        setAds([]);
        setPagination({ hasMore: false, limit: 12, page: 1, total: 0 });
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingAds(false);
        }
      }
    }

    void loadAds();

    return () => {
      abortController.abort();
    };
  }, [activeCategory, currentPage, fuelType, loadRequestNonce, query, sort, transmission, vertical]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (sort !== 'newest') {
      params.set('sort', sort);
    } else {
      params.delete('sort');
    }

    if (fuelType) {
      params.set('fuelType', fuelType);
    } else {
      params.delete('fuelType');
    }

    if (transmission) {
      params.set('transmission', transmission);
    } else {
      params.delete('transmission');
    }

    if (currentPage > 1) {
      params.set('page', String(currentPage));
    } else {
      params.delete('page');
    }

    const nextPath = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(nextPath, { scroll: false });
  }, [currentPage, fuelType, pathname, router, searchParams, sort, transmission]);

  const filteredAds = ads;
  const hasFilters = Boolean(query || activeCategory || hasActiveAutoFilters);
  const mobileResultsCount = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'uz-UZ').format(
        filteredAds.length
      ),
    [filteredAds.length, locale]
  );
  const mobileCopy =
    locale === 'ru'
      ? {
        resultsPrefix: 'Мы нашли',
        resultsSuffix: 'объявлений',
        sortLabel: 'Сортировка',
        sortValue: 'По умолчанию',
      }
      : locale === 'en'
        ? {
          resultsPrefix: 'We found',
          resultsSuffix: 'listings',
          sortLabel: 'Sort',
          sortValue: 'Default order',
        }
        : {
          resultsPrefix: 'Biz',
          resultsSuffix: 'ta eʼlon topdik',
          sortLabel: 'Saralash',
          sortValue: 'Asli bo‘yicha',
        };

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        {shouldShowCategoryBar ? (
          <CategoryBar categories={verticalCategories} basePath={basePath} />
        ) : null}

        {shouldShowAutoFilters ? (
          <section className="surface-card section-shell rounded-[1.85rem]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid w-full gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{locale === 'ru' ? 'Сортировка' : locale === 'en' ? 'Sort' : 'Saralash'}</p>
                  <Select value={sort} onValueChange={(value) => { setSort(value); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{locale === 'ru' ? 'Сначала новые' : locale === 'en' ? 'Newest first' : 'Eng yangi birinchi'}</SelectItem>
                      <SelectItem value="price_asc">{locale === 'ru' ? 'Цена ↑' : locale === 'en' ? 'Price ↑' : 'Narx ↑'}</SelectItem>
                      <SelectItem value="price_desc">{locale === 'ru' ? 'Цена ↓' : locale === 'en' ? 'Price ↓' : 'Narx ↓'}</SelectItem>
                      <SelectItem value="year_desc">{locale === 'ru' ? 'Год ↓' : locale === 'en' ? 'Year ↓' : 'Yil ↓'}</SelectItem>
                      <SelectItem value="mileage_asc">{locale === 'ru' ? 'Пробег ↑' : locale === 'en' ? 'Mileage ↑' : 'Yurgan masofa ↑'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{locale === 'ru' ? 'Топливо' : locale === 'en' ? 'Fuel' : 'Yonilg‘i'}</p>
                  <Select value={fuelType} onValueChange={(value) => { setFuelType(value); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={locale === 'ru' ? 'Любое' : locale === 'en' ? 'Any' : 'Har qanday'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{locale === 'ru' ? 'Любое' : locale === 'en' ? 'Any' : 'Har qanday'}</SelectItem>
                      {AUTO_FUEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {getLocalizedText(option.label, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{locale === 'ru' ? 'Коробка' : locale === 'en' ? 'Transmission' : 'Uzatish qutisi'}</p>
                  <Select value={transmission} onValueChange={(value) => { setTransmission(value); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={locale === 'ru' ? 'Любая' : locale === 'en' ? 'Any' : 'Har qanday'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{locale === 'ru' ? 'Любая' : locale === 'en' ? 'Any' : 'Har qanday'}</SelectItem>
                      {AUTO_TRANSMISSION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {getLocalizedText(option.label, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSort('newest');
                  setFuelType('');
                  setTransmission('');
                  setCurrentPage(1);
                }}
              >
                {messages.home.clearFilters}
              </Button>
            </div>
          </section>
        ) : null}

        {hasFilters ? (
          <section className="hidden min-[769px]:block surface-card section-shell rounded-[1.85rem]">
            <div className="section-header">
              <div className="section-header__copy">
                <p className="section-kicker">{messages.home.resultsTitle}</p>
                <h2 className="section-title">{messages.home.resultsTitle}</h2>
                <p className="section-caption">{messages.home.resultsDescription}</p>
                <div className="status-strip">
                  {query ? <Badge variant="secondary">{query}</Badge> : null}
                  {activeCategoryLabel ? <Badge variant="outline">{activeCategoryLabel}</Badge> : null}
                </div>
              </div>
              <Button asChild variant="outline" className="w-full min-[481px]:w-auto">
                <Link href={basePath}>{messages.home.clearFilters}</Link>
              </Button>
            </div>
          </section>
        ) : null}

        {isLoadingAds ? (
          <ListingsShowcaseSkeleton
            title={messages.home.loadingListings}
            description={messages.home.resultsDescription}
            count={6}
          />
        ) : adsError ? (
          <MarketplaceErrorState
            title={messages.createAd.submitError}
            description={adsError}
            retryLabel={retryLabel}
            onRetry={() => {
              setLoadRequestNonce((currentValue) => currentValue + 1);
            }}
            secondaryAction={{
              label: messages.home.clearFilters,
              href: basePath,
              variant: 'outline',
            }}
          />
        ) : filteredAds.length === 0 ? (
          <MarketplaceStatusCard
            title={messages.home.noResultsTitle}
            description={messages.home.noResultsDescription}
            primaryAction={{
              label: messages.home.clearFilters,
              href: basePath,
            }}
            secondaryAction={{
              label: messages.home.startSelling,
              href: `/ads/create?vertical=${vertical}`,
              variant: 'outline',
            }}
          />
        ) : (
          <>
            <section className="phone-nav-only mx-[calc(var(--page-gutter)*-1)] flex-col gap-4 bg-transparent px-[var(--page-gutter)] pb-6 pt-1 text-foreground">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <h2 className="text-[1.28rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
                      {mobileCopy.resultsPrefix} {mobileResultsCount} {mobileCopy.resultsSuffix}
                    </h2>
                    <div className="flex items-center gap-2 text-[0.78rem] text-muted-foreground">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      <span>
                        {mobileCopy.sortLabel}:{' '}
                        <span className="font-medium text-foreground">{mobileCopy.sortValue}</span>
                      </span>
                    </div>
                  </div>

                  {hasFilters ? (
                    <Button asChild variant="outline" size="sm" className="h-9 rounded-full px-3 text-xs">
                      <Link href={basePath}>{messages.home.clearFilters}</Link>
                    </Button>
                  ) : null}
                </div>

                {query || activeCategoryLabel ? (
                  <div className="flex flex-wrap gap-2">
                    {query ? <Badge variant="secondary">{query}</Badge> : null}
                    {activeCategoryLabel ? <Badge variant="outline">{activeCategoryLabel}</Badge> : null}
                  </div>
                ) : null}
              </div>

              <section className="grid grid-cols-2 gap-3">
                {filteredAds.map((ad) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    isFavorite={isFavorite(ad.id)}
                    canDelete={isAdmin}
                    showManageActions={false}
                    variant="mobile"
                    onDeleted={(adId) => {
                      setAds((previous) => previous.filter((item) => item.id !== adId));
                    }}
                  />
                ))}
              </section>
            </section>

            <section id="all-listings" className="hidden min-[769px]:grid surface-card section-shell rounded-[1.85rem]">
              <div className="section-header">
                <div className="section-header__copy">
                  <p className="section-kicker">{messages.home.browseAllListings}</p>
                  <h2 className="section-title">{messages.home.browseAllListings}</h2>
                </div>
                <Button asChild variant="ghost" className="gap-1 px-0 font-semibold text-primary hover:bg-transparent">
                  <Link href={`/ads/create?vertical=${vertical}`}>
                    {messages.home.startSelling}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="listing-grid">
                {filteredAds.map((ad) => (
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
              {pagination.total > pagination.limit ? (
                <div className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {locale === 'ru' ? 'Страница' : locale === 'en' ? 'Page' : 'Sahifa'} {pagination.page} / {Math.max(1, Math.ceil(pagination.total / pagination.limit))}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={pagination.page <= 1}>
                      {locale === 'ru' ? 'Назад' : locale === 'en' ? 'Previous' : 'Oldinga'}
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentPage((value) => value + 1)} disabled={!pagination.hasMore && pagination.page >= Math.max(1, Math.ceil(pagination.total / pagination.limit))}>
                      {locale === 'ru' ? 'Дальше' : locale === 'en' ? 'Next' : 'Keyingi'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>
          </>
        )}
      </main>
    </MarketplaceShell>
  );
}
