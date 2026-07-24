'use client';

import dynamic from 'next/dynamic';
import type { Language } from '@/lib/i18n';
import type { Location, ResolvedLocation } from '@/lib/map-types';

export type YandexLocationPickerCopy = {
  mapTitle: string;
  mapDescription: string;
  regionLabel: string;
  regionPlaceholder: string;
  districtLabel: string;
  districtPlaceholder: string;
  streetAddressLabel: string;
  streetAddressPlaceholder: string;
  searchAddress: string;
  searchAddressPending: string;
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

const YandexLocationPickerClient = dynamic(() => import('./YandexLocationPickerClient'), {
  ssr: false,
  loading: () => (
    <div className="map-shell animate-pulse">
      <div className="h-full w-full rounded-[inherit] bg-muted/60" />
    </div>
  ),
});

export function YandexLocationPicker(props: {
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
  return <YandexLocationPickerClient {...props} />;
}
