import type { LocalizedText } from './i18n';

export type AdVertical = 'market' | 'real_estate' | 'food' | 'auto';
export type RealEstatePropertyType = 'apartment' | 'house' | 'land' | 'commercial';
export type RealEstateListingType = 'sale' | 'rent' | 'daily' | 'mortgage';
export type AreaUnit = 'm2' | 'sotix';
export type UserAccountType = 'regular' | 'realtor';
export type PostingPermissions = {
  market: boolean;
  food: boolean;
};

export type Category = {
  id: string;
  name: LocalizedText;
  icon: string;
  slug: string;
  vertical: AdVertical;
};

export type Ad = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  price: number;
  category: string;
  vertical: AdVertical;
  condition: 'new' | 'like-new' | 'used' | 'needs-repair';
  location: LocalizedText;
  address: LocalizedText;
  formattedAddress: LocalizedText;
  city: LocalizedText;
  district: LocalizedText;
  country: LocalizedText;
  latitude: number | null;
  longitude: number | null;
  propertyType: RealEstatePropertyType | '';
  listingType: RealEstateListingType | '';
  rooms: number | null;
  area: number | null;
  areaUnit: AreaUnit;
  floor: number | null;
  images: string[];
  userId: string;
  userName: string;
  sellerPhone: string;
  createdAt: string;
  isFeatured?: boolean;
  viewCount: number;
  contactCount: number;
  status: 'active' | 'pending' | 'flagged' | 'sold';
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  googleId?: string;
  yandexId?: string;
  role: 'user';
  accountType?: UserAccountType;
  createdAt?: string;
  updatedAt?: string;
  phone?: string;
  location?: LocalizedText;
  favorites: string[]; // Ad IDs
  postingPermissions: PostingPermissions;
};

export type OrderRequestStatus = 'new' | 'contacted' | 'completed';

export type OrderRequest = {
  id: string;
  adId: string;
  adTitle: string;
  adPrice: number;
  sellerName: string;
  sellerPhone: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerUserId: string;
  message: string;
  status: OrderRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type ChatParticipantRole = 'buyer' | 'seller';

export type ChatParticipant = {
  id: string;
  role: ChatParticipantRole;
  name: string;
  avatar?: string;
  phone?: string;
};

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderRole: ChatParticipantRole;
  createdAt: string;
  updatedAt: string;
};

export type ChatConversationSummary = {
  id: string;
  adId: string;
  adTitle: string;
  adPrice: number;
  adImage?: string;
  viewerRole: ChatParticipantRole;
  otherParticipant: ChatParticipant;
  seller: ChatParticipant;
  buyer: ChatParticipant;
  lastMessageText: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatConversation = ChatConversationSummary & {
  messages: ChatMessage[];
};

export type AdminProfile = {
  login: string;
  name: string;
  role: 'admin';
};
