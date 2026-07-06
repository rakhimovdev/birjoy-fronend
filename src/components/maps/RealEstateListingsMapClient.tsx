'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { DivIcon, LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { getLocalizedText, languageMeta, type Language } from '@/lib/i18n';
import { getAdDisplayLocation } from '@/lib/listing-utils';
import { REAL_ESTATE_DEFAULT_CENTER } from '@/lib/mock-data';
import type { Ad } from '@/lib/types';

type Coordinates = {
  lat: number;
  lng: number;
};

function hasCoordinates(ad: Ad): ad is Ad & { latitude: number; longitude: number } {
  return (
    typeof ad.latitude === 'number' &&
    Number.isFinite(ad.latitude) &&
    typeof ad.longitude === 'number' &&
    Number.isFinite(ad.longitude)
  );
}

function MapViewportController({
  ads,
  selectedAdId,
  userLocation,
}: {
  ads: Ad[];
  selectedAdId?: string;
  userLocation?: Coordinates | null;
}) {
  const map = useMap();

  useEffect(() => {
    const markers = ads.filter(hasCoordinates);
    const selectedAd = markers.find((ad) => ad.id === selectedAdId);

    if (selectedAd) {
      map.setView([selectedAd.latitude, selectedAd.longitude], Math.max(map.getZoom(), 13), {
        animate: true,
      });
      return;
    }

    if (userLocation && markers.length > 0) {
      const bounds = L.latLngBounds(
        [
          [userLocation.lat, userLocation.lng],
          ...markers.map((ad) => [ad.latitude, ad.longitude] as [number, number]),
        ] as [number, number][]
      );

      map.fitBounds(bounds, {
        animate: true,
        padding: [40, 40],
      });
      return;
    }

    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 12, { animate: true });
      return;
    }

    if (markers[0]) {
      map.setView([markers[0].latitude, markers[0].longitude], 12, { animate: true });
      return;
    }

    map.setView([REAL_ESTATE_DEFAULT_CENTER.lat, REAL_ESTATE_DEFAULT_CENTER.lng], 12, {
      animate: true,
    });
  }, [ads, map, selectedAdId, userLocation]);

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

function createUserLocationIcon() {
  return L.divIcon({
    className: 'leaflet-user-marker-wrapper',
    html: '<span class="leaflet-user-location-marker"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  }) as DivIcon;
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
}: {
  ads: Ad[];
  locale: Language;
  selectedAdId?: string;
  onSelectAd: (adId: string) => void;
  userLocation?: Coordinates | null;
  userLocationLabel: string;
  nearbyRadiusKm: number;
  popupActionLabel: string;
}) {
  const center = useMemo<LatLngExpression>(() => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lng];
    }

    const selectedAd = ads.find((ad) => ad.id === selectedAdId);

    if (selectedAd && hasCoordinates(selectedAd)) {
      return [selectedAd.latitude, selectedAd.longitude];
    }

    const firstAdWithLocation = ads.find(hasCoordinates);

    if (firstAdWithLocation) {
      return [firstAdWithLocation.latitude, firstAdWithLocation.longitude];
    }

    return [REAL_ESTATE_DEFAULT_CENTER.lat, REAL_ESTATE_DEFAULT_CENTER.lng];
  }, [ads, selectedAdId, userLocation]);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageMeta[locale].numberLocale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const userLocationIcon = useMemo(() => createUserLocationIcon(), []);
  const roomSuffix = locale === 'ru' ? 'комн.' : locale === 'en' ? 'rooms' : 'xona';

  return (
    <div className="leaflet-map-shell">
      <MapContainer center={center} zoom={12} className="h-full w-full rounded-[inherit]">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewportController ads={ads} selectedAdId={selectedAdId} userLocation={userLocation} />

        {userLocation ? (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={nearbyRadiusKm * 1000}
              pathOptions={{
                color: '#0b48d6',
                weight: 1.5,
                fillColor: '#0b48d6',
                fillOpacity: 0.08,
              }}
            />
            <Marker icon={userLocationIcon} position={[userLocation.lat, userLocation.lng]}>
              <Popup>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{userLocationLabel}</p>
                  <p className="text-xs text-muted-foreground">{nearbyRadiusKm} km</p>
                </div>
              </Popup>
            </Marker>
          </>
        ) : null}

        {ads.filter(hasCoordinates).map((ad) => {
          const icon = createPriceIcon(priceFormatter.format(ad.price), selectedAdId === ad.id);

          return (
            <Marker
              key={ad.id}
              icon={icon}
              position={[ad.latitude, ad.longitude]}
              eventHandlers={{
                click() {
                  onSelectAd(ad.id);
                },
              }}
            >
              <Popup>
                <div className="min-w-[12rem] space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    {getLocalizedText(ad.title, locale)}
                  </p>
                  <p className="text-sm font-bold text-primary">{priceFormatter.format(ad.price)}</p>
                  <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {ad.rooms ? <span>{ad.rooms} {roomSuffix}</span> : null}
                    {ad.area ? <span>{ad.area} m²</span> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getLocalizedText(getAdDisplayLocation(ad), locale)}
                  </p>
                  <Link href={`/ads/${ad.id}`} className="text-sm font-semibold text-primary">
                    {popupActionLabel}
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
