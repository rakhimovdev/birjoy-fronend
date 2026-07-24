'use client';

import { AlertCircle, Loader2, LocateFixed, MapPinned, RefreshCw, Search } from 'lucide-react';
import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { requestCurrentDeviceLocation } from '@/lib/device-location';
import { buildFullAddress, stripLocationPrefix } from '@/lib/uzbekistan-regions';
import { useYandexMaps, hasYandexMapsApiKey } from '@/lib/yandex-maps-loader';
import {
  createUserLocationMarkerHtml,
  geocodeAddressByQuery,
  reverseGeocodeCoordinates,
  searchAddressSuggestions,
  toYandexCoordinates,
  YANDEX_MAPS_DEFAULT_CENTER,
} from '@/lib/yandex-maps';
import type { Language } from '@/lib/i18n';
import type { Location, ResolvedLocation } from '@/lib/map-types';
import type { YandexLocationPickerCopy } from './YandexLocationPicker';

type GeolocationState = 'idle' | 'loading' | 'denied' | 'unsupported' | 'error';

export default function YandexLocationPickerClient({
  value,
  region,
  district,
  regions,
  districts,
  address,
  locale,
  copy,
  onChange,
  onRegionChange,
  onDistrictChange,
  onAddressChange,
  onResolvedLocationChange,
}: {
  value: Location | null;
  region: string;
  district: string;
  regions: string[];
  districts: string[];
  address: string;
  locale: Language;
  copy: YandexLocationPickerCopy;
  onChange: (point: Location) => void;
  onRegionChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onResolvedLocationChange: (value: ResolvedLocation) => void;
}) {
  const { theme } = useTheme();
  const [loaderNonce, setLoaderNonce] = useState(0);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [geolocationState, setGeolocationState] = useState<GeolocationState>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ResolvedLocation[]>([]);
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const mapRef = useRef<YMapsMap | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<YMapsPlacemark | null>(null);
  const markerDragHandlerRef = useRef<((event: YMapsEvent) => void) | null>(null);
  const markerLayoutRef = useRef<YMapsLayoutClass | null>(null);
  const mapClickHandlerRef = useRef<((event: YMapsEvent) => void) | null>(null);
  const lastResolvedAddressRef = useRef('');
  const reverseGeocodeRef = useRef<((point: Location) => Promise<void>) | null>(null);
  const searchQuery = buildFullAddress({
    region,
    district,
    addressLine: address,
  }).trim();
  const deferredAddress = useDeferredValue(searchQuery);
  const { api, error, isLoaded } = useYandexMaps(loaderNonce);
  const center = value || YANDEX_MAPS_DEFAULT_CENTER;

  const applyResolvedLocation = useCallback(
    (resolved: ResolvedLocation) => {
      const nextAddressLine = stripLocationPrefix(
        resolved.formattedAddress || resolved.address,
        region,
        district
      );

      setSearchError(null);
      setSearchResults([]);
      setSearchResultsOpen(false);
      lastResolvedAddressRef.current = buildFullAddress({
        region,
        district,
        addressLine: nextAddressLine,
      }).trim();
      onChange(resolved.location);
      onResolvedLocationChange(resolved);
      onAddressChange(nextAddressLine || resolved.formattedAddress || resolved.address);

      const map = mapRef.current;

      if (map) {
        map.setCenter(toYandexCoordinates(resolved.location), Math.max(map.getZoom(), 16), {
          duration: 220,
        });
      }
    },
    [district, onAddressChange, onChange, onResolvedLocationChange, region]
  );

  const handleReverseGeocode = useCallback(
    async (nextPoint: Location) => {
      if (!api || !isLoaded) {
        return;
      }

      try {
        const resolved = await reverseGeocodeCoordinates(api, nextPoint);
        applyResolvedLocation(resolved);
      } catch (loadError) {
        setSearchError(loadError instanceof Error ? loadError.message : copy.mapError);
        onChange(nextPoint);
      }
    },
    [api, applyResolvedLocation, copy.mapError, isLoaded, onChange]
  );

  const handleAddressSearch = useCallback(async () => {
    if (!api || !isLoaded || !searchQuery) {
      return;
    }

    setIsSearchingAddress(true);

    try {
      const resolved = await geocodeAddressByQuery(api, searchQuery);
      applyResolvedLocation(resolved);
    } catch (loadError) {
      setSearchError(loadError instanceof Error ? loadError.message : copy.mapError);
    } finally {
      setIsSearchingAddress(false);
    }
  }, [api, applyResolvedLocation, copy.mapError, isLoaded, searchQuery]);

  const handleCurrentLocation = useCallback(() => {
    setSearchError(null);
    setGeolocationState('loading');

    void requestCurrentDeviceLocation().then((result) => {
      if (result.status !== 'success') {
        setGeolocationState(result.status);
        return;
      }

      setGeolocationState('idle');
      void handleReverseGeocode(result.location);
    });
  }, [handleReverseGeocode]);

  useEffect(() => {
    reverseGeocodeRef.current = handleReverseGeocode;
  }, [handleReverseGeocode]);

  useEffect(() => {
    if (!api || !isLoaded || !canvasRef.current || mapRef.current) {
      return;
    }

    const map = new api.Map(
      canvasRef.current,
      {
        center: toYandexCoordinates(center),
        zoom: value ? 16 : 12,
        controls: ['zoomControl'],
      },
      {
        suppressMapOpenBlock: true,
      }
    );

    const handleMapClick = (event: YMapsEvent<YandexMapCoords>) => {
      const coordinates = event.get('coords');

      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return;
      }

      void reverseGeocodeRef.current?.({
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
      markerRef.current = null;
      markerDragHandlerRef.current = null;
      markerLayoutRef.current = null;
    };
  }, [api, center, isLoaded, value]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    map.setCenter(toYandexCoordinates(center), value ? 16 : 12, {
      duration: 220,
    });
  }, [center, value]);

  useEffect(() => {
    const map = mapRef.current;

    if (!api || !isLoaded || !map) {
      return;
    }

    if (markerRef.current) {
      if (markerDragHandlerRef.current) {
        markerRef.current.events.remove('dragend', markerDragHandlerRef.current);
      }

      map.geoObjects.remove(markerRef.current);
      markerRef.current = null;
      markerDragHandlerRef.current = null;
    }

    if (!value) {
      return;
    }

    if (!markerLayoutRef.current) {
      markerLayoutRef.current = api.templateLayoutFactory.createClass('$[properties.markerHtml]');
    }

    markerRef.current = new api.Placemark(
      toYandexCoordinates(value),
      {
        markerHtml: createUserLocationMarkerHtml(theme, copy.selectedPoint),
      },
      {
        draggable: true,
        iconLayout: markerLayoutRef.current,
        zIndex: 3000,
      }
    );

    const handleDragEnd = () => {
      const coordinates = markerRef.current?.geometry.getCoordinates();

      if (!coordinates) {
        return;
      }

      void handleReverseGeocode({
        lat: Number(coordinates[0].toFixed(6)),
        lng: Number(coordinates[1].toFixed(6)),
      });
    };

    markerRef.current.events.add('dragend', handleDragEnd as (event: YMapsEvent) => void);
    markerDragHandlerRef.current = handleDragEnd as (event: YMapsEvent) => void;
    map.geoObjects.add(markerRef.current);
  }, [api, copy.selectedPoint, handleReverseGeocode, isLoaded, theme, value]);

  useEffect(() => {
    if (!api || !isLoaded || deferredAddress.length < 3) {
      setSearchResults([]);
      setSearchResultsOpen(false);
      setIsFetchingSuggestions(false);
      return;
    }

    if (deferredAddress === lastResolvedAddressRef.current) {
      setSearchResults([]);
      setSearchResultsOpen(false);
      setIsFetchingSuggestions(false);
      return;
    }

    let cancelled = false;
    setIsFetchingSuggestions(true);

    const timeoutId = window.setTimeout(() => {
      void searchAddressSuggestions(api, deferredAddress, 6)
        .then((results) => {
          if (cancelled) {
            return;
          }

          startTransition(() => {
            setSearchResults(results);
            setSearchResultsOpen(results.length > 0);
          });
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          startTransition(() => {
            setSearchResults([]);
            setSearchResultsOpen(false);
          });
        })
        .finally(() => {
          if (!cancelled) {
            setIsFetchingSuggestions(false);
          }
        });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [api, deferredAddress, isLoaded]);

  useEffect(() => {
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

    if (canvasRef.current?.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [isLoaded]);

  const geolocationMessage =
    geolocationState === 'denied'
      ? copy.geolocationDenied
      : geolocationState === 'unsupported'
        ? copy.geolocationUnsupported
        : geolocationState === 'error'
          ? copy.geolocationError
          : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 min-[481px]:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`region-${locale}`}>{copy.regionLabel}</Label>
          <Select value={region} onValueChange={onRegionChange}>
            <SelectTrigger id={`region-${locale}`}>
              <SelectValue placeholder={copy.regionPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {regions.map((regionOption) => (
                <SelectItem key={regionOption} value={regionOption}>
                  {regionOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`district-${locale}`}>{copy.districtLabel}</Label>
          <Select value={district} onValueChange={onDistrictChange} disabled={!region}>
            <SelectTrigger id={`district-${locale}`}>
              <SelectValue placeholder={copy.districtPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {districts.map((districtOption) => (
                <SelectItem key={districtOption} value={districtOption}>
                  {districtOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 min-[481px]:col-span-2">
          <Label htmlFor={`address-${locale}`}>{copy.streetAddressLabel}</Label>
          <div className="flex flex-col gap-2 min-[640px]:flex-row">
            <div className="relative flex-1">
              <Input
                id={`address-${locale}`}
                placeholder={copy.streetAddressPlaceholder}
                value={address}
                onChange={(event) => {
                  const nextAddressValue = event.target.value;
                  onAddressChange(nextAddressValue);
                  if (
                    lastResolvedAddressRef.current ===
                    buildFullAddress({
                      region,
                      district,
                      addressLine: nextAddressValue,
                    }).trim()
                  ) {
                    lastResolvedAddressRef.current = '';
                  }
                  setSearchError(null);
                }}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setSearchResultsOpen(true);
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    setSearchResultsOpen(false);
                  }, 120);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleAddressSearch();
                  }
                }}
                required
              />

              {searchResultsOpen && searchResults.length > 0 ? (
                <div className="map-search-results">
                  {searchResults.map((result) => (
                    <button
                      key={result.placeId}
                      type="button"
                      className="map-search-result"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyResolvedLocation(result);
                      }}
                    >
                      <span className="map-search-result__title">{result.title}</span>
                      <span className="map-search-result__description">
                        {result.formattedAddress || result.description}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0 gap-2 rounded-2xl"
              onClick={() => void handleAddressSearch()}
              disabled={isSearchingAddress || !searchQuery || !isLoaded}
            >
              {isSearchingAddress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isSearchingAddress ? copy.searchAddressPending : copy.searchAddress}
            </Button>
          </div>

          {isFetchingSuggestions ? (
            <p className="text-xs text-muted-foreground">
              {locale === 'ru'
                ? 'Подбираем адреса...'
                : locale === 'en'
                  ? 'Finding addresses...'
                  : 'Manzillar qidirilmoqda...'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="soft-panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <MapPinned className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="font-medium text-foreground">{copy.mapTitle}</p>
            <p className="text-sm text-muted-foreground">{copy.mapDescription}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2 rounded-[1.15rem]"
          onClick={handleCurrentLocation}
          disabled={geolocationState === 'loading' || !isLoaded}
        >
          {geolocationState === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          {geolocationState === 'loading' ? copy.myLocationPending : copy.myLocation}
        </Button>
      </div>

      {!hasYandexMapsApiKey() ? (
        <div className="map-shell">
          <div className="flex h-full items-center justify-center rounded-[inherit] bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {copy.apiKeyMissing}
          </div>
        </div>
      ) : error ? (
        <div className="map-shell">
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
      ) : !isLoaded ? (
        <div className="map-shell animate-pulse">
          <div className="h-full w-full rounded-[inherit] bg-muted/60" />
        </div>
      ) : (
        <div className="map-shell">
          <div ref={canvasRef} className="yandex-map-canvas h-full w-full" />
        </div>
      )}

      <div className="soft-panel flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p>{copy.mapRequiredHint}</p>
          {geolocationMessage ? (
            <div className="inline-flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{geolocationMessage}</span>
            </div>
          ) : null}
          {searchError ? <p className="text-destructive">{searchError}</p> : null}
        </div>
        <Badge variant="outline" className="w-fit">
          {copy.selectedPoint}: {value ? `${value.lat}, ${value.lng}` : copy.notSelected}
        </Badge>
      </div>
    </div>
  );
}
