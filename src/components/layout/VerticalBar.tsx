'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useI18n } from '@/components/providers/LocaleProvider';
import { getLocalizedText } from '@/lib/i18n';
import { MARKETPLACE_VERTICALS, getVerticalHref } from '@/lib/mock-data';
import type { AdVertical } from '@/lib/types';
import { cn } from '@/lib/utils';

export function VerticalBar({ activeVertical }: { activeVertical: AdVertical }) {
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const currentQuery = searchParams.get('q')?.trim();

  const buildVerticalHref = (verticalId: AdVertical) => {
    const href = getVerticalHref(verticalId);

    if (!currentQuery) {
      return href;
    }

    const params = new URLSearchParams();
    params.set('q', currentQuery);

    return `${href}?${params.toString()}`;
  };

  return (
    <section aria-label="Marketplace verticals" className="vertical-bar-shell">
      <div className="vertical-bar-surface px-2.5 py-2.5 sm:px-3.5 sm:py-3.5">
        <div className="category-bar-grid">
          {MARKETPLACE_VERTICALS.map((vertical) => {
            const Icon = (Icons as unknown as Record<string, LucideIcon>)[vertical.icon];
            const isActive = activeVertical === vertical.id;

            return (
              <Link
                key={vertical.id}
                href={buildVerticalHref(vertical.id)}
                className={cn('category-pill shrink-0', isActive && 'text-primary')}
                data-active={isActive}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="category-pill__icon">
                  {Icon ? <Icon className="h-5 w-5" /> : null}
                </span>
                <span className="category-pill__label">{getLocalizedText(vertical.name, locale)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
