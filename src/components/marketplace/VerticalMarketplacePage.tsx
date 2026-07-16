'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { VerticalBar } from '@/components/layout/VerticalBar';
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

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <VerticalBar activeVertical={vertical} />

        {hasFilters ? (
          <section className="surface-card section-shell rounded-[1.85rem]">
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
          <section id="all-listings" className="surface-card section-shell rounded-[1.85rem]">
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
        )}
      </main>
    </MarketplaceShell>
  );
}
