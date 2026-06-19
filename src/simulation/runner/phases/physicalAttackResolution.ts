import { IGameState, IHexGrid } from '@/types/gameplay';

import type {
  PhysicalAttackResolutionOptions,
  PhysicalDisplacement,
} from './physicalAttackResolutionTypes';

import { applyPhysicalDamageEffects } from './physicalAttackDamageEffects';
import {
  applyDfaMissFallEffects,
  physicalDfaMissFall,
} from './physicalAttackDfaMiss';
import { applyPhysicalDisplacementsToGrid } from './physicalAttackDisplacement';
import {
  applyBreakGrappleEffects,
  applyPhysicalAttackDisplacementEffects,
  physicalAttackDisplacementOutcome,
} from './physicalAttackDisplacementEffects';
import {
  applyImpossibleDisplacementDestruction,
  emitPhysicalAttackDeclaredEvent,
  emitPhysicalAttackResolvedEvent,
} from './physicalAttackEvents';
import { queuePhysicalAttackPSRs } from './physicalAttackPsrEffects';

export function applyPhysicalAttackResolution(
  options: PhysicalAttackResolutionOptions,
): { readonly state: IGameState; readonly grid?: IHexGrid } {
  const displacementOutcome = physicalAttackDisplacementOutcome(options);
  const displacements = displacementOutcome.displacements;
  const impossibleDisplacementDestroyedUnitId =
    displacementOutcome.impossibleDisplacementDestroyedUnitId;
  const chargeHitDisplacementBlocked = physicalChargeHitDisplacementBlocked({
    ...options,
    displacements,
  });
  const dfaMissFall = physicalDfaMissFall({
    ...options,
    displacements,
    impossibleDisplacementDestroyedUnitId,
  });
  const brushOffSelectedINarcPod = physicalBrushOffSelectedINarcPod(options);

  emitPhysicalAttackDeclaredEvent({
    events: options.events,
    gameId: options.gameId,
    turn: options.state.turn,
    attackerId: options.unitId,
    targetId: options.target.id,
    attackType: options.attackType,
    limb: options.effectiveLimb,
    toHitNumber: options.result.toHitNumber,
    twoHandedZweihander: options.declaredTwoHandedZweihander,
    selectedINarcPod: brushOffSelectedINarcPod,
    blockerStepOutDecision: options.blockerStepOutDecision,
  });

  let currentState = applyPhysicalDamageEffects({
    ...options,
    brushOffSelectedINarcPod,
  });
  currentState = queuePhysicalAttackPSRs({
    ...options,
    state: currentState,
    chargeHitDisplacementBlocked,
    dfaMissFall,
    displacements,
    impossibleDisplacementDestroyedUnitId,
  });
  currentState = applyPhysicalAttackDisplacementEffects({
    ...options,
    state: currentState,
    displacements,
  });
  currentState = applyBreakGrappleEffects({
    ...options,
    state: currentState,
    displacements,
  });
  const nextGrid = applyPhysicalDisplacementsToGrid(
    options.grid,
    displacements,
  );
  currentState = applyDfaMissFallEffects({
    ...options,
    state: currentState,
    dfaMissFall,
  });
  currentState = applyImpossibleDisplacementDestruction({
    state: currentState,
    events: options.events,
    gameId: options.gameId,
    turn: currentState.turn,
    destroyedUnitId: impossibleDisplacementDestroyedUnitId,
    attackerId: options.unitId,
    targetId: options.target.id,
  });

  emitPhysicalAttackResolvedEvent({
    events: options.events,
    gameId: options.gameId,
    turn: currentState.turn,
    attackerId: options.unitId,
    targetId: options.target.id,
    attackType: options.attackType,
    result: options.result,
    displacements,
    selectedINarcPod: brushOffSelectedINarcPod,
  });

  return { state: currentState, grid: nextGrid };
}

function physicalChargeHitDisplacementBlocked(options: {
  readonly grid?: IHexGrid;
  readonly attackType: PhysicalAttackResolutionOptions['attackType'];
  readonly result: PhysicalAttackResolutionOptions['result'];
  readonly displacements: readonly PhysicalDisplacement[];
}): boolean {
  return (
    options.result.hit &&
    options.attackType === 'charge' &&
    Boolean(options.grid) &&
    options.displacements.length === 0
  );
}

function physicalBrushOffSelectedINarcPod(
  options: PhysicalAttackResolutionOptions,
): PhysicalAttackResolutionOptions['selectedINarcPod'] {
  if (options.attackType !== 'brush-off') return undefined;
  return options.selectedINarcPod ?? options.target.iNarcPods?.[0];
}
