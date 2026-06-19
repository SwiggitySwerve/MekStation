import type { IBuildPhysicalAttackInputOptions } from './gameSessionPhysicalInput';
import type { IPhysicalAttackInput } from './physicalAttacks';

import {
  isTargetDirectlyBehindFeet,
  targetHasINarcPods,
  targetIsSwarmingInfantryOnAttacker,
} from './gameSessionPhysicalSupport';
import { isTargetDirectlyAhead, isTargetInFrontArc } from './physicalAttacks';

export function buildTargetGeometryFields(
  options: IBuildPhysicalAttackInputOptions,
): Partial<IPhysicalAttackInput> {
  const { attackerId, attackerState, context, targetState } = options;
  return {
    targetInFrontArc: resolveTargetInFrontArc(options),
    standingAttackerHeightAboveTargetHeight:
      context.standingAttackerHeightAboveTargetHeight,
    proneTargetElevationInRange: context.proneTargetElevationInRange,
    targetDirectlyAheadOfFeet: resolveTargetDirectlyAheadOfFeet(options),
    targetDirectlyBehindFeet: resolveTargetDirectlyBehindFeet(options),
    targetIsSwarmingInfantryOnAttacker:
      context.targetIsSwarmingInfantryOnAttacker ??
      targetIsSwarmingInfantryOnAttacker(attackerId, targetState),
    targetIsINarcPod:
      context.targetIsINarcPod ?? targetHasINarcPods(targetState),
    armAesFunctional: context.armAesFunctional,
    torsoMountedCockpit: context.torsoMountedCockpit,
    headSensorHits: context.headSensorHits,
    centerTorsoSensorHits: context.centerTorsoSensorHits,
    defenderHasMagneticClaws: context.defenderHasMagneticClaws,
    pushDestinationValid: context.pushDestinationValid,
    pushTargetDirectlyAhead: targetState
      ? isTargetDirectlyAhead(
          attackerState.position,
          attackerState.facing,
          targetState.position,
        )
      : undefined,
  };
}

function resolveTargetInFrontArc(
  options: IBuildPhysicalAttackInputOptions,
): boolean | undefined {
  const { attackerState, context, targetState } = options;
  if (!targetState) return context.targetInFrontArc;
  return (
    context.targetInFrontArc ??
    isTargetInFrontArc(
      attackerState.position,
      attackerState.facing,
      targetState.position,
    )
  );
}

function resolveTargetDirectlyAheadOfFeet(
  options: IBuildPhysicalAttackInputOptions,
): boolean | undefined {
  const { attackerState, context, targetState } = options;
  if (!targetState) return context.targetDirectlyAheadOfFeet;
  return (
    context.targetDirectlyAheadOfFeet ??
    isTargetDirectlyAhead(
      attackerState.position,
      attackerState.facing,
      targetState.position,
    )
  );
}

function resolveTargetDirectlyBehindFeet(
  options: IBuildPhysicalAttackInputOptions,
): boolean | undefined {
  const { attackerState, context, targetState } = options;
  if (!targetState) return context.targetDirectlyBehindFeet;
  return (
    context.targetDirectlyBehindFeet ??
    isTargetDirectlyBehindFeet(attackerState, targetState)
  );
}
