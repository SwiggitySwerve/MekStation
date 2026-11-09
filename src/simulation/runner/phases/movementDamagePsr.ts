import {
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IPendingPSR,
  MovementType,
} from '@/types/gameplay';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecks';
import { planRunningWithDamagePSR } from '@/utils/gameplay/movement/runningDamagePsr';

import { queuePendingPSR } from './physicalAttackPsr';

type MovementDamageStep = {
  readonly kind: string;
  readonly index: number;
};

export function queueMovementDamagePSRs(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  movementType: MovementType;
  steps: readonly MovementDamageStep[];
}): IGameState {
  const { events, gameId, movementType, steps, unitId } = options;
  let currentState = options.currentState;
  const psrs = movementDamagePSRsForUnit(
    currentState,
    unitId,
    movementType,
    steps,
  );

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

function movementDamagePSRsForUnit(
  state: IGameState,
  unitId: string,
  movementType: MovementType,
  steps: readonly MovementDamageStep[],
): readonly IPendingPSR[] {
  const psr = planRunningWithDamagePSR({
    unitId,
    unit: state.units[unitId],
    movementType,
    steps,
  });
  return psr ? [psr] : [];
}
