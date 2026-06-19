import { hasNoArms } from '@/utils/gameplay/quirkModifiers';

import type { IPhysicalAttackInput, IPhysicalAttackRestriction } from './types';

import { physicalElevationRestriction } from './elevation';
import {
  bothArmsCarryingCargo,
  chargeAttackerCapabilityRestriction,
  chargeAttackerMovementRestriction,
  chargeTargetClassRestriction,
  chargeTargetStateRestriction,
  selectedArmCarryingCargo,
} from './restrictionActionValidationHelpers';
import {
  DEFAULT_STANDING_MEK_HEIGHT,
  PUSH_BLOCKED_TARGET_OBJECT_TYPES,
  blocked,
  chargeDfaDisplacementStateRestriction,
  chargeDfaTargetObjectRestriction,
  dropshipUnitType,
  explicitNonMekUnitType,
  infantryUnitType,
  sharedPhysicalTargetRestriction,
} from './restrictionValidationShared';

export function canDFA(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const targetObjectRestriction = chargeDfaTargetObjectRestriction(input);
  if (!targetObjectRestriction.allowed) return targetObjectRestriction;

  if (input.attackerStuck) {
    return blocked('Cannot DFA while stuck', 'AttackerStuck');
  }

  if (input.attackerUsedMechanicalJumpBooster) {
    return {
      allowed: false,
      reason: 'DFA cannot use mechanical jump boosters',
      reasonCode: 'MechanicalJumpBooster',
    };
  }

  if (input.attackerJumpedThisTurn === false) {
    return {
      allowed: false,
      reason: 'DFA requires a jump this turn',
      reasonCode: 'NoJumpThisTurn',
    };
  }
  if (infantryUnitType(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: 'Infantry cannot DFA',
      reasonCode: 'AttackerInfantry',
    };
  }
  if (input.attackerProne) {
    return {
      allowed: false,
      reason: 'Cannot DFA while prone',
      reasonCode: 'AttackerProne',
    };
  }
  if (input.targetIsAirborneVTOLorWIGE) {
    const attackerJumpMP = input.attackerJumpMP ?? 0;
    const targetAboveAttackerTop =
      (input.elevationDifference ?? 0) -
      (input.attackerHeight ?? DEFAULT_STANDING_MEK_HEIGHT);

    if (targetAboveAttackerTop > attackerJumpMP) {
      return blocked(
        'DFA target elevation is beyond attacker jump MP',
        'ElevationMismatch',
      );
    }
  }
  if (dropshipUnitType(input.targetUnitType)) {
    return blocked('Cannot DFA a DropShip target', 'TargetDropShip');
  }
  if (input.targetMovementComplete === false && input.targetImmobile !== true) {
    return blocked(
      'DFA target must be done with movement',
      'TargetMovementIncomplete',
    );
  }
  const displacementRestriction = chargeDfaDisplacementStateRestriction(input);
  if (!displacementRestriction.allowed) return displacementRestriction;

  return { allowed: true };
}

/**
 * Per `implement-physical-attack-phase` task 3.7: charge requires the
 * attacker to have run this turn.
 */
export function canCharge(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const attackerRestriction = chargeAttackerCapabilityRestriction(input);
  if (attackerRestriction) return attackerRestriction;

  const targetObjectRestriction = chargeDfaTargetObjectRestriction(input);
  if (!targetObjectRestriction.allowed) return targetObjectRestriction;

  const restriction =
    chargeAttackerMovementRestriction(input) ??
    chargeTargetClassRestriction(input) ??
    chargeTargetStateRestriction(input);

  if (restriction) return restriction;

  return { allowed: true };
}

/**
 * Per `implement-physical-attack-phase` task 8.5: a push cannot be
 * declared when the target's displacement hex is blocked or off-map.
 */
function pushAttackerCapabilityRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (explicitNonMekUnitType(input.attackerUnitType)) {
    return blocked('Non-Meks cannot push', 'AttackerNotMek');
  }

  if (input.attackerIsQuad) {
    return blocked('Quad BattleMechs cannot push', 'AttackerQuad');
  }

  if (input.attackerIsAirborne) {
    return blocked('Cannot push while airborne', 'AttackerAirborne');
  }

  if (input.attackerArmsFlipped) {
    return blocked('Cannot push with arms flipped to the rear', 'ArmsFlipped');
  }

  const destroyedLocations = input.attackerDestroyedLocations ?? [];
  if (
    destroyedLocations.includes('left_arm') ||
    destroyedLocations.includes('right_arm')
  ) {
    return blocked('Both arms must be present to push', 'LimbMissing');
  }

  if (hasNoArms(input.unitQuirks ?? [])) {
    return blocked('No Arms quirk prevents push attacks', 'NoArmsQuirk');
  }

  return undefined;
}

function pushTargetRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (
    input.targetObjectType &&
    PUSH_BLOCKED_TARGET_OBJECT_TYPES.has(input.targetObjectType)
  ) {
    return blocked(
      'Push cannot target buildings or fuel tanks',
      'TargetBuilding',
    );
  }

  if (
    explicitNonMekUnitType(input.targetUnitType) ||
    input.targetObjectType === 'gunEmplacement'
  ) {
    return blocked('Push target must be a Mek', 'TargetNotMek');
  }

  return undefined;
}

function pushElevationAndBuildingRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  const elevationRestriction = physicalElevationRestriction(
    'push',
    input.elevationContext,
  );
  if (elevationRestriction) {
    return blocked(elevationRestriction, 'TargetElevationNotInRange');
  }

  if (
    input.elevationDifference !== undefined &&
    input.elevationDifference !== 0
  ) {
    return blocked(
      'Push requires the target to be at the same elevation',
      'ElevationMismatch',
    );
  }

  const terrainContext = input.terrainContext;
  const differentKnownBuilding =
    terrainContext?.attackerBuildingId !== undefined &&
    terrainContext.targetBuildingId !== undefined &&
    terrainContext.attackerBuildingId !== terrainContext.targetBuildingId;
  if (
    terrainContext?.targetInBuilding === true &&
    (terrainContext.attackerInBuilding !== true || differentKnownBuilding)
  ) {
    return blocked('Target is inside building', 'TargetInsideBuilding');
  }

  return undefined;
}

function pushDisplacementRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (input.targetIsMakingDisplacementAttack && !input.targetIsPushing) {
    return blocked(
      'Target is making a charge/DFA attack',
      'TargetMakingDisplacementAttack',
    );
  }

  if (
    input.targetIsPushing &&
    input.targetDisplacementAttackTargetId !== input.attackerId
  ) {
    return blocked('Target is pushing another Mek', 'TargetPushingAnotherMek');
  }

  if (
    input.attackerTargetedByDisplacementAttackerId !== undefined &&
    input.attackerTargetedByDisplacementAttackerId !== input.targetId
  ) {
    return blocked(
      'Attacker is the target of another push/charge/DFA',
      'AttackerTargetOfDisplacementAttack',
    );
  }

  if (
    input.targetedByDisplacementAttackerId !== undefined &&
    input.targetedByDisplacementAttackerId !== input.attackerId
  ) {
    return blocked(
      'Target is the target of another push/charge/DFA',
      'TargetOfDisplacementAttack',
    );
  }

  return undefined;
}

function pushPostureAndActionRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (input.attackerProne) {
    return blocked('Cannot push while prone', 'AttackerProne');
  }

  if (input.targetProne) {
    return blocked('Cannot push prone targets', 'TargetProne');
  }

  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return blocked('Arm fired weapons this turn', 'WeaponFiredThisTurn');
  }

  if (bothArmsCarryingCargo(input)) {
    return blocked('Both arms are carrying cargo', 'AttackerCargoInteraction');
  }

  if (input.pushDestinationValid === false) {
    return blocked('Push destination blocked', 'DestinationBlocked');
  }
  if (input.pushTargetDirectlyAhead === false) {
    return blocked(
      'Push target must be directly ahead of attacker facing',
      'TargetNotDirectlyAhead',
    );
  }

  return undefined;
}

export function canPush(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const restriction =
    pushAttackerCapabilityRestriction(input) ??
    pushTargetRestriction(input) ??
    pushElevationAndBuildingRestriction(input) ??
    pushDisplacementRestriction(input) ??
    pushPostureAndActionRestriction(input);

  if (restriction) return restriction;

  return { allowed: true };
}
