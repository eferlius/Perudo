const CACHE_VERSION = new Date().toISOString().split('T')[0]; // Auto-updates daily
const CACHE_NAME = `perudo-${CACHE_VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy for HTML files
  if (event.request.url.includes('.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for other resources
    event.respondWith(
      caches.match(event.request).then(resp => resp || fetch(event.request))
    );
  }
});
