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
import { projectPsrTriggerTarget } from '@/utils/gameplay/pilotingSkillRolls/eventTargets';

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
      createPSRTriggeredEvent({
        gameId,
        sequence: events.length,
        turn: currentState.turn,
        phase: GamePhase.Movement,
        unitId,
        reason: psr.reason,
        additionalModifier: psr.additionalModifier,
        triggerSource: psr.triggerSource,
        basePilotingSkill: currentState.units[unitId]?.piloting,
        reasonCode: psr.reasonCode,
        ...projectPsrTriggerTarget(psr),
      }),
    );
  }

  return currentState;
}
