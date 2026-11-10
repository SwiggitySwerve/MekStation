import type Router from 'next/dist/shared/lib/router/router';

import { markAssetError } from 'next/dist/client/route-loader';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

interface WorkerRequest {
  url: string;
  method: string;
  destination: string;
  mode: string;
}

interface WorkerFetchEvent {
  request?: WorkerRequest;
  clientId?: string;
  respondWith?: (response: Promise<AssetResponse>) => void;
  waitUntil: (promise: Promise<unknown>) => void;
  data?: { type: string; build?: string };
  source?: { id: string };
}

interface AssetResponse {
  ok: boolean;
  text: () => Promise<string>;
  clone: () => AssetResponse;
}

function assetResponse(body: string): AssetResponse {
  return {
    ok: true,
    text: async () => body,
    clone: () => assetResponse(body),
  };
}

type Storage = Map<string, Map<string, AssetResponse>>;

/** Run Next's actual route-error boundary with an observable navigation target. */
function nextRouteRecovery() {
  const routerFile = require.resolve('next/dist/shared/lib/router/router');
  const routerSource = readFileSync(routerFile, 'utf8');
  const exports: { default?: typeof Router } = {};
  const location = { href: 'http://127.0.0.1:3642/' };
  runInNewContext(routerSource, {
    exports,
    module: { exports },
    require: createRequire(routerFile),
    process: { env: { NODE_ENV: 'production' } },
    window: { location },
    location,
    console,
  });
  if (!exports.default) throw new Error('Next did not export its Pages Router');
  const router = Object.create(exports.default.prototype) as Router;
  Object.defineProperties(router, {
    asPath: { value: '/' },
    locale: { value: undefined },
  });
  return { router, location };
}

function workerHarness(
  cachedBody: string | null = 'OLD_BUILD',
  build: string | null = 'production-build-id',
  storage: Storage = new Map(),
  clientIds: string[] = [],
) {
  const handlers = new Map<string, (event: WorkerFetchEvent) => void>();
  const clients = clientIds.map((id) => ({ id, postMessage: jest.fn() }));
  const network = jest.fn(async () => assetResponse('CURRENT_BUILD'));
  const cacheFor = (name: string) => {
    let entries = storage.get(name);
    if (!entries) {
      entries = new Map();
      storage.set(name, entries);
    }
    const contents = entries;
    return {
      match: async (request: WorkerRequest) =>
        contents.get(request.url)?.clone() ??
        (cachedBody === null ? undefined : assetResponse(cachedBody)),
      put: async (request: WorkerRequest, response: AssetResponse) => {
        contents.set(request.url, response);
      },
      addAll: jest.fn(async () => undefined),
    };
  };
  const caches = {
    open: jest.fn(async (name: string) => cacheFor(name)),
    keys: jest.fn(async () => [...storage.keys()]),
    delete: jest.fn(async (name: string) => storage.delete(name)),
    match: jest.fn(async () => assetResponse('OFFLINE_DOCUMENT')),
  };
  const claim = jest.fn(async () => undefined);
  const skipWaiting = jest.fn(async () => undefined);

  runInNewContext(
    readFileSync(resolve(process.cwd(), 'public/service-worker.js'), 'utf8'),
    {
      URL,
      location: { origin: 'http://127.0.0.1:3642' },
      self: {
        location: {
          href: `http://127.0.0.1:3642/service-worker.js${build === null ? '' : `?build=${encodeURIComponent(build)}`}`,
        },
        clients: { matchAll: jest.fn(async () => clients), claim },
        skipWaiting,
        addEventListener: (
          name: string,
          handler: (event: WorkerFetchEvent) => void,
        ) => {
          handlers.set(name, handler);
        },
      },
      caches,
      fetch: network,
    },
  );

  function dispatch(
    path: string,
    destination = 'script',
    options: Partial<WorkerRequest> = {},
    clientId = 'current-page',
  ) {
    const request: WorkerRequest = {
      url: `http://127.0.0.1:3642${path}`,
      method: 'GET',
      destination,
      mode: 'cors',
      ...options,
    };
    let response: Promise<AssetResponse> | undefined;
    const handleFetch = handlers.get('fetch');
    if (!handleFetch)
      throw new Error('Worker did not register a fetch handler');
    handleFetch({
      request,
      clientId,
      waitUntil: () => undefined,
      respondWith: (promise) => {
        response = promise;
      },
    });
    return response;
  }

  async function lifecycle(
    name: string,
    data?: WorkerFetchEvent['data'],
    clientId = 'current-page',
  ) {
    const pending: Promise<unknown>[] = [];
    handlers.get(name)?.({
      data,
      source: { id: clientId },
      waitUntil: (promise) => pending.push(promise),
    });
    await Promise.all(pending);
  }

  return {
    dispatch,
    network,
    caches,
    storage,
    lifecycle,
    clients,
    claim,
    skipWaiting,
  };
}

describe('shipped service worker asset delivery', () => {
  it.each([
    ['/_next/static/chunks/pages/_app.js', 'script'],
    ['/_next/static/chunks/webpack.js', 'script'],
    ['/_next/static/css/app.css', 'style'],
    ['/_next/static/development/_buildManifest.js', 'script'],
    ['/_next/static/development/_ssgManifest.js', 'script'],
    ['/_next/webpack-hmr', ''],
  ])(
    'delivers current network bytes for development asset %s',
    async (path, destination) => {
      const worker = workerHarness('OLD_BUILD', 'development');
      expect(await (await worker.dispatch(path, destination))?.text()).toBe(
        'CURRENT_BUILD',
      );
      worker.network.mockResolvedValueOnce(assetResponse('NEXT_BUILD'));
      expect(await (await worker.dispatch(path, destination))?.text()).toBe(
        'NEXT_BUILD',
      );
      expect(worker.network).toHaveBeenCalledWith(
        expect.objectContaining({ url: `http://127.0.0.1:3642${path}` }),
        { cache: 'no-store' },
      );
      expect(worker.caches.open).not.toHaveBeenCalled();
    },
  );

  it('rejects failed development delivery instead of returning stale bytes', async () => {
    const worker = workerHarness('OLD_BUILD', 'development');
    worker.network.mockRejectedValueOnce(new Error('NETWORK_OFFLINE'));
    await expect(
      worker.dispatch('/_next/static/chunks/pages/_app.js'),
    ).rejects.toThrow('NETWORK_OFFLINE');
  });

  it.each([
    ['/_next/static/chunks/123-a0b1c2d3e4f5.js', 'script'],
    ['/_next/static/chunks/pages/_app-a0b1c2d3e4f5.js', 'script'],
    ['/_next/static/css/a0b1c2d3e4f5.css', 'style'],
    ['/_next/static/production-build-id/_buildManifest.js', 'script'],
    ['/vendor/custom.js', 'script'],
    ['/theme/custom.css', 'style'],
    ['/_next/static/chunks/custom.wasm', 'script'],
  ])(
    'retains cached production or unknown asset behavior for %s',
    async (path, destination) => {
      const worker = workerHarness();
      expect(await (await worker.dispatch(path, destination))?.text()).toBe(
        'OLD_BUILD',
      );
    },
  );

  it.each([
    ['/_next/static/chunks/123-a0b1c2d3e4f5.js', 'script'],
    ['/_next/static/css/a0b1c2d3e4f5.css', 'style'],
  ])(
    'keeps cached production asset available during a stalled network: %s',
    async (path, destination) => {
      const worker = workerHarness();
      worker.network.mockImplementationOnce(
        () => new Promise<AssetResponse>(() => {}),
      );
      expect(await (await worker.dispatch(path, destination))?.text()).toBe(
        'OLD_BUILD',
      );
    },
  );

  it.each([
    ['/_next/static/chunks/123-a0b1c2d3e4f5.js', 'script'],
    ['/_next/static/css/a0b1c2d3e4f5.css', 'style'],
    ['/_next/static/production-build-id/_buildManifest.js', 'script'],
  ])(
    'keeps cached production bytes when the background network rejects: %s',
    async (path, destination) => {
      const worker = workerHarness();
      worker.network.mockRejectedValueOnce(new Error('NETWORK_OFFLINE'));
      expect(await (await worker.dispatch(path, destination))?.text()).toBe(
        'OLD_BUILD',
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    },
  );

  it('preserves network failure when a production asset has no cached copy', async () => {
    const worker = workerHarness(null);
    worker.network.mockRejectedValueOnce(new Error('NETWORK_OFFLINE'));
    await expect(
      worker.dispatch('/_next/static/chunks/123-a0b1c2d3e4f5.js'),
    ).rejects.toThrow('NETWORK_OFFLINE');
  });

  it.each([
    ['/icons/icon.svg', 'image'],
    ['/fonts/app.woff2', 'font'],
  ])('preserves cache-first static assets: %s', async (path, destination) => {
    const worker = workerHarness('CACHED_STATIC');
    expect(await (await worker.dispatch(path, destination))?.text()).toBe(
      'CACHED_STATIC',
    );
    expect(worker.network).not.toHaveBeenCalled();
  });

  it('rejects offline navigation rather than returning HTML for a dead build', async () => {
    const worker = workerHarness('CACHED_DOCUMENT');
    worker.network.mockRejectedValueOnce(new Error('NETWORK_OFFLINE'));
    await expect(worker.dispatch('/customizer', 'document')).rejects.toThrow(
      'NETWORK_OFFLINE',
    );
  });

  it('rejects offline navigation without an empty document fallback', async () => {
    const worker = workerHarness(null);
    worker.network.mockRejectedValueOnce(new Error('NETWORK_OFFLINE'));
    await expect(worker.dispatch('/customizer', 'document')).rejects.toThrow(
      'NETWORK_OFFLINE',
    );
  });

  it('does not intercept cross-origin or non-GET requests', () => {
    const worker = workerHarness();
    expect(
      worker.dispatch('/_next/static/chunks/pages/_app.js', 'script', {
        url: 'https://other.example/_next/static/chunks/pages/_app.js',
      }),
    ).toBeUndefined();
    expect(
      worker.dispatch('/api/units', '', { method: 'POST' }),
    ).toBeUndefined();
    expect(worker.network).not.toHaveBeenCalled();
    expect(worker.caches.open).not.toHaveBeenCalled();
  });
});

describe('build-scoped chunk caching and deployment', () => {
  const chunk = '/_next/static/chunks/0-jtjk4f1h6z3.js';

  it('hard-navigates an open old-build tab to its intended route when its never-loaded chunk was removed', async () => {
    const old = workerHarness(null, 'build-A');
    await old.dispatch(chunk, 'script', {}, 'old-tab');
    const unvisitedChunk = '/_next/static/chunks/087w_7_qpb0a8.js';
    const target = '/unvisited-route?view=details#equipment';
    expect(
      [...old.storage.values()].some((cache) =>
        cache.has(`http://127.0.0.1:3642${unvisitedChunk}`),
      ),
    ).toBe(false);

    // Deployment B removed A's route chunk; this tab still has A's worker.
    old.network.mockResolvedValueOnce({
      ...assetResponse('Not found'),
      ok: false,
    });
    const missing = await old.dispatch(unvisitedChunk, 'script', {}, 'old-tab');
    expect(missing?.ok).toBe(false);
    const { router, location } = nextRouteRecovery();
    await expect(
      router.handleRouteInfoError(
        markAssetError(new Error(`Failed to load script: ${unvisitedChunk}`)),
        '/unvisited-route',
        { view: 'details' },
        target,
        { shallow: false },
      ),
    ).rejects.toMatchObject({ cancelled: true });
    expect(location.href).toBe(target);

    // The resulting full navigation obtains B's HTML, not an error page or A's cached HTML.
    old.network.mockResolvedValueOnce(
      assetResponse(
        '<script src="/_next/static/chunks/new-build-route.js"></script>',
      ),
    );
    expect(
      await (
        await old.dispatch(
          location.href,
          'document',
          { mode: 'navigate' },
          'old-tab',
        )
      )?.text(),
    ).toContain('new-build-route.js');
    expect(old.network).toHaveBeenLastCalledWith(
      expect.objectContaining({ destination: 'document' }),
      { cache: 'no-store' },
    );
  });

  it.each([
    [chunk, 'script'],
    ['/_next/static/chunks/00athqnxrws8j.css', 'style'],
  ])(
    'caches a Turbopack asset on its second fetch: %s',
    async (path, destination) => {
      const worker = workerHarness(null, 'build-A');
      expect(await (await worker.dispatch(path, destination))?.text()).toBe(
        'CURRENT_BUILD',
      );
      expect(await (await worker.dispatch(path, destination))?.text()).toBe(
        'CURRENT_BUILD',
      );
      expect(worker.network).toHaveBeenCalledTimes(1);
      expect([...worker.storage.keys()]).toContain('mekstation-static-build-A');
    },
  );

  it.each([null, '', 'undefined', 'null', 'development', '../odd/build', ' '])(
    'uses network-only chunks without a usable production build: %s',
    async (build) => {
      const worker = workerHarness('STALE', build);
      await worker.dispatch(chunk);
      await worker.dispatch(chunk);
      expect(worker.network).toHaveBeenCalledTimes(2);
      expect(worker.network).toHaveBeenCalledWith(expect.anything(), {
        cache: 'no-store',
      });
      expect(worker.caches.open).not.toHaveBeenCalled();
    },
  );

  it.each([
    '/_next/static/development/_buildManifest.js',
    '/_next/webpack-hmr',
  ])(
    'never caches an explicit development endpoint in production: %s',
    async (path) => {
      const worker = workerHarness(null, 'build-A');
      await worker.dispatch(path);
      expect(worker.network).toHaveBeenCalledWith(expect.anything(), {
        cache: 'no-store',
      });
      expect(worker.caches.open).not.toHaveBeenCalled();
    },
  );

  it('fetches a cache miss and preserves a failed network request', async () => {
    const worker = workerHarness(null, 'build-A');
    worker.network.mockRejectedValueOnce(new Error('CHUNK_GONE'));
    await expect(worker.dispatch(chunk)).rejects.toThrow('CHUNK_GONE');
    expect(worker.network).toHaveBeenCalledTimes(1);
  });

  it('returns unsuccessful HTTP responses without caching them', async () => {
    const worker = workerHarness(null, 'build-A');
    worker.network.mockResolvedValue({
      ...assetResponse('NOT_FOUND'),
      ok: false,
    });
    expect(await (await worker.dispatch(chunk))?.text()).toBe('NOT_FOUND');
    await worker.dispatch(chunk);
    expect(worker.network).toHaveBeenCalledTimes(2);
  });

  it('waits for an explicit update instead of skipping waiting on install', async () => {
    const worker = workerHarness(null, 'build-B');
    await worker.lifecycle('install');
    expect(worker.skipWaiting).not.toHaveBeenCalled();
    await worker.lifecycle('message', { type: 'SKIP_WAITING' });
    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('claims clients before cleanup and preserves old chunks until an old tab loads the new build', async () => {
    const old = workerHarness(null, 'build-A');
    await old.dispatch(chunk);
    old.storage.set('unrelated-app-cache', new Map());
    const next = workerHarness(null, 'build-B', old.storage, ['old-tab']);
    let retainedAtClaim = false;
    next.claim.mockImplementation(async () => {
      retainedAtClaim = old.storage.has('mekstation-static-build-A');
    });
    await next.lifecycle('activate');
    expect(next.claim).toHaveBeenCalledTimes(1);
    expect(retainedAtClaim).toBe(true);
    expect(old.storage.has('mekstation-static-build-A')).toBe(true);
    expect(
      await (await next.dispatch(chunk, 'script', {}, 'old-tab'))?.text(),
    ).toBe('CURRENT_BUILD');
    expect(next.network).not.toHaveBeenCalled();
    await next.lifecycle(
      'message',
      { type: 'BUILD_READY', build: 'build-A' },
      'old-tab',
    );
    expect(old.storage.has('mekstation-static-build-A')).toBe(true);
    await next.lifecycle(
      'message',
      { type: 'BUILD_READY', build: 'build-B' },
      'old-tab',
    );
    expect(old.storage.has('mekstation-static-build-A')).toBe(false);
    expect(old.storage.has('unrelated-app-cache')).toBe(true);
    next.network.mockRejectedValueOnce(new Error('OLD_CHUNK_REMOVED'));
    await expect(next.dispatch(chunk)).rejects.toThrow('OLD_CHUNK_REMOVED');
  });

  it('keeps old caches until every live old tab has switched or closed', async () => {
    const storage: Storage = new Map([
      ['mekstation-static-build-A', new Map()],
    ]);
    const next = workerHarness(null, 'build-B', storage, ['one', 'two']);
    await next.lifecycle('activate');
    await next.lifecycle(
      'message',
      { type: 'BUILD_READY', build: 'build-B' },
      'one',
    );
    expect(storage.has('mekstation-static-build-A')).toBe(true);
    next.clients.splice(1, 1);
    await next.lifecycle(
      'message',
      { type: 'BUILD_READY', build: 'build-B' },
      'one',
    );
    expect(storage.has('mekstation-static-build-A')).toBe(false);
  });

  it('retires legacy and old-build caches on activation when no old clients remain', async () => {
    const storage: Storage = new Map([
      ['mekstation-v1', new Map()],
      ['mekstation-runtime-v1', new Map()],
      ['mekstation-static-build-A', new Map()],
    ]);
    const next = workerHarness(null, 'build-B', storage);
    await next.lifecycle('activate');
    expect([...storage.keys()]).toEqual([]);
    await next.dispatch(chunk);
    expect([...storage.keys()]).toEqual(['mekstation-static-build-B']);
  });

  it('does not reuse old bytes for a new build even if a URL repeats', async () => {
    const old = workerHarness(null, 'build-A');
    old.network.mockResolvedValue(assetResponse('A'));
    await old.dispatch(chunk);
    const next = workerHarness(null, 'build-B', old.storage);
    next.network.mockResolvedValue(assetResponse('B'));
    expect(await (await next.dispatch(chunk))?.text()).toBe('B');
    expect(next.network).toHaveBeenCalledTimes(1);
  });

  it('preserves old tabs and their cached chunks after the browser restarts the worker', async () => {
    const old = workerHarness(null, 'build-A');
    await old.dispatch(chunk);
    const restarted = workerHarness(null, 'build-B', old.storage, [
      'old-tab',
      'new-tab',
    ]);
    await restarted.lifecycle(
      'message',
      { type: 'BUILD_READY', build: 'build-B' },
      'new-tab',
    );
    expect(old.storage.has('mekstation-static-build-A')).toBe(true);
    restarted.network.mockRejectedValueOnce(new Error('OLD_SERVER_CHUNK_GONE'));
    expect(
      await (await restarted.dispatch(chunk, 'script', {}, 'old-tab'))?.text(),
    ).toBe('CURRENT_BUILD');
  });

  it.each([
    ['/customizer', 'document', 'navigate'],
    ['/_next/data/build-B/customizer.json', '', 'cors'],
  ])(
    'gets new page data from the network after deployment: %s',
    async (path, destination, mode) => {
      const old = workerHarness(null, 'build-A');
      old.network.mockResolvedValue(
        assetResponse('<script src="old.js"></script>'),
      );
      await old.dispatch(path, destination, { mode });
      const next = workerHarness(null, 'build-B', old.storage);
      await next.lifecycle('activate');
      next.network.mockResolvedValue(
        assetResponse('<script src="new.js"></script>'),
      );
      expect(
        await (await next.dispatch(path, destination, { mode }))?.text(),
      ).toContain('new.js');
      expect(next.caches.open).not.toHaveBeenCalled();
      next.network.mockRejectedValueOnce(new Error('OFFLINE'));
      await expect(next.dispatch(path, destination, { mode })).rejects.toThrow(
        'OFFLINE',
      );
    },
  );
});
