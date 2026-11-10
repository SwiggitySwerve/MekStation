/**
 * S1b matrix row E, unit half: the shipped worker's runtime cache must not hand
 * a campaign body fetched for a newer reader to a client that did not ask for
 * that reader level.
 *
 * The worker caches every ok same-origin GET (`networkFirst`) keyed by URL and
 * replays it when the network fails. Old and new bundles share that cache, so
 * the only thing that keeps them apart is the server's
 * `Vary: X-MekStation-Lifecycle-Rules` plus the worker never matching with
 * `ignoreVary`. This runs the REAL worker source against a Cache API fake that
 * honours Vary the way browsers do; the browser half is the Playwright spec
 * `e2e/campaign-lifecycle-sw-vary.spec.ts` (run by the coordinator).
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const HEADER = 'X-MekStation-Lifecycle-Rules';
const ORIGIN = 'http://127.0.0.1:3642';

interface FakeRequest {
  url: string;
  method: string;
  destination: string;
  mode: string;
  headers: { get: (name: string) => string | null };
}

interface FakeResponse {
  ok: boolean;
  status: number;
  body: string;
  headers: { get: (name: string) => string | null };
  clone: () => FakeResponse;
  text: () => Promise<string>;
}

function headersOf(values: Record<string, string>) {
  const lower = new Map(
    Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

function request(path: string, headers: Record<string, string> = {}) {
  return {
    url: `${ORIGIN}${path}`,
    method: 'GET',
    destination: '',
    mode: 'cors',
    headers: headersOf(headers),
  } as FakeRequest;
}

function response(
  body: string,
  headers: Record<string, string> = {},
  status = 200,
): FakeResponse {
  const self: FakeResponse = {
    ok: status >= 200 && status < 300,
    status,
    body,
    headers: headersOf(headers),
    clone: () => response(body, headers, status),
    text: async () => body,
  };
  return self;
}

/** A Cache API fake that applies the spec's Vary matching (and `ignoreVary`). */
function varyAwareCache() {
  const entries: { request: FakeRequest; response: FakeResponse }[] = [];
  const matchCalls: unknown[] = [];
  return {
    matchCalls,
    entries,
    put: async (req: FakeRequest, res: FakeResponse) => {
      entries.push({ request: req, response: res });
    },
    match: async (req: FakeRequest, options?: { ignoreVary?: boolean }) => {
      matchCalls.push(options ?? null);
      for (const entry of entries) {
        if (entry.request.url !== req.url) continue;
        const vary = entry.response.headers.get('Vary');
        const tokens = (vary ?? '')
          .split(',')
          .map((token) => token.trim())
          .filter(Boolean);
        const matches =
          options?.ignoreVary === true ||
          tokens.every((token) =>
            token === '*'
              ? false
              : entry.request.headers.get(token) === req.headers.get(token),
          );
        if (matches) return entry.response.clone();
      }
      return undefined;
    },
  };
}

function workerHarness() {
  let handleFetch:
    | ((event: {
        request: FakeRequest;
        respondWith: (p: Promise<FakeResponse>) => void;
      }) => void)
    | undefined;
  const cache = varyAwareCache();
  const network = jest.fn<Promise<FakeResponse>, [FakeRequest]>();
  runInNewContext(
    readFileSync(resolve(process.cwd(), 'public/service-worker.js'), 'utf8'),
    {
      URL,
      location: { origin: ORIGIN },
      self: {
        addEventListener: (name: string, handler: typeof handleFetch) => {
          if (name === 'fetch') handleFetch = handler;
        },
      },
      caches: {
        open: async () => cache,
        match: async () => response('OFFLINE'),
      },
      fetch: network,
    },
  );
  function dispatch(req: FakeRequest): Promise<FakeResponse> {
    let result: Promise<FakeResponse> | undefined;
    if (!handleFetch) throw new Error('no fetch handler');
    handleFetch({
      request: req,
      respondWith: (promise) => {
        result = promise;
      },
    });
    if (!result) throw new Error('worker did not respond');
    return result;
  }
  return { dispatch, network, cache };
}

describe('service worker and the campaign reader-level cache key', () => {
  const PATH = '/api/campaigns/c1';
  const V2_BODY = '{"body":{"missions":[["m",{"lifecycleRulesVersion":2}]]}}';

  it('does not replay a body cached for a level 2 reader to a header-less request offline', async () => {
    const worker = workerHarness();
    // A newer client fetches with header 2 and the server varies on it.
    worker.network.mockResolvedValueOnce(response(V2_BODY, { Vary: HEADER }));
    await worker.dispatch(request(PATH, { [HEADER]: '2' }));
    expect(worker.cache.entries).toHaveLength(1);

    // Offline: an older bundle (no header) must NOT get that body.
    worker.network.mockRejectedValueOnce(new Error('OFFLINE'));
    await expect(worker.dispatch(request(PATH))).rejects.toThrow('OFFLINE');
  });

  it('does not replay it to a client declaring a lower level either', async () => {
    const worker = workerHarness();
    worker.network.mockResolvedValueOnce(response(V2_BODY, { Vary: HEADER }));
    await worker.dispatch(request(PATH, { [HEADER]: '2' }));
    worker.network.mockRejectedValueOnce(new Error('OFFLINE'));
    await expect(
      worker.dispatch(request(PATH, { [HEADER]: '1' })),
    ).rejects.toThrow('OFFLINE');
  });

  it('still serves the same reader level its own cached copy offline', async () => {
    const worker = workerHarness();
    worker.network.mockResolvedValueOnce(response(V2_BODY, { Vary: HEADER }));
    await worker.dispatch(request(PATH, { [HEADER]: '2' }));
    worker.network.mockRejectedValueOnce(new Error('OFFLINE'));
    const replay = await worker.dispatch(request(PATH, { [HEADER]: '2' }));
    expect(await replay.text()).toBe(V2_BODY);
  });

  it('never caches a refusal (not ok), so a 426 is never replayed', async () => {
    const worker = workerHarness();
    worker.network.mockResolvedValueOnce(
      response('{"kind":"refused"}', { Vary: HEADER }, 426),
    );
    await worker.dispatch(request(PATH));
    expect(worker.cache.entries).toHaveLength(0);
  });

  it('never matches the runtime cache with ignoreVary', async () => {
    const worker = workerHarness();
    worker.network.mockRejectedValueOnce(new Error('OFFLINE'));
    await expect(worker.dispatch(request(PATH))).rejects.toThrow('OFFLINE');
    expect(worker.cache.matchCalls.length).toBeGreaterThan(0);
    expect(
      worker.cache.matchCalls.every(
        (options) =>
          options === null ||
          (options as { ignoreVary?: boolean }).ignoreVary !== true,
      ),
    ).toBe(true);
    expect(
      readFileSync(resolve(process.cwd(), 'public/service-worker.js'), 'utf8'),
    ).not.toMatch(/ignoreVary/);
  });

  it('control: without the Vary header the same replay would leak (the fake is not vacuous)', async () => {
    const worker = workerHarness();
    worker.network.mockResolvedValueOnce(response(V2_BODY, {}));
    await worker.dispatch(request(PATH, { [HEADER]: '2' }));
    worker.network.mockRejectedValueOnce(new Error('OFFLINE'));
    const leaked = await worker.dispatch(request(PATH));
    expect(await leaked.text()).toBe(V2_BODY);
  });
});
