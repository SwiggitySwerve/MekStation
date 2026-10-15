import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

interface WorkerRequest {
  url: string;
  method: string;
  destination: string;
  mode: string;
}

interface WorkerFetchEvent {
  request: WorkerRequest;
  respondWith: (response: Promise<AssetResponse>) => void;
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

function workerHarness(cachedBody: string | null = 'OLD_BUILD') {
  let handleFetch: ((event: WorkerFetchEvent) => void) | undefined;
  const entries = new Map<string, AssetResponse>();
  const network = jest.fn(async () => assetResponse('CURRENT_BUILD'));
  const cache = {
    match: jest.fn(async (request: WorkerRequest) => {
      return entries.get(request.url)?.clone();
    }),
    put: jest.fn(async (request: WorkerRequest, response: AssetResponse) => {
      entries.set(request.url, response);
    }),
  };
  const caches = {
    open: jest.fn(async () => cache),
    match: jest.fn(async () => assetResponse('OFFLINE_DOCUMENT')),
  };

  runInNewContext(
    readFileSync(resolve(process.cwd(), 'public/service-worker.js'), 'utf8'),
    {
      URL,
      location: { origin: 'http://127.0.0.1:3642' },
      self: {
        addEventListener: (
          name: string,
          handler: (event: WorkerFetchEvent) => void,
        ) => {
          if (name === 'fetch') handleFetch = handler;
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
  ) {
    const request: WorkerRequest = {
      url: `http://127.0.0.1:3642${path}`,
      method: 'GET',
      destination,
      mode: 'cors',
      ...options,
    };
    if (cachedBody !== null)
      entries.set(request.url, assetResponse(cachedBody));
    let response: Promise<AssetResponse> | undefined;
    if (!handleFetch)
      throw new Error('Worker did not register a fetch handler');
    handleFetch({
      request,
      respondWith: (promise) => {
        response = promise;
      },
    });
    return response;
  }

  return { dispatch, network, cache, caches };
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
      const worker = workerHarness();
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
    const worker = workerHarness();
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

  it('preserves an offline cached document', async () => {
    const worker = workerHarness('CACHED_DOCUMENT');
    worker.network.mockRejectedValueOnce(new Error('NETWORK_OFFLINE'));
    expect(
      await (await worker.dispatch('/customizer', 'document'))?.text(),
    ).toBe('CACHED_DOCUMENT');
  });

  it('preserves the offline document fallback when there is no cached page', async () => {
    const worker = workerHarness(null);
    worker.network.mockRejectedValueOnce(new Error('NETWORK_OFFLINE'));
    expect(
      await (await worker.dispatch('/customizer', 'document'))?.text(),
    ).toBe('OFFLINE_DOCUMENT');
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
