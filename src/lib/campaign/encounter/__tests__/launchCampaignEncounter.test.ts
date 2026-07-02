/**
 * Tests for the campaign-linked encounter launch path.
 *
 * Per `add-campaign-combat-loop` task 3.3: launching a generated
 * encounter produces a campaign-linked session; the linkage fields
 * round-trip to the session.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type { ICampaignEncounterLauncherService } from '@/lib/campaign/encounter/launchCampaignEncounter';
import type { IEncounter } from '@/types/encounter';

import { launchCampaignEncounter } from '@/lib/campaign/encounter/launchCampaignEncounter';
import {
  EncounterStatus,
  PilotSkillTemplate,
  TerrainPreset,
  VictoryConditionType,
} from '@/types/encounter';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCampaignEncounter(overrides?: Partial<IEncounter>): IEncounter {
  return {
    id: 'enc-scn-1',
    name: 'Garrison: Hesperus II: Standup',
    description: 'Campaign scenario.',
    status: EncounterStatus.Ready,
    playerForce: {
      forceId: 'force-alpha',
      forceName: 'Alpha Lance',
      totalBV: 0,
      unitCount: 4,
    },
    opForConfig: {
      targetBV: 4500,
      pilotSkillTemplate: PilotSkillTemplate.Regular,
    },
    mapConfig: {
      radius: 8,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    optionalRules: [],
    createdAt: '3025-06-15T00:00:00.000Z',
    updatedAt: '3025-06-15T00:00:00.000Z',
    campaignMeta: {
      campaignId: 'campaign-1',
      contractId: 'contract-1',
      scenarioId: 'scn-1',
    },
    ...overrides,
  };
}

/**
 * A fake encounter service that records every call so the test can
 * assert linkage threading without standing up the SQLite repository.
 */
function makeFakeService(): {
  service: ICampaignEncounterLauncherService;
  calls: {
    created: { name: string }[];
    launched: {
      id: string;
      options?: {
        campaignId?: string | null;
        contractId?: string | null;
        scenarioId?: string | null;
      };
    }[];
    playerForceSet: { id: string; forceId: string }[];
  };
} {
  const calls = {
    created: [] as { name: string }[],
    launched: [] as {
      id: string;
      options?: {
        campaignId?: string | null;
        contractId?: string | null;
        scenarioId?: string | null;
      };
    }[],
    playerForceSet: [] as { id: string; forceId: string }[],
  };
  const repoId = 'encounter-repo-1';
  let gameSessionId: string | undefined;

  const service: ICampaignEncounterLauncherService = {
    createEncounter(input) {
      calls.created.push({ name: input.name });
      return { success: true, id: repoId };
    },
    updateEncounter() {
      return { success: true, id: repoId };
    },
    setPlayerForce(id, forceId) {
      calls.playerForceSet.push({ id, forceId });
      return { success: true, id };
    },
    async launchEncounter(id, options) {
      calls.launched.push({ id, options });
      gameSessionId = 'game-session-xyz';
      return { success: true, id };
    },
    getEncounter(id) {
      return {
        ...makeCampaignEncounter(),
        id,
        status: EncounterStatus.Launched,
        gameSessionId,
      };
    },
  };
  return { service, calls };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('launchCampaignEncounter', () => {
  it('launching a generated encounter produces a campaign-linked session', async () => {
    const { service, calls } = makeFakeService();
    const result = await launchCampaignEncounter(
      makeCampaignEncounter(),
      service,
    );

    expect(result.success).toBe(true);
    expect(result.gameSessionId).toBe('game-session-xyz');
    expect(result.encounterId).toBe('encounter-repo-1');
    expect(calls.created).toHaveLength(1);
    expect(calls.launched).toHaveLength(1);
  });

  it('the campaign linkage fields round-trip to the launch call', async () => {
    const { service, calls } = makeFakeService();
    await launchCampaignEncounter(makeCampaignEncounter(), service);

    expect(calls.launched[0].options).toEqual({
      campaignId: 'campaign-1',
      contractId: 'contract-1',
      scenarioId: 'scn-1',
    });
  });

  it('attaches the player force when the bridge resolved one', async () => {
    const { service, calls } = makeFakeService();
    await launchCampaignEncounter(makeCampaignEncounter(), service);
    expect(calls.playerForceSet).toEqual([
      { id: 'encounter-repo-1', forceId: 'force-alpha' },
    ]);
  });

  it('skips force assignment when the encounter has no player force', async () => {
    const { service, calls } = makeFakeService();
    await launchCampaignEncounter(
      makeCampaignEncounter({ playerForce: undefined }),
      service,
    );
    expect(calls.playerForceSet).toHaveLength(0);
    expect(calls.launched).toHaveLength(1);
  });

  it('fails when the encounter has no campaign linkage', async () => {
    const { service } = makeFakeService();
    const result = await launchCampaignEncounter(
      makeCampaignEncounter({ campaignMeta: undefined }),
      service,
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/campaignMeta/);
  });

  it('surfaces a launch failure from the service', async () => {
    const { service } = makeFakeService();
    const failing: ICampaignEncounterLauncherService = {
      ...service,
      async launchEncounter() {
        return { success: false, error: 'force not found' };
      },
    };
    const result = await launchCampaignEncounter(
      makeCampaignEncounter(),
      failing,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('force not found');
  });
});
