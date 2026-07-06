'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  CircleF,
  GoogleMap as GoogleMapCanvas,
  InfoWindowF,
  MarkerClustererF,
  MarkerF,
  useJsApiLoader,
} from '@react-google-maps/api';
import { BedDouble, MapPin, RefreshCw, Ruler } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  GOOGLE_DARK_MAP_STYLES,
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  createPropertyMarkerIcon,
  createUserLocationIcon,
  getGoogleMapsLanguage,
  hasGoogleMapsApiKey,
} from '@/lib/google-maps';
import type { MapProps, PropertyMarker } from '@/lib/map-types';
import type { Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type GoogleMapComponentProps = MapProps & {
  language?: Language;
  popupActionLabel?: string;
};

function getCopy(language: Language) {
  if (language === 'ru') {
    return {
      apiKeyMissing: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY не найден.',
      mapError: 'Google Maps не загрузился.',
      retry: 'Повторить',
      viewDetails: 'Подробнее',
    };
  }

  if (language === 'en') {
    return {
      apiKeyMissing: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing.',
      mapError: 'Google Maps could not be loaded.',
      retry: 'Retry',
      viewDetails: 'View details',
    };
  }

  return {
    apiKeyMissing: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY topilmadi.',
    mapError: 'Google Maps yuklanmadi.',
    retry: 'Qayta urinish',
    viewDetails: 'Batafsil ko‘rish',
  };
}

function normalizeHeight(height: number | string | undefined) {
  if (typeof height === 'number') {
    return `${height}px`;
  }

  return height || '100%';
}

function GoogleMapComponent({
  center,
  zoom = 12,
  markers = [],
  onClick,
  onMarkerClick,
  height = '100%',
  className,
  fitBounds = false,
  selectedMarkerId,
  userLocation = null,
  userLocationLabel,
  nearbyRadiusKm,
  language = 'uz',
  popupActionLabel,
}: GoogleMapComponentProps) {
  const { theme } = useTheme();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [loaderNonce, setLoaderNonce] = useState(0);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(selectedMarkerId || null);
  const copy = getCopy(language);
  const mapHeight = normalizeHeight(height);

  const { isLoaded, loadError } = useJsApiLoader({
    id: `google-map-${language}-${loaderNonce}`,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: getGoogleMapsLanguage(language),
    region: 'UZ',
  });

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === (selectedMarkerId || activeMarkerId)) || null,
    [activeMarkerId, markers, selectedMarkerId]
  );

  const markerIcons = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') {
      return new Map<string, google.maps.Icon | google.maps.Symbol | string>();
    }

    return new Map(
      markers.map((marker) => [
        marker.id,
        marker.icon ||
          createPropertyMarkerIcon(google, {
            label: marker.priceLabel || '',
            propertyType: marker.propertyType,
            selected: marker.id === (selectedMarkerId || activeMarkerId),
            theme,
          }),
      ])
    );
  }, [activeMarkerId, isLoaded, markers, selectedMarkerId, theme]);

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      clickableIcons: false,
      disableDefaultUI: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false,
      styles: theme === 'dark' ? GOOGLE_DARK_MAP_STYLES : undefined,
      zoomControl: true,
      minZoom: 5,
      maxZoom: 20,
    }),
    [theme]
  );

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      const latLng = event.latLng;

      if (!latLng || !onClick) {
        return;
      }

      onClick(
        {
          lat: Number(latLng.lat().toFixed(6)),
          lng: Number(latLng.lng().toFixed(6)),
        },
        event
      );
    },
    [onClick]
  );

  const handleMarkerClick = useCallback(
    (marker: PropertyMarker) => {
      setActiveMarkerId(marker.id);
      onMarkerClick?.(marker);
    },
    [onMarkerClick]
  );

  useEffect(() => {
    if (selectedMarkerId) {
      setActiveMarkerId(selectedMarkerId);
      return;
    }

    if (markers.length === 1) {
      setActiveMarkerId(markers[0].id);
    }
  }, [markers, selectedMarkerId]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoaded || typeof google === 'undefined') {
      return;
    }

    if (selectedMarker) {
      map.panTo(selectedMarker);

      if ((map.getZoom() || 0) < 14) {
        map.setZoom(14);
      }

      return;
    }

    if (fitBounds && (markers.length > 1 || userLocation)) {
      const bounds = new google.maps.LatLngBounds();

      markers.forEach((marker) => {
        bounds.extend(marker);
      });

      if (userLocation) {
        bounds.extend(userLocation);
      }

      map.fitBounds(bounds, 64);
      return;
    }

    if (userLocation) {
      map.panTo(userLocation);
      map.setZoom(12);
      return;
    }

    map.panTo(center);
    map.setZoom(zoom);
  }, [center, fitBounds, isLoaded, markers, selectedMarker, userLocation, zoom]);

  if (!hasGoogleMapsApiKey()) {
    return (
      <div className={cn('map-shell', className)} style={{ height: mapHeight }}>
        <div className="flex h-full items-center justify-center rounded-[inherit] bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {copy.apiKeyMissing}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn('map-shell', className)} style={{ height: mapHeight }}>
        <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[inherit] bg-muted/30 p-6 text-center">
          <p className="max-w-md text-sm text-muted-foreground">{copy.mapError}</p>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setLoaderNonce((current) => current + 1)}
          >
            <RefreshCw className="h-4 w-4" />
            {copy.retry}
          </Button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={cn('map-shell animate-pulse', className)} style={{ height: mapHeight }}>
        <div className="h-full w-full rounded-[inherit] bg-muted/60" />
      </div>
    );
  }

  return (
    <div className={cn('map-shell', className)} style={{ height: mapHeight }}>
      <GoogleMapCanvas
        mapContainerClassName="google-map-canvas"
        center={center}
        zoom={zoom}
        options={mapOptions}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        onClick={handleMapClick}
      >
        {userLocation ? (
          <>
            {nearbyRadiusKm ? (
              <CircleF
                center={userLocation}
                radius={nearbyRadiusKm * 1000}
                options={{
                  fillColor: '#0b48d6',
                  fillOpacity: theme === 'dark' ? 0.12 : 0.08,
                  strokeColor: '#0b48d6',
                  strokeOpacity: 0.5,
                  strokeWeight: 2,
                }}
              />
            ) : null}

            <MarkerF
              position={userLocation}
              title={userLocationLabel}
              icon={createUserLocationIcon(google, theme)}
              zIndex={3000}
            />
          </>
        ) : null}

        <MarkerClustererF options={{ gridSize: 60, minimumClusterSize: 4 }}>
          {(clusterer) => (
            <>
              {markers.map((marker) => (
                <MarkerF
                  key={marker.id}
                  clusterer={clusterer}
                  position={marker}
                  title={marker.title}
                  icon={markerIcons.get(marker.id)}
                  onClick={() => handleMarkerClick(marker)}
                  zIndex={marker.id === (selectedMarkerId || activeMarkerId) ? 2500 : 1200}
                  animation={
                    marker.id === (selectedMarkerId || activeMarkerId)
                      ? google.maps.Animation.DROP
                      : undefined
                  }
                />
              ))}
            </>
          )}
        </MarkerClustererF>

        {selectedMarker ? (
          <InfoWindowF
            position={selectedMarker}
            onCloseClick={() => setActiveMarkerId(selectedMarkerId || null)}
            options={{
              pixelOffset: new google.maps.Size(0, -42),
            }}
          >
            <div className="google-map-preview">
              <div className="relative aspect-[16/10] overflow-hidden rounded-[1rem] bg-muted/40">
                {selectedMarker.image ? (
                  <Image
                    src={selectedMarker.image}
                    alt={selectedMarker.title}
                    fill
                    className="object-cover"
                    sizes="320px"
                    unoptimized={
                      selectedMarker.image.startsWith('data:') ||
                      selectedMarker.image.startsWith('blob:')
                    }
                  />
                ) : null}
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  {selectedMarker.priceLabel ? (
                    <p className="text-base font-bold text-primary">{selectedMarker.priceLabel}</p>
                  ) : null}
                  <h3 className="text-base font-semibold text-foreground">{selectedMarker.title}</h3>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {selectedMarker.district || selectedMarker.address ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{selectedMarker.district || selectedMarker.address}</span>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    {selectedMarker.rooms ? (
                      <span className="inline-flex items-center gap-1.5">
                        <BedDouble className="h-4 w-4 text-primary" />
                        {selectedMarker.rooms}
                      </span>
                    ) : null}
                    {selectedMarker.area ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Ruler className="h-4 w-4 text-primary" />
                        {selectedMarker.area} m²
                      </span>
                    ) : null}
                  </div>
                </div>

                {selectedMarker.href ? (
                  <Button asChild className="h-10 w-full rounded-2xl">
                    <Link href={selectedMarker.href}>{popupActionLabel || copy.viewDetails}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </InfoWindowF>
        ) : null}
      </GoogleMapCanvas>
    </div>
  );
}

export default memo(GoogleMapComponent);
