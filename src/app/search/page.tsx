import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketplaceSearchPage } from '@/components/search/MarketplaceSearchPage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Qidiruv | BirJoy',
  description:
    'BirJoy bo‘ylab uy-joy, avtomobil, market, taomlar va seller eʼlonlarini bitta qidiruv oynasida toping.',
  path: '/search',
  keywords: ['qidiruv', 'uy-joy', 'avtomobil', 'market', 'taomlar', 'BirJoy'],
});

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <MarketplaceSearchPage />
    </Suspense>
  );
}
