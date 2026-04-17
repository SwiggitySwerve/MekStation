/**
 * Tests for the encounter → game session bridge.
 */

import type { IEncounter } from '@/types/encounter';
import type { IForce } from '@/types/force';
import type { IPilot } from '@/types/pilot';

import {
  EncounterStatus,
  PilotSkillTemplate,
  ScenarioTemplateType,
  TerrainPreset,
  VictoryConditionType,
} from '@/types/encounter';
import { ForcePosition, ForceStatus, ForceType } from '@/types/force';
import { GameSide } from '@/types/gameplay';
import { PilotStatus, PilotType } from '@/types/pilot';

import {
  buildGameConfigFromEncounter,
  buildGameUnitsFromEncounter,
  type IEncounterResolvers,
} from '../encounterToGameSession';

function makeEncounter(overrides: Partial<IEncounter> = {}): IEncounter {
  const now = new Date('2026-04-17').toISOString();
  return {
    id: 'enc-1',
    name: 'Test Encounter',
    status: EncounterStatus.Ready,
    template: ScenarioTemplateType.Skirmish,
    mapConfig: {
      radius: 7,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    optionalRules: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeForce(id: string, assignmentCount: number): IForce {
  const now = new Date('2026-04-17').toISOString();
  return {
    id,
    name: `Force ${id}`,
    forceType: ForceType.Lance,
    status: ForceStatus.Active,
    childIds: [],
    assignments: Array.from({ length: assignmentCount }, (_, i) => ({
      id: `${id}-assign-${i + 1}`,
      pilotId: `pilot-${id}-${i + 1}`,
      unitId: `unit-${id}-${i + 1}`,
      position: ForcePosition.Member,
      slot: i + 1,
    })),
    stats: {
      totalBV: 4000,
      totalTonnage: 200,
      assignedPilots: assignmentCount,
      assignedUnits: assignmentCount,
      emptySlots: 0,
      averageSkill: { gunnery: 4, piloting: 5 },
    },
    createdAt: now,
    updatedAt: now,
  };
}

function makePilot(id: string, gunnery = 3, piloting = 4): IPilot {
  const now = new Date('2026-04-17').toISOString();
  return {
    id,
    name: `Pilot ${id}`,
    callsign: `CS-${id}`,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery, piloting },
    wounds: 0,
    abilities: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe('buildGameConfigFromEncounter', () => {
  it('maps mapConfig.radius into mapRadius', () => {
    const encounter = makeEncounter({
      mapConfig: {
        radius: 12,
        terrain: TerrainPreset.Urban,
        playerDeploymentZone: 'west',
        opponentDeploymentZone: 'east',
      },
    });
    const config = buildGameConfigFromEncounter(encounter);
    expect(config.mapRadius).toBe(12);
  });

  it('extracts turnLimit from a VictoryConditionType.TurnLimit entry', () => {
    const encounter = makeEncounter({
      victoryConditions: [
        { type: VictoryConditionType.DestroyAll },
        { type: VictoryConditionType.TurnLimit, turnLimit: 20 },
      ],
    });
    const config = buildGameConfigFromEncounter(encounter);
    expect(config.turnLimit).toBe(20);
  });

  it('defaults turnLimit to 0 when no TurnLimit condition is present', () => {
    const encounter = makeEncounter({
      victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    });
    expect(buildGameConfigFromEncounter(encounter).turnLimit).toBe(0);
  });

  it('encodes every victory condition as a string', () => {
    const encounter = makeEncounter({
      victoryConditions: [
        { type: VictoryConditionType.DestroyAll },
        { type: VictoryConditionType.TurnLimit, turnLimit: 15 },
        { type: VictoryConditionType.Cripple, threshold: 75 },
        { type: VictoryConditionType.Custom, description: 'escape zone' },
      ],
    });
    const config = buildGameConfigFromEncounter(encounter);
    expect(config.victoryConditions).toEqual([
      'destroy_all',
      'turn_limit:15',
      'cripple:75',
      'custom:escape zone',
    ]);
  });

  it('copies optionalRules', () => {
    const encounter = makeEncounter({
      optionalRules: ['forest_fire', 'double_blind'],
    });
    expect(buildGameConfigFromEncounter(encounter).optionalRules).toEqual([
      'forest_fire',
      'double_blind',
    ]);
  });
});

describe('buildGameUnitsFromEncounter', () => {
  const pilotMap = new Map<string, IPilot>([
    ['pilot-p-1', makePilot('p-1', 3, 4)],
    ['pilot-p-2', makePilot('p-2', 2, 3)],
    ['pilot-o-1', makePilot('o-1', 5, 6)],
  ]);
  const playerForce = makeForce('p', 2);
  const opponentForce = makeForce('o', 1);

  const resolvers: IEncounterResolvers = {
    getForceById: (id) => {
      if (id === 'p') return playerForce;
      if (id === 'o') return opponentForce;
      return null;
    },
    getPilotById: (id) => pilotMap.get(id) ?? null,
  };

  it('errors when no player force is attached', () => {
    const encounter = makeEncounter({ playerForce: undefined });
    const result = buildGameUnitsFromEncounter(encounter, resolvers);
    expect(result.units).toEqual([]);
    expect(result.errors).toContain('Encounter has no player force assigned');
  });

  it('errors when the player force id does not resolve', () => {
    const encounter = makeEncounter({
      playerForce: {
        forceId: 'nope',
        forceName: 'N',
        totalBV: 0,
        unitCount: 0,
      },
    });
    const result = buildGameUnitsFromEncounter(encounter, resolvers);
    expect(result.errors.some((e) => e.includes('nope'))).toBe(true);
  });

  it('errors when neither opponent force nor opForConfig is set', () => {
    const encounter = makeEncounter({
      playerForce: {
        forceId: 'p',
        forceName: 'P',
        totalBV: 4000,
        unitCount: 2,
      },
    });
    const result = buildGameUnitsFromEncounter(encounter, resolvers);
    expect(result.errors).toContain(
      'Encounter has neither an opponent force nor an OpFor config',
    );
  });

  it('accepts opForConfig in lieu of an explicit opponent force', () => {
    const encounter = makeEncounter({
      playerForce: {
        forceId: 'p',
        forceName: 'P',
        totalBV: 4000,
        unitCount: 2,
      },
      opForConfig: {
        targetBVPercent: 100,
        pilotSkillTemplate: PilotSkillTemplate.Regular,
      },
    });
    const result = buildGameUnitsFromEncounter(encounter, resolvers);
    expect(result.errors).toEqual([]);
    expect(result.units).toHaveLength(2);
    expect(result.units.every((u) => u.side === GameSide.Player)).toBe(true);
  });

  it('builds IGameUnit entries for both sides with pilot skills filled in', () => {
    const encounter = makeEncounter({
      playerForce: {
        forceId: 'p',
        forceName: 'P',
        totalBV: 4000,
        unitCount: 2,
      },
      opponentForce: {
        forceId: 'o',
        forceName: 'O',
        totalBV: 2000,
        unitCount: 1,
      },
    });
    const result = buildGameUnitsFromEncounter(encounter, resolvers);

    expect(result.errors).toEqual([]);
    expect(result.units).toHaveLength(3);

    const player1 = result.units[0];
    expect(player1.side).toBe(GameSide.Player);
    expect(player1.unitRef).toBe('unit-p-1');
    expect(player1.pilotRef).toBe('pilot-p-1');
    expect(player1.gunnery).toBe(3);
    expect(player1.piloting).toBe(4);

    const opp = result.units[2];
    expect(opp.side).toBe(GameSide.Opponent);
    expect(opp.gunnery).toBe(5);
    expect(opp.piloting).toBe(6);
  });

  it('uses default skills when a pilot id is unresolved', () => {
    const encounter = makeEncounter({
      playerForce: {
        forceId: 'p',
        forceName: 'P',
        totalBV: 4000,
        unitCount: 2,
      },
      opponentForce: {
        forceId: 'o',
        forceName: 'O',
        totalBV: 2000,
        unitCount: 1,
      },
    });
    // Resolver that never finds pilots
    const noPilots: IEncounterResolvers = {
      getForceById: resolvers.getForceById,
      getPilotById: () => null,
    };
    const result = buildGameUnitsFromEncounter(encounter, noPilots);
    expect(result.units[0].gunnery).toBe(4);
    expect(result.units[0].piloting).toBe(5);
  });
});
