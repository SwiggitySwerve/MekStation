import type { IInfantryBVBreakdown } from '@/types/unit/BVBreakdownTypes';

import { calculateBaseBV } from '../battleValueTotals';

/** Baseline source trace: structure precedes movement, weapons precede speed.
 * The owner has no separate armor/equipment/type/weight contribution. Missing
 * source weapon pools and native per-mount details remain missing.
 */
export function infantryBVTerms(b: IInfantryBVBreakdown): IInfantryBVBreakdown {
  return {
    ...b,
    armorBV: 0,
    defensiveEquipmentBV: 0,
    explosivePenalty: 0,
    typeModifier: 1,
    ammoBV: b.fieldGunAmmoBV,
    speedFactor: b.motiveMultiplier,
    offensiveEquipmentBV: 0,
    weightBV: 0,
    offensiveTypeModifier: 1,
    ...(b.baseBV === undefined
      ? {}
      : { adjustment: b.final - calculateBaseBV(b.baseBV, 0) }),
  };
}
