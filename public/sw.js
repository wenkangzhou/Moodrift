const CACHE_NAME = 'moodrift-v3';
const STATIC_HOST = self.location.origin;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests and API calls
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    return;
  }

  // Skip audio streams — let them pass through
  if (request.url.match(/\.(mp3|m4a|ogg|wav|flac)(\?.*)?$/i)) {
    return;
  }

  // Skip caching in development (localhost)
  if (self.location.hostname === 'localhost') {
    return;
  }

  const url = new URL(request.url);

  // Navigation requests (HTML pages): Network-first, fallback to cache
  // This ensures code updates are visible immediately on next visit.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Same-origin static assets (JS, CSS, images): Stale-while-revalidate
  // Next.js hashes filenames, so updated code always requests new files.
  if (url.origin === STATIC_HOST) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);

        // Return cached immediately if available, while updating in background
        return cached || fetchPromise;
      })
    );
    return;
  }
});
