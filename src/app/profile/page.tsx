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
import { Edit, Mail, Phone, MapPin, Package, Heart, Settings, Download } from 'lucide-react';
import { getCategoryBySlug } from '@/lib/mock-data';
import { AdCard } from '@/components/ads/AdCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { getLocalizedText } from '@/lib/i18n';
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
  const { user, isFavorite } = useAuth();
  const { toast } = useToast();
  const { locale, messages } = useI18n();
  const { isAdmin } = useAdminSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    async function loadAds() {
      try {
        setIsLoadingAds(true);
        const response = await fetchAds();

        if (!cancelled) {
          setAds(response);
          setAdsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAds([]);
          setAdsError(error instanceof Error ? error.message : 'Unable to load ads.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAds(false);
        }
      }
    }

    loadAds();

    return () => {
      cancelled = true;
    };
  }, []);

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
      category: getLocalizedText(getCategoryBySlug(ad.category)?.name ?? { uz: '', ru: '', en: '' }, locale),
      condition: getConditionLabel(ad.condition, locale),
      location: getLocalizedText(ad.location, locale),
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

  return (
    <MarketplaceShell>
      <ProtectedRoute>
        <main className="marketplace-main">
          <div className="surface-card rounded-[1.75rem] px-5 py-6 sm:px-6">
            <h1 className="page-title font-bold text-primary">{messages.navbar.profile}</h1>
            <p className="body-lead mt-3 max-w-3xl text-muted-foreground">
              {messages.profile.memberSince}
            </p>
          </div>

          <div className="page-grid profile-grid">
            <div className="page-stack">
              <Card className="surface-card rounded-[1.75rem] border-none shadow-none">
                <CardContent className="flex flex-col items-center pt-8 text-center">
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
                      <span>{user.email}</span>
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

                  <Button className="mt-8 w-full gap-2" variant="outline">
                    <Edit className="h-4 w-4" />
                    {messages.profile.editProfile}
                  </Button>
                </CardContent>
              </Card>

              <Card className="surface-card rounded-[1.75rem] border-none shadow-none">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm">{messages.profile.accountSettings}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-2 pt-0">
                  <Button variant="ghost" className="h-9 w-full justify-start gap-2 text-sm">
                    <Settings className="h-4 w-4" />
                    {messages.profile.settings}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 w-full justify-start gap-2 text-sm"
                    onClick={handleDownloadData}
                  >
                    <Download className="h-4 w-4" />
                    {messages.profile.downloadMyData}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-9 w-full justify-start gap-2 text-sm text-destructive hover:text-destructive"
                      >
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
                </CardContent>
              </Card>
            </div>

            <div className="min-w-0">
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-2 rounded-[1.25rem] border bg-white p-1.5">
                  <TabsTrigger
                    value="ads"
                    className="min-h-12 gap-2 rounded-[1rem] data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    <Package className="h-4 w-4" />
                    {messages.profile.myAdsTab} ({myAds.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="favorites"
                    className="min-h-12 gap-2 rounded-[1rem] data-[state=active]:bg-primary data-[state=active]:text-white"
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
      </ProtectedRoute>
    </MarketplaceShell>
  );
}
