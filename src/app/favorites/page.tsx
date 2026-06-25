'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { AdCard } from '@/components/ads/AdCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { fetchAds } from '@/lib/ads';
import { useAdminSession } from '@/hooks/use-admin-session';
import type { Ad } from '@/lib/types';

export default function FavoritesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <FavoritesPageContent />
    </Suspense>
  );
}

function FavoritesPageContent() {
  const { user, isFavorite } = useAuth();
  const { messages } = useI18n();
  const { isAdmin } = useAdminSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAds() {
      try {
        setIsLoadingAds(true);
        const response = await fetchAds();

        if (!cancelled) {
          setAds(response);
          setAdsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAds([]);
          setAdsError(error instanceof Error ? error.message : 'Unable to load ads.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAds(false);
        }
      }
    }

    void loadAds();

    return () => {
      cancelled = true;
    };
  }, []);

  const favoriteAds = ads.filter((ad) => user?.favorites.includes(ad.id));

  return (
    <MarketplaceShell>
      <ProtectedRoute>
        <main className="marketplace-main">
          <section className="surface-card rounded-[1.75rem] px-5 py-6 sm:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-primary/70">
                  {messages.navbar.favorites}
                </p>
                <h1 className="page-title mt-3 font-bold text-primary">
                  {messages.profile.favoritesTab}
                </h1>
              </div>
              <p className="body-lead max-w-2xl text-muted-foreground">
                {messages.profile.emptyFavoritesDescription}
              </p>
            </div>
          </section>

          <section className="listing-grid">
            {isLoadingAds ? (
              <div className="surface-card col-span-full rounded-[1.75rem] py-20 text-center">
                <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 text-lg font-semibold">{messages.profile.loadingListings}</h3>
              </div>
            ) : adsError ? (
              <div className="surface-card col-span-full rounded-[1.75rem] py-20 text-center">
                <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mx-auto max-w-xl text-muted-foreground">{adsError}</p>
              </div>
            ) : favoriteAds.length > 0 ? (
              favoriteAds.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  isFavorite={isFavorite(ad.id)}
                  canDelete={isAdmin}
                  onDeleted={(adId) => {
                    setAds((previous) => previous.filter((item) => item.id !== adId));
                  }}
                />
              ))
            ) : (
              <div className="surface-card col-span-full rounded-[1.75rem] py-20 text-center">
                <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-1 text-lg font-semibold">{messages.profile.emptyFavorites}</h3>
                <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
                  {messages.profile.emptyFavoritesDescription}
                </p>
                <Button asChild variant="outline">
                  <Link href="/">{messages.profile.exploreMarket}</Link>
                </Button>
              </div>
            )}
          </section>
        </main>
      </ProtectedRoute>
    </MarketplaceShell>
  );
}
