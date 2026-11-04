import type { IVehicleBVBreakdown } from './vehicleBVTypes';

import { calculateBaseBV } from '../battleValueTotals';

/** Baseline reference trace; all nonneutral values come from their owning stages.
 * CombatVehicle inherits the empty offensive type stage at MegaMek 48fcb2f6.
 * Native mount identities and ammo type/rack details remain unavailable.
 */
export function vehicleBVTerms(b: IVehicleBVBreakdown): IVehicleBVBreakdown & {
  offensiveTypeModifier: number;
  adjustment: number | undefined;
} {
  return {
    ...b,
    offensiveTypeModifier: 1,
    adjustment:
      b.summaryModifier === undefined
        ? undefined
        : b.final -
          calculateBaseBV(b.defensive, b.offensive, [b.summaryModifier]),
  };
}
