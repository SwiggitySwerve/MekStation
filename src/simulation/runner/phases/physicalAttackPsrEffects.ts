import { IGameState } from '@/types/gameplay';

import type {
  DfaMissFall,
  PhysicalAttackResolutionOptions,
  PhysicalDisplacement,
} from './physicalAttackResolutionTypes';

import { dominoEffectDisplacedUnitIds } from './physicalAttackHelpers';
import {
  attackerHitPSRForAttack,
  attackerMissPSRForAttack,
  dominoEffectPSRForDisplacement,
  queuePendingPSR,
  targetPSRForAttack,
} from './physicalAttackPsr';

export function queuePhysicalAttackPSRs(
  options: PhysicalAttackResolutionOptions & {
    readonly dfaMissFall?: DfaMissFall;
    readonly chargeHitDisplacementBlocked: boolean;
    readonly displacements: readonly PhysicalDisplacement[];
    readonly impossibleDisplacementDestroyedUnitId?: string;
  },
): IGameState {
  let currentState = queueTargetPhysicalAttackPSR(options);
  currentState = queueAttackerPhysicalHitPSR({
    ...options,
    state: currentState,
  });
  currentState = queueAttackerPhysicalMissPSR({
    ...options,
    state: currentState,
  });
  return queueDominoPhysicalAttackPSRs({
    ...options,
    state: currentState,
  });
}

function queueTargetPhysicalAttackPSR(
  options: PhysicalAttackResolutionOptions & {
    readonly chargeHitDisplacementBlocked: boolean;
    readonly impossibleDisplacementDestroyedUnitId?: string;
  },
): IGameState {
  if (
    !options.result.hit ||
    !options.result.targetPSR ||
    options.impossibleDisplacementDestroyedUnitId === options.target.id ||
    options.chargeHitDisplacementBlocked
  ) {
    return options.state;
  }
  const psr = targetPSRForAttack(options.attackType, options.target.id);
  return psr
    ? queuePendingPSR(options.state, options.target.id, psr)
    : options.state;
}

function queueAttackerPhysicalHitPSR(
  options: PhysicalAttackResolutionOptions & {
    readonly chargeHitDisplacementBlocked: boolean;
  },
): IGameState {
  if (
    !options.result.hit ||
    !options.result.attackerPSR ||
    options.chargeHitDisplacementBlocked
  ) {
    return options.state;
  }
  const psr = attackerHitPSRForAttack(
    options.attackType,
    options.unitId,
    options.result,
  );
  return psr
    ? queuePendingPSR(options.state, options.unitId, psr)
    : options.state;
}

function queueAttackerPhysicalMissPSR(
  options: PhysicalAttackResolutionOptions & {
    readonly dfaMissFall?: DfaMissFall;
    readonly impossibleDisplacementDestroyedUnitId?: string;
  },
): IGameState {
  if (
    options.result.hit ||
    !options.result.attackerPSR ||
    options.impossibleDisplacementDestroyedUnitId === options.unitId ||
    options.dfaMissFall !== undefined
  ) {
    return options.state;
  }
  return queuePendingPSR(
    options.state,
    options.unitId,
    attackerMissPSRForAttack(
      options.attackType,
      options.unitId,
      options.result,
    ),
  );
}

function queueDominoPhysicalAttackPSRs(
  options: PhysicalAttackResolutionOptions & {
    readonly displacements: readonly PhysicalDisplacement[];
  },
): IGameState {
  let currentState = options.state;
  for (const dominoUnitId of dominoEffectDisplacedUnitIds(
    options.displacements,
  )) {
    currentState = queuePendingPSR(
      currentState,
      dominoUnitId,
      dominoEffectPSRForDisplacement(dominoUnitId),
    );
  }
  return currentState;
}
