import {
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IHexGrid,
  MovementType,
  type MovementMotiveMode,
} from '@/types/gameplay';
import {
  createPSRTriggeredEvent,
  createUnitStuckEvent,
} from '@/utils/gameplay/gameEvents/statusChecks';
import {
  planMovementTerrainEffects,
  type TerrainBearingMovementStep,
} from '@/utils/gameplay/movement/terrainPsrTriggers';

import { queuePendingPSR } from './physicalAttackPsr';

/**
 * Apply the shared movement terrain effects (`planMovementTerrainEffects`) to
 * runner state: queue each PSR for the PSR phase, and mark a BattleMech that
 * jumped into bog-down terrain stuck immediately.
 */
export function queueMovementTerrainPSRs(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  grid: IHexGrid;
  unitId: string;
  movementType: MovementType;
  movementMode?: MovementMotiveMode;
  steps: readonly TerrainBearingMovementStep[];
}): IGameState {
  const { events, gameId, grid, movementMode, movementType, steps, unitId } =
    options;
  let currentState = options.currentState;
  const effects = planMovementTerrainEffects({
    grid,
    unitId,
    unit: currentState.units[unitId],
    movementType,
    movementMode,
    steps,
  });

  for (const effect of effects) {
    if (effect.kind === 'stuck') {
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...currentState.units[unitId],
            isStuck: true,
          },
        },
      };
      events.push(
        createUnitStuckEvent(
          gameId,
          events.length,
          currentState.turn,
          GamePhase.Movement,
          unitId,
          effect.reason,
          effect.reasonCode,
        ),
      );
      continue;
    }

    const { psr } = effect;
    currentState = queuePendingPSR(currentState, unitId, psr);
    events.push(
      createPSRTriggeredEvent(
        gameId,
        events.length,
        currentState.turn,
        GamePhase.Movement,
        unitId,
        psr.reason,
        psr.additionalModifier,
        psr.triggerSource,
        currentState.units[unitId]?.piloting,
        psr.reasonCode,
        psr.fixedTargetNumber,
      ),
    );
  }

  return currentState;
}
