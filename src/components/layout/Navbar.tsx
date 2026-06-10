'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, PlusCircle, User, Heart, Menu, LogOut } from 'lucide-react';
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { languageMeta, languages, isLanguage, type Language } from '@/lib/i18n';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useToast } from '@/hooks/use-toast';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isReady, signOut } = useAuth();
  const { locale, setLocale, messages } = useI18n();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const favoritesPath = '/profile?tab=favorites';
  const myAdsPath = '/profile?tab=ads';
  const postAdPath = '/ads/create';
  const postAdHref = user ? postAdPath : `/sign-in?redirect=${encodeURIComponent(postAdPath)}`;
  const favoritesHref = user ? favoritesPath : `/sign-in?redirect=${encodeURIComponent(favoritesPath)}`;
  const profileHref = user ? '/profile' : '/sign-in?redirect=%2Fprofile';
  const myAdsHref = user ? myAdsPath : `/sign-in?redirect=${encodeURIComponent(myAdsPath)}`;

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const buildMarketplaceUrl = (query: string) => {
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params.set('q', trimmedQuery);
    }

    const selectedCategory = pathname === '/' ? searchParams.get('category') : null;

    if (selectedCategory) {
      params.set('category', selectedCategory);
    }

    const queryString = params.toString();
    return queryString ? `/?${queryString}` : '/';
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

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/60 bg-[rgba(255,250,242,0.78)] shadow-[0_8px_30px_rgba(7,28,85,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-[rgba(255,250,242,0.72)]">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          <Link href="/" className="flex items-center">
            <BrandLogo size="sm" />
          </Link>

          <form onSubmit={handleSearchSubmit} className="relative hidden w-80 md:flex lg:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={messages.navbar.searchPlaceholder}
              className="border-white/70 bg-white/75 pl-10 pr-10 shadow-sm focus-visible:ring-primary"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {messages.navbar.clearSearch}
              </button>
            ) : null}
          </form>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <InstallAppButton compact className="shrink-0" />

          <div className="hidden md:block">
              <Select value={locale} onValueChange={handleLocaleChange}>
              <SelectTrigger className="h-10 w-[138px] border-white/70 bg-white/70 shadow-sm">
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

          <Link href={postAdHref} className="hidden sm:flex">
            <Button className="gap-2 font-semibold">
              <PlusCircle className="h-4 w-4" />
              {messages.navbar.postAd}
            </Button>
          </Link>

          {isReady && user ? (
            <>
              <Link
                href={favoritesHref}
                className="hidden p-2 text-muted-foreground transition-colors hover:text-primary md:flex"
                aria-label={messages.navbar.favorites}
              >
                <Heart className="h-6 w-6" />
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-primary/10">
                      <AvatarImage src={user.photoUrl} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
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
              <Link href="/sign-in" className="hidden sm:flex">
                <Button variant="ghost" className="font-semibold">
                  {messages.navbar.signIn}
                </Button>
              </Link>
              <Link href="/sign-up" className="hidden sm:flex">
                <Button className="font-semibold">{messages.navbar.signUp}</Button>
              </Link>
            </>
          ) : null}

          <Sheet>
            <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>{messages.navbar.mobileMenuTitle}</SheetTitle>
                <SheetDescription>{messages.navbar.mobileMenuDescription}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <form onSubmit={handleSearchSubmit} className="space-y-2">
                  <label htmlFor="mobile-market-search" className="text-sm font-medium">
                    {messages.navbar.search}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="mobile-market-search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={messages.navbar.searchPlaceholder}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {messages.navbar.search}
                    </Button>
                    {searchQuery ? (
                      <Button type="button" variant="outline" onClick={handleClearSearch}>
                        {messages.navbar.clearSearch}
                      </Button>
                    ) : null}
                  </div>
                </form>

                <div className="space-y-2">
                  <p className="text-sm font-medium">{messages.navbar.language}</p>
                  <Select value={locale} onValueChange={handleLocaleChange}>
                    <SelectTrigger className="w-full">
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

                <div className="grid gap-2">
                  <SheetClose asChild>
                    <Link href="/" className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
                      {messages.navbar.home}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href={postAdHref} className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
                      {messages.navbar.postAd}
                    </Link>
                  </SheetClose>
                  {isReady && user ? (
                    <>
                      <SheetClose asChild>
                        <Link href={profileHref} className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
                          {messages.navbar.profile}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href={myAdsHref} className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
                          {messages.navbar.myAds}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href={favoritesHref} className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
                          {messages.navbar.favorites}
                        </Link>
                      </SheetClose>
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start rounded-lg px-4 py-3 text-sm font-medium text-destructive hover:text-destructive"
                        onClick={handleSignOut}
                      >
                        {messages.navbar.logOut}
                      </Button>
                    </>
                  ) : isReady ? (
                    <>
                      <SheetClose asChild>
                        <Link href="/sign-in" className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
                          {messages.navbar.signIn}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/sign-up" className="rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted">
                          {messages.navbar.signUp}
                        </Link>
                      </SheetClose>
                    </>
                  ) : null}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
