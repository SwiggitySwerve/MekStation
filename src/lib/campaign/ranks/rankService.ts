/**
 * Rank Service - Campaign rank management functions
 *
 * Provides functions for rank name resolution, officer status checks,
 * promotion/demotion operations, and time-in-rank calculations.
 *
 * All public helpers follow the two-arg pattern introduced in commit 2.6:
 *   (entry: ICampaignRosterEntry, pilot: IPilot | null, ...)
 *
 * NPC matrix (pilot === null):
 *   - getRankName      SKIP — returns empty string for NPCs
 *   - isOfficer        SKIP — returns false for NPCs
 *   - promoteToRank    SKIP — returns invalid delta for NPCs
 *   - demoteToRank     SKIP — returns invalid delta for NPCs
 *   - getTimeInRank    PROCESS — uses entry.hireDate as fallback
 *   - isRecentlyPromoted PROCESS — uses entry.lastPromotionDate
 *
 * @module campaign/ranks/rankService
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRank } from '@/types/campaign/ranks/rankTypes';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import {
  Profession,
  IRankSystem,
  isValidRankIndex,
} from '@/types/campaign/ranks/rankTypes';

// =============================================================================
// Role → Profession Mapping
// =============================================================================

const ROLE_TO_PROFESSION: ReadonlyMap<CampaignPersonnelRole, Profession> =
  new Map([
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
function resolveRankName(
  rank: IRank | undefined,
  profession: Profession,
): string {
  if (!rank) {
    return 'None';
  }
  return rank.names[profession] ?? rank.names[Profession.MEKWARRIOR] ?? 'None';
}

/**
 * Gets the display rank name for a roster entry within a rank system.
 *
 * NPC behavior: SKIP — rank nomenclature is vault-only. Returns empty string
 * when pilot is null so callers can branch on falsy rather than a sentinel.
 *
 * @param entry - The roster entry whose rank name to resolve
 * @param pilot - Vault pilot (PC case) or null (NPC case)
 * @param rankSystem - The rank system to look up names in
 * @returns The display rank name string, or '' for NPCs
 */
export function getRankName(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  rankSystem: IRankSystem,
): string {
  // Ranks are a vault-only concept — skip for NPCs
  if (pilot === null) return '';

  const rankIndex = entry.rankIndex;
  const rank = rankSystem.ranks[rankIndex];
  const profession = mapRoleToProfession(entry.primaryRole);
  return resolveRankName(rank, profession);
}

/**
 * Gets the display rank name by index and role directly.
 *
 * Useful for preview/display without a full roster entry.
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
 * Checks if a roster entry holds an officer rank.
 *
 * NPC behavior: SKIP — officer status is vault-only. Returns false for NPCs.
 *
 * @param entry - The roster entry to check
 * @param pilot - Vault pilot (PC case) or null (NPC case)
 * @param rankSystem - The rank system defining the officer cutoff
 * @returns true if the entry's rank index is at or above the officer cut
 */
export function isOfficer(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  rankSystem: IRankSystem,
): boolean {
  // Officer status is vault-only — skip for NPCs
  if (pilot === null) return false;
  return entry.rankIndex >= rankSystem.officerCut;
}

/**
 * Checks if a rank index is at officer level.
 *
 * @param rankIndex - The rank index to check
 * @param rankSystem - The rank system defining the officer cutoff
 * @returns true if the rank index is at or above the officer cut
 */
export function isOfficerByIndex(
  rankIndex: number,
  rankSystem: IRankSystem,
): boolean {
  return rankIndex >= rankSystem.officerCut;
}

// =============================================================================
// Delta-Return Type for Mutating Rank Operations
// =============================================================================

/**
 * Delta returned by promoteToRank / demoteToRank.
 *
 * Processors are pure functions — no store mutations inside helpers.
 * Callers unpack this delta and apply it to the vault (IPilot.rank) and
 * roster entry (rankIndex + lastPromotionDate) separately.
 *
 * - `vault`  is null when pilot is null (NPC) or when the operation is invalid
 * - `roster` is null when the operation is invalid
 */
export interface IRankChangeDelta {
  readonly vault: { pilotId: string; rankUpdate: { rank: string } } | null;
  readonly roster: {
    pilotId: string;
    rankIndex: number;
    lastPromotionDate?: Date;
  } | null;
  readonly valid: boolean;
  readonly reason?: string;
}

// =============================================================================
// Promotion
// =============================================================================

/**
 * Promotes a roster entry to a new (higher) rank index.
 *
 * Returns an IRankChangeDelta describing what should be written to the vault
 * and roster. The caller is responsible for applying the delta.
 *
 * NPC behavior: SKIP — rank mutations are vault-only. Returns an invalid delta
 * with reason when pilot is null.
 *
 * @param entry - The roster entry to promote
 * @param pilot - Vault pilot (PC case) or null (NPC case)
 * @param newRankIndex - The target rank index (must be higher than current)
 * @param currentDate - ISO date string for the promotion date
 * @param rankSystem - The rank system for name resolution
 * @returns IRankChangeDelta with vault/roster delta and validity info
 */
export function promoteToRank(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  newRankIndex: number,
  currentDate: string,
  rankSystem: IRankSystem,
): IRankChangeDelta {
  // Rank mutations are vault-only — skip for NPCs
  if (pilot === null) {
    return {
      vault: null,
      roster: null,
      valid: false,
      reason: 'NPC entries do not hold vault ranks',
    };
  }

  if (!isValidRankIndex(newRankIndex)) {
    return {
      vault: null,
      roster: null,
      valid: false,
      reason: 'Rank index out of range (0-50)',
    };
  }

  if (newRankIndex <= entry.rankIndex) {
    return {
      vault: null,
      roster: null,
      valid: false,
      reason: 'New rank must be higher than current rank',
    };
  }

  const newRankName = getRankNameByIndex(
    newRankIndex,
    entry.primaryRole,
    rankSystem,
  );
  const changeDate = new Date(currentDate);

  return {
    vault: { pilotId: entry.pilotId, rankUpdate: { rank: newRankName } },
    roster: {
      pilotId: entry.pilotId,
      rankIndex: newRankIndex,
      lastPromotionDate: changeDate,
    },
    valid: true,
  };
}

// =============================================================================
// Demotion
// =============================================================================

/**
 * Demotes a roster entry to a new (lower) rank index.
 *
 * Returns an IRankChangeDelta describing what should be written to the vault
 * and roster. Does NOT include lastPromotionDate in the roster delta since
 * demotion does not update promotion history.
 *
 * NPC behavior: SKIP — rank mutations are vault-only. Returns an invalid delta
 * with reason when pilot is null.
 *
 * @param entry - The roster entry to demote
 * @param pilot - Vault pilot (PC case) or null (NPC case)
 * @param newRankIndex - The target rank index (must be lower than current)
 * @param currentDate - ISO date string for the demotion date
 * @param rankSystem - The rank system for name resolution
 * @returns IRankChangeDelta with vault/roster delta and validity info
 */
export function demoteToRank(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  newRankIndex: number,
  currentDate: string,
  rankSystem: IRankSystem,
): IRankChangeDelta {
  // Rank mutations are vault-only — skip for NPCs
  if (pilot === null) {
    return {
      vault: null,
      roster: null,
      valid: false,
      reason: 'NPC entries do not hold vault ranks',
    };
  }

  if (!isValidRankIndex(newRankIndex)) {
    return {
      vault: null,
      roster: null,
      valid: false,
      reason: 'Rank index out of range (0-50)',
    };
  }

  if (newRankIndex >= entry.rankIndex) {
    return {
      vault: null,
      roster: null,
      valid: false,
      reason: 'New rank must be lower than current rank',
    };
  }

  const newRankName = getRankNameByIndex(
    newRankIndex,
    entry.primaryRole,
    rankSystem,
  );
  // Demotion does not set lastPromotionDate — only rankIndex changes in roster
  void currentDate; // date is captured in vault delta for audit purposes only

  return {
    vault: { pilotId: entry.pilotId, rankUpdate: { rank: newRankName } },
    roster: { pilotId: entry.pilotId, rankIndex: newRankIndex },
    valid: true,
  };
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
 * Calculates how long a roster entry has held their current rank.
 *
 * Uses entry.lastPromotionDate if available, otherwise falls back to
 * entry.hireDate (mirrors the old IPerson.recruitmentDate fallback).
 *
 * NPC behavior: PROCESS — hireDate is always present on roster entries so
 * time-in-rank can be derived for both NPCs and PCs.
 *
 * @param entry - The roster entry to check
 * @param _pilot - Vault pilot (unused; retained for signature consistency)
 * @param currentDate - ISO date string for the current date
 * @returns An object with days, months, years, and a formatted display string
 */
export function getTimeInRank(
  entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  currentDate: string,
): TimeInRankResult {
  // lastPromotionDate mirrors old person.lastRankChangeDate; hireDate mirrors recruitmentDate
  const startDate = entry.lastPromotionDate ?? entry.hireDate;
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
    const prevMonth = new Date(
      Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 0),
    );
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
 * Checks if a roster entry was recently promoted (within a threshold).
 *
 * NPC behavior: PROCESS — lastPromotionDate lives on the roster entry so
 * this check fires for both NPCs and PCs when the field is set.
 *
 * @param entry - The roster entry to check
 * @param _pilot - Vault pilot (unused; retained for signature consistency)
 * @param currentDate - ISO date string for the current date
 * @param monthsThreshold - Number of months to consider "recent" (default: 6)
 * @returns true if the entry was promoted within the threshold period
 */
export function isRecentlyPromoted(
  entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  currentDate: string,
  monthsThreshold: number = 6,
): boolean {
  if (!entry.lastPromotionDate) {
    return false;
  }

  const promotionDate = new Date(entry.lastPromotionDate);
  const current = new Date(currentDate);

  const thresholdDate = new Date(current);
  thresholdDate.setUTCMonth(thresholdDate.getUTCMonth() - monthsThreshold);

  return promotionDate >= thresholdDate;
}
