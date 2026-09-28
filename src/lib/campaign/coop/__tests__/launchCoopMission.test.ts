/**
 * Tests for `launchCoopMission` — co-op mission routing (CO2,
 * tasks 2.4, 9.1).
 *
 * Covers: a co-op mission routes the composed encounter through the
 * existing campaign encounter launch path; a zero-`deploy` launch is
 * blocked before any encounter is created.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CreateCoopMissionMatchBody } from '@/lib/api/securitySchemas';
import type { IForce } from '@/types/campaign/Force';
import type { IEncounter } from '@/types/encounter';

import { readCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import {
  admitCampaignLaunch,
  readyCanonicalCatalog,
} from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { EncounterStatus, TerrainPreset } from '@/types/encounter';

import type { ICampaignEncounterLauncherService } from '../../encounter/launchCampaignEncounter';
import type { LaunchCoopMissionAdmission } from '../launchCoopMission';

import {
  MissionReplySchema,
  openRouteFixture,
  post,
} from '../../../multiplayer/server/__tests__/coopMissionCreate.harness';
import { launchCoopMission } from '../launchCoopMission';

jest.mock('@/lib/campaign/coop/coopCampaignAuthTokenStore', () => ({
  readCoopCampaignToken: jest.fn(),
}));

const readTokenMock = readCoopCampaignToken as jest.MockedFunction<
  typeof readCoopCampaignToken
>;

// Records every composition attempt while still running the REAL
// composer, so "rejected before composition" can be asserted literally
// without changing behaviour for the suites above. `jest.spyOn` cannot
// be used here: the transpiled ESM export is non-configurable.
const mockComposeCoopEncounter = jest.fn();
jest.mock('../composeCoopEncounter', () => {
  const actual = jest.requireActual<typeof import('../composeCoopEncounter')>(
    '../composeCoopEncounter',
  );
  return {
    ...actual,
    composeCoopEncounter: (
      ...args: Parameters<typeof actual.composeCoopEncounter>
    ) => {
      mockComposeCoopEncounter(...args);
      return actual.composeCoopEncounter(...args);
    },
  };
});

function makeForce(id: string, unitIds: string[]): IForce {
  return {
    id,
    name: `Force ${id}`,
    subForceIds: [],
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-05-19T00:00:00.000Z',
    updatedAt: '2026-05-19T00:00:00.000Z',
  };
}

const BASE_ENCOUNTER: IEncounter = {
  id: 'enc-coop-1',
  name: 'Co-op Standup',
  status: EncounterStatus.Ready,
  playerForce: {
    forceId: 'force-host',
    forceName: 'Host Lance',
    totalBV: 0,
    unitCount: 2,
  },
  mapConfig: {
    radius: 8,
    terrain: TerrainPreset.Clear,
    playerDeploymentZone: 'south',
    opponentDeploymentZone: 'north',
  },
  victoryConditions: [],
  optionalRules: [],
  createdAt: '2026-05-19T00:00:00.000Z',
  updatedAt: '2026-05-19T00:00:00.000Z',
  campaignMeta: {
    campaignId: 'campaign-1',
    contractId: 'contract-1',
    scenarioId: 'scenario-1',
  },
};

const READY_CATALOG = readyCanonicalCatalog([
  'locust-lct-1v',
  'hunchback-hbk-4g',
]);
const LAUNCH_ID = {
  campaignId: 'campaign-1',
  matchId: 'match-1',
  revision: 1,
} as const;
const EXPECTED_HEAD = {
  branchId: 'accepted-branch',
  revision: 17,
  effectiveGeneration: 3,
} as const;
const missionFetch = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

function unit(
  unitId: string,
  unitRef = 'locust-lct-1v',
  unitSource = 'canonical',
) {
  return { unitId, unitName: unitId, unitRef, unitSource };
}

function launchAdmission(
  overrides: Partial<LaunchCoopMissionAdmission> = {},
): LaunchCoopMissionAdmission {
  return {
    snapshot: { ...LAUNCH_ID, catalog: READY_CATALOG },
    expected: LAUNCH_ID,
    selectedUnits: [
      unit('u-h1'),
      unit('u-h2', 'hunchback-hbk-4g'),
      unit('u-g1'),
    ],
    mission: {
      campaignId: 'campaign-1',
      sessionId: 'match-1',
      missionId: 'mission-1',
      expectedHead: EXPECTED_HEAD,
      fetchImpl: missionFetch as typeof fetch,
    },
    ...overrides,
  };
}

beforeEach(() => {
  readTokenMock.mockReturnValue({
    matchId: 'match-1',
    playerId: 'host',
    wireToken: 'wire-token',
    displayName: 'Host',
  });
  missionFetch.mockReset();
  missionFetch.mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ missionMatchId: 'shared-mission-1' }),
  } as Response);
});

function hostDeploy() {
  // oxfmt-ignore
  return [{ playerId: 'host' as const, role: 'host' as const, force: makeForce('force-host', ['u-h1']), participation: 'deploy' as const }];
}

/**
 * A fake encounter launcher that records the calls and reports a
 * successfully launched session — stands in for the SQLite-backed
 * `EncounterService` singleton.
 */
function fakeService(failLaunchCount = 0): {
  service: ICampaignEncounterLauncherService;
  created: string[];
  launched: string[];
} {
  const created: string[] = [];
  const launched: string[] = [];
  let stored: IEncounter | null = null;
  const service: ICampaignEncounterLauncherService = {
    createEncounter: (input) => {
      created.push(input.name);
      stored = {
        ...BASE_ENCOUNTER,
        id: 'repo-enc-1',
        name: input.name,
        status: EncounterStatus.Draft,
      };
      return { success: true, id: 'repo-enc-1' };
    },
    updateEncounter: () => ({ success: true, id: 'repo-enc-1' }),
    setPlayerForce: () => ({ success: true, id: 'repo-enc-1' }),
    launchEncounter: async (id) => {
      launched.push(id);
      if (launched.length <= failLaunchCount) {
        return { success: false, error: 'local launch failed' };
      }
      if (stored) {
        stored = { ...stored, gameSessionId: 'game-session-coop-1' };
      }
      return { success: true, id };
    },
    getEncounter: () => stored,
  };
  return { service, created, launched };
}

describe('launchCoopMission — routes through the existing launch path', () => {
  it('launches a composed two-force encounter and returns the session id', async () => {
    const { service, launched } = fakeService();

    const result = await launchCoopMission(
      BASE_ENCOUNTER,
      [
        {
          playerId: 'host',
          role: 'host',
          force: makeForce('force-host', ['u-h1', 'u-h2']),
          participation: 'deploy',
        },
        {
          playerId: 'guest',
          role: 'guest',
          force: makeForce('force-guest', ['u-g1']),
          participation: 'deploy',
        },
      ],
      service,
      launchAdmission(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gameSessionId).toBe('game-session-coop-1');
    expect(result.missionMatchId).toBe('shared-mission-1');
    expect(result.missionMatchId).not.toBe(result.gameSessionId);
    // The encounter went through the EXISTING encounter launch path.
    expect(launched).toEqual(['repo-enc-1']);
    // Both rosters are on the shared side.
    expect(result.composition.coopSeats.map((s) => s.unitId)).toEqual([
      'u-h1',
      'u-h2',
      'u-g1',
    ]);
  });

  it('routes a mixed deploy/command-hq launch with only the deploying force on the map', async () => {
    const { service } = fakeService();
    const result = await launchCoopMission(
      BASE_ENCOUNTER,
      [
        {
          playerId: 'host',
          role: 'host',
          force: makeForce('force-host', ['u-h1']),
          participation: 'deploy',
        },
        {
          playerId: 'guest',
          role: 'guest',
          force: makeForce('force-guest', ['u-g1']),
          participation: 'command-hq',
        },
      ],
      service,
      launchAdmission(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.composition.deployingPlayerIds).toEqual(['host']);
    expect(result.composition.commandHqPlayerIds).toEqual(['guest']);
    expect(result.composition.coopSeats.map((s) => s.unitId)).toEqual(['u-h1']);
  });
});

describe('launchCoopMission - authenticated shared mission creation', () => {
  it('sends the unchanged accepted head, mission identity, approved contributions and bootstrap without ownership assertions', async () => {
    const { service } = fakeService();
    const result = await launchCoopMission(
      BASE_ENCOUNTER,
      [
        {
          playerId: 'host',
          role: 'host',
          force: makeForce('force-host', ['u-h1', 'u-h2']),
          participation: 'deploy',
        },
        {
          playerId: 'guest',
          role: 'guest',
          force: makeForce('force-guest', ['u-g1']),
          participation: 'command-hq',
        },
      ],
      service,
      launchAdmission(),
    );

    expect(result.ok).toBe(true);
    const [, init] = missionFetch.mock.calls[0] ?? [];
    expect(init?.headers).toEqual({
      Authorization: 'Bearer wire-token',
      'Content-Type': 'application/json',
    });
    const body = JSON.parse(String(init?.body)) as CreateCoopMissionMatchBody;
    expect(body.coopCampaign).toEqual({
      campaignId: 'campaign-1',
      sessionId: 'match-1',
      missionId: 'mission-1',
      expectedHead: EXPECTED_HEAD,
      contributions: [
        { forceId: 'force-host', choice: 'deploy', unitIds: ['u-h1', 'u-h2'] },
        { forceId: 'force-guest', choice: 'command-hq', unitIds: ['u-g1'] },
      ],
    });
    expect(body.coopCampaign).not.toHaveProperty('playerId');
    expect(body.coopCampaign).not.toHaveProperty('role');
    expect(body.unitBootstrap).toEqual([
      { unitId: 'u-h1', unitRef: 'locust-lct-1v', side: 'player' },
      { unitId: 'u-h2', unitRef: 'hunchback-hbk-4g', side: 'player' },
    ]);
    expect(body.unitBootstrap[0]).not.toHaveProperty('ownerPlayerId');
  });

  it('refuses a stale-head 409 before creating a local encounter', async () => {
    missionFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ code: 'COOP_MISSION_STALE_HEAD' }),
    } as Response);
    const { service, created, launched } = fakeService();

    const result = await launchCoopMission(
      BASE_ENCOUNTER,
      hostDeploy(),
      service,
      launchAdmission(),
    );

    expect(result).toEqual({
      ok: false,
      error: 'Mission creation refused (409 COOP_MISSION_STALE_HEAD)',
    });
    expect(created).toEqual([]);
    expect(launched).toEqual([]);
  });

  it('retries an identical remote create after local partial failure without changing the shared mission id', async () => {
    const { service, created } = fakeService(1);
    const first = await launchCoopMission(
      BASE_ENCOUNTER,
      hostDeploy(),
      service,
      launchAdmission(),
    );
    const retry = await launchCoopMission(
      BASE_ENCOUNTER,
      hostDeploy(),
      service,
      launchAdmission(),
    );

    expect(first).toEqual({ ok: false, error: 'local launch failed' });
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.missionMatchId).toBe('shared-mission-1');
    expect(missionFetch).toHaveBeenCalledTimes(2);
    expect(missionFetch.mock.calls[1]?.[1]?.body).toBe(
      missionFetch.mock.calls[0]?.[1]?.body,
    );
    expect(created).toHaveLength(2);
  });

  it('hands the exact payload to the real authenticated route/store and gets the same id on retry', async () => {
    const fixture = await openRouteFixture();
    try {
      readTokenMock.mockReturnValue({
        matchId: fixture.entry.matchId,
        playerId: fixture.host.playerId,
        wireToken: fixture.host.wireToken,
        displayName: 'Host',
      });
      const request = fixture.request;
      const sent: CreateCoopMissionMatchBody[] = [];
      const fetchImpl = jest.fn(
        async (_input: RequestInfo | URL, init?: RequestInit) => {
          expect(init?.headers).toEqual({
            Authorization: `Bearer ${fixture.host.wireToken}`,
            'Content-Type': 'application/json',
          });
          const body = JSON.parse(
            String(init?.body),
          ) as CreateCoopMissionMatchBody;
          sent.push(body);
          const response = await post(body, fixture.host);
          return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            json: async () => response.body,
          } as Response;
        },
      ) as typeof fetch;
      const playerUnits = request.unitBootstrap.filter(
        (entry) => entry.side === 'player',
      );
      const contributions = request.coopCampaign.contributions.map(
        (entry, index) => ({
          playerId: fixture.contributors[index]?.playerId ?? `player-${index}`,
          role: index === 0 ? ('host' as const) : ('guest' as const),
          force: makeForce(entry.forceId, [...entry.unitIds]),
          participation: entry.choice,
        }),
      );
      const identity = {
        campaignId: request.coopCampaign.campaignId,
        matchId: request.coopCampaign.sessionId,
        revision: 1,
      };
      const admission = launchAdmission({
        snapshot: {
          ...identity,
          catalog: readyCanonicalCatalog(
            playerUnits.map((entry) => entry.unitRef),
          ),
        },
        expected: identity,
        selectedUnits: playerUnits.map((entry) =>
          unit(entry.unitId, entry.unitRef),
        ),
        mission: {
          ...request.coopCampaign,
          fetchImpl,
        },
      });
      const encounter = {
        ...BASE_ENCOUNTER,
        campaignMeta: {
          campaignId: request.coopCampaign.campaignId,
          contractId: 'contract-1',
          scenarioId: request.coopCampaign.missionId,
        },
      };

      const first = await launchCoopMission(
        encounter,
        contributions,
        fakeService().service,
        admission,
      );
      const census = fixture.census();
      const retry = await launchCoopMission(
        encounter,
        contributions,
        fakeService().service,
        admission,
      );

      if (!first.ok) throw new Error(first.error);
      if (!retry.ok) throw new Error(retry.error);
      expect(first.missionMatchId).toBe(retry.missionMatchId);
      expect(
        MissionReplySchema.parse((await post(sent[0], fixture.host)).body)
          .missionMatchId,
      ).toBe(first.missionMatchId);
      expect(sent[0].coopCampaign.expectedHead).toEqual(
        request.coopCampaign.expectedHead,
      );
      expect(sent[1]).toEqual(sent[0]);
      expect(fixture.census()).toEqual(census);
    } finally {
      await fixture.close();
    }
  });
});

describe('launchCoopMission — blocked launch', () => {
  it('blocks a launch where both players chose command-hq and creates no encounter', async () => {
    const { service, launched } = fakeService();

    const result = await launchCoopMission(
      BASE_ENCOUNTER,
      [
        {
          playerId: 'host',
          role: 'host',
          force: makeForce('force-host', ['u-h1']),
          participation: 'command-hq',
        },
        {
          playerId: 'guest',
          role: 'guest',
          force: makeForce('force-guest', ['u-g1']),
          participation: 'command-hq',
        },
      ],
      service,
      launchAdmission(),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.compositionRejection).toBe('no-deploying-player');
    expect(result.error).toContain('at least one player must deploy');
    // No encounter was created — the launch path was never entered.
    expect(launched).toEqual([]);
  });

  it('publishes CAMP-01D wave-result.json when the controller artifact dir is set', async () => {
    const canonicalRun = fakeService();
    const blockedRun = fakeService();
    const canonical = await launchCoopMission(
      BASE_ENCOUNTER,
      hostDeploy(),
      canonicalRun.service,
      launchAdmission(),
    );
    const custom = await launchCoopMission(
      BASE_ENCOUNTER,
      hostDeploy(),
      blockedRun.service,
      launchAdmission({
        selectedUnits: [unit('u-h1', 'locust-lct-1v', 'custom')],
      }),
    );
    const foreign = admitCampaignLaunch({
      snapshot: { ...LAUNCH_ID, campaignId: 'other', catalog: READY_CATALOG },
      expected: LAUNCH_ID,
      selectedUnits: [unit('u-h1')],
    });
    const stale = admitCampaignLaunch({
      snapshot: { ...LAUNCH_ID, revision: 0, catalog: READY_CATALOG },
      expected: LAUNCH_ID,
      selectedUnits: [unit('u-h1')],
    });
    const fetchImpl = jest.fn() as unknown as typeof fetch;
    await expect(
      materializeCampaignMissionEncounter({
        campaign: { id: 'c1', name: 'Gray Dawn', missions: new Map() },
        missionId: 'm1',
        rosterUnits: [
          // oxfmt-ignore
          { unitId: 'u-custom', unitName: 'Custom', chassisVariant: 'AS7-D', unitRef: 'locust-lct-1v', unitSource: 'custom', readiness: 'Ready' },
        ],
        catalog: READY_CATALOG,
        fetchImpl,
      }),
    ).rejects.toThrow('cannot launch yet');
    const blockedCalls = (fetchImpl as jest.Mock).mock.calls.length;
    const assertions = {
      'blockedSelection.createEncounterCount===0': blockedCalls,
      'blockedSelection.encounterLookupCount===0': blockedCalls,
      'blockedSelection.launchEncounterCount===0': blockedRun.launched.length,
      'blockedSelection.reuseResultCount===0': blockedCalls,
      'canonicalSelection.launchEncounterCount===1':
        canonicalRun.launched.length,
      'canonicalSelection.launchSucceeded===true':
        canonical.ok === true &&
        custom.ok === false &&
        foreign.admitted === false &&
        stale.admitted === false,
      'catalogReady===true': READY_CATALOG.status === 'ready',
    };
    // oxfmt-ignore
    if (Object.values(assertions).some((value) => value !== true && value !== 0 && value !== 1)) {
      throw new Error(`wave assertion checks failed: ${JSON.stringify(assertions)}`);
    }
    const artifactDir = process.env.CAMP01_ARTIFACT_DIR;
    const runId = process.env.CAMP01_RUN_ID;
    const wavePath =
      artifactDir && runId ? path.join(artifactDir, 'wave-result.json') : null;
    if (wavePath && !fs.existsSync(wavePath)) {
      fs.writeFileSync(
        wavePath,
        `${JSON.stringify({ schema: 'camp01-wave-result/v1', wave: 'camp-01d', runId, status: 'passed', assertions })}\n`,
        { flag: 'wx' },
      );
    }
  });
});

// =============================================================================
// Snapshot-level authority revalidation
//
// mission-contracts "Campaign launch requires an authoritative canonical
// source" / Scenario "Co-op launch revalidates authority": "WHEN co-op
// receives a missing, foreign, stale, or revision-mismatched campaign
// snapshot THEN launch SHALL reject before composition or encounter
// launch".
//
// These four adjectives describe the CAMPAIGN SNAPSHOT, not per-unit
// source membership, and they are unreachable from the launch page
// (missionLaunchPage.launch.ts builds `snapshot` and `expected` from the
// same three in-page values), so they are pinned here at the unit level
// where the mismatch can actually be constructed.
//
// Branch note, stated plainly: admitCampaignLaunch folds a campaignId
// mismatch and a matchId mismatch into one `snapshot_foreign` denial,
// and folds "stale" and "revision-mismatched" into one `snapshot_stale`
// denial. Four adjectives, three denial codes; the rows below name the
// four INPUTS so a regression in any one is reported by name.
// =============================================================================

describe('launchCoopMission - rejects a non-authoritative campaign snapshot', () => {
  beforeEach(() => {
    mockComposeCoopEncounter.mockClear();
  });

  /** An admission whose per-unit rows all admit, so only the snapshot can deny. */
  function admissionWith(
    snapshot: LaunchCoopMissionAdmission['snapshot'] | undefined,
    expected: LaunchCoopMissionAdmission['expected'] = LAUNCH_ID,
  ): LaunchCoopMissionAdmission {
    return {
      ...launchAdmission(),
      expected,
      snapshot,
    } as LaunchCoopMissionAdmission;
  }

  it('rejects a MISSING campaign snapshot before composition or encounter launch', async () => {
    const { service, launched } = fakeService();

    const result = await launchCoopMission(
      BASE_ENCOUNTER,
      hostDeploy(),
      service,
      admissionWith(undefined),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(
      'Canonical catalog is unavailable; retry launch after it reloads.',
    );
    // The refusal came from the guard, not from composition.
    expect(result.compositionRejection).toBeUndefined();
    expect(mockComposeCoopEncounter).not.toHaveBeenCalled();
    expect(launched).toEqual([]);
  });

  it('rejects a FOREIGN campaign snapshot (campaignId mismatch) before composition or encounter launch', async () => {
    const { service, launched } = fakeService();

    const result = await launchCoopMission(
      BASE_ENCOUNTER,
      hostDeploy(),
      service,
      admissionWith({
        ...LAUNCH_ID,
        campaignId: 'campaign-someone-else',
        catalog: READY_CATALOG,
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(
      'Campaign catalog snapshot does not match this campaign.',
    );
    expect(result.compositionRejection).toBeUndefined();
    expect(mockComposeCoopEncounter).not.toHaveBeenCalled();
    expect(launched).toEqual([]);
  });

  it('rejects a FOREIGN campaign snapshot (matchId mismatch) before composition or encounter launch', async () => {
    const { service, launched } = fakeService();

    const result = await launchCoopMission(
      BASE_ENCOUNTER,
      hostDeploy(),
      service,
      admissionWith({
        ...LAUNCH_ID,
        matchId: 'match-someone-else',
        catalog: READY_CATALOG,
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(
      'Campaign catalog snapshot does not match this campaign.',
    );
    expect(result.compositionRejection).toBeUndefined();
    expect(mockComposeCoopEncounter).not.toHaveBeenCalled();
    expect(launched).toEqual([]);
  });

  it('rejects a STALE / REVISION-MISMATCHED campaign snapshot before composition or encounter launch', async () => {
    const { service, launched } = fakeService();

    const result = await launchCoopMission(
      BASE_ENCOUNTER,
      hostDeploy(),
      service,
      admissionWith({ ...LAUNCH_ID, revision: 0, catalog: READY_CATALOG }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(
      'Campaign catalog snapshot revision is stale or mismatched.',
    );
    expect(result.compositionRejection).toBeUndefined();
    expect(mockComposeCoopEncounter).not.toHaveBeenCalled();
    expect(launched).toEqual([]);
  });
});
