import type { UnitState } from '@/stores/unitState';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { mapLocation } from '@/services/conversion/LocationMappings';
import {
  getTechHintFromToken,
  resolveEquipmentId,
} from '@/services/units/unitLoaderService/equipmentResolution';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { getSlotParts } from '@/utils/construction/slotOperations/parts';

import { parseNativeWeaponQuirkKey } from './weaponQuirkParsing';

/**
 * Loaded source facts the mech writer carries after its written keys. The
 * editor has no field for these. Every other BattleMech contract key is written
 * or deliberately not carried (CustomUnitSerializer.stateCoverage.test.ts).
 */
export const SOURCE_ONLY_FACTS = ['quirks', 'weaponQuirks', 'source'] as const;

/** Weapon quirks are kept only where their weapon still sits (see below). */
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
 * A native `LOCATION:SLOT:WEAPON_NAME` entry is kept only while a mount in that
 * critical slot is the named item, as MegaMek 48fcb2f64 assigns it on load
 * (Entity.java:17256-17315). Java also requires a WeaponType or a club
 * (17284-17287). The catalog's categories cannot express that (TAG is
 * Electronics, clubs are Miscellaneous), so only ammunition is excluded: it is
 * never a weapon or club, and a bin can carry its weapon's id. Known
 * divergence: Slagmaiden SLG-X LA:4:ISLargeShield is kept here; Java drops it
 * (F_SHIELD without F_CLUB is "not a weapon"). Java matches the name
 * against the mount type's own names (Entity.java:17289-17297), and each name
 * belongs to one item: the name resolves to the Clan item when it carries a
 * Clan marker (CLFlamer, Clan Flamer) and to the Inner Sphere item otherwise,
 * never by the unit's or the mount's mode. So a Clan twin swapped in for an IS
 * weapon drops the entry, and an identical twin moved into the cells keeps it,
 * as a file load would. Java reads only the cell's primary mount
 * (Entity.java:17258-17260); the editor has no primary/secondary cell model, so
 * any mount in the cell counts. No committed mech has a cell where that differs.
 *
 * Deliberate divergence from MegaMekLab: MML holds quirks on the mount and
 * re-keys them on save from its current location and slot (Mek.java:5241-5247,
 * Entity.java:19096-19110), so a quirk follows its weapon. The editor has no
 * per-mount quirk identity, so a moved weapon drops its entry instead,
 * including moves made by Sort/Compact or by displacement. A removed weapon
 * drops its entry too. A legacy name key is kept while any mount is that weapon.
 */
function currentWeaponQuirks(
  state: UnitState,
  quirks: Readonly<Record<string, readonly string[]>>,
): Record<string, string[]> | undefined {
  const isWeapon = (name: string, mount: IMountedEquipmentInstance) => {
    // The name owns its side, independent of any unit or mount mode: a
    // CL-prefixed or Clan-marked name is the Clan item, any other name the
    // Inner Sphere item (MML writes getInternalName(); Clan ones are CL-prefixed).
    const clan = getTechHintFromToken(name) === 'clan';
    return (
      mount.category !== EquipmentCategory.AMMUNITION &&
      resolveEquipmentId(
        name,
        clan ? TechBase.CLAN : TechBase.INNER_SPHERE,
        clan ? TechBaseMode.CLAN : TechBaseMode.INNER_SPHERE,
        undefined,
      ).resolvedId === mount.equipmentId
    );
  };
  const kept = Object.entries(quirks).filter(([key]) => {
    const native = parseNativeWeaponQuirkKey(key);
    if (!native) return state.equipment.some((mount) => isWeapon(key, mount));
    // A key whose location cannot be mapped cannot be verified, so it drops.
    // LocationMappings has no Tripod center leg ("CL") today.
    const location = mapLocation(native.location);
    if (location === undefined) return false;
    return state.equipment.some(
      (mount) =>
        getSlotParts(mount).some(
          (part) =>
            part.location === location && part.slots.includes(native.slot),
        ) && isWeapon(native.weapon, mount),
    );
  });
  return kept.length > 0
    ? Object.fromEntries(kept.map(([key, ids]) => [key, [...ids]]))
    : undefined;
}
