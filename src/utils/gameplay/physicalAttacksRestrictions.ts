import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import {
  IPhysicalAttackInput,
  IPhysicalAttackRestriction,
} from './physicalAttacksTypes';

export function canPunch(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const actuators = input.componentDamage.actuators;

  if (actuators[ActuatorType.SHOULDER]) {
    return { allowed: false, reason: 'Shoulder actuator destroyed' };
  }

  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
    };
  }

  return { allowed: true };
}

export function canKick(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (input.attackerProne) {
    return { allowed: false, reason: 'Cannot kick while prone' };
  }

  const actuators = input.componentDamage.actuators;
  if (actuators[ActuatorType.HIP]) {
    return { allowed: false, reason: 'Hip actuator destroyed' };
  }

  return { allowed: true };
}

export function canMeleeWeapon(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const actuators = input.componentDamage.actuators;

  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
    };
  }

  if (actuators[ActuatorType.SHOULDER]) {
    return { allowed: false, reason: 'Shoulder actuator destroyed' };
  }

  if (actuators[ActuatorType.LOWER_ARM]) {
    return { allowed: false, reason: 'Lower arm actuator destroyed' };
  }

  if (actuators[ActuatorType.HAND]) {
    return { allowed: false, reason: 'Hand actuator destroyed' };
  }

  return { allowed: true };
}
