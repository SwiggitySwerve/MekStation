/**
 * Client adapter for the rewind-commit route.
 *
 * The five preview fields must be forwarded verbatim. Re-deriving
 * expectedRevision (for example from 0) confirms a different head
 * than the blast radius the GM approved.
 */

import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';

import {
  commitGmCombatRewind,
  GmCombatRewindTransportError,
  type ICommitGmCombatRewindInput,
} from '../commitGmCombatRewind';
import { previewGmCombatRewind } from '../previewGmCombatRewind';

const REQUEST = {
  matchId: 'match-1',
  wireToken: 'wire-token-abc',
  targetRevision: 3,
  expectedBranchId: 'root',
  expectedRevision: 4,
  expectedDigest: 'aa'.repeat(32),
  expectedGeneration: 1,
} as const;

const FIVE_FIELD_BODY = JSON.stringify({
  targetRevision: 3,
  expectedBranchId: 'root',
  expectedRevision: 4,
  expectedDigest: 'aa'.repeat(32),
  expectedGeneration: 1,
});

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
    expect(init.body).toBe(FIVE_FIELD_BODY);
  });

  it.each([
    ['plain', 'private correction detail', 'private correction detail'],
    ['padded', ' \tprivate correction detail\n ', 'private correction detail'],
    ['2000 characters', ` ${'r'.repeat(2000)} `, 'r'.repeat(2000)],
  ])('POSTs the trimmed private reason (%s)', async (_, reason, expected) => {
    mockJsonResponse(200, { kind: 'committed' });
    const input: ICommitGmCombatRewindInput = { ...REQUEST, reason };

    await commitGmCombatRewind(input);

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/matches/match-1/rewind-commit');
    expect(init.body).toBe(
      JSON.stringify({ ...JSON.parse(FIVE_FIELD_BODY), reason: expected }),
    );
  });

  it.each(['', ' \t\r\n '])(
    'keeps the five-field body byte-identical for an empty reason (%j)',
    async (reason) => {
      mockJsonResponse(200, { kind: 'committed' });
      const input: ICommitGmCombatRewindInput = { ...REQUEST, reason };

      await commitGmCombatRewind(input);

      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.body).toBe(FIVE_FIELD_BODY);
    },
  );

  it('does not echo the private reason into the committed outcome', async () => {
    const committedBody: GmCombatRewindCommitResult = {
      kind: 'committed',
      matchId: 'match-1',
      activatedBranchId: 'candidate-1',
      priorBranchId: 'root',
      effectiveGeneration: 2,
      invalidations: [],
    };
    mockJsonResponse(200, committedBody);
    const input: ICommitGmCombatRewindInput = {
      ...REQUEST,
      reason: 'private correction detail',
    };

    const outcome = await commitGmCombatRewind(input);

    expect(outcome).not.toHaveProperty('reason');
    expect(outcome).toBe(committedBody);
  });

  it('keeps the private reason out of a preview of the same input', async () => {
    mockJsonResponse(200, { kind: 'preview' });
    const input: ICommitGmCombatRewindInput = {
      ...REQUEST,
      reason: 'private correction detail',
    };

    await previewGmCombatRewind(input);

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/matches/match-1/rewind-preview');
    expect(init.body).toBe(FIVE_FIELD_BODY);
  });

  it('narrows a 409 refusal body to the union', async () => {
    const refusedBody = {
      kind: 'refused',
      reason: 'campaign-receipt-delivered',
      detail: 'operator-only outcome id',
    };
    mockJsonResponse(409, refusedBody);
    const input: ICommitGmCombatRewindInput = {
      ...REQUEST,
      reason: 'private correction detail',
    };

    const outcome = await commitGmCombatRewind(input);

    expect(outcome).toStrictEqual({
      kind: 'refused',
      reason: 'campaign-receipt-delivered',
      detail: 'operator-only outcome id',
    });
    expect(outcome).toBe(refusedBody);
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
