'use client';

import dynamic from 'next/dynamic';
import type { Language } from '@/lib/i18n';
import type { Location, ResolvedLocation } from '@/lib/map-types';

export type GoogleLocationPickerCopy = {
  mapTitle: string;
  mapDescription: string;
  address: string;
  addressPlaceholder: string;
  searchAddress: string;
  searchAddressPending: string;
  locationHint: string;
  locationHintPlaceholder: string;
  mapRequiredHint: string;
  selectedPoint: string;
  notSelected: string;
  myLocation: string;
  myLocationPending: string;
  geolocationDenied: string;
  geolocationUnsupported: string;
  geolocationError: string;
  apiKeyMissing: string;
  mapError: string;
  retry: string;
};

const GoogleLocationPickerClient = dynamic(() => import('./GoogleLocationPickerClient'), {
  ssr: false,
  loading: () => (
    <div className="map-shell animate-pulse">
      <div className="h-full w-full rounded-[inherit] bg-muted/60" />
    </div>
  ),
});

export function GoogleLocationPicker(props: {
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
  return <GoogleLocationPickerClient {...props} />;
}
