const CACHE_NAME = 'meadtrics-cache-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js',
];

// 🔹 Allow manual update activation
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 🔹 Install: pre-cache essential files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 🔹 Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 🔹 Fetch: online-first with cache update
self.addEventListener('fetch', e => {
  // Ignore non-GET requests (e.g., POST to cloud API)
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(networkRes => {
        // ✅ Update cache in background for fresh assets
        if (
          networkRes &&
          networkRes.status === 200 &&
          networkRes.type === 'basic'
        ) {
          const responseClone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseClone);
          });
        }
        return networkRes;
      })
      .catch(() =>
        // ✅ Offline fallback
        caches.match(e.request).then(cachedRes => {
          return cachedRes || caches.match('./index.html');
        })
      )
  );
});
