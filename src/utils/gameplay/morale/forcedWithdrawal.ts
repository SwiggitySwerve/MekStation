/**
 * Forced Withdrawal rule.
 *
 * The Forced Withdrawal optional rule (scenario config flag
 * `forcedWithdrawal`) compels a unit to withdraw when its side's
 * `battleMorale` breaks, or when the unit is crippled. This module
 * holds the eligibility predicates — pure functions over the derived
 * state — that the end-of-phase check consults.
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/spec.md
 *   — Requirement: Forced Withdrawal Rule
 */

import {
  GameSide,
  MORALE_LEVELS,
  type IGameState,
  type IUnitGameState,
  type MoraleLevel,
} from '@/types/gameplay';

/**
 * A side's morale is "broken" when it is `BROKEN` or worse (`ROUTED`).
 * Ordinal comparison against the canonical `MORALE_LEVELS` order.
 */
export function isSideMoraleBroken(level: MoraleLevel): boolean {
  return MORALE_LEVELS.indexOf(level) <= MORALE_LEVELS.indexOf('BROKEN');
}

/**
 * Whether a unit is crippled per the Forced Withdrawal definition
 * (design D5): a vital-component critical (engine / gyro / cockpit
 * hit), OR more than 50% of internal structure lost.
 *
 * The vital-crit branch reads `componentDamage` — `engineHits`,
 * `gyroHits`, and `cockpitHit` are the canonical tabletop vital
 * systems. The structure branch compares current internal structure
 * against `startingInternalStructure`; when the latter is unseeded the
 * structure branch is skipped (the vital-crit branch still applies).
 */
export function isUnitCrippled(unit: IUnitGameState): boolean {
  const cd = unit.componentDamage;
  if (cd) {
    if (cd.engineHits > 0 || cd.gyroHits > 0 || cd.cockpitHit) {
      return true;
    }
  }

  const starting = unit.startingInternalStructure ?? {};
  let startingTotal = 0;
  let currentTotal = 0;
  for (const [location, startValue] of Object.entries(starting)) {
    startingTotal += startValue;
    currentTotal += unit.structure[location] ?? 0;
  }
  if (startingTotal > 0) {
    const lost = startingTotal - currentTotal;
    if (lost > startingTotal * 0.5) {
      return true;
    }
  }

  return false;
}

/**
 * The reason a unit is eligible for forced withdrawal, or `null` when
 * it is not. `'morale-broken'` takes precedence over `'crippled'` so a
 * unit on a broken side is reported as morale-broken even if it is also
 * crippled — matches the spec's per-scenario emphasis.
 */
export type ForcedWithdrawalReason = 'morale-broken' | 'crippled';

/**
 * Decide whether `unit` should be forced to withdraw given the side's
 * current `battleMorale`. Returns the reason, or `null` when the unit
 * is not eligible. A unit that has already left play (destroyed or
 * already withdrawn / retreated) is never eligible.
 */
export function forcedWithdrawalReasonFor(
  unit: IUnitGameState,
  battleMorale: Record<GameSide, MoraleLevel> | undefined,
): ForcedWithdrawalReason | null {
  if (unit.destroyed || unit.hasRetreated || unit.hasEjected) return null;
  // A unit already flagged to withdraw must not be re-triggered.
  if (unit.isWithdrawing || unit.isRetreating) return null;

  const sideMorale = battleMorale?.[unit.side];
  if (sideMorale !== undefined && isSideMoraleBroken(sideMorale)) {
    return 'morale-broken';
  }
  if (isUnitCrippled(unit)) {
    return 'crippled';
  }
  return null;
}

/**
 * Collect every unit the Forced Withdrawal check should withdraw this
 * pass, paired with its trigger reason. Returns an empty array when no
 * unit is eligible. Caller is responsible for the `forcedWithdrawal`
 * config gate — this function assumes the rule is on.
 */
export function collectForcedWithdrawals(
  state: IGameState,
): readonly { unitId: string; reason: ForcedWithdrawalReason }[] {
  const result: { unitId: string; reason: ForcedWithdrawalReason }[] = [];
  for (const unit of Object.values(state.units)) {
    const reason = forcedWithdrawalReasonFor(unit, state.battleMorale);
    if (reason !== null) {
      result.push({ unitId: unit.id, reason });
    }
  }
  return result;
}
