import { hexDistance } from '@/utils/gameplay/hexMath';

import type { SeededRandom } from '../core/SeededRandom';
import type { IAIUnitState, IWeapon } from './types';

/**
 * Per `improve-bot-basic-combat-competence` task 2: score a target
 * for the attacker. Higher = more attractive to fire on.
 *
 * Threat (incoming damage potential): sum of weapon damage / gunnery
 * (lower gunnery = better shooter = bigger threat) scaled by the
 * target's remaining HP fraction (full-health units are bigger
 * threats than crippled ones).
 *
 * KillProbability: rough 1 - (TN/12) clamped to [0, 1] using the
 * attacker's gunnery and a basic range modifier. Doesn't model arc
 * yet — that lives in the weapon-selection step.
 *
 * Score = threat × killProbability. Pure function — no state mutation.
 */
export function scoreTarget(
  attacker: IAIUnitState,
  target: IAIUnitState,
): number {
  if (target.destroyed || target.unitId === attacker.unitId) return 0;

  // Threat component — sum of living weapon damage scaled by inverse
  // gunnery (lower gunnery = better shooter = bigger threat).
  // IAIUnitState doesn't carry armor/structure totals at the AI
  // boundary so we omit the remaining-HP scaling for now (deferred
  // until the AI surface exposes that data).
  const livingWeapons = target.weapons.filter((w) => !w.destroyed);
  const totalWeaponDamagePerTurn = livingWeapons.reduce(
    (sum, w) => sum + w.damage,
    0,
  );
  const gunneryMod = Math.max(1, target.gunnery);
  const threat = totalWeaponDamagePerTurn / gunneryMod;

  // Kill probability — basic TN estimate
  const distance = hexDistance(attacker.position, target.position);
  const rangeMod = rangeModifierForDistance(distance);
  const tn = attacker.gunnery + rangeMod;
  const killProbability = clamp01(1 - tn / 12);

  return threat * killProbability;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function rangeModifierForDistance(distance: number): number {
  if (distance <= 3) return 0;
  if (distance <= 6) return 2;
  if (distance <= 9) return 4;
  return 6;
}

/**
 * Per task 5: apply the heat budget to a sorted weapon list. While
 * projected heat (currentHeat + movementHeat + sum of weapon heats)
 * exceeds `safeHeatThreshold`, drop the lowest damage-per-heat weapon
 * (tail of the sorted list — preserves ordering invariant) and
 * recompute. Returns the trimmed list.
 *
 * Pure function — no state mutation. Caller pre-sorts by damage/heat
 * descending; this preserves that order on the way out.
 */
export function applyHeatBudget(
  weapons: readonly IWeapon[],
  currentHeat: number,
  movementHeat: number,
  safeHeatThreshold: number,
): readonly IWeapon[] {
  const result = [...weapons];
  const projected = () =>
    currentHeat + movementHeat + result.reduce((s, w) => s + w.heat, 0);

  // Sort by damage/heat ascending so we drop low-efficiency weapons
  // first when trimming. Preserve relative order of equal-priority
  // weapons.
  const efficiency = (w: IWeapon) => w.damage / Math.max(1, w.heat);

  while (projected() > safeHeatThreshold && result.length > 0) {
    // Find the weapon with lowest efficiency in the result list.
    let worstIdx = 0;
    for (let i = 1; i < result.length; i++) {
      if (efficiency(result[i]) < efficiency(result[worstIdx])) {
        worstIdx = i;
      }
    }
    result.splice(worstIdx, 1);
  }
  return result;
}

export class AttackAI {
  getValidTargets(
    attacker: IAIUnitState,
    allUnits: readonly IAIUnitState[],
  ): readonly IAIUnitState[] {
    if (attacker.weapons.length === 0) {
      return [];
    }

    const maxWeaponRange = Math.max(
      ...attacker.weapons.filter((w) => !w.destroyed).map((w) => w.longRange),
    );

    if (maxWeaponRange === 0 || maxWeaponRange === -Infinity) {
      return [];
    }

    return allUnits.filter((target) => {
      if (target.unitId === attacker.unitId) return false;
      if (target.destroyed) return false;

      const distance = hexDistance(attacker.position, target.position);
      return distance <= maxWeaponRange;
    });
  }

  /**
   * Per `improve-bot-basic-combat-competence` task 2.5: pick the
   * highest-score target via `scoreTarget`. Uses `random` only for
   * tie-breaking. Pre-task this was a uniform random pick — the new
   * pipeline preferentially fires on the most threatening / killable
   * target.
   *
   * `attacker` is now required to compute the score; existing callers
   * with only `targets + random` still get the deterministic-tiebreak
   * behavior via the optional-attacker overload.
   */
  selectTarget(
    targets: readonly IAIUnitState[],
    random: SeededRandom,
    attacker?: IAIUnitState,
  ): IAIUnitState | null {
    if (targets.length === 0) {
      return null;
    }
    if (!attacker) {
      // Legacy uniform-random behavior preserved for tests / callers
      // that don't yet supply the attacker.
      const index = random.nextInt(targets.length);
      return targets[index];
    }
    // Threat-scored pick: highest score wins; ties broken by random.
    // ALWAYS call `random.nextInt` (even when tied.length === 1) so the
    // bot consumes a constant number of randoms per call, matching the
    // legacy path's draw rate. This keeps downstream event sequences
    // deterministic across runs that share a seed (regression: the
    // SimulationRunner determinism tests were flaky when the random
    // consumption depended on whether a tie existed).
    const scored = targets.map((t) => ({
      target: t,
      score: scoreTarget(attacker, t),
    }));
    scored.sort((a, b) => b.score - a.score);
    const topScore = scored[0].score;
    const tied = scored.filter((s) => s.score === topScore);
    const idx = random.nextInt(tied.length);
    return tied[idx].target;
  }

  selectWeapons(
    attacker: IAIUnitState,
    target: IAIUnitState,
  ): readonly IWeapon[] {
    const distance = hexDistance(attacker.position, target.position);

    return attacker.weapons.filter((weapon) => {
      if (weapon.destroyed) return false;
      if (distance > weapon.longRange) return false;

      if (weapon.ammoPerTon > 0) {
        const ammoCount = attacker.ammo[weapon.id];
        if (ammoCount !== undefined && ammoCount <= 0) {
          return false;
        }
      }

      return true;
    });
  }
}
