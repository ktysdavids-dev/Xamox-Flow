// Xamox Flow Service Worker v13 (invalidar JS cache tras cambio de config/API)
const STATIC_CACHE = 'xamox-static-v13';
const RUNTIME_CACHE = 'xamox-runtime-v13';
const AUDIO_CACHE = 'xamox-audio-v13';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-xamox.png',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE, AUDIO_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isStaticAsset(url) {
  return /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf)$/i.test(url.pathname);
}

function isMusicFile(url) {
  return url.pathname.startsWith('/music/') && url.pathname.endsWith('.mp3');
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Keep cache fresh in background.
    networkPromise.catch(() => {});
    return cached;
  }

  const network = await networkPromise;
  if (network) return network;
  throw new Error('offline');
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw _;
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Let API/WS pass through untouched.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) return;

  if (isNavigationRequest(event.request)) {
    event.respondWith(
      networkFirst(event.request, RUNTIME_CACHE).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (isMusicFile(url)) {
    event.respondWith(staleWhileRevalidate(event.request, AUDIO_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
});
