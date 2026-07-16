import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerticalMarketplacePage } from '@/components/marketplace/VerticalMarketplacePage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Avtomobil | BirJoy',
  description:
    'BirJoyda yengil avtomobil, moto va ehtiyot qismlar bo‘yicha eʼlonlarni tez qidiring, filtrlang va sotuvchilar bilan bog‘laning.',
  path: '/avtomobil',
  keywords: ['avtomobil', 'moto', 'ehtiyot qismlar', 'transport', 'BirJoy'],
});

export default function AutoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerticalMarketplacePage vertical="auto" />
    </Suspense>
  );
}
