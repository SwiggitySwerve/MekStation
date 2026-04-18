/**
 * Platoon Composition Utilities
 *
 * Derives default compositions, movement points, and effective trooper
 * counts from motive type per TechManual tables.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import {
  InfantryMotive,
  IPlatoonComposition,
  IInfantryMP,
  PLATOON_DEFAULTS,
  MOTIVE_MP,
} from '@/types/unit/InfantryInterfaces';

// ============================================================================
// Composition helpers
// ============================================================================

/**
 * Return the TechManual default composition for a given motive type.
 * Callers may override individual fields after calling this.
 */
export function getDefaultComposition(
  motive: InfantryMotive,
): IPlatoonComposition {
  return PLATOON_DEFAULTS[motive];
}

/**
 * Calculate total trooper count from a composition.
 */
export function totalTroopers(composition: IPlatoonComposition): number {
  return composition.squads * composition.troopersPerSquad;
}

/**
 * Return movement points derived from motive type.
 * The store may store these as editable overrides; this is the canonical
 * source of truth before any override.
 */
export function getMotiveMP(motive: InfantryMotive): IInfantryMP {
  return MOTIVE_MP[motive];
}

// ============================================================================
// Effective trooper helpers
// ============================================================================

/**
 * Calculate how many troopers are available to fire personal weapons,
 * accounting for field gun crew.
 *
 * @param platoonStrength - total troopers in the platoon
 * @param fieldGunCrew - troopers assigned to field gun operation (0 if none)
 */
export function effectiveFiringTroopers(
  platoonStrength: number,
  fieldGunCrew: number,
): number {
  return Math.max(0, platoonStrength - fieldGunCrew);
}

/**
 * Calculate how many secondary weapons the platoon carries.
 * Formula: floor(totalTroopers / ratio)
 *
 * @param platoonStrength - total troopers
 * @param ratio - 1 per N troopers from weapon table entry
 */
export function secondaryWeaponCount(
  platoonStrength: number,
  ratio: number,
): number {
  if (ratio <= 0) return 0;
  return Math.floor(platoonStrength / ratio);
}

// ============================================================================
// Motive compatibility
// ============================================================================

/**
 * Motives that allow field guns (Foot and Motorized).
 * Jump and all Mechanized subtypes may NOT crew field guns per TW rules.
 */
export const FIELD_GUN_ALLOWED_MOTIVES = new Set<InfantryMotive>([
  InfantryMotive.FOOT,
  InfantryMotive.MOTORIZED,
]);

/**
 * Motives that allow heavy primary weapons.
 * Mechanized and Motorized platoons can operate support-weight weapons.
 */
export const HEAVY_WEAPON_MOTIVES = new Set<InfantryMotive>([
  InfantryMotive.MOTORIZED,
  InfantryMotive.MECHANIZED_TRACKED,
  InfantryMotive.MECHANIZED_WHEELED,
  InfantryMotive.MECHANIZED_HOVER,
  InfantryMotive.MECHANIZED_VTOL,
]);
