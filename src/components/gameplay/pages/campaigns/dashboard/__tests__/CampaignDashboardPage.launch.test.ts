/**
 * The dashboard's launch decision, and what the user is told when it fails.
 *
 * HARNESS NOTE, stated plainly: these rows exercise the extracted launch
 * module, which is where every line of the dashboard's 10.3 behaviour
 * lives - resolving the authority and classifying the failure. What they
 * do NOT cover is the component's own plumbing (the mount effect that
 * reads the head, the `useState` that holds it, the store call that
 * reports the conflict). That plumbing is three lines of wiring around
 * these functions; a full React render of `CampaignDashboardPage` would
 * need the campaign store, the roster store, the route loader and the
 * catalog fetch all stood up, and would still be asserting on these same
 * two functions through several layers of indirection.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import type { CampaignLaunchHeadRead } from '@/lib/campaign/encounter/readCampaignLaunchHead';

import {
  classifyLaunchFailure,
  resolveDashboardLaunchForces,
} from '@/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.launch';
import { CampaignOwnedForceStaleError } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import { CampaignLaunchAuthorityUnavailableError } from '@/lib/campaign/encounter/requestLaunchAuthority';

const HEAD: CampaignLaunchHeadRead = {
  kind: 'head',
  branchId: 'root',
  revision: 3,
  effectiveGeneration: 1,
};

const ACTIVE = { branchId: 'root', revision: 9, effectiveGeneration: 1 };

function fetchAnswering(status: number, body: unknown) {
  return jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe('resolveDashboardLaunchForces', () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
  });

  it('launches ungated when no head has been read yet', async () => {
    globalThis.fetch = fetchAnswering(200, { kind: 'current', head: ACTIVE });

    const result = await resolveDashboardLaunchForces({
      campaignId: 'campaign-1',
      missionId: 'mission-1',
      launchHead: null,
    });

    // Nothing to compare against yet, so nothing to gate on - and the
    // authority is not even consulted.
    expect(result).toBeUndefined();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('launches ungated when the campaign has no authoritative stream', async () => {
    globalThis.fetch = fetchAnswering(200, { kind: 'current', head: ACTIVE });

    const result = await resolveDashboardLaunchForces({
      campaignId: 'campaign-1',
      missionId: 'mission-1',
      launchHead: { kind: 'no-authoritative-stream' },
    });

    expect(result).toBeUndefined();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('sends the head it holds and relays a refusal to the materializer', async () => {
    const refusal = {
      kind: 'refused',
      code: 'STALE_REVISION',
      reason: 'launch head is stale (STALE_REVISION)',
      activeHead: ACTIVE,
      resyncAction: 'resync-to-active-head',
    };
    globalThis.fetch = fetchAnswering(409, refusal);

    const result = await resolveDashboardLaunchForces({
      campaignId: 'campaign-1',
      missionId: 'mission-1',
      launchHead: HEAD,
    });

    const body = JSON.parse(
      String((globalThis.fetch as jest.Mock).mock.calls[0][1].body),
    ) as { expectedHead: unknown };
    // The head it was GIVEN, revision 3 - not the current 9 it just saw.
    expect(body.expectedHead).toEqual({
      branchId: 'root',
      revision: 3,
      effectiveGeneration: 1,
    });
    expect(result).toEqual(refusal);
  });

  it('passes the co-op session through and omits it otherwise', async () => {
    globalThis.fetch = fetchAnswering(200, {
      kind: 'materialized',
      head: ACTIVE,
      slots: [],
    });

    await resolveDashboardLaunchForces({
      campaignId: 'campaign-1',
      missionId: 'mission-1',
      launchHead: HEAD,
      sessionId: 'match-1',
    });
    const withSession = JSON.parse(
      String((globalThis.fetch as jest.Mock).mock.calls[0][1].body),
    ) as Record<string, unknown>;

    await resolveDashboardLaunchForces({
      campaignId: 'campaign-1',
      missionId: 'mission-1',
      launchHead: HEAD,
    });
    const withoutSession = JSON.parse(
      String((globalThis.fetch as jest.Mock).mock.calls[1][1].body),
    ) as Record<string, unknown>;

    expect(withSession.sessionId).toBe('match-1');
    // A single-player campaign has no claims; sending a session it does
    // not have would be refused UNOWNED_SLOT on every launch.
    expect(withoutSession).not.toHaveProperty('sessionId');
  });

  it('throws rather than launching ungated when the authority is unreachable', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;

    await expect(
      resolveDashboardLaunchForces({
        campaignId: 'campaign-1',
        missionId: 'mission-1',
        launchHead: HEAD,
      }),
    ).rejects.toBeInstanceOf(CampaignLaunchAuthorityUnavailableError);
  });
});

describe('classifyLaunchFailure', () => {
  it('turns a stale head into a conflict carrying the current head', () => {
    const failure = classifyLaunchFailure(
      new CampaignOwnedForceStaleError(
        'STALE_REVISION',
        'launch head is stale',
        ACTIVE,
      ),
    );

    expect(failure.kind).toBe('conflict');
    if (failure.kind !== 'conflict') return;
    expect(failure.conflict.code).toBe('STALE_REVISION');
    expect(failure.conflict.activeHead).toEqual(ACTIVE);
    expect(failure.conflict.resyncAction).toBe('resync-to-active-head');
  });

  it('keeps an unavailable authority retryable and NOT a conflict', () => {
    const failure = classifyLaunchFailure(
      new CampaignLaunchAuthorityUnavailableError('offline'),
    );

    // Nobody answered, so there is no head to resync to - rendering this
    // as a stale-head conflict would offer a recovery that does nothing.
    expect(failure.kind).toBe('message');
    if (failure.kind !== 'message') return;
    expect(failure.message).toContain('Retry');
    expect(failure.message).toContain('offline');
  });

  it('keeps the generic message for an ordinary failure', () => {
    const failure = classifyLaunchFailure(new Error('force API exploded'));

    expect(failure).toEqual({
      kind: 'message',
      message: 'Mission could not be launched: force API exploded',
    });
  });
});
