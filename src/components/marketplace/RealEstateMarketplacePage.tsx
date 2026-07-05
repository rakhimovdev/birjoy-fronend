'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, LayoutGrid, ListFilter, Loader2, MapPinned } from 'lucide-react';
import { AdCard } from '@/components/ads/AdCard';
import { CategoryBar } from '@/components/ads/CategoryBar';
import { RealEstateListingsMap } from '@/components/maps/RealEstateListingsMap';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAds } from '@/lib/ads';
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import { filterAds, getAdDisplayLocation } from '@/lib/listing-utils';
import {
  REAL_ESTATE_CATEGORIES,
  getCategoryBySlug,
  getVerticalById,
  getVerticalHref,
} from '@/lib/mock-data';
import type { Ad } from '@/lib/types';

type RealEstateViewMode = 'split' | 'list';

export function RealEstateMarketplacePage() {
  const searchParams = useSearchParams();
  const { isFavorite } = useAuth();
  const { locale, messages } = useI18n();
  const { isAdmin } = useAdminSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<RealEstateViewMode>('split');
  const [selectedAdId, setSelectedAdId] = useState<string | undefined>(undefined);
  const query = searchParams.get('q')?.trim() ?? '';
  const selectedCategory = searchParams.get('category');
  const basePath = getVerticalHref('real_estate');
  const verticalConfig = getVerticalById('real_estate');

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
          setAds([]);
          setAdsError(error instanceof Error ? error.message : 'Unable to load ads.');
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

  const filteredAds = useMemo(
    () =>
      filterAds(ads, {
        vertical: 'real_estate',
        category: selectedCategory,
        query,
      }).filter((ad) => typeof ad.latitude === 'number' && typeof ad.longitude === 'number'),
    [ads, query, selectedCategory]
  );

  useEffect(() => {
    if (!selectedAdId && filteredAds[0]) {
      setSelectedAdId(filteredAds[0].id);
      return;
    }

    if (selectedAdId && !filteredAds.some((ad) => ad.id === selectedAdId)) {
      setSelectedAdId(filteredAds[0]?.id);
    }
  }, [filteredAds, selectedAdId]);

  const selectedAd = filteredAds.find((ad) => ad.id === selectedAdId) || filteredAds[0] || null;
  const formattedSelectedPrice = selectedAd
    ? new Intl.NumberFormat(languageMeta[locale].numberLocale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(selectedAd.price)
    : null;
  const localizedVerticalName = verticalConfig ? getLocalizedText(verticalConfig.name, locale) : '';
  const localizedVerticalTagline = verticalConfig
    ? getLocalizedText(verticalConfig.tagline, locale)
    : '';
  const localizedVerticalDescription = verticalConfig
    ? getLocalizedText(verticalConfig.description, locale)
    : '';
  const viewCopy =
    locale === 'ru'
      ? { map: 'Карта', list: 'Список', roomSuffix: 'комн.' }
      : locale === 'en'
        ? { map: 'Map', list: 'List', roomSuffix: 'rooms' }
        : { map: 'Xarita', list: 'Ro‘yxat', roomSuffix: 'xona' };

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <CategoryBar categories={REAL_ESTATE_CATEGORIES} basePath={basePath} />

        <section className="surface-card rounded-[1.8rem] overflow-hidden">
          <div className="grid gap-6 bg-[linear-gradient(135deg,_rgba(14,38,25,0.98),_rgba(17,94,89,0.92)_56%,_rgba(239,154,78,0.82))] px-5 py-8 text-white sm:px-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(16rem,0.88fr)] lg:px-8">
            <div className="space-y-4">
              <Badge className="w-fit rounded-full border border-white/15 bg-white/10 text-white">
                {localizedVerticalName}
              </Badge>
              <div className="space-y-3">
                <h1 className="page-title font-bold text-white">{localizedVerticalTagline}</h1>
                <p className="body-lead max-w-2xl text-white/80">{localizedVerticalDescription}</p>
              </div>
              <div className="flex flex-col gap-3 min-[481px]:flex-row">
                <Button asChild className="min-h-12 rounded-2xl bg-white text-[#0b3f37] hover:bg-white/92">
                  <Link href="/ads/create?vertical=real_estate">{messages.home.startSelling}</Link>
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
                <p className="text-sm uppercase tracking-[0.24em] text-white/65">Map</p>
                <p className="mt-3 text-3xl font-bold">{filteredAds.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-white/65">
                  {messages.home.featuredListings}
                </p>
                <p className="mt-3 text-3xl font-bold">
                  {filteredAds.filter((ad) => ad.isFeatured).length}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-white/65">
                  {messages.home.recentPostings}
                </p>
                <p className="mt-3 text-3xl font-bold">{filteredAds.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-card rounded-[1.75rem] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{messages.home.resultsTitle}</h2>
              <p className="text-sm text-muted-foreground">{messages.home.resultsDescription}</p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={viewMode === 'split' ? 'default' : 'outline'}
                className="rounded-2xl"
                onClick={() => setViewMode('split')}
              >
                <MapPinned className="mr-2 h-4 w-4" />
                {viewCopy.map}
              </Button>
              <Button
                type="button"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                className="rounded-2xl"
                onClick={() => setViewMode('list')}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                {viewCopy.list}
              </Button>
            </div>
          </div>
        </section>

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
            <ListFilter className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
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
                <Link href="/ads/create?vertical=real_estate">{messages.home.startSelling}</Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
            {viewMode === 'split' ? (
              <section className="real-estate-shell">
                <div className="real-estate-map-panel surface-card rounded-[1.75rem] p-3">
                  <RealEstateListingsMap
                    ads={filteredAds}
                    locale={locale}
                    selectedAdId={selectedAd?.id}
                    onSelectAd={setSelectedAdId}
                  />
                  {selectedAd ? (
                    <Card className="mt-3 overflow-hidden rounded-[1.35rem] border-border/70">
                      <CardContent className="grid gap-4 p-4 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-muted/40">
                          <Image
                            src={selectedAd.images[0]}
                            alt={getLocalizedText(selectedAd.title, locale)}
                            fill
                            className="object-cover"
                            sizes="160px"
                            unoptimized={selectedAd.images[0].startsWith('data:')}
                          />
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-primary">
                                  {formattedSelectedPrice}
                                </p>
                              <h3 className="text-base font-semibold text-foreground">
                                {getLocalizedText(selectedAd.title, locale)}
                                </h3>
                              </div>
                              <Badge variant="secondary">
                                {selectedAd.rooms
                                  ? `${selectedAd.rooms} ${viewCopy.roomSuffix}`
                                  : getLocalizedText(
                                      getCategoryBySlug(selectedAd.category)?.name || {
                                        uz: localizedVerticalName,
                                        ru: localizedVerticalName,
                                        en: localizedVerticalName,
                                      },
                                      locale
                                    )}
                              </Badge>
                            </div>
                          <p className="text-sm text-muted-foreground">
                            {getLocalizedText(getAdDisplayLocation(selectedAd), locale)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedAd.area ? <Badge variant="outline">{selectedAd.area} m²</Badge> : null}
                            {selectedAd.floor !== null ? (
                              <Badge variant="outline">{selectedAd.floor}-qavat</Badge>
                            ) : null}
                          </div>
                          <Button asChild size="sm" className="rounded-xl">
                            <Link href={`/ads/${selectedAd.id}`}>
                              {messages.adDetails.browseMore}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>

                <div className="real-estate-list-panel space-y-4">
                  {filteredAds.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      isFavorite={isFavorite(ad.id)}
                      canDelete={isAdmin}
                      className={selectedAd?.id === ad.id ? 'ring-2 ring-primary/20' : undefined}
                      onDeleted={(adId) => {
                        setAds((previous) => previous.filter((item) => item.id !== adId));
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="surface-card rounded-[1.75rem] px-5 py-8 sm:px-6">
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
          </>
        )}
      </main>
    </MarketplaceShell>
  );
}
