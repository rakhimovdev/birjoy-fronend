'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, LayoutGrid, ListFilter, Loader2, MapPinned } from 'lucide-react';
import { AdCard } from '@/components/ads/AdCard';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { VerticalBar } from '@/components/layout/VerticalBar';
import { RealEstateListingsMap } from '@/components/maps/RealEstateListingsMap';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAds } from '@/lib/ads';
import { filterAds } from '@/lib/listing-utils';
import { getVerticalHref } from '@/lib/mock-data';
import type { Ad } from '@/lib/types';

type RealEstateViewMode = 'gallery' | 'map';
type LocationState = 'idle' | 'loading' | 'ready' | 'denied' | 'unsupported' | 'error';
type Coordinates = {
  lat: number;
  lng: number;
};

const NEARBY_RADIUS_KM = 15;
const MAX_FALLBACK_MAP_RESULTS = 24;

function hasCoordinates(ad: Ad): ad is Ad & { latitude: number; longitude: number } {
  return (
    typeof ad.latitude === 'number' &&
    Number.isFinite(ad.latitude) &&
    typeof ad.longitude === 'number' &&
    Number.isFinite(ad.longitude)
  );
}

function getDistanceKm(from: Coordinates, to: Coordinates) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const startLatitude = toRadians(from.lat);
  const endLatitude = toRadians(to.lat);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function RealEstateMarketplacePage() {
  const searchParams = useSearchParams();
  const { isFavorite } = useAuth();
  const { locale, messages } = useI18n();
  const { isAdmin } = useAdminSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<RealEstateViewMode>('gallery');
  const [selectedAdId, setSelectedAdId] = useState<string | undefined>(undefined);
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const query = searchParams.get('q')?.trim() ?? '';
  const basePath = getVerticalHref('real_estate');

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

  useEffect(() => {
    if (viewMode !== 'map' || locationState !== 'idle') {
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setLocationState('unsupported');
      return;
    }

    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationState('ready');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationState('denied');
          return;
        }

        setLocationState('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, [locationState, viewMode]);

  const filteredAds = useMemo(
    () =>
      filterAds(ads, {
        vertical: 'real_estate',
        query,
      }),
    [ads, query]
  );
  const featuredAds = useMemo(
    () => filteredAds.filter((ad) => ad.isFeatured),
    [filteredAds]
  );
  const regularAds = useMemo(
    () => filteredAds.filter((ad) => !ad.isFeatured),
    [filteredAds]
  );
  const galleryAds = featuredAds.length > 0 ? regularAds : filteredAds;

  const mapEligibleAds = useMemo(
    () => filteredAds.filter(hasCoordinates),
    [filteredAds]
  );

  const adsWithDistance = useMemo(
    () =>
      mapEligibleAds.map((ad) => ({
        ad,
        distanceKm: userCoordinates
          ? getDistanceKm(userCoordinates, {
              lat: ad.latitude,
              lng: ad.longitude,
            })
          : null,
      })),
    [mapEligibleAds, userCoordinates]
  );

  const nearbyAds = useMemo(
    () =>
      adsWithDistance
        .filter((item) => item.distanceKm !== null && item.distanceKm <= NEARBY_RADIUS_KM)
        .sort((left, right) => (left.distanceKm as number) - (right.distanceKm as number)),
    [adsWithDistance]
  );

  const mapAdsWithDistance = useMemo(() => {
    if (!userCoordinates) {
      return adsWithDistance.slice(0, MAX_FALLBACK_MAP_RESULTS);
    }

    if (nearbyAds.length > 0) {
      return nearbyAds;
    }

    return adsWithDistance
      .filter((item) => item.distanceKm !== null)
      .sort((left, right) => (left.distanceKm as number) - (right.distanceKm as number))
      .slice(0, MAX_FALLBACK_MAP_RESULTS);
  }, [adsWithDistance, nearbyAds, userCoordinates]);

  const mapAds = useMemo(
    () => mapAdsWithDistance.map((item) => item.ad),
    [mapAdsWithDistance]
  );

  useEffect(() => {
    if (mapAds.length === 0) {
      setSelectedAdId(undefined);
      return;
    }

    if (!selectedAdId || !mapAds.some((ad) => ad.id === selectedAdId)) {
      setSelectedAdId(mapAds[0]?.id);
    }
  }, [mapAds, selectedAdId]);

  const selectedAd = mapAds.find((ad) => ad.id === selectedAdId) || mapAds[0] || null;
  const hasFilters = Boolean(query);

  const viewCopy =
    locale === 'ru'
      ? {
          gallery: 'Галерея',
          map: 'Карта',
          galleryTitle: 'Галерея жилья',
          galleryDescription: 'Все объявления о жилье собраны в одной ленте.',
          vipTitle: 'VIP объявления',
          vipDescription: 'Лучшие предложения собраны в горизонтальной витрине.',
          regularTitle: 'Остальные объявления',
          regularDescription: 'Ниже показаны все остальные предложения по жилью.',
          mapTitle: 'Жильё рядом с вами',
          mapDescription: 'На карте показаны дома, доступные рядом с вашей локацией.',
          yourLocation: 'Вы здесь',
          noMapTitle: 'Пока нет объявлений с координатами',
          noMapDescription: 'Чтобы объявление попало на карту, для него нужна локация на карте.',
        }
      : locale === 'en'
        ? {
            gallery: 'Gallery',
            map: 'Map',
            galleryTitle: 'Home gallery',
            galleryDescription: 'All housing listings are collected in one feed.',
            vipTitle: 'VIP listings',
            vipDescription: 'Featured homes appear first in a side-scrolling carousel.',
            regularTitle: 'Other listings',
            regularDescription: 'Browse the rest of the home listings below.',
            mapTitle: 'Homes near you',
            mapDescription: 'The map shows homes available around your current location.',
            yourLocation: 'You are here',
            noMapTitle: 'No mapped home listings yet',
            noMapDescription: 'A housing listing needs coordinates before it can appear on the map.',
          }
        : {
            gallery: 'Galereya',
            map: 'Xarita',
            galleryTitle: 'Uy-joy galereyasi',
            galleryDescription: 'Barcha uy-joy eʼlonlari shu yerda jamlandi.',
            vipTitle: 'VIP eʼlonlar',
            vipDescription: 'Tanlangan uylar tepada yonlama karuselda ko‘rsatiladi.',
            regularTitle: 'Boshqa eʼlonlar',
            regularDescription: 'Quyida qolgan barcha uy-joy eʼlonlari chiqadi.',
            mapTitle: 'Sizga yaqin uylar',
            mapDescription: 'Xaritada sizga yaqin hududdagi uylar ko‘rsatiladi.',
            yourLocation: 'Siz turgan joy',
            noMapTitle: 'Hali koordinatali uy eʼlonlari yo‘q',
            noMapDescription: 'Uy eʼloni xaritada ko‘rinishi uchun unga koordinata biriktirilgan bo‘lishi kerak.',
          };

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <VerticalBar activeVertical="real_estate" />

        {hasFilters ? (
          <section className="surface-card rounded-[1.75rem] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">{messages.home.resultsTitle}</h2>
                <p className="text-sm text-muted-foreground">{messages.home.resultsDescription}</p>
                <div className="flex flex-wrap gap-2">
                  {query ? <Badge variant="secondary">{query}</Badge> : null}
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
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as RealEstateViewMode)}
            className="space-y-4"
          >
            <section className="surface-card rounded-[1.75rem] px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {viewMode === 'gallery' ? viewCopy.galleryTitle : viewCopy.mapTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {viewMode === 'gallery' ? viewCopy.galleryDescription : viewCopy.mapDescription}
                  </p>
                </div>
                <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.2rem] bg-muted/70 p-1.5 sm:w-auto">
                  <TabsTrigger value="gallery" className="min-h-11 flex-1 rounded-[0.95rem] px-4 sm:flex-none">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    {viewCopy.gallery}
                  </TabsTrigger>
                  <TabsTrigger value="map" className="min-h-11 flex-1 rounded-[0.95rem] px-4 sm:flex-none">
                    <MapPinned className="mr-2 h-4 w-4" />
                    {viewCopy.map}
                  </TabsTrigger>
                </TabsList>
              </div>
            </section>

            <TabsContent value="gallery" className="mt-0">
              <div className="space-y-4">
                {featuredAds.length > 0 ? (
                  <section className="surface-card rounded-[1.75rem] px-5 py-8 sm:px-6">
                    <div className="mb-6 flex flex-col items-start justify-between gap-4 min-[640px]:flex-row min-[640px]:items-center">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">{viewCopy.vipTitle}</h2>
                        <p className="text-sm text-muted-foreground">{viewCopy.vipDescription}</p>
                      </div>
                      <Badge variant="secondary">{featuredAds.length}</Badge>
                    </div>
                    <div className="scroll-row">
                      {featuredAds.map((ad) => (
                        <div key={ad.id} className="w-[11.5rem] shrink-0 sm:w-[12.5rem] lg:w-[13rem] xl:w-[14rem]">
                          <AdCard
                            ad={ad}
                            isFavorite={isFavorite(ad.id)}
                            canDelete={isAdmin}
                            onDeleted={(adId) => {
                              setAds((previous) => previous.filter((item) => item.id !== adId));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {galleryAds.length > 0 ? (
                  <section className="surface-card rounded-[1.75rem] px-5 py-8 sm:px-6">
                    <div className="mb-8 flex flex-col items-start justify-between gap-4 min-[640px]:flex-row min-[640px]:items-center">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                          {featuredAds.length > 0 ? viewCopy.regularTitle : viewCopy.galleryTitle}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {featuredAds.length > 0 ? viewCopy.regularDescription : viewCopy.galleryDescription}
                        </p>
                      </div>
                      <Button asChild variant="ghost" className="gap-1 px-0 font-semibold text-primary hover:bg-transparent">
                        <Link href="/ads/create?vertical=real_estate">
                          {messages.home.startSelling}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    <div className="listing-grid">
                      {galleryAds.map((ad) => (
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
              </div>
            </TabsContent>

            <TabsContent value="map" className="mt-0">
              {mapAds.length === 0 ? (
                <section className="surface-card rounded-[1.75rem] px-5 py-12 text-center sm:px-6">
                  <MapPinned className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
                    {viewCopy.noMapTitle}
                  </h2>
                  <p className="mx-auto max-w-2xl text-muted-foreground">{viewCopy.noMapDescription}</p>
                </section>
              ) : (
                <section className="surface-card rounded-[1.75rem] p-3">
                  <RealEstateListingsMap
                    ads={mapAds}
                    locale={locale}
                    selectedAdId={selectedAd?.id}
                    onSelectAd={setSelectedAdId}
                    userLocation={userCoordinates}
                    userLocationLabel={viewCopy.yourLocation}
                    nearbyRadiusKm={NEARBY_RADIUS_KM}
                    popupActionLabel={messages.adDetails.browseMore}
                  />
                </section>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </MarketplaceShell>
  );
}
