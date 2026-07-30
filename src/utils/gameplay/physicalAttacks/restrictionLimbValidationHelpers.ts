import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

import { type GrappleAttackSide } from './grappleEligibility';
import { blocked } from './restrictionValidationShared';
import {
  type IPhysicalAttackInput,
  type IPhysicalAttackRestriction,
  isZweihanderPhysicalAttackType,
} from './types';

/** True when the attacker lists the location among destroyed locations. */
export function attackerLocationDestroyed(
  input: IPhysicalAttackInput,
  location: string,
): boolean {
  return input.attackerDestroyedLocations?.includes(location) ?? false;
}

/** Thrash needs at least one intact arm or leg unless the input overrides. */
export function attackerHasWorkingThrashArmOrLeg(
  input: IPhysicalAttackInput,
): boolean {
  if (input.hasWorkingThrashArmOrLeg !== undefined) {
    return input.hasWorkingThrashArmOrLeg;
  }

  return ['left_arm', 'right_arm', 'left_leg', 'right_leg'].some(
    (location) => !attackerLocationDestroyed(input, location),
  );
}

/** Resolves the selected punch/melee arm to a destroyed-location key. */
export function selectedArmLocation(
  input: IPhysicalAttackInput,
): 'left_arm' | 'right_arm' {
  if (input.limb === 'leftArm' || input.arm === 'left') return 'left_arm';
  return 'right_arm';
}

/** True when the selected punch arm location is destroyed. */
export function selectedPunchArmDestroyed(
  input: IPhysicalAttackInput,
): boolean {
  return attackerLocationDestroyed(input, selectedArmLocation(input));
}

/** Cargo carried on the arm selected for the attack. */
export function selectedArmCarryingCargo(input: IPhysicalAttackInput): boolean {
  if (input.limb === 'leftArm' || input.arm === 'left') {
    return input.leftArmCarryingCargo === true;
  }
  return input.rightArmCarryingCargo === true;
}

/** True when either arm is carrying cargo. */
export function eitherArmCarryingCargo(input: IPhysicalAttackInput): boolean {
  return (
    input.leftArmCarryingCargo === true || input.rightArmCarryingCargo === true
  );
}

/** True when both arms are carrying cargo. */
export function bothArmsCarryingCargo(input: IPhysicalAttackInput): boolean {
  return (
    input.leftArmCarryingCargo === true && input.rightArmCarryingCargo === true
  );
}

/** True when either arm location is destroyed. */
export function anyPunchArmDestroyed(input: IPhysicalAttackInput): boolean {
  return (
    attackerLocationDestroyed(input, 'left_arm') ||
    attackerLocationDestroyed(input, 'right_arm')
  );
}

/** Per-location actuator destruction lookup. */
export function actuatorDestroyedAt(
  input: IPhysicalAttackInput,
  location: 'left_arm' | 'right_arm',
  actuator: ActuatorType,
): boolean {
  return (
    input.componentDamage.actuatorsByLocation?.[location]?.[actuator] === true
  );
}

/** Actuator destruction on the selected arm (location map or aggregate). */
export function selectedArmActuatorDestroyed(
  input: IPhysicalAttackInput,
  actuator: ActuatorType,
): boolean {
  const location = selectedArmLocation(input);
  const locationActuators = input.componentDamage.actuatorsByLocation;
  if (locationActuators !== undefined) {
    return locationActuators[location]?.[actuator] === true;
  }

  return input.componentDamage.actuators[actuator] === true;
}

/** Hand actuator destroyed on either arm (Zweihander checks). */
export function eitherZweihanderHandActuatorDestroyed(
  input: IPhysicalAttackInput,
): boolean {
  return (
    input.componentDamage.actuators[ActuatorType.HAND] === true ||
    actuatorDestroyedAt(input, 'left_arm', ActuatorType.HAND) ||
    actuatorDestroyedAt(input, 'right_arm', ActuatorType.HAND)
  );
}

/**
 * Validates two-handed Zweihander declaration constraints (SPA, limbs, cargo).
 */
export function zweihanderDeclarationRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (input.twoHandedZweihander !== true) return { allowed: true };

  if (!isZweihanderPhysicalAttackType(input.attackType)) {
    return blocked(
      'Two-handed Zweihander declaration requires punch or a supported physical weapon',
      'UnsupportedAttackType',
    );
  }

  if (!hasSPA(input.pilotAbilities ?? [], 'zweihander')) {
    return blocked(
      'Two-handed Zweihander declaration requires the Zweihander SPA',
      'RequiredSpaMissing',
    );
  }

  if (input.attackerProne) {
    return blocked(
      'Two-handed Zweihander declaration cannot be made while prone',
      'AttackerProne',
    );
  }

  if (anyPunchArmDestroyed(input)) {
    return blocked(
      'Two-handed Zweihander declaration requires both arms present',
      'LimbMissing',
    );
  }

  if (
    input.handActuatorPresent === false ||
    eitherZweihanderHandActuatorDestroyed(input)
  ) {
    return blocked(
      'Two-handed Zweihander declaration requires represented hand actuators',
      'MissingActuator',
    );
  }

  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return blocked(
      'Two-handed Zweihander declaration requires both arms to be unfired',
      'WeaponFiredThisTurn',
    );
  }

  if (eitherArmCarryingCargo(input)) {
    return blocked(
      'Two-handed Zweihander declaration requires both arms free of carried cargo',
      'AttackerCargoInteraction',
    );
  }

  return { allowed: true };
}

/** True when either kick leg location is destroyed. */
export function anyKickLegDestroyed(input: IPhysicalAttackInput): boolean {
  return (
    attackerLocationDestroyed(input, 'left_leg') ||
    attackerLocationDestroyed(input, 'right_leg')
  );
}

/** Resolves brush-off arm side from limb/arm selection. */
export function selectedBrushOffArm(
  input: IPhysicalAttackInput,
): 'left' | 'right' {
  if (input.limb === 'leftArm' || input.arm === 'left') return 'left';
  return 'right';
}

/** True when the selected brush-off arm location is destroyed. */
export function selectedBrushOffArmMissing(
  input: IPhysicalAttackInput,
): boolean {
  return attackerLocationDestroyed(
    input,
    selectedBrushOffArm(input) === 'left' ? 'left_arm' : 'right_arm',
  );
}

/** Resolves grapple side from explicit side or limb/arm selection. */
export function selectedGrappleSide(
  input: IPhysicalAttackInput,
): GrappleAttackSide {
  if (input.grappleSide) return input.grappleSide;
  if (input.limb === 'leftArm' || input.arm === 'left') return 'left';
  if (input.limb === 'rightArm' || input.arm === 'right') return 'right';
  return 'both';
}

/** Grapple side includes the left arm. */
export function grappleSelectsLeft(side: GrappleAttackSide): boolean {
  return side === 'left' || side === 'both';
}

/** Grapple side includes the right arm. */
export function grappleSelectsRight(side: GrappleAttackSide): boolean {
  return side === 'right' || side === 'both';
}
