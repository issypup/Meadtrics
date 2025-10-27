const CACHE_NAME = 'meadtrics-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js',
];

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch handler (offline-first)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res =>
      res ||
      fetch(e.request).then(networkRes => {
        // cache new resource silently
        caches.open(CACHE_NAME).then(c => c.put(e.request, networkRes.clone()));
        return networkRes;
      }).catch(() =>
        caches.match('./index.html')
      )
    )
  );
});
