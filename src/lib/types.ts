export type Category = {
  id: string;
  name: string;
  icon: string;
  slug: string;
};

export type Ad = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  images: string[];
  userId: string;
  userName: string;
  createdAt: string;
  isFeatured?: boolean;
  status: 'active' | 'pending' | 'flagged';
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  phone?: string;
  location?: string;
  favorites: string[]; // Ad IDs
};