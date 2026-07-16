import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RealEstateMarketplacePage } from '@/components/marketplace/RealEstateMarketplacePage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Uy-joy | BirJoy',
  description:
    'BirJoyda kvartira, hovli, yer uchastkasi va tijorat ko‘chmas mulk eʼlonlarini xarita, filtr va qidiruv bilan toping.',
  path: '/uy-joy',
  keywords: ['Uy-joy', 'kvartira', 'hovli', 'ko‘chmas mulk', 'BirJoy'],
});

export default function RealEstatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RealEstateMarketplacePage />
    </Suspense>
  );
}
