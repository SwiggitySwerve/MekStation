/**
 * Aerospace Thrust Calculations
 *
 * Derives Safe Thrust and Max Thrust from engine rating and tonnage.
 * Max thrust is floor(safeThrust × 1.5) per construction rules.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * Requirement: Aerospace Thrust Derivation
 */

import {
  AerospaceEngineType,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';

// ============================================================================
// Thrust Caps by Sub-Type and Tonnage
// ============================================================================

/**
 * Maximum safe thrust allowed per sub-type.
 * Lighter tonnage classes can achieve higher thrust but are still capped.
 * Values from TechManual aerospace construction tables.
 */
const THRUST_CAP_BY_SUBTYPE: Record<AerospaceSubType, number> = {
  [AerospaceSubType.AEROSPACE_FIGHTER]: 12,
  [AerospaceSubType.CONVENTIONAL_FIGHTER]: 12,
  [AerospaceSubType.SMALL_CRAFT]: 6,
};

// ============================================================================
// Engine Types Legal Per Sub-Type
// ============================================================================

/**
 * Engine types allowed for each aerospace sub-type.
 * Conventional fighters are restricted to ICE and FuelCell.
 */
const LEGAL_ENGINES_BY_SUBTYPE: Record<
  AerospaceSubType,
  ReadonlySet<AerospaceEngineType>
> = {
  [AerospaceSubType.AEROSPACE_FIGHTER]: new Set([
    AerospaceEngineType.FUSION,
    AerospaceEngineType.XL,
    AerospaceEngineType.COMPACT_FUSION,
  ]),
  [AerospaceSubType.CONVENTIONAL_FIGHTER]: new Set([
    AerospaceEngineType.ICE,
    AerospaceEngineType.FUEL_CELL,
  ]),
  [AerospaceSubType.SMALL_CRAFT]: new Set([
    AerospaceEngineType.FUSION,
    AerospaceEngineType.XL,
    AerospaceEngineType.COMPACT_FUSION,
    AerospaceEngineType.ICE,
    AerospaceEngineType.FUEL_CELL,
  ]),
};

// ============================================================================
// Thrust Derivation
// ============================================================================

/**
 * Calculate safe thrust from engine rating and tonnage.
 * safeThrust = floor(engineRating / tonnage), clamped to sub-type cap.
 */
export function calculateSafeThrust(
  engineRating: number,
  tonnage: number,
  subType: AerospaceSubType,
): number {
  if (tonnage <= 0) return 0;
  const raw = Math.floor(engineRating / tonnage);
  const cap = THRUST_CAP_BY_SUBTYPE[subType];
  return Math.min(raw, cap);
}

/**
 * Calculate max thrust from safe thrust.
 * maxThrust = floor(safeThrust × 1.5)
 */
export function calculateMaxThrust(safeThrust: number): number {
  return Math.floor(safeThrust * 1.5);
}

/**
 * Derive engine rating needed to achieve a given safe thrust.
 * engineRating = safeThrust × tonnage (must be multiples of 5 for engine table).
 */
export function ratingFromThrust(safeThrust: number, tonnage: number): number {
  return safeThrust * tonnage;
}

// ============================================================================
// Engine Legality
// ============================================================================

/**
 * Return whether an engine type is legal for the given sub-type.
 * Used by VAL-AERO-THRUST.
 */
export function isEngineLegalForSubType(
  engineType: AerospaceEngineType,
  subType: AerospaceSubType,
): boolean {
  return LEGAL_ENGINES_BY_SUBTYPE[subType].has(engineType);
}

/**
 * Return the maximum legal safe thrust for a sub-type.
 */
export function getMaxSafeThrust(subType: AerospaceSubType): number {
  return THRUST_CAP_BY_SUBTYPE[subType];
}
