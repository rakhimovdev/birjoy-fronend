'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { CategoryBar } from '@/components/ads/CategoryBar';
import { AdCard } from '@/components/ads/AdCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAds } from '@/lib/ads';
import { getLocalizedText } from '@/lib/i18n';
import { filterAds } from '@/lib/listing-utils';
import {
  getCategoriesForVertical,
  getCategoryBySlug,
  getVerticalById,
  getVerticalHref,
} from '@/lib/mock-data';
import type { Ad, AdVertical } from '@/lib/types';

export function VerticalMarketplacePage({ vertical }: { vertical: AdVertical }) {
  const searchParams = useSearchParams();
  const { isFavorite } = useAuth();
  const { locale, messages } = useI18n();
  const { isAdmin } = useAdminSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const query = searchParams.get('q')?.trim() ?? '';
  const selectedCategory = searchParams.get('category');
  const categories = getCategoriesForVertical(vertical);
  const verticalConfig = getVerticalById(vertical);
  const basePath = getVerticalHref(vertical);
  const selectedCategoryObject = selectedCategory ? getCategoryBySlug(selectedCategory) : null;

  useEffect(() => {
    let cancelled = false;

    async function loadAds() {
      try {
        setIsLoadingAds(true);
        const response = await fetchAds();

        if (!cancelled) {
          setAds(response);
          setAdsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAdsError(error instanceof Error ? error.message : 'Unable to load ads.');
          setAds([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAds(false);
        }
      }
    }

    loadAds();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAds = filterAds(ads, {
    vertical,
    category: selectedCategory,
    query,
  });
  const featuredAds = filteredAds.filter((ad) => ad.isFeatured);
  const latestAds = filteredAds.filter((ad) => !ad.isFeatured);
  const hasFilters = Boolean(query || selectedCategory);
  const localizedVerticalName = verticalConfig ? getLocalizedText(verticalConfig.name, locale) : '';
  const localizedVerticalTagline = verticalConfig
    ? getLocalizedText(verticalConfig.tagline, locale)
    : '';
  const localizedVerticalDescription = verticalConfig
    ? getLocalizedText(verticalConfig.description, locale)
    : '';
  const selectedCategoryLabel = selectedCategoryObject
    ? getLocalizedText(selectedCategoryObject.name, locale)
    : null;

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <CategoryBar categories={categories} basePath={basePath} />

        <section className="surface-card rounded-[1.8rem] overflow-hidden">
          <div className="grid gap-6 bg-[linear-gradient(135deg,_rgba(7,28,85,0.98),_rgba(11,72,214,0.9)_58%,_rgba(255,115,10,0.8))] px-5 py-8 text-white sm:px-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(16rem,0.88fr)] lg:px-8">
            <div className="space-y-4">
              <Badge className="w-fit rounded-full border border-white/15 bg-white/10 text-white">
                {localizedVerticalName}
              </Badge>
              <div className="space-y-3">
                <h1 className="page-title font-bold text-white">{localizedVerticalTagline}</h1>
                <p className="body-lead max-w-2xl text-white/80">{localizedVerticalDescription}</p>
              </div>
              <div className="flex flex-col gap-3 min-[481px]:flex-row">
                <Button asChild className="min-h-12 rounded-2xl bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
                  <Link href={`/ads/create?vertical=${vertical}`}>{messages.home.startSelling}</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="min-h-12 rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15"
                >
                  <Link href={basePath}>{messages.home.clearFilters}</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-white/65">
                  {messages.home.featuredListings}
                </p>
                <p className="mt-3 text-3xl font-bold">{featuredAds.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-white/65">
                  {messages.home.recentPostings}
                </p>
                <p className="mt-3 text-3xl font-bold">{latestAds.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-white/65">
                  {messages.home.resultsTitle}
                </p>
                <p className="mt-3 text-3xl font-bold">{filteredAds.length}</p>
              </div>
            </div>
          </div>
        </section>

        {hasFilters ? (
          <section className="surface-card rounded-[1.75rem] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">{messages.home.resultsTitle}</h2>
                <p className="text-sm text-muted-foreground">{messages.home.resultsDescription}</p>
                <div className="flex flex-wrap gap-2">
                  {query ? <Badge variant="secondary">{query}</Badge> : null}
                  {selectedCategoryLabel ? <Badge variant="secondary">{selectedCategoryLabel}</Badge> : null}
                </div>
              </div>
              <Button asChild variant="outline" className="w-full min-[481px]:w-auto">
                <Link href={basePath}>{messages.home.clearFilters}</Link>
              </Button>
            </div>
          </section>
        ) : null}

        {isLoadingAds ? (
          <section className="surface-card rounded-[1.75rem] px-5 py-12 text-center sm:px-6">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {messages.home.loadingListings}
            </h2>
          </section>
        ) : adsError ? (
          <section className="surface-card rounded-[1.75rem] px-5 py-12 text-center sm:px-6">
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {messages.createAd.submitError}
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">{adsError}</p>
          </section>
        ) : filteredAds.length === 0 ? (
          <section className="surface-card rounded-[1.75rem] px-5 py-12 text-center sm:px-6">
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {messages.home.noResultsTitle}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              {messages.home.noResultsDescription}
            </p>
            <div className="flex flex-col justify-center gap-3 min-[481px]:flex-row">
              <Button asChild className="w-full min-[481px]:w-auto">
                <Link href={basePath}>{messages.home.clearFilters}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full min-[481px]:w-auto">
                <Link href={`/ads/create?vertical=${vertical}`}>{messages.home.startSelling}</Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
            {featuredAds.length > 0 ? (
              <section className="surface-card rounded-[1.75rem] px-5 py-8 sm:px-6">
                <div className="mb-8 flex flex-col items-start justify-between gap-4 min-[640px]:flex-row min-[640px]:items-center">
                  <h2 className="text-2xl font-bold tracking-tight">{messages.home.featuredListings}</h2>
                  <Button asChild variant="ghost" className="gap-1 px-0 font-semibold text-primary hover:bg-transparent">
                    <Link href="#all-listings">
                      {messages.home.viewAll}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="listing-grid">
                  {featuredAds.map((ad) => (
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
            ) : null}

            <section id="all-listings" className="surface-card rounded-[1.75rem] px-5 py-8 sm:px-6">
              <div className="mb-8 flex flex-col items-start justify-between gap-4 min-[640px]:flex-row min-[640px]:items-center">
                <h2 className="text-2xl font-bold tracking-tight">{messages.home.recentPostings}</h2>
                <Button asChild variant="ghost" className="gap-1 px-0 font-semibold text-primary hover:bg-transparent">
                  <Link href={`/ads/create?vertical=${vertical}`}>
                    {messages.home.startSelling}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="listing-grid">
                {latestAds.map((ad) => (
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
