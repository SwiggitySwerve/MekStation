import type { IProtoMechBVBreakdown } from '@/types/unit/BVBreakdownTypes';

/**
 * Read-only baseline trace adapter. RULES.md documents the inherited empty
 * type/weight stages at MegaMek 48fcb2f6; the local summary has no chassis
 * adjustment. Native mount identities and ammo groups are unavailable here.
 */
export function protoMechBVTerms(
  b: IProtoMechBVBreakdown,
): IProtoMechBVBreakdown & {
  typeModifier: number;
  offensiveTypeModifier: number;
  summaryModifier: number;
  weightBV: number;
  adjustment: number;
} {
  return {
    ...b,
    typeModifier: 1,
    offensiveTypeModifier: 1,
    summaryModifier: b.chassisMultiplier,
    weightBV: b.physicalWeaponBV,
    adjustment: b.final - b.baseBV,
  };
}
