import type { LocalizedText } from './i18n';
import type { AdVertical, Category } from './types';

export type MarketplaceVerticalConfig = {
  id: AdVertical;
  slug: string;
  icon: string;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
};

function createCategory(
  id: string,
  vertical: AdVertical,
  slug: string,
  icon: string,
  name: LocalizedText
): Category {
  return {
    id,
    vertical,
    slug,
    icon,
    name,
  };
}

export const MARKETPLACE_VERTICALS: MarketplaceVerticalConfig[] = [
  {
    id: 'real_estate',
    slug: 'uy-joy',
    icon: 'Building2',
    name: {
      uz: 'Uy-joy',
      ru: 'Жильё',
      en: 'Real Estate',
    },
    tagline: {
      uz: 'Kvartira, hovli va ofislar',
      ru: 'Квартиры, дома и офисы',
      en: 'Apartments, homes, and offices',
    },
    description: {
      uz: 'Har bir eʼlon xaritada, aniq manzil va narx bilan ko‘rinadi.',
      ru: 'Каждое объявление видно на карте с точным адресом и ценой.',
      en: 'Every listing appears on the map with a clear address and price.',
    },
  },
  {
    id: 'market',
    slug: 'market',
    icon: 'ShoppingBasket',
    name: {
      uz: 'Market',
      ru: 'Маркет',
      en: 'Market',
    },
    tagline: {
      uz: 'Elektronika, moda va kundalik xaridlar',
      ru: 'Электроника, мода и повседневные товары',
      en: 'Electronics, fashion, and everyday goods',
    },
    description: {
      uz: 'Hozirgi marketplace katalogi shu yerda saqlanadi.',
      ru: 'Текущий каталог маркетплейса остаётся здесь.',
      en: 'The current marketplace catalog lives here.',
    },
  },
  {
    id: 'food',
    slug: 'taomlar',
    icon: 'UtensilsCrossed',
    name: {
      uz: 'Taomlar',
      ru: 'Еда',
      en: 'Food',
    },
    tagline: {
      uz: 'Restoranlar, uy oshxonasi va grocery',
      ru: 'Рестораны, домашняя кухня и продукты',
      en: 'Restaurants, home kitchens, and groceries',
    },
    description: {
      uz: 'Yetkazib berishga tayyor taom va mahsulotlarni alohida to‘plang.',
      ru: 'Соберите предложения по еде и продуктам в отдельной витрине.',
      en: 'Group food and grocery offers into a dedicated surface.',
    },
  },
  {
    id: 'auto',
    slug: 'avtomobil',
    icon: 'CarFront',
    name: {
      uz: 'Avtomobil',
      ru: 'Авто',
      en: 'Auto',
    },
    tagline: {
      uz: 'Mashina, moto va ehtiyot qismlar',
      ru: 'Авто, мото и запчасти',
      en: 'Cars, motorcycles, and parts',
    },
    description: {
      uz: 'Transport uchun alohida vertikal va aniq kategoriyalar.',
      ru: 'Отдельный вертикаль и точные категории для транспорта.',
      en: 'A dedicated transport vertical with focused categories.',
    },
  },
];

export const MARKET_CATEGORIES: Category[] = [
  createCategory('market-1', 'market', 'electronics', 'Smartphone', {
    uz: 'Elektronika',
    ru: 'Электроника',
    en: 'Electronics',
  }),
  createCategory('market-2', 'market', 'fashion', 'Shirt', {
    uz: 'Moda',
    ru: 'Мода',
    en: 'Fashion',
  }),
  createCategory('market-3', 'market', 'hobby-sport', 'Dumbbell', {
    uz: 'Sport',
    ru: 'Спорт',
    en: 'Sport',
  }),
  createCategory('market-4', 'market', 'home-garden', 'Lamp', {
    uz: 'Uy va bog‘',
    ru: 'Дом и сад',
    en: 'Home & Garden',
  }),
  createCategory('market-5', 'market', 'services', 'Wrench', {
    uz: 'Xizmatlar',
    ru: 'Услуги',
    en: 'Services',
  }),
  createCategory('market-6', 'market', 'jobs', 'Briefcase', {
    uz: 'Ish',
    ru: 'Работа',
    en: 'Jobs',
  }),
];

export const REAL_ESTATE_CATEGORIES: Category[] = [
  createCategory('estate-1', 'real_estate', 'apartment', 'Building2', {
    uz: 'Kvartira',
    ru: 'Квартира',
    en: 'Apartment',
  }),
  createCategory('estate-2', 'real_estate', 'house', 'House', {
    uz: 'Hovli',
    ru: 'Дом',
    en: 'House',
  }),
  createCategory('estate-3', 'real_estate', 'land', 'Trees', {
    uz: 'Yer uchastkasi',
    ru: 'Участок',
    en: 'Land',
  }),
  createCategory('estate-4', 'real_estate', 'commercial', 'Building', {
    uz: 'Tijorat',
    ru: 'Коммерческая',
    en: 'Commercial',
  }),
];

export const FOOD_CATEGORIES: Category[] = [
  createCategory('food-1', 'food', 'restaurants', 'Store', {
    uz: 'Restoranlar',
    ru: 'Рестораны',
    en: 'Restaurants',
  }),
  createCategory('food-2', 'food', 'home-cooking', 'ChefHat', {
    uz: 'Uy oshxonasi',
    ru: 'Домашняя кухня',
    en: 'Home Cooking',
  }),
  createCategory('food-3', 'food', 'groceries', 'PackageSearch', {
    uz: 'Grocery',
    ru: 'Продукты',
    en: 'Groceries',
  }),
];

export const AUTO_CATEGORIES: Category[] = [
  createCategory('auto-1', 'auto', 'cars', 'CarFront', {
    uz: 'Yengil avtomobil',
    ru: 'Легковые авто',
    en: 'Cars',
  }),
  createCategory('auto-2', 'auto', 'motorcycles', 'Bike', {
    uz: 'Moto',
    ru: 'Мото',
    en: 'Motorcycles',
  }),
  createCategory('auto-3', 'auto', 'parts', 'Cog', {
    uz: 'Ehtiyot qismlar',
    ru: 'Запчасти',
    en: 'Parts',
  }),
  createCategory('auto-4', 'auto', 'commercial-transport', 'Truck', {
    uz: 'Tijoriy transport',
    ru: 'Коммерческий транспорт',
    en: 'Commercial Transport',
  }),
];

const LEGACY_MARKET_CATEGORIES: Category[] = [
  createCategory('legacy-1', 'market', 'vehicles', 'Car', {
    uz: 'Transport',
    ru: 'Транспорт',
    en: 'Vehicles',
  }),
  createCategory('legacy-2', 'market', 'real-estate', 'Home', {
    uz: 'Ko‘chmas mulk',
    ru: 'Недвижимость',
    en: 'Real Estate',
  }),
];

export const CATEGORIES = MARKET_CATEGORIES;
export const ALL_CATEGORIES: Category[] = [
  ...MARKET_CATEGORIES,
  ...REAL_ESTATE_CATEGORIES,
  ...FOOD_CATEGORIES,
  ...AUTO_CATEGORIES,
  ...LEGACY_MARKET_CATEGORIES,
];

export const REAL_ESTATE_DEFAULT_CENTER = {
  lat: 41.3111,
  lng: 69.2797,
};

export function getVerticalById(verticalId: AdVertical) {
  return MARKETPLACE_VERTICALS.find((vertical) => vertical.id === verticalId);
}

export function getVerticalBySlug(slug: string) {
  return MARKETPLACE_VERTICALS.find((vertical) => vertical.slug === slug);
}

export function getVerticalHref(verticalId: AdVertical) {
  const vertical = getVerticalById(verticalId);
  return vertical ? `/${vertical.slug}` : '/market';
}

export function getCategoriesForVertical(verticalId: AdVertical) {
  if (verticalId === 'real_estate') {
    return REAL_ESTATE_CATEGORIES;
  }

  if (verticalId === 'food') {
    return FOOD_CATEGORIES;
  }

  if (verticalId === 'auto') {
    return AUTO_CATEGORIES;
  }

  return MARKET_CATEGORIES;
}

export function getCategoryBySlug(slug: string) {
  return ALL_CATEGORIES.find((category) => category.slug === slug);
}
