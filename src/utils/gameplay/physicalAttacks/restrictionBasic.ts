import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { hasNoArms } from '@/utils/gameplay/quirkModifiers';

import type { IPhysicalAttackInput, IPhysicalAttackRestriction } from './types';

import { HULL_DOWN_KICK_BLOCKED_REASON } from '../hullDownRestrictions';
import { physicalElevationRestriction } from './elevation';
import {
  anyKickLegDestroyed,
  meleeWeaponArmRestriction,
  meleeWeaponExtendedRestriction,
  meleeWeaponFrameRestriction,
  meleeWeaponIsArmMounted,
  meleeWeaponNeedsHand,
  meleeWeaponPriorActionRestriction,
  selectedArmCarryingCargo,
  selectedPunchArmDestroyed,
  zweihanderDeclarationRestriction,
} from './restrictionActionValidationHelpers';
import {
  limbConflict,
  sharedPhysicalTargetRestriction,
} from './restrictionValidationShared';

export function canPunch(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const unitQuirks = input.unitQuirks ?? [];

  if (hasNoArms(unitQuirks)) {
    return {
      allowed: false,
      reason: 'No Arms quirk prevents punch attacks',
      reasonCode: 'NoArmsQuirk',
    };
  }

  const actuators = input.componentDamage.actuators;

  if (selectedPunchArmDestroyed(input)) {
    return {
      allowed: false,
      reason: 'Punching arm missing',
      reasonCode: 'LimbMissing',
    };
  }

  // Per task 3.1: shoulder destroyed disqualifies the arm entirely.
  if (actuators[ActuatorType.SHOULDER]) {
    return {
      allowed: false,
      reason: 'Shoulder actuator destroyed',
      reasonCode: 'ShoulderDestroyed',
    };
  }

  // Per task 3.1: the arm that fired a weapon this turn cannot punch.
  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
      reasonCode: 'WeaponFiredThisTurn',
    };
  }

  if (selectedArmCarryingCargo(input)) {
    return {
      allowed: false,
      reason: 'Arm is carrying cargo',
      reasonCode: 'AttackerCargoInteraction',
    };
  }

  const zweihanderRestriction = zweihanderDeclarationRestriction(input);
  if (!zweihanderRestriction.allowed) return zweihanderRestriction;

  // Per task 3.3: punch requires lower arm OR hand actuator present.
  // `undefined` means "caller didn't supply presence info" → fall back
  // to legacy behavior (allowed). Explicit `false` for both blocks the
  // attack.
  if (
    input.lowerArmActuatorPresent === false &&
    input.handActuatorPresent === false
  ) {
    return {
      allowed: false,
      reason: 'Lower-arm and hand actuators both missing',
      reasonCode: 'MissingActuator',
    };
  }

  // Per task 3.5: same limb already used this turn → reject.
  if (limbConflict(input.limb, input.limbsUsedThisTurn)) {
    return {
      allowed: false,
      reason: 'Limb already used this turn',
      reasonCode: 'SameLimbUsedThisTurn',
    };
  }

  const elevationRestriction = physicalElevationRestriction(
    'punch',
    input.elevationContext,
  );
  if (elevationRestriction) {
    return {
      allowed: false,
      reason: elevationRestriction,
      reasonCode: 'TargetElevationNotInRange',
    };
  }

  return { allowed: true };
}

export function canKick(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  if (input.attackerProne) {
    return {
      allowed: false,
      reason: 'Cannot kick while prone',
      reasonCode: 'AttackerProne',
    };
  }

  if (input.attackerHullDown) {
    return {
      allowed: false,
      reason: HULL_DOWN_KICK_BLOCKED_REASON,
      reasonCode: 'AttackerHullDown',
    };
  }

  const actuators = input.componentDamage.actuators;
  if (anyKickLegDestroyed(input)) {
    return {
      allowed: false,
      reason: 'Leg missing',
      reasonCode: 'LimbMissing',
    };
  }

  // Per task 3.2: hip crit disqualifies the leg entirely.
  if (actuators[ActuatorType.HIP]) {
    return {
      allowed: false,
      reason: 'Hip actuator destroyed',
      reasonCode: 'HipDestroyed',
    };
  }

  // Per task 3.4: kick requires upper leg + foot actuators present.
  if (input.upperLegActuatorPresent === false) {
    return {
      allowed: false,
      reason: 'Upper leg actuator missing',
      reasonCode: 'MissingActuator',
    };
  }
  if (input.footActuatorPresent === false) {
    return {
      allowed: false,
      reason: 'Foot actuator missing',
      reasonCode: 'MissingActuator',
    };
  }

  // Per task 3.5: same limb already used this turn → reject.
  if (limbConflict(input.limb, input.limbsUsedThisTurn)) {
    return {
      allowed: false,
      reason: 'Limb already used this turn',
      reasonCode: 'SameLimbUsedThisTurn',
    };
  }

  const elevationRestriction = physicalElevationRestriction(
    'kick',
    input.elevationContext,
  );
  if (elevationRestriction) {
    return {
      allowed: false,
      reason: elevationRestriction,
      reasonCode: 'TargetElevationNotInRange',
    };
  }

  return { allowed: true };
}

export function canMeleeWeapon(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const armMounted = meleeWeaponIsArmMounted(input.attackType);
  const needsHand = meleeWeaponNeedsHand(input.attackType);
  const zweihanderRestriction = zweihanderDeclarationRestriction(input);
  if (!zweihanderRestriction.allowed) return zweihanderRestriction;

  const restriction =
    meleeWeaponExtendedRestriction(input) ??
    meleeWeaponFrameRestriction(input, armMounted) ??
    meleeWeaponPriorActionRestriction(input, armMounted) ??
    meleeWeaponArmRestriction(input, armMounted, needsHand);

  if (restriction) return restriction;

  return { allowed: true };
}

/**
 * Per `implement-physical-attack-phase` task 3.6: DFA requires the
 * attacker to have jumped this turn.
 */
