import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import {
  FOOT_KICK_MODIFIER,
  HAND_PUNCH_MODIFIER,
  HATCHET_TO_HIT_MODIFIER,
  KICK_TO_HIT_BONUS,
  LOWER_ARM_PUNCH_MODIFIER,
  LOWER_LEG_KICK_MODIFIER,
  MACE_TO_HIT_MODIFIER,
  PUSH_TO_HIT_BONUS,
  SWORD_TO_HIT_MODIFIER,
  UPPER_ARM_PUNCH_MODIFIER,
  UPPER_LEG_KICK_MODIFIER,
} from './constants';
import { canKick, canMeleeWeapon, canPunch } from './restrictions';
import {
  IPhysicalAttackInput,
  IPhysicalModifier,
  IPhysicalToHitResult,
} from './types';

export function calculatePunchToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canPunch(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
    };
  }

  const modifiers: IPhysicalModifier[] = [];
  const actuators = input.componentDamage.actuators;

  if (actuators[ActuatorType.UPPER_ARM]) {
    modifiers.push({
      name: 'Upper arm actuator destroyed',
      value: UPPER_ARM_PUNCH_MODIFIER,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.LOWER_ARM]) {
    modifiers.push({
      name: 'Lower arm actuator destroyed',
      value: LOWER_ARM_PUNCH_MODIFIER,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.HAND]) {
    modifiers.push({
      name: 'Hand actuator destroyed',
      value: HAND_PUNCH_MODIFIER,
      source: 'actuator',
    });
  }

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculateKickToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canKick(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill - KICK_TO_HIT_BONUS,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
    };
  }

  const modifiers: IPhysicalModifier[] = [];
  const actuators = input.componentDamage.actuators;

  if (actuators[ActuatorType.UPPER_LEG]) {
    modifiers.push({
      name: 'Upper leg actuator destroyed',
      value: UPPER_LEG_KICK_MODIFIER,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.LOWER_LEG]) {
    modifiers.push({
      name: 'Lower leg actuator destroyed',
      value: LOWER_LEG_KICK_MODIFIER,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.FOOT]) {
    modifiers.push({
      name: 'Foot actuator destroyed',
      value: FOOT_KICK_MODIFIER,
      source: 'actuator',
    });
  }

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  const baseToHit = input.pilotingSkill - KICK_TO_HIT_BONUS;

  return {
    baseToHit,
    finalToHit: baseToHit + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculateChargeToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const modifiers: IPhysicalModifier[] = [];

  return {
    baseToHit: input.pilotingSkill,
    finalToHit:
      input.pilotingSkill +
      modifiers.reduce((sum, modifier) => sum + modifier.value, 0),
    modifiers,
    allowed: true,
  };
}

export function calculateDFAToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const modifiers: IPhysicalModifier[] = [];

  return {
    baseToHit: input.pilotingSkill,
    finalToHit:
      input.pilotingSkill +
      modifiers.reduce((sum, modifier) => sum + modifier.value, 0),
    modifiers,
    allowed: true,
  };
}

export function calculatePushToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const baseToHit = input.pilotingSkill - PUSH_TO_HIT_BONUS;

  return {
    baseToHit,
    finalToHit: baseToHit,
    modifiers: [],
    allowed: true,
  };
}

export function calculateMeleeWeaponToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canMeleeWeapon(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
    };
  }

  let weaponMod = 0;
  switch (input.attackType) {
    case 'hatchet':
      weaponMod = HATCHET_TO_HIT_MODIFIER;
      break;
    case 'sword':
      weaponMod = SWORD_TO_HIT_MODIFIER;
      break;
    case 'mace':
      weaponMod = MACE_TO_HIT_MODIFIER;
      break;
  }

  const modifiers: IPhysicalModifier[] = [
    {
      name: `${input.attackType} modifier`,
      value: weaponMod,
      source: 'weapon',
    },
  ];

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + weaponMod,
    modifiers,
    allowed: true,
  };
}

export function calculatePhysicalToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  switch (input.attackType) {
    case 'punch':
      return calculatePunchToHit(input);
    case 'kick':
      return calculateKickToHit(input);
    case 'charge':
      return calculateChargeToHit(input);
    case 'dfa':
      return calculateDFAToHit(input);
    case 'push':
      return calculatePushToHit(input);
    case 'hatchet':
    case 'sword':
    case 'mace':
      return calculateMeleeWeaponToHit(input);
    default:
      return {
        baseToHit: Infinity,
        finalToHit: Infinity,
        modifiers: [],
        allowed: false,
        restrictionReason: 'Unknown attack type',
      };
  }
}
