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
 * Several spec scenarios across unit types require deterministic, non-rolled
 * outcomes for units that exited the field by special means:
 * - `offMap` (aerospace fly-off): survivor, only actual SI/arc damage recorded
 * - `routed` (infantry rout): surviving-but-withdrawn, only actual casualties
 * - `immobilized` (vehicle motive kill): salvage-eligible, not wreckage
 * - `abandonedProto` (proto pilot kill): unit lost, counts as destroyed
 * - `squadStrengthPercent` (BA partial survival): 100 - strength = damage%
 *
 * Callers that have access to per-unit combat state can pass a map of
 * `unitId → IUnitDamageState` to `distributeDamage` to opt into this
 * behavior. Existing callers that pass nothing keep the legacy distribution.
 *
 * Precedence inside `distributeDamage` (first match wins, all skip RNG):
 *   1. `destroyed === true` → 100%
 *   2. `abandonedProto === true` → 100% (pilot kill = unit lost)
 *   3. `squadStrengthPercent !== undefined` → 100 - clamp(0..100)
 *   4. `immobilized === true && !destroyed` → `actualDamagePercent ?? 0`
 *   5. `routed === true && !destroyed` → `actualDamagePercent ?? 0`
 *   6. `offMap === true && !destroyed` → `actualDamagePercent ?? 0`
 *   7. otherwise → severity-driven roll
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
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
   * True when an infantry platoon routed off-board (failed morale by 2+ or
   * similar). Routed + not-destroyed → surviving-but-withdrawn, only actual
   * casualties recorded via `actualDamagePercent`. Routed + destroyed still
   * counts as wrecked.
   *
   * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
   */
  routed?: boolean;
  /**
   * True when a ProtoMech was abandoned because its pilot was killed. Per the
   * spec, abandonment counts as destroyed for victory/salvage purposes — the
   * unit is forced to 100% damage regardless of the structural state. This is
   * intentionally distinct from the `destroyed` flag so that downstream salvage
   * reporting can distinguish pilot-kill abandonment from structural wrecks.
   *
   * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
   */
  abandonedProto?: boolean;
  /**
   * True when a vehicle was immobilized by a motive-damage roll but the chassis
   * is otherwise intact. Immobilized + not-destroyed → combat-eligible salvage,
   * NOT wreckage; only the actual structural damage is recorded.
   *
   * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
   */
  immobilized?: boolean;
  /**
   * Squad strength percentage (0-100) for a BattleArmor squad after combat.
   * 100 = full squad alive, 0 = entire squad eliminated. When provided, the
   * recorded damage percent is `100 - clamp(squadStrengthPercent, 0, 100)`
   * (e.g. 2 of 4 troopers alive → 50 → records 50% damage). Skips the RNG
   * severity roll. This takes precedence over `actualDamagePercent` for BA.
   *
   * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
   */
  squadStrengthPercent?: number;
  /**
   * Actual damage taken during the battle as a percentage (0-100).
   * Used when `offMap`, `routed`, or `immobilized` is true (and `destroyed`
   * is false). Defaults to 0 if omitted.
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
 * When the optional `unitStates` map is provided, several variant outcomes
 * are handled deterministically (RNG is NOT consumed for any of them):
 *
 *   1. `destroyed === true` → 100% (wreckage)
 *   2. `abandonedProto === true` → 100% (pilot kill = unit lost)
 *   3. `squadStrengthPercent !== undefined` → `100 - clamp(0..100)` (BA squad)
 *   4. `immobilized === true && !destroyed` → `actualDamagePercent ?? 0`
 *      (vehicle motive-killed but salvageable)
 *   5. `routed === true && !destroyed` → `actualDamagePercent ?? 0`
 *      (infantry routed off-board, surviving-but-withdrawn)
 *   6. `offMap === true && !destroyed` → `actualDamagePercent ?? 0`
 *      (aerospace fly-off survivor)
 *   7. otherwise → severity-driven roll (legacy path)
 *
 * Existing call sites that pass no `unitStates` map keep the exact legacy
 * behavior.
 *
 * @param unitIds - Array of unit identifiers to distribute damage to
 * @param severity - Damage severity multiplier between 0 and 1
 * @param random - Optional random number generator function (defaults to Math.random)
 * @param unitStates - Optional per-unit combat-state hints. When supplied,
 *                     special-state units are handled deterministically.
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
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
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
      // Destroyed units (including off-map ones that died during fly-off,
      // routed-then-killed infantry, etc.) are wrecked: 100% damage. RNG is
      // not consumed.
      damageMap.set(unitId, 100);
      continue;
    }

    if (state?.abandonedProto === true) {
      // Pilot-killed ProtoMech is treated as destroyed for victory/salvage
      // even when the chassis is structurally intact. Forces 100% damage and
      // skips the RNG, regardless of any other survivor flags.
      damageMap.set(unitId, 100);
      continue;
    }

    if (state?.squadStrengthPercent !== undefined) {
      // BattleArmor partial squad survival: 50% strength → 50% damage,
      // 25% strength → 75% damage, etc. Clamp into [0, 100] to be safe.
      const strength = Math.max(0, Math.min(state.squadStrengthPercent, 100));
      damageMap.set(unitId, 100 - strength);
      continue;
    }

    if (state?.immobilized === true) {
      // Vehicle immobilized by motive damage: combat-eligible salvage, not
      // wreckage. Record only the actual structural damage taken.
      const actual = state.actualDamagePercent ?? 0;
      damageMap.set(unitId, Math.max(0, Math.min(actual, 100)));
      continue;
    }

    if (state?.routed === true) {
      // Infantry platoon routed off-board: surviving-but-withdrawn, NOT
      // wrecked. Record only actual casualties taken before withdrawal.
      const actual = state.actualDamagePercent ?? 0;
      damageMap.set(unitId, Math.max(0, Math.min(actual, 100)));
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
