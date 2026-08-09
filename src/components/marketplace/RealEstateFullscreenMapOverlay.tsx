'use client';

import { AlertCircle, ArrowLeft, Loader2, LocateFixed, MapPinned } from 'lucide-react';
import { useEffect } from 'react';
import { RealEstateListingsMap } from '@/components/maps/RealEstateListingsMap';
import { RealEstateFilterBar } from '@/components/marketplace/RealEstateFilterBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/i18n';
import { getActiveRealEstateFilterCount, type RealEstateFilterState } from '@/lib/real-estate-filters';
import type { Location } from '@/lib/map-types';
import type { Ad } from '@/lib/types';

type RealEstateFullscreenMapOverlayProps = {
  open: boolean;
  locale: Language;
  ads: Ad[];
  selectedAdId?: string;
  onClose: () => void;
  onSelectAd: (adId?: string) => void;
  userLocation?: Location | null;
  userLocationLabel: string;
  nearbyRadiusKm: number;
  popupActionLabel: string;
  filters: RealEstateFilterState;
  onApplyFilters: (filters: RealEstateFilterState) => void;
  onClearFilters: () => void;
  onLocateUser: () => void;
  isLocatingUser: boolean;
  locateUserLabel: string;
  locatingUserLabel: string;
  locationFeedback?: string | null;
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  focusZoom?: number;
};

function getBackLabel(language: Language) {
  if (language === 'ru') {
    return 'Назад';
  }

  if (language === 'en') {
    return 'Back';
  }

  return 'Orqaga';
}

function getSubtitle(language: Language, activeFilterCount: number) {
  if (activeFilterCount > 0) {
    if (language === 'ru') {
      return `${activeFilterCount} фильтра активно`;
    }

    if (language === 'en') {
      return `${activeFilterCount} active filters`;
    }

    return `${activeFilterCount} ta filter ishlayapti`;
  }

  if (language === 'ru') {
    return 'Карта во весь экран';
  }

  if (language === 'en') {
    return 'Full-screen map';
  }

  return 'To‘liq ekran xarita';
}

export function RealEstateFullscreenMapOverlay({
  open,
  locale,
  ads,
  selectedAdId,
  onClose,
  onSelectAd,
  userLocation,
  userLocationLabel,
  nearbyRadiusKm,
  popupActionLabel,
  filters,
  onApplyFilters,
  onClearFilters,
  onLocateUser,
  isLocatingUser,
  locateUserLabel,
  locatingUserLabel,
  locationFeedback,
  title,
  emptyTitle,
  emptyDescription,
  focusZoom,
}: RealEstateFullscreenMapOverlayProps) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const activeFilterCount = getActiveRealEstateFilterCount(filters);

  return (
    <div className="fixed inset-0 z-[70] bg-background">
      <div className="absolute inset-0">
        {ads.length > 0 || userLocation ? (
          <RealEstateListingsMap
            ads={ads}
            locale={locale}
            selectedAdId={selectedAdId}
            onSelectAd={onSelectAd}
            userLocation={userLocation}
            userLocationLabel={userLocationLabel}
            nearbyRadiusKm={nearbyRadiusKm}
            popupActionLabel={popupActionLabel}
            isVisible={open}
            mapClassName="marketplace-property-map-shell marketplace-property-map-shell--fullscreen"
            mapHeight="100%"
            focusZoom={focusZoom}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-background via-background to-muted/60 px-6">
            <div className="surface-card max-w-md rounded-[2rem] p-6 text-center shadow-xl">
              <MapPinned className="mx-auto mb-4 h-10 w-10 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">{emptyTitle}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:p-4 sm:pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="pointer-events-auto mx-auto flex max-w-6xl flex-col gap-3 rounded-[1.85rem] border border-white/10 bg-slate-900 p-3 text-white shadow-[0_24px_60px_rgba(2,6,23,0.5)] sm:p-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-[1.15rem] border border-white/10 bg-white/8 px-4 text-white hover:bg-white/12 hover:text-white"
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
              {getBackLabel(locale)}
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white sm:text-base">{title}</p>
              <p className="text-xs text-slate-300 sm:text-sm">{getSubtitle(locale, activeFilterCount)}</p>
            </div>
          </div>

          <RealEstateFilterBar
            locale={locale}
            filters={filters}
            onApply={onApplyFilters}
            onClear={onClearFilters}
            onOpenMap={() => {
              // No-op: we are already on the map.
            }}
            showMapButton={false}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:p-4 sm:pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <div className="mx-auto flex max-w-6xl justify-end">
          <div className="flex max-w-xs flex-col items-end gap-2">
            {locationFeedback ? (
              <p
                className={cn(
                  'pointer-events-auto inline-flex items-center gap-2 rounded-[1.1rem] border border-red-400/25 bg-slate-900 px-3 py-2 text-xs text-red-200 shadow-[0_12px_28px_rgba(2,6,23,0.42)]'
                )}
                aria-live="polite"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {locationFeedback}
              </p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="pointer-events-auto h-14 w-14 rounded-full border-white/10 bg-slate-900 text-white shadow-[0_18px_34px_rgba(2,6,23,0.44)] hover:bg-slate-800 hover:text-white"
              onClick={onLocateUser}
              disabled={isLocatingUser}
              aria-label={isLocatingUser ? locatingUserLabel : locateUserLabel}
              title={isLocatingUser ? locatingUserLabel : locateUserLabel}
            >
              {isLocatingUser ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LocateFixed className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
