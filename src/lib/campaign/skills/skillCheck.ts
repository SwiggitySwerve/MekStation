/**
 * Skill Check Resolution
 *
 * Implements 2d6 skill check mechanics for the campaign system.
 * A skill check compares a 2d6 roll against a target number (TN).
 * Success occurs when roll >= TN.
 *
 * @module campaign/skills/skillCheck
 */

import { IPerson } from '@/types/campaign/Person';
import { ISkillType, getSkillValue } from '@/types/campaign/skills';

/**
 * Function type for random number generation.
 *
 * Used for dependency injection of randomness, enabling deterministic testing.
 *
 * @returns A random number (typically 1-6 for a d6)
 *
 * @example
 * const d6 = () => Math.floor(Math.random() * 6) + 1;
 * const roll = d6() + d6(); // 2d6 roll
 */
export type RandomFn = () => number;

/**
 * Result of a skill check.
 *
 * Contains the roll, target number, success status, and critical outcomes.
 * The margin is the difference between roll and TN (positive = success).
 *
 * @example
 * const result: SkillCheckResult = {
 *   roll: 10,
 *   targetNumber: 8,
 *   margin: 2,
 *   success: true,
 *   criticalSuccess: false,
 *   criticalFailure: false,
 *   modifiers: [{ name: 'Injured', value: -2 }]
 * };
 */
export interface SkillCheckResult {
  /** The 2d6 roll result (2-12) */
  readonly roll: number;

  /** The target number to meet or exceed */
  readonly targetNumber: number;

  /** Margin of success/failure (roll - targetNumber) */
  readonly margin: number;

  /** Whether the check succeeded (roll >= targetNumber) */
  readonly success: boolean;

  /** Critical success (margin >= 4) */
  readonly criticalSuccess: boolean;

  /** Critical failure (margin <= -4) */
  readonly criticalFailure: boolean;

  /** Applied modifiers (name and value pairs) */
  readonly modifiers: readonly { name: string; value: number }[];
}

/**
 * Calculates the effective target number for a skill check.
 *
 * The effective TN is the base TN adjusted by the skill value and modifiers.
 * Lower TN is better (skilled people have lower TN).
 *
 * Formula: `skillType.targetNumber - getSkillValue(skill, skillType, person.attributes) + sum(modifiers)`
 *
 * If the skill is not found on the person, uses unskilled TN:
 * `skillType.targetNumber + 4`
 *
 * @param person - The character making the check
 * @param skillId - The skill ID to check
 * @param skillType - The skill type definition
 * @param modifiers - Optional modifiers to apply
 *
 * @returns The effective target number
 *
 * @example
 * // Skilled person (gunnery 4, DEX 7)
 * const tn = getEffectiveSkillTN(person, 'gunnery', gunneryType);
 * // tn = 4 - (4 + 0 + 2) = -2 (very easy)
 *
 * // Unskilled person
 * const tn = getEffectiveSkillTN(person, 'unknown-skill', unknownType);
 * // tn = 4 + 4 = 8 (harder)
 */
export function getEffectiveSkillTN(
  person: IPerson,
  skillId: string,
  skillType: ISkillType,
  modifiers: readonly { name: string; value: number }[] = [],
): number {
  // Look up skill on person
  const skill = person.skills[skillId];

  // Calculate base TN
  let baseTN = skillType.targetNumber;

  // If skill is missing, apply unskilled penalty (+4)
  if (!skill) {
    baseTN += 4;
  } else {
    // Skill exists: subtract skill value
    const skillValue = getSkillValue(skill, skillType, person.attributes);
    baseTN -= skillValue;
  }

  // Apply modifiers
  const modifierSum = modifiers.reduce((sum, mod) => sum + mod.value, 0);
  baseTN += modifierSum;

  return baseTN;
}

/**
 * Performs a skill check.
 *
 * Rolls 2d6 and compares against the effective target number.
 * Success occurs when roll >= TN.
 *
 * @param person - The character making the check
 * @param skillId - The skill ID to check
 * @param skillType - The skill type definition
 * @param modifiers - Optional modifiers to apply
 * @param random - Random number generator (for testing)
 *
 * @returns The skill check result
 *
 * @example
 * const result = performSkillCheck(
 *   person,
 *   'gunnery',
 *   gunneryType,
 *   [{ name: 'Called Shot', value: 2 }],
 *   () => Math.floor(Math.random() * 6) + 1
 * );
 *
 * if (result.success) {
 *   console.log(`Hit! Margin: ${result.margin}`);
 * }
 */
export function performSkillCheck(
  person: IPerson,
  skillId: string,
  skillType: ISkillType,
  modifiers: readonly { name: string; value: number }[] = [],
  random: RandomFn,
): SkillCheckResult {
  // Roll 2d6
  const roll = random() + random();

  // Get effective TN
  const targetNumber = getEffectiveSkillTN(
    person,
    skillId,
    skillType,
    modifiers,
  );

  // Calculate margin
  const margin = roll - targetNumber;

  // Determine success
  const success = roll >= targetNumber;

  // Determine critical outcomes
  const criticalSuccess = margin >= 4;
  const criticalFailure = margin <= -4;

  return {
    roll,
    targetNumber,
    margin,
    success,
    criticalSuccess,
    criticalFailure,
    modifiers: [...modifiers],
  };
}
