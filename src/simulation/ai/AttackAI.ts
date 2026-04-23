import { FiringArc } from '@/types/gameplay';
import {
  calculateFiringArc,
  getTwistedFacing,
} from '@/utils/gameplay/firingArc';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { hexDistance } from '@/utils/gameplay/hexMath';

import type { SeededRandom } from '../core/SeededRandom';
import type { IAIUnitState, IWeapon } from './types';

/**
 * Per `improve-bot-basic-combat-competence` task 2: score a target
 * for the attacker. Higher = more attractive to fire on.
 *
 * Formula (per `specs/simulation-system/spec.md` Requirement "Bot Target
 * Prioritization by Threat and Kill Probability"):
 *
 *   threat = totalWeaponDamagePerTurn * remainingHpFraction / max(gunnery, 1)
 *   killProbability = clamp(1 - (toHitTN / 12), 0, 1)
 *   score = threat * killProbability
 *
 * `toHitTN` is estimated from the attacker's gunnery + a range modifier.
 * Firing-arc TN contribution is deferred to the weapon-selection step
 * (which EXCLUDES out-of-arc weapons entirely rather than taxing them).
 *
 * `remainingHpFraction` defaults to 1.0 when the AI surface does not
 * yet supply per-unit HP totals — that preserves the legacy scoring
 * for test fixtures while letting real wiring opt in.
 *
 * Pure function — no state mutation.
 */
export function scoreTarget(
  attacker: IAIUnitState,
  target: IAIUnitState,
): number {
  if (target.destroyed || target.unitId === attacker.unitId) return 0;

  // Threat component — sum of living weapon damage scaled by the
  // target's remaining HP fraction (crippled units are less
  // threatening) and inverted gunnery (better shooters are bigger
  // threats). `Math.max(1, gunnery)` guards against divide-by-zero
  // for 0-gunnery edge cases.
  const livingWeapons = target.weapons.filter((w) => !w.destroyed);
  const totalWeaponDamagePerTurn = livingWeapons.reduce(
    (sum, w) => sum + w.damage,
    0,
  );
  const gunneryMod = Math.max(1, target.gunnery);
  const remainingHpFraction = clamp01(target.remainingHpFraction ?? 1);
  const threat = (totalWeaponDamagePerTurn * remainingHpFraction) / gunneryMod;

  // Kill probability — basic TN estimate using attacker gunnery +
  // range modifier only. Clamped so TN >= 12 yields 0 probability.
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
 * Per `improve-bot-basic-combat-competence` task 3.2: the arc the
 * target hex lies in relative to the attacker's facing (with
 * optional torso twist applied). Used to filter weapons in
 * `selectWeapons`. Front weapons fire when the target is in the
 * attacker's front arc; rear weapons fire when the target is in the
 * rear arc; sides match their respective sides.
 *
 * NOTE: `calculateFiringArc` (in `firingArc.ts`) computes the arc
 * the ATTACKER is in relative to the TARGET's facing (used for hit
 * location). We need the dual — what arc the TARGET is in relative
 * to the ATTACKER — so we use `determineArc` with the attacker as
 * the "observer" directly.
 */
function targetArcFromAttacker(
  attacker: IAIUnitState,
  target: IAIUnitState,
): FiringArc {
  const attackerFacing = attacker.torsoTwist
    ? getTwistedFacing(attacker.facing, attacker.torsoTwist)
    : attacker.facing;

  return determineArc(
    {
      unitId: attacker.unitId,
      coord: attacker.position,
      facing: attackerFacing,
      prone: false,
    },
    target.position,
  ).arc;
}

/**
 * Per `improve-bot-basic-combat-competence` task 3.2: true when a
 * weapon mounted in `weaponArc` can fire at a target whose relative
 * arc from the attacker is `targetArc`.
 *
 * When a weapon has NO explicit `mountingArc`, it is treated as
 * OMNIDIRECTIONAL — the arc filter does not exclude it. This
 * preserves legacy behavior for test fixtures and pre-existing
 * callers that don't yet populate arc metadata. Production callers
 * (real BotPlayer wiring) SHOULD set `mountingArc` based on the
 * weapon's MML location so the arc filter actually applies.
 */
function weaponCanCoverArc(weapon: IWeapon, targetArc: FiringArc): boolean {
  if (weapon.mountingArc === undefined) return true;
  const weaponArc = weapon.mountingArc;
  if (weaponArc === FiringArc.Front) return targetArc === FiringArc.Front;
  if (weaponArc === FiringArc.Rear) return targetArc === FiringArc.Rear;
  if (weaponArc === FiringArc.Left) return targetArc === FiringArc.Left;
  if (weaponArc === FiringArc.Right) return targetArc === FiringArc.Right;
  return false;
}

/**
 * Per `improve-bot-basic-combat-competence` task 4: sort weapons by
 * damage-per-heat descending, with Short > Medium > Long range
 * bracket preference within equal-efficiency buckets. Uses
 * `damage / max(heat, 1)` so zero-heat energy weapons do not divide
 * by zero and instead get their `damage` directly as efficiency.
 *
 * Pure function — returns a new sorted array.
 */
export function orderWeaponsByEfficiency(
  weapons: readonly IWeapon[],
  distance: number,
): readonly IWeapon[] {
  const rank = (weapon: IWeapon) => {
    const efficiency = weapon.damage / Math.max(1, weapon.heat);
    return {
      weapon,
      efficiency,
      bracketRank: bracketRankFor(weapon, distance),
    };
  };
  const ranked = weapons.map(rank);
  ranked.sort((a, b) => {
    if (b.efficiency !== a.efficiency) return b.efficiency - a.efficiency;
    // Lower bracketRank = preferred (Short=0, Medium=1, Long=2).
    return a.bracketRank - b.bracketRank;
  });
  return ranked.map((r) => r.weapon);
}

function bracketRankFor(weapon: IWeapon, distance: number): number {
  if (distance <= weapon.shortRange) return 0;
  if (distance <= weapon.mediumRange) return 1;
  return 2;
}

/**
 * Per task 5: apply the heat budget to a sorted weapon list.
 *
 * Heat projection per `specs/combat-resolution/spec.md` Requirement
 * "Bot Heat Declaration Matches Resolver Heat Accounting":
 *
 *   projected = currentHeat + movementHeat + sum(firedWeaponHeat)
 *
 * Dissipation is NOT subtracted here — callers pass
 * `safeHeatThreshold` pre-adjusted if they want the
 * "dissipation-aware" flavor. This keeps the function pure and
 * orthogonal to game-state heat models.
 *
 * While projected > threshold, drop the LOWEST damage-per-heat
 * weapon (tail of the sorted list — preserves ordering invariant
 * from `orderWeaponsByEfficiency`) and recompute. Returns the
 * trimmed list.
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

  const efficiency = (w: IWeapon) => w.damage / Math.max(1, w.heat);

  while (projected() > safeHeatThreshold && result.length > 0) {
    // Find the weapon with lowest efficiency in the result list.
    // This drops from the TAIL of the sorted list — preserving the
    // descending-efficiency invariant from `orderWeaponsByEfficiency`
    // (task 5.3: removal comes from the tail of the sorted list).
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

  /**
   * Per `improve-bot-basic-combat-competence` tasks 3–4: pick the
   * weapons the bot will fire this phase. The filter pipeline:
   *
   *   1. Weapon is not destroyed
   *   2. Target distance <= weapon.longRange (in weapon range)
   *   3. Ammo present (if `ammoPerTon > 0`)
   *   4. Target hex is in the weapon's mounting arc given attacker
   *      facing (+ optional torso twist)
   *   5. Target is not inside the weapon's minRange when another
   *      surviving candidate CAN fire (skip LRM at minimum range
   *      when a medium laser is available; fire the LRM anyway if
   *      it's the only weapon we have)
   *
   * The survivor list is returned sorted by `orderWeaponsByEfficiency`
   * (damage-per-heat desc, then short>medium>long bracket) so the
   * heat-budget pass drops the lowest-efficiency weapons from the tail.
   */
  selectWeapons(
    attacker: IAIUnitState,
    target: IAIUnitState,
  ): readonly IWeapon[] {
    const distance = hexDistance(attacker.position, target.position);
    const targetArc = targetArcFromAttacker(attacker, target);

    // Pass 1: basic filters (destroyed / range / ammo / arc).
    const viable = attacker.weapons.filter((weapon) => {
      if (weapon.destroyed) return false;
      if (distance > weapon.longRange) return false;

      if (weapon.ammoPerTon > 0) {
        const ammoCount = attacker.ammo[weapon.id];
        if (ammoCount !== undefined && ammoCount <= 0) {
          return false;
        }
      }

      if (!weaponCanCoverArc(weapon, targetArc)) return false;

      return true;
    });

    // Pass 2: minRange handling (task 4.3). Skip LRM-style weapons
    // where target is INSIDE minRange when at least one other
    // weapon can fire without the minimum-range penalty. If every
    // weapon we have is at minRange, keep them all — better to
    // fire at a penalty than to fire nothing.
    const hasAnyAboveMinRange = viable.some(
      (w) => w.minRange === 0 || distance > w.minRange,
    );
    const afterMinRange = hasAnyAboveMinRange
      ? viable.filter((w) => w.minRange === 0 || distance > w.minRange)
      : viable;

    // Pass 3: sort by efficiency descending (short > medium > long
    // within ties). Heat-budget culling downstream operates on the
    // sorted list and drops from the tail.
    return orderWeaponsByEfficiency(afterMinRange, distance);
  }
}

/**
 * Per-change test hook: re-export internal helpers so unit tests can
 * assert on them without standing up a full `AttackAI` instance.
 * Not part of the public surface.
 */
export const __testing__ = {
  targetArcFromAttacker,
  weaponCanCoverArc,
  bracketRankFor,
  calculateFiringArc, // re-exported for convenience
};
