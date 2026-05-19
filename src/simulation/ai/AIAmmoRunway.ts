/**
 * AI Ammo Runway — turns-of-fire projection.
 *
 * Per `add-ai-resource-planning` design D2: the legacy bot's ammo model is
 * binary — a weapon with `ammo[weaponId] <= 0` is culled, but a weapon with
 * two shots left is treated exactly like one with forty. The bot empties an
 * autocannon early and is left with a dead-weight ton of nothing.
 *
 * `projectAmmoRunway` estimates, per ammo-dependent weapon, how many turns of
 * fire the remaining ammo supports at the bot's expected per-turn fire rate,
 * and derives a **conservation weight** in `[0, 1]`. When runway is short the
 * weight drops so the weapon's selection priority falls and the bot saves it
 * for a higher-value shot. When runway is long the weight is neutral (`1`).
 * Energy weapons report an infinite runway and a neutral weight.
 *
 * The binary "0 ammo = culled" rule is unchanged — runway only modulates
 * *priority*, never *eligibility*. This module is a pure deterministic
 * function of weapon/ammo state — it never consumes `SeededRandom`.
 *
 * @spec openspec/changes/add-ai-resource-planning/specs/simulation-system/spec.md
 *   Requirement: Ammo-Runway Projection
 */

import type { IWeapon } from './types';

/**
 * Runway below which a weapon is considered scarce — at or under this many
 * turns of fire the conservation weight starts dropping below neutral.
 *
 * Three turns is the design "few turns of fire remaining" threshold: a
 * weapon that can fire only three more times is rationed; one with four or
 * more turns of fire is treated as abundant and left neutral.
 */
export const SCARCE_RUNWAY_TURNS = 3;

/**
 * The conservation weight floor — the lowest priority multiplier a very
 * scarce weapon receives. A nearly-empty weapon is still eligible to fire
 * (the binary cull is untouched) but its selection priority is multiplied
 * down to this fraction, so the bot prefers an equivalent energy weapon and
 * holds the scarce shot for a high-value opportunity.
 */
export const MIN_CONSERVATION_WEIGHT = 0.25;

/** Per-weapon runway projection result. */
export interface IAmmoRunway {
  /** The weapon this runway is for. */
  readonly weaponId: string;
  /**
   * Estimated turns of fire the remaining ammo supports, or `Infinity` for
   * an energy weapon with no ammo dependency.
   */
  readonly turnsRemaining: number;
  /**
   * Conservation multiplier in `[0, 1]` applied to the weapon's selection
   * priority. `1` is neutral (abundant ammo / energy weapon); values below
   * `1` ration a scarce weapon. Never reaches `0` — a scarce weapon stays
   * eligible.
   */
  readonly conservationWeight: number;
}

/**
 * True when a weapon draws on ammo. Mirrors the `AttackAI.selectWeapons`
 * eligibility check: `ammoPerTon > 0` marks an ammo-dependent weapon;
 * `ammoPerTon === -1` (or `0`) marks an energy weapon.
 */
function isAmmoDependent(weapon: IWeapon): boolean {
  return weapon.ammoPerTon > 0;
}

/**
 * Compute the runway for a single weapon given the remaining ammo count and
 * the expected number of shots the weapon consumes per turn.
 *
 * Energy weapons (`ammoPerTon <= 0`) short-circuit to an infinite runway and
 * a neutral weight. For ammo-dependent weapons, `turnsRemaining` is the
 * remaining ammo divided by the per-turn fire rate (floored — a partial
 * turn of fire is not a full turn). The conservation weight ramps linearly
 * from `MIN_CONSERVATION_WEIGHT` at zero runway up to `1` at
 * `SCARCE_RUNWAY_TURNS` turns, and stays `1` beyond that.
 *
 * @param weapon         the weapon to project
 * @param ammoRemaining  rounds of ammo available to this weapon; when
 *                       `undefined` the weapon's ammo is unknown and treated
 *                       as abundant (neutral weight) — matching the legacy
 *                       `selectWeapons` behavior where an absent ammo entry
 *                       does not cull the weapon
 * @param shotsPerTurn   expected rounds the weapon fires each turn; defaults
 *                       to `1` (one shot per weapon per turn). Rate-of-fire
 *                       weapons firing in a higher mode pass a larger value.
 */
export function computeAmmoRunway(
  weapon: IWeapon,
  ammoRemaining: number | undefined,
  shotsPerTurn = 1,
): IAmmoRunway {
  // Energy weapons never run dry — infinite runway, neutral weight.
  if (!isAmmoDependent(weapon)) {
    return {
      weaponId: weapon.id,
      turnsRemaining: Infinity,
      conservationWeight: 1,
    };
  }

  // Unknown ammo count — treat as abundant so we never ration a weapon the
  // caller has not supplied data for. This keeps legacy `IAIUnitState`
  // fixtures (empty `ammo` map) neutral.
  if (ammoRemaining === undefined) {
    return {
      weaponId: weapon.id,
      turnsRemaining: Infinity,
      conservationWeight: 1,
    };
  }

  const rate = Math.max(1, shotsPerTurn);
  const turnsRemaining = Math.max(0, Math.floor(ammoRemaining / rate));

  // Linear ramp: 0 turns -> MIN_CONSERVATION_WEIGHT, SCARCE_RUNWAY_TURNS
  // turns -> 1, clamped to [MIN_CONSERVATION_WEIGHT, 1] beyond either end.
  let conservationWeight: number;
  if (turnsRemaining >= SCARCE_RUNWAY_TURNS) {
    conservationWeight = 1;
  } else {
    const t = turnsRemaining / SCARCE_RUNWAY_TURNS;
    conservationWeight =
      MIN_CONSERVATION_WEIGHT + (1 - MIN_CONSERVATION_WEIGHT) * t;
  }

  return { weaponId: weapon.id, turnsRemaining, conservationWeight };
}

/**
 * Project the ammo runway for every weapon in a fire list.
 *
 * Returns one `IAmmoRunway` per input weapon, keyed by `weaponId`. The
 * `conservationWeight` of each entry is what `AttackAI` multiplies into the
 * weapon's selection priority — energy weapons and abundant-ammo weapons
 * pass through neutral; scarce weapons drop.
 *
 * Pure and deterministic.
 *
 * @param weapons     the candidate fire list
 * @param ammoByWeaponId  remaining ammo keyed by weapon id (the
 *                        `IAIUnitState.ammo` map)
 * @param shotsPerTurnByWeaponId  optional per-weapon expected shots per turn;
 *                                weapons absent from the map default to `1`
 */
export function projectAmmoRunway(
  weapons: readonly IWeapon[],
  ammoByWeaponId: Readonly<Record<string, number>>,
  shotsPerTurnByWeaponId?: Readonly<Record<string, number>>,
): readonly IAmmoRunway[] {
  return weapons.map((weapon) =>
    computeAmmoRunway(
      weapon,
      ammoByWeaponId[weapon.id],
      shotsPerTurnByWeaponId?.[weapon.id] ?? 1,
    ),
  );
}
