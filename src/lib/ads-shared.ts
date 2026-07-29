import type { LocalizedText } from '@/lib/i18n';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Ad, AdVertical, RealEstateListingType, RealEstatePropertyType } from '@/lib/types';
import { isRealEstateListingType } from '@/lib/real-estate-listing-types';

export type AdCondition = 'new' | 'like-new' | 'used' | 'needs-repair';

export type RemoteAd = {
  id?: string;
  _id?: string;
  title?: string | LocalizedText;
  description?: string | LocalizedText;
  price?:
    | number
    | string
    | {
        amount?: number | string;
        value?: number | string;
        price?: number | string;
        usd?: number | string;
        uzs?: number | string;
      };
  category?: string;
  vertical?: string;
  condition?: string;
  location?: string | LocalizedText;
  address?: string | LocalizedText;
  formattedAddress?: string | LocalizedText;
  city?: string | LocalizedText;
  district?: string | LocalizedText;
  country?: string | LocalizedText;
  latitude?: number | null;
  longitude?: number | null;
  propertyType?: string;
  listingType?: string;
  rooms?: number | null;
  area?: number | null;
  floor?: number | null;
  images?: Array<string | { url?: string; fileId?: string; name?: string; thumbnailUrl?: string }>;
  imageUrl?: string;
  imageUrls?: string[];
  primaryImageUrl?: string;
  thumbnailUrl?: string;
  userId?: string;
  userName?: string;
  sellerName?: string;
  sellerPhone?: string;
  contactPhone?: string;
  createdAt?: string;
  updatedAt?: string;
  isFeatured?: boolean;
  viewCount?: number;
  contactCount?: number;
  status?: string;
};

export type AdsApiResponse = {
  ad?: RemoteAd;
  ads?: RemoteAd[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
  message?: string;
};

function toLocalizedText(value: string): LocalizedText {
  return {
    uz: value,
    ru: value,
    en: value,
  };
}

function normalizeText(value: string | LocalizedText | undefined, fallback = ''): LocalizedText {
  if (!value) {
    return toLocalizedText(fallback);
  }

  if (typeof value === 'string') {
    return toLocalizedText(value);
  }

  return {
    uz: value.uz || value.en || fallback,
    ru: value.ru || value.en || fallback,
    en: value.en || value.uz || value.ru || fallback,
  };
}

function normalizeCondition(value: string | undefined): AdCondition {
  if (value === 'new' || value === 'like-new' || value === 'used' || value === 'needs-repair') {
    return value;
  }

  return 'used';
}

function normalizeVertical(value: string | undefined): AdVertical {
  if (value === 'market' || value === 'real_estate' || value === 'food' || value === 'auto') {
    return value;
  }

  return 'market';
}

function normalizePropertyType(value: string | undefined): RealEstatePropertyType | '' {
  if (value === 'apartment' || value === 'house' || value === 'land' || value === 'commercial') {
    return value;
  }

  return '';
}

function normalizeListingType(value: string | undefined): RealEstateListingType | '' {
  if (isRealEstateListingType(value)) {
    return value;
  }

  return '';
}

function normalizeStatus(value: string | undefined): Ad['status'] {
  if (value === 'active' || value === 'pending' || value === 'flagged' || value === 'sold') {
    return value;
  }

  return 'active';
}

function getFallbackImage() {
  return PlaceHolderImages[1]?.imageUrl || PlaceHolderImages[0]?.imageUrl || '';
}

function normalizeNullableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeCounter(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizePrice(value: RemoteAd['price']): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  if (value && typeof value === 'object') {
    return (
      normalizePrice(value.amount) ||
      normalizePrice(value.value) ||
      normalizePrice(value.price) ||
      normalizePrice(value.usd) ||
      normalizePrice(value.uzs)
    );
  }

  return 0;
}

function normalizeSingleImageUrl(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeImageUrls(
  images: RemoteAd['images'],
  fallbackImages: Array<string | undefined> = []
) {
  const imageUrls = Array.isArray(images)
    ? images
        .map((image) => {
          if (typeof image === 'string') {
            return image.trim();
          }

          if (image && typeof image.url === 'string') {
            return image.url.trim();
          }

          return '';
        })
        .filter(Boolean)
    : [];

  const fallbackUrls = fallbackImages.map(normalizeSingleImageUrl).filter(Boolean);

  return [...new Set([...imageUrls, ...fallbackUrls])];
}

export function normalizeRemoteAd(ad: RemoteAd): Ad {
  const imageUrls = normalizeImageUrls(ad.images, [
    ad.primaryImageUrl,
    ad.imageUrl,
    ...(Array.isArray(ad.imageUrls) ? ad.imageUrls : []),
    ad.thumbnailUrl,
  ]);

  return {
    id: ad.id || ad._id || '',
    title: normalizeText(ad.title, ''),
    description: normalizeText(ad.description, ''),
    price: normalizePrice(ad.price),
    category: ad.category || (normalizeVertical(ad.vertical) === 'real_estate' ? normalizePropertyType(ad.propertyType) : ''),
    vertical: normalizeVertical(ad.vertical),
    condition: normalizeCondition(ad.condition),
    location: normalizeText(ad.location || ad.address, ''),
    address: normalizeText(ad.address || ad.location, ''),
    formattedAddress: normalizeText(ad.formattedAddress || ad.address || ad.location, ''),
    city: normalizeText(ad.city, ''),
    district: normalizeText(ad.district, ''),
    country: normalizeText(ad.country, ''),
    latitude: normalizeNullableNumber(ad.latitude),
    longitude: normalizeNullableNumber(ad.longitude),
    propertyType: normalizePropertyType(ad.propertyType),
    listingType: normalizeListingType(ad.listingType),
    rooms: normalizeNullableNumber(ad.rooms),
    area: normalizeNullableNumber(ad.area),
    floor: normalizeNullableNumber(ad.floor),
    images: imageUrls.length > 0 ? imageUrls : [getFallbackImage()],
    userId: ad.userId || '',
    userName: ad.userName || ad.sellerName || '',
    sellerPhone: ad.sellerPhone || ad.contactPhone || '',
    createdAt: ad.createdAt || new Date().toISOString(),
    isFeatured: Boolean(ad.isFeatured),
    viewCount: normalizeCounter(ad.viewCount),
    contactCount: normalizeCounter(ad.contactCount),
    status: normalizeStatus(ad.status),
  };
}
