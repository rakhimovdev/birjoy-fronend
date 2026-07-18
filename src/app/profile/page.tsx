'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Download,
  Edit,
  Eye,
  Globe2,
  Headphones,
  Heart,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  Package,
  Phone,
  RefreshCcw,
  Share2,
  ShieldAlert,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCategoryBySlug, getVerticalById } from '@/lib/mock-data';
import { AdCard } from '@/components/ads/AdCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { getLocalizedText, isLanguage, languageMeta, languages, type Language } from '@/lib/i18n';
import { useI18n } from '@/components/providers/LocaleProvider';
import { fetchAds, getConditionLabel, invalidateAdsCache } from '@/lib/ads';
import { deleteCurrentUserAccount } from '@/lib/auth';
import { useAdminSession } from '@/hooks/use-admin-session';
import { cn } from '@/lib/utils';
import type { Ad } from '@/lib/types';

type DesktopProfileTab = 'ads' | 'favorites';
type MobileProfileTab = DesktopProfileTab | 'services';
type AdStatusFilter = 'all' | Ad['status'];
type AdSortFilter = 'newest' | 'oldest' | 'price-high' | 'price-low';
type VerticalFilter = 'all' | Ad['vertical'];
type PropertyTypeFilter = 'all' | Exclude<Ad['propertyType'], ''>;

const MOBILE_PROFILE_BACKGROUND = 'bg-[#050505]';
const MOBILE_PROFILE_CARD = 'rounded-[1.75rem] border border-white/8 bg-[#181818]';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const { user, isFavorite, isReady, signOut, updateProfile } = useAuth();
  const { toast } = useToast();
  const { locale, messages, setLocale } = useI18n();
  const { isAdmin } = useAdminSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab: DesktopProfileTab = searchParams.get('tab') === 'favorites' ? 'favorites' : 'ads';
  const favoriteIdsKey = user?.favorites.join('|') || '';

  const [myAds, setMyAds] = useState<Ad[]>([]);
  const [favoriteAds, setFavoriteAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [activeDesktopTab, setActiveDesktopTab] = useState<DesktopProfileTab>(defaultTab);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileProfileTab>(defaultTab);
  const [statusFilter, setStatusFilter] = useState<AdStatusFilter>('all');
  const [sortFilter, setSortFilter] = useState<AdSortFilter>('newest');
  const [verticalFilter, setVerticalFilter] = useState<VerticalFilter>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>('all');
  const [adsLoadNonce, setAdsLoadNonce] = useState(0);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    location: '',
  });

  const deleteAccountCopy = {
    uz: {
      title: 'Akkauntni o‘chirasizmi?',
      description:
        'Bu amal qaytarilmaydi. Profilingiz, eʼlonlaringiz va ushbu akkauntga bog‘langan buyurtmalar o‘chiriladi.',
      confirm: 'Akkauntni o‘chirish',
      cancel: 'Bekor qilish',
      successTitle: 'Akkaunt o‘chirildi',
      successDescription: 'Sizning maʼlumotlaringiz tizimdan olib tashlandi.',
      errorTitle: 'Akkaunt o‘chirilmadi',
    },
    ru: {
      title: 'Удалить аккаунт?',
      description:
        'Это действие необратимо. Профиль, объявления и связанные с аккаунтом заявки будут удалены.',
      confirm: 'Удалить аккаунт',
      cancel: 'Отмена',
      successTitle: 'Аккаунт удалён',
      successDescription: 'Ваши данные были удалены из системы.',
      errorTitle: 'Не удалось удалить аккаунт',
    },
    en: {
      title: 'Delete your account?',
      description:
        'This action cannot be undone. Your profile, listings, and account-linked orders will be deleted.',
      confirm: 'Delete account',
      cancel: 'Cancel',
      successTitle: 'Account deleted',
      successDescription: 'Your data has been removed from the system.',
      errorTitle: 'Account could not be deleted',
    },
  } as const;

  const settingsCopy =
    locale === 'ru'
      ? {
          description: 'Управляйте языком интерфейса, поддержкой и безопасностью аккаунта в одном месте.',
          languageTitle: 'Язык приложения',
          languageDescription: 'Измените язык интерфейса для всего маркетплейса и профиля.',
          supportTitle: 'Связаться с поддержкой',
          supportDescription: 'Позвоните, если нужна помощь с аккаунтом, заказами или публикацией объявлений.',
          exportTitle: 'Скачать мои данные',
          exportDescription: 'Сохраните свои объявления в JSON для личного архива.',
          dangerTitle: 'Опасная зона',
          dangerDescription: 'Удаление аккаунта навсегда удалит профиль, объявления и связанные заявки.',
        }
      : locale === 'en'
        ? {
            description: 'Manage app language, support, and account safety from one place.',
            languageTitle: 'App language',
            languageDescription: 'Change the interface language across the marketplace and your profile.',
            supportTitle: 'Contact support',
            supportDescription: 'Call for help with your account, orders, or publishing listings.',
            exportTitle: 'Download my data',
            exportDescription: 'Save your listings as JSON for your own records.',
            dangerTitle: 'Danger zone',
            dangerDescription: 'Deleting your account permanently removes your profile, listings, and linked requests.',
          }
        : {
            description: 'Til, support va akkaunt xavfsizligi bilan bog‘liq amallarni bir joydan boshqaring.',
            languageTitle: 'Ilova tili',
            languageDescription: 'Marketplace va profilingizdagi interfeys tilini shu yerdan almashtiring.',
            supportTitle: 'Qo‘llab-quvvatlash bilan bog‘lanish',
            supportDescription: 'Akkaunt, buyurtma yoki eʼlon joylash bo‘yicha yordam kerak bo‘lsa qo‘ng‘iroq qiling.',
            exportTitle: "Ma'lumotlarimni yuklab olish",
            exportDescription: "Eʼlonlaringizni JSON ko‘rinishida shaxsiy arxiv uchun saqlab oling.",
            dangerTitle: 'Xavfli bo‘lim',
            dangerDescription: 'Akkauntni o‘chirish profilingizni, eʼlonlaringizni va bog‘liq so‘rovlarni butunlay olib tashlaydi.',
          };

  const editProfileCopy =
    locale === 'ru'
      ? {
          title: 'Редактировать профиль',
          description: 'Обновите имя, телефон и локацию, которые видят покупатели и продавцы.',
          name: 'Имя',
          phone: 'Телефон',
          location: 'Локация',
          save: 'Сохранить изменения',
          cancel: 'Отмена',
          successTitle: 'Профиль обновлён',
          successDescription: 'Изменения сразу сохранены в вашем аккаунте.',
          errorTitle: 'Не удалось обновить профиль',
        }
      : locale === 'en'
        ? {
            title: 'Edit profile',
            description: 'Update the name, phone, and location shown across your marketplace account.',
            name: 'Name',
            phone: 'Phone',
            location: 'Location',
            save: 'Save changes',
            cancel: 'Cancel',
            successTitle: 'Profile updated',
            successDescription: 'Your account details were saved successfully.',
            errorTitle: 'Profile update failed',
          }
        : {
            title: 'Profilni tahrirlash',
            description: 'Marketplace akkauntingizda ko‘rinadigan ism, telefon va joylashuvni yangilang.',
            name: 'Ism',
            phone: 'Telefon',
            location: 'Joylashuv',
            save: 'O‘zgarishlarni saqlash',
            cancel: 'Bekor qilish',
            successTitle: 'Profil yangilandi',
            successDescription: 'Akkauntingizdagi maʼlumotlar darhol saqlandi.',
            errorTitle: 'Profilni yangilab bo‘lmadi',
          };

  const mobileCopy =
    locale === 'ru'
      ? {
          listings: 'Объявления',
          views: 'Просмотры',
          calls: 'Звонки',
          sales: 'Продажи',
          balance: 'Баланс',
          topUp: 'Пополнить',
          package: 'Пакет',
          adsTab: 'Мои объявления',
          servicesTab: 'Управление',
          favoritesTab: 'Избранное',
          status: 'Статус',
          sort: 'Сортировка',
          vertical: 'Раздел',
          propertyType: 'Тип жилья',
          allStatuses: 'Все статусы',
          activeStatus: 'Активные',
          soldStatus: 'Проданные',
          pendingStatus: 'На модерации',
          flaggedStatus: 'Скрытые',
          newest: 'Сначала новые',
          oldest: 'Сначала старые',
          expensive: 'Сначала дороже',
          cheap: 'Сначала дешевле',
          allVerticals: 'Все разделы',
          allPropertyTypes: 'Все типы',
          contacts: 'Контакты',
          contactsDescription: 'Данные, которые видят покупатели и продавцы.',
          filtersEmptyTitle: 'Под фильтр ничего не найдено',
          filtersEmptyDescription: 'Сбросьте фильтры или выберите другие параметры.',
          clearFilters: 'Сбросить фильтры',
          shareSuccessTitle: 'Ссылка скопирована',
          shareSuccessDescription: 'Профилем можно поделиться.',
          shareErrorTitle: 'Не удалось поделиться профилем',
          shareErrorDescription: 'Попробуйте ещё раз через пару секунд.',
          soonTitle: 'Скоро будет',
          topUpDescription: 'Пополнение баланса подключим в следующих обновлениях.',
          packageDescription: 'Пакеты продвижения добавим в ближайших обновлениях.',
          tabHint: 'Быстрое управление объявлениями, избранным и настройками.',
          shareAria: 'Поделиться профилем',
          editAria: 'Редактировать профиль',
          menuAria: 'Открыть управление',
        }
      : locale === 'en'
        ? {
            listings: 'Listings',
            views: 'Views',
            calls: 'Calls',
            sales: 'Sales',
            balance: 'Balance',
            topUp: 'Top up',
            package: 'Package',
            adsTab: 'My listings',
            servicesTab: 'Manage',
            favoritesTab: 'Favorites',
            status: 'Status',
            sort: 'Sort',
            vertical: 'Section',
            propertyType: 'Property type',
            allStatuses: 'All statuses',
            activeStatus: 'Active',
            soldStatus: 'Sold',
            pendingStatus: 'Pending',
            flaggedStatus: 'Hidden',
            newest: 'Newest first',
            oldest: 'Oldest first',
            expensive: 'Highest price',
            cheap: 'Lowest price',
            allVerticals: 'All sections',
            allPropertyTypes: 'All types',
            contacts: 'Contacts',
            contactsDescription: 'The details buyers and sellers can see.',
            filtersEmptyTitle: 'No listings match these filters',
            filtersEmptyDescription: 'Reset the filters or pick different values.',
            clearFilters: 'Clear filters',
            shareSuccessTitle: 'Profile link copied',
            shareSuccessDescription: 'You can share it anywhere now.',
            shareErrorTitle: 'Unable to share the profile',
            shareErrorDescription: 'Please try again in a moment.',
            soonTitle: 'Coming soon',
            topUpDescription: 'Balance top-up will be available in a future update.',
            packageDescription: 'Promotion packages will arrive in the next updates.',
            tabHint: 'Quick access to your listings, favorites, and settings.',
            shareAria: 'Share profile',
            editAria: 'Edit profile',
            menuAria: 'Open profile management',
          }
        : {
            listings: 'Eʼlonlar',
            views: 'Ko‘rishlar',
            calls: 'Qo‘ng‘iroqlar',
            sales: 'Sotuvlar',
            balance: 'Balans',
            topUp: 'To‘ldirish',
            package: 'Paket',
            adsTab: "Mening e'lonlarim",
            servicesTab: 'Boshqaruv',
            favoritesTab: 'Saqlanganlar',
            status: 'Status',
            sort: 'Saralash',
            vertical: 'Bo‘lim',
            propertyType: 'Mulk turi',
            allStatuses: 'Barcha statuslar',
            activeStatus: 'Faol',
            soldStatus: 'Sotilgan',
            pendingStatus: 'Moderatsiyada',
            flaggedStatus: 'Yashirilgan',
            newest: 'Yangi birinchi',
            oldest: 'Eski birinchi',
            expensive: 'Qimmat birinchi',
            cheap: 'Arzon birinchi',
            allVerticals: 'Barcha bo‘limlar',
            allPropertyTypes: 'Barcha turlar',
            contacts: 'Kontaktlar',
            contactsDescription: 'Xaridor va sotuvchilar ko‘radigan maʼlumotlar.',
            filtersEmptyTitle: 'Filtrga mos eʼlon topilmadi',
            filtersEmptyDescription: 'Filtrlarni tozalab yoki boshqa qiymatlarni tanlang.',
            clearFilters: 'Filtrlarni tozalash',
            shareSuccessTitle: 'Profil havolasi nusxalandi',
            shareSuccessDescription: 'Endi uni xohlagan joyga yuborishingiz mumkin.',
            shareErrorTitle: 'Profilni ulashib bo‘lmadi',
            shareErrorDescription: 'Bir necha soniyadan keyin yana urinib ko‘ring.',
            soonTitle: 'Tez orada',
            topUpDescription: 'Balansni to‘ldirish keyingi yangilanishlarda qo‘shiladi.',
            packageDescription: 'Promoushen paketlari tez orada qo‘shiladi.',
            tabHint: 'Eʼlonlar, saqlanganlar va sozlamalarga tez kirish.',
            shareAria: 'Profilni ulashish',
            editAria: 'Profilni tahrirlash',
            menuAria: 'Profil boshqaruvini ochish',
          };

  const propertyTypeLabels = useMemo(
    () => ({
      apartment: locale === 'ru' ? 'Квартира' : locale === 'en' ? 'Apartment' : 'Kvartira',
      house: locale === 'ru' ? 'Дом' : locale === 'en' ? 'House' : 'Hovli',
      land: locale === 'ru' ? 'Участок' : locale === 'en' ? 'Land' : 'Yer',
      commercial: locale === 'ru' ? 'Коммерция' : locale === 'en' ? 'Commercial' : 'Tijorat',
    }),
    [locale]
  );
  const retryAdsLabel = locale === 'ru' ? 'Повторить' : locale === 'en' ? 'Retry' : 'Qayta urinish';

  useEffect(() => {
    setActiveDesktopTab(defaultTab);
    setActiveMobileTab((currentTab) => (currentTab === 'services' ? currentTab : defaultTab));
  }, [defaultTab]);

  const handleRetryAds = () => {
    invalidateAdsCache();
    setAdsLoadNonce((currentValue) => currentValue + 1);
  };

  useEffect(() => {
    const abortController = new AbortController();

    async function loadAds() {
      if (!isReady) {
        return;
      }

      if (!user?.id) {
        setMyAds([]);
        setFavoriteAds([]);
        setAdsError(null);
        setIsLoadingAds(false);
        return;
      }

      try {
        setIsLoadingAds(true);
        const [myListings, favoriteListings] = await Promise.all([
          fetchAds({
            userId: user.id,
            fields: 'full',
            limit: 100,
            signal: abortController.signal,
          }),
          user.favorites.length
            ? fetchAds({
                ids: user.favorites,
                fields: 'full',
                status: 'active',
                limit: Math.min(Math.max(user.favorites.length, 1), 100),
                signal: abortController.signal,
              })
            : Promise.resolve([]),
        ]);

        if (abortController.signal.aborted) {
          return;
        }

        setMyAds(myListings);
        setFavoriteAds(favoriteListings.filter((ad) => user.favorites.includes(ad.id)));
        setAdsError(null);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setMyAds([]);
        setFavoriteAds([]);
        setAdsError(error instanceof Error ? error.message : 'Unable to load ads.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingAds(false);
        }
      }
    }

    void loadAds();

    return () => {
      abortController.abort();
    };
  }, [adsLoadNonce, favoriteIdsKey, isReady, user]);

  useEffect(() => {
    if (!isReady || !user?.id) {
      return;
    }

    const refreshAds = () => {
      invalidateAdsCache();
      setAdsLoadNonce((currentValue) => currentValue + 1);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAds();
      }
    };

    window.addEventListener('focus', refreshAds);
    window.addEventListener('pageshow', refreshAds);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshAds);
      window.removeEventListener('pageshow', refreshAds);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isReady, user?.id]);

  useEffect(() => {
    if (!user || !isEditProfileOpen) {
      return;
    }

    setProfileForm({
      name: user.name,
      phone: user.phone || '',
      location: user.location ? getLocalizedText(user.location, locale) : '',
    });
  }, [isEditProfileOpen, locale, user]);

  const filteredMyAds = useMemo(() => {
    const nextAds = myAds.filter((ad) => {
      if (statusFilter !== 'all' && ad.status !== statusFilter) {
        return false;
      }

      if (verticalFilter !== 'all' && ad.vertical !== verticalFilter) {
        return false;
      }

      if (propertyTypeFilter !== 'all' && ad.propertyType !== propertyTypeFilter) {
        return false;
      }

      return true;
    });

    nextAds.sort((left, right) => {
      if (sortFilter === 'oldest') {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }

      if (sortFilter === 'price-high') {
        return right.price - left.price;
      }

      if (sortFilter === 'price-low') {
        return left.price - right.price;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

    return nextAds;
  }, [myAds, propertyTypeFilter, sortFilter, statusFilter, verticalFilter]);

  const profileHandle = useMemo(() => {
    if (!user) {
      return 'birjoy_user';
    }

    const emailSegment = user.email.split('@')[0] || user.name;
    const normalizedHandle = emailSegment.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return normalizedHandle || `birjoy_${user.id.slice(-4)}`;
  }, [user]);

  const userLocation = user?.location ? getLocalizedText(user.location, locale) : '';
  const soldAdsCount = myAds.filter((ad) => ad.status === 'sold').length;
  const totalViewCount = myAds.reduce((sum, ad) => sum + ad.viewCount, 0);
  const totalContactCount = myAds.reduce((sum, ad) => sum + ad.contactCount, 0);
  const availableVerticals = [...new Set(myAds.map((ad) => ad.vertical))];
  const availablePropertyTypes = [...new Set(myAds.map((ad) => ad.propertyType).filter(Boolean))] as Array<
    Exclude<Ad['propertyType'], ''>
  >;
  const statsFormatter = useMemo(
    () => new Intl.NumberFormat(languageMeta[locale].numberLocale),
    [locale]
  );

  const mobileStats = [
    { value: myAds.length, label: mobileCopy.listings, icon: Megaphone },
    { value: totalViewCount, label: mobileCopy.views, icon: Eye },
    { value: totalContactCount, label: mobileCopy.calls, icon: Phone },
    { value: soldAdsCount, label: mobileCopy.sales, icon: WalletCards },
  ] as const;

  if (!user) {
    return (
      <MarketplaceShell>
        <ProtectedRoute>
          <div />
        </ProtectedRoute>
      </MarketplaceShell>
    );
  }

  const handleAdDeleted = (adId: string) => {
    setMyAds((previous) => previous.filter((ad) => ad.id !== adId));
    setFavoriteAds((previous) => previous.filter((ad) => ad.id !== adId));
  };

  const handleAdUpdated = (updatedAd: Ad) => {
    setMyAds((previous) => previous.map((ad) => (ad.id === updatedAd.id ? updatedAd : ad)));
    setFavoriteAds((previous) => previous.map((ad) => (ad.id === updatedAd.id ? updatedAd : ad)));
  };

  const handleDownloadData = () => {
    const localizedListings = myAds.map((ad) => ({
      id: ad.id,
      title: getLocalizedText(ad.title, locale),
      description: getLocalizedText(ad.description, locale),
      price: ad.price,
      vertical: getLocalizedText(getVerticalById(ad.vertical)?.name ?? { uz: '', ru: '', en: '' }, locale),
      category: getLocalizedText(getCategoryBySlug(ad.category)?.name ?? { uz: '', ru: '', en: '' }, locale),
      condition: getConditionLabel(ad.condition, locale),
      location: getLocalizedText(ad.location, locale),
      address: getLocalizedText(ad.address, locale),
      latitude: ad.latitude,
      longitude: ad.longitude,
      sellerPhone: ad.sellerPhone,
      createdAt: ad.createdAt,
      status: ad.status,
    }));

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(localizedListings, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `birjoy-listings-${locale}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    toast({
      title: messages.profile.exportSuccessTitle,
      description: messages.profile.exportSuccessDescription,
    });
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);

    try {
      const result = await deleteCurrentUserAccount();

      if (!result.ok) {
        toast({
          title: deleteAccountCopy[locale].errorTitle,
          description: result.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: deleteAccountCopy[locale].successTitle,
        description: deleteAccountCopy[locale].successDescription,
      });
      router.replace('/');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    toast({
      title: messages.auth.signOutSuccessTitle,
      description: messages.auth.signOutSuccessDescription,
    });
    router.push('/');
  };

  const handleLocaleChange = (value: string) => {
    if (isLanguage(value)) {
      setLocale(value as Language);
    }
  };

  const handleProfileFieldChange = (field: 'name' | 'phone' | 'location', value: string) => {
    setProfileForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      const result = await updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        location: profileForm.location,
      });

      if (!result.ok) {
        toast({
          title: editProfileCopy.errorTitle,
          description: result.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: editProfileCopy.successTitle,
        description: editProfileCopy.successDescription,
      });
      setIsEditProfileOpen(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleShareProfile = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '/profile';
    const currentNavigator = typeof window !== 'undefined' ? window.navigator : undefined;

    try {
      if (currentNavigator?.share) {
        await currentNavigator.share({
          title: user.name,
          text: mobileCopy.tabHint,
          url: shareUrl,
        });
        return;
      }

      if (currentNavigator?.clipboard?.writeText) {
        await currentNavigator.clipboard.writeText(shareUrl);
        toast({
          title: mobileCopy.shareSuccessTitle,
          description: mobileCopy.shareSuccessDescription,
        });
        return;
      }

      throw new Error('Sharing unavailable');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      toast({
        title: mobileCopy.shareErrorTitle,
        description: mobileCopy.shareErrorDescription,
        variant: 'destructive',
      });
    }
  };

  const handleBalanceAction = (action: 'top-up' | 'package') => {
    toast({
      title: mobileCopy.soonTitle,
      description: action === 'top-up' ? mobileCopy.topUpDescription : mobileCopy.packageDescription,
    });
  };

  const resetMobileFilters = () => {
    setStatusFilter('all');
    setSortFilter('newest');
    setVerticalFilter('all');
    setPropertyTypeFilter('all');
  };

  return (
    <MarketplaceShell>
      <ProtectedRoute>
        <main className="marketplace-main">
          <section
            className={cn(
              'phone-nav-only min-[769px]:hidden mx-[calc(var(--page-gutter)*-1)] px-[var(--page-gutter)] pb-28 pt-3 text-white',
              MOBILE_PROFILE_BACKGROUND
            )}
          >
            <div className="space-y-6">
              <header className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-[1.5rem] font-black leading-none tracking-[-0.04em] sm:text-[1.7rem]">
                      {profileHandle}
                    </p>
                    <p className="mt-3 max-w-[17rem] text-sm text-white/55">{messages.profile.memberSince}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="touch-target flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                      aria-label={mobileCopy.shareAria}
                      onClick={() => void handleShareProfile()}
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="touch-target flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                      aria-label={mobileCopy.editAria}
                      onClick={() => setIsEditProfileOpen(true)}
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="touch-target flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                      aria-label={mobileCopy.menuAria}
                      onClick={() => setActiveMobileTab('services')}
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-white/45">{mobileCopy.tabHint}</p>
              </header>

              <section className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24 shrink-0 border-2 border-white/20 bg-white/10">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-white/10 text-xl font-bold text-white">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-1">
                    <h1 className="break-words text-[1.35rem] font-extrabold leading-tight tracking-[-0.03em]">
                      {user.name}
                    </h1>
                    {userLocation ? <p className="text-sm text-white/55">{userLocation}</p> : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {mobileStats.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label} className={cn(MOBILE_PROFILE_CARD, 'p-3')}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[2rem] font-black tracking-[-0.05em]">
                            {isLoadingAds ? '...' : statsFormatter.format(item.value)}
                          </span>
                          <Icon className="mt-1 h-5 w-5 text-white/45" />
                        </div>
                        <p className="mt-3 text-[1.05rem] text-white/88">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={cn(MOBILE_PROFILE_CARD, 'overflow-hidden p-4')}>
                <div className="rounded-[1.45rem] bg-white/7 px-4 py-5 text-center text-[1.35rem] font-extrabold">
                  {mobileCopy.balance}: 0 so&apos;m
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex min-h-14 items-center justify-center rounded-full bg-black px-4 text-base font-semibold text-white transition-transform hover:scale-[0.99]"
                    onClick={() => handleBalanceAction('top-up')}
                  >
                    {mobileCopy.topUp}
                  </button>
                  <button
                    type="button"
                    className="flex min-h-14 items-center justify-center rounded-full bg-gradient-to-r from-[#ffd21f] via-[#ffe15e] to-[#fff4aa] px-4 text-base font-extrabold text-black transition-transform hover:scale-[0.99]"
                    onClick={() => handleBalanceAction('package')}
                  >
                    {mobileCopy.package}
                  </button>
                </div>
              </section>

              <section className="space-y-4">
                <div className="grid grid-cols-3 gap-4 border-b border-white/10">
                  {[
                    { value: 'ads', label: mobileCopy.adsTab, icon: Building2 },
                    { value: 'services', label: mobileCopy.servicesTab, icon: WalletCards },
                    { value: 'favorites', label: mobileCopy.favoritesTab, icon: Heart },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeMobileTab === tab.value;

                    return (
                      <button
                        key={tab.value}
                        type="button"
                        className={cn(
                          'flex flex-col items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-center transition-colors',
                          isActive ? 'border-white text-white' : 'border-transparent text-white/48'
                        )}
                        onClick={() => setActiveMobileTab(tab.value as MobileProfileTab)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {activeMobileTab === 'ads' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AdStatusFilter)}>
                        <SelectTrigger className="h-14 rounded-[1.3rem] border-white/10 bg-[#232323] px-4 text-left text-sm font-semibold text-white shadow-none">
                          <SelectValue placeholder={mobileCopy.status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{mobileCopy.allStatuses}</SelectItem>
                          <SelectItem value="active">{mobileCopy.activeStatus}</SelectItem>
                          <SelectItem value="sold">{mobileCopy.soldStatus}</SelectItem>
                          <SelectItem value="pending">{mobileCopy.pendingStatus}</SelectItem>
                          <SelectItem value="flagged">{mobileCopy.flaggedStatus}</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={sortFilter} onValueChange={(value) => setSortFilter(value as AdSortFilter)}>
                        <SelectTrigger className="h-14 rounded-[1.3rem] border-white/10 bg-[#232323] px-4 text-left text-sm font-semibold text-white shadow-none">
                          <SelectValue placeholder={mobileCopy.sort} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">{mobileCopy.newest}</SelectItem>
                          <SelectItem value="oldest">{mobileCopy.oldest}</SelectItem>
                          <SelectItem value="price-high">{mobileCopy.expensive}</SelectItem>
                          <SelectItem value="price-low">{mobileCopy.cheap}</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={verticalFilter} onValueChange={(value) => setVerticalFilter(value as VerticalFilter)}>
                        <SelectTrigger className="h-14 rounded-[1.3rem] border-white/10 bg-[#232323] px-4 text-left text-sm font-semibold text-white shadow-none">
                          <SelectValue placeholder={mobileCopy.vertical} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{mobileCopy.allVerticals}</SelectItem>
                          {availableVerticals.map((vertical) => (
                            <SelectItem key={vertical} value={vertical}>
                              {getLocalizedText(getVerticalById(vertical)?.name ?? { uz: '', ru: '', en: '' }, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={propertyTypeFilter}
                        onValueChange={(value) => setPropertyTypeFilter(value as PropertyTypeFilter)}
                      >
                        <SelectTrigger className="h-14 rounded-[1.3rem] border-white/10 bg-[#232323] px-4 text-left text-sm font-semibold text-white shadow-none">
                          <SelectValue placeholder={mobileCopy.propertyType} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{mobileCopy.allPropertyTypes}</SelectItem>
                          {availablePropertyTypes.map((propertyType) => (
                            <SelectItem key={propertyType} value={propertyType}>
                              {propertyTypeLabels[propertyType]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="property-listing-grid">
                      {isLoadingAds ? (
                        <div className={cn(MOBILE_PROFILE_CARD, 'col-span-full py-16 text-center')}>
                          <Package className="mx-auto mb-4 h-12 w-12 text-white/40" />
                          <h3 className="text-lg font-semibold">{messages.profile.loadingListings}</h3>
                        </div>
                      ) : adsError ? (
                        <div className={cn(MOBILE_PROFILE_CARD, 'col-span-full py-16 text-center')}>
                          <Package className="mx-auto mb-4 h-12 w-12 text-white/40" />
                          <p className="mx-auto max-w-sm text-sm text-white/65">{adsError}</p>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-6 min-h-12 rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
                            onClick={handleRetryAds}
                          >
                            <RefreshCcw className="h-4 w-4" />
                            {retryAdsLabel}
                          </Button>
                        </div>
                      ) : filteredMyAds.length > 0 ? (
                        filteredMyAds.map((ad) => (
                          <AdCard
                            key={ad.id}
                            ad={ad}
                            isFavorite={isFavorite(ad.id)}
                            canDelete={isAdmin}
                            onDeleted={handleAdDeleted}
                            onUpdated={handleAdUpdated}
                          />
                        ))
                      ) : (
                        <div className={cn(MOBILE_PROFILE_CARD, 'col-span-full px-5 py-10 text-center')}>
                          <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
                            <span className="absolute left-4 top-5 h-4 w-4 rounded-full bg-[#ffd84e]" />
                            <span className="absolute right-6 top-3 h-2 w-2 rounded-full bg-[#ffd84e]" />
                            <span className="absolute right-2 top-16 h-4 w-4 rounded-full bg-[#ffd84e]" />
                            <span className="absolute bottom-3 left-7 h-3 w-3 rounded-full bg-[#ffd84e]" />
                            <span className="absolute bottom-0 right-9 h-2.5 w-2.5 rounded-full bg-[#ffd84e]" />
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#ffd84e]/10 text-[#ffd84e]">
                              <Building2 className="h-10 w-10" />
                            </div>
                          </div>
                          <h3 className="text-[1.65rem] font-bold leading-tight">
                            {myAds.length > 0 ? mobileCopy.filtersEmptyTitle : messages.profile.noAdsYet}
                          </h3>
                          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/60">
                            {myAds.length > 0 ? mobileCopy.filtersEmptyDescription : messages.profile.noAdsDescription}
                          </p>
                          <div className="mt-6 flex justify-center">
                            {myAds.length > 0 ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-12 rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
                                onClick={resetMobileFilters}
                              >
                                {mobileCopy.clearFilters}
                              </Button>
                            ) : (
                              <Button asChild className="min-h-12 rounded-full px-6">
                                <Link href="/ads/create">{messages.profile.postFirstAd}</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {activeMobileTab === 'favorites' ? (
                  <div className="property-listing-grid">
                    {isLoadingAds ? (
                      <div className={cn(MOBILE_PROFILE_CARD, 'col-span-full py-16 text-center')}>
                        <Heart className="mx-auto mb-4 h-12 w-12 text-white/40" />
                        <h3 className="text-lg font-semibold">{messages.profile.loadingListings}</h3>
                      </div>
                    ) : adsError ? (
                      <div className={cn(MOBILE_PROFILE_CARD, 'col-span-full py-16 text-center')}>
                        <Heart className="mx-auto mb-4 h-12 w-12 text-white/40" />
                        <p className="mx-auto max-w-sm text-sm text-white/65">{adsError}</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-6 min-h-12 rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
                          onClick={handleRetryAds}
                        >
                          <RefreshCcw className="h-4 w-4" />
                          {retryAdsLabel}
                        </Button>
                      </div>
                    ) : favoriteAds.length > 0 ? (
                      favoriteAds.map((ad) => (
                        <AdCard
                          key={ad.id}
                          ad={ad}
                          isFavorite={isFavorite(ad.id)}
                          canDelete={isAdmin}
                          onDeleted={handleAdDeleted}
                          onUpdated={handleAdUpdated}
                        />
                      ))
                    ) : (
                      <div className={cn(MOBILE_PROFILE_CARD, 'col-span-full px-5 py-10 text-center')}>
                        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-white/5 text-[#ffd84e]">
                          <Heart className="h-10 w-10" />
                        </div>
                        <h3 className="text-[1.65rem] font-bold leading-tight">{messages.profile.emptyFavorites}</h3>
                        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/60">
                          {messages.profile.emptyFavoritesDescription}
                        </p>
                        <div className="mt-6 flex justify-center">
                          <Button
                            asChild
                            variant="outline"
                            className="min-h-12 rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
                          >
                            <Link href="/">{messages.profile.exploreMarket}</Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {activeMobileTab === 'services' ? (
                  <div className="space-y-4">
                    <div className={cn(MOBILE_PROFILE_CARD, 'p-4')}>
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-white/6 p-3 text-white">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">{mobileCopy.contacts}</p>
                          <p className="mt-1 text-sm text-white/55">{mobileCopy.contactsDescription}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3 rounded-[1.35rem] bg-white/4 p-4 text-sm text-white/72">
                        <div className="flex items-center gap-2 break-all">
                          <Mail className="h-4 w-4 shrink-0 text-white/48" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0 text-white/48" />
                            <span>{user.phone}</span>
                          </div>
                        ) : null}
                        {userLocation ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-white/48" />
                            <span>{userLocation}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className={cn(MOBILE_PROFILE_CARD, 'p-4')}>
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-white/6 p-3 text-white">
                          <Globe2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">{settingsCopy.languageTitle}</p>
                          <p className="mt-1 text-sm text-white/55">{settingsCopy.languageDescription}</p>
                        </div>
                      </div>

                      <Select value={locale} onValueChange={handleLocaleChange}>
                        <SelectTrigger className="mt-4 h-12 rounded-[1.1rem] border-white/10 bg-white/5 text-white shadow-none">
                          <SelectValue placeholder={messages.navbar.language} />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((language) => (
                            <SelectItem key={language} value={language}>
                              {languageMeta[language].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <a
                      href="tel:+998332580404"
                      className={cn(MOBILE_PROFILE_CARD, 'block p-4 transition-colors hover:bg-white/8')}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-white/6 p-3 text-white">
                          <Headphones className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">{settingsCopy.supportTitle}</p>
                          <p className="mt-1 text-sm leading-6 text-white/55">{settingsCopy.supportDescription}</p>
                        </div>
                      </div>
                    </a>

                    <button
                      type="button"
                      className={cn(MOBILE_PROFILE_CARD, 'block w-full p-4 text-left transition-colors hover:bg-white/8')}
                      onClick={handleDownloadData}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-white/6 p-3 text-white">
                          <Download className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">{settingsCopy.exportTitle}</p>
                          <p className="mt-1 text-sm leading-6 text-white/55">{settingsCopy.exportDescription}</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={cn(
                        MOBILE_PROFILE_CARD,
                        'block w-full p-4 text-left transition-colors hover:bg-white/8'
                      )}
                      onClick={handleSignOut}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-white/6 p-3 text-white">
                          <LogOut className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">{messages.navbar.logOut}</p>
                          <p className="mt-1 text-sm leading-6 text-white/55">
                            {messages.auth.signOutSuccessDescription}
                          </p>
                        </div>
                      </div>
                    </button>

                    <div className="rounded-[1.75rem] border border-red-500/20 bg-red-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-red-500/10 p-3 text-red-300">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">{settingsCopy.dangerTitle}</p>
                          <p className="mt-1 text-sm leading-6 text-white/60">{settingsCopy.dangerDescription}</p>
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-red-500/90 px-4 text-sm font-semibold text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                            {messages.profile.deleteAccount}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{deleteAccountCopy[locale].title}</AlertDialogTitle>
                            <AlertDialogDescription>{deleteAccountCopy[locale].description}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{deleteAccountCopy[locale].cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={isDeletingAccount}
                              onClick={() => void handleDeleteAccount()}
                            >
                              {deleteAccountCopy[locale].confirm}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>

          <div className="hidden min-[769px]:block">
            <div className="surface-card section-shell rounded-[1.9rem]">
              <div className="section-header__copy">
                <p className="section-kicker">{messages.navbar.profile}</p>
                <h1 className="page-title font-bold text-primary">{messages.navbar.profile}</h1>
                <p className="body-lead max-w-3xl text-muted-foreground">{messages.profile.memberSince}</p>
              </div>
            </div>

            <div className="page-grid profile-grid">
              <div className="page-stack">
                <Card className="surface-card rounded-[1.9rem] border-none shadow-none">
                  <CardContent className="flex flex-col items-center p-5 pt-8 text-center sm:p-6 sm:pt-8">
                    <Avatar className="mb-4 h-24 w-24 border-4 border-primary/10">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-bold">{user.name}</h2>
                    <p className="mb-4 text-sm text-muted-foreground">{messages.profile.memberSince}</p>
                    <Badge variant="secondary" className="mb-6">
                      {messages.profile.verifiedSeller}
                    </Badge>

                    <div className="w-full space-y-3 px-2 text-left text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="break-all">{user.email}</span>
                      </div>
                      {user.phone ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{user.phone}</span>
                        </div>
                      ) : null}
                      {userLocation ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{userLocation}</span>
                        </div>
                      ) : null}
                    </div>

                    <Button
                      className="mt-8 min-h-12 w-full gap-2"
                      variant="outline"
                      onClick={() => setIsEditProfileOpen(true)}
                    >
                      <Edit className="h-4 w-4" />
                      {messages.profile.editProfile}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="surface-card rounded-[1.9rem] border-none shadow-none">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm">{messages.profile.accountSettings}</CardTitle>
                    <p className="text-sm text-muted-foreground">{settingsCopy.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <div className="soft-panel space-y-3 rounded-[1.4rem]">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                          <Globe2 className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{settingsCopy.languageTitle}</p>
                          <p className="text-sm text-muted-foreground">{settingsCopy.languageDescription}</p>
                        </div>
                      </div>
                      <Select value={locale} onValueChange={handleLocaleChange}>
                        <SelectTrigger className="h-11 rounded-[1rem] border-white/55 bg-background/80 shadow-none">
                          <SelectValue placeholder={messages.navbar.language} />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((language) => (
                            <SelectItem key={language} value={language}>
                              {languageMeta[language].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <a
                      href="tel:+998332580404"
                      className="soft-panel block rounded-[1.4rem] transition-colors hover:bg-primary/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                          <Headphones className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{settingsCopy.supportTitle}</p>
                          <p className="text-sm text-muted-foreground break-words">
                            {settingsCopy.supportDescription}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm">
                          {messages.navbar.callSupport}
                        </span>
                      </div>
                    </a>

                    <button
                      type="button"
                      className="soft-panel block w-full rounded-[1.4rem] text-left transition-colors hover:bg-primary/5"
                      onClick={handleDownloadData}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                          <Download className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{settingsCopy.exportTitle}</p>
                          <p className="text-sm text-muted-foreground break-words">
                            {settingsCopy.exportDescription}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="text-sm font-semibold text-primary">{messages.profile.downloadMyData}</span>
                      </div>
                    </button>

                    <div className="rounded-[1.4rem] border border-destructive/18 bg-destructive/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-destructive/10 p-2.5 text-destructive">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{settingsCopy.dangerTitle}</p>
                          <p className="text-sm text-muted-foreground">{settingsCopy.dangerDescription}</p>
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            className="mt-4 min-h-11 w-full justify-start gap-2 rounded-[1rem]"
                          >
                            <Trash2 className="h-4 w-4" />
                            {messages.profile.deleteAccount}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{deleteAccountCopy[locale].title}</AlertDialogTitle>
                            <AlertDialogDescription>{deleteAccountCopy[locale].description}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{deleteAccountCopy[locale].cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={isDeletingAccount}
                              onClick={() => void handleDeleteAccount()}
                            >
                              {deleteAccountCopy[locale].confirm}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="min-w-0">
                <Tabs
                  value={activeDesktopTab}
                  onValueChange={(value) => setActiveDesktopTab(value as DesktopProfileTab)}
                  className="w-full"
                >
                  <TabsList className="mb-6 grid h-auto w-full grid-cols-1 gap-2 rounded-[1.25rem] border border-border/70 bg-card/80 p-1.5 min-[481px]:grid-cols-2">
                    <TabsTrigger
                      value="ads"
                      className="min-h-12 gap-2 rounded-[1rem] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Package className="h-4 w-4" />
                      {messages.profile.myAdsTab} ({myAds.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="favorites"
                      className="min-h-12 gap-2 rounded-[1rem] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Heart className="h-4 w-4" />
                      {messages.profile.favoritesTab} ({favoriteAds.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="ads">
                    <div className="listing-grid">
                      {isLoadingAds ? (
                        <div className="surface-card col-span-full rounded-[1.75rem] py-20 text-center">
                          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                          <h3 className="mb-1 text-lg font-semibold">{messages.profile.loadingListings}</h3>
                        </div>
                      ) : adsError ? (
                        <div className="surface-card col-span-full rounded-[1.75rem] py-20 text-center">
                          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                          <p className="mx-auto max-w-xl text-muted-foreground">{adsError}</p>
                          <Button type="button" variant="outline" className="mt-6" onClick={handleRetryAds}>
                            <RefreshCcw className="h-4 w-4" />
                            {retryAdsLabel}
                          </Button>
                        </div>
                      ) : myAds.length > 0 ? (
                        myAds.map((ad) => (
                          <AdCard
                            key={ad.id}
                            ad={ad}
                            isFavorite={isFavorite(ad.id)}
                            canDelete={isAdmin}
                            onDeleted={handleAdDeleted}
                            onUpdated={handleAdUpdated}
                          />
                        ))
                      ) : (
                        <div className="surface-card col-span-full rounded-[1.75rem] py-20 text-center">
                          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                          <h3 className="mb-1 text-lg font-semibold">{messages.profile.noAdsYet}</h3>
                          <p className="mb-6 text-muted-foreground">{messages.profile.noAdsDescription}</p>
                          <Button asChild>
                            <Link href="/ads/create">{messages.profile.postFirstAd}</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="favorites">
                    <div className="listing-grid">
                      {isLoadingAds ? (
                        <div className="surface-card col-span-full rounded-[1.75rem] py-20 text-center">
                          <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                          <h3 className="mb-1 text-lg font-semibold">{messages.profile.loadingListings}</h3>
                        </div>
                      ) : adsError ? (
                        <div className="surface-card col-span-full rounded-[1.75rem] py-20 text-center">
                          <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                          <p className="mx-auto max-w-xl text-muted-foreground">{adsError}</p>
                          <Button type="button" variant="outline" className="mt-6" onClick={handleRetryAds}>
                            <RefreshCcw className="h-4 w-4" />
                            {retryAdsLabel}
                          </Button>
                        </div>
                      ) : favoriteAds.length > 0 ? (
                        favoriteAds.map((ad) => (
                          <AdCard
                            key={ad.id}
                            ad={ad}
                            isFavorite={isFavorite(ad.id)}
                            canDelete={isAdmin}
                            onDeleted={handleAdDeleted}
                            onUpdated={handleAdUpdated}
                          />
                        ))
                      ) : (
                        <div className="surface-card col-span-full rounded-[1.75rem] py-20 text-center">
                          <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                          <h3 className="mb-1 text-lg font-semibold">{messages.profile.emptyFavorites}</h3>
                          <p className="mb-6 text-muted-foreground">{messages.profile.emptyFavoritesDescription}</p>
                          <Button asChild variant="outline">
                            <Link href="/">{messages.profile.exploreMarket}</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </main>

        <Sheet open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
          <SheetContent
            side="bottom"
            className="mx-auto w-full max-w-2xl rounded-t-[2rem] border border-border/70 px-4 pb-6 pt-10 sm:px-6"
          >
            <SheetHeader className="text-left">
              <SheetTitle>{editProfileCopy.title}</SheetTitle>
              <SheetDescription>{editProfileCopy.description}</SheetDescription>
            </SheetHeader>

            <form className="mt-6 space-y-4" onSubmit={(event) => void handleSaveProfile(event)}>
              <div className="space-y-2">
                <Label htmlFor="profile-name">{editProfileCopy.name}</Label>
                <Input
                  id="profile-name"
                  value={profileForm.name}
                  onChange={(event) => handleProfileFieldChange('name', event.target.value)}
                  maxLength={80}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-phone">{editProfileCopy.phone}</Label>
                <Input
                  id="profile-phone"
                  value={profileForm.phone}
                  onChange={(event) => handleProfileFieldChange('phone', event.target.value)}
                  maxLength={40}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-location">{editProfileCopy.location}</Label>
                <Input
                  id="profile-location"
                  value={profileForm.location}
                  onChange={(event) => handleProfileFieldChange('location', event.target.value)}
                  maxLength={240}
                />
              </div>

              <SheetFooter className="gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  {editProfileCopy.cancel}
                </Button>
                <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={isSavingProfile}>
                  {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editProfileCopy.save}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </ProtectedRoute>
    </MarketplaceShell>
  );
}
