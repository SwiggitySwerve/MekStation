/**
 * ProtoMech Equipment tab: which catalog items are offered and which mounts are
 * listed. Both are ports of MegaMekLab 62bf193:
 *   - ProtoMekUtil.isProtoMekEquipment(eq, proto), ProtoMekUtil.java:46-67:
 *     a weapon needs F_PROTO_WEAPON, a misc item F_PROTOMEK_EQUIPMENT, ammo is
 *     always offered. UnitUtil.isEntityEquipment (UnitUtil.java:1295) calls this
 *     two-argument form for the database view (AbstractEquipmentDatabaseView
 *     .java:615), so the configuration rules of the three-argument form (magnetic
 *     clamp on a quad or glider, the club flags) are not part of the picker; MML
 *     applies them only when the motive changes (PMStructureTab.java:496).
 *   - PMEquipmentTab.showInLoadOut: jump jets, MASC, partial wing, magnetic
 *     clamp and UMU are edited elsewhere and are not listed as loadout.
 *
 * The catalog represents both Java flags the same way: F_PROTO_WEAPON on a weapon
 * and F_PROTOMEK_EQUIPMENT on a miscellaneous item (ProtoMekUtil.java:50-67) are
 * `allowedUnitTypes` that include ProtoMech. One test therefore serves weapons,
 * electronics and miscellaneous items; there is no separate misc flag. A missing
 * list means the catalog does not yet describe the item and the picker does not
 * offer it. Placement validation keeps the opposite reading (mainGun.ts: an
 * absent list is unknown, never illegal) so no existing unit becomes invalid.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { EquipmentCategory } from '@/types/equipment';

import { isProtoEDPArmorMount } from './armorType';

export interface ProtoMechCatalogCandidate {
  readonly category: EquipmentCategory;
  readonly allowedUnitTypes?: readonly string[];
}

/** ProtoMekUtil.isProtoMekEquipment(eq, proto): is the item offered in the picker? */
export function isProtoMechCatalogEquipment(
  item: ProtoMechCatalogCandidate,
): boolean {
  if (item.category === EquipmentCategory.AMMUNITION) return true;
  return item.allowedUnitTypes?.includes('ProtoMech') ?? false;
}

/** Matched on the id with case, spaces and punctuation removed (BLK name or catalog id). */
const HIDDEN_FROM_LOADOUT =
  /jumpjet|masc|myomerbooster|partialwing|magneticclamp|umu/;

/**
 * PMEquipmentTab.showInLoadOut: is the mount listed in the Equipment tab?
 * MekStation additionally leaves out the Electric Discharge armor mount: the armor
 * owner creates and removes it with the armor type (setProtoArmorEquipment), so
 * moving or removing it here would separate the mount from the armor choice.
 */
export function isProtoMechLoadoutMount(equipmentId: string): boolean {
  return (
    !HIDDEN_FROM_LOADOUT.test(
      equipmentId.toLowerCase().replace(/[^a-z0-9]/g, ''),
    ) && !isProtoEDPArmorMount(equipmentId)
  );
}
