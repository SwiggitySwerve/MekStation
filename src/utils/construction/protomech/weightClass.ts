/**
 * ProtoMech Weight Class Tables
 *
 * Bucketing logic: Light 2–4t, Medium 5–7t, Heavy 8–9t, Ultraheavy 10–15t.
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
// Chassis × tonnage legality
// =============================================================================

/**
 * Return true when the chassis type is legal for the given tonnage.
 *
 * Rules:
 * - Ultraheavy chassis requires tonnage ≥ 10
 * - Biped, Quad and Glider accept any legal tonnage (2–15). The pinned verifier has
 *   no glider weight rule (MML's spinner only raises a glider's minimum to 10 t when
 *   ultra and glider tech are legal, which is tech filtering and deferred).
 */
export function isChassisLegalForTonnage(
  chassisType: ProtoChassis,
  tonnage: number,
): boolean {
  switch (chassisType) {
    case ProtoChassis.ULTRAHEAVY:
      return tonnage >= PROTO_MIN_ULTRAHEAVY_TONNAGE;
    case ProtoChassis.GLIDER:
    case ProtoChassis.BIPED:
    case ProtoChassis.QUAD:
      return tonnage >= PROTO_MIN_TONNAGE && tonnage <= PROTO_MAX_TONNAGE;
    default:
      return false;
  }
}

// Re-export for convenience
export { ProtoWeightClass } from '@/types/unit/ProtoMechInterfaces';
