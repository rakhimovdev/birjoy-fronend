import type { AreaUnit, RealEstatePropertyType } from '@/lib/types';

export interface Location {
  lat: number;
  lng: number;
}

export interface AutocompleteResult {
  placeId: string;
  title: string;
  description: string;
  formattedAddress: string;
  location: Location;
  city: string;
  district: string;
  country: string;
}

export interface PropertyMarker extends Location {
  id: string;
  title: string;
  price?: number;
  priceLabel?: string;
  image?: string;
  address?: string;
  district?: string;
  rooms?: number | null;
  area?: number | null;
  areaUnit?: AreaUnit;
  href?: string;
  propertyType?: RealEstatePropertyType | '';
  icon?: string;
  customMarkerContent?: string;
}

export interface MapProps {
  center: Location;
  zoom?: number;
  markers?: PropertyMarker[];
  onClick?: (location: Location) => void;
  onMarkerClick?: (marker: PropertyMarker) => void;
  onMarkerClose?: () => void;
  height?: number | string;
  className?: string;
  fitBounds?: boolean;
  selectedMarkerId?: string;
  userLocation?: Location | null;
  userLocationLabel?: string;
  nearbyRadiusKm?: number;
}

export interface ResolvedLocation extends AutocompleteResult {
  address: string;
  locationHint: string;
}
