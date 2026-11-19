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
import { projectPsrTriggerTarget } from '@/utils/gameplay/pilotingSkillRolls/eventTargets';

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
  optionalRules?: readonly string[];
}): IGameState {
  const {
    activeMASC,
    activeSupercharger,
    events,
    gameId,
    mascTurnsUsed,
    movementType,
    optionalRules,
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
    psrs.push(createMASCFailurePSR(unitId, mascTurnsUsed, optionalRules));
  }
  if (activeSupercharger === true) {
    psrs.push(
      createSuperchargerFailurePSR(
        unitId,
        superchargerTurnsUsed,
        optionalRules,
      ),
    );
  }

  let currentState = options.currentState;
  for (const psr of psrs) {
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
