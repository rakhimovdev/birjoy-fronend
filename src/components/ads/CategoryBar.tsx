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
    <div className="fixed inset-x-0 bottom-0 z-40 overflow-x-auto border-t border-white/80 bg-[rgba(255,255,255,0.94)] shadow-[0_-12px_28px_rgba(7,28,85,0.12)] backdrop-blur-xl scrollbar-hide">
      <div className="container mx-auto flex min-w-max snap-x snap-mandatory gap-3 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:justify-center md:snap-none md:gap-8 md:px-4 md:py-4 md:pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button
          type="button"
          onClick={() => updateCategory('all')}
          className="group flex min-w-[72px] snap-start flex-col items-center gap-1.5 md:min-w-[84px] md:gap-2"
        >
          <div
            className={cn(
              'rounded-full p-2.5 transition-all md:p-3',
              activeCategory === 'all'
                ? 'bg-primary text-white shadow-[0_10px_20px_rgba(11,72,214,0.22)]'
                : 'bg-white group-hover:bg-primary/10 group-hover:text-primary'
            )}
          >
            <LayoutGrid className="h-6 w-6" />
          </div>
          <span
            className={cn(
              'text-center text-[11px] font-medium leading-tight transition-colors md:text-xs',
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
              className="group flex min-w-[72px] snap-start flex-col items-center gap-1.5 md:min-w-[84px] md:gap-2"
            >
              <div
                className={cn(
                  'rounded-full p-2.5 transition-all md:p-3',
                  isActive
                    ? 'bg-primary text-white shadow-[0_10px_20px_rgba(11,72,214,0.22)]'
                    : 'bg-white group-hover:bg-primary/10 group-hover:text-primary'
                )}
              >
                {Icon ? <Icon className="h-6 w-6" /> : null}
              </div>
              <span
                className={cn(
                  'text-center text-[11px] font-medium leading-tight transition-colors md:text-xs',
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
