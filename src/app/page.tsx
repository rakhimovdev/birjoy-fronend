'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchAds } from '@/lib/ads';
import { getLocalizedText } from '@/lib/i18n';
import { filterAds } from '@/lib/listing-utils';
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
  const { locale, messages } = useI18n();
  const [ads, setAds] = useState<Ad[]>([]);
  const query = searchParams.get('q')?.trim() ?? '';

  const homeCopy =
    locale === 'ru'
      ? {
          eyebrow: 'МУЛЬТИ-ВЕРТИКАЛЬНЫЙ MARKETPLACE',
          title: 'BirJoy теперь собирает жильё, маркет, еду и авто в одной экосистеме.',
          description:
            'Сначала выбирайте нужный вертикаль, затем переходите в специализированный каталог с фильтрами, карточками и быстрым выходом на детали.',
          exploreLabel: 'Открыть витрины',
          aboutLabel: 'О нас',
          aboutCta: 'Подробнее',
          verticalTitle: 'Главные вертикали',
          verticalDescription:
            'Каждый раздел получает собственную структуру, категории и сценарий поиска.',
        }
      : locale === 'en'
        ? {
            eyebrow: 'MULTI-VERTICAL MARKETPLACE',
            title: 'BirJoy now brings real estate, market, food, and auto into one ecosystem.',
            description:
              'Start with a top-level vertical, then drop into a specialized catalog with its own categories, cards, and detail flow.',
            exploreLabel: 'Open verticals',
            aboutLabel: 'About Us',
            aboutCta: 'Learn more',
            verticalTitle: 'Main verticals',
            verticalDescription:
              'Each vertical gets its own structure, category model, and browsing behavior.',
          }
        : {
            eyebrow: 'KO‘P VERTIKALLI MARKETPLACE',
            title: 'BirJoy endi uy-joy, market, taomlar va avtomobilni bitta ekotizimda jamlaydi.',
            description:
              'Avval kerakli vertikalni tanlang, keyin o‘sha bo‘limga mos kategoriyalar, kartalar va batafsil sahifalarga o‘ting.',
            exploreLabel: 'Vitrinalarni ochish',
            aboutLabel: 'Biz haqimizda',
            aboutCta: 'Batafsil',
            verticalTitle: 'Asosiy vertikallar',
            verticalDescription:
              'Har bir bo‘lim endi o‘z tuzilmasi, kategoriyalari va ko‘rish ssenariysiga ega.',
          };

  useEffect(() => {
    let cancelled = false;

    async function loadAds() {
      try {
        const response = await fetchAds();

        if (!cancelled) {
          setAds(response);
        }
      } catch {
        if (!cancelled) {
          setAds([]);
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
                <Button
                  asChild
                  className="min-h-12 rounded-2xl bg-accent px-6 font-semibold text-accent-foreground hover:bg-accent/90"
                >
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
              <BrandLogo
                size="hero"
                showTagline
                tagline="Online Platforma"
                className="justify-center text-center"
              />
              <div className="mt-8 rounded-[1.5rem] border border-white/12 bg-white/10 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/72">
                    {homeCopy.aboutLabel}
                  </p>
                  <Badge className="border-white/15 bg-white/10 text-white">BirJoy</Badge>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-white">{messages.about.description}</h2>
                <p className="mt-4 text-sm leading-7 text-white/78">{messages.about.paragraphTwo}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {messages.about.valuesItems.map((value) => (
                    <span
                      key={value}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/88"
                    >
                      {value}
                    </span>
                  ))}
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="mt-6 min-h-11 rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15"
                >
                  <Link href="/about">{homeCopy.aboutCta}</Link>
                </Button>
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
              const verticalAds = matchingAds.filter((ad) => ad.vertical === vertical.id);

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
      </main>
    </MarketplaceShell>
  );
}
