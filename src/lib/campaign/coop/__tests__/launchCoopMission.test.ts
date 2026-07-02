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

import type { IForce } from '@/types/campaign/Force';
import type { IEncounter } from '@/types/encounter';

import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { EncounterStatus, TerrainPreset } from '@/types/encounter';

import type { ICampaignEncounterLauncherService } from '../../encounter/launchCampaignEncounter';

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
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.compositionRejection).toBe('no-deploying-player');
    expect(result.error).toContain('at least one player must deploy');
    // No encounter was created — the launch path was never entered.
    expect(launched).toEqual([]);
  });
});
