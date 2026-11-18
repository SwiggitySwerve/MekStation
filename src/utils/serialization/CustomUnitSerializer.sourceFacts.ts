import type { UnitState } from '@/stores/unitState';

import { mapLocation } from '@/services/conversion/LocationMappings';
import { resolveEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import { getSlotParts } from '@/utils/construction/slotOperations/parts';

import { parseNativeWeaponQuirkKey } from './weaponQuirkParsing';

/**
 * Loaded source facts the mech writer carries after its written keys. The
 * editor has no field for these. Every other BattleMech contract key is written
 * or deliberately not carried (CustomUnitSerializer.stateCoverage.test.ts).
 */
export const SOURCE_ONLY_FACTS = ['quirks', 'weaponQuirks', 'source'] as const;

/** Weapon quirks follow the weapon, so they are filtered to current mounts. */
export function sourceOnlyFacts(state: UnitState): Record<string, unknown> {
  const source = state.bvContext?.source;
  return Object.fromEntries(
    SOURCE_ONLY_FACTS.flatMap((key): [string, unknown][] => {
      const value = source?.[key];
      if (value === undefined) return [];
      if (key !== 'weaponQuirks') return [[key, value]];
      const kept = currentWeaponQuirks(
        state,
        value as Readonly<Record<string, readonly string[]>>,
      );
      return kept ? [[key, kept]] : [];
    }),
  );
}

/**
 * MegaMek 48fcb2f64 Entity.java:17256-17315 (assignWeaponQuirk): a native
 * `LOCATION:SLOT:WEAPON_NAME` entry applies only while the mount in that
 * critical slot is that weapon. A removed or moved weapon drops its entry; it
 * is not re-keyed. A legacy name key applies while a mount is that weapon.
 */
function currentWeaponQuirks(
  state: UnitState,
  quirks: Readonly<Record<string, readonly string[]>>,
): Record<string, string[]> | undefined {
  const isWeapon = (name: string, equipmentId: string) =>
    resolveEquipmentId(name, state.techBase, state.techBaseMode, undefined)
      .resolvedId === equipmentId;
  const kept = Object.entries(quirks).filter(([key]) => {
    const native = parseNativeWeaponQuirkKey(key);
    if (!native)
      return state.equipment.some((mount) => isWeapon(key, mount.equipmentId));
    // A key whose location cannot be mapped cannot be verified, so it drops.
    // LocationMappings has no Tripod center leg ("CL") today.
    const location = mapLocation(native.location);
    if (location === undefined) return false;
    const mount = state.equipment.find((item) =>
      getSlotParts(item).some(
        (part) =>
          part.location === location && part.slots.includes(native.slot),
      ),
    );
    return mount !== undefined && isWeapon(native.weapon, mount.equipmentId);
  });
  return kept.length > 0
    ? Object.fromEntries(kept.map(([key, ids]) => [key, [...ids]]))
    : undefined;
}
