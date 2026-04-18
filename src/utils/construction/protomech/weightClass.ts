/**
 * ProtoMech Weight Class Tables
 *
 * Bucketing logic: Light 2–4t, Medium 5–7t, Heavy 8–9t, Ultraheavy 10–15t.
 * Per-location armor maximums from BattleTech Total Warfare construction rules.
 *
 * @spec openspec/changes/add-protomech-construction/specs/protomech-unit-system/spec.md
 * @spec openspec/changes/add-protomech-construction/tasks.md §2
 */

import {
  IProtoArmorMaxByTonnage,
  ProtoChassis,
  ProtoWeightClass,
} from '@/types/unit/ProtoMechInterfaces';

// =============================================================================
// Tonnage range constants
// =============================================================================

/** Minimum tonnage for a Standard ProtoMech */
export const PROTO_MIN_TONNAGE = 2;
/** Maximum tonnage for a Standard ProtoMech */
export const PROTO_MAX_STANDARD_TONNAGE = 9;
/** Minimum tonnage for an Ultraheavy ProtoMech */
export const PROTO_MIN_ULTRAHEAVY_TONNAGE = 10;
/** Maximum tonnage for any ProtoMech */
export const PROTO_MAX_TONNAGE = 15;

// =============================================================================
// Weight class derivation
// =============================================================================

/**
 * Derive the ProtoWeightClass from a tonnage value.
 *
 * Returns Ultraheavy for 10–15 t regardless of chassisType — the caller is
 * responsible for validating that Ultraheavy chassis matches 10+ tons
 * (see VAL-PROTO-CHASSIS in validation.ts).
 */
export function getProtoWeightClass(tonnage: number): ProtoWeightClass {
  if (tonnage >= 10) return ProtoWeightClass.ULTRAHEAVY;
  if (tonnage >= 8) return ProtoWeightClass.HEAVY;
  if (tonnage >= 5) return ProtoWeightClass.MEDIUM;
  return ProtoWeightClass.LIGHT;
}

// =============================================================================
// Per-location armor maximums
// =============================================================================

/**
 * Per-location armor point maximums indexed by tonnage (2–15).
 * Values derived from Total Warfare ProtoMech construction table.
 *
 * Arm column applies to each arm individually (Biped/Glider) or to the
 * Front Legs pair (Quad). Legs applies to rear legs on Quad chassis.
 */
const ARMOR_MAX_BY_TONNAGE: Record<number, IProtoArmorMaxByTonnage> = {
  2: { head: 3, torso: 6, arm: 3, legs: 4, mainGun: 0 },
  3: { head: 4, torso: 8, arm: 4, legs: 6, mainGun: 0 },
  4: { head: 5, torso: 10, arm: 5, legs: 8, mainGun: 0 },
  5: { head: 6, torso: 12, arm: 6, legs: 10, mainGun: 2 },
  6: { head: 7, torso: 15, arm: 7, legs: 12, mainGun: 2 },
  7: { head: 8, torso: 17, arm: 8, legs: 14, mainGun: 2 },
  8: { head: 9, torso: 20, arm: 9, legs: 16, mainGun: 3 },
  9: { head: 10, torso: 23, arm: 10, legs: 18, mainGun: 3 },
  10: { head: 11, torso: 26, arm: 11, legs: 20, mainGun: 4 },
  11: { head: 12, torso: 29, arm: 12, legs: 22, mainGun: 4 },
  12: { head: 13, torso: 32, arm: 13, legs: 24, mainGun: 4 },
  13: { head: 14, torso: 35, arm: 14, legs: 26, mainGun: 5 },
  14: { head: 15, torso: 38, arm: 15, legs: 28, mainGun: 5 },
  15: { head: 16, torso: 41, arm: 16, legs: 30, mainGun: 5 },
};

/**
 * Return per-location armor maximums for a given tonnage.
 * Clamps tonnage to the legal 2–15 range before lookup.
 */
export function getProtoArmorMaxByTonnage(
  tonnage: number,
): IProtoArmorMaxByTonnage {
  const clamped = Math.max(
    PROTO_MIN_TONNAGE,
    Math.min(PROTO_MAX_TONNAGE, Math.floor(tonnage)),
  );
  // Safe: every integer 2–15 is present in the table
  return ARMOR_MAX_BY_TONNAGE[clamped]!;
}

// =============================================================================
// Chassis × tonnage legality
// =============================================================================

/**
 * Return true when the chassis type is legal for the given tonnage.
 *
 * Rules:
 * - Ultraheavy chassis requires tonnage ≥ 10
 * - Glider chassis requires Light class (tonnage ≤ 4)
 * - Biped and Quad accept any legal tonnage (2–15)
 */
export function isChassisLegalForTonnage(
  chassisType: ProtoChassis,
  tonnage: number,
): boolean {
  switch (chassisType) {
    case ProtoChassis.ULTRAHEAVY:
      return tonnage >= PROTO_MIN_ULTRAHEAVY_TONNAGE;
    case ProtoChassis.GLIDER:
      // Glider requires Light class: 2–4 tons
      return tonnage >= PROTO_MIN_TONNAGE && tonnage <= 4;
    case ProtoChassis.BIPED:
    case ProtoChassis.QUAD:
      return tonnage >= PROTO_MIN_TONNAGE && tonnage <= PROTO_MAX_TONNAGE;
    default:
      return false;
  }
}

// Re-export for convenience
export { ProtoWeightClass } from '@/types/unit/ProtoMechInterfaces';
