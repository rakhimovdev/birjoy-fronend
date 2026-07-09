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
      rooms: 'Комнаты',
      location: 'Локация',
      city: 'Город',
      district: 'Район',
      areaMin: 'Площадь от',
      areaMax: 'Площадь до',
      anyPropertyType: 'Все типы',
      anyRooms: 'Любое количество',
      apartment: 'Квартира',
      house: 'Дом',
      land: 'Участок',
      commercial: 'Коммерческая',
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
      rooms: 'Rooms',
      location: 'Location',
      city: 'City',
      district: 'District',
      areaMin: 'Min area',
      areaMax: 'Max area',
      anyPropertyType: 'All property types',
      anyRooms: 'Any amount',
      apartment: 'Apartment',
      house: 'House',
      land: 'Land',
      commercial: 'Commercial',
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
    rooms: 'Xonalar',
    location: 'Joylashuv',
    city: 'Shahar',
    district: 'Tuman',
    areaMin: 'Maydon min',
    areaMax: 'Maydon max',
    anyPropertyType: 'Barcha turlar',
    anyRooms: 'Istalgan son',
    apartment: 'Kvartira',
    house: 'Hovli',
    land: 'Yer',
    commercial: 'Tijorat',
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
  const [draftFilters, setDraftFilters] = useState<RealEstateFilterState>(filters);
  const copy = getCopy(locale);
  const activeCount = useMemo(() => getActiveRealEstateFilterCount(filters), [filters]);

  useEffect(() => {
    if (!open) {
      setDraftFilters(filters);
    }
  }, [filters, open]);

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

  const roomOptions: Array<{ value: RealEstateRoomsFilter; label: string }> = [
    { value: 'any', label: copy.anyRooms },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4+', label: '4+' },
  ];

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
        side="right"
        className="w-full overflow-y-auto border-l-border/60 bg-background/95 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:max-w-xl"
      >
        <SheetHeader className="pr-12">
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{copy.description}</SheetDescription>
          <div className="pt-2">
            <span className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
              {activeCount > 0 ? `${activeCount} ${copy.active}` : copy.clear}
            </span>
          </div>
        </SheetHeader>

        <div className="grid gap-5 py-6">
          <div className="soft-panel grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="real-estate-price-min">{copy.priceMin}</Label>
              <Input
                id="real-estate-price-min"
                inputMode="numeric"
                placeholder="0"
                value={draftFilters.priceMin}
                onChange={(event) => updateDraft('priceMin', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="real-estate-price-max">{copy.priceMax}</Label>
              <Input
                id="real-estate-price-max"
                inputMode="numeric"
                placeholder="100000"
                value={draftFilters.priceMax}
                onChange={(event) => updateDraft('priceMax', event.target.value)}
              />
            </div>
          </div>

          <div className="soft-panel grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="real-estate-property-type">{copy.propertyType}</Label>
              <Select
                value={draftFilters.propertyType}
                onValueChange={(value) => updateDraft('propertyType', value as RealEstateFilterState['propertyType'])}
              >
                <SelectTrigger id="real-estate-property-type">
                  <SelectValue placeholder={copy.anyPropertyType} />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="real-estate-rooms">{copy.rooms}</Label>
              <Select
                value={draftFilters.rooms}
                onValueChange={(value) => updateDraft('rooms', value as RealEstateRoomsFilter)}
              >
                <SelectTrigger id="real-estate-rooms">
                  <SelectValue placeholder={copy.anyRooms} />
                </SelectTrigger>
                <SelectContent>
                  {roomOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="soft-panel grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="real-estate-location">{copy.location}</Label>
              <Input
                id="real-estate-location"
                placeholder={copy.location}
                value={draftFilters.location}
                onChange={(event) => updateDraft('location', event.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="real-estate-city">{copy.city}</Label>
                <Input
                  id="real-estate-city"
                  placeholder={copy.city}
                  value={draftFilters.city}
                  onChange={(event) => updateDraft('city', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="real-estate-district">{copy.district}</Label>
                <Input
                  id="real-estate-district"
                  placeholder={copy.district}
                  value={draftFilters.district}
                  onChange={(event) => updateDraft('district', event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="soft-panel grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="real-estate-area-min">{copy.areaMin}</Label>
              <Input
                id="real-estate-area-min"
                inputMode="numeric"
                placeholder="0"
                value={draftFilters.areaMin}
                onChange={(event) => updateDraft('areaMin', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="real-estate-area-max">{copy.areaMax}</Label>
              <Input
                id="real-estate-area-max"
                inputMode="numeric"
                placeholder="500"
                value={draftFilters.areaMax}
                onChange={(event) => updateDraft('areaMax', event.target.value)}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="sticky bottom-0 gap-3 border-t border-border/60 bg-background/95 pt-4">
          <Button type="button" variant="ghost" className="h-11 rounded-[1.15rem]" onClick={handleClear}>
            <RotateCcw className="h-4 w-4" />
            {copy.clear}
          </Button>
          <Button type="button" className="h-11 rounded-[1.15rem]" onClick={handleApply}>
            {copy.apply}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
