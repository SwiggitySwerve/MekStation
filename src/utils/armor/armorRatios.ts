/**
 * Armor Ratio Constants
 *
 * Single source of truth for armor distribution ratios.
 * Based on BattleTech conventions: 75% front, 25% rear for torso locations.
 *
 * @module utils/armor/armorRatios
 */

/**
 * Standard front/rear armor distribution ratios for torso locations
 */
export const ARMOR_RATIOS = {
  /** Front armor ratio (75%) */
  FRONT: 0.75,
  /** Rear armor ratio (25%) */
  REAR: 0.25,
} as const;

/**
 * Get expected armor capacity for front and rear based on standard distribution
 *
 * Uses the 75/25 front/rear split as the baseline for calculating
 * what the "expected" max is for each side. This allows armor status
 * colors to show green when at expected capacity, even if front has
 * more points than rear.
 *
 * @param totalMaxArmor - Total max armor for the location (front + rear)
 * @returns Expected max for front and rear
 *
 * @example
 * ```ts
 * const { front, rear } = getExpectedArmorCapacity(100);
 * // front = 75, rear = 25
 * ```
 */
export function getExpectedArmorCapacity(totalMaxArmor: number): { front: number; rear: number } {
  return {
    front: Math.round(totalMaxArmor * ARMOR_RATIOS.FRONT),
    rear: Math.round(totalMaxArmor * ARMOR_RATIOS.REAR),
  };
}
