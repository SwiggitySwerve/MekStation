/**
 * Skill Helper Functions for Cross-Plan Integration
 *
 * Provides utility functions for accessing and evaluating character skills
 * across different campaign plans. These helpers abstract skill lookup and
 * calculation logic for use by other systems.
 *
 * @module campaign/skills/skillHelpers
 */

import { SKILL_CATALOG } from '@/constants/campaign/skillCatalog';
import { IPerson } from '@/types/campaign/Person';
import { getSkillValue } from '@/types/campaign/skills';

/**
 * Gets the skill desirability modifier for a person.
 *
 * Used by Plan 2 (Turnover) to determine how desirable a person is
 * for retention. Higher skill levels increase desirability.
 *
 * Calculation: Sum of all skill levels (max 10 per skill)
 *
 * @param person - The character to evaluate
 * @returns The total desirability modifier (0 if no skills)
 *
 * @example
 * // Person with gunnery 4 and piloting 5
 * const modifier = getSkillDesirabilityModifier(person);
 * // modifier = 4 + 5 = 9
 */
export function getSkillDesirabilityModifier(person: IPerson): number {
  let total = 0;

  for (const skill of Object.values(person.skills)) {
    total += skill.level;
  }

  return total;
}

/**
 * Gets the effective tech skill value for a person.
 *
 * Used by Plan 3 (Repair) to determine repair capability.
 * Returns the highest tech-related skill value, or 10 (unskilled) if none.
 *
 * Tech skills checked: tech-mech, tech-vehicle, tech-aerospace, astech
 *
 * @param person - The character to evaluate
 * @returns The tech skill value (0-10), or 10 if unskilled
 *
 * @example
 * // Person with tech-mech 5
 * const value = getTechSkillValue(person);
 * // value = 5
 *
 * // Person with no tech skills
 * const value = getTechSkillValue(person);
 * // value = 10 (unskilled penalty)
 */
export function getTechSkillValue(person: IPerson): number {
  const techSkillIds = [
    'tech-mech',
    'tech-vehicle',
    'tech-aerospace',
    'astech',
  ];
  let bestValue = 10;

  for (const skillId of techSkillIds) {
    const skill = person.skills[skillId];
    if (skill) {
      const skillType = SKILL_CATALOG[skillId];
      if (skillType) {
        const value = getSkillValue(skill, skillType, person.attributes);
        bestValue = Math.min(bestValue, value);
      }
    }
  }

  return bestValue;
}

/**
 * Gets the effective admin skill value for a person.
 *
 * Used by Plan 4 (Financial) for HR and administrative tasks.
 * Returns the administration skill value, or 10 (unskilled) if missing.
 *
 * @param person - The character to evaluate
 * @returns The admin skill value (0-10), or 10 if unskilled
 *
 * @example
 * // Person with administration 5
 * const value = getAdminSkillValue(person);
 * // value = 5
 */
export function getAdminSkillValue(person: IPerson): number {
  const skill = person.skills.administration;

  if (!skill) {
    return 10;
  }

  const skillType = SKILL_CATALOG.administration;
  if (!skillType) {
    return 10;
  }

  return getSkillValue(skill, skillType, person.attributes);
}

/**
 * Gets the effective medicine skill value for a person.
 *
 * Used by Plan 8 (Medical) for medical treatment and healing.
 * Returns the medicine skill value, or 10 (unskilled) if missing.
 *
 * @param person - The character to evaluate
 * @returns The medicine skill value (0-10), or 10 if unskilled
 *
 * @example
 * // Person with medicine 5
 * const value = getMedicineSkillValue(person);
 * // value = 5
 */
export function getMedicineSkillValue(person: IPerson): number {
  const skill = person.skills.medicine;

  if (!skill) {
    return 10;
  }

  const skillType = SKILL_CATALOG.medicine;
  if (!skillType) {
    return 10;
  }

  return getSkillValue(skill, skillType, person.attributes);
}

/**
 * Gets the negotiation modifier for a person.
 *
 * Used by Plan 9 (Acquisition) for equipment negotiation and trading.
 * Returns the negotiation skill value, or 10 (unskilled) if missing.
 *
 * @param person - The character to evaluate
 * @returns The negotiation modifier (0-10), or 10 if unskilled
 *
 * @example
 * // Person with negotiation 4
 * const modifier = getNegotiationModifier(person);
 * // modifier = 4
 */
export function getNegotiationModifier(person: IPerson): number {
  const skill = person.skills.negotiation;

  if (!skill) {
    return 10;
  }

  const skillType = SKILL_CATALOG.negotiation;
  if (!skillType) {
    return 10;
  }

  return getSkillValue(skill, skillType, person.attributes);
}

/**
 * Gets the leadership skill value for a person.
 *
 * Used by Plan 15 (Ranks) for command and leadership effectiveness.
 * Returns the leadership skill value, or 10 (unskilled) if missing.
 *
 * @param person - The character to evaluate
 * @returns The leadership skill value (0-10), or 10 if unskilled
 *
 * @example
 * // Person with leadership 6
 * const value = getLeadershipSkillValue(person);
 * // value = 6
 */
export function getLeadershipSkillValue(person: IPerson): number {
  const skill = person.skills.leadership;

  if (!skill) {
    return 10;
  }

  const skillType = SKILL_CATALOG.leadership;
  if (!skillType) {
    return 10;
  }

  return getSkillValue(skill, skillType, person.attributes);
}

/**
 * Checks if a person has a specific skill.
 *
 * Generic helper for checking skill existence.
 *
 * @param person - The character to check
 * @param skillId - The skill ID to look for
 *
 * @returns true if the person has the skill, false otherwise
 *
 * @example
 * if (hasSkill(person, 'gunnery')) {
 *   logger.debug('Person is a gunner');
 * }
 */
export function hasSkill(person: IPerson, skillId: string): boolean {
  return skillId in person.skills;
}

/**
 * Gets the skill level for a person.
 *
 * Generic helper for retrieving skill level.
 *
 * @param person - The character to check
 * @param skillId - The skill ID to look up
 *
 * @returns The skill level (0-10), or -1 if the skill is not found
 *
 * @example
 * const level = getPersonSkillLevel(person, 'gunnery');
 * if (level === -1) {
 *   logger.debug('Person does not have gunnery skill');
 * } else {
 *   logger.debug(`Gunnery level: ${level}`);
 * }
 */
export function getPersonSkillLevel(person: IPerson, skillId: string): number {
  const skill = person.skills[skillId];
  return skill ? skill.level : -1;
}

/**
 * Gets the best combat skill for a person.
 *
 * Finds the highest-level combat skill (gunnery, piloting, etc.).
 * Returns null if the person has no combat skills.
 *
 * Combat skills checked: gunnery, piloting, gunnery-aerospace,
 * piloting-aerospace, gunnery-vehicle, driving, gunnery-ba, anti-mek, small-arms
 *
 * @param person - The character to evaluate
 *
 * @returns Object with skillId and level, or null if no combat skills
 *
 * @example
 * const best = getPersonBestCombatSkill(person);
 * if (best) {
 *   logger.debug(`Best combat skill: ${best.skillId} at level ${best.level}`);
 * } else {
 *   logger.debug('No combat skills');
 * }
 */
export function getPersonBestCombatSkill(
  person: IPerson,
): { skillId: string; level: number } | null {
  const combatSkillIds = [
    'gunnery',
    'piloting',
    'gunnery-aerospace',
    'piloting-aerospace',
    'gunnery-vehicle',
    'driving',
    'gunnery-ba',
    'anti-mek',
    'small-arms',
  ];

  let bestSkill: { skillId: string; level: number } | null = null;

  for (const skillId of combatSkillIds) {
    const skill = person.skills[skillId];
    if (skill && (!bestSkill || skill.level > bestSkill.level)) {
      bestSkill = { skillId, level: skill.level };
    }
  }

  return bestSkill;
}
