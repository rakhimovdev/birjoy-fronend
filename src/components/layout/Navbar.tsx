'use client';

import Link from 'next/link';
import { Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Heart,
  History,
  Loader2,
  LogOut,
  PlusCircle,
  Search,
  Sparkles,
  User,
  type LucideIcon,
} from 'lucide-react';
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
import { MarketplaceDrawer } from '@/components/layout/MarketplaceNavigation';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { fetchAds } from '@/lib/ads';
import { getLocalizedText, isLanguage, languageMeta, languages, type Language } from '@/lib/i18n';
import { getAdDisplayLocation } from '@/lib/listing-utils';
import {
  getCategoriesForVertical,
  getVerticalBySlug,
  MARKETPLACE_VERTICALS,
} from '@/lib/mock-data';
import type { Ad, AdVertical } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const RECENT_SEARCHES_STORAGE_KEY = 'birjoy-recent-searches';
const MAX_RECENT_SEARCHES = 5;

type SearchMenuItem = {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  queryToPersist?: string;
};

function buildRecentSearches(nextQuery: string, currentSearches: string[]) {
  const trimmedQuery = nextQuery.trim();

  if (!trimmedQuery) {
    return currentSearches.slice(0, MAX_RECENT_SEARCHES);
  }

  return [trimmedQuery, ...currentSearches.filter((value) => value !== trimmedQuery)].slice(
    0,
    MAX_RECENT_SEARCHES
  );
}

function formatSearchPrice(price: number, locale: Language) {
  return new Intl.NumberFormat(languageMeta[locale].numberLocale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function getActiveMarketplaceVertical(pathname: string): AdVertical {
  if (pathname === '/' || pathname === '/uy-joy') {
    return 'real_estate';
  }

  return getVerticalBySlug(pathname.replace(/^\//, ''))?.id || 'market';
}

function getSearchMenuCopy(locale: Language) {
  if (locale === 'ru') {
    return {
      searchFor: 'Искать по запросу',
      suggestions: 'Подходящие объявления',
      searching: 'Ищем свежие совпадения...',
      noMatches: 'Совпадений пока не найдено. Попробуйте другой запрос.',
      searchFailed: 'Подсказки временно недоступны. Можно выполнить поиск вручную.',
      recentSearches: 'Недавние запросы',
      clearRecent: 'Очистить',
      popularCategories: 'Популярные категории',
      ariaLabel: 'Подсказки поиска',
    };
  }

  if (locale === 'en') {
    return {
      searchFor: 'Search for',
      suggestions: 'Suggested listings',
      searching: 'Looking for fresh matches...',
      noMatches: 'No matches yet. Try a different search phrase.',
      searchFailed: 'Suggestions are temporarily unavailable. You can still run the search.',
      recentSearches: 'Recent searches',
      clearRecent: 'Clear',
      popularCategories: 'Popular categories',
      ariaLabel: 'Search suggestions',
    };
  }

  return {
    searchFor: 'Quyidagicha qidirish',
    suggestions: 'Mos eʼlonlar',
    searching: 'Yangi mosliklar izlanmoqda...',
    noMatches: 'Hozircha mos natija topilmadi. Boshqa soʻz bilan urinib ko‘ring.',
    searchFailed: 'Takliflarni yuklab bo‘lmadi. Qidiruvni baribir davom ettirishingiz mumkin.',
    recentSearches: 'So‘nggi qidiruvlar',
    clearRecent: 'Tozalash',
    popularCategories: 'Ommabop kategoriyalar',
    ariaLabel: 'Qidiruv takliflari',
  };
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
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Ad[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const favoritesPath = '/favorites';
  const myAdsPath = '/profile?tab=ads';
  const postAdPath = '/ads/create';
  const postAdHref = user ? postAdPath : `/sign-in?redirect=${encodeURIComponent(postAdPath)}`;
  const favoritesHref = user
    ? favoritesPath
    : `/sign-in?redirect=${encodeURIComponent(favoritesPath)}`;
  const profileHref = user ? '/profile' : '/sign-in?redirect=%2Fprofile';
  const myAdsHref = user ? myAdsPath : `/sign-in?redirect=${encodeURIComponent(myAdsPath)}`;
  const mobileSearchAnchorId = 'marketplace-mobile-search';
  const mobileSearchInputId = 'marketplace-mobile-search-input';
  const searchSuggestionListId = useId();
  const searchBlurTimeoutRef = useRef<number | null>(null);
  const verticalPaths = useMemo(
    () => new Set(['/', ...MARKETPLACE_VERTICALS.map((vertical) => `/${vertical.slug}`)]),
    []
  );
  const activeMarketplacePath = verticalPaths.has(pathname) ? pathname : '/market';
  const activeMarketplaceVertical = getActiveMarketplaceVertical(activeMarketplacePath);
  const activeMarketplaceCategories = useMemo(
    () => getCategoriesForVertical(activeMarketplaceVertical).slice(0, 4),
    [activeMarketplaceVertical]
  );
  const trimmedSearchQuery = searchQuery.trim();
  const searchCopy = getSearchMenuCopy(locale);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedRecentSearches = JSON.parse(
        window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) || '[]'
      );

      if (Array.isArray(storedRecentSearches)) {
        setRecentSearches(
          storedRecentSearches
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .slice(0, MAX_RECENT_SEARCHES)
        );
      }
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const focusSearchFromHash = () => {
      if (
        window.location.hash !== `#${mobileSearchAnchorId}` &&
        window.location.hash !== `#${mobileSearchInputId}`
      ) {
        return;
      }

      const searchInput = document.getElementById(mobileSearchInputId) as HTMLInputElement | null;

      if (!searchInput) {
        return;
      }

      window.setTimeout(() => {
        searchInput.focus();
        searchInput.select();
      }, 60);
    };

    focusSearchFromHash();
    window.addEventListener('hashchange', focusSearchFromHash);

    return () => {
      window.removeEventListener('hashchange', focusSearchFromHash);
    };
  }, []);

  useEffect(() => {
    if (!isSearchFocused || !trimmedSearchQuery) {
      setSearchSuggestions([]);
      setSuggestionsError(null);
      setIsSuggestionsLoading(false);
      return;
    }

    const abortController = new AbortController();
    const activeCategory = searchParams.get('category')?.trim() || '';
    const debounceTimeoutId = window.setTimeout(() => {
      setIsSuggestionsLoading(true);
      setSuggestionsError(null);

      void fetchAds({
        vertical: activeMarketplaceVertical,
        category: activeCategory || undefined,
        search: trimmedSearchQuery,
        fields: 'card',
        status: 'active',
        limit: 5,
        signal: abortController.signal,
      })
        .then((ads) => {
          if (abortController.signal.aborted) {
            return;
          }

          setSearchSuggestions(ads);
        })
        .catch((error) => {
          if (abortController.signal.aborted) {
            return;
          }

          setSearchSuggestions([]);
          setSuggestionsError(error instanceof Error ? error.message : searchCopy.searchFailed);
        })
        .finally(() => {
          if (!abortController.signal.aborted) {
            setIsSuggestionsLoading(false);
          }
        });
    }, 240);

    return () => {
      window.clearTimeout(debounceTimeoutId);
      abortController.abort();
    };
  }, [activeMarketplaceVertical, isSearchFocused, searchCopy.searchFailed, searchParams, trimmedSearchQuery]);

  useEffect(() => {
    return () => {
      if (searchBlurTimeoutRef.current !== null) {
        window.clearTimeout(searchBlurTimeoutRef.current);
      }
    };
  }, []);

  const buildMarketplaceUrl = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQueryValue = query.trim();

    if (trimmedQueryValue) {
      params.set('q', trimmedQueryValue);
    } else {
      params.delete('q');
    }

    const queryString = params.toString();
    return queryString ? `${activeMarketplacePath}?${queryString}` : activeMarketplacePath;
  };

  const buildCategoryUrl = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.set('category', categorySlug);

    const queryString = params.toString();
    return queryString ? `${activeMarketplacePath}?${queryString}` : activeMarketplacePath;
  };

  const searchActionItem: SearchMenuItem | null = trimmedSearchQuery
    ? {
        id: 'search-query-action',
        label: trimmedSearchQuery,
        description: searchCopy.searchFor,
        href: buildMarketplaceUrl(trimmedSearchQuery),
        icon: Search,
        queryToPersist: trimmedSearchQuery,
      }
    : null;

  const adSuggestionItems = useMemo<SearchMenuItem[]>(
    () =>
      searchSuggestions.map((ad) => ({
        id: `ad-${ad.id}`,
        label: getLocalizedText(ad.title, locale) || 'BirJoy',
        description: getLocalizedText(getAdDisplayLocation(ad), locale),
        href: `/ads/${ad.id}`,
        icon: Search,
        badge: formatSearchPrice(ad.price, locale),
        queryToPersist: trimmedSearchQuery,
      })),
    [locale, searchSuggestions, trimmedSearchQuery]
  );

  const recentSearchItems = useMemo<SearchMenuItem[]>(
    () =>
      recentSearches.map((recentSearch) => ({
        id: `recent-${recentSearch}`,
        label: recentSearch,
        description: searchCopy.recentSearches,
        href: buildMarketplaceUrl(recentSearch),
        icon: History,
        queryToPersist: recentSearch,
      })),
    [recentSearches, searchCopy.recentSearches]
  );

  const categorySuggestionItems = useMemo<SearchMenuItem[]>(
    () =>
      activeMarketplaceCategories.map((category) => ({
        id: `category-${category.slug}`,
        label: getLocalizedText(category.name, locale),
        description: searchCopy.popularCategories,
        href: buildCategoryUrl(category.slug),
        icon: Sparkles,
      })),
    [activeMarketplaceCategories, locale, searchCopy.popularCategories]
  );

  const visibleSearchMenuItems = useMemo(
    () =>
      trimmedSearchQuery
        ? [...(searchActionItem ? [searchActionItem] : []), ...adSuggestionItems]
        : [...recentSearchItems, ...categorySuggestionItems],
    [
      adSuggestionItems,
      categorySuggestionItems,
      recentSearchItems,
      searchActionItem,
      trimmedSearchQuery,
    ]
  );

  useEffect(() => {
    if (visibleSearchMenuItems.length === 0) {
      setHighlightedItemId(null);
      return;
    }

    if (!highlightedItemId || !visibleSearchMenuItems.some((item) => item.id === highlightedItemId)) {
      setHighlightedItemId(visibleSearchMenuItems[0].id);
    }
  }, [highlightedItemId, visibleSearchMenuItems]);

  const persistRecentSearch = (query: string) => {
    const trimmedQueryValue = query.trim();

    if (!trimmedQueryValue || typeof window === 'undefined') {
      return;
    }

    setRecentSearches((currentSearches) => {
      const nextSearches = buildRecentSearches(trimmedQueryValue, currentSearches);
      window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(nextSearches));
      return nextSearches;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    }
  };

  const clearSearchBlurTimeout = () => {
    if (searchBlurTimeoutRef.current !== null) {
      window.clearTimeout(searchBlurTimeoutRef.current);
      searchBlurTimeoutRef.current = null;
    }
  };

  const openSearchMenu = () => {
    clearSearchBlurTimeout();
    setIsSearchFocused(true);
  };

  const closeSearchMenu = () => {
    clearSearchBlurTimeout();
    setIsSearchFocused(false);
    setHighlightedItemId(null);
  };

  const scheduleSearchMenuClose = () => {
    clearSearchBlurTimeout();
    searchBlurTimeoutRef.current = window.setTimeout(() => {
      setIsSearchFocused(false);
      setHighlightedItemId(null);
    }, 120);
  };

  const navigateToSearchItem = (item: SearchMenuItem) => {
    if (item.queryToPersist) {
      persistRecentSearch(item.queryToPersist);
    }

    closeSearchMenu();
    router.push(item.href);
  };

  const submitSearchQuery = (query: string) => {
    const trimmedQueryValue = query.trim();

    if (trimmedQueryValue) {
      persistRecentSearch(trimmedQueryValue);
    }

    closeSearchMenu();
    router.push(buildMarketplaceUrl(trimmedQueryValue));
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearchQuery(searchQuery);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      closeSearchMenu();
      event.currentTarget.blur();
      return;
    }

    if (visibleSearchMenuItems.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openSearchMenu();

      const currentIndex = visibleSearchMenuItems.findIndex(
        (item) => item.id === highlightedItemId
      );
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + direction + visibleSearchMenuItems.length) %
            visibleSearchMenuItems.length;

      setHighlightedItemId(visibleSearchMenuItems[nextIndex].id);
      return;
    }

    if (event.key === 'Enter' && isSearchFocused && highlightedItemId) {
      const highlightedItem = visibleSearchMenuItems.find((item) => item.id === highlightedItemId);

      if (!highlightedItem) {
        return;
      }

      event.preventDefault();
      navigateToSearchItem(highlightedItem);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setSuggestionsError(null);
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

  const renderSearchItem = (item: SearchMenuItem) => {
    const Icon = item.icon;
    const isActive = item.id === highlightedItemId;

    return (
      <button
        id={`${searchSuggestionListId}-${item.id}`}
        key={item.id}
        type="button"
        role="option"
        aria-selected={isActive}
        data-active={isActive}
        className="search-suggestion-item"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onMouseEnter={() => {
          setHighlightedItemId(item.id);
        }}
        onClick={() => {
          navigateToSearchItem(item);
        }}
      >
        <span className="search-suggestion-item__icon">
          <Icon className="h-4 w-4" />
        </span>
        <span className="search-suggestion-item__copy">
          <span className="search-suggestion-item__label">{item.label}</span>
          {item.description ? (
            <span className="search-suggestion-item__description">{item.description}</span>
          ) : null}
        </span>
        {item.badge ? <span className="search-suggestion-item__badge">{item.badge}</span> : null}
      </button>
    );
  };

  const showSearchMenu =
    isSearchFocused &&
    (Boolean(trimmedSearchQuery) ||
      recentSearchItems.length > 0 ||
      categorySuggestionItems.length > 0);

  const renderSearchForm = (
    className?: string,
    options?: {
      formId?: string;
      inputId?: string;
    }
  ) => (
    <form id={options?.formId} onSubmit={handleSearchSubmit} className={className} role="search">
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={options?.inputId}
          value={searchQuery}
          autoComplete="off"
          placeholder={messages.navbar.searchPlaceholder}
          onFocus={openSearchMenu}
          onBlur={scheduleSearchMenuClose}
          onKeyDown={handleSearchKeyDown}
          onChange={(event) => setSearchQuery(event.target.value)}
          aria-autocomplete="list"
          aria-controls={showSearchMenu ? searchSuggestionListId : undefined}
          aria-expanded={showSearchMenu}
          aria-activedescendant={
            highlightedItemId ? `${searchSuggestionListId}-${highlightedItemId}` : undefined
          }
          className="h-11 rounded-[1.15rem] border-white/55 bg-background/78 pl-10 pr-20 text-sm shadow-none focus-visible:ring-primary sm:h-12 sm:text-[0.95rem]"
        />
        {searchQuery ? (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 max-w-20 -translate-y-1/2 truncate text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            {messages.navbar.clearSearch}
          </button>
        ) : null}

        {showSearchMenu ? (
          <div
            id={searchSuggestionListId}
            role="listbox"
            aria-label={searchCopy.ariaLabel}
            className="search-suggestion-panel"
          >
            {trimmedSearchQuery ? (
              <>
                {searchActionItem ? (
                  <div className="search-suggestion-section">
                    <p className="search-suggestion-section__label">{searchCopy.searchFor}</p>
                    {renderSearchItem(searchActionItem)}
                  </div>
                ) : null}

                <div className="search-suggestion-section">
                  <p className="search-suggestion-section__label">{searchCopy.suggestions}</p>
                  {isSuggestionsLoading ? (
                    <div className="search-suggestion-feedback">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>{searchCopy.searching}</span>
                    </div>
                  ) : suggestionsError ? (
                    <div className="search-suggestion-feedback text-destructive">
                      <span>{searchCopy.searchFailed}</span>
                    </div>
                  ) : adSuggestionItems.length > 0 ? (
                    adSuggestionItems.map(renderSearchItem)
                  ) : (
                    <div className="search-suggestion-feedback">
                      <span>{searchCopy.noMatches}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {recentSearchItems.length > 0 ? (
                  <div className="search-suggestion-section">
                    <div className="search-suggestion-section__header">
                      <p className="search-suggestion-section__label">
                        {searchCopy.recentSearches}
                      </p>
                      <button
                        type="button"
                        className="search-suggestion-section__clear"
                        onMouseDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={clearRecentSearches}
                      >
                        {searchCopy.clearRecent}
                      </button>
                    </div>
                    {recentSearchItems.map(renderSearchItem)}
                  </div>
                ) : null}

                <div className="search-suggestion-section">
                  <p className="search-suggestion-section__label">
                    {searchCopy.popularCategories}
                  </p>
                  {categorySuggestionItems.map(renderSearchItem)}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </form>
  );

  return (
    <nav className="marketplace-top-nav sticky top-0 z-40 w-full">
      <div className="marketplace-frame py-3">
        <div className="flex flex-col gap-3 rounded-[1.6rem] border border-white/50 bg-background/72 px-3 py-3 shadow-[0_18px_42px_rgba(7,28,85,0.06)] backdrop-blur-xl sm:px-4">
          <div className="flex items-center justify-between gap-2 min-[481px]:gap-3">
            <div className="flex min-w-0 items-center gap-2 min-[481px]:gap-3">
              <div className="tablet-and-up-only">
                <MarketplaceDrawer />
              </div>
              <Link href="/" className="flex shrink-0 items-center whitespace-nowrap">
                <BrandLogo size="sm" />
              </Link>
            </div>

            {renderSearchForm('tablet-and-up-only w-full max-w-[36rem] xl:max-w-[40rem]')}

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
          {renderSearchForm('phone-nav-only w-full', {
            formId: mobileSearchAnchorId,
            inputId: mobileSearchInputId,
          })}
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
