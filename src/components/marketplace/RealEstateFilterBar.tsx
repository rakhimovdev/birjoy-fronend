'use client';

import {
    Building2,
    ChevronDown,
    Landmark,
    MapPinned,
    RotateCcw,
    Settings2,
    SlidersHorizontal,
    Coins,
    Ruler,
    DoorOpen,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/i18n';
import {
    EMPTY_REAL_ESTATE_FILTERS,
    getActiveRealEstateFilterCount,
    type RealEstateFilterState,
    type RealEstateRoomsFilter,
} from '@/lib/real-estate-filters';
import { getRealEstateListingTypeLabel } from '@/lib/real-estate-listing-types';

type RealEstateFilterBarProps = {
    locale: Language;
    filters: RealEstateFilterState;
    onApply: (filters: RealEstateFilterState) => void;
    onClear: () => void;
    onOpenMap: () => void;
};

function getCopy(language: Language) {
    if (language === 'ru') {
        return {
            searchPlaceholder: 'Шукать жильё, адрес или район...',
            clear: 'Сбросить',
            map: 'Карта',
            active: 'активно',
            propertyType: 'Тип жилья',
            mortgage: 'Ипотека',
            price: 'Цена',
            rooms: 'Комнаты',
            area: 'Площадь',
            listingType: 'Тип сделки',
            priceMin: 'Цена от',
            priceMax: 'Цена до',
            areaMin: 'Площадь от',
            areaMax: 'Площадь до',
            advanced: 'Все фильтры',
            apartment: 'Квартира',
            house: 'Дом',
            land: 'Участок',
            commercial: 'Коммерческая',
        };
    }

    if (language === 'en') {
        return {
            searchPlaceholder: 'Search homes, addresses, or districts...',
            clear: 'Reset',
            map: 'Map',
            active: 'active',
            propertyType: 'Property type',
            mortgage: 'Mortgage',
            price: 'Price',
            rooms: 'Rooms',
            area: 'Area',
            listingType: 'Deal type',
            priceMin: 'Min price',
            priceMax: 'Max price',
            areaMin: 'Min area',
            areaMax: 'Max area',
            advanced: 'All filters',
            apartment: 'Apartment',
            house: 'House',
            land: 'Land',
            commercial: 'Commercial',
        };
    }

    return {
        searchPlaceholder: 'Uy-joy, manzil yoki hudud qidirish...',
        clear: 'Tozalash',
        map: 'Xarita',
        active: 'faol',
        propertyType: 'Uy turi',
        mortgage: 'Ipoteka',
        price: 'Narx',
        rooms: 'Xonalar',
        area: 'Maydon',
        listingType: 'Bitim turi',
        priceMin: 'Narx min',
        priceMax: 'Narx max',
        areaMin: 'Maydon min',
        areaMax: 'Maydon max',
        advanced: 'Barcha filtrlar',
        apartment: 'Kvartira',
        house: 'Hovli',
        land: 'Yer',
        commercial: 'Tijorat',
    };
}

const SEGMENT_VALUES = ['sale', 'rent', 'daily'] as const;

export function RealEstateFilterBar({
    locale,
    filters,
    onApply,
    onClear,
    onOpenMap,
}: RealEstateFilterBarProps) {
    const [expanded, setExpanded] = useState(false);
    const copy = getCopy(locale);
    const activeCount = useMemo(() => getActiveRealEstateFilterCount(filters), [filters]);

    // Apply immediately on every change so listings refresh live.
    const apply = (next: RealEstateFilterState) => {
        onApply(next);
    };

    const update = <Key extends keyof RealEstateFilterState>(
        key: Key,
        value: RealEstateFilterState[Key]
    ) => {
        apply({ ...filters, [key]: value });
    };

    const handleSegmentChange = (value: string) => {
        update(
            'listingType',
            filters.listingType === value ? 'all' : (value as RealEstateFilterState['listingType'])
        );
    };

    const handleClear = () => {
        onClear();
    };

    const propertyTypeOptions = [
        { value: 'apartment', label: copy.apartment },
        { value: 'house', label: copy.house },
        { value: 'land', label: copy.land },
        { value: 'commercial', label: copy.commercial },
    ] as const;

    const roomOptions: Array<{ value: RealEstateRoomsFilter; label: string }> = [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4+', label: '4+' },
    ];

    const isMortgageActive = filters.listingType === 'mortgage';
    const hasPrice = Boolean(filters.priceMin.trim() || filters.priceMax.trim());
    const hasArea = Boolean(filters.areaMin.trim() || filters.areaMax.trim());
    const hasPropertyType = filters.propertyType !== 'all';
    const hasRooms = filters.rooms !== 'any';

    const chips = [
        {
            key: 'propertyType',
            icon: Building2,
            label: copy.propertyType,
            active: hasPropertyType,
        },
        {
            key: 'mortgage',
            icon: Landmark,
            label: copy.mortgage,
            active: isMortgageActive,
        },
        {
            key: 'price',
            icon: Coins,
            label: copy.price,
            active: hasPrice,
        },
        {
            key: 'rooms',
            icon: DoorOpen,
            label: copy.rooms,
            active: hasRooms,
        },
        {
            key: 'area',
            icon: Ruler,
            label: copy.area,
            active: hasArea,
        },
    ];

    const scrollToChip = (key: string) => {
        setExpanded(true);
        requestAnimationFrame(() => {
            const target = document.getElementById(`re-filter-section-${key}`);
            target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    };

    const fieldClassName =
        'h-11 rounded-[1.05rem] border border-white/10 bg-slate-900/82 text-white placeholder:text-slate-400 shadow-none backdrop-blur-0 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 focus-visible:border-primary/45 focus-visible:ring-primary/30 focus-visible:ring-offset-0';

    return (
        <section className="re-filter-bar">
            <div className="re-filter-bar__inner">
                {/* Search row */}
                <div className="re-filter-search-row">
                    <Button
                        type="button"
                        variant="secondary"
                        className="re-filter-map-btn"
                        onClick={onOpenMap}
                        aria-label={copy.map}
                        title={copy.map}
                    >
                        <MapPinned className="h-5 w-5" />
                        <span>{copy.map}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        className="re-filter-settings-btn"
                        onClick={() => setExpanded((value) => !value)}
                        aria-label={copy.advanced}
                        title={copy.advanced}
                    >
                        <Settings2 className="h-5 w-5" />
                        {activeCount > 0 ? (
                            <span className="re-filter-settings-count">{activeCount}</span>
                        ) : null}
                    </Button>
                </div>

                {/* Segmented control */}
                <div className="re-filter-segment" role="tablist" aria-label={copy.listingType}>
                    {SEGMENT_VALUES.map((value) => {
                        const isActive = filters.listingType === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                className="re-filter-segment-item"
                                data-active={isActive}
                                onClick={() => handleSegmentChange(value)}
                            >
                                {getRealEstateListingTypeLabel(value, locale)}
                            </button>
                        );
                    })}
                </div>

                {/* Filter chips */}
                <div className="re-filter-chips">
                    {chips.map((chip) => {
                        const Icon = chip.icon;
                        return (
                            <button
                                key={chip.key}
                                type="button"
                                className="re-filter-chip"
                                data-active={chip.active}
                                onClick={() => scrollToChip(chip.key)}
                            >
                                <Icon className="h-4 w-4" />
                                {chip.label}
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        className="re-filter-chip re-filter-chip--toggle"
                        data-active={expanded}
                        onClick={() => setExpanded((value) => !value)}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        {copy.advanced}
                        <ChevronDown
                            className={cn('re-filter-chip-chevron', expanded && 're-filter-chip-chevron--open')}
                        />
                    </button>
                </div>

                {/* Advanced panel */}
                <div
                    className={cn('re-filter-collapsible', expanded && 're-filter-collapsible--open')}
                    id="re-filter-advanced"
                >
                    <div className="re-filter-advanced">
                        {/* Property type */}
                        <div className="re-filter-section" id="re-filter-section-propertyType">
                            <div className="re-filter-section-head">
                                <Label className="re-filter-label">
                                    <Building2 className="h-4 w-4" />
                                    {copy.propertyType}
                                </Label>
                            </div>
                            <div className="re-filter-choice-grid">
                                {propertyTypeOptions.map((option) => {
                                    const isActive = filters.propertyType === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className="re-filter-choice"
                                            data-active={isActive}
                                            onClick={() => {
                                                update(
                                                    'propertyType',
                                                    isActive
                                                        ? 'all'
                                                        : (option.value as RealEstateFilterState['propertyType'])
                                                );
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mortgage toggle */}
                        <div className="re-filter-section" id="re-filter-section-mortgage">
                            <button
                                type="button"
                                className="re-filter-toggle"
                                data-active={isMortgageActive}
                                onClick={() => {
                                    update(
                                        'listingType',
                                        isMortgageActive
                                            ? 'all'
                                            : ('mortgage' as RealEstateFilterState['listingType'])
                                    );
                                }}
                            >
                                <Landmark className="h-5 w-5" />
                                <div className="min-w-0 flex-1 text-left">
                                    <p className="re-filter-toggle-title">{copy.mortgage}</p>
                                    <p className="re-filter-toggle-sub">
                                        {locale === 'ru'
                                            ? 'Показать только ипотечные'
                                            : locale === 'en'
                                                ? 'Show mortgage homes only'
                                                : 'Faqat ipoteka eʼlonlari'}
                                    </p>
                                </div>
                                <span className="re-filter-switch" data-active={isMortgageActive}>
                                    <span className="re-filter-switch__thumb" />
                                </span>
                            </button>
                        </div>

                        {/* Price */}
                        <div className="re-filter-section" id="re-filter-section-price">
                            <div className="re-filter-section-head">
                                <Label className="re-filter-label">
                                    <Coins className="h-4 w-4" />
                                    {copy.price}
                                </Label>
                            </div>
                            <div className="re-filter-field-grid">
                                <div className="space-y-2">
                                    <Label htmlFor="re-filter-price-min" className="re-filter-label--field">
                                        {copy.priceMin}
                                    </Label>
                                    <Input
                                        id="re-filter-price-min"
                                        className={fieldClassName}
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={filters.priceMin}
                                        onChange={(event) => update('priceMin', event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="re-filter-price-max" className="re-filter-label--field">
                                        {copy.priceMax}
                                    </Label>
                                    <Input
                                        id="re-filter-price-max"
                                        className={fieldClassName}
                                        inputMode="numeric"
                                        placeholder="100000"
                                        value={filters.priceMax}
                                        onChange={(event) => update('priceMax', event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rooms */}
                        <div className="re-filter-section" id="re-filter-section-rooms">
                            <div className="re-filter-section-head">
                                <Label className="re-filter-label">
                                    <DoorOpen className="h-4 w-4" />
                                    {copy.rooms}
                                </Label>
                            </div>
                            <div className="re-filter-choice-grid">
                                {roomOptions.map((option) => {
                                    const isActive = filters.rooms === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className="re-filter-choice"
                                            data-active={isActive}
                                            onClick={() => {
                                                update('rooms', isActive ? 'any' : option.value);
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Area */}
                        <div className="re-filter-section" id="re-filter-section-area">
                            <div className="re-filter-section-head">
                                <Label className="re-filter-label">
                                    <Ruler className="h-4 w-4" />
                                    {copy.area}
                                </Label>
                            </div>
                            <div className="re-filter-field-grid">
                                <div className="space-y-2">
                                    <Label htmlFor="re-filter-area-min" className="re-filter-label--field">
                                        {copy.areaMin}
                                    </Label>
                                    <Input
                                        id="re-filter-area-min"
                                        className={fieldClassName}
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={filters.areaMin}
                                        onChange={(event) => update('areaMin', event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="re-filter-area-max" className="re-filter-label--field">
                                        {copy.areaMax}
                                    </Label>
                                    <Input
                                        id="re-filter-area-max"
                                        className={fieldClassName}
                                        inputMode="numeric"
                                        placeholder="500"
                                        value={filters.areaMax}
                                        onChange={(event) => update('areaMax', event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="re-filter-actions">
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-11 flex-1 rounded-[1.15rem] text-slate-100 hover:bg-white/10 hover:text-white"
                                onClick={handleClear}
                            >
                                <RotateCcw className="h-4 w-4" />
                                {copy.clear}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
