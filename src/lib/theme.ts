export const themeStorageKey = 'birjoy-theme';
export const themeColorByMode = {
  light: '#0B48D6',
  dark: '#07101F',
} as const;

export const themes = ['light', 'dark'] as const;

export type ThemeMode = (typeof themes)[number];

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function getThemeInlineScript() {
  return `
    (() => {
      try {
        const storageKey = '${themeStorageKey}';
        const storedTheme = window.localStorage.getItem(storageKey);
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = storedTheme === 'light' || storedTheme === 'dark'
          ? storedTheme
          : systemPrefersDark
            ? 'dark'
            : 'light';
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
        const themeColorMeta =
          document.querySelector('meta[name="theme-color"]') ||
          document.head.appendChild(document.createElement('meta'));
        themeColorMeta.setAttribute('name', 'theme-color');
        themeColorMeta.setAttribute(
          'content',
          theme === 'dark' ? '${themeColorByMode.dark}' : '${themeColorByMode.light}'
        );
      } catch (error) {
        document.documentElement.classList.remove('dark');
        document.documentElement.dataset.theme = 'light';
        document.documentElement.style.colorScheme = 'light';
      }
    })();
  `;
}
