import type { Libraries } from '@react-google-maps/api';
import type { Language } from '@/lib/i18n';
import { REAL_ESTATE_DEFAULT_CENTER } from '@/lib/mock-data';
import type { Location, ResolvedLocation } from '@/lib/map-types';
import type { ThemeMode } from '@/lib/theme';
import type { RealEstatePropertyType } from '@/lib/types';

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
// Advanced markers require the marker library and a map ID.
export const GOOGLE_MAPS_API_VERSION = 'beta';
export const GOOGLE_MAPS_LIBRARIES: Libraries = ['places', 'marker'];
export const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || 'DEMO_MAP_ID';
export const GOOGLE_MAPS_DEFAULT_CENTER = REAL_ESTATE_DEFAULT_CENTER;

const PROPERTY_TYPE_ACCENT: Record<RealEstatePropertyType | '', string> = {
  apartment: '#2563eb',
  house: '#0f766e',
  land: '#ea580c',
  commercial: '#a16207',
  '': '#2563eb',
};

export const GOOGLE_DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5f5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1220' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#22314f' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#131f35' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f2f2d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2640' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#22314f' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#24448a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#16223b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#102b4c' }] },
];

export function hasGoogleMapsApiKey() {
  return GOOGLE_MAPS_API_KEY.trim().length > 0;
}

export function getGoogleMapsLanguage(locale: Language) {
  if (locale === 'ru') {
    return 'ru';
  }

  if (locale === 'uz') {
    return 'uz';
  }

  return 'en';
}

function normalizeLocation(point: Location): Location {
  return {
    lat: Number(point.lat.toFixed(6)),
    lng: Number(point.lng.toFixed(6)),
  };
}

function getAddressComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  candidateTypes: string[]
) {
  if (!components || components.length === 0) {
    return '';
  }

  const match = components.find((component) =>
    candidateTypes.some((candidateType) => component.types.includes(candidateType))
  );

  return match?.long_name?.trim() || '';
}

function buildLocationParts(components: google.maps.GeocoderAddressComponent[] | undefined) {
  const city =
    getAddressComponent(components, ['locality']) ||
    getAddressComponent(components, ['administrative_area_level_2']) ||
    getAddressComponent(components, ['administrative_area_level_1']);
  const district =
    getAddressComponent(components, ['sublocality_level_1']) ||
    getAddressComponent(components, ['sublocality']) ||
    getAddressComponent(components, ['neighborhood']) ||
    getAddressComponent(components, ['administrative_area_level_2']);
  const country = getAddressComponent(components, ['country']);

  return {
    city,
    district,
    country,
  };
}

export function buildLocationHint(result: {
  district?: string;
  city?: string;
  formattedAddress?: string;
  address?: string;
}) {
  return result.district || result.city || result.formattedAddress || result.address || '';
}

export function parseGeocoderResult(result: google.maps.GeocoderResult): ResolvedLocation {
  const point = normalizeLocation({
    lat: result.geometry.location.lat(),
    lng: result.geometry.location.lng(),
  });
  const formattedAddress = result.formatted_address?.trim() || '';
  const { city, district, country } = buildLocationParts(result.address_components);

  return {
    placeId: result.place_id || `${point.lat},${point.lng}`,
    title: result.address_components?.[0]?.long_name?.trim() || formattedAddress,
    description: formattedAddress,
    formattedAddress,
    address: formattedAddress,
    location: point,
    locationHint: buildLocationHint({
      district,
      city,
      formattedAddress,
    }),
    city,
    district,
    country,
  };
}

export function parsePlaceResult(place: google.maps.places.PlaceResult): ResolvedLocation {
  const location = place.geometry?.location;

  if (!location) {
    throw new Error('Selected place does not include map coordinates.');
  }

  const point = normalizeLocation({
    lat: location.lat(),
    lng: location.lng(),
  });
  const formattedAddress = place.formatted_address?.trim() || place.name?.trim() || '';
  const { city, district, country } = buildLocationParts(place.address_components);

  return {
    placeId: place.place_id || `${point.lat},${point.lng}`,
    title: place.name?.trim() || formattedAddress,
    description: formattedAddress,
    formattedAddress,
    address: formattedAddress,
    location: point,
    locationHint: buildLocationHint({
      district,
      city,
      formattedAddress,
    }),
    city,
    district,
    country,
  };
}

export async function geocodeAddressByQuery(
  geocoder: google.maps.Geocoder,
  query: string
): Promise<ResolvedLocation> {
  const response = await geocoder.geocode({
    address: query,
  });
  const result = response.results[0];

  if (!result) {
    throw new Error('Address not found.');
  }

  return parseGeocoderResult(result);
}

export async function reverseGeocodeCoordinates(
  geocoder: google.maps.Geocoder,
  point: Location
): Promise<ResolvedLocation> {
  const response = await geocoder.geocode({
    location: point,
  });
  const result = response.results[0];

  if (!result) {
    throw new Error('Address could not be resolved.');
  }

  return parseGeocoderResult(result);
}

function escapeSvgText(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createSvgContentNode(svg: string) {
  const template = document.createElement('template');
  template.innerHTML = svg.trim();

  return template.content.firstElementChild;
}

export function createPropertyMarkerContent(
  {
    label,
    propertyType = '',
    selected = false,
    theme,
  }: {
    label: string;
    propertyType?: RealEstatePropertyType | '';
    selected?: boolean;
    theme: ThemeMode;
  }
) {
  const accent = selected ? '#0b48d6' : PROPERTY_TYPE_ACCENT[propertyType];
  const stroke = theme === 'dark' ? '#f8fafc' : '#ffffff';
  const textColor = '#ffffff';
  const width = Math.max(92, Math.min(168, 38 + label.length * 8));
  const bubbleHeight = 36;
  const pointerHeight = 10;
  const totalHeight = bubbleHeight + pointerHeight;
  const pointerCenter = width / 2;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
      <rect x="2" y="2" width="${width - 4}" height="${bubbleHeight}" rx="18" fill="${accent}" stroke="${stroke}" stroke-width="3" />
      <path d="M ${pointerCenter - 10} ${bubbleHeight - 1} L ${pointerCenter} ${totalHeight - 2} L ${pointerCenter + 10} ${bubbleHeight - 1} Z" fill="${accent}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" />
      <text x="50%" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="${textColor}">
        ${escapeSvgText(label)}
      </text>
    </svg>
  `.trim();

  const content = createSvgContentNode(svg);

  if (!content) {
    throw new Error('Property marker SVG could not be created.');
  }

  if (content instanceof SVGElement) {
    content.style.overflow = 'visible';
    content.style.filter = selected
      ? 'drop-shadow(0 14px 18px rgba(11, 72, 214, 0.34))'
      : 'drop-shadow(0 10px 14px rgba(15, 23, 42, 0.24))';
  }

  return content;
}

export function createUserLocationMarkerContent(theme: ThemeMode) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '18px';
  wrapper.style.height = '9px';
  wrapper.style.overflow = 'visible';

  const dot = document.createElement('div');
  dot.style.position = 'absolute';
  dot.style.left = '0';
  dot.style.top = '0';
  dot.style.width = '18px';
  dot.style.height = '18px';
  dot.style.borderRadius = '999px';
  dot.style.background = '#0b48d6';
  dot.style.border = `3px solid ${theme === 'dark' ? '#f8fafc' : '#ffffff'}`;
  dot.style.boxShadow =
    theme === 'dark'
      ? '0 0 0 6px rgba(11, 72, 214, 0.18)'
      : '0 0 0 6px rgba(11, 72, 214, 0.14)';

  wrapper.append(dot);

  return wrapper;
}
