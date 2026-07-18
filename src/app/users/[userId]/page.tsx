'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, MapPin, Phone, Users } from 'lucide-react';
import { AdCard } from '@/components/ads/AdCard';
import { MarketplaceShell } from '@/components/layout/MarketplaceShell';
import {
  ListingsShowcaseSkeleton,
  MarketplaceErrorState,
  MarketplaceStatusCard,
} from '@/components/marketplace/MarketplaceStates';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminSession } from '@/hooks/use-admin-session';
import { fetchAds } from '@/lib/ads';
import { getLocalizedText, languageMeta } from '@/lib/i18n';
import { getVerticalById } from '@/lib/mock-data';
import type { Ad, AdVertical } from '@/lib/types';

type PublicUserProfilePageProps = {
  params: Promise<{ userId: string }>;
};

type VerticalSummary = {
  vertical: AdVertical;
  count: number;
};

export default function PublicUserProfilePage({ params }: PublicUserProfilePageProps) {
  const { userId } = use(params);
  const { user, isFavorite } = useAuth();
  const { isAdmin } = useAdminSession();
  const { locale, messages } = useI18n();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [loadNonce, setLoadNonce] = useState(0);

  const copy =
    locale === 'ru'
      ? {
          profileKicker: 'Профиль продавца',
          activeListings: 'Активные объявления',
          activeListingsDescription: 'Все текущие объявления этого пользователя собраны ниже.',
          listings: 'объявлений',
          views: 'просмотры',
          contacts: 'контакты',
          call: 'Позвонить',
          openOwnProfile: 'Мой профиль',
          backToMarketplace: 'Назад к объявлениям',
          retry: 'Повторить',
          noAdsTitle: 'У пользователя нет активных объявлений',
          noAdsDescription: 'Попробуйте открыть другого продавца или вернитесь в каталог.',
          unknownUser: 'Пользователь BirJoy',
          loadingTitle: 'Загружаем профиль продавца',
        }
      : locale === 'en'
        ? {
            profileKicker: 'Seller profile',
            activeListings: 'Active listings',
            activeListingsDescription: 'All current listings from this user are shown below.',
            listings: 'listings',
            views: 'views',
            contacts: 'contacts',
            call: 'Call',
            openOwnProfile: 'My profile',
            backToMarketplace: 'Back to listings',
            retry: 'Retry',
            noAdsTitle: 'This user has no active listings',
            noAdsDescription: 'Try another seller or head back to the marketplace.',
            unknownUser: 'BirJoy user',
            loadingTitle: 'Loading seller profile',
          }
        : {
            profileKicker: 'Sotuvchi profili',
            activeListings: 'Faol eʼlonlar',
            activeListingsDescription: 'Bu userning hozirgi barcha aktiv eʼlonlari quyida jamlandi.',
            listings: 'eʼlon',
            views: 'ko‘rish',
            contacts: 'kontakt',
            call: 'Qo‘ng‘iroq qilish',
            openOwnProfile: 'Mening profilim',
            backToMarketplace: 'Eʼlonlarga qaytish',
            retry: 'Qayta urinish',
            noAdsTitle: 'Bu userda aktiv eʼlon yo‘q',
            noAdsDescription: 'Boshqa sotuvchini ochib ko‘ring yoki marketplacega qayting.',
            unknownUser: 'BirJoy user',
            loadingTitle: 'Sotuvchi profili yuklanmoqda',
          };

  useEffect(() => {
    const abortController = new AbortController();

    async function loadAds() {
      try {
        setIsLoadingAds(true);
        const response = await fetchAds({
          userId,
          fields: 'full',
          status: 'active',
          limit: 100,
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        setAds(response);
        setAdsError(null);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setAds([]);
        setAdsError(error instanceof Error ? error.message : 'Unable to load user profile.');
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
  }, [loadNonce, userId]);

  const sortedAds = useMemo(
    () =>
      [...ads].sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [ads]
  );

  const primaryAd = sortedAds[0] || null;
  const profileName = primaryAd?.userName.trim() || copy.unknownUser;
  const profilePhone = primaryAd?.sellerPhone?.trim() || '';
  const profileLocation =
    (primaryAd && getLocalizedText(primaryAd.formattedAddress, locale)) ||
    (primaryAd && getLocalizedText(primaryAd.location, locale)) ||
    '';
  const totalViews = sortedAds.reduce((sum, ad) => sum + ad.viewCount, 0);
  const totalContacts = sortedAds.reduce((sum, ad) => sum + ad.contactCount, 0);
  const initials =
    profileName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'BJ';
  const statsFormatter = useMemo(
    () => new Intl.NumberFormat(languageMeta[locale].numberLocale),
    [locale]
  );
  const verticalSummaries = useMemo<VerticalSummary[]>(() => {
    const grouped = new Map<AdVertical, number>();

    sortedAds.forEach((ad) => {
      grouped.set(ad.vertical, (grouped.get(ad.vertical) || 0) + 1);
    });

    return [...grouped.entries()]
      .map(([vertical, count]) => ({ vertical, count }))
      .sort((left, right) => right.count - left.count);
  }, [sortedAds]);

  return (
    <MarketplaceShell>
      <main className="marketplace-main">
        {isLoadingAds ? (
          <ListingsShowcaseSkeleton
            title={copy.loadingTitle}
            description={copy.activeListingsDescription}
            count={4}
          />
        ) : adsError ? (
          <MarketplaceErrorState
            title={messages.auth.requestFailedTitle}
            description={adsError}
            retryLabel={copy.retry}
            onRetry={() => {
              setLoadNonce((currentValue) => currentValue + 1);
            }}
            secondaryAction={{
              label: copy.backToMarketplace,
              href: '/uy-joy',
              variant: 'outline',
            }}
          />
        ) : sortedAds.length === 0 ? (
          <MarketplaceStatusCard
            title={copy.noAdsTitle}
            description={copy.noAdsDescription}
            primaryAction={{
              label: copy.backToMarketplace,
              href: '/uy-joy',
            }}
          />
        ) : (
          <div className="page-stack">
            <section className="surface-card section-shell rounded-[1.9rem]">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <Button asChild variant="ghost" className="gap-2 rounded-full px-0 text-primary hover:bg-transparent">
                  <Link href="/uy-joy">
                    <ArrowLeft className="h-4 w-4" />
                    {copy.backToMarketplace}
                  </Link>
                </Button>

                {user?.id === userId ? (
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/profile">{copy.openOwnProfile}</Link>
                  </Button>
                ) : null}
              </div>

              <div className="page-grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                <div className="soft-panel rounded-[1.65rem]">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20 border-2 border-primary/12">
                      <AvatarImage src={user?.id === userId ? user.avatar : undefined} alt={profileName} />
                      <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="section-kicker">{copy.profileKicker}</p>
                      <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
                        {profileName}
                      </h1>

                      {profileLocation ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="break-words">{profileLocation}</span>
                        </div>
                      ) : null}

                      {profilePhone ? (
                        <Button asChild className="mt-2 w-full gap-2 sm:w-auto">
                          <a href={`tel:${profilePhone}`}>
                            <Phone className="h-4 w-4" />
                            {copy.call}
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="soft-panel rounded-[1.45rem]">
                      <p className="text-[1.9rem] font-black tracking-[-0.05em]">
                        {statsFormatter.format(sortedAds.length)}
                      </p>
                      <p className="text-sm text-muted-foreground">{copy.listings}</p>
                    </div>
                    <div className="soft-panel rounded-[1.45rem]">
                      <p className="text-[1.9rem] font-black tracking-[-0.05em]">
                        {statsFormatter.format(totalViews)}
                      </p>
                      <p className="text-sm text-muted-foreground">{copy.views}</p>
                    </div>
                    <div className="soft-panel rounded-[1.45rem]">
                      <p className="text-[1.9rem] font-black tracking-[-0.05em]">
                        {statsFormatter.format(totalContacts)}
                      </p>
                      <p className="text-sm text-muted-foreground">{copy.contacts}</p>
                    </div>
                  </div>

                  {verticalSummaries.length > 0 ? (
                    <div className="surface-card rounded-[1.45rem] p-4">
                      <div className="flex flex-wrap gap-2">
                        {verticalSummaries.map((item) => (
                          <Badge key={item.vertical} variant="secondary" className="gap-1.5 px-3 py-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {getLocalizedText(getVerticalById(item.vertical)?.name ?? { uz: item.vertical, ru: item.vertical, en: item.vertical }, locale)}
                            <span>{statsFormatter.format(item.count)}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="surface-card section-shell rounded-[1.9rem]">
              <div className="section-header">
                <div className="section-header__copy">
                  <p className="section-kicker">{copy.activeListings}</p>
                  <h2 className="section-title">{copy.activeListings}</h2>
                  <p className="section-caption">{copy.activeListingsDescription}</p>
                </div>
                <div className="status-strip">
                  <Badge variant="secondary">
                    {statsFormatter.format(sortedAds.length)} {copy.listings}
                  </Badge>
                  <Badge variant="outline">
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    {statsFormatter.format(totalViews)} {copy.views}
                  </Badge>
                </div>
              </div>

              <div className="listing-grid">
                {sortedAds.map((ad) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    isFavorite={isFavorite(ad.id)}
                    canDelete={isAdmin}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </MarketplaceShell>
  );
}
