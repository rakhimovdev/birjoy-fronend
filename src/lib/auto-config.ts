import type {
  AutoCategory,
  AutoEngineUnit,
  AutoFuelType,
  AutoTransmission,
  Category,
} from '@/lib/types';
import type { Language, LocalizedText } from '@/lib/i18n';

export const AUTO_MIN_MANUFACTURE_YEAR = 1950;

type AutoCategoryDefinition = {
  id: string;
  slug: AutoCategory;
  icon: string;
  name: LocalizedText;
  aliases: string[];
};

type AutoOptionDefinition<Value extends string> = {
  value: Value;
  label: LocalizedText;
  aliases: string[];
};

function normalizeKey(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export const AUTO_CATEGORY_DEFINITIONS: AutoCategoryDefinition[] = [
  {
    id: 'auto-1',
    slug: 'passenger_car',
    icon: 'CarFront',
    name: {
      uz: 'Yengil mashina',
      ru: 'Легковая машина',
      en: 'Passenger car',
    },
    aliases: ['passenger_car', 'cars', 'car', 'passenger', 'light_car'],
  },
  {
    id: 'auto-2',
    slug: 'foreign_car',
    icon: 'BadgeInfo',
    name: {
      uz: 'Inomarka',
      ru: 'Иномарка',
      en: 'Foreign car',
    },
    aliases: ['foreign_car', 'inomarka', 'foreign', 'foreign_auto'],
  },
  {
    id: 'auto-3',
    slug: 'truck',
    icon: 'Truck',
    name: {
      uz: 'Yuk mashina',
      ru: 'Грузовик',
      en: 'Truck',
    },
    aliases: ['truck', 'commercial_transport', 'commercial-transport', 'cargo'],
  },
  {
    id: 'auto-4',
    slug: 'special_equipment',
    icon: 'Tractor',
    name: {
      uz: 'Maxsus texnika',
      ru: 'Спецтехника',
      en: 'Special equipment',
    },
    aliases: ['special_equipment', 'special-equipment', 'special', 'maxsus_texnika'],
  },
  {
    id: 'auto-5',
    slug: 'motorcycle',
    icon: 'Bike',
    name: {
      uz: 'Motosikl',
      ru: 'Мотоцикл',
      en: 'Motorcycle',
    },
    aliases: ['motorcycle', 'motorcycles', 'moto', 'bike'],
  },
  {
    id: 'auto-6',
    slug: 'spare_parts',
    icon: 'Cog',
    name: {
      uz: 'Ehtiyot qismlar',
      ru: 'Запчасти',
      en: 'Spare parts',
    },
    aliases: ['spare_parts', 'spare-parts', 'parts', 'part', 'spare'],
  },
];

export const AUTO_FUEL_OPTIONS: Array<AutoOptionDefinition<AutoFuelType>> = [
  {
    value: 'methane',
    label: { uz: 'Metan', ru: 'Метан', en: 'Methane' },
    aliases: ['methane', 'metan'],
  },
  {
    value: 'propane',
    label: { uz: 'Propan', ru: 'Пропан', en: 'Propane' },
    aliases: ['propane', 'propan'],
  },
  {
    value: 'petrol',
    label: { uz: 'Benzin', ru: 'Бензин', en: 'Petrol' },
    aliases: ['petrol', 'benzin', 'benzin', 'gasoline'],
  },
  {
    value: 'electric',
    label: { uz: 'Elektr', ru: 'Электро', en: 'Electric' },
    aliases: ['electric', 'elektr'],
  },
  {
    value: 'hybrid',
    label: { uz: 'Gibrid', ru: 'Гибрид', en: 'Hybrid' },
    aliases: ['hybrid', 'gibrid'],
  },
  {
    value: 'diesel',
    label: { uz: 'Dizel', ru: 'Дизель', en: 'Diesel' },
    aliases: ['diesel', 'dizel', 'salarka', 'solyarka'],
  },
];

export const AUTO_TRANSMISSION_OPTIONS: Array<AutoOptionDefinition<AutoTransmission>> = [
  {
    value: 'manual',
    label: { uz: 'Mexanika', ru: 'Механика', en: 'Manual' },
    aliases: ['manual', 'mexanika', 'mechanical'],
  },
  {
    value: 'automatic',
    label: { uz: 'Avtomat', ru: 'Автомат', en: 'Automatic' },
    aliases: ['automatic', 'avtomat', 'auto'],
  },
];

export const AUTO_SPECIAL_EQUIPMENT_SUGGESTIONS = {
  uz: ['Traktor', 'O‘t o‘rish texnikasi', 'Muravey', 'Boshqa maxsus texnika'],
  ru: ['Трактор', 'Техника для покоса', 'Муравей', 'Другая спецтехника'],
  en: ['Tractor', 'Mowing equipment', 'Muravey', 'Other special equipment'],
} as const;

export const AUTO_ENGINE_UNIT_BY_CATEGORY: Record<AutoCategory, AutoEngineUnit | ''> = {
  passenger_car: 'L',
  foreign_car: 'L',
  truck: 'L',
  special_equipment: 'L',
  motorcycle: 'cc',
  spare_parts: '',
};

export function buildAutoCategories(): Category[] {
  return AUTO_CATEGORY_DEFINITIONS.map((category) => ({
    id: category.id,
    vertical: 'auto',
    slug: category.slug,
    icon: category.icon,
    name: category.name,
  }));
}

export function normalizeAutoCategory(value: string | null | undefined): AutoCategory | '' {
  const normalizedValue = normalizeKey(value);

  for (const category of AUTO_CATEGORY_DEFINITIONS) {
    if (category.aliases.map(normalizeKey).includes(normalizedValue)) {
      return category.slug;
    }
  }

  return '';
}

export function normalizeAutoFuelType(value: string | null | undefined): AutoFuelType | '' {
  const normalizedValue = normalizeKey(value);

  for (const option of AUTO_FUEL_OPTIONS) {
    if (option.aliases.map(normalizeKey).includes(normalizedValue)) {
      return option.value;
    }
  }

  return '';
}

export function normalizeAutoTransmission(value: string | null | undefined): AutoTransmission | '' {
  const normalizedValue = normalizeKey(value);

  for (const option of AUTO_TRANSMISSION_OPTIONS) {
    if (option.aliases.map(normalizeKey).includes(normalizedValue)) {
      return option.value;
    }
  }

  return '';
}

export function normalizeAutoEngineUnit(value: string | null | undefined): AutoEngineUnit | '' {
  const normalizedValue = normalizeKey(value);

  if (['cc', 'cm3', 'cm³', 'kub', 'kub_sm3'].includes(normalizedValue)) {
    return 'cc';
  }

  if (['l', 'liter', 'litre'].includes(normalizedValue)) {
    return 'L';
  }

  return '';
}

export function getAutoCategoryLabel(category: string | null | undefined, locale: Language) {
  const normalizedCategory = normalizeAutoCategory(category);
  return AUTO_CATEGORY_DEFINITIONS.find((item) => item.slug === normalizedCategory)?.name[locale] || '';
}

export function getAutoFuelLabel(fuelType: string | null | undefined, locale: Language) {
  const normalizedFuelType = normalizeAutoFuelType(fuelType);
  return AUTO_FUEL_OPTIONS.find((item) => item.value === normalizedFuelType)?.label[locale] || '';
}

export function getAutoTransmissionLabel(transmission: string | null | undefined, locale: Language) {
  const normalizedTransmission = normalizeAutoTransmission(transmission);
  return AUTO_TRANSMISSION_OPTIONS.find((item) => item.value === normalizedTransmission)?.label[locale] || '';
}

export function isAutoCategory(value: string | null | undefined): value is AutoCategory {
  return normalizeAutoCategory(value) !== '';
}

export function isSparePartsCategory(category: string | null | undefined) {
  return normalizeAutoCategory(category) === 'spare_parts';
}

export function isMotorcycleCategory(category: string | null | undefined) {
  return normalizeAutoCategory(category) === 'motorcycle';
}

export function isSpecialEquipmentCategory(category: string | null | undefined) {
  return normalizeAutoCategory(category) === 'special_equipment';
}

export function shouldShowAutoFuelField(category: string | null | undefined) {
  return Boolean(normalizeAutoCategory(category)) && !isSparePartsCategory(category);
}

export function shouldShowAutoYearField(category: string | null | undefined) {
  return Boolean(normalizeAutoCategory(category)) && !isSparePartsCategory(category);
}

export function shouldShowAutoEngineField(category: string | null | undefined) {
  return Boolean(normalizeAutoCategory(category)) && !isSparePartsCategory(category);
}

export function shouldShowAutoMileageField(category: string | null | undefined) {
  return Boolean(normalizeAutoCategory(category)) && !isSparePartsCategory(category);
}

export function shouldShowAutoTransmissionField(category: string | null | undefined) {
  const normalizedCategory = normalizeAutoCategory(category);
  return (
    normalizedCategory === 'passenger_car' ||
    normalizedCategory === 'foreign_car' ||
    normalizedCategory === 'truck'
  );
}

export function shouldShowSpecialEquipmentTypeField(category: string | null | undefined) {
  return isSpecialEquipmentCategory(category);
}

export function shouldShowCompatibleModelField(category: string | null | undefined) {
  return isSparePartsCategory(category);
}

export function getAutoEngineUnitForCategory(category: string | null | undefined): AutoEngineUnit | '' {
  const normalizedCategory = normalizeAutoCategory(category);
  return normalizedCategory ? AUTO_ENGINE_UNIT_BY_CATEGORY[normalizedCategory] : '';
}

export function buildManufactureYears(currentYear = new Date().getFullYear(), minYear = AUTO_MIN_MANUFACTURE_YEAR) {
  const years: number[] = [];

  for (let year = currentYear; year >= minYear; year -= 1) {
    years.push(year);
  }

  return years;
}

export function formatAutoMileage(mileage: number | null | undefined, locale: Language) {
  if (mileage === null || mileage === undefined || !Number.isFinite(mileage)) {
    return '';
  }

  const formatted = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'uz-UZ', {
    maximumFractionDigits: 0,
  }).format(mileage);

  return `${formatted} km`;
}

export function formatAutoEngineDisplacement(
  value: number | null | undefined,
  unit: AutoEngineUnit | '' | null | undefined,
  locale: Language
) {
  if (value === null || value === undefined || !Number.isFinite(value) || !unit) {
    return '';
  }

  const maximumFractionDigits = unit === 'L' ? 1 : 0;
  const formatted = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'uz-UZ', {
    minimumFractionDigits: unit === 'L' && value % 1 !== 0 ? 1 : 0,
    maximumFractionDigits,
  }).format(value);

  return unit === 'cc' ? `${formatted} sm³` : `${formatted} L`;
}
