import type { IProtoMechBVBreakdown } from '@/types/unit/BVBreakdownTypes';

import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import { addBVToAmmoCapGroup } from '../battleValueAmmo';

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
 * adjustment. Weapon keys use optional native indices with a local fallback;
 * ids retain input identities. Ammo terms transport optional owner facts.
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
  Record<`equipment.native.${number}.${string}`, number> &
  Record<`ammo.${'available' | 'cap'}.${string}`, number> {
  const weaponTerms: Record<`weapon.${number}.${string}.${string}`, number> =
    {};
  for (const fact of b.weaponMountBV ?? []) {
    const location = nativeLocations.get(fact.location);
    if (location === undefined) continue;
    weaponTerms[
      `weapon.${fact.nativeEquipmentIndex ?? fact.equipmentIndex}.${location.abbreviation}.${fact.equipmentId}`
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
  for (const fact of b.resolvedZeroEquipmentMountBV ?? []) {
    const location =
      fact.nativeLocation ?? nativeLocations.get(fact.location)?.index;
    if (location === undefined) continue;
    equipmentTerms[`equipment.native.${location}.${fact.equipmentId}`] =
      fact.battleValue;
  }
  const available: Record<string, number> = {};
  for (const fact of b.ammoAvailableMountBV ?? []) {
    addBVToAmmoCapGroup(available, fact.nativeGroup, fact.battleValue);
  }
  const ammoTerms: Record<`ammo.${'available' | 'cap'}.${string}`, number> = {};
  for (const [group, value] of Object.entries(available)) {
    ammoTerms[`ammo.available.${group}`] = value;
  }
  for (const [group, value] of Object.entries(b.ammoCapBVByGroup ?? {})) {
    ammoTerms[`ammo.cap.${group}`] = value;
  }
  return {
    ...b,
    ...weaponTerms,
    ...equipmentTerms,
    ...ammoTerms,
    typeModifier: 1,
    offensiveTypeModifier: 1,
    summaryModifier: b.chassisMultiplier,
    weightBV: b.physicalWeaponBV,
    adjustment: b.final - b.baseBV,
  };
}
