/**
 * Skill Helper Functions for Cross-Plan Integration
 *
 * Provides utility functions for accessing and evaluating character skills
 * across different campaign plans. These helpers abstract skill lookup and
 * calculation logic for use by other systems.
 *
 * @module campaign/skills/skillHelpers
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { SKILL_CATALOG } from '@/constants/campaign/skillCatalog';

export function getPilotSkillValue(
  pilot: IPilot,
  skillId: string,
): number | undefined {
  if (skillId === 'gunnery' || skillId === 'piloting') {
    return pilot.skills[skillId];
  }

  return undefined;
}

/**
 * Gets the skill desirability modifier for a roster entry.
 *
 * Used by Plan 2 (Turnover) to determine how desirable a person is
 * for retention. Higher skill levels increase desirability.
 *
 * Calculation: Sum of all pilot combat skill values (gunnery + piloting).
 *
 * NPC behavior: SKIP — returns 0 when pilot is null. Skill desirability is
 * vault-only since NPC skill identity lives on statblockData, not a vault IPilot.
 *
 * @stub Plan 7 — IPilot.skills only carries gunnery/piloting today. When the
 * vault gains a full skill catalog the sum will cover all skill levels.
 *
 * @param _entry - The roster entry (reserved for future role-weighted desirability)
 * @param pilot - The vault pilot (null for NPCs)
 * @returns The total desirability modifier (0 if no pilot or no skills)
 *
 * @example
 * // Pilot with gunnery 4 and piloting 5
 * const modifier = getSkillDesirabilityModifier(entry, pilot);
 * // modifier = 4 + 5 = 9
 */
export function getSkillDesirabilityModifier(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
): number {
  // NPC SKIP: vault-only operation
  if (pilot === null) return 0;

  // Sum the available combat skill values. IPilot.skills only has gunnery +
  // piloting today; this will expand in Plan 7 when the full skill catalog lands.
  return pilot.skills.gunnery + pilot.skills.piloting;
}

/**
 * Gets the effective tech skill value for a roster entry.
 *
 * Used by Plan 3 (Repair) to determine repair capability.
 * Returns the highest tech-related skill value, or 10 (unskilled) if none.
 *
 * Tech skills checked: tech-mech, tech-vehicle, tech-aerospace, astech
 *
 * NPC behavior: SKIP — returns 10 (unskilled) when pilot is null.
 *
 * @stub Plan 7 — IPilot.skills only carries gunnery/piloting today. Tech skills
 * are not yet stored on the vault IPilot; returns 10 (unskilled) until then.
 *
 * @param _entry - The roster entry (reserved for future use)
 * @param pilot - The vault pilot (null for NPCs)
 * @returns The tech skill value (0-10), or 10 if unskilled
 *
 * @example
 * // Pilot with no tech skills (current stub behavior)
 * const value = getTechSkillValue(entry, pilot);
 * // value = 10 (unskilled penalty)
 */
export function getTechSkillValue(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
): number {
  // NPC SKIP: vault-only operation
  if (pilot === null) return 10;

  // @stub Plan 7 — IPilot.skills has no tech skill fields yet.
  // When Plan 7 lands, iterate tech skill IDs and return min value via SKILL_CATALOG.
  // Until then, all pilots are treated as unskilled for tech purposes.
  void SKILL_CATALOG; // keep import alive for Plan 7 implementation
  return 10;
}

/**
 * Gets the effective admin skill value for a roster entry.
 *
 * Used by Plan 4 (Financial) for HR and administrative tasks.
 * Returns the administration skill value, or 10 (unskilled) if missing.
 *
 * NPC behavior: SKIP — returns 10 (unskilled) when pilot is null.
 *
 * @stub Plan 7 — IPilot.skills only carries gunnery/piloting today. The
 * administration skill is not yet stored on the vault IPilot; returns 10 until then.
 *
 * @param _entry - The roster entry (reserved for future use)
 * @param pilot - The vault pilot (null for NPCs)
 * @returns The admin skill value (0-10), or 10 if unskilled
 *
 * @example
 * // Pilot with no admin skill (current stub behavior)
 * const value = getAdminSkillValue(entry, pilot);
 * // value = 10 (unskilled)
 */
export function getAdminSkillValue(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
): number {
  // NPC SKIP: vault-only operation
  if (pilot === null) return 10;

  // @stub Plan 7 — IPilot.skills has no administration field yet.
  // When Plan 7 lands: read pilot.skills.administration and compute via SKILL_CATALOG.
  return 10;
}

/**
 * Gets the effective medicine skill value for a roster entry.
 *
 * Used by Plan 8 (Medical) for medical treatment and healing.
 * Returns the medicine skill value, or 10 (unskilled) if missing.
 *
 * NPC behavior: SKIP — returns 10 (unskilled) when pilot is null.
 *
 * @stub Plan 7 — IPilot.skills only carries gunnery/piloting today. The
 * medicine skill is not yet stored on the vault IPilot; returns 10 until then.
 *
 * @param _entry - The roster entry (reserved for future use)
 * @param pilot - The vault pilot (null for NPCs)
 * @returns The medicine skill value (0-10), or 10 if unskilled
 *
 * @example
 * // Pilot with no medicine skill (current stub behavior)
 * const value = getMedicineSkillValue(entry, pilot);
 * // value = 10 (unskilled)
 */
export function getMedicineSkillValue(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
): number {
  // NPC SKIP: vault-only operation
  if (pilot === null) return 10;

  // @stub Plan 7 — IPilot.skills has no medicine field yet.
  // When Plan 7 lands: read pilot.skills.medicine and compute via SKILL_CATALOG.
  return 10;
}

/**
 * Gets the negotiation modifier for a roster entry.
 *
 * Used by Plan 9 (Acquisition) for equipment negotiation and trading.
 * Returns the negotiation skill value, or 10 (unskilled) if missing.
 *
 * NPC behavior: SKIP — returns 10 (unskilled) when pilot is null.
 *
 * @stub Plan 7 — IPilot.skills only carries gunnery/piloting today. The
 * negotiation skill is not yet stored on the vault IPilot; returns 10 until then.
 *
 * @param _entry - The roster entry (reserved for future use)
 * @param pilot - The vault pilot (null for NPCs)
 * @returns The negotiation modifier (0-10), or 10 if unskilled
 *
 * @example
 * // Pilot with no negotiation skill (current stub behavior)
 * const modifier = getNegotiationModifier(entry, pilot);
 * // modifier = 10 (unskilled)
 */
export function getNegotiationModifier(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
): number {
  // NPC SKIP: vault-only operation
  if (pilot === null) return 10;

  // @stub Plan 7 — IPilot.skills has no negotiation field yet.
  // When Plan 7 lands: read pilot.skills.negotiation and compute via SKILL_CATALOG.
  return 10;
}

/**
 * Gets the leadership skill value for a roster entry.
 *
 * Used by Plan 15 (Ranks) for command and leadership effectiveness.
 * Returns the leadership skill value, or 10 (unskilled) if missing.
 *
 * NPC behavior: SKIP — returns 10 (unskilled) when pilot is null.
 *
 * @stub Plan 7 — IPilot.skills only carries gunnery/piloting today. The
 * leadership skill is not yet stored on the vault IPilot; returns 10 until then.
 *
 * @param _entry - The roster entry (reserved for future use)
 * @param pilot - The vault pilot (null for NPCs)
 * @returns The leadership skill value (0-10), or 10 if unskilled
 *
 * @example
 * // Pilot with no leadership skill (current stub behavior)
 * const value = getLeadershipSkillValue(entry, pilot);
 * // value = 10 (unskilled)
 */
export function getLeadershipSkillValue(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
): number {
  // NPC SKIP: vault-only operation
  if (pilot === null) return 10;

  // @stub Plan 7 — IPilot.skills has no leadership field yet.
  // When Plan 7 lands: read pilot.skills.leadership and compute via SKILL_CATALOG.
  return 10;
}

/**
 * Checks if a pilot has a specific combat skill by ID.
 *
 * Generic helper for checking skill existence. Only combat skills present on
 * IPilotSkills (gunnery, piloting) return true until Plan 7 expands the vault.
 *
 * NPC behavior: SKIP — returns false when pilot is null.
 *
 * @stub Plan 7 — IPilot.skills only carries gunnery/piloting today. When the
 * vault gains a full skill catalog, this will check any skill ID.
 *
 * @param _entry - The roster entry (reserved for future use)
 * @param pilot - The vault pilot (null for NPCs)
 * @param skillId - The skill ID to look for
 * @returns true if the pilot has the skill, false otherwise
 *
 * @example
 * if (hasSkill(entry, pilot, 'gunnery')) {
 *   logger.debug('Pilot is a gunner');
 * }
 */
export function hasSkill(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  skillId: string,
): boolean {
  // NPC SKIP: vault-only operation
  if (pilot === null) return false;

  // Only gunnery and piloting exist on IPilot.skills today.
  // Plan 7 will expand this to check the full skill catalog.
  return skillId in pilot.skills;
}

/**
 * Gets the skill level for a pilot by skill ID.
 *
 * Generic helper for retrieving skill level. Only combat skills present on
 * IPilotSkills (gunnery, piloting) return a real value today.
 *
 * NPC behavior: SKIP — returns -1 when pilot is null.
 *
 * @stub Plan 7 — IPilot.skills only carries gunnery/piloting today. When the
 * vault gains a full skill catalog, this will look up any skill ID.
 *
 * @param _entry - The roster entry (reserved for future use)
 * @param pilot - The vault pilot (null for NPCs)
 * @param skillId - The skill ID to look up
 * @returns The skill level (0-10), or -1 if the skill is not found
 *
 * @example
 * const level = getPersonSkillLevel(entry, pilot, 'gunnery');
 * if (level === -1) {
 *   logger.debug('Pilot does not have gunnery skill');
 * } else {
 *   logger.debug(`Gunnery level: ${level}`);
 * }
 */
export function getPersonSkillLevel(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  skillId: string,
): number {
  // NPC SKIP: vault-only operation
  if (pilot === null) return -1;

  // Read from IPilotSkills: only gunnery and piloting are available today.
  const skillValue = getPilotSkillValue(pilot, skillId);
  return skillValue !== undefined ? skillValue : -1;
}

/**
 * Gets the best combat skill for a pilot.
 *
 * Finds the highest-value combat skill (gunnery, piloting).
 * Returns null if the pilot has no combat skills.
 *
 * NPC behavior: SKIP — returns null when pilot is null.
 *
 * @stub Plan 7 — IPilot.skills only carries gunnery/piloting today. When the
 * vault gains a full skill catalog, all combat skill types will be checked.
 *
 * @param _entry - The roster entry (reserved for future use)
 * @param pilot - The vault pilot (null for NPCs)
 * @returns Object with skillId and level, or null if no pilot
 *
 * @example
 * const best = getPersonBestCombatSkill(entry, pilot);
 * if (best) {
 *   logger.debug(`Best combat skill: ${best.skillId} at level ${best.level}`);
 * } else {
 *   logger.debug('No combat skills (NPC or no pilot)');
 * }
 */
export function getPersonBestCombatSkill(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
): { skillId: string; level: number } | null {
  // NPC SKIP: vault-only operation
  if (pilot === null) return null;

  // Compare gunnery vs piloting from IPilotSkills. Plan 7 will expand this to
  // iterate the full combat skill catalog (gunnery-aerospace, driving, etc.).
  const { gunnery, piloting } = pilot.skills;
  if (gunnery >= piloting) {
    return { skillId: 'gunnery', level: gunnery };
  }
  return { skillId: 'piloting', level: piloting };
}
