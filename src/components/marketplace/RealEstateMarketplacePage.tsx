'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowUpDown, MapPinned } from 'lucide-react';
import { AdCard } from '@/components/ads/AdCard';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { RealEstateFilterBar } from '@/components/marketplace/RealEstateFilterBar';
import { RealEstateFullscreenMapOverlay } from '@/components/marketplace/RealEstateFullscreenMapOverlay';
import {
  ListingsShowcaseSkeleton,
  MarketplaceErrorState,
  MarketplaceStatusCard,
} from '@/components/marketplace/MarketplaceStates';
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
  const [loadRequestNonce, setLoadRequestNonce] = useState(0);
  const [selectedAdId, setSelectedAdId] = useState<string | undefined>(undefined);
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [userCoordinates, setUserCoordinates] = useState<Location | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [nearbyZoomed, setNearbyZoomed] = useState(false);
  const [filters, setFilters] = useState<RealEstateFilterState>({ ...EMPTY_REAL_ESTATE_FILTERS });
  const query = searchParams.get('q')?.trim() ?? '';
  const category = searchParams.get('category')?.trim() ?? '';
  const basePath = getVerticalHref('real_estate');
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
  }, [activeCategory, loadRequestNonce, query]);

  const filteredAds = useMemo(
    () => ads.filter((ad) => matchesRealEstateFilters(ad, filters)),
    [ads, filters]
  );

  const featuredAds = useMemo(() => filteredAds.filter((ad) => ad.isFeatured), [filteredAds]);
  const regularAds = useMemo(() => filteredAds.filter((ad) => !ad.isFeatured), [filteredAds]);
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
        topTenTitle: 'TOP 10',
        topTenDescription: 'Отобранные объявления вынесены в отдельную короткую витрину.',
        regularTitle: 'Остальные объявления',
        regularDescription: 'Ниже показаны все остальные предложения по жилью.',
        mapTitle: 'Карта жилья',
        mapDescription:
          'Полноэкранная карта с теми же фильтрами. Нажмите на цену, чтобы открыть объявление.',
        yourLocation: 'Вы здесь',
        locateMe: 'Моё местоположение',
        locatingMe: 'Определяем место...',
        locationDenied: 'Разрешение на геолокацию не выдано.',
        locationUnsupported: 'Это устройство не поддерживает геолокацию.',
        locationError: 'Не удалось определить текущее местоположение.',
        noMapTitle: 'Пока нет объявлений с координатами',
        noMapDescription:
          'Чтобы объявление попало на карту, для него нужна локация на карте.',
        activeFilters: 'активных фильтров',
        clearAll: 'Очистить всё',
        resultsPrefix: 'Мы нашли',
        resultsSuffix: 'объявлений',
        sortLabel: 'Сортировка',
        sortValue: 'По умолчанию',
        topBadge: 'TOP 10',
        topRibbon: 'TOP',
      }
      : locale === 'en'
        ? {
          filter: 'Filter',
          map: 'Map',
          galleryTitle: 'Home gallery',
          galleryDescription: 'Browse the feed or open the full-screen property map.',
          vipTitle: 'VIP listings',
          vipDescription: 'Featured homes appear first in a side-scrolling carousel.',
          topTenTitle: 'TOP 10',
          topTenDescription:
            'A short strip of standout listings appears separately before the full grid.',
          regularTitle: 'Other listings',
          regularDescription: 'Browse the rest of the home listings below.',
          mapTitle: 'Property map',
          mapDescription:
            'A full-screen map with the same filters. Tap a price marker to view the listing.',
          yourLocation: 'You are here',
          locateMe: 'My location',
          locatingMe: 'Finding location...',
          locationDenied: 'Location permission was denied.',
          locationUnsupported: 'This device does not support geolocation.',
          locationError: 'Current location could not be detected.',
          noMapTitle: 'No mapped home listings yet',
          noMapDescription:
            'A housing listing needs coordinates before it can appear on the map.',
          activeFilters: 'active filters',
          clearAll: 'Clear all',
          resultsPrefix: 'We found',
          resultsSuffix: 'listings',
          sortLabel: 'Sort',
          sortValue: 'Default order',
          topBadge: 'TOP 10',
          topRibbon: 'TOP',
        }
        : {
          filter: 'Filter',
          map: 'Xarita',
          galleryTitle: 'Uy-joy galereyasi',
          galleryDescription: 'Ro‘yxatdan tanlang yoki to‘liq ekran xaritada ko‘ring.',
          vipTitle: 'VIP eʼlonlar',
          vipDescription: 'Tanlangan uylar tepada yonlama karuselda ko‘rsatiladi.',
          topTenTitle: 'TOP 10',
          topTenDescription:
            'Ajratib ko‘rsatiladigan 10 ta tanlangan eʼlon shu bo‘limda chiqadi.',
          regularTitle: 'Boshqa eʼlonlar',
          regularDescription: 'Quyida qolgan barcha uy-joy eʼlonlari chiqadi.',
          mapTitle: 'Uy-joy xaritasi',
          mapDescription:
            'Bir xil filtrlarga ega to‘liq ekran xarita. Eʼlonni ko‘rish uchun narx markerini bosing.',
          yourLocation: 'Siz turgan joy',
          locateMe: 'Mening joyim',
          locatingMe: 'Joylashuv aniqlanmoqda...',
          locationDenied: 'Joylashuvga ruxsat berilmadi.',
          locationUnsupported: 'Bu qurilmada geolokatsiya qo‘llab-quvvatlanmaydi.',
          locationError: 'Hozirgi joylashuvni aniqlab bo‘lmadi.',
          noMapTitle: 'Hali koordinatali uy eʼlonlari yo‘q',
          noMapDescription:
            'Uy eʼloni xaritada ko‘rinishi uchun unga koordinata biriktirilgan bo‘lishi kerak.',
          activeFilters: 'faol filter',
          clearAll: 'Hammasini tozalash',
          resultsPrefix: 'Biz',
          resultsSuffix: 'ta eʼlon topdik',
          sortLabel: 'Saralash',
          sortValue: 'Asli bo‘yicha',
          topBadge: 'TOP 10',
          topRibbon: 'TOP',
        };

  const handleLocateUser = () => {
    setSelectedAdId(undefined);

    // If the user already has a location pinned and zoomed in, a second
    // click on the locate button zoom back out to the normal map view.
    if (userCoordinates && nearbyZoomed) {
      setNearbyZoomed(false);
      return;
    }

    setLocationState('loading');
    void requestCurrentDeviceLocation().then((result) => {
      if (result.status !== 'success') {
        setUserCoordinates(null);
        setLocationState(result.status);
        return;
      }

      setUserCoordinates(result.location);
      setNearbyZoomed(true);
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

  const handleOpenMap = () => {
    setSelectedAdId(undefined);
    setNearbyZoomed(false);
    setIsMapOpen(true);
  };

  const handleResetAllFilters = () => {
    handleClearFilters();

    if (query) {
      router.push(basePath);
    }
  };

  const mobileFeaturedAds = featuredAds;
  const mobileGridAds = regularAds;
  const mobileResultsCount = useMemo(
    () => new Intl.NumberFormat(languageMeta[locale].numberLocale).format(filteredAds.length),
    [filteredAds.length, locale]
  );

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <RealEstateFilterBar
          locale={locale}
          filters={filters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          onOpenMap={handleOpenMap}
        />

        {isLoadingAds ? (
          <ListingsShowcaseSkeleton
            title={messages.home.loadingListings}
            description={viewCopy.galleryDescription}
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
              onClick: handleResetAllFilters,
              variant: 'outline',
            }}
          />
        ) : filteredAds.length === 0 ? (
          <MarketplaceStatusCard
            title={messages.home.noResultsTitle}
            description={messages.home.noResultsDescription}
            primaryAction={{
              label: messages.home.clearFilters,
              onClick: handleResetAllFilters,
            }}
            secondaryAction={{
              label: messages.home.startSelling,
              href: '/ads/create?vertical=real_estate',
              variant: 'outline',
            }}
          />
        ) : (
          <>
            <section className="phone-nav-only mx-[calc(var(--page-gutter)*-1)] flex-col gap-4 bg-transparent px-[var(--page-gutter)] pb-6 pt-1 text-foreground">
              <div className="space-y-3">
                <h2 className="text-[1.28rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
                  {viewCopy.resultsPrefix} {mobileResultsCount} {viewCopy.resultsSuffix}
                </h2>

                <div className="flex items-center gap-2 text-[0.78rem] text-muted-foreground">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span>
                    {viewCopy.sortLabel}:{' '}
                    <span className="font-medium text-foreground">{viewCopy.sortValue}</span>
                  </span>
                </div>
              </div>

              {mobileFeaturedAds.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-[1.15rem] font-semibold tracking-[-0.03em] text-foreground">
                    {viewCopy.vipTitle}
                  </h2>
                  <div className="scroll-row">
                    {mobileFeaturedAds.map((ad) => (
                      <div key={ad.id} className="w-[11.5rem] shrink-0">
                        <AdCard
                          ad={ad}
                          isFavorite={isFavorite(ad.id)}
                          canDelete={isAdmin}
                          showManageActions={false}
                          variant="mobile_compact"
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

              {mobileGridAds.length > 0 ? (
                <section className="grid grid-cols-2 gap-3">
                  {mobileGridAds.map((ad) => (
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
              ) : null}
            </section>

            <section className="hidden min-[769px]:block surface-card section-shell--compact rounded-[1.85rem]">
              <div className="section-header">
                <div className="section-header__copy min-w-0">
                  <p className="section-kicker">{messages.home.browseAllListings}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="section-title">{viewCopy.galleryTitle}</h2>
                    <span className="stat-pill">
                      {filteredAds.length} {messages.home.resultsTitle}
                    </span>
                  </div>
                  {query || activeCategoryLabel || hasCustomFilters || mapEligibleAds.length > 0 ? (
                    <div className="status-strip">
                      {mapEligibleAds.length > 0 ? (
                        <span className="stat-pill">
                          {mapEligibleAds.length} {viewCopy.map}
                        </span>
                      ) : null}
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
                      <div
                        key={ad.id}
                        className="w-[14.25rem] shrink-0 sm:w-[15rem] lg:w-[16.25rem] xl:w-[17rem]"
                      >
                        <AdCard
                          ad={ad}
                          isFavorite={isFavorite(ad.id)}
                          canDelete={isAdmin}
                          showManageActions={false}
                          onDeleted={(adId) => {
                            setAds((previous) => previous.filter((item) => item.id !== adId));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {regularAds.length > 0 ? (
                <section className="space-y-4">
                  {featuredAds.length > 0 ? (
                    <div className="section-header">
                      <div className="section-header__copy">
                        <p className="section-kicker">{messages.home.browseAllListings}</p>
                        <h2 className="section-title">{viewCopy.regularTitle}</h2>
                        <p className="section-caption">{viewCopy.regularDescription}</p>
                      </div>
                      <Button
                        asChild
                        variant="ghost"
                        className="gap-1 px-0 font-semibold text-primary hover:bg-transparent"
                      >
                        <Link href="/ads/create?vertical=real_estate">
                          {messages.home.startSelling}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                  <div className="property-listing-grid">
                    {regularAds.map((ad) => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        isFavorite={isFavorite(ad.id)}
                        canDelete={isAdmin}
                        showManageActions={false}
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
        focusZoom={nearbyZoomed ? 15 : undefined}
      />
    </MarketplaceShell>
  );
}
