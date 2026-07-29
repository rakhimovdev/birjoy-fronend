import { getLocalizedText, type Language, type LocalizedText } from '@/lib/i18n';
import type { RealEstateListingType } from '@/lib/types';

export const REAL_ESTATE_LISTING_TYPE_ORDER: RealEstateListingType[] = [
  'sale',
  'rent',
  'daily',
  'mortgage',
];

export const REAL_ESTATE_LISTING_TYPE_LABELS: Record<RealEstateListingType, LocalizedText> = {
  sale: {
    uz: 'Sotuv',
    ru: 'Продажа',
    en: 'Sale',
  },
  rent: {
    uz: 'Ijara',
    ru: 'Аренда',
    en: 'Rent',
  },
  daily: {
    uz: 'Kunlik',
    ru: 'Посуточно',
    en: 'Daily',
  },
  mortgage: {
    uz: 'Ipoteka',
    ru: 'Ипотека',
    en: 'Mortgage',
  },
};

export function isRealEstateListingType(value: string | null | undefined): value is RealEstateListingType {
  return REAL_ESTATE_LISTING_TYPE_ORDER.includes(value as RealEstateListingType);
}

export function getRealEstateListingTypeLabel(
  value: RealEstateListingType | '' | null | undefined,
  locale: Language
) {
  if (!value) {
    return '';
  }

  const label = REAL_ESTATE_LISTING_TYPE_LABELS[value];
  return label ? getLocalizedText(label, locale) : '';
}
