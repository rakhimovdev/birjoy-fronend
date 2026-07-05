'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { AdCard } from '@/components/ads/AdCard';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAds } from '@/lib/ads';
import { filterAds } from '@/lib/listing-utils';
import { getLocalizedText } from '@/lib/i18n';
import { MARKETPLACE_VERTICALS, getVerticalHref } from '@/lib/mock-data';
import type { Ad } from '@/lib/types';

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const { isFavorite } = useAuth();
  const { locale, messages } = useI18n();
  const { isAdmin } = useAdminSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const query = searchParams.get('q')?.trim() ?? '';

  const homeCopy =
    locale === 'ru'
      ? {
          eyebrow: 'МУЛЬТИ-ВЕРТИКАЛЬНЫЙ MARKETPLACE',
          title: 'BirJoy теперь собирает жильё, маркет, еду и авто в одной экосистеме.',
          description:
            'Сначала выбирайте нужный вертикаль, затем переходите в специализированный каталог с фильтрами, карточками и быстрым выходом на детали.',
          exploreLabel: 'Открыть витрины',
          verticalTitle: 'Главные вертикали',
          verticalDescription: 'Каждый раздел получает собственную структуру, категории и сценарий поиска.',
          featuredTitle: 'Популярно сейчас',
          latestTitle: 'Новые объявления со всех вертикалей',
        }
      : locale === 'en'
        ? {
            eyebrow: 'MULTI-VERTICAL MARKETPLACE',
            title: 'BirJoy now brings real estate, market, food, and auto into one ecosystem.',
            description:
              'Start with a top-level vertical, then drop into a specialized catalog with its own categories, cards, and detail flow.',
            exploreLabel: 'Open verticals',
            verticalTitle: 'Main verticals',
            verticalDescription:
              'Each vertical gets its own structure, category model, and browsing behavior.',
            featuredTitle: 'Popular right now',
            latestTitle: 'Fresh listings across every vertical',
          }
        : {
            eyebrow: 'KO‘P VERTIKALLI MARKETPLACE',
            title: 'BirJoy endi uy-joy, market, taomlar va avtomobilni bitta ekotizimda jamlaydi.',
            description:
              'Avval kerakli vertikalni tanlang, keyin o‘sha bo‘limga mos kategoriyalar, kartalar va batafsil sahifalarga o‘ting.',
            exploreLabel: 'Vitrinalarni ochish',
            verticalTitle: 'Asosiy vertikallar',
            verticalDescription:
              'Har bir bo‘lim endi o‘z tuzilmasi, kategoriyalari va ko‘rish ssenariysiga ega.',
            featuredTitle: 'Hozir mashhur',
            latestTitle: 'Barcha vertikallardan yangi e’lonlar',
          };

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

    loadAds();

    return () => {
      cancelled = true;
    };
  }, []);

  const matchingAds = useMemo(
    () =>
      filterAds(ads, {
        query,
      }),
    [ads, query]
  );
  const featuredAds = matchingAds.filter((ad) => ad.isFeatured).slice(0, 4);
  const latestAds = matchingAds.filter((ad) => !ad.isFeatured).slice(0, 8);

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <section className="overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,_#071c55_0%,_#0b48d6_44%,_#0f766e_78%,_#ff730a_118%)] px-5 py-10 text-white sm:px-6 sm:py-12 lg:px-8 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(18rem,0.88fr)]">
            <div className="space-y-5">
              <Badge className="rounded-full border border-white/15 bg-white/10 text-white">
                {homeCopy.eyebrow}
              </Badge>
              <div className="space-y-4">
                <h1 className="hero-display font-bold text-white">{homeCopy.title}</h1>
                <p className="body-lead max-w-3xl text-white/82">{homeCopy.description}</p>
              </div>
              <div className="flex flex-col gap-3 min-[481px]:flex-row">
                <Button asChild className="min-h-12 rounded-2xl bg-accent px-6 font-semibold text-accent-foreground hover:bg-accent/90">
                  <Link href="/market">{homeCopy.exploreLabel}</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="min-h-12 rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15"
                >
                  <Link href="/ads/create">{messages.home.startSelling}</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[1.85rem] border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
              <BrandLogo size="hero" showTagline tagline="Online Platforma" className="justify-center text-center" />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {MARKETPLACE_VERTICALS.map((vertical) => (
                  <div key={vertical.id} className="rounded-[1.25rem] border border-white/12 bg-white/10 p-4">
                    <p className="text-sm font-semibold text-white">
                      {getLocalizedText(vertical.name, locale)}
                    </p>
                    <p className="mt-2 text-sm text-white/72">
                      {getLocalizedText(vertical.tagline, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="surface-card rounded-[1.8rem] px-5 py-6 sm:px-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{homeCopy.verticalTitle}</h2>
              <p className="text-sm text-muted-foreground">{homeCopy.verticalDescription}</p>
            </div>
            {query ? (
              <Badge variant="secondary" className="w-fit">
                {query}
              </Badge>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {MARKETPLACE_VERTICALS.map((vertical) => {
              const verticalAds = ads.filter((ad) => ad.vertical === vertical.id);

              return (
                <Link
                  key={vertical.id}
                  href={getVerticalHref(vertical.id)}
                  className="group rounded-[1.55rem] border border-border/70 bg-card/90 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_20px_42px_rgba(7,28,85,0.12)]"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/75">
                          {getLocalizedText(vertical.name, locale)}
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-foreground">
                          {getLocalizedText(vertical.tagline, locale)}
                        </h3>
                      </div>
                      <Badge variant="secondary">{verticalAds.length}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {getLocalizedText(vertical.description, locale)}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <span>{messages.home.viewAll}</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {isLoadingAds ? (
          <section className="surface-card rounded-[1.75rem] px-5 py-12 text-center sm:px-6">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {messages.home.loadingListings}
            </h2>
          </section>
        ) : adsError ? (
          <section className="surface-card rounded-[1.75rem] px-5 py-12 text-center sm:px-6">
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {messages.createAd.submitError}
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">{adsError}</p>
          </section>
        ) : matchingAds.length === 0 ? (
          <section className="surface-card rounded-[1.75rem] px-5 py-12 text-center sm:px-6">
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {messages.home.noResultsTitle}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              {messages.home.noResultsDescription}
            </p>
            <div className="flex flex-col justify-center gap-3 min-[481px]:flex-row">
              <Button asChild className="w-full min-[481px]:w-auto">
                <Link href="/">{messages.home.clearFilters}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full min-[481px]:w-auto">
                <Link href="/ads/create">{messages.home.startSelling}</Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
            {featuredAds.length > 0 ? (
              <section className="surface-card rounded-[1.75rem] px-5 py-8 sm:px-6">
                <div className="mb-8 flex flex-col items-start justify-between gap-4 min-[640px]:flex-row min-[640px]:items-center">
                  <h2 className="text-2xl font-bold tracking-tight">{homeCopy.featuredTitle}</h2>
                  <Button asChild variant="ghost" className="gap-1 px-0 font-semibold text-primary hover:bg-transparent">
                    <Link href="/market">
                      {messages.home.viewAll}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="listing-grid">
                  {featuredAds.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      isFavorite={isFavorite(ad.id)}
                      canDelete={isAdmin}
                      onDeleted={(adId) => {
                        setAds((previous) => previous.filter((item) => item.id !== adId));
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {latestAds.length > 0 ? (
              <section className="surface-card rounded-[1.75rem] px-5 py-8 sm:px-6">
                <div className="mb-8 flex flex-col items-start justify-between gap-4 min-[640px]:flex-row min-[640px]:items-center">
                  <h2 className="text-2xl font-bold tracking-tight">{homeCopy.latestTitle}</h2>
                  <Button asChild variant="ghost" className="gap-1 px-0 font-semibold text-primary hover:bg-transparent">
                    <Link href="/market">
                      {messages.home.browseAllListings}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="listing-grid">
                  {latestAds.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      isFavorite={isFavorite(ad.id)}
                      canDelete={isAdmin}
                      onDeleted={(adId) => {
                        setAds((previous) => previous.filter((item) => item.id !== adId));
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </MarketplaceShell>
  );
}
