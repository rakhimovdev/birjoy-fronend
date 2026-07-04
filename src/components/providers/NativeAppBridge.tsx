'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import { Button } from '@/components/ui/button';
import {
  areNativePlatformDiagnosticsEqual,
  extractInAppPath,
  getNativePlatformDiagnostics,
  isLikelyNativeAndroidShell,
  type NativeAppRestoredResult,
  isOwnedSiteUrl,
  logNativeAuthDebug,
} from '@/lib/native-app';

const supportedExternalProtocols = new Set(['http:', 'https:']);

function getHrefFromElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  return target.closest('a[href]') as HTMLAnchorElement | null;
}

export function NativeAppBridge() {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const [nativeDiagnostics, setNativeDiagnostics] = useState(() =>
    getNativePlatformDiagnostics()
  );
  const nativeApp = nativeDiagnostics.isNativeAndroidApp;

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | null = null;
    let pollAttempts = 0;

    const syncNativeDiagnostics = (reason: string) => {
      const nextDiagnostics = getNativePlatformDiagnostics();

      setNativeDiagnostics((currentDiagnostics) => {
        if (areNativePlatformDiagnosticsEqual(currentDiagnostics, nextDiagnostics)) {
          return currentDiagnostics;
        }

        logNativeAuthDebug('native-bridge-diagnostics-updated', {
          reason,
          diagnostics: nextDiagnostics,
        });
        return nextDiagnostics;
      });

      return nextDiagnostics;
    };

    const initialDiagnostics = syncNativeDiagnostics('mount');

    if (!isLikelyNativeAndroidShell(initialDiagnostics) && !initialDiagnostics.hasAndroidBridge) {
      return () => {
        cancelled = true;
      };
    }

    const pollNativeDiagnostics = () => {
      if (cancelled) {
        return;
      }

      pollAttempts += 1;
      const nextDiagnostics = syncNativeDiagnostics(`poll-${pollAttempts}`);

      if (nextDiagnostics.isNativeAndroidApp) {
        return;
      }

      if (pollAttempts >= 40) {
        return;
      }

      pollTimer = window.setTimeout(pollNativeDiagnostics, 150);
    };

    pollTimer = window.setTimeout(pollNativeDiagnostics, 150);

    return () => {
      cancelled = true;
      if (pollTimer) {
        window.clearTimeout(pollTimer);
      }
    };
  }, []);

  useEffect(() => {
    const diagnostics = nativeDiagnostics;
    logNativeAuthDebug('native-bridge-mounted', diagnostics);
    Object.assign(window, {
      __birjoyNativeDiagnostics: diagnostics,
    });

    if (!nativeApp) {
      logNativeAuthDebug('native-bridge-web-mode', diagnostics);
      return;
    }

    document.documentElement.dataset.nativePlatform = 'capacitor';
    document.body.dataset.nativePlatform = 'capacitor';

    const originalOpen = window.open.bind(window);
    const cleanupTasks: Array<() => void> = [];

    const openExternally = (urlValue: string) => {
      try {
        const resolvedUrl = new URL(urlValue, window.location.href);

        if (!supportedExternalProtocols.has(resolvedUrl.protocol)) {
          return;
        }

        void Browser.open({
          url: resolvedUrl.toString(),
        });
      } catch {
        return;
      }
    };

    const navigateInApp = (url: string) => {
      const appPath = extractInAppPath(url);

      if (!appPath) {
        return false;
      }

      router.push(appPath);
      return true;
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const anchor = getHrefFromElement(event.target);

      if (!anchor || anchor.dataset.nativeIgnore === 'true' || anchor.hasAttribute('download')) {
        return;
      }

      const rawHref = anchor.getAttribute('href') || '';

      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('sms:')
      ) {
        return;
      }

      let resolvedUrl: URL;

      try {
        resolvedUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (!supportedExternalProtocols.has(resolvedUrl.protocol)) {
        return;
      }

      const shouldHandleBlank = anchor.target === '_blank';
      const isSameOrigin = resolvedUrl.origin === window.location.origin;

      if (isOwnedSiteUrl(resolvedUrl) && shouldHandleBlank) {
        event.preventDefault();
        router.push(`${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`);
        return;
      }

      if (!isSameOrigin && !isOwnedSiteUrl(resolvedUrl)) {
        event.preventDefault();
        openExternally(resolvedUrl.toString());
      }
    };

    window.open = ((url?: string | URL | undefined, target?: string) => {
      if (!url) {
        return null;
      }

      try {
        const resolvedUrl = new URL(String(url), window.location.href);

        if (!supportedExternalProtocols.has(resolvedUrl.protocol)) {
          return originalOpen(url, target);
        }

        if (isOwnedSiteUrl(resolvedUrl) && navigateInApp(resolvedUrl.toString())) {
          return window;
        }

        if (resolvedUrl.origin !== window.location.origin || target === '_blank') {
          openExternally(resolvedUrl.toString());
          return null;
        }
      } catch {
        return originalOpen(url, target);
      }

      return originalOpen(url, target);
    }) as typeof window.open;

    document.addEventListener('click', handleDocumentClick, true);
    cleanupTasks.push(() => {
      document.removeEventListener('click', handleDocumentClick, true);
    });

    void App.getLaunchUrl().then((launchData) => {
      logNativeAuthDebug('native-bridge-launch-url', {
        launchUrl: launchData?.url || '',
      });
      if (launchData?.url) {
        const handled = navigateInApp(launchData.url);

        if (!handled) {
          openExternally(launchData.url);
        }
      }
    });

    void App.addListener('appUrlOpen', ({ url }) => {
      logNativeAuthDebug('native-bridge-app-url-open', {
        url,
      });
      const handled = navigateInApp(url);

      if (!handled) {
        openExternally(url);
      }
    }).then((listener) => {
      cleanupTasks.push(() => {
        void listener.remove();
      });
    });

    void App.addListener('appRestoredResult', (result) => {
      const restoredResult: NativeAppRestoredResult = {
        ...result,
        receivedAt: Date.now(),
      };

      logNativeAuthDebug('native-bridge-app-restored-result', {
        pluginId: restoredResult.pluginId,
        methodName: restoredResult.methodName,
        success: restoredResult.success,
      });
      window.__birjoyLastAppRestoredResult = restoredResult;
      window.dispatchEvent(
        new CustomEvent('birjoy:app-restored-result', {
          detail: restoredResult,
        })
      );
    }).then((listener) => {
      cleanupTasks.push(() => {
        void listener.remove();
      });
    });

    void Network.getStatus().then((status) => {
      logNativeAuthDebug('native-bridge-network-status', {
        connected: status.connected,
        connectionType: status.connectionType,
      });
      setIsOffline(!status.connected);
    });

    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    cleanupTasks.push(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });

    void Network.addListener('networkStatusChange', (status) => {
      setIsOffline(!status.connected);
    }).then((listener) => {
      cleanupTasks.push(() => {
        void listener.remove();
      });
    });

    cleanupTasks.push(() => {
      window.open = originalOpen;
      delete document.documentElement.dataset.nativePlatform;
      delete document.body.dataset.nativePlatform;
    });

    return () => {
      cleanupTasks.forEach((cleanup) => cleanup());
    };
  }, [nativeApp, nativeDiagnostics, router]);

  if (!nativeApp || !isOffline) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 top-4 z-[70] rounded-2xl border border-amber-500/30 bg-card/95 p-4 shadow-[var(--surface-shadow)] backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Internet aloqasi uzildi</p>
          <p className="text-sm text-muted-foreground">
            Aloqa qaytgach, BirJoy avtomatik ishlashda davom etadi.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          Qayta urinish
        </Button>
      </div>
    </div>
  );
}
