'use client';

import { useMemo } from 'react';
import YandexMap from '@/components/maps/YandexMap';
import type { Location, PropertyMarker } from '@/lib/map-types';
import { getLocalizedText, languageMeta, type Language } from '@/lib/i18n';
import { getAdDisplayLocation } from '@/lib/listing-utils';
import type { Ad } from '@/lib/types';
import { YANDEX_MAPS_DEFAULT_CENTER } from '@/lib/yandex-maps';

function hasCoordinates(ad: Ad): ad is Ad & { latitude: number; longitude: number } {
  return (
    typeof ad.latitude === 'number' &&
    Number.isFinite(ad.latitude) &&
    typeof ad.longitude === 'number' &&
    Number.isFinite(ad.longitude)
  );
}

export default function RealEstateListingsMapClient({
  ads,
  locale,
  selectedAdId,
  onSelectAd,
  userLocation,
  userLocationLabel,
  nearbyRadiusKm,
  popupActionLabel,
  isVisible,
  mapClassName,
  mapHeight,
}: {
  ads: Ad[];
  locale: Language;
  selectedAdId?: string;
  onSelectAd: (adId?: string) => void;
  userLocation?: Location | null;
  userLocationLabel: string;
  nearbyRadiusKm: number;
  popupActionLabel: string;
  isVisible: boolean;
  mapClassName?: string;
  mapHeight?: number | string;
}) {
  const validAds = useMemo(() => ads.filter(hasCoordinates), [ads]);
  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageMeta[locale].numberLocale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const markers = useMemo<PropertyMarker[]>(
    () =>
      validAds.map((ad) => ({
        id: ad.id,
        lat: ad.latitude,
        lng: ad.longitude,
        title: getLocalizedText(ad.title, locale),
        price: ad.price,
        priceLabel: priceFormatter.format(ad.price),
        image: ad.images[0],
        address:
          getLocalizedText(ad.formattedAddress, locale) ||
          getLocalizedText(getAdDisplayLocation(ad), locale),
        district:
          getLocalizedText(ad.district, locale) ||
          getLocalizedText(ad.city, locale) ||
          getLocalizedText(ad.location, locale),
        rooms: ad.rooms,
        area: ad.area,
        href: `/ads/${ad.id}`,
        propertyType: ad.propertyType,
      })),
    [locale, priceFormatter, validAds]
  );

  const mapCenter = useMemo<Location>(() => {
    const selectedMarker = markers.find((marker) => marker.id === selectedAdId);

    return selectedMarker || userLocation || markers[0] || YANDEX_MAPS_DEFAULT_CENTER;
  }, [markers, selectedAdId, userLocation]);

  return (
    <YandexMap
      center={mapCenter}
      zoom={selectedAdId ? 14 : 12}
      markers={markers}
      onMarkerClick={(marker) => onSelectAd(marker.id)}
      onMarkerClose={() => onSelectAd(undefined)}
      selectedMarkerId={selectedAdId}
      userLocation={userLocation || null}
      userLocationLabel={userLocationLabel}
      nearbyRadiusKm={userLocation ? nearbyRadiusKm : undefined}
      popupActionLabel={popupActionLabel}
      language={locale}
      fitBounds={markers.length > 1 || Boolean(userLocation)}
      containerId="marketplace-property-map"
      isVisible={isVisible}
      height={mapHeight}
      className={mapClassName || 'marketplace-property-map-shell'}
    />
  );
}
