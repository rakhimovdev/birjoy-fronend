'use client';

import { useEffect, useMemo } from 'react';
import type { DivIcon, LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { REAL_ESTATE_DEFAULT_CENTER } from '@/lib/mock-data';

type MapPoint = {
  lat: number;
  lng: number;
};

function MapCenterController({ value }: { value: MapPoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (!value) {
      return;
    }

    map.setView([value.lat, value.lng], Math.max(map.getZoom(), 15), {
      animate: true,
    });
  }, [map, value]);

  return null;
}

function MapClickHandler({
  onChange,
}: {
  onChange: (point: MapPoint) => void;
}) {
  useMapEvents({
    click(event) {
      onChange({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function createPickerIcon() {
  return L.divIcon({
    className: 'leaflet-picker-marker-wrapper',
    html: '<span class="leaflet-picker-marker"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  }) as DivIcon;
}

export default function LeafletMapPickerClient({
  value,
  onChange,
}: {
  value: MapPoint | null;
  onChange: (point: MapPoint) => void;
}) {
  const center = value
    ? ([value.lat, value.lng] as LatLngExpression)
    : ([REAL_ESTATE_DEFAULT_CENTER.lat, REAL_ESTATE_DEFAULT_CENTER.lng] as LatLngExpression);
  const markerIcon = useMemo(() => createPickerIcon(), []);

  return (
    <div className="leaflet-map-shell">
      <MapContainer center={center} zoom={value ? 15 : 12} className="h-full w-full rounded-[inherit]">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onChange={onChange} />
        <MapCenterController value={value} />
        {value ? (
          <Marker
            draggable
            eventHandlers={{
              dragend(event) {
                const target = event.target as { getLatLng: () => { lat: number; lng: number } };
                const nextPoint = target.getLatLng();
                onChange({
                  lat: Number(nextPoint.lat.toFixed(6)),
                  lng: Number(nextPoint.lng.toFixed(6)),
                });
              },
            }}
            icon={markerIcon}
            position={[value.lat, value.lng]}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
