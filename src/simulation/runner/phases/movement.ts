import {
  Facing,
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  IHexGrid,
} from '@/types/gameplay';

import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { applyMovementEvent } from '../SimulationRunnerState';
import {
  createMovementCapability,
  toAIUnitState,
} from '../SimulationRunnerSupport';
import { createGameEvent } from './utils';

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
  } = options;
  let currentState = { ...state, phase: GamePhase.Movement };
  violations.push(...invariantRunner.runAll(currentState));

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const aiUnit = toAIUnitState(unit, weaponsByUnit?.get(unitId));
    const capability = createMovementCapability();
    const moveEvent = botPlayer.playMovementPhase(aiUnit, grid, capability);

    if (moveEvent) {
      currentState = applyMovementEvent(
        currentState,
        unitId,
        moveEvent.payload,
      );

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.MovementDeclared,
          currentState.turn,
          GamePhase.Movement,
          {
            unitId,
            from: unit.position,
            to: moveEvent.payload.to,
            facing: moveEvent.payload.facing as Facing,
            movementType: moveEvent.payload.movementType,
            mpUsed: moveEvent.payload.mpUsed,
            heatGenerated: 0,
          },
          unitId,
        ),
      );
    }
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}
