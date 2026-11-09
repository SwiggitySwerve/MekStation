import type {
  IAerospaceBVBreakdown,
  IAerospaceBVWeaponMount,
} from '@/types/unit/BVBreakdownTypes';

import { getAerospaceEquipmentLocationAbbr } from '@/services/printing/recordsheet/equipmentLocations';
import {
  AerospaceArc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import { calculateBaseBV } from '../battleValueTotals';

const contractLocations = new Map(
  Object.entries(AerospaceArc).map(([key, arc]) => [arc, key]),
);

/** Read-only aircraft trace. Actual summary facts may replace the legacy
 * compatibility projection; omission preserves its previous output.
 * Optional mount facts are formatted without recalculating their values.
 * @spec establish-all-unit-data-parity: Aerospace weapon diagnostics
 */
export function aerospaceBVTerms(
  b: IAerospaceBVBreakdown,
  summary?: { baseBV: number; summaryModifier: number },
  weapons?: {
    readonly subType: AerospaceSubType;
    readonly mounts: readonly IAerospaceBVWeaponMount[];
  },
): IAerospaceBVBreakdown & {
  weightBV: number;
  offensiveTypeModifier: number;
  summaryModifier: number;
  adjustment: number;
} & Record<`weapon.${number}.${string}.${string}`, number> {
  const weaponTerms: Record<`weapon.${number}.${string}.${string}`, number> =
    {};
  for (const fact of weapons?.mounts ?? []) {
    const location =
      fact.location === AerospaceArc.FUSELAGE &&
      weapons?.subType === AerospaceSubType.SMALL_CRAFT
        ? 'HULL'
        : contractLocations.get(fact.location);
    if (location === undefined) continue;
    weaponTerms[
      `weapon.${fact.equipmentIndex}.${getAerospaceEquipmentLocationAbbr(location)}.${fact.equipmentId}`
    ] = fact.battleValue;
  }
  return {
    ...b,
    ...weaponTerms,
    weightBV: 0,
    offensiveTypeModifier: 1,
    summaryModifier: summary?.summaryModifier ?? b.subTypeMultiplier,
    adjustment:
      b.final -
      (summary?.baseBV ??
        calculateBaseBV(b.defensive, b.offensive, [b.subTypeMultiplier])),
  };
}
