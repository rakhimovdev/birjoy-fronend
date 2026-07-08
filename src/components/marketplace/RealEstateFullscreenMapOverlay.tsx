'use client';

import { ArrowLeft, MapPinned } from 'lucide-react';
import { useEffect } from 'react';
import { RealEstateListingsMap } from '@/components/maps/RealEstateListingsMap';
import { RealEstateFilterSheet } from '@/components/marketplace/RealEstateFilterSheet';
import { Button } from '@/components/ui/button';
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
  onSelectAd: (adId: string) => void;
  userLocation?: Location | null;
  userLocationLabel: string;
  nearbyRadiusKm: number;
  popupActionLabel: string;
  filters: RealEstateFilterState;
  onApplyFilters: (filters: RealEstateFilterState) => void;
  onClearFilters: () => void;
  title: string;
  emptyTitle: string;
  emptyDescription: string;
};

function getBackLabel(language: Language) {
  if (language === 'ru') {
    return '← Назад';
  }

  if (language === 'en') {
    return '← Back';
  }

  return '← Orqaga';
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
  title,
  emptyTitle,
  emptyDescription,
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
        {ads.length > 0 ? (
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
            mapClassName="google-property-map-shell google-property-map-shell--fullscreen"
            mapHeight="100%"
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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-6xl flex-col gap-3 rounded-[1.75rem] border border-white/25 bg-background/72 p-3 shadow-[0_24px_50px_rgba(7,28,85,0.24)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" className="h-11 rounded-2xl px-4" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
              {getBackLabel(locale)}
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</p>
              <p className="text-xs text-muted-foreground">{getSubtitle(locale, activeFilterCount)}</p>
            </div>
          </div>

          <RealEstateFilterSheet
            locale={locale}
            filters={filters}
            onApply={onApplyFilters}
            onClear={onClearFilters}
            buttonClassName="w-full sm:w-auto"
          />
        </div>
      </div>
    </div>
  );
}
