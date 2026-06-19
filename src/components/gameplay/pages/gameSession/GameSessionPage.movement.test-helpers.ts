import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

import type { InteractiveSession } from '@/engine/GameEngine';
import type {
  IGameSession,
  IMovementCapability,
  IMovementRangeHex,
} from '@/types/gameplay';

import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  MovementType,
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';

import { useGameMovementPlanning } from './GameSessionPage.movement';
import {
  appendHoveredMovementProjection,
  buildMovementModeSeedPlan,
  buildMovementModeSeedPlanFromCommandPayload,
  buildMovementPlan,
  buildMovementLegendState,
  canProjectMovementForSelectedUnit,
  getEffectiveMovementMps,
  getPlannedMovementForSelectedUnit,
  mergeJumpMovementRangeHexes,
  mergeRunMovementRangeHexes,
  movementTypeFromCommandPayload,
  movementTypeFromLegendSelection,
  movementPathFromRangeHex,
} from './GameSessionPage.movementPlanning';

function buildMovementPlanningHookFixture(options?: {
  readonly jumpMP?: number;
  readonly capability?: Partial<IMovementCapability>;
  readonly selectedUnitState?: Partial<
    IGameSession['currentState']['units'][string]
  >;
}): {
  readonly session: IGameSession;
  readonly interactiveSession: InteractiveSession;
} {
  const selectedUnitState: IGameSession['currentState']['units'][string] = {
    id: 'unit-a',
    side: GameSide.Player,
    position: { q: -1, r: 1 },
    facing: Facing.Southeast,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Planning,
    ...options?.selectedUnitState,
  };
  const session: IGameSession = {
    id: 'movement-hook-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 3,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [
      {
        id: 'unit-a',
        name: 'Hook Test Unit',
        side: GameSide.Player,
        unitRef: 'unit-a-ref',
        pilotRef: 'pilot-a',
        gunnery: 4,
        piloting: 5,
      },
    ],
    events: [],
    currentState: {
      gameId: 'movement-hook-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'unit-a': selectedUnitState,
      },
      turnEvents: [],
    },
  };
  const grid = createHexGrid({ radius: 3 });
  const interactiveSession = {
    getMovementCapability: () => ({
      walkMP: 4,
      runMP: 6,
      jumpMP: options?.jumpMP ?? 3,
      movementMode: 'walk',
      movementHeatProfile: 'mek',
      ...options?.capability,
    }),
    getGrid: () => grid,
  } satisfies Pick<InteractiveSession, 'getMovementCapability' | 'getGrid'>;

  return {
    session,
    interactiveSession: interactiveSession as never as InteractiveSession,
  };
}

export {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  act,
  appendHoveredMovementProjection,
  beforeEach,
  buildMovementLegendState,
  buildMovementModeSeedPlan,
  buildMovementModeSeedPlanFromCommandPayload,
  buildMovementPlan,
  buildMovementPlanningHookFixture,
  canProjectMovementForSelectedUnit,
  createHexGrid,
  describe,
  expect,
  getEffectiveMovementMps,
  getPlannedMovementForSelectedUnit,
  it,
  mergeJumpMovementRangeHexes,
  mergeRunMovementRangeHexes,
  movementPathFromRangeHex,
  movementTypeFromCommandPayload,
  movementTypeFromLegendSelection,
  renderHook,
  useGameMovementPlanning,
  useGameplayStore,
};

export type {
  IGameSession,
  IMovementCapability,
  IMovementRangeHex,
  InteractiveSession,
};
