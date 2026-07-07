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
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_API_VERSION,
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
import type { Cluster, ClusterStats, Renderer } from '@googlemaps/markerclusterer';

type GoogleMapComponentProps = MapProps & {
  language?: Language;
  popupActionLabel?: string;
  containerId?: string;
  isVisible?: boolean;
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

  return height;
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

function createClusterMarkerContent(count: number, color: string) {
  const template = document.createElement('template');
  template.innerHTML = `
    <div
      style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        border-radius: 999px;
        background: ${color};
        color: #fff;
        font: 700 16px/1 Arial, sans-serif;
        box-shadow:
          0 0 0 8px color-mix(in srgb, ${color} 28%, transparent),
          0 14px 24px rgba(15, 23, 42, 0.24);
      "
    >
      <span
        style="
          position: absolute;
          inset: 6px;
          border-radius: 999px;
          background: color-mix(in srgb, #fff 16%, transparent);
        "
      ></span>
      <span style="position: relative; z-index: 1;">${count}</span>
    </div>
  `.trim();

  return template.content.firstElementChild as HTMLElement | null;
}

function GoogleMapComponent({
  center,
  zoom = 12,
  markers = [],
  onClick,
  onMarkerClick,
  height,
  className,
  fitBounds = false,
  selectedMarkerId,
  userLocation = null,
  userLocationLabel,
  nearbyRadiusKm,
  language = 'uz',
  popupActionLabel,
  containerId,
  isVisible = true,
}: GoogleMapComponentProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<AdvancedMarkerClusterer | null>(null);
  const propertyMarkerListenersRef = useRef<Array<() => void>>([]);
  const propertyMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const [loaderNonce, setLoaderNonce] = useState(0);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(selectedMarkerId || null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [canInitializeMap, setCanInitializeMap] = useState(false);
  const copy = getCopy(language);
  const mapHeight = normalizeHeight(height);
  const highlightedMarkerId = selectedMarkerId || activeMarkerId;
  const hasContainerSize = containerSize.width > 0 && containerSize.height > 0;
  const containerStyle = mapHeight ? { height: mapHeight } : undefined;

  const { isLoaded, loadError } = useJsApiLoader({
    id: `google-map-${language}-${loaderNonce}`,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: getGoogleMapsLanguage(language),
    region: 'UZ',
    version: GOOGLE_MAPS_API_VERSION,
  });

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === highlightedMarkerId) || null,
    [highlightedMarkerId, markers]
  );

  const clusterRenderer = useMemo<Renderer>(
    () => ({
      render(cluster: Cluster, stats: ClusterStats, map: google.maps.Map) {
        const color =
          cluster.count > Math.max(10, stats.clusters.markers.mean) ? '#0b48d6' : '#0f172a';
        const content = createClusterMarkerContent(cluster.count, color);

        if (!content) {
          throw new Error('Cluster marker content could not be created.');
        }

        const clusterMarker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: cluster.position,
          title: `Cluster of ${cluster.count} markers`,
          zIndex: 4000 + cluster.count,
          gmpClickable: true,
          content,
        });

        clusterMarker.addEventListener('gmp-click', () => {
          if (cluster.bounds) {
            map.fitBounds(cluster.bounds);
          }
        });

        return clusterMarker;
      },
    }),
    []
  );

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      clickableIcons: false,
      disableDefaultUI: false,
      colorScheme: theme === 'dark' ? 'DARK' : 'LIGHT',
      fullscreenControl: false,
      gestureHandling: 'greedy',
      mapId: GOOGLE_MAPS_MAP_ID,
      mapTypeControl: false,
      streetViewControl: false,
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

  const syncMapViewport = useCallback(
    (map: google.maps.Map) => {
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
    },
    [center, fitBounds, markers, selectedMarker, userLocation, zoom]
  );

  const scheduleMapResize = useCallback(() => {
    if (
      typeof window === 'undefined' ||
      !mapRef.current ||
      !hasContainerSize ||
      !isLoaded ||
      typeof google === 'undefined'
    ) {
      return;
    }

    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null;

      const map = mapRef.current;
      const container = containerRef.current;

      if (!map || !container) {
        return;
      }

      const { width, height } = container.getBoundingClientRect();

      if (width <= 0 || height <= 0) {
        return;
      }

      google.maps.event.trigger(map, 'resize');
      syncMapViewport(map);
    });
  }, [hasContainerSize, isLoaded, mapInstance, syncMapViewport]);

  const clearPropertyMarkers = useCallback(() => {
    propertyMarkerListenersRef.current.forEach((removeListener) => {
      removeListener();
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

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const updateContainerSize = () => {
      const { width, height } = container.getBoundingClientRect();
      const nextSize = {
        width: Math.round(width),
        height: Math.round(height),
      };

      setContainerSize((current) =>
        current.width === nextSize.width && current.height === nextSize.height ? current : nextSize
      );
    };

    updateContainerSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateContainerSize);

      return () => {
        window.removeEventListener('resize', updateContainerSize);
      };
    }

    const observer = new ResizeObserver(() => {
      updateContainerSize();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!canInitializeMap && isVisible && hasContainerSize) {
      setCanInitializeMap(true);
    }
  }, [canInitializeMap, hasContainerSize, isVisible]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }
    };
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
        onClusterClick: null as unknown as AdvancedMarkerClusterer['onClusterClick'],
        renderer: clusterRenderer,
      });
      return;
    }

    clustererRef.current.setMap(map);
  }, [clusterRenderer]);

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

    if (!map || !isLoaded || typeof google === 'undefined' || !hasContainerSize) {
      return;
    }

    syncMapViewport(map);
  }, [hasContainerSize, isLoaded, mapInstance, syncMapViewport]);

  useEffect(() => {
    if (!canInitializeMap || !isVisible) {
      return;
    }

    scheduleMapResize();
  }, [canInitializeMap, isVisible, mapInstance, scheduleMapResize]);

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
        gmpClickable: true,
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

      const handleMarkerActivate = () => {
        handleMarkerClick(marker);
      };

      markerView.addEventListener('gmp-click', handleMarkerActivate);
      propertyMarkerListenersRef.current.push(() => {
        markerView.removeEventListener('gmp-click', handleMarkerActivate);
      });

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
      <div id={containerId} ref={containerRef} className={cn('map-shell', className)} style={containerStyle}>
        <div className="flex h-full items-center justify-center rounded-[inherit] bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {copy.apiKeyMissing}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div id={containerId} ref={containerRef} className={cn('map-shell', className)} style={containerStyle}>
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
      <div
        id={containerId}
        ref={containerRef}
        className={cn('map-shell animate-pulse', className)}
        style={containerStyle}
      >
        <div className="h-full w-full rounded-[inherit] bg-muted/60" />
      </div>
    );
  }

  return (
    <div id={containerId} ref={containerRef} className={cn('map-shell', className)} style={containerStyle}>
      {canInitializeMap ? (
        <GoogleMapCanvas
          key={`google-map-${language}-${theme}`}
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
      ) : (
        <div className="h-full w-full rounded-[inherit] bg-muted/60" />
      )}
    </div>
  );
}

export default memo(GoogleMapComponent);
