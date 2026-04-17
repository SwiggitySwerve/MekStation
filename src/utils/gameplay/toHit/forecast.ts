/**
 * To-Hit Forecast
 *
 * Per `add-attack-phase-ui` task 6: builds the per-weapon forecast
 * (final TN + modifier breakdown + 2d6 hit probability) the action
 * panel's "Preview Forecast" modal renders before commit.
 *
 * Pure derivation — no event emission, no state mutation. Callers
 * compose with `useGameplayStore.attackPlan` to feed weapon ids and
 * `calculateToHit` for the modifier-aware base TN.
 *
 * @spec openspec/changes/add-attack-phase-ui/tasks.md § 6, § 10
 */

import type {
  IAttackerState,
  ITargetState,
  IToHitModifierDetail,
} from '@/types/gameplay';

import { RangeBracket } from '@/types/gameplay';

import { calculateToHit } from './calculate';

/**
 * 2d6 probability table — chance of rolling >= TN on 2d6.
 * Indexed by target number (2..12). TN <= 2 always hits (100%);
 * TN > 12 always misses (0%).
 */
export const TWO_D6_HIT_PROBABILITY: Record<number, number> = {
  2: 100,
  3: 97,
  4: 92,
  5: 83,
  6: 72,
  7: 58,
  8: 42,
  9: 28,
  10: 17,
  11: 8,
  12: 3,
};

/**
 * Per-weapon forecast row the modal renders.
 */
export interface IWeaponForecastRow {
  readonly weaponId: string;
  readonly weaponName: string;
  /** Final to-hit number after all modifiers */
  readonly finalToHit: number;
  /** Modifier breakdown (label + signed contribution) */
  readonly modifiers: readonly IToHitModifierDetail[];
  /** 2d6 probability of hitting at the final TN (0-100) */
  readonly hitProbability: number;
  /**
   * `true` if the weapon is out of range or otherwise unfireable
   * (rendered with the red "Out of range" indicator per task 4.3).
   */
  readonly outOfRange: boolean;
}

export interface IForecastInput {
  readonly weaponId: string;
  readonly weaponName: string;
  readonly minRange: number;
  readonly shortRange: number;
  readonly mediumRange: number;
  readonly longRange: number;
}

/**
 * Get the 2d6 hit probability (percentage 0-100) for a target number.
 * Out-of-bounds TNs cap at the limits.
 */
export function getTwoD6HitProbability(targetNumber: number): number {
  if (targetNumber <= 2) return 100;
  if (targetNumber >= 13) return 0;
  return TWO_D6_HIT_PROBABILITY[targetNumber] ?? 0;
}

/**
 * Pick the range bracket for a given range vs the weapon's bracket
 * thresholds. Returns null when the range is greater than the long
 * bracket (out of range).
 */
function pickRangeBracket(
  range: number,
  weapon: IForecastInput,
): RangeBracket | null {
  if (range <= weapon.shortRange) return RangeBracket.Short;
  if (range <= weapon.mediumRange) return RangeBracket.Medium;
  if (range <= weapon.longRange) return RangeBracket.Long;
  return null;
}

/**
 * Build the per-weapon forecast for an attacker firing each of
 * `weapons` at `target` from `range` hexes away. Out-of-range weapons
 * still appear in the forecast (so the modal can display the red
 * indicator) with `outOfRange: true` and `finalToHit: Infinity`.
 */
export function buildToHitForecast(
  attacker: IAttackerState,
  target: ITargetState,
  weapons: readonly IForecastInput[],
  range: number,
): readonly IWeaponForecastRow[] {
  return weapons.map((weapon) => {
    const bracket = pickRangeBracket(range, weapon);
    if (bracket === null) {
      return {
        weaponId: weapon.weaponId,
        weaponName: weapon.weaponName,
        finalToHit: Infinity,
        modifiers: [],
        hitProbability: 0,
        outOfRange: true,
      };
    }
    const calc = calculateToHit(
      attacker,
      target,
      bracket,
      range,
      weapon.minRange,
    );
    return {
      weaponId: weapon.weaponId,
      weaponName: weapon.weaponName,
      finalToHit: calc.finalToHit,
      modifiers: calc.modifiers,
      hitProbability: getTwoD6HitProbability(calc.finalToHit),
      outOfRange: false,
    };
  });
}

/**
 * Sum of expected hits across all weapons in the forecast (per task
 * 6.5: modal footer shows the overall expected hits count).
 * Out-of-range weapons contribute 0.
 */
export function expectedHitsTotal(
  forecast: readonly IWeaponForecastRow[],
): number {
  return forecast.reduce(
    (sum, row) => sum + (row.outOfRange ? 0 : row.hitProbability / 100),
    0,
  );
}
