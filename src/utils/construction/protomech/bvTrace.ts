import type { IProtoMechBVBreakdown } from '@/types/unit/BVBreakdownTypes';

import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

// Pinned ProtoMek.java:87-89,102-108. No Body/quad-only identity is inferred.
const nativeLocations = new Map<
  string,
  { readonly abbreviation: string; readonly index: number }
>([
  [ProtoLocation.HEAD, { abbreviation: 'HD', index: 1 }],
  [ProtoLocation.TORSO, { abbreviation: 'T', index: 2 }],
  [ProtoLocation.RIGHT_ARM, { abbreviation: 'RA', index: 3 }],
  [ProtoLocation.LEFT_ARM, { abbreviation: 'LA', index: 4 }],
  [ProtoLocation.LEGS, { abbreviation: 'L', index: 5 }],
  [ProtoLocation.MAIN_GUN, { abbreviation: 'MG', index: 6 }],
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
} & Record<`weapon.${number}.${string}.${string}`, number> &
  Record<`equipment.native.${number}.${string}`, number> {
  const weaponTerms: Record<`weapon.${number}.${string}.${string}`, number> =
    {};
  for (const fact of b.weaponMountBV ?? []) {
    const location = nativeLocations.get(fact.location);
    if (location === undefined) continue;
    weaponTerms[
      `weapon.${fact.equipmentIndex}.${location.abbreviation}.${fact.equipmentId}`
    ] = fact.battleValue;
  }
  const equipmentTerms: Record<`equipment.native.${number}.${string}`, number> =
    {};
  for (const fact of b.offensiveEquipmentMountBV ?? []) {
    const location = nativeLocations.get(fact.location);
    if (location === undefined) continue;
    // Native equipment terms use location number, not equipment index.
    // Assignment preserves the native trace's last-put duplicate semantics.
    equipmentTerms[`equipment.native.${location.index}.${fact.equipmentId}`] =
      fact.battleValue;
  }
  return {
    ...b,
    ...weaponTerms,
    ...equipmentTerms,
    typeModifier: 1,
    offensiveTypeModifier: 1,
    summaryModifier: b.chassisMultiplier,
    weightBV: b.physicalWeaponBV,
    adjustment: b.final - b.baseBV,
  };
}
