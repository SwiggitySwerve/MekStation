import {
  GamePhase,
  type IEnvironmentalConditions,
  type IGameEvent,
  type IGameState,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay';

import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';
import type { SeededRandom } from '../../core/SeededRandom';
import type { InvariantRunner } from '../../invariants/InvariantRunner';
import type { IViolation } from '../../invariants/types';

import { runMovementUnitTurn } from './movementUnitTurn';
import { createD6Roller } from './utils';

export function runMovementPhase(options: {
  state: IGameState;
  botPlayer: IAIPlayer;
  grid: IHexGrid;
  invariantRunner: InvariantRunner;
  violations: IViolation[];
  events: IGameEvent[];
  gameId: string;
  /**
   * Per `add-combat-fidelity-suite` Phase 1: per-unit hydrated weapon list,
   * keyed by runner unit id. When the lookup misses, `toAIUnitState` falls
   * back to the synthetic single-medium-laser path. Optional so existing
   * non-swarm callers keep their current behavior.
   */
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
  movementCapabilitiesByUnit?: ReadonlyMap<string, IMovementCapability>;
  environmentalConditions?: IEnvironmentalConditions;
  optionalRules?: readonly string[];
  random?: SeededRandom;
}): IGameState {
  const {
    botPlayer,
    events,
    gameId,
    grid,
    invariantRunner,
    state,
    violations,
    weaponsByUnit,
    movementCapabilitiesByUnit,
    environmentalConditions,
    optionalRules,
    random,
  } = options;
  let currentState = { ...state, phase: GamePhase.Movement };
  const d6Roller = random ? createD6Roller(random) : () => 6;
  violations.push(...invariantRunner.runAll(currentState));

  for (const unitId of Object.keys(currentState.units)) {
    currentState = runMovementUnitTurn({
      currentState,
      unitId,
      botPlayer,
      grid,
      events,
      gameId,
      weaponsByUnit,
      movementCapabilitiesByUnit,
      environmentalConditions,
      optionalRules,
      d6Roller,
    });
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}
