'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { CATEGORIES } from '@/lib/mock-data';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
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
    <div className="w-full overflow-x-auto border-b border-white/70 bg-[rgba(255,255,255,0.72)] backdrop-blur scrollbar-hide">
      <div className="container mx-auto flex min-w-max gap-4 px-4 py-4 sm:justify-center sm:gap-8">
        <button
          type="button"
          onClick={() => updateCategory('all')}
          className="group flex min-w-[84px] flex-col items-center gap-2"
        >
          <div
            className={cn(
              'rounded-full p-3 transition-all',
              activeCategory === 'all'
                ? 'bg-primary text-white shadow-[0_10px_20px_rgba(11,72,214,0.22)]'
                : 'bg-white group-hover:bg-primary/10 group-hover:text-primary'
            )}
          >
            <LayoutGrid className="h-6 w-6" />
          </div>
          <span
            className={cn(
              'text-xs font-medium transition-colors',
              activeCategory === 'all'
                ? 'text-primary'
                : 'text-muted-foreground group-hover:text-primary'
            )}
          >
            {messages.categoryBar.all}
          </span>
        </button>

        {CATEGORIES.map((category) => {
          const Icon = (Icons as unknown as Record<string, LucideIcon>)[category.icon];
          const isActive = activeCategory === category.slug;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => updateCategory(category.slug)}
              className="group flex min-w-[84px] flex-col items-center gap-2"
            >
              <div
                className={cn(
                  'rounded-full p-3 transition-all',
                  isActive
                    ? 'bg-primary text-white shadow-[0_10px_20px_rgba(11,72,214,0.22)]'
                    : 'bg-white group-hover:bg-primary/10 group-hover:text-primary'
                )}
              >
                {Icon ? <Icon className="h-6 w-6" /> : null}
              </div>
              <span
                className={cn(
                  'text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-primary'
                )}
              >
                {getLocalizedText(category.name, locale)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
