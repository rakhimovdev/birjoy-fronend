'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import { Button } from '@/components/ui/button';
import { extractInAppPath, isNativeApp, isOwnedSiteUrl } from '@/lib/native-app';

function getHrefFromElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  return target.closest('a[href]') as HTMLAnchorElement | null;
}

export function NativeAppBridge() {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const nativeApp = useMemo(() => isNativeApp(), []);

  useEffect(() => {
    if (!nativeApp) {
      return;
    }

    document.documentElement.dataset.nativePlatform = 'capacitor';
    document.body.dataset.nativePlatform = 'capacitor';

    const originalOpen = window.open.bind(window);
    const cleanupTasks: Array<() => void> = [];

    const navigateInApp = (url: string) => {
      const appPath = extractInAppPath(url);

      if (!appPath) {
        return;
      }

      router.push(appPath);
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const anchor = getHrefFromElement(event.target);

      if (!anchor || anchor.dataset.nativeIgnore === 'true') {
        return;
      }

      const rawHref = anchor.getAttribute('href') || '';

      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }

      let resolvedUrl: URL;

      try {
        resolvedUrl = new URL(anchor.href, window.location.href);
      } catch {
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
        void Browser.open({
          url: resolvedUrl.toString(),
        });
      }
    };

    window.open = ((url?: string | URL | undefined, target?: string) => {
      if (!url) {
        return null;
      }

      try {
        const resolvedUrl = new URL(String(url), window.location.href);

        if (isOwnedSiteUrl(resolvedUrl)) {
          navigateInApp(resolvedUrl.toString());
          return window;
        }

        if (resolvedUrl.origin !== window.location.origin || target === '_blank') {
          void Browser.open({
            url: resolvedUrl.toString(),
          });
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
      if (launchData?.url) {
        navigateInApp(launchData.url);
      }
    });

    void App.addListener('appUrlOpen', ({ url }) => {
      navigateInApp(url);
    }).then((listener) => {
      cleanupTasks.push(() => {
        void listener.remove();
      });
    });

    void App.addListener('appRestoredResult', (result) => {
      window.dispatchEvent(
        new CustomEvent('birjoy:app-restored-result', {
          detail: result,
        })
      );
    }).then((listener) => {
      cleanupTasks.push(() => {
        void listener.remove();
      });
    });

    void Network.getStatus().then((status) => {
      setIsOffline(!status.connected);
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
  }, [nativeApp, router]);

  if (!nativeApp || !isOffline) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 top-4 z-[70] rounded-2xl border border-amber-200 bg-white/95 p-4 shadow-[0_20px_45px_rgba(7,28,85,0.16)] backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#071C55]">Internet aloqasi uzildi</p>
          <p className="text-sm text-[#4d5c86]">
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
