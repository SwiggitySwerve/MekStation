/**
 * Battle Armor Armor Utilities
 *
 * Calculates armor mass, enforces per-class caps, and validates
 * armor type restrictions.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 * Requirement: Armor Points per Trooper
 */

import {
  BAArmorType,
  BAWeightClass,
  BA_ARMOR_TYPE_DATA,
  BA_VALIDATION_RULES,
  BA_WEIGHT_CLASS_LIMITS,
} from "@/types/unit/BattleArmorInterfaces";

export interface ArmorValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  /** Number of body slots reserved by the camo generator (0 or 1) */
  readonly camoBodySlots: number;
}

/**
 * Compute the armor mass (kg) for a trooper at the given points and type.
 *
 * Formula: armorPoints × kgPerPoint
 */
export function armorMassKg(
  armorPoints: number,
  armorType: BAArmorType,
): number {
  return armorPoints * BA_ARMOR_TYPE_DATA[armorType].kgPerPoint;
}

/**
 * Return the number of body slots consumed by a camouflage generator
 * for the given armor type (0 or 1).
 */
export function camoBodySlots(armorType: BAArmorType): number {
  return BA_ARMOR_TYPE_DATA[armorType].requiresCamoBodySlot ? 1 : 0;
}

/**
 * Validate armor point count and type legality for a weight class.
 *
 * Rules enforced:
 * - armorPoints <= class max (VAL-BA-ARMOR)
 * - armor type not in the class's forbidden list (VAL-BA-ARMOR)
 */
export function validateArmor(
  armorPoints: number,
  armorType: BAArmorType,
  weightClass: BAWeightClass,
): ArmorValidationResult {
  const errors: string[] = [];
  const limits = BA_WEIGHT_CLASS_LIMITS[weightClass];
  const typeData = BA_ARMOR_TYPE_DATA[armorType];

  if (armorPoints > limits.maxArmorPoints) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_ARMOR}: ${weightClass} class cap is ${limits.maxArmorPoints} armor points`,
    );
  }

  if (typeData.forbiddenClasses?.includes(weightClass)) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_ARMOR}: ${armorType} is not available for ${weightClass} class`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    camoBodySlots: camoBodySlots(armorType),
  };
}
