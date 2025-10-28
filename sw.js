let CACHE_NAME = 'meadtrics-cache-v0.0.2.1'; // temporary name until version is loaded

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

// 🔹 Listen for SKIP_WAITING messages from app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 🧩 Always activate immediately, even before waiting for the old worker
self.skipWaiting();

// 🔹 Install: pre-cache essential assets and activate immediately
self.addEventListener('install', e => {
  e.waitUntil(
    (async () => {
      await getCacheName();
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      self.skipWaiting(); // ensure immediate activation
    })()
  );
});

// 🔹 Activate: clean up old caches, claim clients, and refresh open pages
self.addEventListener('activate', e => {
  e.waitUntil(
    (async () => {
      await getCacheName();

      // Delete old caches
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));

      console.log(`🧹 Active cache: ${CACHE_NAME}`);
      await self.clients.claim();

      // Force reload all open pages to apply the new SW
      const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) {
        client.navigate(client.url);
      }
    })()
  );
});

// 🔁 If a new SW becomes active, reload open windows automatically
self.addEventListener('statechange', event => {
  if (event.target.state === 'activated') {
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        client.navigate(client.url);
      }
    });
  }
});

// 🔹 Fetch: online-first strategy with cache update fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(networkRes => {
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const responseClone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseClone));
        }
        return networkRes;
      })
      .catch(() =>
        caches.match(e.request).then(cachedRes => cachedRes || caches.match('./index.html'))
      )
  );
});



