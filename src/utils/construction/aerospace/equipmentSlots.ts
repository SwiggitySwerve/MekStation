/**
 * Aerospace Equipment Slot Rules
 *
 * Arc-based slot counts for aerospace units.
 * Nose: 6, each Wing/Side: 6, Aft: 4, Fuselage: unlimited.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * Requirement: Equipment Mounting per Arc
 */

import { AerospaceArc } from '../../../types/unit/AerospaceInterfaces';

// ============================================================================
// Slot Counts per Arc
// ============================================================================

/**
 * Maximum equipment items mountable per arc.
 * FUSELAGE is unbounded (null = no arc-slot limit).
 */
const ARC_SLOT_LIMITS: Record<AerospaceArc, number | null> = {
  [AerospaceArc.NOSE]: 6,
  [AerospaceArc.LEFT_WING]: 6,
  [AerospaceArc.RIGHT_WING]: 6,
  [AerospaceArc.LEFT_SIDE]: 6,
  [AerospaceArc.RIGHT_SIDE]: 6,
  [AerospaceArc.AFT]: 4,
  [AerospaceArc.FUSELAGE]: null,
};

// ============================================================================
// Slot Query Functions
// ============================================================================

/**
 * Return the slot limit for an arc, or null if unlimited.
 */
export function arcSlotLimit(arc: AerospaceArc): number | null {
  return ARC_SLOT_LIMITS[arc];
}

/**
 * Return true if adding one more item to the arc would exceed the slot cap.
 * Fuselage is always allowed (bounded only by tonnage).
 *
 * @param arc - The arc being mounted into
 * @param currentCount - Number of items already mounted in this arc
 */
export function arcSlotAvailable(
  arc: AerospaceArc,
  currentCount: number,
): boolean {
  const limit = ARC_SLOT_LIMITS[arc];
  if (limit === null) return true;
  return currentCount < limit;
}

/**
 * Count mounted items per arc from an equipment list.
 */
export function countItemsPerArc(
  equipment: ReadonlyArray<{ readonly location: AerospaceArc }>,
): Map<AerospaceArc, number> {
  const counts = new Map<AerospaceArc, number>();
  for (const item of equipment) {
    counts.set(item.location, (counts.get(item.location) ?? 0) + 1);
  }
  return counts;
}

/**
 * Find all arcs that exceed their slot limit for a given equipment list.
 * Returns an array of over-limit arcs (should be empty for a legal build).
 */
export function overLimitArcs(
  equipment: ReadonlyArray<{ readonly location: AerospaceArc }>,
): AerospaceArc[] {
  const counts = countItemsPerArc(equipment);
  const violations: AerospaceArc[] = [];
  counts.forEach((count, arc) => {
    const limit = ARC_SLOT_LIMITS[arc];
    if (limit !== null && count > limit) {
      violations.push(arc);
    }
  });
  return violations;
}
