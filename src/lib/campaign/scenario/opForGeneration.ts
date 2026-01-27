/**
 * OpFor BV Matching and Force Composition
 *
 * Implements the OpFor (Opposing Force) BV calculation and force composition
 * system for Against the Bot (AtB) scenario generation.
 *
 * @module campaign/scenario/opForGeneration
 */

// =============================================================================
// Random Function Type
// =============================================================================

/**
 * Injectable random function for deterministic testing.
 *
 * Returns a value between 0 (inclusive) and 1 (exclusive).
 * This allows tests to inject seeded random values for reproducibility.
 *
 * @example
 * const random: RandomFn = () => Math.random();
 * const seededRandom: RandomFn = () => 0.5;
 */
export type RandomFn = () => number;

// =============================================================================
// OpFor Configuration Interface
// =============================================================================

/**
 * Configuration for OpFor (Opposing Force) composition.
 *
 * Describes the target BV and composition hints for the opposing force.
 * Does NOT select specific units - that is out of scope.
 *
 * @example
 * const config: IOpForConfig = {
 *   targetBV: 250,
 *   unitCount: 4,
 *   weightClass: 'mixed',
 *   quality: 'C',
 * };
 */
export interface IOpForConfig {
  /** Target Battle Value for the opposing force */
  readonly targetBV: number;

  /** Number of units in the force (based on faction lance/star size) */
  readonly unitCount: number;

  /** Weight class composition hint: light, medium, heavy, assault, or mixed */
  readonly weightClass: 'light' | 'medium' | 'heavy' | 'assault' | 'mixed';

  /** Unit quality rating: A (elite) through F (green) */
  readonly quality: string;
}

// =============================================================================
// Lance/Star Size Constants
// =============================================================================

/**
 * Standard force sizes by faction.
 *
 * - IS (Inner Sphere): Lance = 4 units
 * - Clan: Star = 5 units
 * - ComStar: Level II = 6 units
 *
 * @example
 * const isLanceSize = LANCE_SIZE.IS; // 4
 * const clanStarSize = LANCE_SIZE.CLAN; // 5
 */
export const LANCE_SIZE = {
  /** Inner Sphere lance size */
  IS: 4 as const,

  /** Clan star size */
  CLAN: 5 as const,

  /** ComStar level II size */
  COMSTAR: 6 as const,
};

// =============================================================================
// OpFor BV Calculation
// =============================================================================

/**
 * Calculate the target Battle Value for the opposing force.
 *
 * Formula: `playerBV × difficultyMultiplier × (75-125% variation)`
 *
 * The variation is calculated as:
 * `variation = (Math.floor(random() * 8) - 3) × 5`
 *
 * This produces 8 possible values:
 * - random 0-1/8 → variation -15 → 85%
 * - random 1-2/8 → variation -10 → 90%
 * - random 2-3/8 → variation -5 → 95%
 * - random 3-4/8 → variation 0 → 100%
 * - random 4-5/8 → variation 5 → 105%
 * - random 5-6/8 → variation 10 → 110%
 * - random 6-7/8 → variation 15 → 115%
 * - random 7-8/8 → variation 20 → 120%
 *
 * @param playerBV - The player force's Battle Value
 * @param difficultyMultiplier - Difficulty scaling (0.5 easy to 2.0 hard)
 * @param random - Injectable random function (0-1 range)
 * @returns The target BV for the opposing force (rounded to whole number)
 *
 * @example
 * const opForBV = calculateOpForBV(100, 1.0, () => Math.random());
 * // Result: 85-120 (75-125% of 100)
 */
export function calculateOpForBV(
  playerBV: number,
  difficultyMultiplier: number,
  random: RandomFn
): number {
  // Calculate variation: (randomInt(8) - 3) * 5 = -15 to +20
  const variation = (Math.floor(random() * 8) - 3) * 5;

  // Convert to percentage: 100 + variation = 85 to 120
  const targetPct = (100 + variation) / 100;

  // Apply formula: playerBV × difficulty × percentage
  return Math.round(playerBV * difficultyMultiplier * targetPct);
}

// =============================================================================
// Force Composition Calculation
// =============================================================================

/**
 * Calculate the force composition for the opposing force.
 *
 * Returns composition hints (unit count, weight class, quality) based on
 * the target BV and faction. Does NOT select specific units from the database.
 *
 * Unit count is determined by faction:
 * - IS: 4 units (lance)
 * - Clan: 5 units (star)
 * - ComStar: 6 units (level II)
 * - Unknown: defaults to IS (4 units)
 *
 * Quality defaults to 'C' (regular/average).
 * Weight class defaults to 'mixed'.
 *
 * @param targetBV - The target Battle Value for the force
 * @param faction - The faction name (IS, Clan, ComStar, etc.)
 * @param random - Injectable random function (0-1 range)
 * @returns IOpForConfig with composition hints
 *
 * @example
 * const config = calculateForceComposition(250, 'IS', () => Math.random());
 * // Result: { targetBV: 250, unitCount: 4, weightClass: 'mixed', quality: 'C' }
 */
export function calculateForceComposition(
  targetBV: number,
  faction: string,
  random: RandomFn
): IOpForConfig {
  // Determine unit count based on faction (case-insensitive)
  const factionLower = faction.toLowerCase();
  let unitCount: number = LANCE_SIZE.IS; // Default to IS

  if (factionLower === 'clan') {
    unitCount = LANCE_SIZE.CLAN;
  } else if (factionLower === 'comstar') {
    unitCount = LANCE_SIZE.COMSTAR;
  }

  // Return composition config with defaults
  return {
    targetBV,
    unitCount,
    weightClass: 'mixed',
    quality: 'C',
  };
}
