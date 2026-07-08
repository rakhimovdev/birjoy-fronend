'use client';

import { getStoredAuthToken, signOutUser } from '@/lib/auth';
import { backendApiBaseUrl } from '@/lib/api';
import type { UploadedAdImage } from '@/lib/imagekit-upload';
import type { LocalizedText, Language } from '@/lib/i18n';
import type { AdVertical, RealEstatePropertyType } from '@/lib/types';
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
  rooms?: number | null;
  area?: number | null;
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

export async function updateAd(id: string, input: CreateAdInput) {
  const data = await requestAdsApi(`/ads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  if (!data.ad) {
    throw new Error('Ad was not updated.');
  }

  return normalizeRemoteAd(data.ad);
}

export function getConditionLabel(condition: AdCondition, locale: Language) {
  return AD_CONDITIONS.find((item) => item.value === condition)?.label[locale] || condition;
}
