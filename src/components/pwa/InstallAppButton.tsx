'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/providers/LocaleProvider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type InstallAppButtonProps = {
  className?: string;
  compact?: boolean;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function detectIosDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as NavigatorWithStandalone).standalone)
  );
}

export function InstallAppButton({
  className,
  compact = false,
}: InstallAppButtonProps) {
  const { messages } = useI18n();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    setIsIos(detectIosDevice());
    setIsStandalone(isStandaloneMode());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // The browser may still allow manual installation through its own menu.
      });
    }

    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      toast({
        title: messages.navbar.installSuccessTitle,
        description: messages.navbar.installSuccessDescription,
      });
    };

    const handleStandaloneChange = () => {
      setIsStandalone(isStandaloneMode());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneMediaQuery.addEventListener('change', handleStandaloneChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneMediaQuery.removeEventListener('change', handleStandaloneChange);
    };
  }, [messages, toast]);

  if (isStandalone || (!deferredPrompt && !isIos)) {
    return null;
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstalling(false);

      if (result.outcome === 'dismissed') {
        toast({
          title: messages.navbar.installPromptTitle,
          description: messages.navbar.installPromptDescription,
        });
      }

      return;
    }

    if (isIos) {
      toast({
        title: messages.navbar.installIosTitle,
        description: messages.navbar.installIosDescription,
      });
      return;
    }

    toast({
      title: messages.navbar.installUnavailableTitle,
      description: messages.navbar.installUnavailableDescription,
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleInstall()}
      disabled={isInstalling}
      className={cn(
        'border-primary/20 bg-white/75 font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10 hover:text-primary',
        compact ? 'h-10 gap-2 px-3 sm:px-4' : 'h-10 gap-2 px-4',
        className
      )}
      aria-label={messages.navbar.installApp}
    >
      <Download className="h-4 w-4" />
      <span className="inline">
        {messages.navbar.installApp}
      </span>
    </Button>
  );
}
