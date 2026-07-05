'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { DivIcon, LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { languageMeta, type Language, getLocalizedText } from '@/lib/i18n';
import { REAL_ESTATE_DEFAULT_CENTER } from '@/lib/mock-data';
import { getAdDisplayLocation } from '@/lib/listing-utils';
import type { Ad } from '@/lib/types';

function MapCenterController({ center }: { center: LatLngExpression }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function createPriceIcon(priceLabel: string, isSelected: boolean) {
  return L.divIcon({
    className: 'leaflet-price-marker-wrapper',
    html: `<span class="leaflet-price-marker${isSelected ? ' leaflet-price-marker--selected' : ''}">${priceLabel}</span>`,
    iconSize: [96, 34],
    iconAnchor: [48, 17],
  }) as DivIcon;
}

export default function RealEstateListingsMapClient({
  ads,
  locale,
  selectedAdId,
  onSelectAd,
}: {
  ads: Ad[];
  locale: Language;
  selectedAdId?: string;
  onSelectAd: (adId: string) => void;
}) {
  const center = useMemo<LatLngExpression>(() => {
    const selectedAd = ads.find((ad) => ad.id === selectedAdId);

    if (
      selectedAd &&
      typeof selectedAd.latitude === 'number' &&
      typeof selectedAd.longitude === 'number'
    ) {
      return [selectedAd.latitude, selectedAd.longitude];
    }

    const firstAdWithLocation = ads.find(
      (ad) => typeof ad.latitude === 'number' && typeof ad.longitude === 'number'
    );

    if (firstAdWithLocation) {
      return [firstAdWithLocation.latitude as number, firstAdWithLocation.longitude as number];
    }

    return [REAL_ESTATE_DEFAULT_CENTER.lat, REAL_ESTATE_DEFAULT_CENTER.lng];
  }, [ads, selectedAdId]);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageMeta[locale].numberLocale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  return (
    <div className="leaflet-map-shell">
      <MapContainer center={center} zoom={12} className="h-full w-full rounded-[inherit]">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenterController center={center} />
        {ads
          .filter((ad) => typeof ad.latitude === 'number' && typeof ad.longitude === 'number')
          .map((ad) => {
            const icon = createPriceIcon(priceFormatter.format(ad.price), selectedAdId === ad.id);

            return (
              <Marker
                key={ad.id}
                icon={icon}
                position={[ad.latitude as number, ad.longitude as number]}
                eventHandlers={{
                  click() {
                    onSelectAd(ad.id);
                  },
                }}
              >
                <Popup>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {getLocalizedText(ad.title, locale)}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {priceFormatter.format(ad.price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getLocalizedText(getAdDisplayLocation(ad), locale)}
                    </p>
                    <Link href={`/ads/${ad.id}`} className="text-sm font-semibold text-primary">
                      Open listing
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
