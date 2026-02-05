/**
 * Rank Pay Functions - Campaign salary and officer share calculations
 *
 * Provides functions for calculating salary multipliers based on rank,
 * monthly salary with rank adjustments, and officer profit shares.
 *
 * @module campaign/ranks/rankPay
 */

import type { IPerson } from '@/types/campaign/Person';
import type { IRankSystem } from '@/types/campaign/ranks/rankTypes';

import { isOfficer } from '@/lib/campaign/ranks/rankService';

/**
 * Gets the pay multiplier for a person based on their rank.
 *
 * Returns the payMultiplier from the rank at the person's rankIndex.
 * If the rank is undefined or has a payMultiplier <= 0, returns 1.0.
 *
 * @param person - The person whose pay multiplier to calculate
 * @param rankSystem - The rank system containing rank definitions
 * @returns The pay multiplier (default 1.0)
 *
 * @example
 * getRankPayMultiplier(person, rankSystem) // 1.1 for Sergeant
 * getRankPayMultiplier(person, rankSystem) // 2.0 for Colonel
 */
export function getRankPayMultiplier(
  person: IPerson,
  rankSystem: IRankSystem,
): number {
  const rankIndex = person.rankIndex ?? 0;
  const rank = rankSystem.ranks[rankIndex];

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
 * @param baseSalary - The base monthly salary before rank adjustment
 * @param person - The person whose salary to calculate
 * @param rankSystem - The rank system for rank pay multiplier lookup
 * @returns The monthly salary rounded to nearest integer
 *
 * @example
 * getPersonMonthlySalaryWithRank(1000, person, rankSystem) // 1100 for Sergeant
 * getPersonMonthlySalaryWithRank(2000, person, rankSystem) // 4000 for Colonel
 */
export function getPersonMonthlySalaryWithRank(
  baseSalary: number,
  person: IPerson,
  rankSystem: IRankSystem,
): number {
  return Math.round(baseSalary * getRankPayMultiplier(person, rankSystem));
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
 * @param person - The person whose officer shares to calculate
 * @param rankSystem - The rank system defining officer status and cut
 * @returns The number of profit shares (0 for non-officers)
 *
 * @example
 * getOfficerShares(person, rankSystem) // 0 for enlisted
 * getOfficerShares(person, rankSystem) // 1 for Lieutenant (at officerCut)
 * getOfficerShares(person, rankSystem) // 5 for Captain (4 ranks above officerCut)
 */
export function getOfficerShares(
  person: IPerson,
  rankSystem: IRankSystem,
): number {
  if (!isOfficer(person, rankSystem)) {
    return 0;
  }

  return (person.rankIndex ?? 0) - rankSystem.officerCut + 1;
}
