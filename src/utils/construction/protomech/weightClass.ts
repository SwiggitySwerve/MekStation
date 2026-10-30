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
