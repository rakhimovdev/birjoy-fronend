'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Home,
  Menu,
  MessageSquare,
  PlusCircle,
  Search,
  User,
} from 'lucide-react';
import {
  MARKETPLACE_VERTICALS,
  getVerticalBySlug,
  getVerticalHref,
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { getLocalizedText } from '@/lib/i18n';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
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
  const homeHref = '/uy-joy';
  const verticalPaths = new Set(['/', ...MARKETPLACE_VERTICALS.map((vertical) => `/${vertical.slug}`)]);
  const activeMarketplacePath = verticalPaths.has(pathname) ? pathname : homeHref;
  const activeSearchParams = new URLSearchParams(searchParams.toString());
  const searchHref = `${activeMarketplacePath}${
    activeSearchParams.toString() ? `?${activeSearchParams.toString()}` : ''
  }#marketplace-mobile-search`;

  const chatHref = user ? '/chat' : `/sign-in?redirect=${encodeURIComponent('/chat')}`;
  const profileHref = user ? '/profile' : `/sign-in?redirect=${encodeURIComponent('/profile')}`;
  const postAdHref = user ? '/ads/create' : `/sign-in?redirect=${encodeURIComponent('/ads/create')}`;
  const activeProfileTab = searchParams.get('tab');

  const links: NavigationLink[] = [
    {
      href: homeHref,
      icon: Home,
      label: messages.navbar.home,
      active: pathname === '/' || pathname === homeHref,
    },
    {
      href: searchHref,
      icon: Search,
      label: messages.navbar.search,
      active: Boolean(searchParams.get('q')),
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
  const { links, pathname } = useNavigationLinks();
  const { locale, messages } = useI18n();
  const activeVertical = pathname === '/' ? 'real_estate' : getVerticalBySlug(pathname.slice(1))?.id || 'market';
  const verticalSectionLabel =
    locale === 'ru' ? 'Вертикали' : locale === 'en' ? 'Verticals' : 'Vertikallar';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="touch-target shrink-0 rounded-full border shadow-sm marketplace-glass-button"
          aria-label={messages.navbar.openNavigation}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="marketplace-drawer-surface w-[min(94vw,23.5rem)] border-r p-0 shadow-[0_28px_80px_rgba(7,28,85,0.16)]"
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
                            : 'marketplace-drawer-card text-foreground hover:bg-primary/5 hover:text-primary'
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
                {verticalSectionLabel}
              </p>
              <div className="grid gap-2 min-[481px]:grid-cols-2">
                {MARKETPLACE_VERTICALS.map((vertical) => (
                  <SheetClose key={vertical.id} asChild>
                    <Link
                      href={getVerticalHref(vertical.id)}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors',
                        activeVertical === vertical.id
                          ? 'border-primary/15 bg-primary/10 text-primary'
                          : 'marketplace-drawer-card hover:bg-primary/5 hover:text-primary'
                      )}
                    >
                      {getLocalizedText(vertical.name, locale)}
                    </Link>
                  </SheetClose>
                ))}
              </div>
            </div>

          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
