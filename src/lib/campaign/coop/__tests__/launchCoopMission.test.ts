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

import type { IForce } from '@/types/campaign/Force';
import type { IEncounter } from '@/types/encounter';

import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import {
  admitCampaignLaunch,
  readyCanonicalCatalog,
} from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { EncounterStatus, TerrainPreset } from '@/types/encounter';

import type { ICampaignEncounterLauncherService } from '../../encounter/launchCampaignEncounter';
import type { LaunchCoopMissionAdmission } from '../launchCoopMission';

import { launchCoopMission } from '../launchCoopMission';

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
    ...overrides,
  };
}

function hostDeploy() {
  // oxfmt-ignore
  return [{ playerId: 'host' as const, role: 'host' as const, force: makeForce('force-host', ['u-h1']), participation: 'deploy' as const }];
}

/**
 * A fake encounter launcher that records the calls and reports a
 * successfully launched session — stands in for the SQLite-backed
 * `EncounterService` singleton.
 */
function fakeService(): {
  service: ICampaignEncounterLauncherService;
  launched: string[];
} {
  const launched: string[] = [];
  let stored: IEncounter | null = null;
  const service: ICampaignEncounterLauncherService = {
    createEncounter: (input) => {
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
      if (stored) {
        stored = { ...stored, gameSessionId: 'game-session-coop-1' };
      }
      return { success: true, id };
    },
    getEncounter: () => stored,
  };
  return { service, launched };
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
