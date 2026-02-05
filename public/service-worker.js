const CACHE_NAME = 'mekstation-v1';
const RUNTIME_CACHE = 'mekstation-runtime-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add other static assets as needed
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Strategy 1: Cache First for static assets
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy 2: Network First for HTML documents and API calls
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Strategy 3: Stale While Revalidate for JavaScript and CSS
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: Network First
  event.respondWith(networkFirst(request));
});

/**
 * Cache First Strategy
 * Checks cache first, falls back to network
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // If both cache and network fail, return offline fallback for documents
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

/**
 * Network First Strategy
 * Tries network first, falls back to cache
 */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // If both network and cache fail, return offline fallback for documents
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 * Returns cached version immediately, updates cache in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  // Fetch in background to update cache
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Return cached version immediately, or wait for network if no cache
  return cached || fetchPromise;
}

/**
 * Message handler for manual cache management
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      }),
    );
  }
});
