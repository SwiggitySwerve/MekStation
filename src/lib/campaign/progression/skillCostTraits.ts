/**
 * Skill Cost Trait Modifiers
 *
 * Implements trait-based cost modifiers for skill improvement.
 * Traits stack multiplicatively to adjust XP costs based on character abilities.
 *
 * @module campaign/progression/skillCostTraits
 */

import type { IPerson } from '../../../types/campaign/Person';
import type { ICampaignOptions } from '../../../types/campaign/Campaign';
import type { ISkillType } from '../../../types/campaign/skills/ISkillType';
import { SKILL_CATALOG } from '../../../constants/campaign/skillCatalog';

/**
 * Tech skill IDs that are affected by Gremlins and Tech Empathy traits.
 *
 * These skills represent technical maintenance and repair work.
 * Only these skills are affected by tech-specific trait modifiers.
 */
const TECH_SKILL_IDS = new Set([
  'tech-mech',
  'tech-aero',
  'tech-mechanic',
  'tech-ba',
  'tech-vessel',
  'astech',
]);

/**
 * Determines if a skill type is a tech skill.
 *
 * Tech skills are affected by Gremlins (+10% cost) and Tech Empathy (-10% cost) traits.
 * Non-tech skills ignore these modifiers.
 *
 * @param skillType - The skill type to check
 * @returns true if the skill is a tech skill, false otherwise
 *
 * @example
 * const techMech = SKILL_CATALOG['tech-mech'];
 * isTechSkill(techMech); // true
 *
 * const gunnery = SKILL_CATALOG['gunnery'];
 * isTechSkill(gunnery); // false
 */
export function isTechSkill(skillType: ISkillType): boolean {
  return TECH_SKILL_IDS.has(skillType.id);
}

/**
 * Calculates the trait multiplier for skill improvement costs.
 *
 * Traits stack multiplicatively:
 * - Slow Learner: +20% cost (multiplier += 0.2)
 * - Fast Learner: -20% cost (multiplier -= 0.2)
 * - Gremlins: +10% cost for tech skills only (multiplier += 0.1)
 * - Tech Empathy: -10% cost for tech skills only (multiplier -= 0.1)
 *
 * The final multiplier is floored at 0.1 (10% minimum cost).
 *
 * @param person - The person whose traits to evaluate
 * @param skillId - The skill ID to check (used to determine if tech skill)
 * @returns The trait multiplier (1.0 = no modifier, >1.0 = increased cost, <1.0 = decreased cost)
 *
 * @example
 * // Person with no traits
 * calculateTraitMultiplier(person, 'gunnery'); // 1.0
 *
 * // Person with Slow Learner
 * calculateTraitMultiplier(person, 'gunnery'); // 1.2
 *
 * // Person with Fast Learner
 * calculateTraitMultiplier(person, 'gunnery'); // 0.8
 *
 * // Person with Slow Learner + Gremlins on tech skill
 * calculateTraitMultiplier(person, 'tech-mech'); // 1.32 (1.2 * 1.1)
 *
 * // Person with Gremlins on non-tech skill (ignored)
 * calculateTraitMultiplier(person, 'gunnery'); // 1.0
 */
export function calculateTraitMultiplier(person: IPerson, skillId: string): number {
  let multiplier = 1.0;

  // Slow Learner: +20% cost
  if (person.traits?.slowLearner) {
    multiplier += 0.2;
  }

  // Fast Learner: -20% cost
  if (person.traits?.fastLearner) {
    multiplier -= 0.2;
  }

  // Tech skill modifiers (only for tech-related skills)
  const skillType = SKILL_CATALOG[skillId];
  if (skillType && isTechSkill(skillType)) {
    // Gremlins: +10% cost for tech skills
    if (person.traits?.gremlins) {
      multiplier += 0.1;
    }

    // Tech Empathy: -10% cost for tech skills
    if (person.traits?.techEmpathy) {
      multiplier -= 0.1;
    }
  }

  // Floor at 10% cost (0.1 multiplier)
  return Math.max(0.1, multiplier);
}

/**
 * Gets the base skill improvement cost from the skill catalog.
 *
 * Uses the skill's cost array where costs[N] is the XP cost to advance from level N to N+1.
 * If the skill is not found or the level is out of range, returns a default formula.
 *
 * @param skillId - The skill ID
 * @param currentLevel - The current skill level (0-10)
 * @param _person - The person improving the skill (unused, reserved for future use)
 * @param _options - Campaign options (unused, reserved for future use)
 * @returns The base XP cost before trait modifiers
 */
function getSkillImprovementCost(
  skillId: string,
  currentLevel: number,
  _person: IPerson,
  _options: ICampaignOptions
): number {
  const skillType = SKILL_CATALOG[skillId];
  if (!skillType) {
    // Default: 10 * (currentLevel + 1) if skill not found
    return 10 * (currentLevel + 1);
  }

  // Use the skill's cost array
  // costs[N] = XP cost to advance from level N to N+1
  if (currentLevel >= 0 && currentLevel < skillType.costs.length) {
    return skillType.costs[currentLevel];
  }

  // Fallback for levels beyond the cost array
  return 10 * (currentLevel + 1);
}

/**
 * Calculates the XP cost to improve a skill, including trait modifiers.
 *
 * Applies trait multipliers to the base skill cost and ensures the final cost
 * is at least 1 XP.
 *
 * Formula:
 * ```
 * finalCost = Math.max(1, Math.round(baseCost * traitMultiplier))
 * ```
 *
 * @param skillId - The skill ID to improve
 * @param currentLevel - The current skill level (0-10)
 * @param person - The person improving the skill
 * @param options - Campaign options
 * @returns The XP cost to improve the skill (minimum 1)
 *
 * @example
 * // Base cost is 20 XP, person has Slow Learner (+20%)
 * getSkillImprovementCostWithTraits('gunnery', 1, person, options);
 * // Returns: Math.round(20 * 1.2) = 24
 *
 * // Base cost is 5 XP, person has Fast Learner (-20%)
 * getSkillImprovementCostWithTraits('gunnery', 0, person, options);
 * // Returns: Math.max(1, Math.round(5 * 0.8)) = 4
 */
export function getSkillImprovementCostWithTraits(
  skillId: string,
  currentLevel: number,
  person: IPerson,
  options: ICampaignOptions
): number {
  // Get base cost from skill catalog
  const baseCost = getSkillImprovementCost(skillId, currentLevel, person, options);

  // Calculate trait multiplier
  const traitMultiplier = calculateTraitMultiplier(person, skillId);

  // Apply multiplier and round to nearest integer, minimum 1 XP
  return Math.max(1, Math.round(baseCost * traitMultiplier));
}

/**
 * Checks if a person should roll for a veterancy SPA.
 *
 * This is a stub function that always returns false.
 * A full implementation would check if any skill has reached Veteran level
 * and the person hasn't already gained a veterancy SPA.
 *
 * @stub - Implement actual veterancy SPA check logic
 *
 * @param person - The person to check
 * @param skillId - The skill that was just improved
 * @returns true if the person should roll for a veterancy SPA, false otherwise
 *
 * @example
 * // Stub always returns false
 * checkVeterancySPA(person, 'gunnery'); // false
 */
export function checkVeterancySPA(person: IPerson, _skillId: string): boolean {
  // Stub implementation - always returns false
  // Full implementation would check:
  // 1. If person already has hasGainedVeterancySPA flag
  // 2. If any skill reached Veteran level (ExperienceLevel.Veteran)
  // 3. Return true if conditions met, false otherwise
  if (person.traits?.hasGainedVeterancySPA) {
    return false;
  }

  // Stub: no veterancy SPA check implemented yet
  return false;
}
