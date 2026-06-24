import type { IEncounter } from '@/types/encounter/EncounterInterfaces';

import {
  EncounterStatus,
  ScenarioTemplateType,
  TerrainPreset,
} from '@/types/encounter/EncounterInterfaces';

import { buildPreBattleLaunchLinkage } from '../preBattleLaunchLinkage';

function makeEncounter(overrides: Partial<IEncounter> = {}): IEncounter {
  return {
    id: 'encounter-alpha',
    name: 'Border Clash',
    status: EncounterStatus.Ready,
    template: ScenarioTemplateType.Skirmish,
    playerForce: {
      forceId: 'force-player',
      forceName: 'Player Lance',
      totalBV: 4200,
      unitCount: 4,
    },
    opponentForce: {
      forceId: 'force-opponent',
      forceName: 'Opponent Lance',
      totalBV: 4100,
      unitCount: 4,
    },
    mapConfig: {
      radius: 7,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [],
    optionalRules: [],
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-06-24T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildPreBattleLaunchLinkage', () => {
  it('uses encounter campaign metadata when it exists', () => {
    const linkage = buildPreBattleLaunchLinkage({
      encounter: makeEncounter({
        campaignMeta: {
          campaignId: 'campaign-from-encounter',
          contractId: 'contract-from-encounter',
          scenarioId: 'scenario-from-encounter',
        },
      }),
      campaignId: 'campaign-from-route',
      missionId: 'mission-from-route',
    });

    expect(linkage).toMatchObject({
      encounterId: 'encounter-alpha',
      campaignId: 'campaign-from-encounter',
      contractId: 'contract-from-encounter',
      scenarioId: 'scenario-from-encounter',
      missionId: 'mission-from-route',
      encounterMeta: {
        encounterId: 'encounter-alpha',
        encounterName: 'Border Clash',
        templateType: ScenarioTemplateType.Skirmish,
        playerForceSummary: 'Player Lance (4200 BV, 4 units)',
        opponentSummary: 'Opponent Lance (4100 BV, 4 units)',
      },
    });
  });

  it('falls back to campaign route query for dashboard-generated missions', () => {
    const linkage = buildPreBattleLaunchLinkage({
      encounter: makeEncounter(),
      campaignId: ['campaign-from-query'],
      missionId: ['mission-from-query'],
    });

    expect(linkage).toMatchObject({
      encounterId: 'encounter-alpha',
      campaignId: 'campaign-from-query',
      contractId: 'mission-from-query',
      scenarioId: 'encounter-alpha',
      missionId: 'mission-from-query',
    });
  });

  it('keeps standalone encounters unbound while preserving encounter context', () => {
    const linkage = buildPreBattleLaunchLinkage({
      encounter: makeEncounter({
        opponentForce: null,
      }),
    });

    expect(linkage).toMatchObject({
      encounterId: 'encounter-alpha',
      campaignId: null,
      contractId: null,
      scenarioId: null,
      missionId: null,
      encounterMeta: {
        opponentSummary: '(missing force)',
      },
    });
  });
});
