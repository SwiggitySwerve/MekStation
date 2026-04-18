/**
 * Aerospace Armor Arc Calculations
 *
 * Per-arc armor maximums based on tonnage and arc-factor table.
 * Total armor must not exceed the sum of arc maxima.
 * Small craft use LeftSide/RightSide instead of LeftWing/RightWing.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * Requirement: Armor Allocation per Firing Arc
 */

import {
  AerospaceArc,
  AerospaceSubType,
} from "../../../types/unit/AerospaceInterfaces";

// ============================================================================
// Arc Factor Tables
// ============================================================================

/**
 * Per-arc armor factor: multiplied by tonnage to get max armor points.
 * Source: TechManual aerospace armor allocation tables.
 * Nose carries the most; Aft the least.
 */
const ASF_CF_ARC_FACTORS: Record<AerospaceArc, number> = {
  [AerospaceArc.NOSE]: 0.28,
  [AerospaceArc.LEFT_WING]: 0.2,
  [AerospaceArc.RIGHT_WING]: 0.2,
  [AerospaceArc.LEFT_SIDE]: 0,
  [AerospaceArc.RIGHT_SIDE]: 0,
  [AerospaceArc.AFT]: 0.12,
  [AerospaceArc.FUSELAGE]: 0,
};

const SMALL_CRAFT_ARC_FACTORS: Record<AerospaceArc, number> = {
  [AerospaceArc.NOSE]: 0.28,
  [AerospaceArc.LEFT_WING]: 0,
  [AerospaceArc.RIGHT_WING]: 0,
  [AerospaceArc.LEFT_SIDE]: 0.2,
  [AerospaceArc.RIGHT_SIDE]: 0.2,
  [AerospaceArc.AFT]: 0.12,
  [AerospaceArc.FUSELAGE]: 0,
};

// ============================================================================
// Arc Set per Sub-Type
// ============================================================================

/** Arcs used by ASF and conventional fighters */
export const ASF_CF_ARCS: readonly AerospaceArc[] = [
  AerospaceArc.NOSE,
  AerospaceArc.LEFT_WING,
  AerospaceArc.RIGHT_WING,
  AerospaceArc.AFT,
];

/** Arcs used by small craft (side arcs replace wing arcs) */
export const SMALL_CRAFT_ARCS: readonly AerospaceArc[] = [
  AerospaceArc.NOSE,
  AerospaceArc.LEFT_SIDE,
  AerospaceArc.RIGHT_SIDE,
  AerospaceArc.AFT,
];

/**
 * Return the ordered arc list for a sub-type.
 */
export function getArcsForSubType(
  subType: AerospaceSubType,
): readonly AerospaceArc[] {
  return subType === AerospaceSubType.SMALL_CRAFT
    ? SMALL_CRAFT_ARCS
    : ASF_CF_ARCS;
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Compute maximum armor points for a single arc.
 * maxArcPoints = floor(tonnage × arcFactor)
 */
export function maxArcArmorPoints(
  arc: AerospaceArc,
  tonnage: number,
  subType: AerospaceSubType,
): number {
  const factors =
    subType === AerospaceSubType.SMALL_CRAFT
      ? SMALL_CRAFT_ARC_FACTORS
      : ASF_CF_ARC_FACTORS;
  return Math.floor(tonnage * factors[arc]);
}

/**
 * Compute the sum of all arc maxima (total maximum armor for the unit).
 */
export function maxTotalArmorPoints(
  tonnage: number,
  subType: AerospaceSubType,
): number {
  const arcs = getArcsForSubType(subType);
  return arcs.reduce(
    (sum, arc) => sum + maxArcArmorPoints(arc, tonnage, subType),
    0,
  );
}

/**
 * Return a map of arc → max armor points for all arcs of a sub-type.
 */
export function arcMaxMap(
  tonnage: number,
  subType: AerospaceSubType,
): Record<AerospaceArc, number> {
  const arcs = getArcsForSubType(subType);
  const result = {} as Record<AerospaceArc, number>;
  for (const arc of arcs) {
    result[arc] = maxArcArmorPoints(arc, tonnage, subType);
  }
  return result;
}
