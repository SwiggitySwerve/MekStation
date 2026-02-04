/**
 * Skill Progression and XP Costs
 *
 * Implements skill improvement mechanics including XP cost calculation,
 * improvement validation, and skill acquisition.
 *
 * @module campaign/skills/skillProgression
 */

import { IPerson } from '@/types/campaign/Person';
import { ISkill } from '@/types/campaign/skills';
import { ICampaignOptions } from '@/types/campaign/Campaign';
import { SKILL_CATALOG } from '@/constants/campaign/skillCatalog';
import { getAttributeModifier } from '@/types/campaign/skills/IAttributes';

/**
 * Calculates the XP cost to improve a skill to the next level.
 *
 * Formula: `baseCost × xpCostMultiplier × (1 - attributeModifier × 0.05)`
 *
 * The attribute modifier reduces cost for high attributes and increases it for low ones.
 * For example, a character with DEX 8 (modifier +3) gets a 15% discount on piloting costs.
 *
 * @param skillId - The skill ID to improve
 * @param currentLevel - Current skill level (0-9, improving to 1-10)
 * @param person - The character improving the skill
 * @param options - Campaign options including xpCostMultiplier
 *
 * @returns The XP cost to improve to the next level, or Infinity if impossible
 *
 * @example
 * // Gunnery level 3→4 with default options
 * const cost = getSkillImprovementCost('gunnery', 3, person, options);
 * // cost = 16 (from catalog) × 1.0 × (1 - 0 × 0.05) = 16
 *
 * // With high DEX (8, modifier +3)
 * const cost = getSkillImprovementCost('piloting', 3, person, options);
 * // cost = 16 × 1.0 × (1 - 3 × 0.05) = 16 × 0.85 = 13.6 → 14
 */
export function getSkillImprovementCost(
  skillId: string,
  currentLevel: number,
  person: IPerson,
  options: ICampaignOptions
): number {
  const skillType = SKILL_CATALOG[skillId];
  if (!skillType) return Infinity;

  const baseCost = skillType.costs[currentLevel + 1] ?? Infinity;
  if (baseCost === Infinity) return Infinity;

  const xpMultiplier = options.xpCostMultiplier ?? 1.0;
  const attrValue = person.attributes[skillType.linkedAttribute];
  const attrMod = getAttributeModifier(attrValue);

  const cost = baseCost * xpMultiplier * (1 - attrMod * 0.05);
  return Math.max(1, Math.round(cost));
}

/**
 * Checks if a skill can be improved.
 *
 * A skill can be improved if:
 * 1. It exists on the person (or is being added at level 0)
 * 2. Current level is less than 10
 * 3. Person has enough XP for the improvement
 *
 * @param person - The character attempting improvement
 * @param skillId - The skill ID to improve
 * @param options - Campaign options
 *
 * @returns true if the skill can be improved
 *
 * @example
 * if (canImproveSkill(person, 'gunnery', options)) {
 *   const newPerson = improveSkill(person, 'gunnery', options);
 * }
 */
export function canImproveSkill(
  person: IPerson,
  skillId: string,
  options: ICampaignOptions
): boolean {
  const skill = person.skills[skillId];

  if (!skill) {
    return false;
  }

  if (skill.level >= 10) {
    return false;
  }

  const cost = getSkillImprovementCost(skillId, skill.level, person, options);
  return person.xp >= cost;
}

/**
 * Improves a skill by one level, deducting XP from the person.
 *
 * Returns a new IPerson with:
 * - Skill level incremented by 1
 * - XP deducted by the improvement cost
 * - xpSpent incremented by the cost
 *
 * @param person - The character improving the skill
 * @param skillId - The skill ID to improve
 * @param options - Campaign options
 *
 * @returns A new IPerson with the improved skill
 *
 * @throws Error if the skill doesn't exist or can't be improved
 *
 * @example
 * const newPerson = improveSkill(person, 'gunnery', options);
 * // person.skills.gunnery.level: 4 → 5
 * // person.xp: 500 → 484 (cost 16)
 * // person.xpSpent: 1000 → 1016
 */
export function improveSkill(
  person: IPerson,
  skillId: string,
  options: ICampaignOptions
): IPerson {
  const skill = person.skills[skillId];

  if (!skill) {
    throw new Error(`Skill ${skillId} not found on person ${person.id}`);
  }

  if (skill.level >= 10) {
    throw new Error(
      `Skill ${skillId} is already at maximum level (10) for person ${person.id}`
    );
  }

  const cost = getSkillImprovementCost(skillId, skill.level, person, options);

  if (person.xp < cost) {
    throw new Error(
      `Insufficient XP to improve ${skillId}. Need ${cost}, have ${person.xp}`
    );
  }

  const improvedSkill: ISkill = {
    ...skill,
    level: skill.level + 1,
  };

  return {
    ...person,
    skills: {
      ...person.skills,
      [skillId]: improvedSkill,
    },
    xp: person.xp - cost,
    xpSpent: person.xpSpent + cost,
  };
}

/**
 * Adds a new skill to a person at the specified initial level.
 *
 * Returns a new IPerson with the skill added.
 *
 * @param person - The character acquiring the skill
 * @param skillId - The skill ID to add
 * @param initialLevel - Initial skill level (typically 1)
 *
 * @returns A new IPerson with the skill added
 *
 * @throws Error if the skill already exists or initialLevel is invalid
 *
 * @example
 * const newPerson = addSkill(person, 'gunnery', 1);
 * // person.skills.gunnery: undefined → { level: 1, bonus: 0, xpProgress: 0, typeId: 'gunnery' }
 */
export function addSkill(
  person: IPerson,
  skillId: string,
  initialLevel: number
): IPerson {
  if (person.skills[skillId]) {
    throw new Error(
      `Skill ${skillId} already exists on person ${person.id}`
    );
  }

  if (initialLevel < 0 || initialLevel > 10) {
    throw new Error(
      `Invalid initial skill level: ${initialLevel}. Must be between 0 and 10.`
    );
  }

  const skillType = SKILL_CATALOG[skillId];
  if (!skillType) {
    throw new Error(`Unknown skill: ${skillId}`);
  }

  const newSkill: ISkill = {
    level: initialLevel,
    bonus: 0,
    xpProgress: 0,
    typeId: skillId,
  };

  return {
    ...person,
    skills: {
      ...person.skills,
      [skillId]: newSkill,
    },
  };
}
