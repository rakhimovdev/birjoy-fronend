import type { LocalizedText } from './i18n';

export type Category = {
  id: string;
  name: LocalizedText;
  icon: string;
  slug: string;
};

export type Ad = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  price: number;
  category: string;
  condition: 'new' | 'like-new' | 'used' | 'needs-repair';
  location: LocalizedText;
  images: string[];
  userId: string;
  userName: string;
  sellerPhone: string;
  createdAt: string;
  isFeatured?: boolean;
  status: 'active' | 'pending' | 'flagged';
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  googleId?: string;
  role: 'user';
  createdAt?: string;
  updatedAt?: string;
  phone?: string;
  location?: LocalizedText;
  favorites: string[]; // Ad IDs
};
