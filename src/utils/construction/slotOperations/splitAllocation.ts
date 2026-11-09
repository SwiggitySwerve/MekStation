import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { isWeaponCategory } from '@/utils/equipment/ammunitionCompatibility';

/** Mek.getInnerLocation (Mek.java:489-496); quad legs map like arms. */
const INNER_LOCATION: Partial<Record<MechLocation, MechLocation>> = {
  [MechLocation.LEFT_TORSO]: MechLocation.CENTER_TORSO,
  [MechLocation.RIGHT_TORSO]: MechLocation.CENTER_TORSO,
  [MechLocation.CENTER_LEG]: MechLocation.CENTER_TORSO,
  [MechLocation.LEFT_ARM]: MechLocation.LEFT_TORSO,
  [MechLocation.LEFT_LEG]: MechLocation.LEFT_TORSO,
  [MechLocation.FRONT_LEFT_LEG]: MechLocation.LEFT_TORSO,
  [MechLocation.REAR_LEFT_LEG]: MechLocation.LEFT_TORSO,
  [MechLocation.RIGHT_ARM]: MechLocation.RIGHT_TORSO,
  [MechLocation.RIGHT_LEG]: MechLocation.RIGHT_TORSO,
  [MechLocation.FRONT_RIGHT_LEG]: MechLocation.RIGHT_TORSO,
  [MechLocation.REAR_RIGHT_LEG]: MechLocation.RIGHT_TORSO,
  [MechLocation.HEAD]: MechLocation.CENTER_TORSO,
};

/** Locations a split weapon may continue into (MtfFile.java:1093-1095). */
export function splitPartners(location: MechLocation): MechLocation[] {
  const inner = INNER_LOCATION[location];
  const outer = (Object.keys(INNER_LOCATION) as MechLocation[]).filter(
    (candidate) => INNER_LOCATION[candidate] === location,
  );
  return inner ? [inner, ...outer] : outer;
}

/** WeaponType.isSplittableOverCriticalSlots (WeaponType.java:2619-2621). */
export function isSplittable(item: IMountedEquipmentInstance): boolean {
  return (
    item.criticalSlots >= 8 &&
    item.category !== EquipmentCategory.PHYSICAL_WEAPON &&
    isWeaponCategory(item.category)
  );
}
