'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, LayoutGrid, ListFilter, Loader2, LocateFixed, MapPinned } from 'lucide-react';
import { AdCard } from '@/components/ads/AdCard';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { VerticalBar } from '@/components/layout/VerticalBar';
import { RealEstateListingsMap } from '@/components/maps/RealEstateListingsMap';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAds } from '@/lib/ads';
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import { filterAds, getAdDisplayLocation } from '@/lib/listing-utils';
import { getCategoryBySlug, getVerticalHref } from '@/lib/mock-data';
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

function formatDistance(distanceKm: number, localeCode: string) {
  if (distanceKm < 1) {
    return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  }

  return `${new Intl.NumberFormat(localeCode, {
    maximumFractionDigits: distanceKm < 10 ? 1 : 0,
  }).format(distanceKm)} km`;
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
  const selectedAdDistance = mapAdsWithDistance.find((item) => item.ad.id === selectedAd?.id)?.distanceKm ?? null;
  const isShowingDistanceFallback =
    Boolean(userCoordinates) && nearbyAds.length === 0 && mapAdsWithDistance.length > 0;
  const hasFilters = Boolean(query);
  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageMeta[locale].numberLocale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [locale]
  );

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
          mapDescription: 'Нажмите на ценник на карте, чтобы открыть детали объявления.',
          homesLabel: 'Объявления',
          mappedLabel: 'На карте',
          featuredLabel: 'Топ',
          retryLocation: 'Определить заново',
          locationLoading: 'Определяем ваше местоположение для показа ближайших домов.',
          locationReady: 'Показываем дома в радиусе вашей текущей локации.',
          locationFallback: 'Рядом объявлений нет, поэтому показываем самые близкие варианты.',
          locationDenied: 'Геолокация отключена. Показываем все дома, у которых есть точка на карте.',
          locationUnsupported: 'Это устройство не передаёт геолокацию. Открыт общий режим карты.',
          locationError: 'Не удалось определить вашу локацию. Открыт общий режим карты.',
          yourLocation: 'Вы здесь',
          radiusLabel: 'Радиус',
          fallbackLabel: 'Ближайшие варианты',
          distanceLabel: 'Расстояние',
          roomSuffix: 'комн.',
          floorSuffix: 'этаж',
          noMapTitle: 'Пока нет объявлений с координатами',
          noMapDescription: 'Чтобы объявление попало на карту, для него нужна локация на карте.',
          nearbyCollectionTitle: 'Ближайшие варианты',
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
            mapDescription: 'Tap the price badge on the map to open more listing details.',
            homesLabel: 'Listings',
            mappedLabel: 'On map',
            featuredLabel: 'Featured',
            retryLocation: 'Refresh location',
            locationLoading: 'Checking your location to find nearby homes.',
            locationReady: 'Showing homes around your current location.',
            locationFallback: 'No homes were found in range, so the nearest options are shown instead.',
            locationDenied: 'Location access is off. Showing all homes that already have map coordinates.',
            locationUnsupported: 'This device does not provide geolocation. Opening the general map view.',
            locationError: 'Your location could not be detected. Opening the general map view.',
            yourLocation: 'You are here',
            radiusLabel: 'Radius',
            fallbackLabel: 'Nearest options',
            distanceLabel: 'Distance',
            roomSuffix: 'rooms',
            floorSuffix: 'floor',
            noMapTitle: 'No mapped home listings yet',
            noMapDescription: 'A housing listing needs coordinates before it can appear on the map.',
            nearbyCollectionTitle: 'Closest listings',
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
            mapDescription: 'Xaritadagi narx tugmasini bossangiz, eʼlon tafsilotlari ochiladi.',
            homesLabel: 'Uy eʼlonlari',
            mappedLabel: 'Xaritada',
            featuredLabel: 'TOP',
            retryLocation: 'Joylashuvni yangilash',
            locationLoading: 'Yaqin uylarni topish uchun joylashuvingiz aniqlanmoqda.',
            locationReady: 'Hozir sizga yaqin hududdagi uylar ko‘rsatilmoqda.',
            locationFallback: 'Atrofingizda eʼlon topilmadi, shuning uchun eng yaqin variantlar ko‘rsatildi.',
            locationDenied: 'Joylashuvga ruxsat berilmadi. Xaritada koordinatasi bor barcha uylar ko‘rsatilmoqda.',
            locationUnsupported: 'Qurilmada geolokatsiya yo‘q. Xaritaning umumiy ko‘rinishi ochildi.',
            locationError: 'Joylashuvni aniqlab bo‘lmadi. Xaritaning umumiy ko‘rinishi ochildi.',
            yourLocation: 'Siz turgan joy',
            radiusLabel: 'Radius',
            fallbackLabel: 'Eng yaqin variantlar',
            distanceLabel: 'Masofa',
            roomSuffix: 'xona',
            floorSuffix: 'qavat',
            noMapTitle: 'Hali koordinatali uy eʼlonlari yo‘q',
            noMapDescription: 'Uy eʼloni xaritada ko‘rinishi uchun unga koordinata biriktirilgan bo‘lishi kerak.',
            nearbyCollectionTitle: 'Yaqin variantlar',
          };

  const locationMessage =
    locationState === 'loading'
      ? viewCopy.locationLoading
      : locationState === 'ready' && isShowingDistanceFallback
        ? viewCopy.locationFallback
        : locationState === 'ready'
          ? viewCopy.locationReady
          : locationState === 'denied'
            ? viewCopy.locationDenied
            : locationState === 'unsupported'
              ? viewCopy.locationUnsupported
              : locationState === 'error'
                ? viewCopy.locationError
                : viewCopy.locationLoading;

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

            <TabsContent value="map" className="mt-0 space-y-4">
              <section className="surface-card rounded-[1.75rem] px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                        <LocateFixed className="mr-1.5 h-3.5 w-3.5" />
                        {locationState === 'ready' && !isShowingDistanceFallback
                          ? `${mapAdsWithDistance.length} / ${NEARBY_RADIUS_KM} km`
                          : viewCopy.fallbackLabel}
                      </Badge>
                      <Badge variant="outline">
                        {viewCopy.radiusLabel}: {NEARBY_RADIUS_KM} km
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{locationMessage}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-2xl sm:w-auto"
                    onClick={() => {
                      setLocationState('idle');
                      setUserCoordinates(null);
                    }}
                  >
                    {viewCopy.retryLocation}
                  </Button>
                </div>
              </section>

              {mapAds.length === 0 ? (
                <section className="surface-card rounded-[1.75rem] px-5 py-12 text-center sm:px-6">
                  <MapPinned className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
                    {viewCopy.noMapTitle}
                  </h2>
                  <p className="mx-auto max-w-2xl text-muted-foreground">{viewCopy.noMapDescription}</p>
                </section>
              ) : (
                <>
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

                  {selectedAd ? (
                    <section className="real-estate-shell">
                      <div className="surface-card rounded-[1.75rem] p-4">
                        <Card className="overflow-hidden rounded-[1.35rem] border-border/70">
                          <CardContent className="grid gap-4 p-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-muted/40">
                              <Image
                                src={selectedAd.images[0]}
                                alt={getLocalizedText(selectedAd.title, locale)}
                                fill
                                className="object-cover"
                                sizes="180px"
                                unoptimized={selectedAd.images[0].startsWith('data:')}
                              />
                            </div>
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-primary">
                                    {priceFormatter.format(selectedAd.price)}
                                  </p>
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {getLocalizedText(selectedAd.title, locale)}
                                  </h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {selectedAdDistance !== null ? (
                                    <Badge variant="secondary">
                                      {viewCopy.distanceLabel}:{' '}
                                      {formatDistance(selectedAdDistance, languageMeta[locale].numberLocale)}
                                    </Badge>
                                  ) : null}
                                  <Badge variant="secondary">
                                    {selectedAd.rooms
                                      ? `${selectedAd.rooms} ${viewCopy.roomSuffix}`
                                      : getLocalizedText(
                                          getCategoryBySlug(selectedAd.category)?.name || {
                                            uz: 'Uy-joy',
                                            ru: 'Жильё',
                                            en: 'Real Estate',
                                          },
                                          locale
                                        )}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {getLocalizedText(getAdDisplayLocation(selectedAd), locale)}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedAd.area ? <Badge variant="outline">{selectedAd.area} m²</Badge> : null}
                                {selectedAd.floor !== null ? (
                                  <Badge variant="outline">
                                    {selectedAd.floor}-{viewCopy.floorSuffix}
                                  </Badge>
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
                      </div>

                      <div className="surface-card rounded-[1.75rem] px-4 py-4 sm:px-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold tracking-tight">
                              {viewCopy.nearbyCollectionTitle}
                            </h3>
                            <p className="text-sm text-muted-foreground">{viewCopy.mapDescription}</p>
                          </div>
                          <Badge variant="outline">{mapAdsWithDistance.length}</Badge>
                        </div>
                        <div className="scroll-row">
                          {mapAdsWithDistance.map((item) => {
                            const isActive = item.ad.id === selectedAd.id;

                            return (
                              <button
                                key={item.ad.id}
                                type="button"
                                onClick={() => setSelectedAdId(item.ad.id)}
                                className="map-listing-chip"
                                data-active={isActive}
                              >
                                <p className="text-sm font-semibold text-primary">
                                  {priceFormatter.format(item.ad.price)}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-foreground">
                                  {getLocalizedText(item.ad.title, locale)}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {item.distanceKm !== null
                                    ? `${viewCopy.distanceLabel}: ${formatDistance(
                                        item.distanceKm,
                                        languageMeta[locale].numberLocale
                                      )}`
                                    : getLocalizedText(getAdDisplayLocation(item.ad), locale)}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  ) : null}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </MarketplaceShell>
  );
}
