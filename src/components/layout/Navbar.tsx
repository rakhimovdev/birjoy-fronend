'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Heart, LogOut, PlusCircle, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { MarketplaceDrawer } from '@/components/layout/MarketplaceNavigation';
import { RealEstateTopUsersSheet } from '@/components/layout/RealEstateTopUsersSheet';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import { VerticalBar } from '@/components/layout/VerticalBar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { isLanguage, languageMeta, languages, type Language } from '@/lib/i18n';
import { getVerticalBySlug } from '@/lib/mock-data';
import type { AdVertical } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function isVerticalScope(value: string | null): value is AdVertical {
  return value === 'real_estate' || value === 'auto' || value === 'market' || value === 'food';
}

function getActiveMarketplaceVertical(
  pathname: string,
  scope: string | null
): AdVertical | null {
  if (pathname === '/search') {
    return isVerticalScope(scope) ? scope : null;
  }

  if (pathname === '/' || pathname === '/uy-joy') {
    return 'real_estate';
  }

  return getVerticalBySlug(pathname.replace(/^\//, ''))?.id || 'market';
}

function NavbarFallback() {
  return (
    <nav className="marketplace-top-nav sticky top-0 z-40 w-full">
      <div className="marketplace-frame py-3">
        <div className="flex items-center justify-between gap-3 rounded-[1.6rem] border border-white/50 bg-background/72 px-3 py-3 shadow-[0_18px_42px_rgba(7,28,85,0.06)] backdrop-blur-xl sm:px-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full border marketplace-glass-button" />
            <BrandLogo size="sm" />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavbarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isReady, signOut } = useAuth();
  const { locale, setLocale, messages } = useI18n();
  const favoritesPath = '/favorites';
  const myAdsPath = '/profile?tab=ads';
  const postAdPath = '/ads/create';
  const currentQuery = searchParams.get('q')?.trim() ?? '';
  const currentScope = searchParams.get('scope');
  const activeMarketplaceVertical = getActiveMarketplaceVertical(pathname, currentScope);
  const searchPageParams = new URLSearchParams();

  // Profile sahifalarida Navbar ko'rsatilmaydi
  if (pathname.startsWith('/profile')) {
    return null;
  }

  if (currentQuery) {
    searchPageParams.set('q', currentQuery);
  }

  if (pathname === '/search' && currentScope && currentScope !== 'all') {
    searchPageParams.set('scope', currentScope);
  }

  const searchPageHref = searchPageParams.toString()
    ? `/search?${searchPageParams.toString()}`
    : '/search';
  const postAdHref = user ? postAdPath : `/sign-in?redirect=${encodeURIComponent(postAdPath)}`;
  const favoritesHref = user
    ? favoritesPath
    : `/sign-in?redirect=${encodeURIComponent(favoritesPath)}`;
  const profileHref = user ? '/profile' : '/sign-in?redirect=%2Fprofile';
  const myAdsHref = user ? myAdsPath : `/sign-in?redirect=${encodeURIComponent(myAdsPath)}`;

  const handleLocaleChange = (value: string) => {
    if (isLanguage(value)) {
      setLocale(value as Language);
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

  return (
    <nav className="marketplace-top-nav sticky top-0 z-40 w-full">
      <div className="marketplace-frame py-3">
        <div className="flex flex-col gap-3 rounded-[1.6rem] border border-white/50 bg-background/72 px-3 py-3 shadow-[0_18px_42px_rgba(7,28,85,0.06)] backdrop-blur-xl sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 min-[481px]:gap-x-3">
            <div className="flex min-w-0 items-center gap-2 min-[481px]:gap-3">
              <div className="tablet-and-up-only">
                <MarketplaceDrawer />
              </div>
              <Link href="/" className="flex shrink-0 items-center whitespace-nowrap">
                <BrandLogo size="sm" />
              </Link>
            </div>

            {/* min-w-0 + shrink: kontent sig'masa guruh qisqaradi. shrink-0 bo'lsa
                justify-between oxirgi guruhni o'ngga qadaydi va u chap guruh
                ustiga chiqib ketadi — iPad'da aynan shu bo'lgan edi. */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 min-[481px]:gap-2">
              <Link href={searchPageHref} className="desktop-only">
                <Button
                  variant="ghost"
                  className="h-11 gap-2 rounded-[1.15rem] border border-white/55 bg-background/78 px-4 font-semibold shadow-none hover:bg-background sm:h-12"
                >
                  <Search className="h-4 w-4" />
                  {messages.navbar.search}
                </Button>
              </Link>

              <div className="desktop-only">
                <Select value={locale} onValueChange={handleLocaleChange}>
                  <SelectTrigger className="h-11 w-auto min-w-[9rem] rounded-[1.15rem] border-white/55 bg-background/78 shadow-none sm:h-12">
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

              {activeMarketplaceVertical === 'real_estate' ? (
                <RealEstateTopUsersSheet className="shrink-0" />
              ) : null}
              <ThemeToggleButton className="shrink-0" />

              <InstallAppButton compact className="shrink-0 marketplace-glass-button" />

              <Link href={postAdHref} className="tablet-and-up-only">
                <Button className="h-11 gap-2 rounded-[1.15rem] px-4 font-semibold sm:h-12 sm:px-5">
                  <PlusCircle className="h-4 w-4" />
                  {messages.navbar.postAd}
                </Button>
              </Link>

              {isReady && user ? (
                <>
                  <Link
                    href={favoritesHref}
                    className="desktop-only touch-target items-center justify-center rounded-full border text-muted-foreground shadow-none transition-colors hover:text-primary marketplace-glass-button"
                    aria-label={messages.navbar.favorites}
                  >
                    <Heart className="h-5 w-5" />
                  </Link>

                  <div className="tablet-and-up-only">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="relative h-12 w-12 rounded-full border p-0 shadow-none marketplace-glass-button"
                        >
                          <Avatar className="h-11 w-11 border-2 border-primary/10">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-60 rounded-2xl" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={profileHref} className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>{messages.navbar.profile}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={myAdsHref} className="cursor-pointer">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            <span>{messages.navbar.myAds}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={favoritesHref} className="cursor-pointer">
                            <Heart className="mr-2 h-4 w-4" />
                            <span>{messages.navbar.favorites}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive"
                          onClick={handleSignOut}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>{messages.navbar.logOut}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              ) : isReady ? (
                <>
                  <Link href="/sign-in">
                    <Button
                      variant="ghost"
                      className="h-11 rounded-[1.15rem] px-4 font-semibold tablet-and-up-only sm:h-12"
                    >
                      {messages.navbar.signIn}
                    </Button>
                  </Link>
                  <Link href="/sign-up" className="tablet-and-up-only">
                    <Button className="h-11 rounded-[1.15rem] px-4 font-semibold sm:h-12">
                      {messages.navbar.signUp}
                    </Button>
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <VerticalBar activeVertical={activeMarketplaceVertical} variant="navbar" />
        </div>
      </div>
    </nav>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={<NavbarFallback />}>
      <NavbarContent />
    </Suspense>
  );
}
