/**
 * Weapon Specialist Abilities
 * Gunnery-focused SPA modifiers for weapon specialization and range mastery.
 */

import { RangeBracket } from '@/types/gameplay';
import { IToHitModifierDetail } from '@/types/gameplay';

/**
 * Weapon Specialist: -2 to-hit for designated weapon type.
 */
export function calculateWeaponSpecialistModifier(
  abilities: readonly string[],
  weaponType?: string,
  designatedWeaponType?: string,
): IToHitModifierDetail | null {
  if (!abilities.includes('weapon-specialist')) return null;
  if (!weaponType || !designatedWeaponType) return null;
  if (weaponType.toLowerCase() !== designatedWeaponType.toLowerCase())
    return null;

  return {
    name: 'Weapon Specialist',
    value: -2,
    source: 'spa',
    description: `Weapon Specialist (${designatedWeaponType}): -2`,
  };
}

/**
 * Gunnery Specialist: -1 for designated category, +1 for others.
 */
export function calculateGunnerySpecialistModifier(
  abilities: readonly string[],
  weaponCategory?: string,
  designatedCategory?: string,
): IToHitModifierDetail | null {
  if (!abilities.includes('gunnery-specialist')) return null;
  if (!weaponCategory || !designatedCategory) return null;

  const isDesignated =
    weaponCategory.toLowerCase() === designatedCategory.toLowerCase();
  return {
    name: 'Gunnery Specialist',
    value: isDesignated ? -1 : 1,
    source: 'spa',
    description: isDesignated
      ? `Gunnery Specialist (${designatedCategory}): -1`
      : `Gunnery Specialist (not ${designatedCategory}): +1`,
  };
}

/**
 * Range Master: zeroes range modifier for one designated bracket.
 * Returns the negation of the current range modifier for the designated bracket.
 */
export function calculateRangeMasterModifier(
  abilities: readonly string[],
  rangeBracket?: RangeBracket,
  designatedBracket?: RangeBracket,
  currentRangeModifier?: number,
): IToHitModifierDetail | null {
  if (!abilities.includes('range-master')) return null;
  if (!rangeBracket || !designatedBracket) return null;
  if (rangeBracket !== designatedBracket) return null;
  if (currentRangeModifier === undefined || currentRangeModifier <= 0)
    return null;

  return {
    name: 'Range Master',
    value: -currentRangeModifier,
    source: 'spa',
    description: `Range Master (${designatedBracket}): zeroes range modifier`,
  };
}

/**
 * Sniper: halves all positive range modifiers (round down).
 * Returns a negative modifier equal to half the current range modifier.
 */
export function calculateSniperModifier(
  abilities: readonly string[],
  currentRangeModifier?: number,
): IToHitModifierDetail | null {
  if (!abilities.includes('sniper')) return null;
  if (currentRangeModifier === undefined || currentRangeModifier <= 0)
    return null;

  const reduction = -Math.floor(currentRangeModifier / 2);
  if (reduction === 0) return null;

  return {
    name: 'Sniper',
    value: reduction,
    source: 'spa',
    description: `Sniper: halves range modifier (${currentRangeModifier} → ${currentRangeModifier + reduction})`,
  };
}
