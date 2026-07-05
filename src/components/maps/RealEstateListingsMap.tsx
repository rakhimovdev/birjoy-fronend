'use client';

import dynamic from 'next/dynamic';
import type { Ad } from '@/lib/types';
import type { Language } from '@/lib/i18n';

const RealEstateListingsMapClient = dynamic(() => import('./RealEstateListingsMapClient'), {
  ssr: false,
  loading: () => (
    <div className="leaflet-map-shell animate-pulse">
      <div className="h-full w-full rounded-[inherit] bg-muted/60" />
    </div>
  ),
});

export function RealEstateListingsMap(props: {
  ads: Ad[];
  locale: Language;
  selectedAdId?: string;
  onSelectAd: (adId: string) => void;
}) {
  return <RealEstateListingsMapClient {...props} />;
}
