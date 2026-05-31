import {
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IPendingPSR,
  MovementType,
} from '@/types/gameplay';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecks';
import {
  createMASCFailurePSR,
  createSuperchargerFailurePSR,
} from '@/utils/gameplay/pilotingSkillRolls';

import { queuePendingPSR } from './physicalAttackPsr';

export function queueMovementEnhancementPSRs(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  movementType: MovementType;
  activeMASC: boolean | undefined;
  activeSupercharger: boolean | undefined;
  mascTurnsUsed: number | undefined;
  superchargerTurnsUsed: number | undefined;
}): IGameState {
  const {
    activeMASC,
    activeSupercharger,
    events,
    gameId,
    mascTurnsUsed,
    movementType,
    superchargerTurnsUsed,
    unitId,
  } = options;

  if (
    movementType !== MovementType.Run &&
    movementType !== MovementType.Sprint
  ) {
    return options.currentState;
  }

  const psrs: IPendingPSR[] = [];
  if (activeMASC === true) {
    psrs.push(createMASCFailurePSR(unitId, mascTurnsUsed));
  }
  if (activeSupercharger === true) {
    psrs.push(createSuperchargerFailurePSR(unitId, superchargerTurnsUsed));
  }

  let currentState = options.currentState;
  for (const psr of psrs) {
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
