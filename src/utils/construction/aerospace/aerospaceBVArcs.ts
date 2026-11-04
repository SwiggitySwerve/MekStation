import type {
  IAerospaceArcContribution,
  IAerospaceBVInput,
} from './aerospaceBVTypes';

import {
  AerospaceArc,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';
import { getOffensiveBVRole } from '../battleValueEquipment';
import {
  calculateBaseHeatEfficiency,
  calculateHeatTrackedWeapons,
} from '../battleValueHeatTracking';
import {
  applyTargetingComputerBV,
  hasBVTargetingComputer,
  isDirectFireBVWeapon,
} from '../battleValueWeapons';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import {
  isArtemisCompatibleBVWeapon,
  linkArtemisBVWeapons,
} from '../equipmentBV/weaponLinks';
import {
  getArtemisBVMultiplier,
  getEquipmentEntry,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
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
  subType?: AerospaceSubType,
): AerospaceArc | null {
  const arc = isAerospaceArc(location)
    ? location
    : (LEGACY_ARC_LOCATION_MAP[location] ?? null);
  // Editor stores use wing keys for all four-arc hulls. Native craft use sides.
  if (subType === AerospaceSubType.SMALL_CRAFT) {
    if (arc === AerospaceArc.LEFT_WING) return AerospaceArc.LEFT_SIDE;
    if (arc === AerospaceArc.RIGHT_WING) return AerospaceArc.RIGHT_SIDE;
  }
  return arc;
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
  // Keep support FCS on its existing path. BVCalculator.java:880-891 applies
  // the ordinary aircraft TC bonus before direction selection and heat sorting.
  const targetingComputerMounted =
    !input.isSupportVehicle &&
    hasBVTargetingComputer(input.equipment.map((item) => item.id));

  // Compute raw BV per main arc.
  const rawByArc = new Map<AerospaceArc, number>();
  for (const arc of mainArcs) {
    rawByArc.set(arc, 0);
  }
  let fuselageWeaponBV = 0;
  const weapons: {
    arc: AerospaceArc;
    location: AerospaceArc;
    bv: number;
    heat: number;
    compatible: boolean;
    artemisType?: 'iv' | 'v';
  }[] = [];
  const links: { location: AerospaceArc; type: 'iv' | 'v' }[] = [];

  for (const item of input.equipment) {
    if (getAerospaceDefensiveEquipmentKind(item.id)) continue;
    const arc = normalizeArcLocation(item.location, input.subType);
    if (arc === null) continue;
    const entry = getEquipmentEntry(item.id);
    if (entry?.id === 'artemisiv' || entry?.id === 'artemisv') {
      links.push({
        location: arc,
        type: entry.id === 'artemisiv' ? 'iv' : 'v',
      });
      continue;
    }
    const resolved = resolveEquipmentBV(item.id);
    if (!resolved.resolved || resolved.battleValue === 0) continue;

    if (arc !== AerospaceArc.FUSELAGE && !rawByArc.has(arc)) continue;
    weapons.push({
      arc,
      location: arc,
      bv:
        targetingComputerMounted &&
        entry &&
        !item.isAmmo &&
        !isAmmunitionEquipmentId(item.id) &&
        getOffensiveBVRole(item.id) === 'weapon' &&
        isDirectFireBVWeapon(entry.id)
          ? applyTargetingComputerBV(resolved.battleValue)
          : resolved.battleValue,
      heat: resolved.heat,
      compatible:
        entry?.category === 'Missile' && isArtemisCompatibleBVWeapon(entry.id),
    });
  }
  // MekFileParser.java:425-449; BVCalculator.java:860-872.
  linkArtemisBVWeapons(weapons, links);
  for (const weapon of weapons) {
    weapon.bv *= getArtemisBVMultiplier(weapon.artemisType);
    if (weapon.arc === AerospaceArc.FUSELAGE) fuselageWeaponBV += weapon.bv;
    else rawByArc.set(weapon.arc, (rawByArc.get(weapon.arc) ?? 0) + weapon.bv);
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
