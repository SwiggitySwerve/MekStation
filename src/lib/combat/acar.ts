/**
 * ACAR (Automated Combat Analysis and Resolution) type definitions
 * Core interfaces for combat scenario resolution and salvage tracking
 */

import { PersonnelStatus } from '@/types/campaign/enums';

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
 * Per-unit combat state hint for damage distribution.
 *
 * The default `distributeDamage(unitIds, severity, random)` path treats every
 * unit as a participant on the field — its damage is rolled by severity.
 * For aerospace units that fled the map before the battle ended, the spec
 * (combat-resolution: "Aerospace fly-off counts as surviving") says we
 * MUST NOT treat them as wrecked. They are surviving units, and only the
 * actual SI/arc damage they took should be recorded.
 *
 * Callers that have access to per-unit combat state can pass a map of
 * `unitId → IUnitDamageState` to `distributeDamage` to opt into this
 * behavior. Existing callers that pass nothing keep the legacy distribution.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/combat-resolution/spec.md
 */
export interface IUnitDamageState {
  /**
   * True when the unit flew off the map before the battle ended (aerospace).
   * Off-map + not-destroyed → surviving, with `actualDamagePercent` recorded.
   * Off-map + destroyed → still wrecked (caller should set destroyed=true).
   */
  offMap?: boolean;
  /** True when the unit was destroyed during the battle. */
  destroyed?: boolean;
  /**
   * Actual damage taken during the battle as a percentage (0-100).
   * Used when `offMap` is true and `destroyed` is false. Defaults to 0
   * if omitted.
   */
  actualDamagePercent?: number;
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
export function calculateVictoryProbability(
  playerBV: number,
  opponentBV: number,
): number {
  // Handle edge case where both BVs are 0
  if (playerBV === 0 && opponentBV === 0) {
    return 0.5;
  }

  const totalBV = playerBV + opponentBV;
  return playerBV / totalBV;
}

/**
 * Distributes damage across multiple units based on severity.
 *
 * Each unit receives damage calculated as
 * `severity * (0.5 + random() * 0.5) * 100`, capped at 100%.
 *
 * When the optional `unitStates` map is provided, units flagged with
 * `offMap=true` and `destroyed=false` are treated as having survived (per
 * the aerospace fly-off spec scenario): their reported damage equals the
 * unit's `actualDamagePercent` (defaulting to 0) — NOT a severity-driven
 * roll — and no random number is consumed for them. Units with
 * `destroyed=true` get a flat 100% damage and skip the RNG. This keeps
 * fly-off survivors out of the wrecked bucket while preserving exact
 * legacy behavior for every caller that omits the map.
 *
 * @param unitIds - Array of unit identifiers to distribute damage to
 * @param severity - Damage severity multiplier between 0 and 1
 * @param random - Optional random number generator function (defaults to Math.random)
 * @param unitStates - Optional per-unit combat-state hints. When supplied,
 *                     off-map / destroyed units are handled deterministically.
 * @returns Map of unitId to damage percentage (0-100)
 *
 * @example
 * distributeDamage(['unit1', 'unit2'], 0.8)
 * // Returns Map { 'unit1' => 65.3, 'unit2' => 72.1 }
 *
 * @example
 * distributeDamage(['asf-1'], 0.8, rng, new Map([
 *   ['asf-1', { offMap: true, destroyed: false, actualDamagePercent: 22 }],
 * ]))
 * // Returns Map { 'asf-1' => 22 } — survivor, only actual damage recorded.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/combat-resolution/spec.md
 */
export function distributeDamage(
  unitIds: string[],
  severity: number,
  random: () => number = Math.random,
  unitStates?: Map<string, IUnitDamageState>,
): Map<string, number> {
  const damageMap = new Map<string, number>();

  for (const unitId of unitIds) {
    const state = unitStates?.get(unitId);

    if (state?.destroyed === true) {
      // Destroyed units (including off-map ones that died during fly-off)
      // are wrecked: 100% damage. RNG is not consumed.
      damageMap.set(unitId, 100);
      continue;
    }

    if (state?.offMap === true) {
      // Aerospace fly-off survivor: NOT wrecked. Record only the actual
      // SI/arc damage taken before exiting the map. RNG is not consumed
      // so deterministic callers stay deterministic.
      const actual = state.actualDamagePercent ?? 0;
      damageMap.set(unitId, Math.max(0, Math.min(actual, 100)));
      continue;
    }

    // Default path: severity * (0.5 + random() * 0.5) * 100, capped at 100
    const damage = Math.min(severity * (0.5 + random() * 0.5) * 100, 100);
    damageMap.set(unitId, damage);
  }

  return damageMap;
}

/**
 * Determines personnel casualties from combat based on battle intensity
 * Calculates casualty rate as battleIntensity * 0.1, then distributes casualties
 * across personnel with status distribution: 60% WOUNDED, 30% MIA, 10% KIA
 *
 * @param personnelIds - Array of personnel identifiers to evaluate for casualties
 * @param battleIntensity - Combat intensity multiplier between 0 and 1 (0 = no combat, 1 = intense)
 * @param random - Optional random number generator function (defaults to Math.random)
 * @returns Map of personnelId to PersonnelStatus for casualties only (non-casualties excluded)
 *
 * @example
 * determineCasualties(['pilot1', 'pilot2', 'pilot3'], 0.8)
 * // With 8% casualty rate, might return:
 * // Map { 'pilot2' => PersonnelStatus.WOUNDED }
 */
export function determineCasualties(
  personnelIds: string[],
  battleIntensity: number,
  random: () => number = Math.random,
): Map<string, PersonnelStatus> {
  const casualtyMap = new Map<string, PersonnelStatus>();
  const casualtyRate = battleIntensity * 0.1;

  for (const personnelId of personnelIds) {
    // Determine if this person becomes a casualty
    if (random() < casualtyRate) {
      // Roll to determine casualty status
      const statusRoll = random();

      if (statusRoll < 0.6) {
        casualtyMap.set(personnelId, PersonnelStatus.WOUNDED);
      } else if (statusRoll < 0.9) {
        casualtyMap.set(personnelId, PersonnelStatus.MIA);
      } else {
        casualtyMap.set(personnelId, PersonnelStatus.KIA);
      }
    }
  }

  return casualtyMap;
}

/**
 * Resolves a combat scenario and determines the outcome with damage and casualties
 *
 * Calculates victory probability based on Battle Values, rolls for outcome determination,
 * and distributes damage and casualties based on the result. Victory outcomes result in
 * lower damage and casualties, while defeats result in higher damage and casualties.
 *
 * @param playerBV - The player's Battle Value
 * @param opponentBV - The opponent's Battle Value
 * @param unitIds - Array of unit identifiers that may sustain damage
 * @param personnelIds - Array of personnel identifiers that may become casualties
 * @param random - Optional random number generator function (defaults to Math.random)
 * @returns ResolveScenarioResult containing outcome, unit damage, personnel casualties, and salvage
 *
 * @example
 * const result = resolveScenario(3000, 2500, ['unit1', 'unit2'], ['pilot1', 'pilot2']);
 * // Returns:
 * // {
 * //   outcome: 'victory',
 * //   unitDamage: Map { 'unit1' => 35.2, 'unit2' => 28.9 },
 * //   personnelCasualties: Map { 'pilot2' => 1 },
 * //   salvage: []
 * // }
 */
export function resolveScenario(
  playerBV: number,
  opponentBV: number,
  unitIds: string[],
  personnelIds: string[],
  random: () => number = Math.random,
): ResolveScenarioResult {
  // Calculate victory probability
  const probability = calculateVictoryProbability(playerBV, opponentBV);

  // Roll to determine outcome
  const roll = random();
  let outcome: string;
  let severity: number;
  let intensity: number;

  if (roll < probability) {
    // Victory
    outcome = 'victory';
    severity = 0.3;
    intensity = 0.4;
  } else if (roll > 1 - probability) {
    // Defeat
    outcome = 'defeat';
    severity = 0.8;
    intensity = 0.9;
  } else {
    // Draw
    outcome = 'draw';
    severity = 0.5;
    intensity = 0.6;
  }

  // Distribute damage and determine casualties
  const unitDamage = distributeDamage(unitIds, severity, random);
  const casualtyStatusMap = determineCasualties(
    personnelIds,
    intensity,
    random,
  );

  // Convert casualty status map to count map (1 = casualty)
  const personnelCasualties = new Map<string, number>();
  casualtyStatusMap.forEach((_, personnelId) => {
    personnelCasualties.set(personnelId, 1);
  });

  return {
    outcome,
    unitDamage,
    personnelCasualties,
    salvage: [],
  };
}
