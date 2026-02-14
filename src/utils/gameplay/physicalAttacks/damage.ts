import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import {
  CHARGE_DAMAGE_DIVISOR,
  DFA_ATTACKER_DAMAGE_DIVISOR,
  DFA_DAMAGE_MULTIPLIER,
  DFA_MISS_PSR_MODIFIER,
  DFA_TARGET_DAMAGE_DIVISOR,
  HATCHET_DAMAGE_DIVISOR,
  KICK_DAMAGE_DIVISOR,
  MACE_DAMAGE_DIVISOR,
  MACE_WEIGHT_MULTIPLIER,
  PUNCH_DAMAGE_DIVISOR,
  SWORD_DAMAGE_BONUS,
  SWORD_DAMAGE_DIVISOR,
  TSM_ACTIVATION_HEAT,
} from './constants';
import {
  IPhysicalAttackInput,
  IPhysicalDamageResult,
  PhysicalAttackType,
} from './types';

export function getEffectiveWeight(
  tonnage: number,
  heat: number = 0,
  hasTSM: boolean = false,
): number {
  if (hasTSM && heat >= TSM_ACTIVATION_HEAT) {
    return tonnage * 2;
  }
  return tonnage;
}

export function applyUnderwaterModifier(
  damage: number,
  isUnderwater: boolean,
): number {
  if (isUnderwater) {
    return Math.floor(damage / 2);
  }
  return damage;
}

export function calculatePunchDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  let damage = Math.ceil(effectiveWeight / PUNCH_DAMAGE_DIVISOR);
  const actuators = input.componentDamage.actuators;

  if (actuators[ActuatorType.UPPER_ARM]) {
    damage = Math.floor(damage / 2);
  }

  if (actuators[ActuatorType.LOWER_ARM]) {
    damage = Math.floor(damage / 2);
  }

  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateKickDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  const damage = Math.floor(effectiveWeight / KICK_DAMAGE_DIVISOR);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateChargeDamageToTarget(
  input: IPhysicalAttackInput,
): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  const hexesMoved = input.hexesMoved ?? 0;
  const multiplier = Math.max(0, hexesMoved - 1);
  const damage =
    Math.ceil(effectiveWeight / CHARGE_DAMAGE_DIVISOR) * multiplier;

  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateChargeDamageToAttacker(
  input: IPhysicalAttackInput,
): number {
  const targetTonnage = input.targetTonnage ?? 0;
  const damage = Math.ceil(targetTonnage / CHARGE_DAMAGE_DIVISOR);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateDFADamageToTarget(
  input: IPhysicalAttackInput,
): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  const damage =
    Math.ceil(effectiveWeight / DFA_TARGET_DAMAGE_DIVISOR) *
    DFA_DAMAGE_MULTIPLIER;

  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateDFADamageToAttacker(
  input: IPhysicalAttackInput,
): number {
  const totalDamage = Math.ceil(
    input.attackerTonnage / DFA_ATTACKER_DAMAGE_DIVISOR,
  );
  return Math.ceil(totalDamage / 2);
}

export function calculateHatchetDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const damage = Math.floor(effectiveWeight / HATCHET_DAMAGE_DIVISOR);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateSwordDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const damage =
    Math.floor(effectiveWeight / SWORD_DAMAGE_DIVISOR) + SWORD_DAMAGE_BONUS;
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateMaceDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const damage = Math.floor(
    (effectiveWeight * MACE_WEIGHT_MULTIPLIER) / MACE_DAMAGE_DIVISOR,
  );
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculatePhysicalDamage(
  input: IPhysicalAttackInput,
): IPhysicalDamageResult {
  switch (input.attackType) {
    case 'punch':
      return {
        targetDamage: calculatePunchDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };
    case 'kick':
      return {
        targetDamage: calculateKickDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: true,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'kick',
        targetDisplaced: false,
      };
    case 'charge':
      return {
        targetDamage: calculateChargeDamageToTarget(input),
        attackerDamage: calculateChargeDamageToAttacker(input),
        attackerLegDamagePerLeg: 0,
        targetPSR: true,
        attackerPSR: true,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };
    case 'dfa':
      return {
        targetDamage: calculateDFADamageToTarget(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: calculateDFADamageToAttacker(input),
        targetPSR: true,
        attackerPSR: true,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };
    case 'push':
      return {
        targetDamage: 0,
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: true,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: true,
      };
    case 'hatchet':
      return {
        targetDamage: calculateHatchetDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };
    case 'sword':
      return {
        targetDamage: calculateSwordDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };
    case 'mace':
      return {
        targetDamage: calculateMaceDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };
    default:
      return {
        targetDamage: 0,
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };
  }
}

export function getPhysicalMissConsequences(attackType: PhysicalAttackType): {
  attackerPSR: boolean;
  attackerPSRModifier: number;
} {
  switch (attackType) {
    case 'kick':
      return { attackerPSR: true, attackerPSRModifier: 0 };
    case 'dfa':
      return { attackerPSR: true, attackerPSRModifier: DFA_MISS_PSR_MODIFIER };
    default:
      return { attackerPSR: false, attackerPSRModifier: 0 };
  }
}
