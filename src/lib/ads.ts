'use client';

import { getStoredAuthToken, signOutUser } from '@/lib/auth';
import { backendApiBaseUrl, fetchWithTimeout } from '@/lib/api';
import type { UploadedAdImage } from '@/lib/imagekit-upload';
import type { LocalizedText, Language } from '@/lib/i18n';
import type { Ad, AdVertical, AreaUnit, RealEstateListingType, RealEstatePropertyType } from '@/lib/types';
import type { AdCondition, AdsApiResponse } from '@/lib/ads-shared';
import { normalizeRemoteAd } from '@/lib/ads-shared';

export type CreateAdInput = {
  title: string;
  category: string;
  vertical: AdVertical;
  price: number;
  description: string;
  location: string;
  address?: string;
  formattedAddress?: string;
  city?: string;
  district?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  propertyType?: RealEstatePropertyType | '';
  listingType?: RealEstateListingType | '';
  rooms?: number | null;
  area?: number | null;
  areaUnit?: AreaUnit;
  floor?: number | null;
  condition: AdCondition;
  contactPhone: string;
  images: UploadedAdImage[];
};

export const AD_CONDITIONS: Array<{ value: AdCondition; label: LocalizedText }> = [
  {
    value: 'new',
    label: {
      uz: 'Yangi',
      ru: 'Новый',
      en: 'New',
    },
  },
  {
    value: 'like-new',
    label: {
      uz: 'Deyarli yangi',
      ru: 'Почти новый',
      en: 'Like new',
    },
  },
  {
    value: 'used',
    label: {
      uz: 'Ishlatilgan',
      ru: 'Б/у',
      en: 'Used',
    },
  },
  {
    value: 'needs-repair',
    label: {
      uz: 'Ta’mir talab qiladi',
      ru: 'Требует ремонта',
      en: 'Needs repair',
    },
  },
];

type AdsStatus = Ad['status'];

type RequestAdsApiOptions = {
  cacheTtlMs?: number;
  signal?: AbortSignal;
  skipCache?: boolean;
};

export type FetchAdsOptions = {
  category?: string;
  excludeId?: string;
  fields?: 'card' | 'full';
  hasCoordinates?: boolean;
  ids?: string[];
  limit?: number;
  page?: number;
  search?: string;
  signal?: AbortSignal;
  status?: AdsStatus;
  userId?: string;
  vertical?: AdVertical;
};

export type AdsPagination = {
  hasMore: boolean;
  limit: number;
  page: number;
  total: number;
};

export type FetchAdsPageResult = {
  ads: Ad[];
  pagination: AdsPagination;
};

const adsGetResponseCache = new Map<
  string,
  {
    data: AdsApiResponse;
    expiresAt: number;
  }
>();
const inflightAdsGetRequests = new Map<string, Promise<AdsApiResponse>>();
const DEFAULT_ADS_CACHE_TTL_MS = 30_000;
const DEFAULT_AD_DETAIL_CACHE_TTL_MS = 15_000;

function sanitizePositiveInteger(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : undefined;
}

function buildAdsQueryString(options: FetchAdsOptions = {}) {
  const searchParams = new URLSearchParams();

  if (options.vertical) {
    searchParams.set('vertical', options.vertical);
  }

  if (options.category) {
    searchParams.set('category', options.category);
  }

  if (options.search?.trim()) {
    searchParams.set('search', options.search.trim());
  }

  if (options.userId?.trim()) {
    searchParams.set('userId', options.userId.trim());
  }

  if (options.status) {
    searchParams.set('status', options.status);
  }

  if (options.excludeId?.trim()) {
    searchParams.set('excludeId', options.excludeId.trim());
  }

  if (options.fields) {
    searchParams.set('fields', options.fields);
  }

  if (options.hasCoordinates) {
    searchParams.set('hasCoordinates', 'true');
  }

  if (Array.isArray(options.ids) && options.ids.length > 0) {
    searchParams.set('ids', options.ids.filter(Boolean).join(','));
  }

  const page = sanitizePositiveInteger(options.page);
  const limit = sanitizePositiveInteger(options.limit);

  if (page) {
    searchParams.set('page', String(page));
  }

  if (limit) {
    searchParams.set('limit', String(limit));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

function getCachedAdsResponse(cacheKey: string) {
  const cachedEntry = adsGetResponseCache.get(cacheKey);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    adsGetResponseCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.data;
}

function setCachedAdsResponse(cacheKey: string, data: AdsApiResponse, cacheTtlMs: number) {
  adsGetResponseCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + cacheTtlMs,
  });
}

export function invalidateAdsCache() {
  adsGetResponseCache.clear();
  inflightAdsGetRequests.clear();
}

async function requestAdsApi(
  path: string,
  init?: RequestInit,
  options: RequestAdsApiOptions = {}
) {
  const token = getStoredAuthToken();
  const headers = new Headers(init?.headers);
  const requestMethod = init?.method?.toUpperCase() || 'GET';
  const isGetRequest = requestMethod === 'GET';
  const cacheKey = `${token || 'public'}:${path}`;

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (isGetRequest && !options.skipCache) {
    const cachedData = getCachedAdsResponse(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const existingRequest = inflightAdsGetRequests.get(cacheKey);

    if (existingRequest) {
      return existingRequest;
    }
  }

  const requestPromise = fetchWithTimeout(
    `${backendApiBaseUrl}${path}`,
    {
      ...init,
      credentials: 'include',
      headers,
      cache: 'no-store',
      signal: options.signal || init?.signal,
    }
  )
    .then(async (response) => {
      const data = (await response.json().catch(() => ({}))) as AdsApiResponse;

      if (response.status === 401) {
        signOutUser();
      }

      if (!response.ok) {
        throw new Error(data.message || 'Request failed.');
      }

      if (isGetRequest && !options.skipCache) {
        setCachedAdsResponse(cacheKey, data, options.cacheTtlMs ?? DEFAULT_ADS_CACHE_TTL_MS);
      }

      return data;
    })
    .finally(() => {
      if (isGetRequest) {
        inflightAdsGetRequests.delete(cacheKey);
      }
    });

  if (isGetRequest && !options.skipCache) {
    inflightAdsGetRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
}

function normalizePagination(response: AdsApiResponse, fallbackLimit: number): AdsPagination {
  return {
    page:
      typeof response.pagination?.page === 'number' && response.pagination.page > 0
        ? response.pagination.page
        : 1,
    limit:
      typeof response.pagination?.limit === 'number' && response.pagination.limit > 0
        ? response.pagination.limit
        : fallbackLimit,
    total:
      typeof response.pagination?.total === 'number' && response.pagination.total >= 0
        ? response.pagination.total
        : Array.isArray(response.ads)
          ? response.ads.length
          : 0,
    hasMore: Boolean(response.pagination?.hasMore),
  };
}

export async function fetchAdsPage(options: FetchAdsOptions = {}): Promise<FetchAdsPageResult> {
  const data = await requestAdsApi(`/ads${buildAdsQueryString(options)}`, undefined, {
    cacheTtlMs: DEFAULT_ADS_CACHE_TTL_MS,
    signal: options.signal,
  });

  return {
    ads: Array.isArray(data.ads) ? data.ads.map(normalizeRemoteAd) : [],
    pagination: normalizePagination(data, options.limit ?? 20),
  };
}

export async function fetchAds(options: FetchAdsOptions = {}) {
  const data = await fetchAdsPage(options);
  return data.ads;
}

export async function fetchAdById(id: string, options?: { signal?: AbortSignal }) {
  const data = await requestAdsApi(`/ads/${id}`, undefined, {
    cacheTtlMs: DEFAULT_AD_DETAIL_CACHE_TTL_MS,
    signal: options?.signal,
  });

  if (!data.ad) {
    throw new Error('Ad not found.');
  }

  return normalizeRemoteAd(data.ad);
}

export async function createAd(input: CreateAdInput) {
  const data = await requestAdsApi(
    '/ads',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    {
      skipCache: true,
    }
  );

  if (!data.ad) {
    throw new Error('Ad was not created.');
  }

  invalidateAdsCache();
  return normalizeRemoteAd(data.ad);
}

export async function updateAd(id: string, input: CreateAdInput) {
  const data = await requestAdsApi(
    `/ads/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    {
      skipCache: true,
    }
  );

  if (!data.ad) {
    throw new Error('Ad was not updated.');
  }

  invalidateAdsCache();
  return normalizeRemoteAd(data.ad);
}

export async function updateAdStatus(id: string, status: AdsStatus) {
  const data = await requestAdsApi(
    `/ads/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    {
      skipCache: true,
    }
  );

  if (!data.ad) {
    throw new Error('Ad status was not updated.');
  }

  invalidateAdsCache();
  return normalizeRemoteAd(data.ad);
}

export async function deleteAd(id: string) {
  const data = await requestAdsApi(
    `/ads/${id}`,
    {
      method: 'DELETE',
    },
    {
      skipCache: true,
    }
  );

  invalidateAdsCache();
  return data.ad ? normalizeRemoteAd(data.ad) : null;
}

export function getConditionLabel(condition: AdCondition, locale: Language) {
  return AD_CONDITIONS.find((item) => item.value === condition)?.label[locale] || condition;
}
