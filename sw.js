
const CACHE_NAME = 'm3u-creator-cache-v2';
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg',
    'https://cdn.tailwindcss.com'
];

let dynamicM3uContent = '';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL_URLS))
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SET_M3U_CONTENT') {
        dynamicM3uContent = event.data.content;
    }
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Interceptamos la petición al archivo m3u virtual
    if (url.pathname === '/playlist.m3u') {
        event.respondWith(
            new Response(dynamicM3uContent || '#EXTM3U', {
                headers: {
                    'Content-Type': 'application/mpegurl',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            })
        );
        return;
    }

    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cachedResponse = await cache.match(event.request);
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse.ok) {
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            }).catch(() => null);

            return cachedResponse || fetchPromise;
        })
    );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    })
  );
});
