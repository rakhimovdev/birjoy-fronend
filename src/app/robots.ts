import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/uy-joy', '/avtomobil', '/market', '/taomlar', '/ads/'],
        disallow: [
          '/admin',
          '/ads/create',
          '/chat',
          '/favorites',
          '/profile',
          '/sign-in',
          '/sign-up',
          '/account-deletion',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
