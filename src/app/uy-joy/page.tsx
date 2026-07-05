import { Suspense } from 'react';
import { RealEstateMarketplacePage } from '@/components/marketplace/RealEstateMarketplacePage';

export default function RealEstatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RealEstateMarketplacePage />
    </Suspense>
  );
}
