/**
 * Skill Progression and XP Costs
 *
 * Implements skill improvement mechanics including XP cost calculation,
 * improvement validation, and skill acquisition.
 *
 * @module campaign/skills/skillProgression
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { SKILL_CATALOG } from '@/constants/campaign/skillCatalog';
import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IPerson } from '@/types/campaign/Person';
import { ISkill } from '@/types/campaign/skills';
import { getAttributeModifier } from '@/types/campaign/skills/IAttributes';

// ---------------------------------------------------------------------------
// Delta interfaces — callers apply these to their own state stores instead of
// receiving a mutated IPerson back. Plan 7 will expand vault.skillUpdates to
// cover the full skill catalog once IPilot carries more than gunnery/piloting.
// ---------------------------------------------------------------------------

/**
 * Delta produced by improveSkill.
 *
 * vault carries the pilotId and the updated skill values to write to the vault.
 * roster carries the XP deduction to apply to the roster entry.
 *
 * Either field may be null when the pilot is null (NPC SKIP).
 */
export interface IImproveSkillDelta {
  /** Vault update: which pilot and what skill fields changed. Null for NPCs. */
  readonly vault: {
    readonly pilotId: string;
    /** Partial<IPilotSkills>-shaped map — only gunnery/piloting today. */
    readonly skillUpdates: Record<string, number>;
  } | null;
  /** Roster update: XP deduction. Null for NPCs. */
  readonly roster: {
    readonly pilotId: string;
    /** Amount of XP spent (positive integer). */
    readonly xpDelta: number;
  } | null;
}

/**
 * Delta produced by addSkill.
 *
 * vault carries the pilotId and the new ISkill record to add.
 * roster carries any initial XP cost (typically 0 for addSkill).
 *
 * Either field may be null when the pilot is null (NPC SKIP).
 */
export interface IAddSkillDelta {
  /** Vault update: which pilot and the new skill record to add. Null for NPCs. */
  readonly vault: {
    readonly pilotId: string;
    /** The full ISkill record being added. */
    readonly newSkill: ISkill;
    readonly skillId: string;
  } | null;
  /** Roster update: reserved for future cost-on-acquisition scenarios. Null for NPCs. */
  readonly roster: null;
}

// ---------------------------------------------------------------------------
// Core helpers — still IPerson-based for attribute/XP math
// ---------------------------------------------------------------------------

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
  options: ICampaignOptions,
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
 *   const delta = improveSkill(entry, pilot, person, 'gunnery', options);
 * }
 */
export function canImproveSkill(
  person: IPerson,
  skillId: string,
  options: ICampaignOptions,
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
 * Improves a skill by one level, returning a delta instead of a mutated IPerson.
 *
 * The caller is responsible for applying the delta to their store. The vault
 * delta carries the updated skill value; the roster delta carries the XP cost.
 *
 * NPC behavior: SKIP — returns { vault: null, roster: null } when pilot is null.
 *
 * @stub Plan 7 — vault.skillUpdates only covers gunnery/piloting today. When
 * IPilot gains a full skill catalog the map will include any skill ID.
 *
 * @param _entry - The roster entry (reserved for future role-weighted costs)
 * @param pilot - The vault pilot (null for NPCs)
 * @param person - The character improving the skill (used for attribute/XP math)
 * @param skillId - The skill ID to improve
 * @param options - Campaign options
 *
 * @returns IImproveSkillDelta with vault and roster updates, or nulls for NPCs
 *
 * @throws Error if the skill doesn't exist or can't be improved
 *
 * @example
 * const delta = improveSkill(entry, pilot, person, 'gunnery', options);
 * if (delta.vault) {
 *   applyVaultSkillUpdates(delta.vault.pilotId, delta.vault.skillUpdates);
 * }
 * if (delta.roster) {
 *   applyRosterXpDeduction(delta.roster.pilotId, delta.roster.xpDelta);
 * }
 */
export function improveSkill(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  person: IPerson,
  skillId: string,
  options: ICampaignOptions,
): IImproveSkillDelta {
  // NPC SKIP: no vault pilot to update
  if (pilot === null) {
    return { vault: null, roster: null };
  }

  const skill = person.skills[skillId];

  if (!skill) {
    throw new Error(`Skill ${skillId} not found on person ${person.id}`);
  }

  if (skill.level >= 10) {
    throw new Error(
      `Skill ${skillId} is already at maximum level (10) for person ${person.id}`,
    );
  }

  const cost = getSkillImprovementCost(skillId, skill.level, person, options);

  if (person.xp < cost) {
    throw new Error(
      `Insufficient XP to improve ${skillId}. Need ${cost}, have ${person.xp}`,
    );
  }

  const newLevel = skill.level + 1;

  return {
    vault: {
      pilotId: pilot.id,
      // @stub Plan 7 — only gunnery/piloting exist on IPilotSkills today.
      // When Plan 7 expands IPilot, this map will cover all skill IDs.
      skillUpdates: { [skillId]: newLevel },
    },
    roster: {
      pilotId: pilot.id,
      xpDelta: cost,
    },
  };
}

/**
 * Adds a new skill to a person, returning a delta instead of a mutated IPerson.
 *
 * NPC behavior: SKIP — returns { vault: null, roster: null } when pilot is null.
 *
 * @param _entry - The roster entry (reserved for future use)
 * @param pilot - The vault pilot (null for NPCs)
 * @param person - The character acquiring the skill
 * @param skillId - The skill ID to add
 * @param initialLevel - Initial skill level (typically 1)
 *
 * @returns IAddSkillDelta with vault update, or nulls for NPCs
 *
 * @throws Error if the skill already exists or initialLevel is invalid
 *
 * @example
 * const delta = addSkill(entry, pilot, person, 'gunnery', 1);
 * if (delta.vault) {
 *   applyVaultNewSkill(delta.vault.pilotId, delta.vault.skillId, delta.vault.newSkill);
 * }
 */
export function addSkill(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  person: IPerson,
  skillId: string,
  initialLevel: number,
): IAddSkillDelta {
  // NPC SKIP: no vault pilot to update
  if (pilot === null) {
    return { vault: null, roster: null };
  }

  if (person.skills[skillId]) {
    throw new Error(`Skill ${skillId} already exists on person ${person.id}`);
  }

  if (initialLevel < 0 || initialLevel > 10) {
    throw new Error(
      `Invalid initial skill level: ${initialLevel}. Must be between 0 and 10.`,
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
    vault: {
      pilotId: pilot.id,
      skillId,
      newSkill,
    },
    roster: null,
  };
}
