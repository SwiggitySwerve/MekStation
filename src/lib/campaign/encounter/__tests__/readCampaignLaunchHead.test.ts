/**
 * The client may report a head it was given, and never one it invented.
 *
 * A browser that fabricates `{branchId: 'root', revision: 0}` when the
 * lookup fails would be admitted by the very comparison meant to catch
 * a stale client - the guess is plausible today precisely because
 * production is genesis-only. Every failure path here therefore lands on
 * `unavailable` rather than on a default head.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import { readCampaignLaunchHead } from '@/lib/campaign/encounter/readCampaignLaunchHead';

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

describe('readCampaignLaunchHead', () => {
  it('returns the head the authority reported', async () => {
    const fetchImpl = fetchReturning(
      jsonResponse({
        kind: 'head',
        branchId: 'candidate-7',
        revision: 42,
        effectiveGeneration: 3,
      }),
    );

    const result = await readCampaignLaunchHead('campaign-1', fetchImpl);

    // Reported verbatim - a reader that normalised 'candidate-7' to
    // 'root' would be the bug this whole endpoint exists to prevent.
    expect(result).toEqual({
      kind: 'head',
      branchId: 'candidate-7',
      revision: 42,
      effectiveGeneration: 3,
    });
  });

  it('asks the campaign-scoped head route', async () => {
    const fetchImpl = fetchReturning(
      jsonResponse({ kind: 'no-authoritative-stream' }),
    );

    await readCampaignLaunchHead('camp/1 &2', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/campaigns/camp%2F1%20%262/head',
      { method: 'GET' },
    );
  });

  it('passes through no-authoritative-stream unchanged', async () => {
    const fetchImpl = fetchReturning(
      jsonResponse({ kind: 'no-authoritative-stream' }),
    );

    const result = await readCampaignLaunchHead('campaign-1', fetchImpl);

    expect(result).toEqual({ kind: 'no-authoritative-stream' });
  });

  it('is unavailable - never a default head - on a non-OK status', async () => {
    const fetchImpl = fetchReturning(jsonResponse({ error: 'not found' }, 404));

    const result = await readCampaignLaunchHead('campaign-1', fetchImpl);

    expect(result).toMatchObject({ kind: 'unavailable' });
    expect(result).not.toHaveProperty('branchId');
  });

  it('is unavailable when the transport throws', async () => {
    const fetchImpl = fetchReturning(() =>
      Promise.reject(new Error('offline')),
    );

    const result = await readCampaignLaunchHead('campaign-1', fetchImpl);

    expect(result).toEqual({ kind: 'unavailable', reason: 'offline' });
  });

  it.each([
    ['a missing generation', { kind: 'head', branchId: 'root', revision: 1 }],
    [
      'a stringly revision',
      { kind: 'head', branchId: 'root', revision: '1', effectiveGeneration: 1 },
    ],
    [
      'an empty branch id',
      { kind: 'head', branchId: '', revision: 1, effectiveGeneration: 1 },
    ],
    ['an unknown kind', { kind: 'something-else' }],
    ['a non-object body', 'root'],
  ])('is unavailable on a malformed payload: %s', async (_label, payload) => {
    const fetchImpl = fetchReturning(jsonResponse(payload));

    const result = await readCampaignLaunchHead('campaign-1', fetchImpl);

    expect(result).toMatchObject({ kind: 'unavailable' });
    expect(result).not.toHaveProperty('branchId');
  });
});
