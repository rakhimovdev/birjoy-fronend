'use client';

import { Filter, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/i18n';
import {
  EMPTY_REAL_ESTATE_FILTERS,
  getActiveRealEstateFilterCount,
  type RealEstateFilterState,
  type RealEstateRoomsFilter,
} from '@/lib/real-estate-filters';

type RealEstateFilterSheetProps = {
  locale: Language;
  filters: RealEstateFilterState;
  onApply: (filters: RealEstateFilterState) => void;
  onClear: () => void;
  buttonClassName?: string;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
};

function getCopy(language: Language) {
  if (language === 'ru') {
    return {
      filter: 'Фильтр',
      title: 'Фильтры жилья',
      description: 'Уточните цену, тип недвижимости и локацию для списка и карты.',
      apply: 'Применить',
      clear: 'Сбросить',
      active: 'активно',
      priceMin: 'Цена от',
      priceMax: 'Цена до',
      propertyType: 'Тип недвижимости',
      listingType: 'Тип сделки',
      rooms: 'Комнаты',
      location: 'Локация',
      city: 'Город',
      district: 'Район',
      areaMin: 'Площадь от',
      areaMax: 'Площадь до',
      anyPropertyType: 'Все типы',
      anyListingType: 'Все сделки',
      anyRooms: 'Любое количество',
      apartment: 'Квартира',
      house: 'Дом',
      land: 'Участок',
      commercial: 'Коммерческая',
      sale: 'Продажа',
      rent: 'Аренда',
    };
  }

  if (language === 'en') {
    return {
      filter: 'Filter',
      title: 'Home filters',
      description: 'Refine price, property type, and location for both the list and map.',
      apply: 'Apply',
      clear: 'Reset',
      active: 'active',
      priceMin: 'Min price',
      priceMax: 'Max price',
      propertyType: 'Property type',
      listingType: 'Deal type',
      rooms: 'Rooms',
      location: 'Location',
      city: 'City',
      district: 'District',
      areaMin: 'Min area',
      areaMax: 'Max area',
      anyPropertyType: 'All property types',
      anyListingType: 'All deals',
      anyRooms: 'Any amount',
      apartment: 'Apartment',
      house: 'House',
      land: 'Land',
      commercial: 'Commercial',
      sale: 'Sale',
      rent: 'Rent',
    };
  }

  return {
    filter: 'Filter',
    title: 'Uy-joy filtrlari',
    description: 'Narx, tur va manzilni aniqlashtirib, ro‘yxat bilan xaritani birga yangilang.',
    apply: 'Qo‘llash',
    clear: 'Tozalash',
    active: 'faol',
    priceMin: 'Narx min',
    priceMax: 'Narx max',
    propertyType: 'Uy turi',
    listingType: 'Bitim turi',
    rooms: 'Xonalar',
    location: 'Joylashuv',
    city: 'Shahar',
    district: 'Tuman',
    areaMin: 'Maydon min',
    areaMax: 'Maydon max',
    anyPropertyType: 'Barcha turlar',
    anyListingType: 'Barcha bitimlar',
    anyRooms: 'Istalgan son',
    apartment: 'Kvartira',
    house: 'Hovli',
    land: 'Yer',
    commercial: 'Tijorat',
    sale: 'Sotuv',
    rent: 'Ijara',
  };
}

export function RealEstateFilterSheet({
  locale,
  filters,
  onApply,
  onClear,
  buttonClassName,
  buttonVariant = 'outline',
}: RealEstateFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [draftFilters, setDraftFilters] = useState<RealEstateFilterState>(filters);
  const copy = getCopy(locale);
  const activeCount = useMemo(() => getActiveRealEstateFilterCount(filters), [filters]);

  useEffect(() => {
    if (!open) {
      setDraftFilters(filters);
    }
  }, [filters, open]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleViewportChange = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    handleViewportChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);

      return () => {
        mediaQuery.removeEventListener('change', handleViewportChange);
      };
    }

    mediaQuery.addListener(handleViewportChange);

    return () => {
      mediaQuery.removeListener(handleViewportChange);
    };
  }, []);

  const updateDraft = <Key extends keyof RealEstateFilterState>(
    key: Key,
    value: RealEstateFilterState[Key]
  ) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleApply = () => {
    onApply(draftFilters);
    setOpen(false);
  };

  const handleClear = () => {
    setDraftFilters(EMPTY_REAL_ESTATE_FILTERS);
    onClear();
    setOpen(false);
  };

  const propertyTypeOptions = [
    { value: 'all', label: copy.anyPropertyType },
    { value: 'apartment', label: copy.apartment },
    { value: 'house', label: copy.house },
    { value: 'land', label: copy.land },
    { value: 'commercial', label: copy.commercial },
  ] as const;
  const listingTypeOptions = [
    { value: 'all', label: copy.anyListingType },
    { value: 'sale', label: copy.sale },
    { value: 'rent', label: copy.rent },
  ] as const;

  const roomOptions: Array<{ value: RealEstateRoomsFilter; label: string }> = [
    { value: 'any', label: copy.anyRooms },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4+', label: '4+' },
  ];
  const sheetSide = isMobileViewport ? 'bottom' : 'right';
  const sheetPanelClassName = 'rounded-[1.45rem] border border-white/10 bg-slate-700/90 p-4 text-white sm:p-5';
  const fieldClassName =
    'border-white/10 bg-slate-900/82 text-white placeholder:text-slate-400 shadow-none backdrop-blur-0 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 focus-visible:border-primary/45 focus-visible:ring-primary/30 focus-visible:ring-offset-0';
  const selectContentClassName =
    'border-white/10 bg-slate-900 text-white shadow-[0_24px_56px_rgba(2,6,23,0.48)] backdrop-blur-none';
  const selectItemClassName =
    'text-white hover:text-white focus:text-white data-[highlighted]:text-white data-[state=checked]:text-white';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant={buttonVariant}
          className={cn(
            'h-11 gap-2 rounded-[1.15rem] border-white/55 bg-background/80 px-4 shadow-none',
            buttonClassName
          )}
        >
          <Filter className="h-4 w-4" />
          {copy.filter}
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {activeCount} {copy.active}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent
        side={sheetSide}
        className={cn(
          'flex overflow-hidden border-white/10 bg-slate-900 p-0 text-white shadow-[0_32px_80px_rgba(2,6,23,0.58)] backdrop-blur-none [&>button]:border-white/10 [&>button]:bg-white/10 [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/15 [&>button]:data-[state=open]:bg-white/12',
          isMobileViewport
            ? 'h-[min(90dvh,860px)] flex-col rounded-t-[1.85rem] border-t'
            : 'h-full w-full flex-col border-l sm:max-w-xl'
        )}
      >
        <SheetHeader className="shrink-0 px-5 pb-4 pt-6 pr-14 sm:px-6">
          <SheetTitle className="text-white">{copy.title}</SheetTitle>
          <SheetDescription className="text-slate-300">{copy.description}</SheetDescription>
          <div className="pt-2">
            <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-blue-100">
              {activeCount > 0 ? `${activeCount} ${copy.active}` : copy.clear}
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
          <div className="grid gap-5 py-1">
            <div className={cn(sheetPanelClassName, 'grid grid-cols-1 gap-4 sm:grid-cols-2')}>
              <div className="space-y-2">
                <Label htmlFor="real-estate-price-min" className="text-white">
                  {copy.priceMin}
                </Label>
                <Input
                  id="real-estate-price-min"
                  className={fieldClassName}
                  inputMode="numeric"
                  placeholder="0"
                  value={draftFilters.priceMin}
                  onChange={(event) => updateDraft('priceMin', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="real-estate-price-max" className="text-white">
                  {copy.priceMax}
                </Label>
                <Input
                  id="real-estate-price-max"
                  className={fieldClassName}
                  inputMode="numeric"
                  placeholder="100000"
                  value={draftFilters.priceMax}
                  onChange={(event) => updateDraft('priceMax', event.target.value)}
                />
              </div>
            </div>

            <div className={cn(sheetPanelClassName, 'grid grid-cols-1 gap-4 sm:grid-cols-2')}>
              <div className="space-y-2">
                <Label htmlFor="real-estate-property-type" className="text-white">
                  {copy.propertyType}
                </Label>
                <Select
                  value={draftFilters.propertyType}
                  onValueChange={(value) =>
                    updateDraft('propertyType', value as RealEstateFilterState['propertyType'])
                  }
                >
                  <SelectTrigger id="real-estate-property-type" className={fieldClassName}>
                    <SelectValue placeholder={copy.anyPropertyType} />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {propertyTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className={selectItemClassName}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="real-estate-listing-type" className="text-white">
                  {copy.listingType}
                </Label>
                <Select
                  value={draftFilters.listingType}
                  onValueChange={(value) =>
                    updateDraft('listingType', value as RealEstateFilterState['listingType'])
                  }
                >
                  <SelectTrigger id="real-estate-listing-type" className={fieldClassName}>
                    <SelectValue placeholder={copy.anyListingType} />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {listingTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className={selectItemClassName}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="real-estate-rooms" className="text-white">
                  {copy.rooms}
                </Label>
                <Select
                  value={draftFilters.rooms}
                  onValueChange={(value) => updateDraft('rooms', value as RealEstateRoomsFilter)}
                >
                  <SelectTrigger id="real-estate-rooms" className={fieldClassName}>
                    <SelectValue placeholder={copy.anyRooms} />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {roomOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className={selectItemClassName}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={cn(sheetPanelClassName, 'grid gap-4')}>
              <div className="space-y-2">
                <Label htmlFor="real-estate-location" className="text-white">
                  {copy.location}
                </Label>
                <Input
                  id="real-estate-location"
                  className={fieldClassName}
                  placeholder={copy.location}
                  value={draftFilters.location}
                  onChange={(event) => updateDraft('location', event.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="real-estate-city" className="text-white">
                    {copy.city}
                  </Label>
                  <Input
                    id="real-estate-city"
                    className={fieldClassName}
                    placeholder={copy.city}
                    value={draftFilters.city}
                    onChange={(event) => updateDraft('city', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="real-estate-district" className="text-white">
                    {copy.district}
                  </Label>
                  <Input
                    id="real-estate-district"
                    className={fieldClassName}
                    placeholder={copy.district}
                    value={draftFilters.district}
                    onChange={(event) => updateDraft('district', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={cn(sheetPanelClassName, 'grid grid-cols-1 gap-4 sm:grid-cols-2')}>
              <div className="space-y-2">
                <Label htmlFor="real-estate-area-min" className="text-white">
                  {copy.areaMin}
                </Label>
                <Input
                  id="real-estate-area-min"
                  className={fieldClassName}
                  inputMode="numeric"
                  placeholder="0"
                  value={draftFilters.areaMin}
                  onChange={(event) => updateDraft('areaMin', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="real-estate-area-max" className="text-white">
                  {copy.areaMax}
                </Label>
                <Input
                  id="real-estate-area-max"
                  className={fieldClassName}
                  inputMode="numeric"
                  placeholder="500"
                  value={draftFilters.areaMax}
                  onChange={(event) => updateDraft('areaMax', event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="shrink-0 gap-3 border-t border-white/10 bg-slate-950 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:pb-4">
          <Button type="button" className="h-11 rounded-[1.15rem] bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleApply}>
            {copy.apply}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-[1.15rem] text-slate-100 hover:bg-white/10 hover:text-white"
            onClick={handleClear}
          >
            <RotateCcw className="h-4 w-4" />
            {copy.clear}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
