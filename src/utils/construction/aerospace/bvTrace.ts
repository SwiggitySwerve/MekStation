import type { IAerospaceBVBreakdown } from '@/types/unit/BVBreakdownTypes';

import { calculateBaseBV } from '../battleValueTotals';

/** Read-only aircraft trace. The existing owner has no weight or offensive
 * type adjustment, and its summary uses subTypeMultiplier. Unsupported native
 * cockpit/drone effects and mount/ammo details remain visible as differences.
 */
export function aerospaceBVTerms(
  b: IAerospaceBVBreakdown,
): IAerospaceBVBreakdown & {
  weightBV: number;
  offensiveTypeModifier: number;
  summaryModifier: number;
  adjustment: number;
} {
  return {
    ...b,
    weightBV: 0,
    offensiveTypeModifier: 1,
    summaryModifier: b.subTypeMultiplier,
    adjustment:
      b.final -
      calculateBaseBV(b.defensive, b.offensive, [b.subTypeMultiplier]),
  };
}
