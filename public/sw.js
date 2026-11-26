const CACHE_NAME = 'secretarea-offline-v3';
const IMAGE_CACHE_NAME = 'secretarea-images-v1';

const PRECACHE_URLS = ['./', './index.html', './img/logo01.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== IMAGE_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isImageRequest(request, url) {
  if (request.destination === 'image') return true;
  return /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?.*)?$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept Google Apps Script API requests or Vite dev module URLs
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@id/')
  ) {
    return;
  }

  // Navigation requests: network first, fallback to cached index.html offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match('./index.html').then((r) => r || caches.match('/index.html') || caches.match('./'))
        )
    );
    return;
  }

  // Image requests (same-origin & external game covers): cache-first by exact URL across all caches
  if (isImageRequest(request, url)) {
    event.respondWith(
      caches.match(request.url, { ignoreVary: true }).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) {
              const copy = response.clone();
              caches.open(IMAGE_CACHE_NAME).then((cache) => cache.put(request.url, copy));
            }
            return response;
          })
          .catch(() => new Response('', { status: 404, statusText: 'Offline image unavailable' }));
      })
    );
    return;
  }

  // Same-origin static scripts/styles/fonts
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font';

  if (isSameOrigin || isStaticAsset) {
    event.respondWith(
      caches.match(request, { ignoreVary: true }).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
  }
});
