/**
 * A launch that cannot get a decision does not get to proceed.
 *
 * The dangerous failure is not a refusal - it is an outage quietly
 * becoming an ungated launch. Every non-answer here lands on
 * `unavailable`, which the caller treats as a retryable refusal.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import { requestLaunchAuthority } from '@/lib/campaign/encounter/requestLaunchAuthority';

const HEAD = { branchId: 'root', revision: 4, effectiveGeneration: 1 } as const;

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

function fetchReturning(response: Response | (() => Promise<never>)) {
  return jest.fn(async () =>
    typeof response === 'function' ? response() : response,
  ) as unknown as typeof fetch;
}

function request(fetchImpl: typeof fetch, sessionId?: string) {
  return requestLaunchAuthority({
    campaignId: 'campaign-1',
    missionId: 'mission-1',
    expectedHead: HEAD,
    ...(sessionId === undefined ? {} : { sessionId }),
    fetchImpl,
  });
}

describe('requestLaunchAuthority', () => {
  it('sends the head it was given, not one it invented', async () => {
    const fetchImpl = fetchReturning(
      jsonResponse({ kind: 'current', head: HEAD }),
    );

    await request(fetchImpl);

    const call = (fetchImpl as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('/api/campaigns/campaign-1/launch-authority');
    expect(JSON.parse(String(call[1].body))).toEqual({
      expectedHead: HEAD,
      missionId: 'mission-1',
    });
  });

  it('omits the session for a campaign that has none', async () => {
    const fetchImpl = fetchReturning(
      jsonResponse({ kind: 'current', head: HEAD }),
    );

    await request(fetchImpl);

    const body = JSON.parse(
      String((fetchImpl as jest.Mock).mock.calls[0][1].body),
    ) as Record<string, unknown>;
    // A single-player campaign has no claims; sending a session id it
    // does not have would put it through owned-force resolution and be
    // refused UNOWNED_SLOT on every launch.
    expect(body).not.toHaveProperty('sessionId');
  });

  it('sends the session for a co-op campaign', async () => {
    const fetchImpl = fetchReturning(
      jsonResponse({ kind: 'materialized', head: HEAD, slots: [] }),
    );

    await request(fetchImpl, 'match-1');

    const body = JSON.parse(
      String((fetchImpl as jest.Mock).mock.calls[0][1].body),
    ) as Record<string, unknown>;
    expect(body.sessionId).toBe('match-1');
  });

  it('relays a refusal with its head and recovery action', async () => {
    const refusal = {
      kind: 'refused',
      code: 'STALE_REVISION',
      reason: 'launch head is stale (STALE_REVISION)',
      activeHead: { branchId: 'root', revision: 9, effectiveGeneration: 1 },
      resyncAction: 'resync-to-active-head',
    };
    const fetchImpl = fetchReturning(jsonResponse(refusal, 409));

    const result = await request(fetchImpl);

    expect(result).toEqual(refusal);
  });

  it('relays materialized slots and no-authoritative-stream', async () => {
    const materialized = await request(
      fetchReturning(
        jsonResponse({
          kind: 'materialized',
          head: HEAD,
          slots: [{ slot: 1, forceId: 'force-a' }],
        }),
      ),
      'match-1',
    );
    const ungated = await request(
      fetchReturning(jsonResponse({ kind: 'no-authoritative-stream' })),
    );

    expect(materialized).toMatchObject({ kind: 'materialized' });
    expect(ungated).toEqual({ kind: 'no-authoritative-stream' });
  });

  it.each([
    ['a transport failure', 'throw' as const],
    ['a non-JSON body', 'nonjson' as const],
    ['an unrecognised payload', 'unknown' as const],
    ['a 500 with no typed body', 'server-error' as const],
  ])('is unavailable, never permission, on %s', async (_label, mode) => {
    const fetchImpl =
      mode === 'throw'
        ? fetchReturning(() => Promise.reject(new Error('offline')))
        : mode === 'nonjson'
          ? (jest.fn(async () => ({
              ok: true,
              status: 200,
              json: async () => {
                throw new Error('not json');
              },
            })) as unknown as typeof fetch)
          : mode === 'unknown'
            ? fetchReturning(jsonResponse({ kind: 'something-else' }))
            : fetchReturning(jsonResponse({ error: 'boom' }, 500));

    const result = await request(fetchImpl);

    expect(result.kind).toBe('unavailable');
    // Never mistaken for the ungated answer, which WOULD let it launch.
    expect(result.kind).not.toBe('no-authoritative-stream');
  });
});
