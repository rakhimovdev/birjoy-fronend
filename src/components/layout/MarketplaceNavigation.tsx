'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Heart,
  Home,
  Menu,
  MessageSquare,
  PlusCircle,
  User,
} from 'lucide-react';
import { CATEGORIES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { getLocalizedText, isLanguage, languageMeta, languages, type Language } from '@/lib/i18n';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type NavigationLink = {
  href: string;
  icon: typeof Home;
  label: string;
  active: boolean;
};

function useNavigationLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { messages } = useI18n();

  const favoritesHref = user ? '/favorites' : `/sign-in?redirect=${encodeURIComponent('/favorites')}`;
  const chatHref = user ? '/chat' : `/sign-in?redirect=${encodeURIComponent('/chat')}`;
  const profileHref = user ? '/profile' : `/sign-in?redirect=${encodeURIComponent('/profile')}`;
  const postAdHref = user ? '/ads/create' : `/sign-in?redirect=${encodeURIComponent('/ads/create')}`;
  const activeProfileTab = searchParams.get('tab');

  const links: NavigationLink[] = [
    {
      href: '/',
      icon: Home,
      label: messages.navbar.home,
      active: pathname === '/',
    },
    {
      href: favoritesHref,
      icon: Heart,
      label: messages.navbar.favorites,
      active: pathname === '/favorites' || (pathname === '/profile' && activeProfileTab === 'favorites'),
    },
    {
      href: postAdHref,
      icon: PlusCircle,
      label: messages.navbar.postAd,
      active: pathname === '/ads/create',
    },
    {
      href: chatHref,
      icon: MessageSquare,
      label: messages.navbar.chat,
      active: pathname === '/chat',
    },
    {
      href: profileHref,
      icon: User,
      label: messages.navbar.profile,
      active: pathname === '/profile' && activeProfileTab !== 'favorites',
    },
  ];

  return {
    links,
    pathname,
    searchParams,
  };
}

function buildCategoryHref(categorySlug: string, currentQuery: string | null) {
  const params = new URLSearchParams();

  if (currentQuery?.trim()) {
    params.set('q', currentQuery.trim());
  }

  if (categorySlug !== 'all') {
    params.set('category', categorySlug);
  }

  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export function MarketplaceBottomNav() {
  const { links } = useNavigationLinks();

  return (
    <nav className="marketplace-bottom-nav phone-nav-only" aria-label="Marketplace navigation">
      <div className="marketplace-bottom-nav__inner">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.label}
              href={link.href}
              className="marketplace-nav-link"
              data-active={link.active}
              aria-current={link.active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="marketplace-nav-link__label">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MarketplaceDrawer() {
  const { links, pathname, searchParams } = useNavigationLinks();
  const { locale, messages, setLocale } = useI18n();
  const activeCategory = pathname === '/' ? searchParams.get('category') ?? 'all' : 'all';
  const currentQuery = pathname === '/' ? searchParams.get('q') : null;

  const handleLocaleChange = (value: string) => {
    if (isLanguage(value)) {
      setLocale(value as Language);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="touch-target shrink-0 rounded-full border border-white/70 bg-white/82 shadow-sm hover:bg-white"
          aria-label={messages.navbar.openNavigation}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(94vw,23.5rem)] border-r border-white/70 bg-[rgba(255,250,242,0.98)] p-0 shadow-[0_28px_80px_rgba(7,28,85,0.16)]"
      >
        <div className="tablet-drawer-scroll flex h-full flex-col">
          <SheetHeader className="border-b border-border/70 px-5 py-5 text-left">
            <SheetTitle className="text-left">
              <BrandLogo size="sm" />
            </SheetTitle>
            <SheetDescription className="pt-2 text-left">
              {messages.navbar.mobileMenuDescription}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 px-5 py-5">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-muted-foreground">
                {messages.navbar.quickLinks}
              </p>
              <div className="grid gap-2">
                {links.map((link) => {
                  const Icon = link.icon;

                  return (
                    <SheetClose key={link.label} asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          'flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors',
                          link.active
                            ? 'border-primary/15 bg-primary/10 text-primary'
                            : 'border-white/80 bg-white/80 text-foreground hover:bg-primary/5 hover:text-primary'
                        )}
                        aria-current={link.active ? 'page' : undefined}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-current">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span>{link.label}</span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-muted-foreground">
                {messages.navbar.marketCategories}
              </p>
              <div className="grid gap-2 min-[481px]:grid-cols-2">
                <SheetClose asChild>
                  <Link
                    href={buildCategoryHref('all', currentQuery)}
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors',
                      activeCategory === 'all'
                        ? 'border-primary/15 bg-primary/10 text-primary'
                        : 'border-white/80 bg-white/80 hover:bg-primary/5 hover:text-primary'
                    )}
                  >
                    {messages.categoryBar.all}
                  </Link>
                </SheetClose>
                {CATEGORIES.map((category) => (
                  <SheetClose key={category.id} asChild>
                    <Link
                      href={buildCategoryHref(category.slug, currentQuery)}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-sm font-medium transition-colors',
                        activeCategory === category.slug
                          ? 'border-primary/15 bg-primary/10 text-primary'
                          : 'border-white/80 bg-white/80 hover:bg-primary/5 hover:text-primary'
                      )}
                    >
                      {getLocalizedText(category.name, locale)}
                    </Link>
                  </SheetClose>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-muted-foreground">
                {messages.navbar.language}
              </p>
              <Select value={locale} onValueChange={handleLocaleChange}>
                <SelectTrigger className="h-12 rounded-2xl border-white/80 bg-white/80 shadow-sm">
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
          </div>

          <div className="border-t border-border/70 px-5 py-4">
            <a
              href="tel:+998332580404"
              className="flex min-h-12 items-center justify-center rounded-2xl bg-[#071c55] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0b48d6]"
            >
              {messages.navbar.callSupport}
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
