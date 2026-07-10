'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Heart, LogOut, PlusCircle, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { MarketplaceDrawer } from '@/components/layout/MarketplaceNavigation';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import { languageMeta, languages, isLanguage, type Language } from '@/lib/i18n';
import { MARKETPLACE_VERTICALS } from '@/lib/mock-data';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useToast } from '@/hooks/use-toast';

function NavbarFallback() {
  return (
    <nav className="marketplace-top-nav sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-[92rem] px-3 py-3 sm:px-4">
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
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const favoritesPath = '/favorites';
  const myAdsPath = '/profile?tab=ads';
  const postAdPath = '/ads/create';
  const postAdHref = user ? postAdPath : `/sign-in?redirect=${encodeURIComponent(postAdPath)}`;
  const favoritesHref = user ? favoritesPath : `/sign-in?redirect=${encodeURIComponent(favoritesPath)}`;
  const profileHref = user ? '/profile' : '/sign-in?redirect=%2Fprofile';
  const myAdsHref = user ? myAdsPath : `/sign-in?redirect=${encodeURIComponent(myAdsPath)}`;
  const isRealEstateMarketplacePath = pathname === '/' || pathname === '/uy-joy';

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const verticalPaths = new Set(['/', ...MARKETPLACE_VERTICALS.map((vertical) => `/${vertical.slug}`)]);
  const activeMarketplacePath = verticalPaths.has(pathname) ? pathname : '/market';

  const buildMarketplaceUrl = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params.set('q', trimmedQuery);
    } else {
      params.delete('q');
    }

    const queryString = params.toString();
    return queryString ? `${activeMarketplacePath}?${queryString}` : activeMarketplacePath;
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(buildMarketplaceUrl(searchQuery));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    router.push(buildMarketplaceUrl(''));
  };

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

  const renderSearchForm = (className?: string) => (
    <form onSubmit={handleSearchSubmit} className={className}>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={messages.navbar.searchPlaceholder}
          className="h-11 rounded-[1.15rem] border-white/55 bg-background/78 pl-10 pr-20 text-sm shadow-none focus-visible:ring-primary sm:h-12 sm:text-[0.95rem]"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 max-w-20 -translate-y-1/2 truncate text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            {messages.navbar.clearSearch}
          </button>
        ) : null}
      </div>
    </form>
  );

  return (
    <nav className="marketplace-top-nav sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-[92rem] px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 rounded-[1.6rem] border border-white/50 bg-background/72 px-3 py-3 shadow-[0_18px_42px_rgba(7,28,85,0.06)] backdrop-blur-xl sm:px-4">
          <div className="flex items-center justify-between gap-2 min-[481px]:gap-3">
            <div className="flex min-w-0 items-center gap-2 min-[481px]:gap-3">
              <MarketplaceDrawer />
              <Link href="/" className="flex min-w-0 items-center overflow-hidden">
                <BrandLogo size="sm" />
              </Link>
            </div>

            {renderSearchForm('tablet-and-up-only w-full max-w-xl')}

            <div className="flex shrink-0 items-center gap-1.5 min-[481px]:gap-2">
              <div className="tablet-and-up-only">
                <Select value={locale} onValueChange={handleLocaleChange}>
                  <SelectTrigger className="h-11 w-[120px] rounded-[1.15rem] border-white/55 bg-background/78 shadow-none sm:h-12 lg:w-[142px]">
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
                    className="tablet-and-up-only touch-target items-center justify-center rounded-full border text-muted-foreground shadow-none transition-colors hover:text-primary marketplace-glass-button"
                    aria-label={messages.navbar.favorites}
                  >
                    <Heart className="h-5 w-5" />
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-12 w-12 rounded-full border p-0 shadow-none marketplace-glass-button">
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
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
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
                      <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{messages.navbar.logOut}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                    <Button className="h-11 rounded-[1.15rem] px-4 font-semibold sm:h-12">{messages.navbar.signUp}</Button>
                  </Link>
                  <Link href="/sign-in" className="phone-nav-only">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="touch-target rounded-full border shadow-none marketplace-glass-button"
                      aria-label={messages.navbar.signIn}
                    >
                      <User className="h-5 w-5" />
                      <span className="sr-only">{messages.navbar.signIn}</span>
                    </Button>
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          {!isRealEstateMarketplacePath ? renderSearchForm('phone-nav-only w-full') : null}
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
