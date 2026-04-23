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
import {
  canCharge,
  canDFA,
  canKick,
  canMeleeWeapon,
  canPunch,
} from './restrictions';
import {
  IPhysicalAttackInput,
  IPhysicalModifier,
  IPhysicalToHitResult,
} from './types';

/**
 * Per `implement-physical-attack-phase` tasks 4.3 / 5.3: append the target
 * movement modifier (TMM) as a labelled modifier. Callers derive TMM from
 * the target's movementType + hexesMoved via
 * `movement/modifiers.ts#calculateTMM`.
 */
function appendTMM(
  modifiers: IPhysicalModifier[],
  tmm: number | undefined,
): void {
  if (tmm === undefined || tmm === 0) return;
  modifiers.push({
    name: 'Target movement modifier',
    value: tmm,
    source: 'movement',
  });
}

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
      restrictionReasonCode: restriction.reasonCode,
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

  // Per task 4.3: target movement modifier (TMM) applies to punch to-hit.
  appendTMM(modifiers, input.targetMovementModifier);

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
      restrictionReasonCode: restriction.reasonCode,
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

  // Per task 5.3: target movement modifier (TMM) applies to kick to-hit.
  appendTMM(modifiers, input.targetMovementModifier);

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
  // Per task 3.7: charge requires the attacker ran this turn.
  const restriction = canCharge(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
      restrictionReasonCode: restriction.reasonCode,
    };
  }

  const modifiers: IPhysicalModifier[] = [];

  // Per task 6.1: charge to-hit = piloting + attacker-movement modifier.
  if (
    input.attackerMovementModifier !== undefined &&
    input.attackerMovementModifier !== 0
  ) {
    modifiers.push({
      name: 'Attacker movement modifier',
      value: input.attackerMovementModifier,
      source: 'movement',
    });
  }

  // Per task 4.3 / 5.3 analog: charge also respects target TMM.
  appendTMM(modifiers, input.targetMovementModifier);

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculateDFAToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  // Per task 3.6: DFA requires the attacker jumped this turn.
  const restriction = canDFA(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
      restrictionReasonCode: restriction.reasonCode,
    };
  }

  const modifiers: IPhysicalModifier[] = [];

  // DFA inherits TMM like punch/kick.
  appendTMM(modifiers, input.targetMovementModifier);

  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
    modifiers,
    allowed: true,
  };
}

export function calculatePushToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const baseToHit = input.pilotingSkill - PUSH_TO_HIT_BONUS;
  const modifiers: IPhysicalModifier[] = [];

  appendTMM(modifiers, input.targetMovementModifier);
  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit,
    finalToHit: baseToHit + totalMod,
    modifiers,
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
      restrictionReasonCode: restriction.reasonCode,
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
    case 'lance':
      // Per task 9.4: lance baseline to-hit uses no weapon modifier; the
      // +0 entry keeps the modifier list non-empty for replay/debug.
      weaponMod = 0;
      break;
  }

  const modifiers: IPhysicalModifier[] = [
    {
      name: `${input.attackType} modifier`,
      value: weaponMod,
      source: 'weapon',
    },
  ];

  appendTMM(modifiers, input.targetMovementModifier);
  const totalMod = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
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
    case 'lance':
      return calculateMeleeWeaponToHit(input);
    default:
      return {
        baseToHit: Infinity,
        finalToHit: Infinity,
        modifiers: [],
        allowed: false,
        restrictionReason: 'Unknown attack type',
        restrictionReasonCode: 'UnsupportedAttackType',
      };
  }
}
