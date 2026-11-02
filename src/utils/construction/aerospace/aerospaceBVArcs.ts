import type {
  IAerospaceArcContribution,
  IAerospaceBVInput,
} from './aerospaceBVTypes';

import {
  AerospaceArc,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';
import {
  calculateBaseHeatEfficiency,
  calculateHeatTrackedWeapons,
} from '../battleValueHeatTracking';
import { resolveEquipmentBV } from '../equipmentBVResolver';
import { getAerospaceDefensiveEquipmentKind } from './aerospaceBVEquipment';

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

// ============================================================================
// Offensive BV (Arc Fire Pool)
// ============================================================================

/**
 * Compute the per-arc fire pool and the weighted contribution for each.
 * Ordinary aerospace combines Nose, wings/sides and Fuselage into one forward
 * group. The weaker forward/rear group contributes at 50% (ties favor forward).
 * Primary identifies the largest populated arc within the dominant group.
 * Pinned AeroBVCalculator.java:147-155; BVCalculator.java:690-699,835-837.
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
  const weapons: { arc: AerospaceArc; bv: number; heat: number }[] = [];

  for (const item of input.equipment) {
    if (getAerospaceDefensiveEquipmentKind(item.id)) continue;
    const arc = normalizeArcLocation(item.location);
    if (arc === null) continue;
    const resolved = resolveEquipmentBV(item.id);
    if (!resolved.resolved || resolved.battleValue === 0) continue;

    if (arc !== AerospaceArc.FUSELAGE && !rawByArc.has(arc)) continue;
    weapons.push({ arc, bv: resolved.battleValue, heat: resolved.heat });
    if (arc === AerospaceArc.FUSELAGE) {
      fuselageWeaponBV += resolved.battleValue;
      continue;
    }
    if (rawByArc.has(arc)) {
      rawByArc.set(arc, (rawByArc.get(arc) ?? 0) + resolved.battleValue);
    }
  }

  // Decide direction using the complete forward group, not individual arcs.
  const forwardArcs = mainArcs.filter((arc) => arc !== AerospaceArc.AFT);
  const forwardBV = forwardArcs.reduce(
    (sum, arc) => sum + (rawByArc.get(arc) ?? 0),
    fuselageWeaponBV,
  );
  const rearIsPrimary = (rawByArc.get(AerospaceArc.AFT) ?? 0) > forwardBV;
  const primaryCandidates = rearIsPrimary
    ? [AerospaceArc.AFT]
    : [...forwardArcs, AerospaceArc.FUSELAGE];
  // Preserve the contribution shape and deterministic ordering for callers.
  let primaryArc: AerospaceArc | null = null;
  let primaryBV = 0;
  for (const arc of primaryCandidates) {
    const bv =
      arc === AerospaceArc.FUSELAGE
        ? fuselageWeaponBV
        : (rawByArc.get(arc) ?? 0);
    if (bv > primaryBV) {
      primaryBV = bv;
      primaryArc = arc;
    }
  }
  const forwardWeight = rearIsPrimary ? 0.5 : 1;
  const rearWeight = rearIsPrimary ? 1 : 0.5;
  // AeroBVCalculator.java:141-155; HeatTrackingBVCalculator.java:59-61,108-126.
  // Native sorting uses arc-modified BV and one aircraft-wide heat budget.
  const heatPenalty = new Map<AerospaceArc, number>();
  if (
    input.heatCapacity !== undefined &&
    !input.isSupportVehicle &&
    input.subType !== AerospaceSubType.CONVENTIONAL_FIGHTER
  ) {
    const weighted = weapons.map((w) => ({
      ...w,
      bv: w.bv * (w.arc === AerospaceArc.AFT ? rearWeight : forwardWeight),
    }));
    for (const { weapon, adjustedBV } of calculateHeatTrackedWeapons(
      weighted,
      calculateBaseHeatEfficiency(input.heatCapacity),
    )) {
      heatPenalty.set(
        weapon.arc,
        (heatPenalty.get(weapon.arc) ?? 0) + weapon.bv - adjustedBV,
      );
    }
  }
  fuselageWeaponBV =
    fuselageWeaponBV * forwardWeight -
    (heatPenalty.get(AerospaceArc.FUSELAGE) ?? 0);

  const contributions: IAerospaceArcContribution[] = [];
  let weaponFirePoolBV = 0;
  for (const arc of mainArcs) {
    const rawBV = rawByArc.get(arc) ?? 0;
    let weight: number;
    if (primaryArc === null) {
      weight = 0;
    } else if (arc === AerospaceArc.AFT) {
      weight = rearWeight;
    } else {
      weight = forwardWeight;
    }
    const weightedBV = rawBV * weight - (heatPenalty.get(arc) ?? 0);
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
