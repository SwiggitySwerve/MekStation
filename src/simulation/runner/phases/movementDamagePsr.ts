import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IPendingPSR,
  MovementType,
} from '@/types/gameplay';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecks';
import {
  createRunningDamagedGyroPSR,
  createRunningDamagedHipPSR,
} from '@/utils/gameplay/pilotingSkillRolls';

import { queuePendingPSR } from './physicalAttackPsr';

type MovementDamageStep = {
  readonly kind: string;
  readonly index: number;
};

function isRunBasedMovement(movementType: MovementType): boolean {
  return (
    movementType === MovementType.Run ||
    movementType === MovementType.Evade ||
    movementType === MovementType.Sprint
  );
}

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
  if (!isRunBasedMovement(movementType)) return [];

  const unit = state.units[unitId];
  const componentDamage = unit?.componentDamage;
  const psrs: IPendingPSR[] = [];
  const forwardSteps = steps.filter((step) => step.kind === 'forward');
  const firstMovementStep = steps.find(
    (step) => step.kind === 'forward' || step.kind === 'turn',
  );

  if (componentDamage?.actuators?.[ActuatorType.HIP]) {
    for (const step of forwardSteps) {
      psrs.push(createRunningDamagedHipPSR(unitId, step.index));
    }
  }

  if ((componentDamage?.gyroHits ?? 0) > 0 && firstMovementStep) {
    psrs.push(createRunningDamagedGyroPSR(unitId, firstMovementStep.index));
  }

  return psrs;
}
