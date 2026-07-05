'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { CATEGORIES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/providers/LocaleProvider';
import { getLocalizedText } from '@/lib/i18n';
import type { Category } from '@/lib/types';

export function CategoryBar({
  categories = CATEGORIES,
  basePath,
}: {
  categories?: Category[];
  basePath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, messages } = useI18n();
  const currentBasePath = basePath || pathname || '/';
  const activeCategory = searchParams.get('category') ?? 'all';

  const updateCategory = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (categorySlug === 'all') {
      params.delete('category');
    } else {
      params.set('category', categorySlug);
    }

    const queryString = params.toString();
    router.push(queryString ? `${currentBasePath}?${queryString}` : currentBasePath);
  };

  return (
    <section
      id="browse-categories"
      className="sticky top-[var(--sticky-top)] z-30 scroll-mt-[var(--category-scroll-offset)]"
    >
      <div className="surface-card rounded-[1.35rem] px-3 py-3 sm:rounded-[1.5rem] sm:px-4">
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

          {categories.map((category) => {
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
      </div>
    </section>
  );
}
