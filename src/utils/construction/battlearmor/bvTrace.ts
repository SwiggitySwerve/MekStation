import type { IBABreakdown } from '@/types/unit/BVBreakdownTypes';

import { calculateBaseBV } from '../battleValueTotals';

/** Trace the existing homogeneous per-trooper model, including zero-pool factors.
 * Empty local structure/type/weight stages are explicit; unsupported
 * native equipment, sections and heterogeneous troopers are not manufactured.
 */
export function battleArmorBVTerms(
  b: IBABreakdown,
): Readonly<Record<string, number | undefined>> {
  const d = b.perTrooper.defensive,
    o = b.perTrooper.offensive;
  const trooper = {
    armorBV: d.armorBV,
    structureBV: 0,
    defensiveEquipmentBV: d.defensiveEquipmentBV,
    explosivePenalty: 0,
    typeModifier: 1,
    defensiveFactor: d.defensiveFactor,
    weaponBV: o.weaponBV + o.manipulatorBV,
    ammoBV: o.ammoBV,
    offensiveEquipmentBV: o.offensiveEquipmentBV,
    weightBV: 0,
    speedFactor: o.speedFactor,
    offensiveTypeModifier: 1,
    summaryModifier: 1,
    defensiveValue: d.total,
    offensiveValue: o.total,
    baseBV: b.perTrooper.total,
  };
  const terms: Record<string, number | undefined> = {
    ...trooper,
    summaryModifier: b.squadFactor,
    adjustment: b.final - calculateBaseBV(b.squadTotal, 0),
    'squad.averageBV': b.perTrooper.total,
    'squad.factor': b.squadFactor,
    'squad.strength': b.squadSize,
  };
  replicateTroopers(terms, b.squadSize, trooper);
  return terms;
}

/** The Java probe snapshots the squad terms once per trooper (trooper.N.*). */
function replicateTroopers(
  terms: Record<string, number | undefined>,
  squadSize: number,
  perTrooper: Readonly<Record<string, number | undefined>>,
): void {
  for (let i = 1; i <= squadSize; i++)
    for (const [key, value] of Object.entries(perTrooper))
      terms[`trooper.${i}.${key}`] = value;
}
