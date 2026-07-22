'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdEditorForm } from '@/components/ads/AdEditorForm';
import type { AdVertical } from '@/lib/types';

function CreateAdPageContent() {
  const searchParams = useSearchParams();
  const requestedVertical = searchParams.get('vertical');
  const initialVertical: AdVertical =
    requestedVertical === 'real_estate' ||
    requestedVertical === 'food' ||
    requestedVertical === 'auto'
      ? requestedVertical
      : 'market';

  return (
    <AdEditorForm
      mode="create"
      initialVertical={initialVertical}
      preferAccessibleVertical={!requestedVertical}
    />
  );
}

export default function CreateAdPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CreateAdPageContent />
    </Suspense>
  );
}
