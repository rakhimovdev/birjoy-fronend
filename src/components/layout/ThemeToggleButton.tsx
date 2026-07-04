'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useI18n } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/utils';

export function ThemeToggleButton({ className }: { className?: string }) {
  const { isReady, theme, toggleTheme } = useTheme();
  const { messages } = useI18n();
  const isDarkTheme = theme === 'dark';
  const label = isDarkTheme ? messages.navbar.switchToLight : messages.navbar.switchToDark;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        'touch-target relative rounded-full border shadow-sm transition-colors marketplace-glass-button',
        className
      )}
      aria-label={label}
      title={label}
    >
      <Sun
        className={cn(
          'absolute h-5 w-5 transition-all duration-300',
          isDarkTheme ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
        )}
      />
      <Moon
        className={cn(
          'absolute h-5 w-5 transition-all duration-300',
          isDarkTheme ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
        )}
      />
      <span className="sr-only">{isReady ? label : messages.navbar.theme}</span>
    </Button>
  );
}
