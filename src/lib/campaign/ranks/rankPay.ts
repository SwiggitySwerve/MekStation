/**
 * Rank Pay Functions - Campaign salary and officer share calculations
 *
 * Provides functions for calculating salary multipliers based on rank,
 * monthly salary with rank adjustments, and officer profit shares.
 *
 * @module campaign/ranks/rankPay
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRankSystem } from '@/types/campaign/ranks/rankTypes';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { isOfficer } from '@/lib/campaign/ranks/rankService';

/**
 * Gets the pay multiplier for a roster entry based on their rank.
 *
 * Returns the payMultiplier from the rank at entry.rankIndex.
 * If the rank is undefined or has a payMultiplier <= 0, returns 1.0.
 *
 * NPC behavior: PROCESS — rankIndex is on the roster entry so NPCs and PCs
 * get the same pay multiplier lookup.
 *
 * @param entry - The roster entry whose pay multiplier to calculate
 * @param _pilot - Vault pilot (unused; rankIndex lives on entry)
 * @param rankSystem - The rank system containing rank definitions
 * @returns The pay multiplier (default 1.0)
 *
 * @example
 * getRankPayMultiplier(entry, pilot, rankSystem) // 1.1 for Sergeant
 * getRankPayMultiplier(entry, pilot, rankSystem) // 2.0 for Colonel
 */
export function getRankPayMultiplier(
  entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  rankSystem: IRankSystem,
): number {
  const rank = rankSystem.ranks[entry.rankIndex];

  if (!rank || rank.payMultiplier <= 0) {
    return 1.0;
  }

  return rank.payMultiplier;
}

/**
 * Calculates monthly salary with rank adjustment.
 *
 * Multiplies the base salary by the rank pay multiplier and rounds to nearest integer.
 * Note: This function takes baseSalary as a parameter. When Plan 4 salary calculation
 * is built, this will be integrated with role-based salary lookups.
 *
 * NPC behavior: PROCESS — rankIndex is on the roster entry.
 *
 * @param baseSalary - The base monthly salary before rank adjustment
 * @param entry - The roster entry whose salary to calculate
 * @param pilot - Vault pilot (passed through to getRankPayMultiplier)
 * @param rankSystem - The rank system for rank pay multiplier lookup
 * @returns The monthly salary rounded to nearest integer
 *
 * @example
 * getPersonMonthlySalaryWithRank(1000, entry, pilot, rankSystem) // 1100 for Sergeant
 * getPersonMonthlySalaryWithRank(2000, entry, pilot, rankSystem) // 4000 for Colonel
 */
export function getPersonMonthlySalaryWithRank(
  baseSalary: number,
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  rankSystem: IRankSystem,
): number {
  return Math.round(
    baseSalary * getRankPayMultiplier(entry, pilot, rankSystem),
  );
}

/**
 * Calculates the number of profit shares an officer receives.
 *
 * Non-officers receive 0 shares. Officers receive shares based on their rank:
 * - First officer rank (at officerCut) = 1 share
 * - Each rank above officerCut = +1 share
 *
 * Formula: (rankIndex - officerCut) + 1
 *
 * NPC behavior: SKIP — `isOfficer` returns false for NPCs (pilot === null),
 * so NPCs always receive 0 shares.
 *
 * @param entry - The roster entry whose officer shares to calculate
 * @param pilot - Vault pilot (null for NPCs; NPCs always return 0)
 * @param rankSystem - The rank system defining officer status and cut
 * @returns The number of profit shares (0 for non-officers and NPCs)
 *
 * @example
 * getOfficerShares(entry, pilot, rankSystem) // 0 for enlisted
 * getOfficerShares(entry, pilot, rankSystem) // 1 for Lieutenant (at officerCut)
 * getOfficerShares(entry, pilot, rankSystem) // 5 for Captain (4 ranks above officerCut)
 */
export function getOfficerShares(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  rankSystem: IRankSystem,
): number {
  if (!isOfficer(entry, pilot, rankSystem)) {
    return 0;
  }

  return entry.rankIndex - rankSystem.officerCut + 1;
}
