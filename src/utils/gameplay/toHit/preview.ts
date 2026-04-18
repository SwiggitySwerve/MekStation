/**
 * Attack Preview Derivation.
 *
 * Per `add-what-if-to-hit-preview` § 2 / § 5: composes `forecastToHit`,
 * `getTwoD6HitProbability`, `expectedDamage`, `damageVariance`, and
 * `critProbability` into a single `IAttackPreview` snapshot the
 * weapon-picker UI renders when the "Preview Damage" toggle is ON.
 *
 * Critical zero-commit guarantee: this module performs no dice rolls,
 * no DiceRoller advance, no event emission, no state mutation. Every
 * helper here is a pure function of its inputs. Two consecutive calls
 * with the same `IAttackPreviewInput` return deeply equal results.
 *
 * @spec openspec/changes/add-what-if-to-hit-preview/specs/to-hit-resolution/spec.md
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IAttackerState, ITargetState } from '@/types/gameplay';

import {
  clusterHitStats,
  damageVariance,
  expectedDamage,
  type IExpectedDamageOptions,
} from '../damage/expectedDamage';
import { buildToHitForecast, type IForecastInput } from './forecast';

/**
 * Snapshot of what an attack is *expected* to do — purely
 * informational, never the result of a real dice roll.
 *
 * Probability fields are in `[0, 1]` (NOT percentages — the UI
 * formatter converts to percent strings); damage fields are in raw
 * damage points.
 *
 * @spec § 1 — IAttackPreview shape
 */
export interface IAttackPreview {
  /** P(hit) in [0, 1] — equals `getTwoD6HitProbability(finalTn) / 100`. */
  readonly hitProbability: number;
  /** Mean damage if the weapon were to fire (raw damage points). */
  readonly expectedDamage: number;
  /** Standard deviation of damage (UI shows as `±X.X`). */
  readonly damageStddev: number;
  /** P(at least one critical hit) in [0, 1]. */
  readonly critProbability: number;
  /**
   * Mean cluster hits (1 for non-cluster weapons; rack size for
   * Streak; integrated 2d6 expectation for plain cluster).
   */
  readonly clusterHitsMean: number;
  /** Stddev of cluster hits (0 for non-cluster + Streak weapons). */
  readonly clusterHitsStddev: number;
}

/**
 * Read-only input to `previewAttackOutcome`. Mirrors the inputs the
 * Phase 1 forecast modal already builds, plus the single weapon under
 * consideration. We pin everything `readonly` so call sites can pass
 * a Zustand snapshot without `as any`.
 *
 * Range is included so out-of-range previews short-circuit to zeros
 * (matching the spec's out-of-range scenario).
 */
export interface IAttackPreviewInput {
  readonly attacker: IAttackerState;
  readonly target: ITargetState;
  readonly weapon: IWeapon;
  /** Distance attacker→target in hexes. */
  readonly range: number;
  /** Optional remaining ammo override (one-shot launchers, depleted bins). */
  readonly remainingShots?: number;
}

/**
 * Pre-built zero preview — used when a weapon is out-of-range so the
 * UI can render `"—"` instead of "0.0". Exported so callers can `===`
 * compare and bypass formatting work.
 */
export const ZERO_PREVIEW: IAttackPreview = {
  hitProbability: 0,
  expectedDamage: 0,
  damageStddev: 0,
  critProbability: 0,
  clusterHitsMean: 0,
  clusterHitsStddev: 0,
};

/**
 * Map an `IWeapon` (catalog shape used by `WeaponSelector`) to the
 * `IForecastInput` shape `buildToHitForecast` expects. Kept here so
 * the preview is a stand-alone composer — callers don't have to
 * pre-translate.
 */
function toForecastInput(weapon: IWeapon): IForecastInput {
  return {
    weaponId: weapon.id,
    weaponName: weapon.name,
    minRange: weapon.minRange,
    shortRange: weapon.shortRange,
    mediumRange: weapon.mediumRange,
    longRange: weapon.longRange,
  };
}

/**
 * Critical-hit probability — closed-form approximation rather than
 * Monte Carlo. Per § 5 + § 5.4 the model is:
 *
 *   P(crit) ≈ P(hit) × P(loc with 0 armor) × P(crit on 2d6)
 *
 * For cluster weapons we expand into the *expected* number of hits
 * (each missile has its own crit chance). The `clusterHitsMean`
 * factor is the union-bound approximation called out in § 5.4 — when
 * `clusterHitsMean` ≤ 1 this collapses to the single-shot case.
 *
 * `pLocationZeroArmor` and `pCritOn2d6` are intentionally exposed so
 * future spec deltas can plug in target-specific armor maps without
 * forking this helper.
 *
 * @spec § 5 — Crit probability derivation
 */
export interface ICritProbabilityOptions {
  /**
   * Probability that a hit lands on a location with zero armor
   * (through-armor crit eligibility). Defaults to 1/36 — the 2d6 roll
   * of "2" on the standard hit-location table — when the caller
   * cannot inspect the target's armor map.
   */
  readonly pLocationZeroArmor?: number;
  /**
   * Probability that a successful TAC roll produces at least one
   * crit (any 2d6 roll ≥ 8). Per `getCriticalHitCount` thresholds:
   * 8-9 = 1 crit, 10-11 = 2 crits, 12 = 3 crits → P(≥1 crit | TAC)
   * = P(2d6 ≥ 8) = 15/36 ≈ 0.4167.
   */
  readonly pCritOn2d6?: number;
  /**
   * Mean number of hits the cluster lands on a successful attack —
   * defaults to 1 (single-shot) so callers without cluster context
   * can reuse the helper safely.
   */
  readonly clusterHitsMean?: number;
}

/**
 * Default chance the hit-location roll lands on a head/CT-style
 * armorless slot. The standard front-arc 2d6 table has exactly one
 * "2" outcome → `1/36`. Real targets can override per `target.armor`.
 */
const DEFAULT_P_LOCATION_ZERO_ARMOR = 1 / 36;
/**
 * P(2d6 ≥ 8) under uniform 2d6 PMF: 15/36.
 */
const DEFAULT_P_CRIT_ON_2D6 = 15 / 36;

/**
 * Public crit-probability helper — usable directly by the preview
 * modal or by future tooling that wants the bare number.
 *
 * @spec § 5 (also tested via the integration test in § 11.4)
 */
export function critProbability(
  hitProbability: number,
  options: ICritProbabilityOptions = {},
): number {
  const p = Math.max(0, Math.min(1, hitProbability));
  if (p === 0) return 0;

  const pLoc = options.pLocationZeroArmor ?? DEFAULT_P_LOCATION_ZERO_ARMOR;
  const pCrit = options.pCritOn2d6 ?? DEFAULT_P_CRIT_ON_2D6;
  const meanHits = Math.max(1, options.clusterHitsMean ?? 1);

  // Per-shot probability of a TAC + crit outcome.
  const perShot = p * pLoc * pCrit;

  // Aggregate across cluster hits with the union-bound: assume each
  // missile is roughly independent, so P(no crits in N hits) ≈
  // (1 − perShot)^meanHits → P(≥1 crit) = 1 − (1 − perShot)^meanHits.
  // Reasoning: when meanHits is exactly 1 this collapses to perShot
  // (the single-shot case the spec validates).
  if (meanHits === 1) return perShot;
  const noCrit = Math.pow(1 - perShot, meanHits);
  return 1 - noCrit;
}

/**
 * Build the full attack preview for a single weapon.
 *
 * Sequence:
 *   1. Build a one-element forecast with `buildToHitForecast` so we
 *      reuse the canonical TN + modifier pipeline. Out-of-range or
 *      unhittable weapons short-circuit to `ZERO_PREVIEW`.
 *   2. Convert the percentage hit probability (Phase 1 returns 0-100)
 *      to the [0, 1] range the damage helpers expect.
 *   3. Compose `expectedDamage`, `damageVariance`, `clusterHitStats`,
 *      and `critProbability` into the `IAttackPreview`.
 *
 * @spec § 2 — Attack preview projection
 */
export function previewAttackOutcome(
  input: IAttackPreviewInput,
): IAttackPreview {
  const forecastInput = toForecastInput(input.weapon);
  const forecast = buildToHitForecast(
    input.attacker,
    input.target,
    [forecastInput],
    input.range,
  );
  // Reasoning: forecast always returns one row when given one weapon.
  // We still defensively grab the first entry to satisfy strict
  // index access linting.
  const row = forecast[0];
  if (!row || row.outOfRange) {
    return ZERO_PREVIEW;
  }

  // Phase 1 returns hit probability as a percent (0-100) for legacy
  // UI rendering. The damage system works in [0, 1] decimals.
  const hitProbability = row.hitProbability / 100;

  const damageOpts: IExpectedDamageOptions = {
    remainingShots: input.remainingShots,
  };

  const cluster = clusterHitStats(input.weapon);
  const expDmg = expectedDamage(input.weapon, hitProbability, damageOpts);
  const stddev = damageVariance(input.weapon, hitProbability, damageOpts);
  const crit = critProbability(hitProbability, {
    clusterHitsMean: cluster.mean,
  });

  return {
    hitProbability,
    expectedDamage: expDmg,
    damageStddev: stddev,
    critProbability: crit,
    clusterHitsMean: cluster.mean,
    clusterHitsStddev: cluster.stddev,
  };
}
