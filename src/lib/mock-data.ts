import { Category, Ad, UserProfile } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Electronics', icon: 'Smartphone', slug: 'electronics' },
  { id: '2', name: 'Vehicles', icon: 'Car', slug: 'vehicles' },
  { id: '3', name: 'Real Estate', icon: 'Home', slug: 'real-estate' },
  { id: '4', name: 'Jobs', icon: 'Briefcase', slug: 'jobs' },
  { id: '5', name: 'Fashion', icon: 'Shirt', slug: 'fashion' },
  { id: '6', name: 'Home & Garden', icon: 'Lamp', slug: 'home-garden' },
  { id: '7', name: 'Services', icon: 'Wrench', slug: 'services' },
  { id: '8', name: 'Hobby & Sport', icon: 'Dumbbell', slug: 'hobby-sport' },
];

export const MOCK_ADS: Ad[] = [
  {
    id: 'a1',
    title: 'iPhone 15 Pro Max - 256GB - Blue Titanium',
    description: 'Perfect condition, like new. Only used for 2 weeks. Comes with all accessories and box.',
    price: 1150,
    category: 'Electronics',
    location: 'Tashkent, Chilonzor',
    images: [PlaceHolderImages[1].imageUrl],
    userId: 'u1',
    userName: 'Akmal R.',
    createdAt: '2024-03-20T10:00:00Z',
    isFeatured: true,
    status: 'active'
  },
  {
    id: 'a2',
    title: 'Tesla Model 3 Performance 2023',
    description: 'Low mileage, zero accidents. Full self-driving capability included. Custom wheels.',
    price: 45000,
    category: 'Vehicles',
    location: 'Tashkent, Mirabad',
    images: [PlaceHolderImages[2].imageUrl],
    userId: 'u2',
    userName: 'Sarah K.',
    createdAt: '2024-03-19T14:30:00Z',
    status: 'active'
  },
  {
    id: 'a3',
    title: 'Modern 2-Bedroom Apartment in City Center',
    description: 'Beautiful views, renovated kitchen, underground parking included. Quiet neighborhood.',
    price: 1200,
    category: 'Real Estate',
    location: 'Tashkent, Yunusabad',
    images: [PlaceHolderImages[3].imageUrl],
    userId: 'u3',
    userName: 'Jamshid T.',
    createdAt: '2024-03-18T09:15:00Z',
    isFeatured: true,
    status: 'active'
  },
  {
    id: 'a4',
    title: 'MacBook Pro M3 Max 14-inch',
    description: 'Factory sealed. 36GB RAM, 1TB SSD. Space Black color. Full warranty.',
    price: 3200,
    category: 'Electronics',
    location: 'Samarkand',
    images: [PlaceHolderImages[4].imageUrl],
    userId: 'u1',
    userName: 'Akmal R.',
    createdAt: '2024-03-21T11:45:00Z',
    status: 'active'
  }
];

export const CURRENT_USER: UserProfile = {
  id: 'u1',
  name: 'Akmal Rahimov',
  email: 'akmal@example.com',
  photoUrl: PlaceHolderImages[5].imageUrl,
  phone: '+998 90 123 45 67',
  location: 'Tashkent',
  favorites: ['a2', 'a3']
};