import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';

import type { ILargeAerospaceBVBreakdown } from './dropShipComplete';
import type { ILargeAerospaceArcBV } from './largeAerospaceFirePool';

// getLocationAbbr at 48fcb2f64 (Jumpship/Warship; Dropship names its wings
// LS/RS). It follows the physical location, never the BV arc. Partial: a
// non-firing location (e.g. a Hull member of CapitalArc) has no weapon term.
const SHIP_ABBREVIATION: Readonly<Partial<Record<CapitalArc, string>>> = {
  [CapitalArc.NOSE]: 'NOS',
  [CapitalArc.FRONT_LEFT]: 'FLS',
  [CapitalArc.FRONT_RIGHT]: 'FRS',
  [CapitalArc.AFT_LEFT]: 'ALS',
  [CapitalArc.AFT_RIGHT]: 'ARS',
  [CapitalArc.AFT]: 'AFT',
  [CapitalArc.LEFT_BROADSIDE]: 'LBS',
  [CapitalArc.RIGHT_BROADSIDE]: 'RBS',
};
const DROPSHIP_ABBREVIATION: Readonly<Partial<Record<CapitalArc, string>>> = {
  ...SHIP_ABBREVIATION,
  [CapitalArc.FRONT_LEFT]: 'LS',
  [CapitalArc.FRONT_RIGHT]: 'RS',
};

// arcName at 48fcb2f64 (entity.getLocationName; Dropship appends " (R)" for
// the rear half of each wing). Keyed by BV arc, which is what processAmmo reads.
const SHIP_ARC_NAME: Readonly<Partial<Record<CapitalArc, string>>> = {
  [CapitalArc.NOSE]: 'Nose',
  [CapitalArc.FRONT_LEFT]: 'Left Front Side',
  [CapitalArc.AFT_LEFT]: 'Aft Left Side',
  [CapitalArc.AFT]: 'Aft',
  [CapitalArc.AFT_RIGHT]: 'Aft Right Side',
  [CapitalArc.FRONT_RIGHT]: 'Right Front Side',
  [CapitalArc.LEFT_BROADSIDE]: 'Left Broadsides',
  [CapitalArc.RIGHT_BROADSIDE]: 'Right Broadsides',
};
const DROPSHIP_ARC_NAME: Readonly<Partial<Record<CapitalArc, string>>> = {
  [CapitalArc.NOSE]: 'Nose',
  [CapitalArc.FRONT_LEFT]: 'Left Side',
  [CapitalArc.AFT_LEFT]: 'Left Side (R)',
  [CapitalArc.AFT]: 'Aft',
  [CapitalArc.AFT_RIGHT]: 'Right Side (R)',
  [CapitalArc.FRONT_RIGHT]: 'Right Side',
};

export interface ILargeAerospaceTraceFacts {
  readonly isDropShip: boolean;
  readonly arcs: readonly ILargeAerospaceArcBV[];
}

type WeaponTerms = Record<`weapon.${number}.${string}.${string}`, number>;

/**
 * One term per equal-mount group, as the Java trace's processWeapon return:
 * count x link-multiplied value x arc weight, plus one capacitor per group.
 * The index is MekStation's processing order, not MegaMek's equipment number.
 */
function weaponGroupTerms(
  b: Extract<ILargeAerospaceBVBreakdown, { calculationScope: 'complete' }>,
  facts: ILargeAerospaceTraceFacts,
): WeaponTerms {
  const abbreviations = facts.isDropShip
    ? DROPSHIP_ABBREVIATION
    : SHIP_ABBREVIATION;
  const weights = new Map(b.arcContributions.map((c) => [c.arc, c.weight]));
  const terms: WeaponTerms = {};
  let index = 0;
  for (const arc of facts.arcs) {
    const weight = weights.get(arc.arc);
    if (weight === undefined)
      throw new Error(`Large aerospace arc ${arc.arc} has no fire-pool weight`);
    for (const group of arc.weaponGroups ?? []) {
      const abbreviation = abbreviations[group.location];
      if (abbreviation === undefined)
        throw new Error(`Large aerospace weapon at unmapped ${group.location}`);
      terms[`weapon.${index++}.${abbreviation}.${group.id}`] =
        group.weaponBV * weight + group.capacitorBV;
    }
  }
  return terms;
}

type AmmoTerms = Record<
  `ammo.${'cap' | 'available'}.${number}:${string}` | `ammo.arc.${string}`,
  number
>;

/**
 * LargeAeroBVCalculator.assembleAmmo pools, keyed "<BV arc index>:<type>:<rack>"
 * and unweighted (cap is the arc's ammo-using weapon BV, available its ammo
 * BV), plus processAmmo(location)'s weighted, capped ammo for every arc.
 */
function ammoPoolTerms(
  b: Extract<ILargeAerospaceBVBreakdown, { calculationScope: 'complete' }>,
  facts: ILargeAerospaceTraceFacts,
): AmmoTerms {
  const names = facts.isDropShip ? DROPSHIP_ARC_NAME : SHIP_ARC_NAME;
  const terms: AmmoTerms = {};
  facts.arcs.forEach((arc, index) => {
    for (const [group, bv] of Object.entries({
      ...arc.weaponBVByAmmoType,
      ...arc.nonOffensiveCapBVByAmmoType,
    }))
      terms[`ammo.cap.${index}:${group}`] = bv;
    for (const [group, bv] of Object.entries(arc.ammoBVByType ?? {}))
      terms[`ammo.available.${index}:${group}`] = bv;
  });
  for (const contribution of b.arcContributions) {
    const name = names[contribution.arc];
    if (name === undefined)
      throw new Error(`Large aerospace arc ${contribution.arc} has no name`);
    terms[`ammo.arc.${name}`] = contribution.ammoBV;
  }
  return terms;
}

/** Baseline native names without promoting defensive-only designs to complete.
 * The complete composition has no separate offensive equipment/weight/type
 * additions. Arc weapon totals need no aircraft fuselage term.
 */
export function largeAerospaceBVTerms(
  b: ILargeAerospaceBVBreakdown,
  facts: ILargeAerospaceTraceFacts,
): ILargeAerospaceBVBreakdown &
  Partial<{
    weaponBV: number;
    offensiveEquipmentBV: number;
    weightBV: number;
    offensiveTypeModifier: number;
    adjustment: number;
  }> &
  Partial<WeaponTerms> &
  Partial<AmmoTerms> {
  if (b.calculationScope !== 'complete') return b;
  return {
    ...b,
    ...weaponGroupTerms(b, facts),
    ...ammoPoolTerms(b, facts),
    weaponBV: b.weaponFirePoolBV,
    offensiveEquipmentBV: 0,
    weightBV: 0,
    offensiveTypeModifier: 1,
    adjustment: b.final - b.baseBV,
  };
}
