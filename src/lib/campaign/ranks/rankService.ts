/**
 * Rank Service - Campaign rank management functions
 *
 * Provides functions for rank name resolution, officer status checks,
 * promotion/demotion operations, and time-in-rank calculations.
 *
 * @module campaign/ranks/rankService
 */

import {
  Profession,
  IRankSystem,
  isValidRankIndex,
} from '@/types/campaign/ranks/rankTypes';
import type { IRank } from '@/types/campaign/ranks/rankTypes';
import type { IPerson } from '@/types/campaign/Person';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

// =============================================================================
// Role → Profession Mapping
// =============================================================================

const ROLE_TO_PROFESSION: ReadonlyMap<CampaignPersonnelRole, Profession> = new Map([
  // MekWarrior
  [CampaignPersonnelRole.PILOT, Profession.MEKWARRIOR],
  [CampaignPersonnelRole.LAM_PILOT, Profession.MEKWARRIOR],
  [CampaignPersonnelRole.PROTOMEK_PILOT, Profession.MEKWARRIOR],

  // Aerospace
  [CampaignPersonnelRole.AEROSPACE_PILOT, Profession.AEROSPACE],
  [CampaignPersonnelRole.CONVENTIONAL_AIRCRAFT_PILOT, Profession.AEROSPACE],

  // Vehicle
  [CampaignPersonnelRole.VEHICLE_DRIVER, Profession.VEHICLE],
  [CampaignPersonnelRole.VEHICLE_CREW_VTOL, Profession.VEHICLE],

  // Naval
  [CampaignPersonnelRole.VEHICLE_CREW_NAVAL, Profession.NAVAL],
  [CampaignPersonnelRole.VESSEL_PILOT, Profession.NAVAL],
  [CampaignPersonnelRole.VESSEL_GUNNER, Profession.NAVAL],
  [CampaignPersonnelRole.VESSEL_CREW, Profession.NAVAL],
  [CampaignPersonnelRole.VESSEL_NAVIGATOR, Profession.NAVAL],

  // Infantry
  [CampaignPersonnelRole.BATTLE_ARMOUR, Profession.INFANTRY],
  [CampaignPersonnelRole.SOLDIER, Profession.INFANTRY],

  // Tech
  [CampaignPersonnelRole.TECH, Profession.TECH],
  [CampaignPersonnelRole.MEK_TECH, Profession.TECH],
  [CampaignPersonnelRole.MECHANIC, Profession.TECH],
  [CampaignPersonnelRole.AERO_TEK, Profession.TECH],
  [CampaignPersonnelRole.BA_TECH, Profession.TECH],
  [CampaignPersonnelRole.ASTECH, Profession.TECH],

  // Medical
  [CampaignPersonnelRole.DOCTOR, Profession.MEDICAL],
  [CampaignPersonnelRole.MEDIC, Profession.MEDICAL],

  // Administrator
  [CampaignPersonnelRole.ADMIN_COMMAND, Profession.ADMINISTRATOR],
  [CampaignPersonnelRole.ADMIN_LOGISTICS, Profession.ADMINISTRATOR],
  [CampaignPersonnelRole.ADMIN_TRANSPORT, Profession.ADMINISTRATOR],
  [CampaignPersonnelRole.ADMIN_HR, Profession.ADMINISTRATOR],
  [CampaignPersonnelRole.ADMIN, Profession.ADMINISTRATOR],
]);

/**
 * Maps a CampaignPersonnelRole to its corresponding Profession.
 *
 * Used to determine which rank name column to use for a given person.
 * Unmapped roles (civilians, support staff, unassigned) default to CIVILIAN.
 *
 * @param role - The personnel role to map
 * @returns The corresponding Profession enum value
 */
export function mapRoleToProfession(role: CampaignPersonnelRole): Profession {
  return ROLE_TO_PROFESSION.get(role) ?? Profession.CIVILIAN;
}

// =============================================================================
// Rank Name Resolution
// =============================================================================

/**
 * Resolves the display name for a rank entry given a profession.
 *
 * Falls back to the MekWarrior name if the profession-specific name is not set,
 * then falls back to 'None' if no name is available at all.
 */
function resolveRankName(rank: IRank | undefined, profession: Profession): string {
  if (!rank) {
    return 'None';
  }
  return rank.names[profession] ?? rank.names[Profession.MEKWARRIOR] ?? 'None';
}

/**
 * Gets the display rank name for a person within a rank system.
 *
 * @param person - The person whose rank name to resolve
 * @param rankSystem - The rank system to look up names in
 * @returns The display rank name string
 */
export function getRankName(person: IPerson, rankSystem: IRankSystem): string {
  const rankIndex = person.rankIndex ?? 0;
  const rank = rankSystem.ranks[rankIndex];
  const profession = mapRoleToProfession(person.primaryRole);
  return resolveRankName(rank, profession);
}

/**
 * Gets the display rank name by index and role directly.
 *
 * Useful for preview/display without a full IPerson object.
 *
 * @param rankIndex - The rank index (0-50)
 * @param role - The personnel role for profession mapping
 * @param rankSystem - The rank system to look up names in
 * @returns The display rank name string
 */
export function getRankNameByIndex(
  rankIndex: number,
  role: CampaignPersonnelRole,
  rankSystem: IRankSystem,
): string {
  const rank = rankSystem.ranks[rankIndex];
  const profession = mapRoleToProfession(role);
  return resolveRankName(rank, profession);
}

// =============================================================================
// Officer Status
// =============================================================================

/**
 * Checks if a person holds an officer rank.
 *
 * @param person - The person to check
 * @param rankSystem - The rank system defining the officer cutoff
 * @returns true if the person's rank index is at or above the officer cut
 */
export function isOfficer(person: IPerson, rankSystem: IRankSystem): boolean {
  return (person.rankIndex ?? 0) >= rankSystem.officerCut;
}

/**
 * Checks if a rank index is at officer level.
 *
 * @param rankIndex - The rank index to check
 * @param rankSystem - The rank system defining the officer cutoff
 * @returns true if the rank index is at or above the officer cut
 */
export function isOfficerByIndex(rankIndex: number, rankSystem: IRankSystem): boolean {
  return rankIndex >= rankSystem.officerCut;
}

// =============================================================================
// Promotion / Demotion Result Type
// =============================================================================

export interface RankChangeResult {
  readonly updatedPerson: IPerson;
  readonly valid: boolean;
  readonly reason?: string;
}

// =============================================================================
// Promotion
// =============================================================================

/**
 * Promotes a person to a new (higher) rank index.
 *
 * Validates the new rank index and ensures it is higher than the current rank.
 * On success, updates the person's rankIndex, rank display name,
 * lastRankChangeDate, and lastPromotionDate.
 *
 * @param person - The person to promote
 * @param newRankIndex - The target rank index (must be higher than current)
 * @param currentDate - ISO date string for the promotion date
 * @param rankSystem - The rank system for name resolution
 * @returns A RankChangeResult with the updated person and validity info
 */
export function promoteToRank(
  person: IPerson,
  newRankIndex: number,
  currentDate: string,
  rankSystem: IRankSystem,
): RankChangeResult {
  if (!isValidRankIndex(newRankIndex)) {
    return { updatedPerson: person, valid: false, reason: 'Rank index out of range (0-50)' };
  }

  const currentRankIndex = person.rankIndex ?? 0;
  if (newRankIndex <= currentRankIndex) {
    return { updatedPerson: person, valid: false, reason: 'New rank must be higher than current rank' };
  }

  const newRankName = getRankNameByIndex(newRankIndex, person.primaryRole, rankSystem);
  const changeDate = new Date(currentDate);

  const updatedPerson: IPerson = {
    ...person,
    rankIndex: newRankIndex,
    rank: newRankName,
    lastRankChangeDate: changeDate,
    lastPromotionDate: changeDate,
  };

  return { updatedPerson, valid: true };
}

// =============================================================================
// Demotion
// =============================================================================

/**
 * Demotes a person to a new (lower) rank index.
 *
 * Validates the new rank index and ensures it is lower than the current rank.
 * On success, updates the person's rankIndex, rank display name, and
 * lastRankChangeDate. Does NOT update lastPromotionDate on demotion.
 *
 * @param person - The person to demote
 * @param newRankIndex - The target rank index (must be lower than current)
 * @param currentDate - ISO date string for the demotion date
 * @param rankSystem - The rank system for name resolution
 * @returns A RankChangeResult with the updated person and validity info
 */
export function demoteToRank(
  person: IPerson,
  newRankIndex: number,
  currentDate: string,
  rankSystem: IRankSystem,
): RankChangeResult {
  if (!isValidRankIndex(newRankIndex)) {
    return { updatedPerson: person, valid: false, reason: 'Rank index out of range (0-50)' };
  }

  const currentRankIndex = person.rankIndex ?? 0;
  if (newRankIndex >= currentRankIndex) {
    return { updatedPerson: person, valid: false, reason: 'New rank must be lower than current rank' };
  }

  const newRankName = getRankNameByIndex(newRankIndex, person.primaryRole, rankSystem);
  const changeDate = new Date(currentDate);

  const updatedPerson: IPerson = {
    ...person,
    rankIndex: newRankIndex,
    rank: newRankName,
    lastRankChangeDate: changeDate,
  };

  return { updatedPerson, valid: true };
}

// =============================================================================
// Time in Rank
// =============================================================================

export interface TimeInRankResult {
  readonly days: number;
  readonly months: number;
  readonly years: number;
  readonly display: string;
}

/**
 * Calculates how long a person has held their current rank.
 *
 * Uses lastRankChangeDate if available, otherwise falls back to recruitmentDate.
 *
 * @param person - The person to check
 * @param currentDate - ISO date string for the current date
 * @returns An object with days, months, years, and a formatted display string
 */
export function getTimeInRank(person: IPerson, currentDate: string): TimeInRankResult {
  const startDate = person.lastRankChangeDate ?? person.recruitmentDate;
  const endDate = new Date(currentDate);
  const start = new Date(startDate);

  const totalMs = endDate.getTime() - start.getTime();
  const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  // Use UTC methods to avoid timezone shifts with ISO date strings
  let years = endDate.getUTCFullYear() - start.getUTCFullYear();
  let months = endDate.getUTCMonth() - start.getUTCMonth();
  let days = endDate.getUTCDate() - start.getUTCDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 0));
    days += prevMonth.getUTCDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let display: string;
  if (years > 0) {
    display = `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
  } else if (months > 0) {
    display = `${months} month${months !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`;
  } else {
    display = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
  }

  return { days: totalDays, months, years, display };
}

// =============================================================================
// Recently Promoted Check
// =============================================================================

/**
 * Checks if a person was recently promoted (within a threshold).
 *
 * @param person - The person to check
 * @param currentDate - ISO date string for the current date
 * @param monthsThreshold - Number of months to consider "recent" (default: 6)
 * @returns true if the person was promoted within the threshold period
 */
export function isRecentlyPromoted(
  person: IPerson,
  currentDate: string,
  monthsThreshold: number = 6,
): boolean {
  if (!person.lastPromotionDate) {
    return false;
  }

  const promotionDate = new Date(person.lastPromotionDate);
  const current = new Date(currentDate);

  const thresholdDate = new Date(current);
  thresholdDate.setUTCMonth(thresholdDate.getUTCMonth() - monthsThreshold);

  return promotionDate >= thresholdDate;
}
