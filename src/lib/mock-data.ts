import { Category, Ad, UserProfile } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const CATEGORIES: Category[] = [
  { id: '1', name: { uz: 'Elektronika', ru: 'Электроника', en: 'Electronics' }, icon: 'Smartphone', slug: 'electronics' },
  { id: '2', name: { uz: 'Transport', ru: 'Транспорт', en: 'Vehicles' }, icon: 'Car', slug: 'vehicles' },
  { id: '3', name: { uz: 'Ko‘chmas mulk', ru: 'Недвижимость', en: 'Real Estate' }, icon: 'Home', slug: 'real-estate' },
  { id: '4', name: { uz: 'Ish', ru: 'Работа', en: 'Jobs' }, icon: 'Briefcase', slug: 'jobs' },
  { id: '5', name: { uz: 'Moda', ru: 'Мода', en: 'Fashion' }, icon: 'Shirt', slug: 'fashion' },
  { id: '6', name: { uz: 'Uy va bog‘', ru: 'Дом и сад', en: 'Home & Garden' }, icon: 'Lamp', slug: 'home-garden' },
  { id: '7', name: { uz: 'Xizmatlar', ru: 'Услуги', en: 'Services' }, icon: 'Wrench', slug: 'services' },
  { id: '8', name: { uz: 'Hobbi va sport', ru: 'Хобби и спорт', en: 'Hobby & Sport' }, icon: 'Dumbbell', slug: 'hobby-sport' },
];

export const MOCK_ADS: Ad[] = [
  {
    id: 'a1',
    title: {
      uz: 'iPhone 15 Pro Max - 256GB - Moviy titanium',
      ru: 'iPhone 15 Pro Max - 256GB - синий титан',
      en: 'iPhone 15 Pro Max - 256GB - Blue Titanium',
    },
    description: {
      uz: 'Holati a’lo, deyarli yangi. Faqat 2 hafta ishlatilgan. Barcha aksessuarlar va qutisi bilan beriladi.',
      ru: 'Идеальное состояние, почти новый. Использовался только 2 недели. В комплекте все аксессуары и коробка.',
      en: 'Perfect condition, like new. Only used for 2 weeks. Comes with all accessories and box.',
    },
    price: 1150,
    category: 'electronics',
    condition: 'like-new',
    location: {
      uz: 'Toshkent, Chilonzor',
      ru: 'Ташкент, Чиланзар',
      en: 'Tashkent, Chilonzor',
    },
    images: [PlaceHolderImages[1].imageUrl],
    userId: 'u1',
    userName: 'Akmal R.',
    sellerPhone: '+998 90 123 45 67',
    createdAt: '2024-03-20T10:00:00Z',
    isFeatured: true,
    status: 'active'
  },
  {
    id: 'a2',
    title: {
      uz: 'Tesla Model 3 Performance 2023',
      ru: 'Tesla Model 3 Performance 2023',
      en: 'Tesla Model 3 Performance 2023',
    },
    description: {
      uz: 'Yurgani kam, avariyasiz. To‘liq self-driving funksiyasi mavjud. Maxsus disklar o‘rnatilgan.',
      ru: 'Небольшой пробег, без аварий. Полный self-driving включён. Установлены кастомные диски.',
      en: 'Low mileage, zero accidents. Full self-driving capability included. Custom wheels.',
    },
    price: 45000,
    category: 'vehicles',
    condition: 'used',
    location: {
      uz: 'Toshkent, Mirobod',
      ru: 'Ташкент, Мирабад',
      en: 'Tashkent, Mirabad',
    },
    images: [PlaceHolderImages[2].imageUrl],
    userId: 'u2',
    userName: 'Sarah K.',
    sellerPhone: '+998 91 222 33 44',
    createdAt: '2024-03-19T14:30:00Z',
    status: 'active'
  },
  {
    id: 'a3',
    title: {
      uz: 'Shahar markazida zamonaviy 2 xonali kvartira',
      ru: 'Современная 2-комнатная квартира в центре города',
      en: 'Modern 2-Bedroom Apartment in City Center',
    },
    description: {
      uz: 'Chiroyli manzara, ta’mirlangan oshxona, yerosti parkovkasi bor. Tinch va qulay hudud.',
      ru: 'Красивый вид, обновлённая кухня, есть подземная парковка. Тихий район.',
      en: 'Beautiful views, renovated kitchen, underground parking included. Quiet neighborhood.',
    },
    price: 1200,
    category: 'real-estate',
    condition: 'like-new',
    location: {
      uz: 'Toshkent, Yunusobod',
      ru: 'Ташкент, Юнусабад',
      en: 'Tashkent, Yunusabad',
    },
    images: [PlaceHolderImages[3].imageUrl],
    userId: 'u3',
    userName: 'Jamshid T.',
    sellerPhone: '+998 93 777 88 99',
    createdAt: '2024-03-18T09:15:00Z',
    isFeatured: true,
    status: 'active'
  },
  {
    id: 'a4',
    title: {
      uz: 'MacBook Pro M3 Max 14 dyuym',
      ru: 'MacBook Pro M3 Max 14 дюймов',
      en: 'MacBook Pro M3 Max 14-inch',
    },
    description: {
      uz: 'Zavod qadoqda. 36GB RAM, 1TB SSD. Space Black rang. To‘liq kafolat bilan.',
      ru: 'Заводская упаковка. 36GB RAM, 1TB SSD. Цвет Space Black. Полная гарантия.',
      en: 'Factory sealed. 36GB RAM, 1TB SSD. Space Black color. Full warranty.',
    },
    price: 3200,
    category: 'electronics',
    condition: 'new',
    location: {
      uz: 'Samarqand',
      ru: 'Самарканд',
      en: 'Samarkand',
    },
    images: [PlaceHolderImages[4].imageUrl],
    userId: 'u1',
    userName: 'Akmal R.',
    sellerPhone: '+998 90 123 45 67',
    createdAt: '2024-03-21T11:45:00Z',
    status: 'active'
  }
];

export const CURRENT_USER: UserProfile = {
  id: 'u1',
  name: 'Akmal Rahimov',
  email: 'akmal@example.com',
  avatar: PlaceHolderImages[5].imageUrl,
  role: 'user',
  createdAt: '2024-03-01T00:00:00Z',
  phone: '+998 90 123 45 67',
  location: {
    uz: 'Toshkent',
    ru: 'Ташкент',
    en: 'Tashkent',
  },
  favorites: ['a2', 'a3']
};

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function getAdById(id: string) {
  return MOCK_ADS.find((ad) => ad.id === id);
}
