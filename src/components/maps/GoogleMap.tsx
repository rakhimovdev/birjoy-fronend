'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  CircleF,
  GoogleMapsMarkerClusterer,
  GoogleMap as GoogleMapCanvas,
  InfoWindowF,
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
  GOOGLE_MAPS_MAP_ID,
  createPropertyMarkerContent,
  createUserLocationMarkerContent,
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

type AdvancedMarkerClusterer = InstanceType<typeof GoogleMapsMarkerClusterer.MarkerClusterer>;

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

function createMarkerImageContent(icon: PropertyMarker['icon']) {
  if (!icon) {
    return null;
  }

  const url = typeof icon === 'string' ? icon : 'url' in icon ? icon.url : null;
  const scaledSize =
    typeof icon !== 'string' && 'scaledSize' in icon && icon.scaledSize ? icon.scaledSize : null;

  if (!url) {
    return null;
  }

  const image = document.createElement('img');
  image.src = url;
  image.alt = '';
  image.decoding = 'async';
  image.style.width = scaledSize ? `${scaledSize.width}px` : '40px';
  image.style.height = scaledSize ? `${scaledSize.height}px` : '40px';
  image.style.objectFit = 'contain';

  return image;
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
  const clustererRef = useRef<AdvancedMarkerClusterer | null>(null);
  const propertyMarkerListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const propertyMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [loaderNonce, setLoaderNonce] = useState(0);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(selectedMarkerId || null);
  const copy = getCopy(language);
  const mapHeight = normalizeHeight(height);
  const highlightedMarkerId = selectedMarkerId || activeMarkerId;

  const { isLoaded, loadError } = useJsApiLoader({
    id: `google-map-${language}-${loaderNonce}`,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: getGoogleMapsLanguage(language),
    region: 'UZ',
  });

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === highlightedMarkerId) || null,
    [highlightedMarkerId, markers]
  );

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      clickableIcons: false,
      disableDefaultUI: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      mapId: GOOGLE_MAPS_MAP_ID,
      mapTypeControl: false,
      streetViewControl: false,
      styles: theme === 'dark' ? GOOGLE_DARK_MAP_STYLES : undefined,
      zoomControl: true,
      minZoom: 5,
      maxZoom: 20,
    }),
    [theme]
  );

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

  const clearPropertyMarkers = useCallback(() => {
    propertyMarkerListenersRef.current.forEach((listener) => {
      listener.remove();
    });
    propertyMarkerListenersRef.current = [];
    clustererRef.current?.clearMarkers(true);
    propertyMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    propertyMarkersRef.current = [];
  }, []);

  const clearUserLocationMarker = useCallback(() => {
    if (!userLocationMarkerRef.current) {
      return;
    }

    userLocationMarkerRef.current.map = null;
    userLocationMarkerRef.current = null;
  }, []);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapInstance(map);

    if (!clustererRef.current) {
      clustererRef.current = new GoogleMapsMarkerClusterer.MarkerClusterer({
        map,
        algorithm: new GoogleMapsMarkerClusterer.SuperClusterAlgorithm({
          minPoints: 4,
          radius: 60,
        }),
      });
      return;
    }

    clustererRef.current.setMap(map);
  }, []);

  const handleMapUnmount = useCallback(() => {
    clearPropertyMarkers();
    clearUserLocationMarker();
    clustererRef.current?.clearMarkers(true);
    clustererRef.current?.setMap(null);
    clustererRef.current = null;
    mapRef.current = null;
    setMapInstance(null);
  }, [clearPropertyMarkers, clearUserLocationMarker]);

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

  useEffect(() => {
    if (
      !mapInstance ||
      !isLoaded ||
      typeof google === 'undefined' ||
      !google.maps.marker?.AdvancedMarkerElement ||
      !clustererRef.current
    ) {
      return;
    }

    clearPropertyMarkers();

    const propertyMarkers = markers.map((marker) => {
      const markerView = new google.maps.marker.AdvancedMarkerElement({
        position: marker,
        title: marker.title,
        zIndex: marker.id === highlightedMarkerId ? 2500 : 1200,
        content:
          createMarkerImageContent(marker.icon) ||
          createPropertyMarkerContent({
            label: marker.priceLabel || '',
            propertyType: marker.propertyType,
            selected: marker.id === highlightedMarkerId,
            theme,
          }),
      });

      propertyMarkerListenersRef.current.push(
        markerView.addListener('click', () => {
          handleMarkerClick(marker);
        })
      );

      return markerView;
    });

    propertyMarkersRef.current = propertyMarkers;
    clustererRef.current.addMarkers(propertyMarkers, true);
    clustererRef.current.render();

    return () => {
      clearPropertyMarkers();
    };
  }, [clearPropertyMarkers, handleMarkerClick, highlightedMarkerId, isLoaded, mapInstance, markers, theme]);

  useEffect(() => {
    if (
      !mapInstance ||
      !isLoaded ||
      typeof google === 'undefined' ||
      !google.maps.marker?.AdvancedMarkerElement
    ) {
      return;
    }

    if (!userLocation) {
      clearUserLocationMarker();
      return;
    }

    if (!userLocationMarkerRef.current) {
      userLocationMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstance,
        position: userLocation,
        title: userLocationLabel,
        zIndex: 3000,
        content: createUserLocationMarkerContent(theme),
      });
      return;
    }

    userLocationMarkerRef.current.map = mapInstance;
    userLocationMarkerRef.current.position = userLocation;
    userLocationMarkerRef.current.title = userLocationLabel || '';
    userLocationMarkerRef.current.zIndex = 3000;
    userLocationMarkerRef.current.content = createUserLocationMarkerContent(theme);
  }, [clearUserLocationMarker, isLoaded, mapInstance, theme, userLocation, userLocationLabel]);

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
          </>
        ) : null}

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
