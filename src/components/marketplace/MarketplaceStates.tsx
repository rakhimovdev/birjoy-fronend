'use client';

import Link from 'next/link';
import { AlertTriangle, PackageSearch, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type MarketplaceAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
};

function MarketplaceActionButton({
  action,
  className,
}: {
  action: MarketplaceAction;
  className?: string;
}) {
  const variant = action.variant || 'default';

  if (action.href) {
    return (
      <Button asChild variant={variant} className={className}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }

  return (
    <Button type="button" variant={variant} className={className} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export function MarketplaceStatusCard({
  title,
  description,
  icon: Icon = PackageSearch,
  primaryAction,
  secondaryAction,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  primaryAction?: MarketplaceAction;
  secondaryAction?: MarketplaceAction;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'surface-card section-shell rounded-[1.75rem] px-5 py-12 text-center sm:px-6',
        className
      )}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">{description}</p>
        </div>
        {primaryAction || secondaryAction ? (
          <div className="flex w-full flex-col justify-center gap-3 pt-2 min-[481px]:w-auto min-[481px]:flex-row">
            {primaryAction ? (
              <MarketplaceActionButton
                action={primaryAction}
                className="w-full min-[481px]:w-auto"
              />
            ) : null}
            {secondaryAction ? (
              <MarketplaceActionButton
                action={secondaryAction}
                className="w-full min-[481px]:w-auto"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function MarketplaceErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  secondaryAction,
  className,
}: {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
  secondaryAction?: MarketplaceAction;
  className?: string;
}) {
  return (
    <MarketplaceStatusCard
      title={title}
      description={description}
      icon={AlertTriangle}
      className={className}
      primaryAction={{
        label: retryLabel,
        onClick: onRetry,
      }}
      secondaryAction={secondaryAction}
    />
  );
}

function ListingCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-border/60 bg-card/86 shadow-[0_16px_34px_rgba(7,28,85,0.08)] dark:shadow-[0_18px_36px_rgba(0,0,0,0.24)]">
      <Skeleton className={cn('w-full rounded-none', compact ? 'aspect-[4/4.2]' : 'aspect-[4/3]')} />
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="h-6 w-28" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function ListingsShowcaseSkeleton({
  title,
  description,
  count = 6,
  className,
  gridClassName,
  compactCards = false,
}: {
  title: string;
  description?: string;
  count?: number;
  className?: string;
  gridClassName?: string;
  compactCards?: boolean;
}) {
  return (
    <section className={cn('surface-card section-shell rounded-[1.85rem]', className)}>
      <div className="section-header">
        <div className="section-header__copy">
          <p className="section-kicker">{title}</p>
          <h2 className="section-title">{title}</h2>
          {description ? <p className="section-caption">{description}</p> : null}
        </div>
        <div className="hidden min-[481px]:flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
      </div>
      <div className={cn('listing-grid', gridClassName)}>
        {Array.from({ length: count }, (_, index) => (
          <ListingCardSkeleton
            key={`listing-skeleton-${index}`}
            compact={compactCards}
          />
        ))}
      </div>
    </section>
  );
}

export function AdDetailsSkeleton({ title }: { title: string }) {
  return (
    <div className="page-stack">
      <section className="surface-card section-shell rounded-[1.85rem]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="detail-grid lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.9fr)]">
          <div className="space-y-4">
            <Skeleton className="aspect-[4/3] w-full rounded-[1.5rem]" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton
                  key={`detail-thumbnail-skeleton-${index}`}
                  className="aspect-square w-full rounded-[1rem]"
                />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="section-kicker">{title}</p>
              <Skeleton className="h-10 w-full max-w-[28rem]" />
              <Skeleton className="h-8 w-40" />
            </div>
            <div className="detail-fact-grid">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={`detail-fact-skeleton-${index}`} className="detail-fact-card">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="grid flex-1 gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3">
              <Skeleton className="h-12 w-full rounded-[1rem]" />
              <Skeleton className="h-12 w-full rounded-[1rem]" />
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card section-shell rounded-[1.85rem]">
        <div className="section-header">
          <div className="section-header__copy">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </section>
    </div>
  );
}
