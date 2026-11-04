import type { ILargeAerospaceBVBreakdown } from './dropShipComplete';

/** Baseline native names without promoting defensive-only designs to complete.
 * The complete composition has no separate offensive equipment/weight/type
 * additions. Arc weapon totals need no aircraft fuselage term.
 */
export function largeAerospaceBVTerms(
  b: ILargeAerospaceBVBreakdown,
): ILargeAerospaceBVBreakdown &
  Partial<{
    weaponBV: number;
    offensiveEquipmentBV: number;
    weightBV: number;
    offensiveTypeModifier: number;
    adjustment: number;
  }> {
  if (b.calculationScope !== 'complete') return b;
  return {
    ...b,
    weaponBV: b.weaponFirePoolBV,
    offensiveEquipmentBV: 0,
    weightBV: 0,
    offensiveTypeModifier: 1,
    adjustment: b.final - b.baseBV,
  };
}
