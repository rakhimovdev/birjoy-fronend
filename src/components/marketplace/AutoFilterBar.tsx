'use client';

import {
    ArrowUpDown,
    Cog,
    Fuel,
    RotateCcw,
    Search,
    Settings2,
} from 'lucide-react';
import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/i18n';
import { getLocalizedText } from '@/lib/i18n';
import { AUTO_FUEL_OPTIONS, AUTO_TRANSMISSION_OPTIONS } from '@/lib/auto-config';

type AutoFilterBarProps = {
    locale: Language;
    searchQuery: string;
    sort: string;
    fuelType: string;
    transmission: string;
    onSearch: (query: string) => void;
    onSortChange: (value: string) => void;
    onFuelChange: (value: string) => void;
    onTransmissionChange: (value: string) => void;
    onClear: () => void;
};

function getCopy(language: Language) {
    if (language === 'ru') {
        return {
            searchPlaceholder: 'Поиск авто, марки или года...',
            clear: 'Сбросить',
            sort: 'Сортировка',
            fuel: 'Топливо',
            transmission: 'Коробка',
            anyFuel: 'Любое топливо',
            anyTransmission: 'Любая коробка',
            newest: 'Сначала новые',
            priceAsc: 'Цена ↑',
            priceDesc: 'Цена ↓',
            yearDesc: 'Год ↓',
            mileageAsc: 'Пробег ↑',
        };
    }

    if (language === 'en') {
        return {
            searchPlaceholder: 'Search cars, makes, or years...',
            clear: 'Reset',
            sort: 'Sort',
            fuel: 'Fuel',
            transmission: 'Transmission',
            anyFuel: 'Any fuel',
            anyTransmission: 'Any transmission',
            newest: 'Newest first',
            priceAsc: 'Price ↑',
            priceDesc: 'Price ↓',
            yearDesc: 'Year ↓',
            mileageAsc: 'Mileage ↑',
        };
    }

    return {
        searchPlaceholder: 'Avtomobil, rusum yoki yil qidirish...',
        clear: 'Tozalash',
        sort: 'Saralash',
        fuel: 'Yonilg‘i',
        transmission: 'Uzatish qutisi',
        anyFuel: 'Har qanday yoqilg‘i',
        anyTransmission: 'Har qanday quti',
        newest: 'Eng yangi birinchi',
        priceAsc: 'Narx ↑',
        priceDesc: 'Narx ↓',
        yearDesc: 'Yil ↓',
        mileageAsc: 'Yurgan masofa ↑',
    };
}

const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc'] as const;

export function AutoFilterBar({
    locale,
    searchQuery,
    sort,
    fuelType,
    transmission,
    onSearch,
    onSortChange,
    onFuelChange,
    onTransmissionChange,
    onClear,
}: AutoFilterBarProps) {
    const [expanded, setExpanded] = useState(false);
    const [focused, setFocused] = useState(false);
    const copy = getCopy(locale);

    const hasFuel = fuelType !== 'all' && Boolean(fuelType);
    const hasTransmission = transmission !== 'all' && Boolean(transmission);
    const hasSort = sort !== 'newest';
    const activeCount = [hasFuel, hasTransmission, hasSort].filter(Boolean).length;

    const sortLabel = (value: string) => {
        switch (value) {
            case 'price_asc':
                return copy.priceAsc;
            case 'price_desc':
                return copy.priceDesc;
            case 'year_desc':
                return copy.yearDesc;
            case 'mileage_asc':
                return copy.mileageAsc;
            default:
                return copy.newest;
        }
    };

    const fieldClassName =
        'h-11 rounded-[1.05rem] border border-white/10 bg-slate-900/82 text-white placeholder:text-slate-400 shadow-none backdrop-blur-0 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 focus-visible:border-primary/45 focus-visible:ring-primary/30 focus-visible:ring-offset-0';
    const selectContentClassName =
        'border-white/10 bg-slate-900 text-white shadow-[0_24px_56px_rgba(2,6,23,0.48)] backdrop-blur-none';
    const selectItemClassName =
        'text-white hover:text-white focus:text-white data-[highlighted]:text-white data-[state=checked]:text-white';

    return (
        <section className="re-filter-bar">
            <div className="re-filter-bar__inner">
                {/* Search row */}
                <div className="re-filter-search-row">
                    <div className="re-filter-search-field" data-focused={focused}>
                        <Search className="re-filter-search-icon" />
                        <Input
                            type="search"
                            inputMode="search"
                            autoComplete="off"
                            value={searchQuery}
                            placeholder={copy.searchPlaceholder}
                            onChange={(event) => onSearch(event.target.value)}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            className="re-filter-search-input"
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                className="re-filter-search-clear"
                                aria-label={copy.clear}
                                onClick={() => onSearch('')}
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        ) : null}
                    </div>

                    <Button
                        type="button"
                        variant="secondary"
                        className="re-filter-settings-btn"
                        onClick={() => setExpanded((value) => !value)}
                    >
                        <Settings2 className="h-5 w-5" />
                        {activeCount > 0 ? (
                            <span className="re-filter-settings-count">{activeCount}</span>
                        ) : null}
                    </Button>
                </div>

                {/* Advanced panel */}
                <div
                    className={cn('re-filter-collapsible', expanded && 're-filter-collapsible--open')}
                    id="auto-filter-advanced"
                >
                    <div className="re-filter-advanced">
                        {/* Sort */}
                        <div className="re-filter-section" id="auto-filter-section-sort">
                            <div className="re-filter-section-head">
                                <Label className="re-filter-label">
                                    <ArrowUpDown className="h-4 w-4" />
                                    {copy.sort}
                                </Label>
                            </div>
                            <Select value={sort} onValueChange={(value) => onSortChange(value)}>
                                <SelectTrigger className={fieldClassName}>
                                    <SelectValue>{sortLabel(sort)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className={selectContentClassName}>
                                    {SORT_OPTIONS.map((value) => (
                                        <SelectItem key={value} value={value} className={selectItemClassName}>
                                            {sortLabel(value)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Fuel */}
                        <div className="re-filter-section" id="auto-filter-section-fuel">
                            <div className="re-filter-section-head">
                                <Label className="re-filter-label">
                                    <Fuel className="h-4 w-4" />
                                    {copy.fuel}
                                </Label>
                            </div>
                            <Select value={fuelType} onValueChange={(value) => onFuelChange(value)}>
                                <SelectTrigger className={fieldClassName}>
                                    <SelectValue placeholder={copy.anyFuel} />
                                </SelectTrigger>
                                <SelectContent className={selectContentClassName}>
                                    <SelectItem value="all" className={selectItemClassName}>
                                        {copy.anyFuel}
                                    </SelectItem>
                                    {AUTO_FUEL_OPTIONS.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                            className={selectItemClassName}
                                        >
                                            {getLocalizedText(option.label, locale)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Transmission */}
                        <div className="re-filter-section" id="auto-filter-section-transmission">
                            <div className="re-filter-section-head">
                                <Label className="re-filter-label">
                                    <Cog className="h-4 w-4" />
                                    {copy.transmission}
                                </Label>
                            </div>
                            <Select
                                value={transmission}
                                onValueChange={(value) => onTransmissionChange(value)}
                            >
                                <SelectTrigger className={fieldClassName}>
                                    <SelectValue placeholder={copy.anyTransmission} />
                                </SelectTrigger>
                                <SelectContent className={selectContentClassName}>
                                    <SelectItem value="all" className={selectItemClassName}>
                                        {copy.anyTransmission}
                                    </SelectItem>
                                    {AUTO_TRANSMISSION_OPTIONS.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                            className={selectItemClassName}
                                        >
                                            {getLocalizedText(option.label, locale)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Footer actions */}
                        <div className="re-filter-actions">
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-11 flex-1 rounded-[1.15rem] text-slate-100 hover:bg-white/10 hover:text-white"
                                onClick={onClear}
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
