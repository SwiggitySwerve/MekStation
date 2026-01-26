/**
 * ACAR (Automated Combat Analysis and Resolution) type definitions
 * Core interfaces for combat scenario resolution and salvage tracking
 */

/**
 * Represents a salvageable item from combat
 */
export interface ISalvageItem {
  /** Unique identifier for the salvage item */
  id: string;
  /** Display name of the salvage item */
  name: string;
  /** Monetary value of the item */
  value: number;
}

/**
 * Result of resolving a combat scenario
 */
export interface ResolveScenarioResult {
  /** Outcome of the scenario (e.g., 'victory', 'defeat', 'draw') */
  outcome: string;
  /** Map of unit IDs to damage amounts sustained */
  unitDamage: Map<string, number>;
  /** Map of unit IDs to personnel casualty counts */
  personnelCasualties: Map<string, number>;
  /** Array of salvageable items recovered from the scenario */
  salvage: ISalvageItem[];
}

/**
 * Calculates the probability of player victory based on Battle Value
 * Uses the formula: playerBV / (playerBV + opponentBV)
 * 
 * @param playerBV - The player's Battle Value
 * @param opponentBV - The opponent's Battle Value
 * @returns Probability of victory as a number between 0 and 1
 * 
 * @example
 * calculateVictoryProbability(3000, 3000) // returns 0.5
 * calculateVictoryProbability(4000, 2000) // returns 0.667
 * calculateVictoryProbability(0, 0) // returns 0.5 (edge case)
 */
export function calculateVictoryProbability(playerBV: number, opponentBV: number): number {
  // Handle edge case where both BVs are 0
  if (playerBV === 0 && opponentBV === 0) {
    return 0.5;
  }

  const totalBV = playerBV + opponentBV;
  return playerBV / totalBV;
}

/**
 * Distributes damage across multiple units based on severity
 * Each unit receives damage calculated as: severity * (0.5 + random() * 0.5) * 100, capped at 100%
 * 
 * @param unitIds - Array of unit identifiers to distribute damage to
 * @param severity - Damage severity multiplier between 0 and 1
 * @param random - Optional random number generator function (defaults to Math.random)
 * @returns Map of unitId to damage percentage (0-100)
 * 
 * @example
 * distributeDamage(['unit1', 'unit2'], 0.8)
 * // Returns Map { 'unit1' => 65.3, 'unit2' => 72.1 }
 */
export function distributeDamage(
  unitIds: string[],
  severity: number,
  random: () => number = Math.random
): Map<string, number> {
  const damageMap = new Map<string, number>();

  for (const unitId of unitIds) {
    // Formula: severity * (0.5 + random() * 0.5) * 100, capped at 100
    const damage = Math.min(severity * (0.5 + random() * 0.5) * 100, 100);
    damageMap.set(unitId, damage);
  }

  return damageMap;
}
