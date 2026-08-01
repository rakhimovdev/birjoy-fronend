import type { AreaUnit } from '@/lib/types';
import type { Language } from '@/lib/i18n';

const SOTIX_IN_M2 = 100;

export const DEFAULT_AREA_UNIT: AreaUnit = 'm2';

export function normalizeAreaUnit(value: string | null | undefined): AreaUnit {
  return value === 'sotix' ? 'sotix' : DEFAULT_AREA_UNIT;
}

function roundAreaValue(value: number) {
  return Number(value.toFixed(2));
}

export function convertAreaToStoredM2(value: number | null | undefined, unit: AreaUnit): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return unit === 'sotix' ? roundAreaValue(value * SOTIX_IN_M2) : roundAreaValue(value);
}

export function convertStoredM2ToDisplay(value: number | null | undefined, unit: AreaUnit): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return unit === 'sotix' ? roundAreaValue(value / SOTIX_IN_M2) : roundAreaValue(value);
}

export function getAreaUnitLabel(unit: AreaUnit, locale: Language) {
  if (unit === 'sotix') {
    return locale === 'ru' ? 'соток' : 'sotix';
  }

  return locale === 'ru' ? 'м²' : 'm²';
}

export function formatArea(
  valueInM2: number | null | undefined,
  unit: AreaUnit,
  locale: Language
) {
  const displayValue = convertStoredM2ToDisplay(valueInM2, unit);

  if (displayValue === null) {
    return '';
  }

  const formattedNumber = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'uz-UZ', {
    maximumFractionDigits: unit === 'sotix' ? 2 : 0,
  }).format(displayValue);

  return `${formattedNumber} ${getAreaUnitLabel(unit, locale)}`;
}
