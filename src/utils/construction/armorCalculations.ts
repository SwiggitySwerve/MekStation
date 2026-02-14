/**
 * Armor Calculations — Facade
 *
 * Re-exports all armor calculation modules.
 *
 * @spec openspec/specs/armor-system/spec.md
 */

export * from './armorCalculations/index';

// Re-export getExpectedArmorCapacity from centralized location
export { getExpectedArmorCapacity } from '@/utils/armor/armorRatios';

// Re-export ARMOR_RATIOS constants
export { ARMOR_RATIOS } from '@/utils/armor/armorRatios';

/**
 * Standard front/rear armor distribution ratio
 * Based on BattleTech conventions: 75% front, 25% rear
 * @deprecated Use ARMOR_RATIOS from @/utils/armor/armorRatios instead
 */
export const FRONT_ARMOR_RATIO = 0.75;
export const REAR_ARMOR_RATIO = 0.25;

/**
 * Calculate armor fill percentage based on expected capacity
 *
 * Returns a percentage that can exceed 100% if the armor exceeds
 * the expected allocation (e.g., heavily front-armored).
 *
 * @param current - Current armor points
 * @param expectedMax - Expected max based on front/rear ratio
 * @returns Fill percentage (can exceed 100)
 */
export function getArmorFillPercent(
  current: number,
  expectedMax: number,
): number {
  if (expectedMax <= 0) return 0;
  return (current / expectedMax) * 100;
}
