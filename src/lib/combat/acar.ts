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
