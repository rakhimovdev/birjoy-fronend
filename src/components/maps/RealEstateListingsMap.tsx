'use client';

import dynamic from 'next/dynamic';
import type { Ad } from '@/lib/types';
import type { Language } from '@/lib/i18n';
import type { Location } from '@/lib/map-types';

const RealEstateListingsMapClient = dynamic(() => import('./RealEstateListingsMapClient'), {
  ssr: false,
  loading: () => (
    <div id="google-property-map" className="map-shell google-property-map-shell animate-pulse">
      <div className="h-full w-full rounded-[inherit] bg-muted/60" />
    </div>
  ),
});

export function RealEstateListingsMap(props: {
  ads: Ad[];
  locale: Language;
  selectedAdId?: string;
  onSelectAd: (adId: string) => void;
  userLocation?: Location | null;
  userLocationLabel: string;
  nearbyRadiusKm: number;
  popupActionLabel: string;
  isVisible: boolean;
  mapClassName?: string;
  mapHeight?: number | string;
}) {
  return <RealEstateListingsMapClient {...props} />;
}
