let CACHE_NAME = 'meadtrics-cache-v1.0.3.2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js',
];

// 🔹 Dynamically detect manifest path and read version
async function getCacheName() {
  try {
    let manifestPath;

    // Detect hosting path (GitHub Pages or local)
    if (self.location.pathname.includes('/Meadtrics/')) {
      manifestPath = '/Meadtrics/manifest.json';
    } else {
      manifestPath = './manifest.json';
    }

    const res = await fetch(manifestPath, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const manifest = await res.json();
    if (manifest.version) {
      CACHE_NAME = `meadtrics-cache-v${manifest.version}`;
      console.log(`☁️ MeadTrics PWA version ${manifest.version} loaded`);
    } else {
      console.warn('⚠️ Manifest missing version field — using fallback cache name.');
    }
  } catch (err) {
    console.warn('⚠️ Could not read manifest version, using fallback cache name.', err);
  }
}

// 🔹 Listen for SKIP_WAITING messages from the app (USER CONFIRMED)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🟢 Update accepted by user');
    self.skipWaiting();
  }
});

// 🔹 Install: pre-cache essential assets ONLY
self.addEventListener('install', e => {
  e.waitUntil(
    (async () => {
      await getCacheName();
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      // ❌ DO NOT auto-activate
    })()
  );
});

// 🔹 Activate: clean up old caches & take control
self.addEventListener('activate', e => {
  e.waitUntil(
    (async () => {
      await getCacheName();

      // Remove old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );

      console.log(`🧹 Active cache: ${CACHE_NAME}`);
      await self.clients.claim();
    })()
  );
});

// 🔹 Fetch: online-first with cache update fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(networkRes => {
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
        caches.match(e.request).then(
          cachedRes => cachedRes || caches.match('./index.html')
        )
      )
  );
});