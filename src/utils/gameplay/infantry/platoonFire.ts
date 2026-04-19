/**
 * Infantry Platoon Fire Resolution
 *
 * Infantry platoons fire their massed small arms as a single group attack.
 * Per TW "Infantry Weapon Table" / MegaMek `CIDamageRule` approximation:
 *
 *   damage = floor( survivingTroopers × weaponRating / divisor )
 *
 * where `weaponRating` is the platoon's primary (+ secondary at a reduced
 * ratio) infantry weapon rating and `divisor` comes from the weapon entry
 * (smaller divisor = more damage per trooper). Troopers assigned to crew
 * the field gun do NOT contribute to the personal-weapons barrage.
 *
 * The fired damage is then handed to the target's damage resolver (mech,
 * vehicle, etc.) through the normal cross-unit damage pipeline; the infantry
 * damage divisor table described in `damageDivisor.ts` only applies when
 * infantry is the TARGET, not the attacker.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-infantry-combat-behavior/tasks.md §6 (Platoon Fire Resolution)
 */

import type { IInfantryCombatState } from './state';

// ============================================================================
// Weapon rating inputs
// ============================================================================

/**
 * Minimal per-weapon stats needed to compute barrage damage.
 *
 *  - `rating`   — damage contribution per trooper (e.g. 0.26 for an SMG).
 *  - `divisor`  — divisor applied after the trooper-count multiplication
 *                 (comes from `IInfantryWeaponEntry.damageDivisor`).
 */
export interface IInfantryWeaponRating {
  readonly rating: number;
  readonly divisor: number;
}

/**
 * Inputs to the barrage computation.
 *
 * `secondaryRatio` is the "1 per N troopers" ratio for the secondary weapon
 * (0 or undefined = no secondary). Field-gun crew are subtracted before any
 * rating math.
 */
export interface IPlatoonFirepowerParams {
  readonly state: IInfantryCombatState;
  readonly primary: IInfantryWeaponRating;
  readonly secondary?: IInfantryWeaponRating;
  readonly secondaryRatio?: number;
}

/** Decomposed result (mostly for testability). */
export interface IPlatoonFirepowerBreakdown {
  readonly firingTroopers: number;
  readonly primaryDamage: number;
  readonly secondaryDamage: number;
  readonly totalDamage: number;
}

// ============================================================================
// Effective firing count
// ============================================================================

/**
 * Return the number of troopers actually contributing personal weapons.
 *
 *   firing = survivingTroopers − fieldGunCrew
 *
 * Pinned / routed / destroyed platoons can't fire at all.
 */
export function firingTrooperCount(state: IInfantryCombatState): number {
  if (state.pinned || state.routed || state.destroyed) return 0;
  if (state.survivingTroopers <= 0) return 0;
  const firing = state.survivingTroopers - state.fieldGunCrew;
  return Math.max(0, firing);
}

// ============================================================================
// Barrage damage
// ============================================================================

/**
 * Compute barrage damage from the infantry platoon. Returns the total damage
 * plus a breakdown for tests / UI.
 *
 * Formula (matches TW + MegaMek conventions):
 *
 *   firing = survivingTroopers − fieldGunCrew (when able to fire)
 *   primaryDmg = floor( firing × primary.rating / primary.divisor )
 *   secondaryCount = floor( firing / secondaryRatio ) when defined
 *   secondaryDmg = floor( secondaryCount × secondary.rating / secondary.divisor )
 *   total = primaryDmg + secondaryDmg
 */
export function computePlatoonFirepower(
  params: IPlatoonFirepowerParams,
): IPlatoonFirepowerBreakdown {
  const firing = firingTrooperCount(params.state);
  if (firing <= 0) {
    return {
      firingTroopers: 0,
      primaryDamage: 0,
      secondaryDamage: 0,
      totalDamage: 0,
    };
  }

  const primaryDivisor =
    params.primary.divisor > 0 ? params.primary.divisor : 1;
  const primaryDamage = Math.floor(
    (firing * params.primary.rating) / primaryDivisor,
  );

  let secondaryDamage = 0;
  if (
    params.secondary !== undefined &&
    params.secondaryRatio !== undefined &&
    params.secondaryRatio > 0
  ) {
    const secondaryCount = Math.floor(firing / params.secondaryRatio);
    const secDivisor =
      params.secondary.divisor > 0 ? params.secondary.divisor : 1;
    secondaryDamage = Math.floor(
      (secondaryCount * params.secondary.rating) / secDivisor,
    );
  }

  return {
    firingTroopers: firing,
    primaryDamage,
    secondaryDamage,
    totalDamage: primaryDamage + secondaryDamage,
  };
}
