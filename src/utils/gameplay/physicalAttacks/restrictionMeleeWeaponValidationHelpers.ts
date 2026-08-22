import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { hasNoArms } from '@/utils/gameplay/quirkModifiers';

import {
  selectedArmActuatorDestroyed,
  selectedArmCarryingCargo,
  selectedPunchArmDestroyed,
} from './restrictionLimbValidationHelpers';
import { blocked } from './restrictionValidationShared';
import {
  type IPhysicalAttackInput,
  type IPhysicalAttackRestriction,
} from './types';

/** Wrecking balls are not treated as arm-mounted melee weapons. */
export function meleeWeaponIsArmMounted(
  attackType: IPhysicalAttackInput['attackType'],
): boolean {
  return attackType !== 'wrecking-ball';
}

/** Whether the melee weapon requires a working hand actuator. */
export function meleeWeaponNeedsHand(
  attackType: IPhysicalAttackInput['attackType'],
): boolean {
  return (
    attackType !== 'flail' &&
    attackType !== 'lance' &&
    attackType !== 'wrecking-ball'
  );
}

/** Retractable blade must be extended when declared. */
export function meleeWeaponExtendedRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (
    input.attackType === 'retractable-blade' &&
    input.retractableBladeExtended === false
  ) {
    return blocked(
      'Retractable blade is not extended',
      'RetractableBladeNotExtended',
    );
  }

  return undefined;
}

/** Frame/quirk limits for arm-mounted melee weapons. */
export function meleeWeaponFrameRestriction(
  input: IPhysicalAttackInput,
  armMounted: boolean,
): IPhysicalAttackRestriction | undefined {
  if (input.attackerIsQuad && input.attackType !== 'wrecking-ball') {
    return blocked(
      'Quad BattleMechs cannot use this melee weapon',
      'AttackerQuad',
    );
  }

  if (armMounted && hasNoArms(input.unitQuirks ?? [])) {
    return blocked(
      'No Arms quirk prevents arm-mounted melee attacks',
      'NoArmsQuirk',
    );
  }

  return undefined;
}

/** Prior-action limits (fired weapons / cargo) for arm-mounted melee. */
export function meleeWeaponPriorActionRestriction(
  input: IPhysicalAttackInput,
  armMounted: boolean,
): IPhysicalAttackRestriction | undefined {
  if (
    armMounted &&
    input.weaponsFiredFromArm &&
    input.weaponsFiredFromArm.length > 0
  ) {
    return blocked('Arm fired weapons this turn', 'WeaponFiredThisTurn');
  }

  if (armMounted && selectedArmCarryingCargo(input)) {
    return blocked('Arm is carrying cargo', 'AttackerCargoInteraction');
  }

  return undefined;
}

/** Limb and actuator integrity for arm-mounted melee weapons. */
export function meleeWeaponArmRestriction(
  input: IPhysicalAttackInput,
  armMounted: boolean,
  needsHand: boolean,
): IPhysicalAttackRestriction | undefined {
  if (armMounted && selectedPunchArmDestroyed(input)) {
    return blocked('Melee weapon arm missing', 'LimbMissing');
  }

  if (
    armMounted &&
    selectedArmActuatorDestroyed(input, ActuatorType.SHOULDER)
  ) {
    return blocked('Shoulder actuator destroyed', 'ShoulderDestroyed');
  }

  if (
    armMounted &&
    selectedArmActuatorDestroyed(input, ActuatorType.LOWER_ARM)
  ) {
    return blocked('Lower arm actuator destroyed', 'MissingActuator');
  }

  if (
    armMounted &&
    needsHand &&
    selectedArmActuatorDestroyed(input, ActuatorType.HAND)
  ) {
    return blocked('Hand actuator destroyed', 'MissingActuator');
  }

  return undefined;
}
