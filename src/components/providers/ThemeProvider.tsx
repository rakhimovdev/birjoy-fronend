'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  isThemeMode,
  themeColorByMode,
  themeStorageKey,
  type ThemeMode,
} from '@/lib/theme';

type ThemeContextValue = {
  theme: ThemeMode;
  isReady: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const themeColorMeta =
    document.querySelector('meta[name="theme-color"]') ||
    document.head.appendChild(document.createElement('meta'));
  themeColorMeta.setAttribute('name', 'theme-color');
  themeColorMeta.setAttribute('content', themeColorByMode[theme]);
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey);

  if (isThemeMode(storedTheme)) {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof document !== 'undefined' && isThemeMode(document.documentElement.dataset.theme)) {
      return document.documentElement.dataset.theme;
    }

    return 'light';
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    applyTheme(theme);
    window.localStorage.setItem(themeStorageKey, theme);
  }, [isReady, theme]);

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
  };

  const toggleTheme = () => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isReady,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
