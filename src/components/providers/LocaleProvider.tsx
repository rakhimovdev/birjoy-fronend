'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  defaultLanguage,
  dictionaries,
  isLanguage,
  localeStorageKey,
  type Language,
  type SiteMessages,
} from '@/lib/i18n';

type LocaleContextValue = {
  locale: Language;
  setLocale: (nextLocale: Language) => void;
  messages: SiteMessages;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Language>(defaultLanguage);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(localeStorageKey);

    if (storedLocale && isLanguage(storedLocale)) {
      setLocale(storedLocale);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        messages: dictionaries[locale],
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useI18n must be used within LocaleProvider');
  }

  return context;
}
