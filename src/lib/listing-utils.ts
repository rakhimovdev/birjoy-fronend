import type { Ad, AdVertical } from '@/lib/types';
import { getCategoryBySlug } from '@/lib/mock-data';

function flattenLocalizedText(
  value:
    | Ad['title']
    | Ad['description']
    | Ad['location']
    | Ad['address']
    | Ad['formattedAddress']
    | Ad['city']
    | Ad['district']
    | Ad['country']
) {
  return [value.uz, value.ru, value.en].filter(Boolean);
}

export function isAdInVertical(ad: Ad, vertical: AdVertical) {
  return ad.vertical === vertical;
}

export function getAdDisplayLocation(ad: Ad) {
  return ad.vertical === 'real_estate'
    ? ad.formattedAddress.uz || ad.formattedAddress.ru || ad.formattedAddress.en
      ? ad.formattedAddress
      : ad.address
    : ad.location;
}

export function filterAds(
  ads: Ad[],
  options: {
    vertical?: AdVertical;
    category?: string | null;
    query?: string | null;
  }
) {
  const query = options.query?.trim().toLowerCase() || '';

  return ads.filter((ad) => {
    if (options.vertical && !isAdInVertical(ad, options.vertical)) {
      return false;
    }

    if (options.category && ad.category !== options.category) {
      return false;
    }

    if (!query) {
      return true;
    }

    const category = getCategoryBySlug(ad.category);
    const searchableValues = [
      ...flattenLocalizedText(ad.title),
      ...flattenLocalizedText(ad.description),
      ...flattenLocalizedText(ad.location),
      ...flattenLocalizedText(ad.address),
      ...flattenLocalizedText(ad.formattedAddress),
      ...flattenLocalizedText(ad.city),
      ...flattenLocalizedText(ad.district),
      ...flattenLocalizedText(ad.country),
      ad.userName,
      ad.sellerPhone,
      ad.propertyType,
      ad.listingType,
      ...(category ? Object.values(category.name) : []),
      ad.rooms !== null ? String(ad.rooms) : '',
      ad.area !== null ? String(ad.area) : '',
      ad.floor !== null ? String(ad.floor) : '',
    ];

    return searchableValues.some((value) => value.toLowerCase().includes(query));
  });
}
