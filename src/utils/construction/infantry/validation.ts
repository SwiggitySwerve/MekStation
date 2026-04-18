/**
 * Infantry Construction Validation Rules (VAL-INF-*)
 *
 * Each exported function validates one rule group and returns a list of
 * error strings (empty = passes). Rule IDs match the spec registry.
 *
 * Rule IDs:
 *   VAL-INF-PLATOON   — platoon size 5–30
 *   VAL-INF-MOTIVE    — motive × platoon size compatibility
 *   VAL-INF-ARMOR-KIT — armor kit × motive compatibility
 *   VAL-INF-WEAPON    — primary weapon × motive legality
 *   VAL-INF-FIELD-GUN — field gun crew vs. platoon size
 *   VAL-INF-ANTI-MECH — anti-mech training × motive legality
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import {
  ANTI_MECH_ELIGIBLE_MOTIVES,
  InfantryArmorKitType,
  InfantryMotive,
  IInfantryFieldGun,
  PLATOON_MAX_TROOPERS,
  PLATOON_MIN_TROOPERS,
  SNEAK_ARMOR_KITS,
  SNEAK_ELIGIBLE_MOTIVES,
  VTOL_MAX_TROOPERS,
} from "@/types/unit/InfantryInterfaces";
import {
  FIELD_GUN_ALLOWED_MOTIVES,
  HEAVY_WEAPON_MOTIVES,
} from "./platoonComposition";
import { totalFieldGunCrew } from "./fieldGuns";

// ============================================================================
// Individual rule validators
// ============================================================================

/**
 * VAL-INF-PLATOON: platoon size must be between 5 and 30 troopers.
 */
export function validatePlatoonSize(totalTroopers: number): string[] {
  const errors: string[] = [];
  if (totalTroopers < PLATOON_MIN_TROOPERS) {
    errors.push(
      `[VAL-INF-PLATOON] platoon size ${totalTroopers} is below minimum ${PLATOON_MIN_TROOPERS}`,
    );
  }
  if (totalTroopers > PLATOON_MAX_TROOPERS) {
    errors.push(
      `[VAL-INF-PLATOON] platoon size ${totalTroopers} exceeds maximum ${PLATOON_MAX_TROOPERS}`,
    );
  }
  return errors;
}

/**
 * VAL-INF-MOTIVE: motive-specific platoon size constraints.
 * Currently enforces the VTOL cap of 10 troopers.
 */
export function validateMotiveCompatibility(
  motive: InfantryMotive,
  totalTroopers: number,
): string[] {
  const errors: string[] = [];
  if (
    motive === InfantryMotive.MECHANIZED_VTOL &&
    totalTroopers > VTOL_MAX_TROOPERS
  ) {
    errors.push(
      `[VAL-INF-MOTIVE] VTOL motive supports up to ${VTOL_MAX_TROOPERS} troopers, got ${totalTroopers}`,
    );
  }
  return errors;
}

/**
 * VAL-INF-ARMOR-KIT: armor kit must be compatible with the motive.
 * Sneak suits require Foot motive.
 */
export function validateArmorKit(
  motive: InfantryMotive,
  armorKit: InfantryArmorKitType,
): string[] {
  const errors: string[] = [];
  if (SNEAK_ARMOR_KITS.has(armorKit) && !SNEAK_ELIGIBLE_MOTIVES.has(motive)) {
    errors.push(
      `[VAL-INF-ARMOR-KIT] Sneak suits require Foot motive, got ${motive}`,
    );
  }
  return errors;
}

/**
 * VAL-INF-WEAPON: heavy primary weapons require Mechanized or Motorized motive.
 *
 * @param isPrimaryHeavy - whether the selected primary weapon is flagged isHeavy
 */
export function validatePrimaryWeapon(
  motive: InfantryMotive,
  isPrimaryHeavy: boolean,
): string[] {
  const errors: string[] = [];
  if (isPrimaryHeavy && !HEAVY_WEAPON_MOTIVES.has(motive)) {
    errors.push(
      `[VAL-INF-WEAPON] heavy primary weapon requires Mechanized or Motorized motive, got ${motive}`,
    );
  }
  return errors;
}

/**
 * VAL-INF-FIELD-GUN: field guns require Foot or Motorized motive, and crew
 * must be strictly less than platoon size (at least one trooper fires personally).
 */
export function validateFieldGuns(
  motive: InfantryMotive,
  totalTroopers: number,
  fieldGuns: readonly IInfantryFieldGun[],
): string[] {
  const errors: string[] = [];
  if (fieldGuns.length === 0) return errors;

  if (!FIELD_GUN_ALLOWED_MOTIVES.has(motive)) {
    errors.push(
      `[VAL-INF-FIELD-GUN] field guns are not allowed for ${motive} motive (Foot and Motorized only)`,
    );
  }

  const crew = totalFieldGunCrew(fieldGuns);
  if (crew >= totalTroopers) {
    errors.push(
      `[VAL-INF-FIELD-GUN] field gun crew (${crew}) must be less than platoon size (${totalTroopers})`,
    );
  }
  return errors;
}

/**
 * VAL-INF-ANTI-MECH: anti-mech training is only valid for Foot, Jump,
 * and Mechanized motives. Motorized is explicitly excluded.
 */
export function validateAntiMechTraining(
  motive: InfantryMotive,
  hasAntiMechTraining: boolean,
): string[] {
  const errors: string[] = [];
  if (hasAntiMechTraining && !ANTI_MECH_ELIGIBLE_MOTIVES.has(motive)) {
    errors.push(
      `[VAL-INF-ANTI-MECH] anti-mech training requires Foot, Jump, or Mechanized motive, got ${motive}`,
    );
  }
  return errors;
}

// ============================================================================
// Rule registry
// ============================================================================

/** All VAL-INF rule IDs registered by this module. */
export const INF_VALIDATION_RULE_IDS = [
  "VAL-INF-PLATOON",
  "VAL-INF-MOTIVE",
  "VAL-INF-ARMOR-KIT",
  "VAL-INF-WEAPON",
  "VAL-INF-FIELD-GUN",
  "VAL-INF-ANTI-MECH",
] as const;

export type InfValidationRuleId = (typeof INF_VALIDATION_RULE_IDS)[number];

// ============================================================================
// Composite validator
// ============================================================================

/** Input shape for the full infantry construction validation pass. */
export interface InfantryValidationInput {
  motive: InfantryMotive;
  totalTroopers: number;
  armorKit: InfantryArmorKitType;
  /** Whether the selected primary weapon is flagged as a heavy weapon */
  isPrimaryHeavy: boolean;
  fieldGuns: readonly IInfantryFieldGun[];
  hasAntiMechTraining: boolean;
}

/** Aggregate result returned by validateInfantryConstruction. */
export interface InfantryValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Run all VAL-INF-* rules in a single pass and return the aggregated result.
 */
export function validateInfantryConstruction(
  input: InfantryValidationInput,
): InfantryValidationResult {
  const errors: string[] = [
    ...validatePlatoonSize(input.totalTroopers),
    ...validateMotiveCompatibility(input.motive, input.totalTroopers),
    ...validateArmorKit(input.motive, input.armorKit),
    ...validatePrimaryWeapon(input.motive, input.isPrimaryHeavy),
    ...validateFieldGuns(input.motive, input.totalTroopers, input.fieldGuns),
    ...validateAntiMechTraining(input.motive, input.hasAntiMechTraining),
  ];

  return { isValid: errors.length === 0, errors };
}
