'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { CATEGORIES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/providers/LocaleProvider';
import { getLocalizedText } from '@/lib/i18n';

export function CategoryBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, messages } = useI18n();
  const activeCategory = pathname === '/' ? searchParams.get('category') ?? 'all' : 'all';

  const updateCategory = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (categorySlug === 'all') {
      params.delete('category');
    } else {
      params.set('category', categorySlug);
    }

    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : '/');
  };

  return (
    <section className="surface-card rounded-[1.75rem] px-4 py-4 sm:px-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-primary/70">
            {messages.navbar.marketCategories}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-[#071c55]">
            {messages.home.exploreCategories}
          </h2>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {messages.home.heroDescription}
        </p>
      </div>

      <div className="category-bar-grid">
        <button
          type="button"
          onClick={() => updateCategory('all')}
          className="category-pill"
          data-active={activeCategory === 'all'}
        >
          <span className="category-pill__icon">
            <LayoutGrid className="h-5 w-5" />
          </span>
          <span className="category-pill__label">{messages.categoryBar.all}</span>
        </button>

        {CATEGORIES.map((category) => {
          const Icon = (Icons as unknown as Record<string, LucideIcon>)[category.icon];
          const isActive = activeCategory === category.slug;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => updateCategory(category.slug)}
              className={cn('category-pill', isActive && 'text-primary')}
              data-active={isActive}
            >
              <span className="category-pill__icon">
                {Icon ? <Icon className="h-5 w-5" /> : null}
              </span>
              <span className="category-pill__label">{getLocalizedText(category.name, locale)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
