/**
 * Infantry Damage-Per-Trooper Formula
 *
 * A verbatim reproduction of MegaMek's `Infantry.getDamagePerTrooper()`
 * (`E:\Projects\megamek\megamek\src\megamek\common\units\Infantry.java`,
 * line 1687), used to compute the conventional-infantry record sheet's
 * `DAMAGE+j` row.
 *
 * The MegaMek Java source:
 *
 * ```java
 * public double getDamagePerTrooper() {
 *     if (null == primaryWeapon) {
 *         return 0;
 *     }
 *     // per 09/2021 errata, primary infantry weapon damage caps out at 0.6
 *     double adjustedDamage = Math.min(MMConstants.INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP,
 *           primaryWeapon.getInfantryDamage());
 *     double damage = adjustedDamage * (squadSize - secondaryWeaponsPerSquad);
 *     if (null != secondaryWeapon) {
 *         damage += secondaryWeapon.getInfantryDamage() * secondaryWeaponsPerSquad;
 *     }
 *     return damage / squadSize;
 * }
 * ```
 *
 * This module reproduces the calculation exactly — including the
 * documented `0.6` primary-weapon damage cap
 * (`MMConstants.INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`, per the 09/2021
 * errata) — and adds the `DAMAGE+j` row generator the record sheet
 * needs. It is a transcription, not a design: do not alter the formula.
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Infantry Damage-Per-Trooper Formula)
 */

import { INFANTRY_MAX_TROOPERS } from '../templateElementIds';

/**
 * The primary-weapon damage cap, per the 09/2021 errata.
 *
 * Verbatim from MegaMek `MMConstants.INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`
 * (`E:\Projects\megamek\megamek\src\megamek\MMConstants.java`, line 119:
 * `public static final double INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP = 0.6;`).
 */
export const INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP = 0.6;

/**
 * Inputs to the damage-per-trooper formula. Mirrors the MegaMek
 * `Infantry` fields the Java method reads: `primaryWeapon`,
 * `secondaryWeapon`, `squadSize`, `secondaryWeaponsPerSquad`.
 */
export interface InfantryDamageInput {
  /**
   * The primary weapon's canonical per-trooper damage
   * (`InfantryWeapon.getInfantryDamage()`). `undefined` reproduces the
   * Java `null == primaryWeapon` guard — no primary weapon means zero
   * damage per trooper.
   */
  readonly primaryWeaponDamage: number | undefined;
  /**
   * The secondary weapon's canonical per-trooper damage. `undefined`
   * reproduces the Java `null != secondaryWeapon` guard — no secondary
   * weapon contributes nothing.
   */
  readonly secondaryWeaponDamage?: number;
  /** Troopers per squad (`squadSize`). */
  readonly squadSize: number;
  /** Secondary weapons carried per squad (`secondaryWeaponsPerSquad`). */
  readonly secondaryWeaponsPerSquad: number;
}

/**
 * Compute the damage per trooper for a conventional infantry platoon.
 *
 * Verbatim reproduction of `Infantry.getDamagePerTrooper()`. The primary
 * weapon's contribution is capped at `0.6`
 * (`INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`); the secondary weapon's
 * contribution is uncapped, exactly as in the Java source.
 *
 * Returns `0` when there is no primary weapon (the Java `null` guard) or
 * when `squadSize` is zero or negative (defensive — the Java code would
 * divide by zero; the record sheet must not emit `NaN`).
 */
export function getDamagePerTrooper(input: InfantryDamageInput): number {
  // Java: `if (null == primaryWeapon) { return 0; }`
  if (input.primaryWeaponDamage === undefined) {
    return 0;
  }
  // Defensive: the Java code divides by `squadSize`; guard against a
  // zero / negative squad so the record sheet never renders `NaN`.
  if (input.squadSize <= 0) {
    return 0;
  }

  // Java: `Math.min(INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP, primaryWeapon.getInfantryDamage())`
  const adjustedDamage = Math.min(
    INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP,
    input.primaryWeaponDamage,
  );
  // Java: `adjustedDamage * (squadSize - secondaryWeaponsPerSquad)`
  let damage =
    adjustedDamage * (input.squadSize - input.secondaryWeaponsPerSquad);
  // Java: `if (null != secondaryWeapon) { damage += secondaryWeapon.getInfantryDamage() * secondaryWeaponsPerSquad; }`
  if (input.secondaryWeaponDamage !== undefined) {
    damage += input.secondaryWeaponDamage * input.secondaryWeaponsPerSquad;
  }
  // Java: `return damage / squadSize;`
  return damage / input.squadSize;
}

/**
 * Whether the primary weapon's damage is being capped by the formula —
 * mirrors MegaMek `Infantry.primaryWeaponDamageCapped()`
 * (`getPrimaryWeaponDamage() > INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`).
 */
export function isPrimaryWeaponDamageCapped(
  primaryWeaponDamage: number | undefined,
): boolean {
  return (
    primaryWeaponDamage !== undefined &&
    primaryWeaponDamage > INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP
  );
}

/**
 * Generate the `DAMAGE+j` row for the infantry record sheet.
 *
 * For each trooper count `j` in `1..30` (the `damage_1`..`damage_30`
 * template slots — `INFANTRY_MAX_TROOPERS`), the rendered value is
 * `round(perTrooper × j)`, matching MegaMek `PrintInfantry`:
 * `setTextField(DAMAGE + j, (int) Math.round(getDamagePerTrooper() * j))`.
 *
 * @returns an array of 30 integers, index `i` holding the `DAMAGE+(i+1)`
 *   value (so `result[0]` is the `j=1` value, `result[29]` the `j=30`).
 */
export function generateDamageRow(perTrooper: number): readonly number[] {
  const row: number[] = [];
  for (let j = 1; j <= INFANTRY_MAX_TROOPERS; j++) {
    // MegaMek `PrintInfantry`: `(int) Math.round(getDamagePerTrooper() * j)`.
    row.push(Math.round(perTrooper * j));
  }
  return row;
}
