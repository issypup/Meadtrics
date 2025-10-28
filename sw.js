let CACHE_NAME = 'meadtrics-cache-v0'; // temporary name until version is loaded

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js',
];

// 🔹 Try to read version from manifest.json
async function getCacheName() {
  try {
	  
	  const MANIFEST_PATH = self.location.pathname.includes('/Meadtrics/')
  ? '/Meadtrics/manifest.json'
  : './manifest.json';
  
    const res = await fetch(MANIFEST_PATH, { cache: 'no-store' });
	
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

// 🔹 Listen for SKIP_WAITING from app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 🔹 Install: pre-cache essential files using manifest version
self.addEventListener('install', e => {
  e.waitUntil(
    (async () => {
      await getCacheName();
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      self.skipWaiting();
    })()
  );
});

// 🔹 Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    (async () => {
      await getCacheName();
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      console.log(`🧹 Active cache: ${CACHE_NAME}`);
      self.clients.claim();
    })()
  );
});

// 🔹 Fetch: online-first with background cache refresh
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
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseClone));
        }
        return networkRes;
      })
      .catch(() =>
        caches.match(e.request).then(cachedRes => cachedRes || caches.match('./index.html'))
      )
  );
});
