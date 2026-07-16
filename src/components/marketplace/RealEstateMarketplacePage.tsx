'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpDown, ListFilter, Loader2, MapPinned } from 'lucide-react';
import { AdCard } from '@/components/ads/AdCard';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { VerticalBar } from '@/components/layout/VerticalBar';
import { RealEstateFilterSheet } from '@/components/marketplace/RealEstateFilterSheet';
import { RealEstateFullscreenMapOverlay } from '@/components/marketplace/RealEstateFullscreenMapOverlay';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAds } from '@/lib/ads';
import { requestCurrentDeviceLocation } from '@/lib/device-location';
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import type { Location } from '@/lib/map-types';
import { getCategoryBySlug, getVerticalHref } from '@/lib/mock-data';
import {
  EMPTY_REAL_ESTATE_FILTERS,
  getActiveRealEstateFilterCount,
  hasActiveRealEstateFilters,
  matchesRealEstateFilters,
  type RealEstateFilterState,
} from '@/lib/real-estate-filters';
import type { Ad } from '@/lib/types';

type LocationState = 'idle' | 'loading' | 'ready' | 'denied' | 'unsupported' | 'error';
const NEARBY_RADIUS_KM = 5;
const MAX_FALLBACK_MAP_RESULTS = 24;

function hasCoordinates(ad: Ad): ad is Ad & { latitude: number; longitude: number } {
  return (
    typeof ad.latitude === 'number' &&
    Number.isFinite(ad.latitude) &&
    typeof ad.longitude === 'number' &&
    Number.isFinite(ad.longitude)
  );
}

function getDistanceKm(from: Location, to: Location) {
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isFavorite } = useAuth();
  const { locale, messages } = useI18n();
  const { isAdmin } = useAdminSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | undefined>(undefined);
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [userCoordinates, setUserCoordinates] = useState<Location | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [filters, setFilters] = useState<RealEstateFilterState>({ ...EMPTY_REAL_ESTATE_FILTERS });
  const query = searchParams.get('q')?.trim() ?? '';
  const category = searchParams.get('category')?.trim() ?? '';
  const basePath = getVerticalHref('real_estate');
  const activeCategory = category || null;
  const activeCategoryRecord = activeCategory ? getCategoryBySlug(activeCategory) : null;
  const activeCategoryLabel = activeCategoryRecord
    ? getLocalizedText(activeCategoryRecord.name, locale)
    : activeCategory;

  useEffect(() => {
    const abortController = new AbortController();

    async function loadAds() {
      try {
        setIsLoadingAds(true);
        const response = await fetchAds({
          vertical: 'real_estate',
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

        setAds([]);
        setAdsError(error instanceof Error ? error.message : 'Unable to load ads.');
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
  }, [activeCategory, query]);

  const filteredAds = useMemo(
    () => ads.filter((ad) => matchesRealEstateFilters(ad, filters)),
    [ads, filters]
  );

  const featuredAds = useMemo(() => filteredAds.filter((ad) => ad.isFeatured), [filteredAds]);
  const regularAds = useMemo(() => filteredAds.filter((ad) => !ad.isFeatured), [filteredAds]);
  const galleryAds = featuredAds.length > 0 ? regularAds : filteredAds;
  const mapEligibleAds = useMemo(() => filteredAds.filter(hasCoordinates), [filteredAds]);

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

  const mapAds = useMemo(() => mapAdsWithDistance.map((item) => item.ad), [mapAdsWithDistance]);

  useEffect(() => {
    if (mapAds.length === 0) {
      setSelectedAdId(undefined);
      return;
    }

    if (selectedAdId && !mapAds.some((ad) => ad.id === selectedAdId)) {
      setSelectedAdId(undefined);
    }
  }, [mapAds, selectedAdId]);
  const hasCustomFilters = hasActiveRealEstateFilters(filters);
  const activeFilterCount = getActiveRealEstateFilterCount(filters);

  const viewCopy =
    locale === 'ru'
      ? {
          filter: 'Фильтр',
          map: 'Карта',
          galleryTitle: 'Галерея жилья',
          galleryDescription: 'Подберите жильё из ленты или откройте полноэкранную карту.',
          vipTitle: 'VIP объявления',
          vipDescription: 'Лучшие предложения собраны в горизонтальной витрине.',
          regularTitle: 'Остальные объявления',
          regularDescription: 'Ниже показаны все остальные предложения по жилью.',
          mapTitle: 'Карта жилья',
          mapDescription: 'Полноэкранная карта с теми же фильтрами. Нажмите на цену, чтобы открыть объявление.',
          yourLocation: 'Вы здесь',
          locateMe: 'Моё местоположение',
          locatingMe: 'Определяем место...',
          locationDenied: 'Разрешение на геолокацию не выдано.',
          locationUnsupported: 'Это устройство не поддерживает геолокацию.',
          locationError: 'Не удалось определить текущее местоположение.',
          noMapTitle: 'Пока нет объявлений с координатами',
          noMapDescription: 'Чтобы объявление попало на карту, для него нужна локация на карте.',
          activeFilters: 'активных фильтров',
          clearAll: 'Очистить всё',
          resultsPrefix: 'Мы нашли',
          resultsSuffix: 'объявлений',
          sortLabel: 'Сортировка',
          sortValue: 'По умолчанию',
          topBadge: 'TOP 10',
        }
      : locale === 'en'
        ? {
            filter: 'Filter',
            map: 'Map',
            galleryTitle: 'Home gallery',
            galleryDescription: 'Browse the feed or open the full-screen property map.',
            vipTitle: 'VIP listings',
            vipDescription: 'Featured homes appear first in a side-scrolling carousel.',
            regularTitle: 'Other listings',
            regularDescription: 'Browse the rest of the home listings below.',
            mapTitle: 'Property map',
            mapDescription: 'A full-screen map with the same filters. Tap a price marker to view the listing.',
            yourLocation: 'You are here',
            locateMe: 'My location',
            locatingMe: 'Finding location...',
            locationDenied: 'Location permission was denied.',
            locationUnsupported: 'This device does not support geolocation.',
            locationError: 'Current location could not be detected.',
            noMapTitle: 'No mapped home listings yet',
            noMapDescription: 'A housing listing needs coordinates before it can appear on the map.',
            activeFilters: 'active filters',
            clearAll: 'Clear all',
            resultsPrefix: 'We found',
            resultsSuffix: 'listings',
            sortLabel: 'Sort',
            sortValue: 'Default order',
            topBadge: 'TOP 10',
          }
        : {
            filter: 'Filter',
            map: 'Xarita',
            galleryTitle: 'Uy-joy galereyasi',
            galleryDescription: 'Ro‘yxatdan tanlang yoki to‘liq ekran xaritada ko‘ring.',
            vipTitle: 'VIP eʼlonlar',
            vipDescription: 'Tanlangan uylar tepada yonlama karuselda ko‘rsatiladi.',
            regularTitle: 'Boshqa eʼlonlar',
            regularDescription: 'Quyida qolgan barcha uy-joy eʼlonlari chiqadi.',
            mapTitle: 'Uy-joy xaritasi',
            mapDescription: 'Bir xil filtrlarga ega to‘liq ekran xarita. Eʼlonni ko‘rish uchun narx markerini bosing.',
            yourLocation: 'Siz turgan joy',
            locateMe: 'Mening joyim',
            locatingMe: 'Joylashuv aniqlanmoqda...',
            locationDenied: 'Joylashuvga ruxsat berilmadi.',
            locationUnsupported: 'Bu qurilmada geolokatsiya qo‘llab-quvvatlanmaydi.',
            locationError: 'Hozirgi joylashuvni aniqlab bo‘lmadi.',
            noMapTitle: 'Hali koordinatali uy eʼlonlari yo‘q',
            noMapDescription: 'Uy eʼloni xaritada ko‘rinishi uchun unga koordinata biriktirilgan bo‘lishi kerak.',
            activeFilters: 'faol filter',
            clearAll: 'Hammasini tozalash',
            resultsPrefix: 'Biz',
            resultsSuffix: 'ta eʼlon topdik',
            sortLabel: 'Saralash',
            sortValue: 'Asli bo‘yicha',
            topBadge: 'TOP 10',
          };

  const handleLocateUser = () => {
    setSelectedAdId(undefined);
    setLocationState('loading');
    void requestCurrentDeviceLocation().then((result) => {
      if (result.status !== 'success') {
        setUserCoordinates(null);
        setLocationState(result.status);
        return;
      }

      setUserCoordinates(result.location);
      setLocationState('ready');
    });
  };

  const locationFeedback =
    locationState === 'denied'
      ? viewCopy.locationDenied
      : locationState === 'unsupported'
        ? viewCopy.locationUnsupported
        : locationState === 'error'
          ? viewCopy.locationError
          : null;

  const handleApplyFilters = (nextFilters: RealEstateFilterState) => {
    setFilters(nextFilters);
  };

  const handleClearFilters = () => {
    setFilters({ ...EMPTY_REAL_ESTATE_FILTERS });
  };

  const handleResetAllFilters = () => {
    handleClearFilters();

    if (query) {
      router.push(basePath);
    }
  };

  const mobileFeaturedAds = featuredAds.length > 0 ? featuredAds : filteredAds.slice(0, 6);
  const mobileGridAds = filteredAds;
  const mobileResultsCount = useMemo(
    () => new Intl.NumberFormat(languageMeta[locale].numberLocale).format(filteredAds.length),
    [filteredAds.length, locale]
  );

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <div className="hidden min-[769px]:block">
          <VerticalBar activeVertical="real_estate" />
        </div>

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
              <Button type="button" className="w-full min-[481px]:w-auto" onClick={handleResetAllFilters}>
                {messages.home.clearFilters}
              </Button>
              <Button asChild variant="outline" className="w-full min-[481px]:w-auto">
                <Link href="/ads/create?vertical=real_estate">{messages.home.startSelling}</Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
            <section className="phone-nav-only mx-[calc(var(--page-gutter)*-1)] flex-col gap-6 bg-[#050505] px-[var(--page-gutter)] pb-6 pt-2 text-white">
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <RealEstateFilterSheet
                    locale={locale}
                    filters={filters}
                    onApply={handleApplyFilters}
                    onClear={handleClearFilters}
                    buttonVariant="ghost"
                    buttonClassName="w-full min-h-12 justify-center rounded-[1.2rem] border border-white/10 bg-white/[0.04] text-white shadow-none hover:bg-white/[0.08] hover:text-white"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-12 rounded-[1.2rem] border border-white/10 bg-white/[0.04] text-white shadow-none hover:bg-white/[0.08] hover:text-white"
                  onClick={() => {
                    setSelectedAdId(undefined);
                    setIsMapOpen(true);
                  }}
                >
                  <MapPinned className="h-4 w-4" />
                  {viewCopy.map}
                </Button>
              </div>

              {mobileFeaturedAds.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-[1.95rem] font-semibold tracking-[-0.03em] text-white">
                    {viewCopy.vipTitle}
                  </h2>
                  <div className="scroll-row">
                    {mobileFeaturedAds.map((ad) => (
                      <div key={ad.id} className="w-[11.5rem] shrink-0">
                        <AdCard
                          ad={ad}
                          isFavorite={isFavorite(ad.id)}
                          canDelete={isAdmin}
                          variant="real_estate_mobile_compact"
                          featuredLabel="VIP"
                          onDeleted={(adId) => {
                            setAds((previous) => previous.filter((item) => item.id !== adId));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-white">
                  {viewCopy.resultsPrefix} {mobileResultsCount} {viewCopy.resultsSuffix}
                </h2>

                <div className="flex items-center gap-2 text-sm text-white/64">
                  <ArrowUpDown className="h-4 w-4" />
                  <span>
                    {viewCopy.sortLabel}: <span className="font-medium text-white/88">{viewCopy.sortValue}</span>
                  </span>
                </div>
              </div>

              <section className="grid grid-cols-2 gap-3">
                {mobileGridAds.map((ad) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    isFavorite={isFavorite(ad.id)}
                    canDelete={isAdmin}
                    variant="real_estate_mobile"
                    featuredLabel={ad.isFeatured ? 'TOP' : undefined}
                    onDeleted={(adId) => {
                      setAds((previous) => previous.filter((item) => item.id !== adId));
                    }}
                  />
                ))}
              </section>
            </section>

            <section className="hidden min-[769px]:block surface-card section-shell--compact rounded-[1.85rem]">
              <div className="section-header">
                <div className="section-header__copy min-w-0">
                  <p className="section-kicker">{messages.home.browseAllListings}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="section-title">{viewCopy.galleryTitle}</h2>
                    <span className="stat-pill">{filteredAds.length} {messages.home.resultsTitle}</span>
                  </div>
                  {query || activeCategoryLabel || hasCustomFilters || mapEligibleAds.length > 0 ? (
                    <div className="status-strip">
                      {mapEligibleAds.length > 0 ? <span className="stat-pill">{mapEligibleAds.length} {viewCopy.map}</span> : null}
                      {query ? <Badge variant="secondary">{query}</Badge> : null}
                      {activeCategoryLabel ? <Badge variant="outline">{activeCategoryLabel}</Badge> : null}
                      {hasCustomFilters ? (
                        <Badge variant="outline">
                          {activeFilterCount} {viewCopy.activeFilters}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="action-cluster w-full sm:w-auto">
                  <RealEstateFilterSheet
                    locale={locale}
                    filters={filters}
                    onApply={handleApplyFilters}
                    onClear={handleClearFilters}
                    buttonClassName="w-full sm:w-auto sm:min-w-[9rem]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-[1.15rem] border-white/55 bg-background/80 shadow-none sm:w-auto sm:min-w-[9rem]"
                    onClick={() => {
                      setSelectedAdId(undefined);
                      setIsMapOpen(true);
                    }}
                  >
                    <MapPinned className="h-4 w-4" />
                    {viewCopy.map}
                  </Button>
                </div>
              </div>
            </section>

            <div className="hidden min-[769px]:block space-y-4">
              {featuredAds.length > 0 ? (
                <section className="surface-card section-shell rounded-[1.85rem]">
                  <div className="section-header">
                    <div className="section-header__copy">
                      <p className="section-kicker">{viewCopy.vipTitle}</p>
                      <h2 className="section-title">{viewCopy.vipTitle}</h2>
                      <p className="section-caption">{viewCopy.vipDescription}</p>
                    </div>
                    <Badge variant="secondary">{featuredAds.length}</Badge>
                  </div>
                  <div className="scroll-row">
                    {featuredAds.map((ad) => (
                      <div key={ad.id} className="w-[14.25rem] shrink-0 sm:w-[15rem] lg:w-[16.25rem] xl:w-[17rem]">
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
                <section className="space-y-4">
                  {featuredAds.length > 0 ? (
                    <div className="section-header">
                      <div className="section-header__copy">
                        <p className="section-kicker">{messages.home.browseAllListings}</p>
                        <h2 className="section-title">{viewCopy.regularTitle}</h2>
                        <p className="section-caption">{viewCopy.regularDescription}</p>
                      </div>
                      <Button asChild variant="ghost" className="gap-1 px-0 font-semibold text-primary hover:bg-transparent">
                        <Link href="/ads/create?vertical=real_estate">
                          {messages.home.startSelling}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                  <div className="property-listing-grid">
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
          </>
        )}
      </main>

      <RealEstateFullscreenMapOverlay
        open={isMapOpen}
        locale={locale}
        ads={mapAds}
        selectedAdId={selectedAdId}
        onClose={() => {
          setIsMapOpen(false);
          setSelectedAdId(undefined);
        }}
        onSelectAd={setSelectedAdId}
        userLocation={userCoordinates}
        userLocationLabel={viewCopy.yourLocation}
        nearbyRadiusKm={NEARBY_RADIUS_KM}
        popupActionLabel={messages.adDetails.browseMore}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        onLocateUser={handleLocateUser}
        isLocatingUser={locationState === 'loading'}
        locateUserLabel={viewCopy.locateMe}
        locatingUserLabel={viewCopy.locatingMe}
        locationFeedback={locationFeedback}
        title={viewCopy.mapTitle}
        emptyTitle={viewCopy.noMapTitle}
        emptyDescription={viewCopy.noMapDescription}
      />
    </MarketplaceShell>
  );
}
