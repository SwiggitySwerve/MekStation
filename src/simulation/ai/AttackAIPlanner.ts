import {
  hasAmmoForAI,
  isAmmoDependent,
} from '@/utils/gameplay/ammoTracking/weapons';
import { calculateFiringArc } from '@/utils/gameplay/firingArc';
import { hexDistance } from '@/utils/gameplay/hexMath';

import type { SeededRandom } from '../core/SeededRandom';
import type { IAIUnitState, IWeapon } from './types';

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
import { scoreTarget } from './AttackAITargetScoring';
import {
  targetArcFromAttacker,
  weaponCanCoverArc,
  orderWeaponsByEfficiency,
  bracketRankFor,
  maximumWeaponRange,
} from './AttackAIWeaponSelection';

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
   *   3. Ammo readiness under the shared owner's capacity/count policy
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

      if (!hasAmmoForAI(weapon, attacker.ammo[weapon.id])) return false;

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
  return isAmmoDependent(weapon) ? 1 : 0;
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
