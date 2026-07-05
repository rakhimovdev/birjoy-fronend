'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdEditorForm } from '@/components/ads/AdEditorForm';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/button';
import { fetchAdById } from '@/lib/ads';
import type { Ad } from '@/lib/types';

export function EditAdPageView({ adId }: { adId: string }) {
  const { user } = useAuth();
  const { messages } = useI18n();
  const [ad, setAd] = useState<Ad | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAd() {
      try {
        setIsLoading(true);
        const currentAd = await fetchAdById(adId);

        if (!cancelled) {
          setAd(currentAd);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAd(null);
          setError(loadError instanceof Error ? loadError.message : messages.adDetails.notFound);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAd();

    return () => {
      cancelled = true;
    };
  }, [adId, messages.adDetails.notFound]);

  if (isLoading) {
    return (
      <MarketplaceShell>
        <main className="marketplace-main">
          <div className="surface-card rounded-[1.75rem] px-6 py-12 text-center">
            <h1 className="text-2xl font-bold tracking-tight">{messages.adDetails.loading}</h1>
          </div>
        </main>
      </MarketplaceShell>
    );
  }

  if (!ad || (user && ad.userId !== user.id)) {
    return (
      <MarketplaceShell>
        <main className="marketplace-main">
          <div className="surface-card rounded-[1.75rem] px-6 py-12 text-center">
            <h1 className="mb-3 text-2xl font-bold tracking-tight">{messages.adDetails.notFound}</h1>
            <p className="mb-8 text-muted-foreground">{error || messages.adDetails.notFound}</p>
            <Button asChild>
              <Link href={adId ? `/ads/${adId}` : '/profile?tab=ads'}>
                {messages.adDetails.backToListings}
              </Link>
            </Button>
          </div>
        </main>
      </MarketplaceShell>
    );
  }

  return <AdEditorForm mode="edit" initialAd={ad} />;
}
