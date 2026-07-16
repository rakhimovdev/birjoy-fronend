'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
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
import { Download, Edit, Globe2, Headphones, Heart, Loader2, Mail, MapPin, Package, Phone, ShieldAlert, Trash2 } from 'lucide-react';
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
import { fetchAds, getConditionLabel } from '@/lib/ads';
import { deleteCurrentUserAccount } from '@/lib/auth';
import { useAdminSession } from '@/hooks/use-admin-session';
import type { Ad } from '@/lib/types';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const { user, isFavorite, updateProfile } = useAuth();
  const { toast } = useToast();
  const { locale, messages, setLocale } = useI18n();
  const { isAdmin } = useAdminSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    location: '',
  });
  const defaultTab = searchParams.get('tab') || 'ads';
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

  useEffect(() => {
    const abortController = new AbortController();

    async function loadAds() {
      if (!user?.id) {
        setAds([]);
        setAdsError(null);
        setIsLoadingAds(false);
        return;
      }

      try {
        setIsLoadingAds(true);
        const response = await fetchAds({
          userId: user.id,
          fields: 'full',
          limit: 100,
          signal: abortController.signal,
        });
        setAds(response);
        setAdsError(null);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setAds([]);
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
  }, [user?.id]);

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

  if (!user) {
    return (
      <MarketplaceShell>
        <ProtectedRoute>
          <div />
        </ProtectedRoute>
      </MarketplaceShell>
    );
  }

  const myAds = ads.filter((ad) => ad.userId === user.id);
  const favoriteAds = ads.filter((ad) => user.favorites.includes(ad.id));

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

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
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

  return (
    <MarketplaceShell>
      <ProtectedRoute>
        <main className="marketplace-main">
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
                    {user.location ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{getLocalizedText(user.location, locale)}</span>
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
                      <span className="text-sm font-semibold text-primary">
                        {messages.profile.downloadMyData}
                      </span>
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
                          <AlertDialogDescription>
                            {deleteAccountCopy[locale].description}
                          </AlertDialogDescription>
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
              <Tabs defaultValue={defaultTab} className="w-full">
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
                      </div>
                    ) : myAds.length > 0 ? (
                      myAds.map((ad) => (
                        <AdCard
                          key={ad.id}
                          ad={ad}
                          isFavorite={isFavorite(ad.id)}
                          canDelete={isAdmin}
                          onDeleted={(adId) => {
                            setAds((previous) => previous.filter((item) => item.id !== adId));
                          }}
                          onUpdated={(updatedAd) => {
                            setAds((previous) =>
                              previous.map((item) => (item.id === updatedAd.id ? updatedAd : item))
                            );
                          }}
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
                      </div>
                    ) : favoriteAds.length > 0 ? (
                      favoriteAds.map((ad) => (
                        <AdCard
                          key={ad.id}
                          ad={ad}
                          isFavorite={isFavorite(ad.id)}
                          canDelete={isAdmin}
                          onDeleted={(adId) => {
                            setAds((previous) => previous.filter((item) => item.id !== adId));
                          }}
                          onUpdated={(updatedAd) => {
                            setAds((previous) =>
                              previous.map((item) => (item.id === updatedAd.id ? updatedAd : item))
                            );
                          }}
                        />
                      ))
                    ) : (
                      <div className="surface-card col-span-full rounded-[1.75rem] py-20 text-center">
                        <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <h3 className="mb-1 text-lg font-semibold">{messages.profile.emptyFavorites}</h3>
                        <p className="mb-6 text-muted-foreground">
                          {messages.profile.emptyFavoritesDescription}
                        </p>
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
        </main>
        <Sheet open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
          <SheetContent side="bottom" className="mx-auto w-full max-w-2xl rounded-t-[2rem] border border-border/70 px-4 pb-6 pt-10 sm:px-6">
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
