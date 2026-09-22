import { readGmRewindHead } from '../readGmRewindHead';

const REQUEST = {
  matchId: 'match-1',
  wireToken: 'wire-token-abc',
} as const;

const DIGEST = '0123456789abcdef'.repeat(4);
const HEAD = {
  branchId: 'main-after-rewind',
  revision: 17,
  generation: 4,
  digest: DIGEST,
};
const BODY = {
  branchId: 'main-after-rewind',
  revision: 17,
  effectiveGeneration: 4,
  digest: DIGEST,
};
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

  it('returns the four head fields verbatim from a 200 head-route body', async () => {
    mockJsonResponse(200, BODY);

    const result = await readGmRewindHead(REQUEST);

    expect(result).toStrictEqual({ kind: 'head', head: HEAD });
  });

  it('returns no-head for a 404 no-head body', async () => {
    mockJsonResponse(404, { error: 'no head' });

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

  it.each([201, 204, 401, 403, 404, 500])(
    'rejects status %i even when the body carries a valid head',
    async (status) => {
      mockJsonResponse(status, BODY);

      await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
        kind: 'unavailable',
      });
    },
  );

  it.each([200, 401, 403, 500])(
    'rejects a no-head body with status %i',
    async (status) => {
      mockJsonResponse(status, { error: 'no head' });

      await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
        kind: 'unavailable',
      });
    },
  );

  it.each([null, {}, { error: 'unknown match' }, { error: 404 }])(
    'maps a 404 with another body (%j) to unavailable',
    async (body) => {
      mockJsonResponse(404, body);

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
    ['empty body', {}],
    ['timeline lineage', { lineage: { effectiveHead: HEAD } }],
    ['null lineage head', { lineage: { effectiveHead: null } }],
    [
      'missing branchId',
      { revision: 17, effectiveGeneration: 4, digest: DIGEST },
    ],
    [
      'missing revision',
      { branchId: 'main', effectiveGeneration: 4, digest: DIGEST },
    ],
    [
      'missing effectiveGeneration',
      { branchId: 'main', revision: 17, digest: DIGEST },
    ],
    [
      'missing digest',
      { branchId: 'main', revision: 17, effectiveGeneration: 4 },
    ],
    ['invalid effectiveGeneration', { ...BODY, effectiveGeneration: '4' }],
    ['generation instead of effectiveGeneration', HEAD],
    ['invalid branchId', { ...BODY, branchId: 7 }],
    ['invalid revision', { ...BODY, revision: '17' }],
    ['invalid digest type', { ...BODY, digest: 7 }],
    ['null digest', { ...BODY, digest: null }],
    ['63-character digest', { ...BODY, digest: 'a'.repeat(63) }],
    ['65-character digest', { ...BODY, digest: 'a'.repeat(65) }],
    ['uppercase digest', { ...BODY, digest: DIGEST.toUpperCase() }],
    ['non-hex digest', { ...BODY, digest: 'g'.repeat(64) }],
    ['digest with trailing newline', { ...BODY, digest: `${DIGEST}\n` }],
  ])('maps a 200 body with %s to unavailable', async (_name, body) => {
    mockJsonResponse(200, body);

    await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
      kind: 'unavailable',
    });
  });

  it.each([
    ['match-1', '/api/matches/match-1/head'],
    ['match /?#', '/api/matches/match%20%2F%3F%23/head'],
  ])('GETs the head for %s with the bearer header', async (matchId, path) => {
    mockJsonResponse(200, BODY);

    await readGmRewindHead({ ...REQUEST, matchId });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(path, {
      method: 'GET',
      headers: { Authorization: 'Bearer wire-token-abc' },
    });
  });

  it('omits error text and unrelated fields from the head outcome', async () => {
    mockJsonResponse(200, {
      ...BODY,
      error: 'private error',
      timelineDigest: 'private audit digest',
    });

    const result = await readGmRewindHead(REQUEST);

    expect(result).toStrictEqual({ kind: 'head', head: HEAD });
    expect(result).not.toHaveProperty('digest');
    expect(result).not.toHaveProperty('error');
    expect(result).not.toHaveProperty('head.error');
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('reads a fresh head on every call', async () => {
    mockJsonResponse(200, BODY);
    await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
      kind: 'head',
      head: HEAD,
    });
    const nextHead = {
      branchId: 'next-branch',
      revision: 0,
      generation: 5,
      digest: 'b'.repeat(64),
    };
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        branchId: 'next-branch',
        revision: 0,
        effectiveGeneration: 5,
        digest: 'b'.repeat(64),
      }),
    } as Response);

    await expect(readGmRewindHead(REQUEST)).resolves.toStrictEqual({
      kind: 'head',
      head: nextHead,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
