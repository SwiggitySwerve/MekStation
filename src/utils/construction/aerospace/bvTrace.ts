import type { IAerospaceBVBreakdown } from '@/types/unit/BVBreakdownTypes';

import { calculateBaseBV } from '../battleValueTotals';

/** Read-only aircraft trace. Actual summary facts may replace the legacy
 * compatibility projection; omission preserves its previous output.
 * Mount and ammo details remain the calculation owners' responsibility.
 */
export function aerospaceBVTerms(
  b: IAerospaceBVBreakdown,
  summary?: { baseBV: number; summaryModifier: number },
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
    summaryModifier: summary?.summaryModifier ?? b.subTypeMultiplier,
    adjustment:
      b.final -
      (summary?.baseBV ??
        calculateBaseBV(b.defensive, b.offensive, [b.subTypeMultiplier])),
  };
}
