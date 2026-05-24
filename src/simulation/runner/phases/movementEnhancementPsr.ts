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
}): IGameState {
  const {
    activeMASC,
    activeSupercharger,
    events,
    gameId,
    movementType,
    unitId,
  } = options;

  if (movementType !== MovementType.Run) {
    return options.currentState;
  }

  const psrs: IPendingPSR[] = [];
  if (activeMASC === true) {
    psrs.push(createMASCFailurePSR(unitId));
  }
  if (activeSupercharger === true) {
    psrs.push(createSuperchargerFailurePSR(unitId));
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
      ),
    );
  }

  return currentState;
}
