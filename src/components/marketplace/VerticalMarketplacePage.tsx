'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpDown } from 'lucide-react';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { AdCard } from '@/components/ads/AdCard';
import {
  ListingsShowcaseSkeleton,
  MarketplaceErrorState,
  MarketplaceStatusCard,
} from '@/components/marketplace/MarketplaceStates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAds } from '@/lib/ads';
import { getLocalizedText } from '@/lib/i18n';
import { getCategoryBySlug, getVerticalHref } from '@/lib/mock-data';
import type { Ad, AdVertical } from '@/lib/types';

export function VerticalMarketplacePage({ vertical }: { vertical: AdVertical }) {
  const searchParams = useSearchParams();
  const { isFavorite } = useAuth();
  const { locale, messages } = useI18n();
  const { isAdmin } = useAdminSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [loadRequestNonce, setLoadRequestNonce] = useState(0);
  const query = searchParams.get('q')?.trim() ?? '';
  const category = searchParams.get('category')?.trim() ?? '';
  const basePath = getVerticalHref(vertical);
  const activeCategory = category || null;
  const activeCategoryRecord = activeCategory ? getCategoryBySlug(activeCategory) : null;
  const activeCategoryLabel = activeCategoryRecord
    ? getLocalizedText(activeCategoryRecord.name, locale)
    : activeCategory;
  const retryLabel = locale === 'ru' ? 'Повторить' : locale === 'en' ? 'Retry' : 'Qayta urinish';

  useEffect(() => {
    const abortController = new AbortController();

    async function loadAds() {
      try {
        setIsLoadingAds(true);
        const response = await fetchAds({
          vertical,
          category: activeCategory || undefined,
          search: query || undefined,
          fields: 'card',
          status: 'active',
          limit: 100,
          signal: abortController.signal,
        });
        setAds(response);
        setAdsError(null);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setAdsError(error instanceof Error ? error.message : 'Unable to load ads.');
        setAds([]);
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
  }, [activeCategory, loadRequestNonce, query, vertical]);

  const filteredAds = ads;
  const hasFilters = Boolean(query || activeCategory);
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
            </section>
          </>
        )}
      </main>
    </MarketplaceShell>
  );
}
