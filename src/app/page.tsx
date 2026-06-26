'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { CategoryBar } from '@/components/ads/CategoryBar';
import { AdCard } from '@/components/ads/AdCard';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { CATEGORIES, getCategoryBySlug } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getLocalizedText } from '@/lib/i18n';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { fetchAds, getConditionLabel } from '@/lib/ads';
import { useAdminSession } from '@/hooks/use-admin-session';
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
  const selectedCategory = searchParams.get('category');
  const lowerQuery = query.toLowerCase();
  const featuredCategoryNames = CATEGORIES.slice(0, 4);
  const selectedCategoryObject = selectedCategory ? getCategoryBySlug(selectedCategory) : null;

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
          setAdsError(error instanceof Error ? error.message : 'Unable to load ads.');
          setAds([]);
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

  const matchingAds = ads.filter((ad) => {
    const matchesCategory = selectedCategory ? ad.category === selectedCategory : true;

    if (!matchesCategory) {
      return false;
    }

    if (!lowerQuery) {
      return true;
    }

    const category = getCategoryBySlug(ad.category);
    const searchableValues = [
      ...Object.values(ad.title),
      ...Object.values(ad.description),
      ...Object.values(ad.location),
      ad.userName,
      ad.sellerPhone,
      getConditionLabel(ad.condition, locale),
      ...(category ? Object.values(category.name) : []),
    ];

    return searchableValues.some((value) => value.toLowerCase().includes(lowerQuery));
  });

  const featuredAds = matchingAds.filter((ad) => ad.isFeatured);
  const latestAds = matchingAds.filter((ad) => !ad.isFeatured);
  const hasFilters = Boolean(query || selectedCategory);
  const shouldShowHero = !selectedCategory;
  const selectedCategoryLabel = selectedCategoryObject
    ? getLocalizedText(selectedCategoryObject.name, locale)
    : null;

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <CategoryBar />

        {shouldShowHero ? (
          <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,_#071c55_0%,_#0b48d6_46%,_#ff730a_108%)] py-12 text-white md:py-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_28%)]" />
            <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(180deg,_rgba(255,255,255,0.05),_transparent)] lg:block" />
            <div className="relative z-10 grid items-center gap-10 px-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:px-8">
              <div className="max-w-3xl">
                <div className="mb-5 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/90 backdrop-blur">
                  BirJoy Marketplace
                </div>
                <h1 className="hero-display mb-4 font-headline font-extrabold">
                  {messages.home.heroTitlePrefix}{' '}
                  <span className="text-[#ffd7b5]">{messages.home.heroTitleAccent}</span>
                  {messages.home.heroTitleSuffix ? ` ${messages.home.heroTitleSuffix}` : ''}
                </h1>
                <p className="body-lead mb-8 max-w-2xl font-medium text-white/82">
                  {messages.home.heroDescription}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="min-h-12 rounded-2xl bg-accent px-8 font-bold text-accent-foreground shadow-[0_18px_36px_rgba(255,115,10,0.28)] hover:bg-accent/90"
                  >
                    <Link href="/ads/create">{messages.home.startSelling}</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="min-h-12 rounded-2xl border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/18"
                  >
                    <Link href="#browse-categories">{messages.home.exploreCategories}</Link>
                  </Button>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-xl">
                <div className="absolute -left-6 top-8 h-28 w-28 rounded-full bg-white/12 blur-2xl" />
                <div className="absolute -bottom-8 right-4 h-32 w-32 rounded-full bg-[#ffb26d]/25 blur-3xl" />
                <div className="relative rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-[0_30px_80px_rgba(4,18,58,0.35)] backdrop-blur-2xl">
                  <BrandLogo
                    size="hero"
                    showTagline
                    tagline="Online Platforma"
                    className="justify-center text-center"
                  />
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">BirJoy</p>
                      <p className="mt-2 text-sm leading-6 text-white/85">Online Platforma</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#fff7ef]/90 p-4 text-[#071c55]">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff730a]">Brand Focus</p>
                      <p className="mt-2 text-sm leading-6 text-[#20305f]">Kirishdan e’lon ko‘rishgacha butun interfeys endi BirJoy logotipidagi kayfiyatga moslandi.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {hasFilters ? (
          <section className="surface-card rounded-[1.75rem] px-5 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">{messages.home.resultsTitle}</h2>
                <p className="text-sm text-muted-foreground">{messages.home.resultsDescription}</p>
                <div className="flex flex-wrap gap-2">
                  {query ? <Badge variant="secondary">{query}</Badge> : null}
                  {selectedCategoryLabel ? <Badge variant="secondary">{selectedCategoryLabel}</Badge> : null}
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/">{messages.home.clearFilters}</Link>
              </Button>
            </div>
          </section>
        ) : null}

        {isLoadingAds ? (
          <section className="surface-card rounded-[1.75rem] px-6 py-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">{messages.home.loadingListings}</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {messages.home.resultsDescription}
            </p>
          </section>
        ) : adsError ? (
          <section className="surface-card rounded-[1.75rem] px-6 py-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">{messages.createAd.submitError}</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">{adsError}</p>
          </section>
        ) : matchingAds.length === 0 ? (
          <section className="surface-card rounded-[1.75rem] px-6 py-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">{messages.home.noResultsTitle}</h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              {messages.home.noResultsDescription}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link href="/">{messages.home.clearFilters}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/ads/create">{messages.home.startSelling}</Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
            {featuredAds.length > 0 ? (
              <section id="featured-listings" className="surface-card rounded-[1.75rem] px-5 py-8 backdrop-blur-sm sm:px-6">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-6 w-6 fill-accent text-accent" />
                      <h2 className="text-2xl font-bold tracking-tight">{messages.home.featuredListings}</h2>
                    </div>
                    <Button asChild variant="ghost" className="gap-1 font-semibold text-primary">
                      <Link href={hasFilters ? '/' : '#all-listings'}>
                        {hasFilters ? messages.home.clearFilters : messages.home.viewAll}
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
              <section id="all-listings" className="surface-card rounded-[1.75rem] px-5 py-8 sm:px-6">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold tracking-tight">{messages.home.recentPostings}</h2>
                    <Button asChild variant="ghost" className="gap-1 font-semibold text-primary">
                      <Link href={hasFilters ? '/' : '#browse-categories'}>
                        {hasFilters ? messages.home.clearFilters : messages.home.browseAllListings}
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

        <section className="rounded-[2rem] bg-[linear-gradient(120deg,_#071c55_0%,_#0b48d6_58%,_#ff730a_140%)] px-5 py-12 text-white sm:px-6">
          <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-4xl font-bold">1M+</h3>
                <p className="text-white/70">{messages.home.activeUsers}</p>
              </div>
              <div>
                <h3 className="mb-2 text-4xl font-bold">500k+</h3>
                <p className="text-white/70">{messages.home.monthlyAds}</p>
              </div>
              <div>
                <h3 className="mb-2 text-4xl font-bold">100+</h3>
                <p className="text-white/70">{messages.home.supportedCities}</p>
              </div>
          </div>
        </section>

        <footer className="rounded-[2rem] border border-white/70 bg-[rgba(255,250,242,0.82)] px-5 py-10 backdrop-blur sm:px-6">
          <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-5">
            <div className="col-span-2 md:col-span-1">
              <BrandLogo size="md" showTagline className="mb-4" />
              <p className="text-sm text-muted-foreground">{messages.home.footerDescription}</p>
            </div>
            <div>
              <h4 className="mb-4 font-bold">{messages.home.footerCategories}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {featuredCategoryNames.map((category) => (
                  <li key={category.id}>{getLocalizedText(category.name, locale)}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold">{messages.home.footerSupport}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {messages.home.footerSupportItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold">{messages.home.footerCompany}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {messages.home.footerCompanyItems.map((item, index) => (
                  <li key={`${item}-${index}`}>
                    {index === 0 ? (
                      <Link href="/about" className="transition-colors hover:text-primary">
                        {item}
                      </Link>
                    ) : (
                      item
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="mb-4 font-bold">{messages.home.footerContact}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a
                    href="https://t.me/bir_joyuz"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-primary"
                  >
                    Telegram: @bir_joyuz
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/1birjoy?igsh=MWZpeDNvdzcwNTRrdQ=="
                    target="_blank"
                    rel="noreferrer"
                    className="break-all transition-colors hover:text-primary"
                  >
                    Instagram: @1birjoy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            © 2024 BirJoy. {messages.home.footerRights}
          </div>
        </footer>
      </main>
    </MarketplaceShell>
  );
}
