import type {
  ISerializedEquipment,
  ISerializedUnit,
} from '@/types/unit/UnitSerialization';

import {
  sourceCriticalWeapons,
  sourceWeaponSummaryMatches,
} from '@/services/units/unitLoaderService/sourceWeaponMounts';

/** Preserve summary metadata and append only unrepresented native mounts. */
export function appendSourceWeapons(
  unit: ISerializedUnit,
  warnings: string[],
): ISerializedEquipment[] {
  const equipment = [...unit.equipment];
  const available = new Set(equipment.map((_, index) => index));
  for (const mount of sourceCriticalWeapons(
    unit.criticalSlots,
    unit.tonnage,
    unit.techBase === 'CLAN',
    warnings,
  )) {
    const index = equipment.findIndex(
      (item, i) =>
        available.has(i) &&
        sourceWeaponSummaryMatches(mount, item.id, item.location, item.slots),
    );
    if (index >= 0) {
      available.delete(index);
      continue;
    }
    equipment.push({
      id: mount.equipmentId,
      location: mount.location.toUpperCase().replaceAll(' ', '_'),
      slots: [...mount.slots],
      ...(mount.isRearMounted ? { isRearMounted: true } : {}),
      ...(mount.isOmniPodMounted ? { isOmniPodMounted: true } : {}),
    });
  }
  return equipment;
}
