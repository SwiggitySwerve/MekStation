/**
 * Client adapter for the rewind-preview route.
 *
 * Status is unused. A body with `kind` 'preview' or 'refused' is the
 * domain answer; a transport body or a thrown fetch is unavailable,
 * with no error text copied onto that arm.
 */

import { previewGmCombatRewind } from '../previewGmCombatRewind';

const REQUEST = {
  matchId: 'match-1',
  wireToken: 'wire-token-abc',
  targetRevision: 3,
  expectedBranchId: 'root',
  expectedRevision: 4,
  expectedDigest: '',
  expectedGeneration: 1,
} as const;

function mockJsonResponse(status: number, body: unknown): void {
  global.fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe('previewGmCombatRewind', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes a 200 preview body through verbatim', async () => {
    const previewBody = {
      kind: 'preview',
      matchId: 'match-1',
      targetRevision: 3,
      priorHead: { branchId: 'root', revision: 4, effectiveGeneration: 1 },
      changedViewerIds: ['pid_host'],
      entries: [],
    };
    mockJsonResponse(200, previewBody);

    await expect(previewGmCombatRewind(REQUEST)).resolves.toBe(previewBody);
  });

  it('passes a 409 refused body through verbatim', async () => {
    const refusedBody = {
      kind: 'refused',
      reason: 'STALE_BRANCH',
      detail: 'operator-only branch id',
    };
    mockJsonResponse(409, refusedBody);

    await expect(previewGmCombatRewind(REQUEST)).resolves.toBe(refusedBody);
  });

  it('maps a 401 error body with no kind to unavailable', async () => {
    mockJsonResponse(401, { error: 'Unauthorized: expired token' });

    const result = await previewGmCombatRewind(REQUEST);
    expect(result).toStrictEqual({ kind: 'unavailable' });
    expect(result).not.toHaveProperty('error');
  });

  it('maps a thrown fetch to unavailable', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('socket hang up at 127.0.0.1');
    }) as unknown as typeof fetch;

    const result = await previewGmCombatRewind(REQUEST);
    expect(result).toStrictEqual({ kind: 'unavailable' });
    expect(result).not.toHaveProperty('error');
  });

  it('POSTs all five expected-head fields with the bearer header', async () => {
    mockJsonResponse(200, {
      kind: 'preview',
      matchId: 'match-1',
      targetRevision: 3,
      priorHead: { branchId: 'root', revision: 4, effectiveGeneration: 1 },
      changedViewerIds: [],
      entries: [],
    });

    await previewGmCombatRewind(REQUEST);

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/matches/match-1/rewind-preview');
    expect(init.method).toBe('POST');
    expect(init.headers).toStrictEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer wire-token-abc',
    });
    expect(JSON.parse(String(init.body))).toStrictEqual({
      targetRevision: 3,
      expectedBranchId: 'root',
      expectedRevision: 4,
      expectedDigest: '',
      expectedGeneration: 1,
    });
  });
});
