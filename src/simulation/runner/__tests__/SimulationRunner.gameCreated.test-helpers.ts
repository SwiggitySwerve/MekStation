/**
 * SimulationRunner — GameCreated seed-event tests
 *
 * Per `emit-game-created-from-runner` (`simulation-system` delta — "Runner
 * Emits GameCreated as Seed Event"). Covers all 3 spec scenarios plus
 * the runner-vs-hydration path distinctions surfaced during the OMO
 * Council audit on PR A1's replay viewer.
 */

import type { IGameCreatedPayload } from '@/types/gameplay';

import { StandStillAIPlayer } from '@/simulation/ai/StandStillAIPlayer';
import { GameEventType, GamePhase, GameSide } from '@/types/gameplay';

import type { IHydratedUnitData } from '../UnitHydration';

import { ISimulationConfig } from '../../core/types';
import { SimulationRunner } from '../SimulationRunner';
import {
  createInitialState,
  synthesizeGameUnits,
} from '../SimulationRunnerState';

export function makeConfig(
  overrides: Partial<ISimulationConfig> = {},
): ISimulationConfig {
  return {
    seed: 42,
    turnLimit: 5,
    unitCount: { player: 2, opponent: 2 },
    mapRadius: 9,
    ...overrides,
  };
}

export function hydratedC3Unit(
  id: string,
  chassis: string,
  equipment: IHydratedUnitData['fullUnit']['equipment'],
  abilities?: readonly string[],
): IHydratedUnitData {
  return {
    runnerUnitId: id,
    side: id.startsWith('opponent') ? GameSide.Opponent : GameSide.Player,
    position: { q: 0, r: 0 },
    fullUnit: {
      id: `${id}-catalog-unit`,
      chassis,
      variant: 'C3',
      model: 'C3',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3050',
      unitType: 'BattleMech',
      equipment,
      ...(abilities !== undefined ? { abilities } : {}),
    },
    aiWeapons: [],
    gunnery: 3,
    piloting: 4,
  };
}

export {
  StandStillAIPlayer,
  GameEventType,
  GamePhase,
  GameSide,
  SimulationRunner,
  createInitialState,
  synthesizeGameUnits,
};

export type { IGameCreatedPayload, IHydratedUnitData, ISimulationConfig };
