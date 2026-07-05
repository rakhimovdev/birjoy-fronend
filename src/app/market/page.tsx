import { Suspense } from 'react';
import { VerticalMarketplacePage } from '@/components/marketplace/VerticalMarketplacePage';

export default function MarketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerticalMarketplacePage vertical="market" />
    </Suspense>
  );
}
