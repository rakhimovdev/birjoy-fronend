import type { MetadataRoute } from 'next';
import { type AdsApiResponse } from '@/lib/ads-shared';
import { backendApiBaseUrl, fetchWithTimeout } from '@/lib/api';
import { buildCanonicalUrl } from '@/lib/seo';

const staticRoutes = ['/', '/uy-joy', '/avtomobil', '/market', '/taomlar', '/about', '/privacy-policy'];

async function fetchSitemapAds() {
  const response = await fetchWithTimeout(
    `${backendApiBaseUrl}/ads?fields=card&status=active&limit=200`,
    {
      cache: 'no-store',
    },
    {
      timeoutMs: 10000,
    }
  );

  if (!response.ok) {
    throw new Error(`Sitemap ads request failed with ${response.status}.`);
  }

  const data = (await response.json().catch(() => ({}))) as AdsApiResponse;
  return Array.isArray(data.ads) ? data.ads : [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: buildCanonicalUrl(route),
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'daily' : 'hourly',
    priority: route === '/' ? 1 : 0.8,
  }));

  try {
    const ads = await fetchSitemapAds();

    return [
      ...entries,
      ...ads.map((ad) => ({
        url: buildCanonicalUrl(`/ads/${ad.id}`),
        lastModified: ad.updatedAt || ad.createdAt || new Date().toISOString(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return entries;
  }
}
