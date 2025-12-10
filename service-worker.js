const CACHE_VERSION = 'v' + new Date().getTime(); // Versione sempre nuova
const CACHE_NAME = `perudo-${CACHE_VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...', CACHE_NAME);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching files');
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      console.log('Service Worker: Removing old caches');
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('Service Worker: Deleting cache', k);
          return caches.delete(k);
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // SEMPRE Network-first per index.html per garantire aggiornamenti
  if (event.request.url.includes('.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          console.log('Service Worker: Fetched from network', event.request.url);
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          console.log('Service Worker: Falling back to cache', event.request.url);
          return caches.match(event.request);
        })
    );
  } 
  // Per Firebase, sempre dalla rete
  else if (event.request.url.includes('firebase') || event.request.url.includes('firebasedatabase')) {
    event.respondWith(fetch(event.request));
  }
  // Cache-first per altre risorse statiche
  else {
    event.respondWith(
      caches.match(event.request).then(resp => {
        if (resp) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return resp;
        }
        console.log('Service Worker: Fetching', event.request.url);
        return fetch(event.request);
      })
    );
  }
});
