import { backendApiBaseUrl } from '@/lib/api';
import { normalizeRemoteAd, type AdsApiResponse } from '@/lib/ads-shared';

async function requestPublicAdsApi(path: string) {
  const response = await fetch(`${backendApiBaseUrl}${path}`, {
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => ({}))) as AdsApiResponse;

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

export async function fetchPublicAdById(id: string) {
  const data = await requestPublicAdsApi(`/ads/${id}`);

  if (!data.ad) {
    throw new Error('Ad not found.');
  }

  return normalizeRemoteAd(data.ad);
}
