import { CombatLocation } from '@/types/gameplay';

import { D6Roller } from '../hitLocation';
import { KICK_HIT_TABLE, PUNCH_HIT_TABLE } from './constants';
import { calculatePhysicalDamage, getPhysicalMissConsequences } from './damage';
import { calculatePhysicalToHit } from './toHit';
import { IPhysicalAttackInput, IPhysicalAttackResult } from './types';

export function determinePhysicalHitLocation(
  hitTable: 'punch' | 'kick',
  diceRoller: D6Roller,
): CombatLocation {
  const roll = diceRoller();
  const clamped = Math.max(1, Math.min(6, roll));

  if (hitTable === 'kick') {
    return KICK_HIT_TABLE[clamped];
  }

  return PUNCH_HIT_TABLE[clamped];
}

export function resolvePhysicalAttack(
  input: IPhysicalAttackInput,
  diceRoller: D6Roller,
): IPhysicalAttackResult {
  const toHitResult = calculatePhysicalToHit(input);

  if (!toHitResult.allowed) {
    return {
      attackType: input.attackType,
      toHitNumber: Infinity,
      roll: 0,
      hit: false,
      targetDamage: 0,
      attackerDamage: 0,
      attackerLegDamagePerLeg: 0,
      targetPSR: false,
      attackerPSR: false,
      attackerPSRModifier: 0,
      restrictionReasonCode: toHitResult.restrictionReasonCode,
      targetDisplaced: false,
    };
  }

  const automaticHit = toHitResult.automaticHit === true;
  const die1 = automaticHit ? 0 : diceRoller();
  const die2 = automaticHit ? 0 : diceRoller();
  const roll = automaticHit ? 0 : die1 + die2;
  const hit = automaticHit || roll >= toHitResult.finalToHit;

  if (hit) {
    const damageResult = calculatePhysicalDamage(input);
    const hitLocation =
      damageResult.targetDamage > 0
        ? determinePhysicalHitLocation(damageResult.hitTable, diceRoller)
        : undefined;

    return {
      attackType: input.attackType,
      toHitNumber: toHitResult.finalToHit,
      roll,
      hit: true,
      targetDamage: damageResult.targetDamage,
      attackerDamage: damageResult.attackerDamage,
      attackerLegDamagePerLeg: damageResult.attackerLegDamagePerLeg,
      targetPSR: damageResult.targetPSR,
      attackerPSR: damageResult.attackerPSR,
      attackerPSRModifier: damageResult.attackerPSRModifier,
      hitLocation,
      targetDisplaced: damageResult.targetDisplaced,
      automaticHit: toHitResult.automaticHit,
      automaticHitReason: toHitResult.automaticHitReason,
    };
  }

  const missConsequences = getPhysicalMissConsequences(input.attackType, input);
  const selfDamageLocation =
    missConsequences.attackerDamage > 0 && missConsequences.hitTable
      ? determinePhysicalHitLocation(missConsequences.hitTable, diceRoller)
      : undefined;

  return {
    attackType: input.attackType,
    toHitNumber: toHitResult.finalToHit,
    roll,
    hit: false,
    targetDamage: 0,
    attackerDamage: missConsequences.attackerDamage,
    attackerLegDamagePerLeg: 0,
    targetPSR: false,
    attackerPSR: missConsequences.attackerPSR,
    attackerPSRModifier: missConsequences.attackerPSRModifier,
    hitLocation: selfDamageLocation,
    targetDisplaced: false,
  };
}
