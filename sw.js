let CACHE_NAME = 'meadtrics-cache-v0'; // placeholder until we load from manifest

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js',
];

// 🔹 Try to load version from manifest.json
async function getCacheName() {
  try {
    const res = await fetch('./manifest.json', { cache: 'no-store' });
    const manifest = await res.json();
    if (manifest.version) {
      CACHE_NAME = `meadtrics-cache-v${manifest.version}`;
    }
  } catch (err) {
    console.warn('⚠️ Could not read manifest version, using fallback cache name.', err);
  }
}

// 🔹 Allow manual update activation
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 🔹 Install: pre-cache essential files with versioned name
self.addEventListener('install', e => {
  e.waitUntil(
    (async () => {
      await getCacheName(); // load version dynamically
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      self.skipWaiting();
    })()
  );
});

// 🔹 Activate: remove old versioned caches
self.addEventListener('activate', e => {
  e.waitUntil(
    (async () => {
      await getCacheName();
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      self.clients.claim();
    })()
  );
});

// 🔹 Fetch: online-first with cache update
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(networkRes => {
        // ✅ Update cache if request succeeds
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
        // ✅ Fallback to cache when offline
        caches.match(e.request).then(cachedRes => {
          return cachedRes || caches.match('./index.html');
        })
      )
  );
});
