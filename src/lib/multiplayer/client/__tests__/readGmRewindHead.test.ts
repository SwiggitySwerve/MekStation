import { readGmRewindHead } from '../readGmRewindHead';

const REQUEST = {
  matchId: 'match-1',
  wireToken: 'wire-token-abc',
} as const;

const HEAD = { branchId: 'main-after-rewind', revision: 17, generation: 4 };
const ORIGINAL_FETCH = global.fetch;

function mockJsonResponse(status: number, body: unknown): void {
  global.fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe('readGmRewindHead', () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
  });

  it('returns the three lineage head fields verbatim from a 200 body', async () => {
    mockJsonResponse(200, {
      timeline: [],
      timelineDigest: 'audit-only-digest',
      lineage: { effectiveHead: HEAD, transitions: [] },
    });

    const result = await readGmRewindHead(REQUEST);

    expect(result).toStrictEqual({ kind: 'head', head: HEAD });
    expect(result).not.toHaveProperty('digest');
    expect(result).not.toHaveProperty('head.digest');
  });

  it('returns no-head only for an explicitly null effective head', async () => {
    mockJsonResponse(200, { lineage: { effectiveHead: null } });

    await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
      kind: 'no-head',
    });
  });

  it.each([400, 401, 403, 404, 405, 500])(
    'maps a %i transport error to unavailable without error text',
    async (status) => {
      mockJsonResponse(status, { error: 'private transport error detail' });

      const result = await readGmRewindHead(REQUEST);

      expect(result).toStrictEqual({ kind: 'unavailable' });
      expect(result).not.toHaveProperty('digest');
      expect(JSON.stringify(result)).not.toContain('private transport error');
    },
  );

  it.each([201, 204, 401, 500])(
    'rejects status %i even when the body carries a valid head',
    async (status) => {
      mockJsonResponse(status, { lineage: { effectiveHead: HEAD } });

      await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
        kind: 'unavailable',
      });
    },
  );

  it('maps a thrown fetch to unavailable without error text', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('private network failure');
    }) as unknown as typeof fetch;

    const result = await readGmRewindHead(REQUEST);

    expect(result).toStrictEqual({ kind: 'unavailable' });
    expect(JSON.stringify(result)).not.toContain('private network failure');
  });

  it('maps a rejected JSON body to unavailable', async () => {
    global.fetch = jest.fn(async () => ({
      status: 200,
      json: async () => {
        throw new Error('private malformed JSON detail');
      },
    })) as unknown as typeof fetch;

    await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
      kind: 'unavailable',
    });
  });

  it.each([
    ['null body', null],
    ['primitive body', 'error'],
    ['missing lineage', {}],
    ['null lineage', { lineage: null }],
    ['primitive lineage', { lineage: 'error' }],
    ['missing effectiveHead', { lineage: {} }],
    ['primitive effectiveHead', { lineage: { effectiveHead: 'head' } }],
    ['empty effectiveHead', { lineage: { effectiveHead: {} } }],
    [
      'missing branchId',
      { lineage: { effectiveHead: { revision: 17, generation: 4 } } },
    ],
    [
      'missing revision',
      { lineage: { effectiveHead: { branchId: 'main', generation: 4 } } },
    ],
    [
      'missing generation',
      { lineage: { effectiveHead: { branchId: 'main', revision: 17 } } },
    ],
    [
      'invalid branchId',
      { lineage: { effectiveHead: { ...HEAD, branchId: 7 } } },
    ],
    [
      'invalid revision',
      { lineage: { effectiveHead: { ...HEAD, revision: '17' } } },
    ],
    [
      'invalid generation',
      { lineage: { effectiveHead: { ...HEAD, generation: '4' } } },
    ],
  ])('maps a 200 body with %s to unavailable', async (_name, body) => {
    mockJsonResponse(200, body);

    await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
      kind: 'unavailable',
    });
  });

  it.each([
    ['match-1', '/api/matches/match-1/timeline'],
    ['match /?#', '/api/matches/match%20%2F%3F%23/timeline'],
  ])(
    'GETs the timeline for %s with the bearer header',
    async (matchId, path) => {
      mockJsonResponse(200, { lineage: { effectiveHead: HEAD } });

      await readGmRewindHead({ ...REQUEST, matchId });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(path, {
        method: 'GET',
        headers: { Authorization: 'Bearer wire-token-abc' },
      });
    },
  );

  it('omits digest and error fields even if present in the response head', async () => {
    mockJsonResponse(200, {
      digest: 'private digest',
      error: 'private error',
      lineage: {
        effectiveHead: {
          ...HEAD,
          digest: 'private digest',
          error: 'private error',
        },
      },
    });

    const result = await readGmRewindHead(REQUEST);

    expect(result).toStrictEqual({ kind: 'head', head: HEAD });
    expect(result).not.toHaveProperty('digest');
    expect(result).not.toHaveProperty('head.digest');
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('reads a fresh head on every call', async () => {
    mockJsonResponse(200, { lineage: { effectiveHead: HEAD } });
    await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
      kind: 'head',
      head: HEAD,
    });
    const nextHead = { branchId: 'next-branch', revision: 0, generation: 5 };
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ lineage: { effectiveHead: nextHead } }),
    } as Response);

    await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
      kind: 'head',
      head: nextHead,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
