import { REAL_ESTATE_DEFAULT_CENTER } from '@/lib/mock-data';
import type { Location, PropertyMarker, ResolvedLocation } from '@/lib/map-types';
import type { ThemeMode } from '@/lib/theme';
import type { RealEstatePropertyType } from '@/lib/types';

type YandexAddressComponent = {
  kind?: string;
  name?: string;
};

const PROPERTY_TYPE_ACCENT: Record<RealEstatePropertyType | '', string> = {
  apartment: '#2563eb',
  house: '#0f766e',
  land: '#ea580c',
  commercial: '#a16207',
  '': '#2563eb',
};

export const YANDEX_MAPS_DEFAULT_CENTER = REAL_ESTATE_DEFAULT_CENTER;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeLocation(point: Location): Location {
  return {
    lat: Number(point.lat.toFixed(6)),
    lng: Number(point.lng.toFixed(6)),
  };
}

export function toYandexCoordinates(point: Location): YandexMapCoords {
  return [point.lat, point.lng];
}

export function fromYandexCoordinates(coordinates: YandexMapCoords): Location {
  return normalizeLocation({
    lat: coordinates[0],
    lng: coordinates[1],
  });
}

function getAddressComponents(geoObject: YMapsGeocodeGeoObject) {
  const components = geoObject.properties.get<unknown>('metaDataProperty.GeocoderMetaData.Address.Components');

  if (!Array.isArray(components)) {
    return [];
  }

  return components.filter((component): component is YandexAddressComponent => {
    return typeof component === 'object' && component !== null;
  });
}

function getAddressComponent(components: YandexAddressComponent[], candidateKinds: string[]) {
  return (
    components.find((component) => {
      return component.kind ? candidateKinds.includes(component.kind) : false;
    })?.name?.trim() || ''
  );
}

function buildLocationParts(geoObject: YMapsGeocodeGeoObject) {
  const components = getAddressComponents(geoObject);
  const localities = geoObject.getLocalities?.() || [];
  const administrativeAreas = geoObject.getAdministrativeAreas?.() || [];
  const city =
    getAddressComponent(components, ['locality']) ||
    localities[0]?.trim() ||
    getAddressComponent(components, ['province', 'area']) ||
    administrativeAreas[0]?.trim() ||
    '';
  const district =
    getAddressComponent(components, ['district']) ||
    getAddressComponent(components, ['area']) ||
    administrativeAreas[1]?.trim() ||
    administrativeAreas[0]?.trim() ||
    city;
  const country = getAddressComponent(components, ['country']) || geoObject.getCountry?.()?.trim() || '';

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

export function parseYandexGeoObject(geoObject: YMapsGeocodeGeoObject): ResolvedLocation {
  const point = fromYandexCoordinates(geoObject.geometry.getCoordinates());
  const formattedAddress =
    geoObject.getAddressLine?.()?.trim() ||
    geoObject.properties.get<string>('text')?.trim() ||
    geoObject.properties.get<string>('name')?.trim() ||
    '';
  const title =
    geoObject.properties.get<string>('name')?.trim() ||
    geoObject.getThoroughfare?.()?.trim() ||
    formattedAddress;
  const description =
    geoObject.properties.get<string>('description')?.trim() ||
    geoObject.getPremise?.()?.trim() ||
    formattedAddress;
  const { city, district, country } = buildLocationParts(geoObject);
  const placeId =
    geoObject.properties.get<string>('metaDataProperty.GeocoderMetaData.id')?.trim() ||
    `${point.lat},${point.lng}`;

  return {
    placeId,
    title,
    description,
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

function getFirstGeoObject(response: YMapsGeocodeResponse) {
  const first = response.geoObjects.get(0);

  if (!first) {
    throw new Error('Address not found.');
  }

  return first;
}

export async function geocodeAddressByQuery(api: YMapsApi, query: string) {
  const response = await api.geocode(query, {
    results: 1,
  });

  return parseYandexGeoObject(getFirstGeoObject(response));
}

export async function reverseGeocodeCoordinates(api: YMapsApi, point: Location) {
  const response = await api.geocode(toYandexCoordinates(point), {
    kind: 'house',
    results: 1,
  });

  return parseYandexGeoObject(getFirstGeoObject(response));
}

export async function searchAddressSuggestions(api: YMapsApi, query: string, limit = 5) {
  const response = await api.geocode(query, {
    results: Math.max(1, limit),
  });

  const results: ResolvedLocation[] = [];
  response.geoObjects.each((geoObject) => {
    results.push(parseYandexGeoObject(geoObject));
  });

  return results.filter((result, index, collection) => {
    return collection.findIndex((candidate) => candidate.placeId === result.placeId) === index;
  });
}

export function buildBounds(points: Location[]) {
  if (points.length === 0) {
    return null;
  }

  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);

  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ] as YandexMapBounds;
}

function buildMarkerLabel({
  marker,
  theme,
  selected,
}: {
  marker: PropertyMarker;
  theme: ThemeMode;
  selected: boolean;
}) {
  if (marker.customMarkerContent) {
    return marker.customMarkerContent;
  }

  if (marker.icon) {
    return `
      <div style="display:flex;align-items:center;justify-content:center;width:3rem;height:3rem;border-radius:999px;background:${theme === 'dark' ? 'rgba(14,22,41,0.96)' : 'rgba(255,255,255,0.97)'};box-shadow:${selected ? '0 18px 30px rgba(11,72,214,0.3)' : '0 12px 24px rgba(15,23,42,0.18)'};border:2px solid ${selected ? '#0b48d6' : theme === 'dark' ? 'rgba(226,232,240,0.68)' : 'rgba(226,232,240,0.9)'};">
        <img src="${escapeHtml(marker.icon)}" alt="" style="width:2rem;height:2rem;object-fit:contain;" />
      </div>
    `.trim();
  }

  const accent = selected ? '#0b48d6' : PROPERTY_TYPE_ACCENT[marker.propertyType || ''];
  const label = escapeHtml(marker.priceLabel || marker.title);

  return `
    <div style="display:inline-flex;max-width:10.5rem;align-items:center;justify-content:center;border-radius:999px;background:${accent};padding:0.6rem 0.85rem;color:#fff;font:800 13px/1.1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:-0.01em;box-shadow:${selected ? '0 18px 32px rgba(11,72,214,0.34)' : '0 12px 22px rgba(15,23,42,0.24)'};border:3px solid ${theme === 'dark' ? '#f8fafc' : '#ffffff'};">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${label}</span>
    </div>
    <div style="margin:-0.05rem auto 0;height:0;width:0;border-left:0.6rem solid transparent;border-right:0.6rem solid transparent;border-top:0.8rem solid ${accent};filter:drop-shadow(0 5px 8px rgba(15,23,42,0.18));"></div>
  `.trim();
}

export function createPropertyMarkerHtml({
  marker,
  theme,
  selected,
}: {
  marker: PropertyMarker;
  theme: ThemeMode;
  selected: boolean;
}) {
  return `
    <div style="position:relative;display:grid;justify-items:center;transform:translate(-50%,calc(-100% + 0.35rem));pointer-events:auto;">
      ${buildMarkerLabel({ marker, theme, selected })}
    </div>
  `.trim();
}

export function createUserLocationMarkerHtml(theme: ThemeMode, label = '') {
  const borderColor = theme === 'dark' ? '#e2e8f0' : '#ffffff';
  const shadow = theme === 'dark' ? '0 0 0 8px rgba(59,130,246,0.2)' : '0 0 0 8px rgba(59,130,246,0.16)';

  return `
    <div aria-label="${escapeHtml(label)}" style="position:relative;transform:translate(-50%,-50%);pointer-events:none;">
      <div style="width:18px;height:18px;border-radius:999px;background:#2563eb;border:3px solid ${borderColor};box-shadow:${shadow};"></div>
    </div>
  `.trim();
}
