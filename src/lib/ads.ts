'use client';

import { getStoredAuthToken, signOutUser } from '@/lib/auth';
import { backendApiBaseUrl } from '@/lib/api';
import type { LocalizedText, Language } from '@/lib/i18n';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Ad } from '@/lib/types';

export type AdCondition = 'new' | 'like-new' | 'used' | 'needs-repair';

type RemoteAd = {
  id?: string;
  _id?: string;
  title?: string | LocalizedText;
  description?: string | LocalizedText;
  price?: number;
  category?: string;
  condition?: string;
  location?: string | LocalizedText;
  images?: string[];
  userId?: string;
  userName?: string;
  sellerName?: string;
  sellerPhone?: string;
  contactPhone?: string;
  createdAt?: string;
  updatedAt?: string;
  isFeatured?: boolean;
  status?: string;
};

type AdsApiResponse = {
  ad?: RemoteAd;
  ads?: RemoteAd[];
  message?: string;
};

export type CreateAdInput = {
  title: string;
  category: string;
  price: number;
  description: string;
  location: string;
  condition: AdCondition;
  contactPhone: string;
  images: string[];
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

function normalizeStatus(value: string | undefined): Ad['status'] {
  if (value === 'active' || value === 'pending' || value === 'flagged') {
    return value;
  }

  return 'active';
}

function getFallbackImage() {
  return PlaceHolderImages[1]?.imageUrl || PlaceHolderImages[0]?.imageUrl || '';
}

function normalizeRemoteAd(ad: RemoteAd): Ad {
  return {
    id: ad.id || ad._id || '',
    title: normalizeText(ad.title, ''),
    description: normalizeText(ad.description, ''),
    price: typeof ad.price === 'number' ? ad.price : 0,
    category: ad.category || '',
    condition: normalizeCondition(ad.condition),
    location: normalizeText(ad.location, ''),
    images: Array.isArray(ad.images) && ad.images.length > 0 ? ad.images : [getFallbackImage()],
    userId: ad.userId || '',
    userName: ad.userName || ad.sellerName || '',
    sellerPhone: ad.sellerPhone || ad.contactPhone || '',
    createdAt: ad.createdAt || new Date().toISOString(),
    isFeatured: Boolean(ad.isFeatured),
    status: normalizeStatus(ad.status),
  };
}

async function requestAdsApi(path: string, init?: RequestInit) {
  const token = getStoredAuthToken();
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${backendApiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => ({}))) as AdsApiResponse;

  if (response.status === 401) {
    signOutUser();
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

export async function fetchAds() {
  const data = await requestAdsApi('/ads');
  return Array.isArray(data.ads) ? data.ads.map(normalizeRemoteAd) : [];
}

export async function fetchAdById(id: string) {
  const data = await requestAdsApi(`/ads/${id}`);

  if (!data.ad) {
    throw new Error('Ad not found.');
  }

  return normalizeRemoteAd(data.ad);
}

export async function createAd(input: CreateAdInput) {
  const data = await requestAdsApi('/ads', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!data.ad) {
    throw new Error('Ad was not created.');
  }

  return normalizeRemoteAd(data.ad);
}

export function getConditionLabel(condition: AdCondition, locale: Language) {
  return AD_CONDITIONS.find((item) => item.value === condition)?.label[locale] || condition;
}
