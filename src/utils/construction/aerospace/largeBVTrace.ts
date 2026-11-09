import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';

import type { ILargeAerospaceBVBreakdown } from './dropShipComplete';
import type { ILargeAerospaceArcBV } from './largeAerospaceFirePool';

// getLocationAbbr at 48fcb2f64 (Jumpship/Warship; Dropship names its wings
// LS/RS). It follows the physical location, never the BV arc.
const SHIP_ABBREVIATION: Readonly<Record<CapitalArc, string>> = {
  [CapitalArc.NOSE]: 'NOS',
  [CapitalArc.FRONT_LEFT]: 'FLS',
  [CapitalArc.FRONT_RIGHT]: 'FRS',
  [CapitalArc.AFT_LEFT]: 'ALS',
  [CapitalArc.AFT_RIGHT]: 'ARS',
  [CapitalArc.AFT]: 'AFT',
  [CapitalArc.LEFT_BROADSIDE]: 'LBS',
  [CapitalArc.RIGHT_BROADSIDE]: 'RBS',
};
const DROPSHIP_ABBREVIATION: Readonly<Record<CapitalArc, string>> = {
  ...SHIP_ABBREVIATION,
  [CapitalArc.FRONT_LEFT]: 'LS',
  [CapitalArc.FRONT_RIGHT]: 'RS',
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
      terms[`weapon.${index++}.${abbreviations[group.location]}.${group.id}`] =
        group.weaponBV * weight + group.capacitorBV;
    }
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
  Partial<WeaponTerms> {
  if (b.calculationScope !== 'complete') return b;
  return {
    ...b,
    ...weaponGroupTerms(b, facts),
    weaponBV: b.weaponFirePoolBV,
    offensiveEquipmentBV: 0,
    weightBV: 0,
    offensiveTypeModifier: 1,
    adjustment: b.final - b.baseBV,
  };
}
