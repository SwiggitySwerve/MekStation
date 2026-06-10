import { FiringArc } from '@/types/gameplay';
import {
  calculateFiringArc,
  getTwistedFacing,
} from '@/utils/gameplay/firingArc';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { weaponMountCoversTargetArc } from '@/utils/gameplay/weaponMountArcs';

import type { SeededRandom } from '../core/SeededRandom';
import type { IAIStructureState, IAIUnitState, IWeapon } from './types';

import { computeAmmoRunway } from './AIAmmoRunway';
import {
  type IAITierResourceParameters,
  INERT_RESOURCE_PARAMETERS,
} from './AITierRegistry';
import {
  type IWeaponModeContext,
  type IWeaponModeSelection,
  selectWeaponMode,
} from './AIWeaponModeSelector';

/**
 * Per `improve-bot-basic-combat-competence` task 2: score a target
 * for the attacker. Higher = more attractive to fire on.
 *
 * Formula (per `specs/simulation-system/spec.md` Requirement "Bot Target
 * Prioritization by Threat and Kill Probability"):
 *
 *   threat = totalWeaponDamagePerTurn * remainingHpFraction / max(gunnery, 1)
 *   killProbability = clamp(1 - (toHitTN / 12), 0, 1)
 *   score = threat * killProbability + critSeekingTerm
 *
 * `toHitTN` is estimated from the attacker's gunnery + a range modifier.
 * Firing-arc TN contribution is deferred to the weapon-selection step
 * (which EXCLUDES out-of-arc weapons entirely rather than taxing them).
 *
 * `remainingHpFraction` defaults to 1.0 when the AI surface does not
 * yet supply per-unit HP totals — that preserves the legacy scoring
 * for test fixtures while letting real wiring opt in.
 *
 * Per `add-ai-resource-planning` (A2) design D3: when `resource` carries a
 * non-zero `critSeekingWeight`, an ADDITIVE crit-seeking term is added —
 * proportional to the target's structural exposure (stripped armour, prior
 * internal damage). When `resource` is omitted or its `critSeekingWeight`
 * is `0` (the `Green`/`Regular` inert path, and every legacy caller),
 * the crit-seeking term is exactly `0` and `scoreTarget` returns the
 * pre-change `threat * killProbability` value byte-for-byte.
 *
 * Pure function — no state mutation, no `SeededRandom` consumption.
 */
export function scoreTarget(
  attacker: IAIUnitState,
  target: IAIUnitState,
  resource?: IAITierResourceParameters,
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

  const baseScore = threat * killProbability;

  // A2 crit-seeking term — additive, gated on `critSeekingWeight`. The
  // exposure fraction is `0` for a fully-armoured target (or a target with
  // no structure-state data), so a zero weight OR no exposure yields a zero
  // term and the legacy score is reproduced exactly.
  const critWeight = resource?.critSeekingWeight ?? 0;
  if (critWeight <= 0) return baseScore;
  const exposure = structuralExposure(target.structureState);
  return baseScore + critWeight * exposure;
}

/**
 * Per `add-ai-resource-planning` (A2) design D3: a target's structural
 * exposure in `[0, 1]` — a measure of how reachable a crippling critical
 * hit is.
 *
 * Two signals contribute:
 *
 *   - **Stripped armour** — the fraction of locations whose armour is at
 *     zero. A stripped location takes every hit straight to internal
 *     structure / the critical table.
 *   - **Prior internal damage** — `1 - (internalRemaining / internalMax)`
 *     summed across locations. An already-damaged internal structure is
 *     close to a destroyed location.
 *
 * The two are averaged and clamped to `[0, 1]`. A fresh, fully-armoured
 * target scores `0`; a target with an opened side torso scores high. A
 * target with no `structureState` scores `0` — the crit-seeking term then
 * contributes nothing, preserving legacy behavior.
 *
 * Pure function.
 */
export function structuralExposure(
  structure: IAIStructureState | undefined,
): number {
  if (!structure) return 0;

  const armorLocations = Object.entries(structure.armorMaxByLocation);
  const internalLocations = Object.entries(structure.internalMaxByLocation);

  // Stripped-armour signal — fraction of armoured locations now at zero.
  let strippedCount = 0;
  let armorLocationCount = 0;
  for (const [loc, armorMax] of armorLocations) {
    if (armorMax <= 0) continue;
    armorLocationCount++;
    const remaining = structure.armorByLocation[loc] ?? armorMax;
    if (remaining <= 0) strippedCount++;
  }
  const strippedFraction =
    armorLocationCount > 0 ? strippedCount / armorLocationCount : 0;

  // Internal-damage signal — average fraction of internal structure lost.
  let internalDamageSum = 0;
  let internalLocationCount = 0;
  for (const [loc, internalMax] of internalLocations) {
    if (internalMax <= 0) continue;
    internalLocationCount++;
    const remaining = structure.internalByLocation[loc] ?? internalMax;
    internalDamageSum += clamp01(1 - remaining / internalMax);
  }
  const internalDamageFraction =
    internalLocationCount > 0 ? internalDamageSum / internalLocationCount : 0;

  // Average the two signals — a target that is both stripped and internally
  // damaged is maximally exposed.
  return clamp01((strippedFraction + internalDamageFraction) / 2);
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
 * weapon's mounted arc coverage includes the target's relative arc
 * from the attacker.
 *
 * Audit C-8 (2026-06-09): routed through the shared
 * `weaponMountCoversTargetArc` helper so multi-arc mounts (arm-mounted
 * mech weapons hydrate `mountingArcs` [Front, Left/Right] per MegaMek
 * `Mek.getWeaponArc`; vehicle sponsons/turrets do the same) union their
 * arcs instead of being read as singular-only. Semantics for legacy
 * shapes are unchanged: a weapon with NO arc metadata is treated as
 * OMNIDIRECTIONAL (the filter does not exclude it), and singular
 * `mountingArc` weapons cover exactly that one arc.
 */
function weaponCanCoverArc(weapon: IWeapon, targetArc: FiringArc): boolean {
  return weaponMountCoversTargetArc(weapon, targetArc);
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
  if (distance <= weapon.longRange) return 2;
  return 3;
}

function maximumWeaponRange(weapon: IWeapon): number {
  return weapon.extremeRange ?? weapon.longRange;
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
      ...attacker.weapons.filter((w) => !w.destroyed).map(maximumWeaponRange),
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
   *
   * Per `add-ai-resource-planning` (A2): `resource` threads the tier's
   * resource block into `scoreTarget` so the crit-seeking term is applied.
   * Omitted (or with a zero `critSeekingWeight`) the score is the legacy
   * threat-only value — every existing caller is unaffected.
   */
  selectTarget(
    targets: readonly IAIUnitState[],
    random: SeededRandom,
    attacker?: IAIUnitState,
    resource?: IAITierResourceParameters,
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
      score: scoreTarget(attacker, t, resource),
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
   *   2. Target distance <= weapon extreme/long range (in weapon range)
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
      if (distance > maximumWeaponRange(weapon)) return false;

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

  /**
   * Per `add-ai-resource-planning` (A2): the resource-aware fire-list
   * planner. Wraps `selectWeapons` with the three A2 priority modulators —
   * ammo-runway conservation, weapon-mode selection — and reports the
   * per-weapon mode so the caller can record it on the declared attack.
   *
   * The pipeline:
   *
   *   1. Run the legacy `selectWeapons` filter pipeline (destroyed / range /
   *      ammo / arc / minRange / efficiency sort).
   *   2. For each surviving weapon, project its ammo runway (`AIAmmoRunway`)
   *      and select its firing mode (`AIWeaponModeSelector`).
   *   3. Re-order the list by an effective priority that folds the ammo
   *      `conservationWeight` into the legacy damage-per-heat efficiency —
   *      a scarce-ammo weapon sinks toward the tail so the downstream
   *      heat-budget trim drops it first; an abundant / energy weapon is
   *      unchanged. The binary 0-ammo cull from `selectWeapons` is
   *      untouched — conservation modulates ORDER, never eligibility.
   *
   * When `resource` is the inert block (`Green`/`Regular`, or omitted),
   * `ammoConservationWeight` is `0` so the re-order is a no-op and
   * `weaponModeSelection` is `false` so every weapon reports its default
   * mode — the result is the legacy `selectWeapons` order, byte-for-byte.
   *
   * Pure function — no `SeededRandom` consumption.
   */
  planFireList(
    attacker: IAIUnitState,
    target: IAIUnitState,
    options: {
      readonly resource?: IAITierResourceParameters;
      /** Heat headroom for mode selection (safe threshold minus committed). */
      readonly heatHeadroom?: number;
    } = {},
  ): readonly IFireListEntry[] {
    const resource = options.resource ?? INERT_RESOURCE_PARAMETERS;
    const ordered = this.selectWeapons(attacker, target);
    const distance = hexDistance(attacker.position, target.position);

    const modeContextBase: Omit<IWeaponModeContext, 'ammoTurnsRemaining'> = {
      distance,
      targetStructure: target.structureState,
      targetEvading: target.isEvading,
      // A generous default headroom when the caller does not supply one —
      // mode selection still works, it just does not see heat pressure.
      heatHeadroom: options.heatHeadroom ?? Number.POSITIVE_INFINITY,
    };

    // Build a fire-list entry per weapon: runway + selected mode.
    const entries: IFireListEntry[] = ordered.map((weapon) => {
      const ammoRemaining = attacker.ammo[weapon.id];
      // The mode-selection step needs an estimate of shots-per-turn; use
      // the weapon's default mode shot count when metadata is present.
      const defaultShots = defaultShotsPerTurn(weapon);
      const runway = computeAmmoRunway(weapon, ammoRemaining, defaultShots);
      const mode = selectWeaponMode(
        weapon,
        { ...modeContextBase, ammoTurnsRemaining: runway.turnsRemaining },
        resource.weaponModeSelection,
      );
      // Re-project the runway against the SELECTED mode's shot count so a
      // higher-rate-of-fire mode shows its true (shorter) runway.
      const modeRunway = computeAmmoRunway(
        weapon,
        ammoRemaining,
        Math.max(1, mode.effectiveShots),
      );
      return { weapon, mode, runway: modeRunway };
    });

    // When ammo conservation is inert, keep the legacy efficiency order.
    if (resource.ammoConservationWeight <= 0) {
      return entries;
    }

    // Re-order by effective priority: legacy damage-per-heat efficiency
    // scaled by a conservation factor. A neutral runway (`weight === 1`)
    // leaves priority at full efficiency; a scarce runway pulls it toward
    // zero in proportion to `ammoConservationWeight`. A stable sort keeps
    // equal-priority weapons in their legacy relative order.
    const withPriority = entries.map((entry, index) => {
      const efficiency =
        entry.mode.effectiveDamage / Math.max(1, entry.mode.effectiveHeat);
      // conservationFactor in [1 - w, 1]: weight 1 -> factor 1 (neutral);
      // weight MIN -> factor (1 - w * (1 - MIN)).
      const conservationFactor =
        1 -
        resource.ammoConservationWeight * (1 - entry.runway.conservationWeight);
      return {
        entry,
        index,
        priority: efficiency * conservationFactor,
      };
    });
    withPriority.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      // Stable tie-break — preserve the legacy efficiency order.
      return a.index - b.index;
    });
    return withPriority.map((p) => p.entry);
  }
}

/**
 * Per `add-ai-resource-planning` (A2): one entry in a resource-planned fire
 * list — the weapon, its selected firing mode, and its ammo runway. Returned
 * by `AttackAI.planFireList`.
 */
export interface IFireListEntry {
  /** The weapon to fire. */
  readonly weapon: IWeapon;
  /** The firing mode selected for this weapon this turn. */
  readonly mode: IWeaponModeSelection;
  /** The weapon's projected ammo runway against the selected mode. */
  readonly runway: ReturnType<typeof computeAmmoRunway>;
}

/**
 * The expected shots-per-turn for a weapon's DEFAULT firing mode — used to
 * seed the ammo-runway estimate before a mode is chosen. A weapon with
 * `firingModes` metadata uses its default mode's `shotsPerTurn`; a
 * single-mode ammo weapon fires one shot; an energy weapon fires zero.
 */
function defaultShotsPerTurn(weapon: IWeapon): number {
  const modes = weapon.firingModes;
  if (modes && modes.modes.length > 0) {
    const def =
      modes.modes.find((m) => m.id === modes.defaultModeId) ?? modes.modes[0];
    return Math.max(1, def.shotsPerTurn);
  }
  return weapon.ammoPerTon > 0 ? 1 : 0;
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
