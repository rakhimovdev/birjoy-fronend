'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BedDouble, MapPin, RefreshCw, Ruler, X } from 'lucide-react';
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { useYandexMaps, hasYandexMapsApiKey } from '@/lib/yandex-maps-loader';
import {
  buildBounds,
  createPropertyMarkerIconShape,
  createPropertyMarkerHtml,
  createUserLocationMarkerHtml,
  getPropertyMarkerLayoutMetrics,
  toYandexCoordinates,
} from '@/lib/yandex-maps';
import type { MapProps, PropertyMarker } from '@/lib/map-types';
import type { Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type YandexMapProps = MapProps & {
  language?: Language;
  popupActionLabel?: string;
  containerId?: string;
  isVisible?: boolean;
};

function getCopy(language: Language) {
  if (language === 'ru') {
    return {
      apiKeyMissing: 'NEXT_PUBLIC_YANDEX_MAPS_API_KEY не найден.',
      mapError: 'Yandex Maps не загрузился.',
      retry: 'Повторить',
      viewDetails: 'Подробнее',
      close: 'Закрыть',
    };
  }

  if (language === 'en') {
    return {
      apiKeyMissing: 'NEXT_PUBLIC_YANDEX_MAPS_API_KEY is missing.',
      mapError: 'Yandex Maps could not be loaded.',
      retry: 'Retry',
      viewDetails: 'View details',
      close: 'Close',
    };
  }

  return {
    apiKeyMissing: 'NEXT_PUBLIC_YANDEX_MAPS_API_KEY topilmadi.',
    mapError: 'Yandex Maps yuklanmadi.',
    retry: 'Qayta urinish',
    viewDetails: 'Batafsil ko‘rish',
    close: 'Yopish',
  };
}

function normalizeHeight(height: number | string | undefined) {
  if (typeof height === 'number') {
    return `${height}px`;
  }

  return height;
}

function YandexMapComponent({
  center,
  zoom = 12,
  markers = [],
  onClick,
  onMarkerClick,
  onMarkerClose,
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
}: YandexMapProps) {
  const { theme } = useTheme();
  const [loaderNonce, setLoaderNonce] = useState(0);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(selectedMarkerId || null);
  const mapShellId = useId();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<YMapsMap | null>(null);
  const onClickRef = useRef<typeof onClick>(onClick);
  const mapClickHandlerRef = useRef<((event: YMapsEvent) => void) | null>(null);
  const propertyMarkerBindingsRef = useRef<
    Array<{
      marker: YMapsPlacemark;
      handler: (event: YMapsEvent) => void;
    }>
  >([]);
  const propertyMarkerLayoutRef = useRef<YMapsLayoutClass | null>(null);
  const userMarkerLayoutRef = useRef<YMapsLayoutClass | null>(null);
  const userLocationMarkerRef = useRef<YMapsPlacemark | null>(null);
  const radiusCircleRef = useRef<YMapsCircle | null>(null);
  const { api, error, isLoaded } = useYandexMaps(loaderNonce);
  const copy = getCopy(language);
  const mapHeight = normalizeHeight(height);
  const highlightedMarkerId = selectedMarkerId || activeMarkerId;
  const selectedMarker = useMemo(() => {
    return markers.find((marker) => marker.id === highlightedMarkerId) || null;
  }, [highlightedMarkerId, markers]);
  const containerStyle = mapHeight ? { height: mapHeight } : undefined;

  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    setActiveMarkerId(selectedMarkerId ?? null);
  }, [selectedMarkerId]);

  useEffect(() => {
    if (!api || !isLoaded || !canvasRef.current || mapRef.current) {
      return;
    }

    const map = new api.Map(
      canvasRef.current,
      {
        center: toYandexCoordinates(center),
        zoom,
        controls: ['zoomControl'],
      },
      {
        suppressMapOpenBlock: true,
      }
    );

    const handleMapClick = (event: YMapsEvent<YandexMapCoords>) => {
      const coordinates = event.get('coords');

      if (!onClickRef.current || !Array.isArray(coordinates) || coordinates.length < 2) {
        return;
      }

      onClickRef.current({
        lat: Number(coordinates[0].toFixed(6)),
        lng: Number(coordinates[1].toFixed(6)),
      });
    };

    map.events.add('click', handleMapClick as (event: YMapsEvent) => void);
    mapClickHandlerRef.current = handleMapClick as (event: YMapsEvent) => void;
    mapRef.current = map;
    map.container.fitToViewport();

    return () => {
      if (mapClickHandlerRef.current) {
        map.events.remove('click', mapClickHandlerRef.current);
      }

      map.destroy();
      mapClickHandlerRef.current = null;
      mapRef.current = null;
      propertyMarkerBindingsRef.current = [];
      userLocationMarkerRef.current = null;
      radiusCircleRef.current = null;
      propertyMarkerLayoutRef.current = null;
      userMarkerLayoutRef.current = null;
    };
  }, [api, center, isLoaded, zoom]);

  useEffect(() => {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    const fitToViewport = () => {
      mapRef.current?.container.fitToViewport();
    };

    fitToViewport();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', fitToViewport);

      return () => {
        window.removeEventListener('resize', fitToViewport);
      };
    }

    const observer = new ResizeObserver(() => {
      fitToViewport();
    });

    observer.observe(shell);

    return () => {
      observer.disconnect();
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      mapRef.current?.container.fitToViewport();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isVisible]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (selectedMarker) {
      void map.panTo(toYandexCoordinates(selectedMarker), {
        duration: 220,
      });

      if (map.getZoom() < 14) {
        map.setZoom(14, {
          duration: 220,
        });
      }

      return;
    }

    if (fitBounds && (markers.length > 1 || (markers.length > 0 && userLocation))) {
      const bounds = buildBounds([
        ...markers,
        ...(userLocation ? [userLocation] : []),
      ]);

      if (
        bounds &&
        (bounds[0][0] !== bounds[1][0] || bounds[0][1] !== bounds[1][1])
      ) {
        void map.setBounds(bounds, {
          checkZoomRange: true,
          duration: 240,
          zoomMargin: [56, 56, 56, 56],
        });
        return;
      }
    }

    if (userLocation) {
      map.setCenter(toYandexCoordinates(userLocation), 12, {
        duration: 220,
      });
      return;
    }

    map.setCenter(toYandexCoordinates(center), zoom, {
      duration: 220,
    });
  }, [center, fitBounds, markers, selectedMarker, userLocation, zoom]);

  useEffect(() => {
    const map = mapRef.current;

    if (!api || !isLoaded || !map) {
      return;
    }

    propertyMarkerBindingsRef.current.forEach(({ marker, handler }) => {
      marker.events.remove('click', handler);
      map.geoObjects.remove(marker);
    });
    propertyMarkerBindingsRef.current = [];

    if (!propertyMarkerLayoutRef.current) {
      propertyMarkerLayoutRef.current = api.templateLayoutFactory.createClass('$[properties.markerHtml]');
    }

    markers.forEach((marker) => {
      const { width, height } = getPropertyMarkerLayoutMetrics(marker);
      const placemark = new api.Placemark(
        toYandexCoordinates(marker),
        {
          markerHtml: createPropertyMarkerHtml({
            marker,
            theme,
            selected: marker.id === highlightedMarkerId,
          }),
        },
        {
          iconLayout: propertyMarkerLayoutRef.current,
          iconOffset: [-Math.round(width / 2), -height],
          iconShape: createPropertyMarkerIconShape(marker),
          cursor: 'pointer',
          zIndex: marker.id === highlightedMarkerId ? 2500 : 1200,
        }
      );

      const handleMarkerClick = () => {
        setActiveMarkerId(marker.id);
        onMarkerClick?.(marker);
      };

      placemark.events.add('click', handleMarkerClick as (event: YMapsEvent) => void);
      map.geoObjects.add(placemark);
      propertyMarkerBindingsRef.current.push({
        marker: placemark,
        handler: handleMarkerClick as (event: YMapsEvent) => void,
      });
    });

    return () => {
      propertyMarkerBindingsRef.current.forEach(({ marker, handler }) => {
        marker.events.remove('click', handler);
        map.geoObjects.remove(marker);
      });
      propertyMarkerBindingsRef.current = [];
    };
  }, [api, highlightedMarkerId, isLoaded, markers, onMarkerClick, theme]);

  useEffect(() => {
    const map = mapRef.current;

    if (!api || !isLoaded || !map) {
      return;
    }

    if (userLocationMarkerRef.current) {
      map.geoObjects.remove(userLocationMarkerRef.current);
      userLocationMarkerRef.current = null;
    }

    if (radiusCircleRef.current) {
      map.geoObjects.remove(radiusCircleRef.current);
      radiusCircleRef.current = null;
    }

    if (!userLocation) {
      return;
    }

    if (!userMarkerLayoutRef.current) {
      userMarkerLayoutRef.current = api.templateLayoutFactory.createClass('$[properties.markerHtml]');
    }

    userLocationMarkerRef.current = new api.Placemark(
      toYandexCoordinates(userLocation),
      {
        markerHtml: createUserLocationMarkerHtml(theme, userLocationLabel),
      },
      {
        iconLayout: userMarkerLayoutRef.current,
        zIndex: 3000,
      }
    );
    map.geoObjects.add(userLocationMarkerRef.current);

    if (nearbyRadiusKm) {
      radiusCircleRef.current = new api.Circle(
        [toYandexCoordinates(userLocation), nearbyRadiusKm * 1000],
        {},
        {
          fillColor: '#0b48d6',
          fillOpacity: theme === 'dark' ? 0.12 : 0.08,
          strokeColor: '#0b48d6',
          strokeOpacity: 0.45,
          strokeWidth: 2,
          zIndex: 900,
        }
      );
      map.geoObjects.add(radiusCircleRef.current);
    }
  }, [api, isLoaded, nearbyRadiusKm, theme, userLocation, userLocationLabel]);

  if (!hasYandexMapsApiKey()) {
    return (
      <div
        id={containerId || mapShellId}
        ref={shellRef}
        className={cn('map-shell', className)}
        style={containerStyle}
      >
        <div className="flex h-full items-center justify-center rounded-[inherit] bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {copy.apiKeyMissing}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        id={containerId || mapShellId}
        ref={shellRef}
        className={cn('map-shell', className)}
        style={containerStyle}
      >
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
        id={containerId || mapShellId}
        ref={shellRef}
        className={cn('map-shell animate-pulse', className)}
        style={containerStyle}
      >
        <div className="h-full w-full rounded-[inherit] bg-muted/60" />
      </div>
    );
  }

  return (
    <div
      id={containerId || mapShellId}
      ref={shellRef}
      className={cn('map-shell', className)}
      style={containerStyle}
    >
      <div ref={canvasRef} className="yandex-map-canvas h-full w-full" />

      {selectedMarker ? (
        <div className="marketplace-map-preview">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full border border-border/70 bg-background/92 shadow-sm backdrop-blur"
            aria-label={copy.close}
            onClick={() => {
              setActiveMarkerId(null);
              onMarkerClose?.();
            }}
          >
            <X className="h-4 w-4" />
          </Button>

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
      ) : null}
    </div>
  );
}

export default memo(YandexMapComponent);
