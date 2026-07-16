import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerticalMarketplacePage } from '@/components/marketplace/VerticalMarketplacePage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Market | BirJoy',
  description:
    'Elektronika, moda, xizmatlar va kundalik xaridlar uchun BirJoy market eʼlonlarini qidiring, solishtiring va saqlang.',
  path: '/market',
  keywords: ['marketplace', 'elektronika', 'xizmatlar', 'moda', 'BirJoy'],
});

export default function MarketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerticalMarketplacePage vertical="market" />
    </Suspense>
  );
}
