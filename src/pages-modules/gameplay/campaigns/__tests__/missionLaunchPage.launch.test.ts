/**
 * Mission-launch page 10.3 gate: server head, not the in-memory sequence.
 *
 * The dashboard launcher suite is the shape: stub fetch, send the head
 * the authority reported, and classify a refusal as a typed conflict.
 * These rows pin the same contract on `launchMissionFromPage`.
 *
 * Predicted red before the product edit:
 * - co-op sends the server head (RED: page sent nextSequence-1)
 * - stale refusal becomes the dashboard conflict (RED: swallowed)
 * - single-player with no effective branch still launches (GREEN control)
 */

import type { ICoopParticipationRecord } from '@/lib/campaign/coop/coopRuntimeSession';
import type { LaunchCoopMissionResult } from '@/lib/campaign/coop/launchCoopMission';
import type { IMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import type { IForce } from '@/types/campaign/Force';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IEncounter } from '@/types/encounter';

import { getCoopRuntimeSessionByMatch } from '@/lib/campaign/coop/coopRuntimeSession';
import { launchCoopMission } from '@/lib/campaign/coop/launchCoopMission';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import {
  type CampaignPageStore,
  launchMissionFromPage,
} from '@/pages-modules/gameplay/campaigns/missionLaunchPage.launch';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';

jest.mock('@/lib/campaign/coop/launchCoopMission', () => ({
  launchCoopMission: jest.fn(),
}));

jest.mock('@/lib/campaign/coop/coopRuntimeSession', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/campaign/coop/coopRuntimeSession')
  >('@/lib/campaign/coop/coopRuntimeSession');
  return {
    ...actual,
    getCoopRuntimeSessionByMatch: jest.fn(),
  };
});

jest.mock(
  '@/lib/campaign/encounter/materializeCampaignMissionEncounter',
  () => {
    const actual = jest.requireActual<
      typeof import('@/lib/campaign/encounter/materializeCampaignMissionEncounter')
    >('@/lib/campaign/encounter/materializeCampaignMissionEncounter');
    return {
      ...actual,
      materializeCampaignMissionEncounter: jest.fn(),
    };
  },
);

jest.mock('@/lib/campaign/readiness/canonicalCatalogAdmission', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/campaign/readiness/canonicalCatalogAdmission')
  >('@/lib/campaign/readiness/canonicalCatalogAdmission');
  return {
    ...actual,
    fetchCanonicalCatalogSnapshot: jest.fn(async () =>
      actual.readyCanonicalCatalog(['locust-lct-1v']),
    ),
  };
});

const SEQUENCE_NEXT = 3;
const SEQUENCE_DERIVED_REVISION = SEQUENCE_NEXT - 1;
const SERVER_HEAD = {
  kind: 'head' as const,
  branchId: 'root',
  revision: SEQUENCE_NEXT,
  effectiveGeneration: 1,
};
const ACTIVE = { branchId: 'root', revision: 9, effectiveGeneration: 1 };

const launchCoopMissionMock = launchCoopMission as jest.MockedFunction<
  typeof launchCoopMission
>;
const getRuntimeMock = getCoopRuntimeSessionByMatch as jest.MockedFunction<
  typeof getCoopRuntimeSessionByMatch
>;
const materializeMock =
  materializeCampaignMissionEncounter as jest.MockedFunction<
    typeof materializeCampaignMissionEncounter
  >;

/**
 * Route fetch by URL so the test can answer GET /head and POST authority.
 *
 * Why: the page now talks to both shipped routes, and a single stub
 * that always returns one body would hide a wrong call.
 */
function fetchAnswering(
  handler: (
    url: string,
    init?: RequestInit,
  ) => { readonly status: number; readonly body: unknown },
): typeof fetch {
  const impl = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : String(input);
      const { status, body } = handler(url, init);
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      } as Response;
    },
  );
  return impl as typeof fetch;
}

/**
 * Build a force fixture the launch input requires.
 *
 * Why: the page returns early without a local force, so the fixture
 * has to be a real IForce, not an empty stub.
 */
function makeForce(id: string): IForce {
  return {
    id,
    name: 'Command',
    subForceIds: [],
    unitIds: ['u-1'],
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };
}

/**
 * Build a mission the persist path can attach an encounter to.
 *
 * Why: `syncLaunchedMission` no-ops when the mission is missing, which
 * would hide a failed single-player persist.
 */
function makeMission() {
  return createContract({
    id: 'mission-1',
    name: 'Border Raid',
    employerId: 'davion',
    targetId: 'liao',
    status: MissionStatus.ACTIVE,
  });
}

/**
 * A projection that already clears the single-player readiness gate.
 *
 * Why: this suite is about the head, not roster blockers.
 */
function readyProjection(): IMissionReadinessProjection {
  return {
    campaignId: 'campaign-1',
    missionId: 'mission-1',
    missionName: 'Border Raid',
    selectedRosterUnitIds: [],
    eligibleUnitIds: [],
    riskyUnitIds: [],
    blockedUnitIds: [],
    units: [],
    selectedUnits: [],
    unresolvedBlockers: [],
    warnings: [],
    canLaunch: true,
    launchConsequences: [],
  };
}

/**
 * A store stub that records persist calls without a live campaign store.
 *
 * Why: the single-player arm checkpoints after materialize; a missing
 * `saveCampaign` would fail the control for the wrong reason.
 */
function fakeStore(): CampaignPageStore {
  return {
    getState: () => ({
      updateCampaign: jest.fn(),
      getMissionsStore: () => ({
        getState: () => ({ addMission: jest.fn() }),
      }),
      saveCampaign: jest.fn(async () => ({ committed: true })),
    }),
  } as unknown as CampaignPageStore;
}

/**
 * A successful co-op launch so the page can navigate.
 *
 * Why: these rows assert the head that was sent, not combat composition.
 */
function okCoopLaunch(): LaunchCoopMissionResult {
  return {
    ok: true,
    encounterId: 'enc-coop-1',
    gameSessionId: 'gs-1',
    composition: {
      encounter: { id: 'enc-coop-1' } as IEncounter,
      coopSeats: [],
      deployingPlayerIds: ['host'],
      commandHqPlayerIds: [],
    },
  };
}

/**
 * Seed the in-memory runtime so nextSequence-1 is one below the server.
 *
 * Why: that off-by-one is the defect. If the page still sent the
 * sequence-derived revision, these rows would accept it.
 */
function seedRuntimeSequence(): void {
  getRuntimeMock.mockReturnValue({
    campaignId: 'campaign-1',
    matchId: 'match-1',
    host: {
      getEventLog: () => ({
        nextSequence: async () => SEQUENCE_NEXT,
      }),
      getState: () => ({ rosterUnits: {} }),
    },
  } as ReturnType<typeof getCoopRuntimeSessionByMatch>);
}

describe('launchMissionFromPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    useCampaignPersistenceStore.getState().reset();
    launchCoopMissionMock.mockReset();
    launchCoopMissionMock.mockResolvedValue(okCoopLaunch());
    materializeMock.mockReset();
    materializeMock.mockResolvedValue({
      encounterId: 'enc-sp-1',
      reused: false,
      missionScenarioIds: [],
    });
    getRuntimeMock.mockReset();
    seedRuntimeSequence();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('requests the server head and sends its branch and revision, not the in-memory sequence', async () => {
    globalThis.fetch = fetchAnswering((url) => {
      if (url.endsWith('/head')) {
        return { status: 200, body: SERVER_HEAD };
      }
      if (url.endsWith('/launch-authority')) {
        return {
          status: 200,
          body: { kind: 'materialized', head: SERVER_HEAD, slots: [] },
        };
      }
      return { status: 404, body: {} };
    });

    const force = makeForce('force-root');
    const mission = makeMission();
    const campaign = {
      ...createCampaign('Gray Dawn', 'mercenary'),
      id: 'campaign-1',
      rootForceId: force.id,
      forces: new Map([[force.id, force]]),
      missions: new Map([[mission.id, mission]]),
      coopSession: createHostCoopSession('ROOM1', 'match-1'),
    };
    const otherRecord: ICoopParticipationRecord = {
      matchId: 'match-1',
      missionId: 'mission-1',
      playerId: 'guest',
      role: 'guest',
      choice: 'deploy',
      force,
    };
    const setLaunchError = jest.fn();

    await launchMissionFromPage({
      campaign,
      campaignKey: campaign.id,
      missionKey: 'mission-1',
      matchId: 'match-1',
      localForce: force,
      otherRecord,
      localPlayerId: 'host',
      localChoice: 'deploy',
      readinessProjection: readyProjection(),
      router: { push: jest.fn() },
      store: fakeStore(),
      setLaunchError,
      setIsLaunching: jest.fn(),
    });

    const fetchMock = globalThis.fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/campaign-1/head', {
      method: 'GET',
    });
    const authorityCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/launch-authority'),
    );
    expect(authorityCall).toBeDefined();
    const authorityBody = JSON.parse(String(authorityCall?.[1]?.body)) as {
      expectedHead: unknown;
      sessionId?: string;
    };
    expect(authorityBody.expectedHead).toEqual({
      branchId: 'root',
      revision: SERVER_HEAD.revision,
      effectiveGeneration: 1,
    });
    expect(authorityBody.sessionId).toBe('match-1');
    expect(authorityBody.expectedHead).not.toEqual(
      expect.objectContaining({ revision: SEQUENCE_DERIVED_REVISION }),
    );

    const admission = launchCoopMissionMock.mock.calls[0]?.[3];
    expect(admission?.expected.revision).toBe(SERVER_HEAD.revision);
    expect(admission?.snapshot.revision).toBe(SERVER_HEAD.revision);
    expect(admission?.expected.revision).not.toBe(SEQUENCE_DERIVED_REVISION);
    expect(setLaunchError).toHaveBeenCalledWith(null);
  });

  it('surfaces a stale server head refusal as the dashboard typed conflict', async () => {
    const refusal = {
      kind: 'refused',
      code: 'STALE_REVISION',
      reason: 'launch head is stale (STALE_REVISION)',
      activeHead: ACTIVE,
      resyncAction: 'resync-to-active-head',
    };
    globalThis.fetch = fetchAnswering((url) => {
      if (url.endsWith('/head')) {
        return { status: 200, body: SERVER_HEAD };
      }
      if (url.endsWith('/launch-authority')) {
        return { status: 409, body: refusal };
      }
      return { status: 404, body: {} };
    });

    const force = makeForce('force-root');
    const mission = makeMission();
    const campaign = {
      ...createCampaign('Gray Dawn', 'mercenary'),
      id: 'campaign-1',
      rootForceId: force.id,
      forces: new Map([[force.id, force]]),
      missions: new Map([[mission.id, mission]]),
      coopSession: createHostCoopSession('ROOM1', 'match-1'),
    };
    const setLaunchError = jest.fn();

    await launchMissionFromPage({
      campaign,
      campaignKey: campaign.id,
      missionKey: 'mission-1',
      matchId: 'match-1',
      localForce: force,
      otherRecord: {
        matchId: 'match-1',
        missionId: 'mission-1',
        playerId: 'guest',
        role: 'guest',
        choice: 'deploy',
        force,
      },
      localPlayerId: 'host',
      localChoice: 'deploy',
      readinessProjection: readyProjection(),
      router: { push: jest.fn() },
      store: fakeStore(),
      setLaunchError,
      setIsLaunching: jest.fn(),
    });

    expect(launchCoopMissionMock).not.toHaveBeenCalled();
    expect(useCampaignPersistenceStore.getState().launchConflict).toEqual({
      code: 'STALE_REVISION',
      reason:
        'Campaign launch refused (STALE_REVISION): launch head is stale (STALE_REVISION)',
      activeHead: ACTIVE,
      resyncAction: 'resync-to-active-head',
    });
    expect(setLaunchError).toHaveBeenCalledWith(
      'Launch refused (STALE_REVISION): the campaign has moved on to revision 9.',
    );
  });

  it('reads the server head for a single-player launch and asks the launch door with it', async () => {
    globalThis.fetch = fetchAnswering((url) => {
      if (url.endsWith('/head')) {
        return { status: 200, body: SERVER_HEAD };
      }
      if (url.endsWith('/launch-authority')) {
        return {
          status: 200,
          body: { kind: 'materialized', head: SERVER_HEAD, slots: [] },
        };
      }
      return { status: 404, body: {} };
    });
    useCampaignPersistenceStore.setState({
      saveCampaign: jest.fn(async () => ({
        status: 'saved' as const,
        record: {} as SerializedCampaign,
      })),
    });

    const force = makeForce('force-root');
    const mission = makeMission();
    const campaign = {
      ...createCampaign('Gray Dawn', 'mercenary'),
      id: 'campaign-1',
      rootForceId: force.id,
      forces: new Map([[force.id, force]]),
      missions: new Map([[mission.id, mission]]),
    };
    const router = { push: jest.fn() };

    await launchMissionFromPage({
      campaign,
      campaignKey: campaign.id,
      missionKey: 'mission-1',
      matchId: null,
      localForce: force,
      localPlayerId: 'host',
      localChoice: 'deploy',
      readinessProjection: readyProjection(),
      router,
      store: fakeStore(),
      setLaunchError: jest.fn(),
      setIsLaunching: jest.fn(),
    });

    const fetchMock = globalThis.fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/campaigns/campaign-1/head',
      expect.anything(),
    );
    const authorityCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/launch-authority'),
    );
    expect(authorityCall).toBeDefined();
    const authorityBody = JSON.parse(String(authorityCall?.[1]?.body)) as {
      expectedHead: unknown;
      sessionId?: unknown;
    };
    expect(authorityBody.expectedHead).toEqual({
      branchId: SERVER_HEAD.branchId,
      revision: SERVER_HEAD.revision,
      effectiveGeneration: SERVER_HEAD.effectiveGeneration,
    });
    expect(authorityBody.sessionId).toBeUndefined();
    expect(materializeMock.mock.calls[0]?.[0]).toHaveProperty('ownedForces');
    expect(router.push).toHaveBeenCalled();
  });

  it('still launches a single-player campaign with no effective branch', async () => {
    globalThis.fetch = fetchAnswering((url) => {
      if (url.endsWith('/head')) {
        return { status: 200, body: { kind: 'no-authoritative-stream' } };
      }
      return { status: 404, body: {} };
    });
    useCampaignPersistenceStore.setState({
      // A saved checkpoint; the launch path reads only the status, never
      // the record, so the record is a typed placeholder.
      saveCampaign: jest.fn(async () => ({
        status: 'saved' as const,
        record: {} as SerializedCampaign,
      })),
    });

    const force = makeForce('force-root');
    const mission = makeMission();
    const campaign = {
      ...createCampaign('Gray Dawn', 'mercenary'),
      id: 'campaign-1',
      rootForceId: force.id,
      forces: new Map([[force.id, force]]),
      missions: new Map([[mission.id, mission]]),
    };
    const router = { push: jest.fn() };

    await launchMissionFromPage({
      campaign,
      campaignKey: campaign.id,
      missionKey: 'mission-1',
      matchId: null,
      localForce: force,
      localPlayerId: 'host',
      localChoice: 'deploy',
      readinessProjection: readyProjection(),
      router,
      store: fakeStore(),
      setLaunchError: jest.fn(),
      setIsLaunching: jest.fn(),
    });

    const fetchMock = globalThis.fetch as jest.Mock;
    const authorityCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/launch-authority'),
    );
    expect(authorityCall).toBeUndefined();
    expect(materializeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign,
        missionId: 'mission-1',
      }),
    );
    expect(materializeMock.mock.calls[0]?.[0]).not.toHaveProperty(
      'ownedForces',
    );
    expect(router.push).toHaveBeenCalled();
    expect(useCampaignPersistenceStore.getState().launchConflict).toBeNull();
  });
});
