const CACHE_NAME = 'gelatolab-v2';

// Install: cache the app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['./', './index.html'])
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Only cache same-origin GET requests for static assets.
// Skip everything else (POSTs, Supabase, Vite HMR, hashed dev chunks).
function isCacheable(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  // Skip Vite dev server internals and HMR-versioned assets
  if (url.pathname.startsWith('/@vite/')) return false;
  if (url.pathname.startsWith('/@react-refresh')) return false;
  if (url.pathname.startsWith('/src/')) return false;
  if (url.pathname.startsWith('/node_modules/')) return false;
  if (url.searchParams.has('t')) return false; // Vite HMR timestamp
  return true;
}

// Fetch: network-first with safe caching
self.addEventListener('fetch', (e) => {
  const { request } = e;

  if (!isCacheable(request)) {
    // Let the browser handle it normally (no caching, no interception issues)
    return;
  }

  e.respondWith(
    fetch(request)
      .then((res) => {
        // Only cache successful basic/opaque responses
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone).catch(() => { /* ignore quota/unsupported */ });
          });
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
