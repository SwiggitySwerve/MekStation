import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { hasNoArms } from '@/utils/gameplay/quirkModifiers';

import type { IPhysicalAttackInput, IPhysicalAttackRestriction } from './types';

import { canBreakGrapple } from './breakGrappleEligibility';
import { canBrushOff } from './brushOffEligibility';
import { canGrapple } from './grappleEligibility';
import { canJumpJetAttack } from './jumpJetAttackEligibility';
import {
  attackerHasWorkingThrashArmOrLeg,
  attackerLocationDestroyed,
  grappleSelectsLeft,
  grappleSelectsRight,
  grapplingEnabled,
  jumpJetAttackEnabled,
  mapBreakGrappleInvalidReason,
  mapBrushOffInvalidReason,
  mapGrappleInvalidReason,
  mapJumpJetAttackInvalidReason,
  mapThrashInvalidReason,
  mapTripInvalidReason,
  selectedArmCarryingCargo,
  selectedBrushOffArm,
  selectedBrushOffArmMissing,
  selectedGrappleSide,
  selectedJumpJetAttackLeg,
  tripAttackEnabled,
  tripLimbUsable,
  tripTargetIsMek,
} from './restrictionActionValidationHelpers';
import {
  battleMekOrProtoMekTarget,
  explicitNonMekUnitType,
  legacyOrMekUnitType,
  protoMekUnitType,
  sharedPhysicalTargetRestriction,
  standardInfantryUnitType,
} from './restrictionValidationShared';
import { canThrash } from './thrashEligibility';
import { canTrip } from './tripEligibility';

export function canBrushOffPhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  if (selectedArmCarryingCargo(input)) {
    return {
      allowed: false,
      reason: 'Arm is carrying cargo',
      reasonCode: 'AttackerCargoInteraction',
    };
  }

  const brushOffRestriction = canBrushOff({
    attackerIsMek: !explicitNonMekUnitType(input.attackerUnitType),
    selectedArm: selectedBrushOffArm(input),
    targetIsSwarmingInfantryOnAttacker:
      input.targetIsSwarmingInfantryOnAttacker,
    targetIsINarcPod: input.targetIsINarcPod,
    attackerIsQuad: input.attackerIsQuad,
    armsFlipped: input.attackerArmsFlipped,
    selectedArmMissing: selectedBrushOffArmMissing(input),
    noMinimalArmsQuirk: hasNoArms(input.unitQuirks ?? []),
    shoulderWorking: !input.componentDamage.actuators[ActuatorType.SHOULDER],
    armWeaponFiredThisTurn: (input.weaponsFiredFromArm?.length ?? 0) > 0,
    targetMakingDfa: input.targetIsMakingDFA,
    attackerProne: input.attackerProne,
    targetIsBuildingFuelTankOrHex:
      input.targetObjectType !== undefined &&
      input.targetObjectType !== 'entity',
  });

  if (brushOffRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: brushOffRestriction.reason,
    reasonCode: mapBrushOffInvalidReason(brushOffRestriction.reasonCode),
  };
}

export function canGrapplePhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const grappleSide = selectedGrappleSide(input);
  const counterGrapple =
    input.attackerGrappledTargetId === input.targetId &&
    input.attackerIsGrappleAttacker === false;
  const attackerIsProtoMek = protoMekUnitType(input.attackerUnitType);
  const attackerIsBipedMek =
    !attackerIsProtoMek &&
    legacyOrMekUnitType(input.attackerUnitType) &&
    input.attackerIsQuad !== true;
  const targetIsProtoMek = protoMekUnitType(input.targetUnitType);
  const targetIsMek = !targetIsProtoMek && battleMekOrProtoMekTarget(input);

  const grappleRestriction = canGrapple({
    tacOpsGrapplingEnabled: grapplingEnabled(input),
    attackerIsAirborneVTOLorWIGE: input.attackerIsAirborne,
    commonImpossibleReasonCode:
      input.commonPhysicalImpossibleReasonCode ??
      (input.attackerGrappledTargetId !== undefined
        ? 'LockedInGrapple'
        : undefined),
    friendlyFireEnabled: false,
    targetIsFriendly: input.targetIsFriendly,
    attackerIsBipedMek,
    attackerIsProtoMek,
    targetIsMek,
    targetIsProtoMek,
    noMinimalArmsQuirk: hasNoArms(input.unitQuirks ?? []),
    grappleSide,
    leftArmPresent:
      !grappleSelectsLeft(grappleSide) ||
      !attackerLocationDestroyed(input, 'left_arm'),
    rightArmPresent:
      !grappleSelectsRight(grappleSide) ||
      !attackerLocationDestroyed(input, 'right_arm'),
    leftShoulderWorking:
      !grappleSelectsLeft(grappleSide) ||
      !input.componentDamage.actuators[ActuatorType.SHOULDER],
    rightShoulderWorking:
      !grappleSelectsRight(grappleSide) ||
      !input.componentDamage.actuators[ActuatorType.SHOULDER],
    counterGrapple,
    targetDistance: input.targetDistance,
    elevationDifference: input.elevationDifference,
    maxElevationChange: 1,
    targetInFrontArc: input.targetInFrontArc,
    attackerProne: input.attackerProne,
    targetProne: input.targetProne,
    weaponFiredThisTurn: (input.weaponsFiredFromArm?.length ?? 0) > 0,
    attackerGrappledTargetMatches:
      input.attackerGrappledTargetId === undefined
        ? undefined
        : input.attackerGrappledTargetId === input.targetId,
    targetIsGrappleAttacker: input.targetIsGrappleAttacker,
  });

  if (grappleRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: grappleRestriction.reason,
    reasonCode: mapGrappleInvalidReason(grappleRestriction.reasonCode),
  };
}

export function canBreakGrapplePhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction({
    ...input,
    targetDistance: undefined,
  });
  if (!sharedRestriction.allowed) return sharedRestriction;

  const attackerIsProtoMek = protoMekUnitType(input.attackerUnitType);
  const attackerIsMek =
    !attackerIsProtoMek && legacyOrMekUnitType(input.attackerUnitType);
  const breakGrappleRestriction = canBreakGrapple({
    tacOpsGrapplingEnabled: grapplingEnabled(input),
    attackerIsAirborneVTOLorWIGE: input.attackerIsAirborne,
    commonImpossibleReasonCode:
      input.commonPhysicalImpossibleReasonCode ??
      (input.attackerGrappledTargetId !== undefined
        ? 'LockedInGrapple'
        : undefined),
    attackerChainWhipGrappled: input.attackerChainWhipGrappled,
    attackerIsMek,
    attackerIsProtoMek,
    grappledTargetMatches: input.attackerGrappledTargetId === input.targetId,
  });

  if (breakGrappleRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: breakGrappleRestriction.reason,
    reasonCode: mapBreakGrappleInvalidReason(
      breakGrappleRestriction.reasonCode,
    ),
  };
}

export function canTripPhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const tripRestriction = canTrip({
    tacOpsTripAttackEnabled: tripAttackEnabled(input),
    attackerIsMek: !explicitNonMekUnitType(input.attackerUnitType),
    targetIsMek: tripTargetIsMek(input),
    attackerAlreadyGrappled: input.attackerAlreadyGrappled,
    targetIsFriendly: input.targetIsFriendly,
    attackerIsAirborneVTOLorWIGE: input.attackerIsAirborne,
    targetDistance: input.targetDistance,
    targetInFrontArc: input.targetInFrontArc,
    attackerProne: input.attackerProne,
    targetProne: input.targetProne,
    sameElevation:
      input.elevationDifference === undefined
        ? undefined
        : input.elevationDifference === 0,
    leftLegPresent: !attackerLocationDestroyed(input, 'left_leg'),
    rightLegPresent: !attackerLocationDestroyed(input, 'right_leg'),
    leftTripLimbUsable: tripLimbUsable(input, 'left'),
    rightTripLimbUsable: tripLimbUsable(input, 'right'),
  });

  if (tripRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: tripRestriction.reason,
    reasonCode: mapTripInvalidReason(tripRestriction.reasonCode),
  };
}

export function canThrashPhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const thrashRestriction = canThrash({
    targetIsFriendly: input.targetIsFriendly,
    attackerIsMek: !explicitNonMekUnitType(input.attackerUnitType),
    attackerProne: input.attackerProne,
    targetIsInfantry: standardInfantryUnitType(input.targetUnitType),
    targetIsSwarming: input.targetIsSwarming,
    targetDistance: input.targetDistance,
    sameElevation:
      input.elevationDifference === undefined
        ? undefined
        : input.elevationDifference === 0,
    blockingTerrains: input.thrashBlockingTerrains,
    targetIsBuildingFuelTankOrHex:
      input.targetObjectType !== undefined &&
      input.targetObjectType !== 'entity',
    weaponFiredThisTurn: (input.weaponsFiredFromArm?.length ?? 0) > 0,
    hasWorkingArmOrLeg: attackerHasWorkingThrashArmOrLeg(input),
  });

  if (thrashRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: thrashRestriction.reason,
    reasonCode: mapThrashInvalidReason(thrashRestriction.reasonCode),
  };
}

export function canJumpJetAttackPhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const selectedLeg = selectedJumpJetAttackLeg(input);
  const jumpJetRestriction = canJumpJetAttack({
    tacOpsJumpJetAttackEnabled: jumpJetAttackEnabled(input),
    attackerIsLandAirMek: input.attackerIsLandAirMek,
    attackerIsMekMode: input.attackerIsMekMode,
    selectedLeg,
    attackerIsMek: !explicitNonMekUnitType(input.attackerUnitType),
    attackerProne: input.attackerProne,
    leftLegPresent: !attackerLocationDestroyed(input, 'left_leg'),
    rightLegPresent: !attackerLocationDestroyed(input, 'right_leg'),
    leftReadyJumpJetCount: input.leftReadyJumpJetCount,
    rightReadyJumpJetCount: input.rightReadyJumpJetCount,
    attackerMovedJump: input.attackerJumpedThisTurn,
    leftLegWeaponFiredThisTurn: input.leftLegWeaponFiredThisTurn,
    rightLegWeaponFiredThisTurn: input.rightLegWeaponFiredThisTurn,
    targetDistance: input.targetDistance,
    standingAttackerHeightAboveTargetHeight:
      input.standingAttackerHeightAboveTargetHeight,
    proneTargetElevationInRange: input.proneTargetElevationInRange,
    targetDirectlyAheadOfFeet: input.targetDirectlyAheadOfFeet,
    targetDirectlyBehindFeet: input.targetDirectlyBehindFeet,
  });

  if (jumpJetRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: jumpJetRestriction.reason,
    reasonCode: mapJumpJetAttackInvalidReason(jumpJetRestriction.reasonCode),
  };
}
