import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerticalMarketplacePage } from '@/components/marketplace/VerticalMarketplacePage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Taomlar | BirJoy',
  description:
    'Restoranlar, uy oshxonasi va grocery takliflarini BirJoyda bir joydan toping, qidiring va tez bog‘laning.',
  path: '/taomlar',
  keywords: ['taomlar', 'restoran', 'uy oshxonasi', 'grocery', 'BirJoy'],
});

export default function FoodPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerticalMarketplacePage vertical="food" />
    </Suspense>
  );
}
