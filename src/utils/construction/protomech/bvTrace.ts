import type { IProtoMechBVBreakdown } from '@/types/unit/BVBreakdownTypes';

import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

// Pinned ProtoMek.java:87-89. No Body/quad-only identity is inferred.
const nativeLocationAbbreviations = new Map<string, string>([
  [ProtoLocation.HEAD, 'HD'],
  [ProtoLocation.TORSO, 'T'],
  [ProtoLocation.RIGHT_ARM, 'RA'],
  [ProtoLocation.LEFT_ARM, 'LA'],
  [ProtoLocation.LEGS, 'L'],
  [ProtoLocation.MAIN_GUN, 'MG'],
]);

/**
 * Read-only baseline trace adapter. RULES.md documents the inherited empty
 * type/weight stages at MegaMek 48fcb2f6; the local summary has no chassis
 * adjustment. Mount keys retain local input identities; consumers compare
 * values within known native locations. Ammo groups remain unavailable here.
 */
export function protoMechBVTerms(
  b: IProtoMechBVBreakdown,
): IProtoMechBVBreakdown & {
  typeModifier: number;
  offensiveTypeModifier: number;
  summaryModifier: number;
  weightBV: number;
  adjustment: number;
} & Record<`weapon.${number}.${string}.${string}`, number> {
  const weaponTerms: Record<`weapon.${number}.${string}.${string}`, number> =
    {};
  for (const fact of b.weaponMountBV ?? []) {
    const location = nativeLocationAbbreviations.get(fact.location);
    if (location === undefined) continue;
    weaponTerms[
      `weapon.${fact.equipmentIndex}.${location}.${fact.equipmentId}`
    ] = fact.battleValue;
  }
  return {
    ...b,
    ...weaponTerms,
    typeModifier: 1,
    offensiveTypeModifier: 1,
    summaryModifier: b.chassisMultiplier,
    weightBV: b.physicalWeaponBV,
    adjustment: b.final - b.baseBV,
  };
}
