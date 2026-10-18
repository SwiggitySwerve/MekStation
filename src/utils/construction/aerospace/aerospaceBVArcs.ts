import type {
  IAerospaceArcContribution,
  IAerospaceBVInput,
} from './aerospaceBVTypes';

import {
  AerospaceArc,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';
import { resolveEquipmentBV } from '../equipmentBVResolver';

const DIRECT_AEROSPACE_ARCS: ReadonlySet<AerospaceArc> = new Set(
  Object.values(AerospaceArc),
);

const LEGACY_ARC_LOCATION_MAP: Readonly<Partial<Record<string, AerospaceArc>>> =
  {
    'Left Wing': AerospaceArc.LEFT_WING,
    'Right Wing': AerospaceArc.RIGHT_WING,
    'Left Side': AerospaceArc.LEFT_SIDE,
    'Right Side': AerospaceArc.RIGHT_SIDE,
    Hull: AerospaceArc.FUSELAGE,
    Wings: AerospaceArc.FUSELAGE,
  };

function isAerospaceArc(
  location: AerospaceArc | string,
): location is AerospaceArc {
  return DIRECT_AEROSPACE_ARCS.has(location as AerospaceArc);
}

// ============================================================================
// Arc-Pool Fire Weighting
// ============================================================================

/**
 * Return the set of "main" (non-fuselage) arcs for the given sub-type.
 * ASF and Conventional Fighter use NOSE/LEFT_WING/RIGHT_WING/AFT.
 * Small Craft uses NOSE/LEFT_SIDE/RIGHT_SIDE/AFT.
 */
export function getMainArcsForSubType(
  subType: AerospaceSubType,
): readonly AerospaceArc[] {
  if (subType === AerospaceSubType.SMALL_CRAFT) {
    return [
      AerospaceArc.NOSE,
      AerospaceArc.LEFT_SIDE,
      AerospaceArc.RIGHT_SIDE,
      AerospaceArc.AFT,
    ];
  }
  return [
    AerospaceArc.NOSE,
    AerospaceArc.LEFT_WING,
    AerospaceArc.RIGHT_WING,
    AerospaceArc.AFT,
  ];
}

/**
 * Map a raw location string onto an `AerospaceArc` value.
 * Small Craft "Hull" falls through to FUSELAGE.
 * Unknown locations return null and are skipped by the calculator.
 */
export function normalizeArcLocation(
  location: AerospaceArc | string,
): AerospaceArc | null {
  if (isAerospaceArc(location)) {
    return location;
  }

  return LEGACY_ARC_LOCATION_MAP[location] ?? null;
}

/**
 * Return the "opposite arc" for a given primary arc.
 * Nose ↔ Aft; LeftWing/LeftSide ↔ RightWing/RightSide (by sub-type).
 */
function getOppositeArc(
  primary: AerospaceArc,
  subType: AerospaceSubType,
): AerospaceArc {
  switch (primary) {
    case AerospaceArc.NOSE:
      return AerospaceArc.AFT;
    case AerospaceArc.AFT:
      return AerospaceArc.NOSE;
    case AerospaceArc.LEFT_WING:
      return AerospaceArc.RIGHT_WING;
    case AerospaceArc.RIGHT_WING:
      return AerospaceArc.LEFT_WING;
    case AerospaceArc.LEFT_SIDE:
      return AerospaceArc.RIGHT_SIDE;
    case AerospaceArc.RIGHT_SIDE:
      return AerospaceArc.LEFT_SIDE;
    default:
      // Fuselage has no opposite; return aft as a neutral default — callers
      // that care about this never pass FUSELAGE as a primary candidate.
      return subType === AerospaceSubType.SMALL_CRAFT
        ? AerospaceArc.AFT
        : AerospaceArc.AFT;
  }
}

// ============================================================================
// Offensive BV (Arc Fire Pool)
// ============================================================================

/**
 * Compute the per-arc fire pool and the weighted contribution for each.
 * The highest-BV main arc becomes the primary (100%). Opposite arc contributes
 * 25%, the two side arcs each contribute 50%. Fuselage weapons always
 * contribute at 100%.
 *
 * @spec battle-value-system spec: Aerospace Offensive BV Arc Fire Pool
 */
export function calculateAerospaceArcContributions(input: IAerospaceBVInput): {
  contributions: IAerospaceArcContribution[];
  primaryArc: AerospaceArc | null;
  weaponFirePoolBV: number;
  fuselageWeaponBV: number;
} {
  const mainArcs = getMainArcsForSubType(input.subType);

  // Compute raw BV per main arc.
  const rawByArc = new Map<AerospaceArc, number>();
  for (const arc of mainArcs) {
    rawByArc.set(arc, 0);
  }
  let fuselageWeaponBV = 0;

  for (const item of input.equipment) {
    const arc = normalizeArcLocation(item.location);
    if (arc === null) continue;
    const resolved = resolveEquipmentBV(item.id);
    if (!resolved.resolved || resolved.battleValue === 0) continue;

    if (arc === AerospaceArc.FUSELAGE) {
      fuselageWeaponBV += resolved.battleValue;
      continue;
    }
    if (rawByArc.has(arc)) {
      rawByArc.set(arc, (rawByArc.get(arc) ?? 0) + resolved.battleValue);
    }
  }

  // Identify the primary arc (highest BV). Ties break to Nose → LW/LS → RW/RS → Aft.
  let primaryArc: AerospaceArc | null = null;
  let primaryBV = -1;
  for (const arc of mainArcs) {
    const bv = rawByArc.get(arc) ?? 0;
    if (bv > primaryBV) {
      primaryBV = bv;
      primaryArc = arc;
    }
  }
  // If every arc is zero, there is no meaningful primary arc.
  if (primaryBV <= 0) {
    primaryArc = null;
  }

  // Assign weights.
  const oppositeArc = primaryArc
    ? getOppositeArc(primaryArc, input.subType)
    : null;

  const contributions: IAerospaceArcContribution[] = [];
  let weaponFirePoolBV = 0;
  for (const arc of mainArcs) {
    const rawBV = rawByArc.get(arc) ?? 0;
    let weight: number;
    if (primaryArc === null) {
      weight = 0;
    } else if (arc === primaryArc) {
      weight = 1.0;
    } else if (arc === oppositeArc) {
      weight = 0.25;
    } else {
      weight = 0.5;
    }
    const weightedBV = rawBV * weight;
    weaponFirePoolBV += weightedBV;
    contributions.push({
      arc,
      rawBV,
      weight,
      weightedBV,
      isPrimary: arc === primaryArc,
    });
  }

  return {
    contributions,
    primaryArc,
    weaponFirePoolBV,
    fuselageWeaponBV,
  };
}
