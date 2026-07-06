'use client';

import {
  Autocomplete,
  GoogleMap as GoogleMapCanvas,
  MarkerF,
  useJsApiLoader,
} from '@react-google-maps/api';
import { AlertCircle, Loader2, LocateFixed, MapPinned, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GOOGLE_DARK_MAP_STYLES,
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_DEFAULT_CENTER,
  GOOGLE_MAPS_LIBRARIES,
  createUserLocationIcon,
  geocodeAddressByQuery,
  getGoogleMapsLanguage,
  hasGoogleMapsApiKey,
  parsePlaceResult,
  reverseGeocodeCoordinates,
} from '@/lib/google-maps';
import type { Location, ResolvedLocation } from '@/lib/map-types';
import type { Language } from '@/lib/i18n';
import type { GoogleLocationPickerCopy } from './GoogleLocationPicker';

type GeolocationState = 'idle' | 'loading' | 'denied' | 'unsupported' | 'error';

export default function GoogleLocationPickerClient({
  value,
  address,
  locationHint,
  locale,
  copy,
  onChange,
  onAddressChange,
  onLocationHintChange,
  onResolvedLocationChange,
}: {
  value: Location | null;
  address: string;
  locationHint: string;
  locale: Language;
  copy: GoogleLocationPickerCopy;
  onChange: (point: Location) => void;
  onAddressChange: (value: string) => void;
  onLocationHintChange: (value: string) => void;
  onResolvedLocationChange: (value: ResolvedLocation) => void;
}) {
  const { theme } = useTheme();
  const [loaderNonce, setLoaderNonce] = useState(0);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [geolocationState, setGeolocationState] = useState<GeolocationState>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: `google-location-picker-${locale}-${loaderNonce}`,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: getGoogleMapsLanguage(locale),
    region: 'UZ',
  });

  const center = value || GOOGLE_MAPS_DEFAULT_CENTER;

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      clickableIcons: false,
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

  const ensureGeocoder = useCallback(() => {
    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }

    return geocoderRef.current;
  }, []);

  const applyResolvedLocation = useCallback(
    (resolved: ResolvedLocation) => {
      setSearchError(null);
      onChange(resolved.location);
      onResolvedLocationChange(resolved);
      onAddressChange(resolved.formattedAddress || resolved.address);

      if (resolved.locationHint) {
        onLocationHintChange(resolved.locationHint);
      }

      if (mapRef.current) {
        mapRef.current.panTo(resolved.location);
        mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 0, 16));
      }
    },
    [onAddressChange, onChange, onLocationHintChange, onResolvedLocationChange]
  );

  const handleAddressSearch = useCallback(async () => {
    if (!isLoaded || !address.trim()) {
      return;
    }

    setIsSearchingAddress(true);

    try {
      const resolved = await geocodeAddressByQuery(ensureGeocoder(), address.trim());
      applyResolvedLocation(resolved);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : copy.mapError);
    } finally {
      setIsSearchingAddress(false);
    }
  }, [address, applyResolvedLocation, copy.mapError, ensureGeocoder, isLoaded]);

  const handleReverseGeocode = useCallback(
    async (nextPoint: Location) => {
      if (!isLoaded) {
        return;
      }

      try {
        const resolved = await reverseGeocodeCoordinates(ensureGeocoder(), nextPoint);
        applyResolvedLocation(resolved);
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : copy.mapError);
        onChange(nextPoint);
      }
    },
    [applyResolvedLocation, copy.mapError, ensureGeocoder, isLoaded, onChange]
  );

  const handleCurrentLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeolocationState('unsupported');
      return;
    }

    setGeolocationState('loading');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPoint = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };

        setGeolocationState('idle');
        void handleReverseGeocode(nextPoint);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeolocationState('denied');
          return;
        }

        setGeolocationState('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, [handleReverseGeocode]);

  useEffect(() => {
    if (!value || !mapRef.current) {
      return;
    }

    mapRef.current.panTo(value);
  }, [value]);

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
          <Label htmlFor="address">{copy.address}</Label>
          <div className="flex flex-col gap-2 min-[640px]:flex-row">
            {isLoaded ? (
              <Autocomplete
                onLoad={(instance) => {
                  autocompleteRef.current = instance;
                }}
                onPlaceChanged={() => {
                  const place = autocompleteRef.current?.getPlace();

                  if (!place) {
                    return;
                  }

                  try {
                    applyResolvedLocation(parsePlaceResult(place));
                  } catch (error) {
                    setSearchError(error instanceof Error ? error.message : copy.mapError);
                  }
                }}
                options={{
                  fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
                }}
              >
                <Input
                  id="address"
                  placeholder={copy.addressPlaceholder}
                  value={address}
                  onChange={(event) => onAddressChange(event.target.value)}
                  required
                />
              </Autocomplete>
            ) : (
              <Input
                id="address"
                placeholder={copy.addressPlaceholder}
                value={address}
                onChange={(event) => onAddressChange(event.target.value)}
                required
              />
            )}
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0 gap-2 rounded-2xl"
              onClick={() => void handleAddressSearch()}
              disabled={isSearchingAddress || !address.trim() || !isLoaded}
            >
              {isSearchingAddress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isSearchingAddress ? copy.searchAddressPending : copy.searchAddress}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-hint">{copy.locationHint}</Label>
          <Input
            id="location-hint"
            placeholder={copy.locationHintPlaceholder}
            value={locationHint}
            onChange={(event) => onLocationHintChange(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[1.2rem] bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
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
          className="min-h-11 gap-2 rounded-2xl"
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

      {!hasGoogleMapsApiKey() ? (
        <div className="map-shell">
          <div className="flex h-full items-center justify-center rounded-[inherit] bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {copy.apiKeyMissing}
          </div>
        </div>
      ) : loadError ? (
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
          <GoogleMapCanvas
            mapContainerClassName="google-map-canvas"
            center={center}
            zoom={value ? 16 : 12}
            options={mapOptions}
            onLoad={(map) => {
              mapRef.current = map;
            }}
            onUnmount={() => {
              mapRef.current = null;
            }}
            onClick={(event) => {
              const latLng = event.latLng;

              if (!latLng) {
                return;
              }

              void handleReverseGeocode({
                lat: Number(latLng.lat().toFixed(6)),
                lng: Number(latLng.lng().toFixed(6)),
              });
            }}
          >
            {value ? (
              <MarkerF
                position={value}
                draggable
                icon={createUserLocationIcon(google, theme)}
                onDragEnd={(event) => {
                  const latLng = event.latLng;

                  if (!latLng) {
                    return;
                  }

                  void handleReverseGeocode({
                    lat: Number(latLng.lat().toFixed(6)),
                    lng: Number(latLng.lng().toFixed(6)),
                  });
                }}
              />
            ) : null}
          </GoogleMapCanvas>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-[1rem] bg-muted/40 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
