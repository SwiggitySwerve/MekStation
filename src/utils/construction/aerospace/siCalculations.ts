/**
 * Aerospace Structural Integrity (SI) Calculations
 *
 * Default SI = ceil(tonnage / 10).
 * Additional SI above default costs extra tonnage.
 * Each sub-type has a hard maximum.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * Requirement: Structural Integrity Calculation
 */

import { AerospaceSubType } from '../../../types/unit/AerospaceInterfaces';

// ============================================================================
// SI Maximums by Sub-Type
// ============================================================================

/**
 * Maximum allowable SI per aerospace sub-type.
 * ASF max 20, CF max 15, Small Craft max 30.
 */
const SI_MAX_BY_SUBTYPE: Record<AerospaceSubType, number> = {
  [AerospaceSubType.AEROSPACE_FIGHTER]: 20,
  [AerospaceSubType.CONVENTIONAL_FIGHTER]: 15,
  [AerospaceSubType.SMALL_CRAFT]: 30,
};

// ============================================================================
// SI Calculation Functions
// ============================================================================

/**
 * Compute the default structural integrity for a given tonnage.
 * Default SI = ceil(tonnage / 10).
 */
export function defaultSI(tonnage: number): number {
  return Math.ceil(tonnage / 10);
}

/**
 * Return the maximum SI allowed for a sub-type.
 */
export function maxSI(subType: AerospaceSubType): number {
  return SI_MAX_BY_SUBTYPE[subType];
}

/**
 * Compute the tonnage cost of structural integrity.
 * Default SI is free. Each additional point above default costs:
 *   additionalSIPoints × (tonnage / 10) × 0.5 tons
 *
 * The formula is derived from TechManual: SI bar weight = SI × (tonnage/10) × 0.5,
 * then subtract the default-SI weight to find the extra cost.
 */
export function siWeightCost(si: number, tonnage: number): number {
  const def = defaultSI(tonnage);
  const extra = Math.max(0, si - def);
  // Each SI point above default costs (tonnage/10) × 0.5 tons
  return extra * (tonnage / 10) * 0.5;
}

/**
 * Total SI tonnage including the base (default) allocation.
 * Used by the weight breakdown to account for all SI mass.
 * Base SI has no weight cost — it is part of the chassis skeleton.
 * Returns only the EXTRA cost above default.
 */
export function siExtraWeightTons(si: number, tonnage: number): number {
  return siWeightCost(si, tonnage);
}
