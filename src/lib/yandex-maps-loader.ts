'use client';

import { useEffect, useState } from 'react';

const YANDEX_MAPS_SCRIPT_ID = 'birjoy-yandex-maps-script';
const YANDEX_MAPS_LANGUAGE = 'uz_UZ';

export const YANDEX_MAPS_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() || '';

let yandexMapsPromise: Promise<YMapsApi> | null = null;

function getYandexMapsScriptUrl() {
  return `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}&lang=${YANDEX_MAPS_LANGUAGE}`;
}

function waitForYandexMaps(api: YMapsApi) {
  return new Promise<YMapsApi>((resolve) => {
    api.ready(() => resolve(api));
  });
}

export function hasYandexMapsApiKey() {
  return YANDEX_MAPS_API_KEY.length > 0;
}

export function resetYandexMapsLoader() {
  yandexMapsPromise = null;

  if (typeof window === 'undefined') {
    return;
  }

  const existingScript = document.getElementById(YANDEX_MAPS_SCRIPT_ID);
  existingScript?.remove();
  delete window.ymaps;
}

export function loadYandexMaps(options?: { forceReload?: boolean }) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Yandex Maps can only load in the browser.'));
  }

  if (!hasYandexMapsApiKey()) {
    return Promise.reject(new Error('NEXT_PUBLIC_YANDEX_MAPS_API_KEY is missing.'));
  }

  if (options?.forceReload) {
    resetYandexMapsLoader();
  }

  if (window.ymaps) {
    return waitForYandexMaps(window.ymaps);
  }

  if (yandexMapsPromise) {
    return yandexMapsPromise;
  }

  yandexMapsPromise = new Promise<YMapsApi>((resolve, reject) => {
    const existingScript = document.getElementById(YANDEX_MAPS_SCRIPT_ID) as HTMLScriptElement | null;

    const handleLoaded = () => {
      if (!window.ymaps) {
        yandexMapsPromise = null;
        reject(new Error('Yandex Maps API did not initialize.'));
        return;
      }

      void waitForYandexMaps(window.ymaps).then(resolve).catch((error) => {
        yandexMapsPromise = null;
        reject(error);
      });
    };

    if (existingScript) {
      if (window.ymaps) {
        handleLoaded();
        return;
      }

      existingScript.addEventListener('load', handleLoaded, { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          yandexMapsPromise = null;
          reject(new Error('Yandex Maps script failed to load.'));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = YANDEX_MAPS_SCRIPT_ID;
    script.src = getYandexMapsScriptUrl();
    script.async = true;
    script.defer = true;
    script.onload = handleLoaded;
    script.onerror = () => {
      yandexMapsPromise = null;
      reject(new Error('Yandex Maps script failed to load.'));
    };
    document.head.appendChild(script);
  });

  return yandexMapsPromise;
}

export function useYandexMaps(retryKey = 0) {
  const [api, setApi] = useState<YMapsApi | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setApi(null);
    setError(null);
    setIsLoaded(false);

    void loadYandexMaps({ forceReload: retryKey > 0 })
      .then((loadedApi) => {
        if (cancelled) {
          return;
        }

        setApi(loadedApi);
        setIsLoaded(true);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError : new Error('Yandex Maps could not be loaded.'));
      });

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  return {
    api,
    error,
    isLoaded,
  };
}
