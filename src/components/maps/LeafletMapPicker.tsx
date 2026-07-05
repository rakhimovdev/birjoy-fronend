'use client';

import dynamic from 'next/dynamic';

type MapPoint = {
  lat: number;
  lng: number;
};

const LeafletMapPickerClient = dynamic(() => import('./LeafletMapPickerClient'), {
  ssr: false,
  loading: () => (
    <div className="leaflet-map-shell animate-pulse">
      <div className="h-full w-full rounded-[inherit] bg-muted/60" />
    </div>
  ),
});

export function LeafletMapPicker(props: {
  value: MapPoint | null;
  onChange: (point: MapPoint) => void;
}) {
  return <LeafletMapPickerClient {...props} />;
}
