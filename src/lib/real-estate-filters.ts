import type { Ad } from '@/lib/types';

export type RealEstateRoomsFilter = 'any' | '1' | '2' | '3' | '4+';

export type RealEstateFilterState = {
  priceMin: string;
  priceMax: string;
  propertyType: Ad['propertyType'] | 'all';
  rooms: RealEstateRoomsFilter;
  location: string;
  city: string;
  district: string;
  areaMin: string;
  areaMax: string;
};

export const EMPTY_REAL_ESTATE_FILTERS: RealEstateFilterState = {
  priceMin: '',
  priceMax: '',
  propertyType: 'all',
  rooms: 'any',
  location: '',
  city: '',
  district: '',
  areaMin: '',
  areaMax: '',
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function localizedValuesMatch(
  value: Ad['location'] | Ad['address'] | Ad['formattedAddress'] | Ad['city'] | Ad['district'] | Ad['country'],
  query: string
) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return true;
  }

  return [value.uz, value.ru, value.en]
    .filter(Boolean)
    .some((candidate) => candidate.toLowerCase().includes(normalizedQuery));
}

function parseNumber(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const nextValue = Number(normalized);
  return Number.isFinite(nextValue) ? nextValue : null;
}

export function hasActiveRealEstateFilters(filters: RealEstateFilterState) {
  return getActiveRealEstateFilterCount(filters) > 0;
}

export function getActiveRealEstateFilterCount(filters: RealEstateFilterState) {
  return [
    filters.priceMin.trim(),
    filters.priceMax.trim(),
    filters.propertyType !== 'all' ? filters.propertyType : '',
    filters.rooms !== 'any' ? filters.rooms : '',
    filters.location.trim(),
    filters.city.trim(),
    filters.district.trim(),
    filters.areaMin.trim(),
    filters.areaMax.trim(),
  ].filter(Boolean).length;
}

export function matchesRealEstateFilters(ad: Ad, filters: RealEstateFilterState) {
  if (ad.vertical !== 'real_estate') {
    return false;
  }

  const priceMin = parseNumber(filters.priceMin);
  const priceMax = parseNumber(filters.priceMax);
  const areaMin = parseNumber(filters.areaMin);
  const areaMax = parseNumber(filters.areaMax);

  if (priceMin !== null && ad.price < priceMin) {
    return false;
  }

  if (priceMax !== null && ad.price > priceMax) {
    return false;
  }

  if (filters.propertyType !== 'all' && ad.propertyType !== filters.propertyType) {
    return false;
  }

  if (filters.rooms !== 'any') {
    if (ad.rooms === null) {
      return false;
    }

    if (filters.rooms === '4+') {
      if (ad.rooms < 4) {
        return false;
      }
    } else if (ad.rooms !== Number(filters.rooms)) {
      return false;
    }
  }

  if (areaMin !== null) {
    if (ad.area === null || ad.area < areaMin) {
      return false;
    }
  }

  if (areaMax !== null) {
    if (ad.area === null || ad.area > areaMax) {
      return false;
    }
  }

  if (filters.location.trim()) {
    const locationMatches =
      localizedValuesMatch(ad.formattedAddress, filters.location) ||
      localizedValuesMatch(ad.address, filters.location) ||
      localizedValuesMatch(ad.location, filters.location) ||
      localizedValuesMatch(ad.city, filters.location) ||
      localizedValuesMatch(ad.district, filters.location) ||
      localizedValuesMatch(ad.country, filters.location);

    if (!locationMatches) {
      return false;
    }
  }

  if (!localizedValuesMatch(ad.city, filters.city)) {
    return false;
  }

  if (!localizedValuesMatch(ad.district, filters.district)) {
    return false;
  }

  return true;
}
