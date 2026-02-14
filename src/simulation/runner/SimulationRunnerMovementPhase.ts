import {
  Facing,
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  IHexGrid,
} from '@/types/gameplay';

import { BotPlayer } from '../ai/BotPlayer';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { IViolation } from '../invariants/types';
import { createGameEvent } from './SimulationRunnerPhaseUtils';
import { applyMovementEvent } from './SimulationRunnerState';
import {
  createMovementCapability,
  toAIUnitState,
} from './SimulationRunnerSupport';

export function runMovementPhase(options: {
  state: IGameState;
  botPlayer: BotPlayer;
  grid: IHexGrid;
  invariantRunner: InvariantRunner;
  violations: IViolation[];
  events: IGameEvent[];
  gameId: string;
}): IGameState {
  const {
    botPlayer,
    events,
    gameId,
    grid,
    invariantRunner,
    state,
    violations,
  } = options;
  let currentState = { ...state, phase: GamePhase.Movement };
  violations.push(...invariantRunner.runAll(currentState));

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const aiUnit = toAIUnitState(unit);
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
