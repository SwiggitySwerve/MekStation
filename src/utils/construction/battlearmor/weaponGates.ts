/**
 * Battle Armor Weapon Gating Rules
 *
 * Validates weight-class thresholds for heavy weapon mounting and the
 * Light-class-only anti-personnel (AP) weapon slot.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 * @tasks §7.1 (heavy-weapon weight class gate), §8.4 (AP weapon slot)
 */

import {
  BAWeightClass,
  BA_VALIDATION_RULES,
  IBAWeaponMount,
} from '@/types/unit/BattleArmorInterfaces';

/**
 * Weight-class ordering used for "class >= X" comparisons.
 * PA(L) < Light < Medium < Heavy < Assault.
 */
const WEIGHT_CLASS_RANK: Readonly<Record<BAWeightClass, number>> = {
  [BAWeightClass.PA_L]: 0,
  [BAWeightClass.LIGHT]: 1,
  [BAWeightClass.MEDIUM]: 2,
  [BAWeightClass.HEAVY]: 3,
  [BAWeightClass.ASSAULT]: 4,
};

/**
 * Minimum weight class permitted to mount heavy BA weapons (SRM-2, MG,
 * small laser, etc. — anything tagged `weaponWeight: 'heavy'`).
 *
 * Per Total Warfare p.259: heavy weapons on a BA trooper require at
 * least Medium class. PA(L) and Light cannot carry heavy weapons, even
 * with a Heavy / Battle Claw — the chassis frame cannot bear the load.
 *
 * @spec openspec/changes/add-battlearmor-construction/tasks.md §7.1
 */
export const MIN_CLASS_FOR_HEAVY_WEAPON: BAWeightClass = BAWeightClass.MEDIUM;

export interface WeaponGateResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate that a heavy-classed weapon's mounting is legal for the squad's
 * weight class.
 *
 * Complements the per-arm manipulator gate (see `manipulators.ts`): the
 * manipulator check ensures the arm has grip; this check ensures the
 * *chassis* has the frame to bear a heavy weapon at all.
 *
 * Returns a `VAL-BA-CLASS` error if the weapon is heavy and the squad is
 * below `MIN_CLASS_FOR_HEAVY_WEAPON`.
 *
 * @spec openspec/changes/add-battlearmor-construction/tasks.md §7.1
 */
export function validateHeavyWeaponClass(
  weapon: IBAWeaponMount,
  weightClass: BAWeightClass,
): WeaponGateResult {
  const errors: string[] = [];

  if (weapon.weaponWeight !== 'heavy') {
    return { isValid: true, errors };
  }

  if (
    WEIGHT_CLASS_RANK[weightClass] <
    WEIGHT_CLASS_RANK[MIN_CLASS_FOR_HEAVY_WEAPON]
  ) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_CLASS}: ${weapon.name} is a heavy BA weapon — requires ${MIN_CLASS_FOR_HEAVY_WEAPON} class or heavier (current: ${weightClass})`,
    );
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Run `validateHeavyWeaponClass` across every weapon on the squad.
 */
export function validateAllHeavyWeaponClasses(
  weapons: readonly IBAWeaponMount[],
  weightClass: BAWeightClass,
): WeaponGateResult {
  const errors: string[] = [];
  for (const weapon of weapons) {
    const result = validateHeavyWeaponClass(weapon, weightClass);
    errors.push(...result.errors);
  }
  return { isValid: errors.length === 0, errors };
}

/**
 * Weight class that owns the dedicated anti-personnel weapon slot.
 *
 * Per Tactical Operations the one-per-suit AP weapon mount (flamers,
 * needlers, small pistols) is specifically a **Light** BA feature.
 * PA(L) relies on inherent pistols; Medium and heavier suits replace
 * the slot with heavier armament.
 *
 * @spec openspec/changes/add-battlearmor-construction/tasks.md §8.4
 */
export const AP_WEAPON_SLOT_CLASS: BAWeightClass = BAWeightClass.LIGHT;

/**
 * Validate that any AP-weapon-flagged mounts (`isAPWeapon: true`) are
 * only present on Light-class suits.
 *
 * Returns a `VAL-BA-CLASS` error for each AP-flagged weapon on a
 * non-Light squad.
 *
 * @spec openspec/changes/add-battlearmor-construction/tasks.md §8.4
 */
export function validateAPWeaponSlot(
  weapons: readonly IBAWeaponMount[],
  weightClass: BAWeightClass,
): WeaponGateResult {
  const errors: string[] = [];

  if (weightClass === AP_WEAPON_SLOT_CLASS) {
    return { isValid: true, errors };
  }

  for (const weapon of weapons) {
    if (weapon.isAPWeapon) {
      errors.push(
        `${BA_VALIDATION_RULES.VAL_BA_CLASS}: Anti-personnel weapon slot (${weapon.name}) is a ${AP_WEAPON_SLOT_CLASS}-class-only feature (current: ${weightClass})`,
      );
    }
  }

  return { isValid: errors.length === 0, errors };
}
