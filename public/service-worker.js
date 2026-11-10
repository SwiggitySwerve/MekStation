const requestedBuild = new URL(self.location.href).searchParams.get('build');
const BUILD_ID =
  requestedBuild &&
  !['development', 'undefined', 'null'].includes(requestedBuild) &&
  /^[a-z0-9_-]{1,128}$/i.test(requestedBuild)
    ? requestedBuild
    : null;
const CACHE_NAME = `mekstation-static-${BUILD_ID ?? 'unversioned'}`;
const RUNTIME_CACHE = `mekstation-runtime-${BUILD_ID ?? 'unversioned'}`;
// A claimed page can still be running the previous build until it reloads.
const retiringClients = new Set();
const readyClients = new Set();

// Assets to cache on install
const STATIC_ASSETS = [
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
  // Existing tabs keep their worker until a new page or explicit update is ready.
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      clients.forEach((client) => retiringClients.add(client.id));
      await self.clients.claim();
      await cleanOldCaches();
    })(),
  );
});

async function cleanOldCaches() {
  const clients = await self.clients.matchAll({ type: 'window' });
  const liveIds = new Set(clients.map((client) => client.id));
  for (const id of retiringClients) {
    if (!liveIds.has(id)) retiringClients.delete(id);
  }
  // Unknown clients may still run an older build, including after worker restart.
  const unconfirmed = clients.filter((client) => !readyClients.has(client.id));
  if (unconfirmed.length > 0) {
    unconfirmed.forEach((client) =>
      client.postMessage({ type: 'REPORT_BUILD' }),
    );
    return;
  }
  const names = await caches.keys();
  await Promise.all(
    names
      .filter(
        (name) =>
          name.startsWith('mekstation-') &&
          name !== CACHE_NAME &&
          name !== RUNTIME_CACHE,
      )
      .map((name) => caches.delete(name)),
  );
}

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

  // Development chunks reuse URLs across builds; cached bytes can mix builds.
  const isNextAsset =
    url.pathname.startsWith('/_next/static/') &&
    /\.(?:js|css)$/i.test(url.pathname);
  if (
    (isNextAsset && !BUILD_ID) ||
    url.pathname.startsWith('/_next/static/development/') ||
    url.pathname === '/_next/webpack-hmr'
  ) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Never recover HTML or Next page data that can reference a retired build.
  if (
    request.destination === 'document' ||
    request.mode === 'navigate' ||
    url.pathname.startsWith('/_next/data/') ||
    /\.html$/i.test(url.pathname)
  ) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (isNextAsset) {
    event.respondWith(cacheFirst(request, event.clientId));
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
async function matchOldAsset(request) {
  const names = await caches.keys();
  for (const name of names) {
    if (
      !name.startsWith('mekstation-') ||
      name === CACHE_NAME ||
      name === RUNTIME_CACHE
    )
      continue;
    const oldCache = await caches.open(name);
    const response = await oldCache.match(request);
    if (response) return response;
  }
}

async function cacheFirst(request, clientId) {
  if (retiringClients.has(clientId)) {
    const oldResponse = await matchOldAsset(request);
    if (oldResponse) return oldResponse;
  }
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  // A restarted worker has no in-memory build report for already-open tabs.
  // Try the network first for unknown clients, but preserve their cached chunks
  // if deployment removed them. Confirmed new pages never use this fallback.
  const canUseOldCache = clientId && !readyClients.has(clientId);
  let response;
  try {
    response = await fetch(request);
  } catch (error) {
    const oldResponse = canUseOldCache && (await matchOldAsset(request));
    if (oldResponse) return oldResponse;
    throw error;
  }
  if (!response.ok && canUseOldCache) {
    const oldResponse = await matchOldAsset(request);
    if (oldResponse) return oldResponse;
  }
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
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
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      if (cached) {
        return cached;
      }
      throw error;
    });

  // Return cached version immediately, or wait for network if no cache
  return cached || fetchPromise;
}

/**
 * Message handler for manual cache management
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }

  if (
    BUILD_ID &&
    event.data?.type === 'BUILD_READY' &&
    event.data.build === BUILD_ID &&
    event.source?.id
  ) {
    readyClients.add(event.source.id);
    retiringClients.delete(event.source.id);
    event.waitUntil(cleanOldCaches());
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      }),
    );
  }
});
