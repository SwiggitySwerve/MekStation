/**
 * Aerospace Armor Arc Calculations
 *
 * Existing fighter caps and the editor location bridge.
 * Small craft have no independent arc maxima; their total rules live in armor.ts.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * Requirement: Armor Allocation per Firing Arc
 */

import { AerospaceLocation } from '../../../types/construction/UnitLocation';
import {
  AerospaceArc,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';

// ============================================================================
// Arc Factor Tables
// ============================================================================

/**
 * Per-arc armor factor: multiplied by tonnage to get max armor points.
 * Legacy fighter editor factors, unchanged by the small-craft correction.
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
 * Fighter arc cap, or null for a small-craft location without an independent cap.
 */
export function maxArcArmorPoints(
  arc: AerospaceArc,
  tonnage: number,
  subType: AerospaceSubType,
): number | null {
  // MML 62bf193 UnitUtil.getMaxArmor:900-917: no location maximum.
  if (subType === AerospaceSubType.SMALL_CRAFT)
    return SMALL_CRAFT_ARCS.includes(arc) ? null : 0;
  return Math.floor(tonnage * ASF_CF_ARC_FACTORS[arc]);
}

/**
 * Tonnage-only fighter total. Small-craft totals require the armor.ts facts.
 */
export function maxTotalArmorPoints(
  tonnage: number,
  subType: AerospaceSubType,
): number | null {
  // Small-craft totals require SI, shape and armor identity, not tonnage alone.
  if (subType === AerospaceSubType.SMALL_CRAFT) return null;
  const arcs = getArcsForSubType(subType);
  return arcs.reduce(
    (sum, arc) => sum + (maxArcArmorPoints(arc, tonnage, subType) ?? 0),
    0,
  );
}

/**
 * Return a map of arc → max armor points for all arcs of a sub-type.
 */
export function arcMaxMap(
  tonnage: number,
  subType: AerospaceSubType,
): Partial<Record<AerospaceArc, number | null>> {
  const arcs = getArcsForSubType(subType);
  const result: Partial<Record<AerospaceArc, number | null>> = {};
  for (const arc of arcs) {
    result[arc] = maxArcArmorPoints(arc, tonnage, subType);
  }
  return result;
}

// ============================================================================
// Enum Bridge
// ============================================================================

/**
 * Bridge AerospaceLocation (used by the customizer UI) to AerospaceArc
 * (used by construction-spec calc functions). The two enums carry the
 * same semantic arcs but different string values; the UI's enum is the
 * subset that omits the small-craft-only LEFT_SIDE / RIGHT_SIDE arcs. The
 * subtype resolves those stored Wing keys to their Side identities.
 */
export function mapAerospaceLocationToArc(
  loc: AerospaceLocation,
  subType?: AerospaceSubType,
): AerospaceArc {
  switch (loc) {
    case AerospaceLocation.NOSE:
      return AerospaceArc.NOSE;
    case AerospaceLocation.LEFT_WING:
      return subType === AerospaceSubType.SMALL_CRAFT
        ? AerospaceArc.LEFT_SIDE
        : AerospaceArc.LEFT_WING;
    case AerospaceLocation.RIGHT_WING:
      return subType === AerospaceSubType.SMALL_CRAFT
        ? AerospaceArc.RIGHT_SIDE
        : AerospaceArc.RIGHT_WING;
    case AerospaceLocation.AFT:
      return AerospaceArc.AFT;
    case AerospaceLocation.FUSELAGE:
      return AerospaceArc.FUSELAGE;
  }
}

/**
 * Convenience: max armor for a UI AerospaceLocation, dispatched to the
 * construction-spec utility via the enum bridge.
 */
export function maxArcArmorPointsForLocation(
  loc: AerospaceLocation,
  tonnage: number,
  subType: AerospaceSubType,
): number | null {
  return maxArcArmorPoints(
    mapAerospaceLocationToArc(loc, subType),
    tonnage,
    subType,
  );
}
