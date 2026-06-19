/**
 * Skill Check Resolution
 *
 * Implements 2d6 skill check mechanics for the campaign system.
 * A skill check compares a 2d6 roll against a target number (TN).
 * Success occurs when roll >= TN.
 *
 * @module campaign/skills/skillCheck
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ISkillType } from '@/types/campaign/skills';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { getPilotSkillValue } from './skillHelpers';

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
 * Lower TN is better (skilled pilots have lower TN).
 *
 * NPC behavior: SKIP — when pilot is null, treats as unskilled (baseTN + 4).
 *
 * @stub Plan 7 — IPilot.skills only carries gunnery/piloting today. For those
 * two skills the numeric value is used as the level (bonus=0, attrMod=0).
 * All other skill IDs are treated as unskilled (+4 penalty) until Plan 7 lands.
 *
 * Formula (pilot present, known skill): `skillType.targetNumber - skillLevel`
 * Formula (unskilled): `skillType.targetNumber + 4`
 * Then modifiers are added on top.
 *
 * @param _entry - The roster entry (reserved for future role-weighted TN adjustments)
 * @param pilot - The vault pilot (null for NPCs)
 * @param skillId - The skill ID to check
 * @param skillType - The skill type definition
 * @param modifiers - Optional modifiers to apply
 *
 * @returns The effective target number
 *
 * @example
 * // Pilot with gunnery 4 — TN = 4 - 4 = 0
 * const tn = getEffectiveSkillTN(entry, pilot, 'gunnery', gunneryType);
 *
 * // NPC or unknown skill — TN = 4 + 4 = 8
 * const tn = getEffectiveSkillTN(entry, null, 'gunnery', gunneryType);
 */
export function getEffectiveSkillTN(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  skillId: string,
  skillType: ISkillType,
  modifiers: readonly { name: string; value: number }[] = [],
): number {
  // Start from the base target number defined on the skill type
  let baseTN = skillType.targetNumber;

  if (pilot === null) {
    // NPC SKIP: no pilot data — treat as unskilled
    baseTN += 4;
  } else {
    // @stub Plan 7 — IPilot.skills only has gunnery and piloting as plain numbers.
    // Use the numeric value as the skill level (bonus=0, attrMod=0 until attributes land).
    // All other skill IDs fall through to the unskilled branch.
    const pilotSkillValue = getPilotSkillValue(pilot, skillId);

    if (pilotSkillValue !== undefined) {
      // Known skill: subtract the numeric level from the base TN
      baseTN -= pilotSkillValue;
    } else {
      // Unknown skill for this pilot — unskilled penalty
      baseTN += 4;
    }
  }

  // Apply all modifiers
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
 * NPC behavior: SKIP — when pilot is null, uses unskilled TN.
 *
 * @param _entry - The roster entry (reserved for future use)
 * @param pilot - The vault pilot (null for NPCs)
 * @param skillId - The skill ID to check
 * @param skillType - The skill type definition
 * @param modifiers - Optional modifiers to apply
 * @param random - Random number generator (for testing)
 *
 * @returns The skill check result
 *
 * @example
 * const result = performSkillCheck(
 *   entry,
 *   pilot,
 *   'gunnery',
 *   gunneryType,
 *   [{ name: 'Called Shot', value: 2 }],
 *   () => Math.floor(Math.random() * 6) + 1
 * );
 *
 * if (result.success) {
 *   logger.debug(`Hit! Margin: ${result.margin}`);
 * }
 */
export function performSkillCheck(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  skillId: string,
  skillType: ISkillType,
  modifiers: readonly { name: string; value: number }[] = [],
  random: RandomFn,
): SkillCheckResult {
  // Roll 2d6
  const roll = random() + random();

  // Get effective TN using the two-arg helper
  const targetNumber = getEffectiveSkillTN(
    _entry,
    pilot,
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
