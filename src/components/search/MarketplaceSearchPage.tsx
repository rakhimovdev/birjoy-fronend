'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useState } from 'react';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Input } from '@/components/ui/input';

function getSearchPlaceholder(locale: 'uz' | 'ru' | 'en') {
  if (locale === 'ru') {
    return 'Поиск...';
  }

  if (locale === 'en') {
    return 'Search...';
  }

  return 'Qidirish...';
}

export function MarketplaceSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const deferredQuery = useDeferredValue(searchQuery.trim());
  const currentQueryParam = searchParams.get('q')?.trim() ?? '';

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    if (deferredQuery === currentQueryParam) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (deferredQuery) {
      params.set('q', deferredQuery);
    } else {
      params.delete('q');
    }

    params.delete('scope');

    const nextUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    router.replace(nextUrl, { scroll: false });
  }, [currentQueryParam, deferredQuery, router, searchParams]);

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        <div className="mx-auto w-full max-w-3xl">
          <Input
            type="search"
            value={searchQuery}
            autoFocus
            autoComplete="off"
            placeholder={getSearchPlaceholder(locale)}
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            className="h-14 rounded-[1.35rem] border-white/55 bg-background/80 px-5 text-base shadow-none focus-visible:ring-primary"
          />
        </div>
      </main>
    </MarketplaceShell>
  );
}
