const CACHE_NAME = 'birjoy-pwa-v4';
const CACHE_PREFIX = 'birjoy-pwa-';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);
const IS_LOCAL_DEVELOPMENT =
  LOCAL_HOSTNAMES.has(self.location.hostname) ||
  self.location.hostname.endsWith('.local');
const CACHEABLE_DESTINATIONS = new Set(['image', 'font', 'manifest', 'style']);

function clearBirjoyCaches(predicate = () => true) {
  return caches.keys().then((keys) =>
    Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && predicate(key))
        .map((key) => caches.delete(key))
    )
  );
}

self.addEventListener('install', (event) => {
  if (IS_LOCAL_DEVELOPMENT) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (IS_LOCAL_DEVELOPMENT) {
    event.waitUntil(
      clearBirjoyCaches().then(() => self.registration.unregister())
    );
    return;
  }

  event.waitUntil(
    clearBirjoyCaches((key) => key !== CACHE_NAME)
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (IS_LOCAL_DEVELOPMENT) {
    return;
  }

  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          return caches.match('/');
        })
    );
    return;
  }

  const shouldCacheRequest =
    APP_SHELL.includes(url.pathname) || CACHEABLE_DESTINATIONS.has(request.destination);

  if (!shouldCacheRequest) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response.ok) {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
