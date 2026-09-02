/**
 * Client adapter for the rewind-commit route.
 *
 * The body must be the preview's body verbatim. Re-deriving
 * expectedRevision (for example from 0) confirms a different head
 * than the blast radius the GM approved.
 */

import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';

import {
  commitGmCombatRewind,
  GmCombatRewindTransportError,
} from '../commitGmCombatRewind';

const REQUEST = {
  matchId: 'match-1',
  wireToken: 'wire-token-abc',
  targetRevision: 3,
  expectedBranchId: 'root',
  expectedRevision: 4,
  expectedDigest: 'aa'.repeat(32),
  expectedGeneration: 1,
} as const;

function mockJsonResponse(status: number, body: unknown): void {
  global.fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe('commitGmCombatRewind', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("POSTs the preview's body verbatim to the commit route with the bearer", async () => {
    const committedBody: GmCombatRewindCommitResult = {
      kind: 'committed',
      matchId: 'match-1',
      activatedBranchId: 'candidate-1',
      priorBranchId: 'root',
      effectiveGeneration: 2,
      invalidations: [],
    };
    mockJsonResponse(200, committedBody);

    await expect(commitGmCombatRewind(REQUEST)).resolves.toBe(committedBody);

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/matches/match-1/rewind-commit');
    expect(init.method).toBe('POST');
    expect(init.headers).toStrictEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer wire-token-abc',
    });
    expect(JSON.parse(String(init.body))).toStrictEqual({
      targetRevision: 3,
      expectedBranchId: 'root',
      expectedRevision: 4,
      expectedDigest: 'aa'.repeat(32),
      expectedGeneration: 1,
    });
  });

  it('narrows a 409 refusal body to the union', async () => {
    const refusedBody = {
      kind: 'refused',
      reason: 'campaign-receipt-delivered',
      detail: 'operator-only outcome id',
    };
    mockJsonResponse(409, refusedBody);

    await expect(commitGmCombatRewind(REQUEST)).resolves.toBe(refusedBody);
  });

  it('throws the typed transport failure on a non-JSON 500', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    })) as unknown as typeof fetch;

    await expect(commitGmCombatRewind(REQUEST)).rejects.toBeInstanceOf(
      GmCombatRewindTransportError,
    );
  });
});
