import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  getLocationsForConfig,
  isLegLocation,
  MechConfiguration,
} from '@/types/construction/MechConfigurationSystem';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { isValidLocationForEquipment } from '@/types/equipment/EquipmentPlacement';
import { isWeaponCategory } from '@/utils/equipment/ammunitionCompatibility';

import type { SlotAssignment } from './types';

import { findContiguousSlotStarts } from './topology';

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

/** MML 62bf193 BMCriticalTransferHandler.java:149-236: fill the largest
 * primary run, then a contiguous run in an eligible adjacent location. */
export function findEquipmentSlotAssignment(
  item: IMountedEquipmentInstance,
  location: MechLocation,
  freeByLocation: ReadonlyMap<MechLocation, readonly number[]>,
  configuration?: MechConfiguration,
): SlotAssignment | undefined {
  const locations = configuration
    ? getLocationsForConfig(configuration)
    : [...freeByLocation.keys()];
  if (
    !locations.includes(location) ||
    !isValidLocationForEquipment(item.equipmentId, location)
  )
    return undefined;
  const free = freeByLocation.get(location) ?? [];
  const count = item.criticalSlots;
  const assignment = (start: number, size: number): SlotAssignment => ({
    instanceId: item.instanceId,
    location,
    slots: Array.from({ length: size }, (_, offset) => start + offset),
  });
  if (count === 0) return assignment(0, 0);
  const start = findContiguousSlotStarts(free, count)[0];
  if (start !== undefined) return assignment(start, count);
  if (
    !isSplittable(item) ||
    configuration === MechConfiguration.LAM ||
    isLegLocation(location)
  )
    return undefined;
  for (let primaryCount = count - 1; primaryCount > 0; primaryCount--) {
    const primaryStart = findContiguousSlotStarts(free, primaryCount)[0];
    if (primaryStart === undefined) continue;
    for (const partner of splitPartners(location)) {
      if (
        isLegLocation(partner) ||
        !locations.includes(partner) ||
        !isValidLocationForEquipment(item.equipmentId, partner)
      )
        continue;
      const secondaryStart = findContiguousSlotStarts(
        freeByLocation.get(partner) ?? [],
        count - primaryCount,
      )[0];
      if (secondaryStart !== undefined)
        return {
          ...assignment(primaryStart, primaryCount),
          splitSlots: {
            location: partner,
            slots: Array.from(
              { length: count - primaryCount },
              (_, offset) => secondaryStart + offset,
            ),
          },
        };
    }
    // MML uses the largest primary run; it does not shrink it to try a different split.
    return undefined;
  }
  return undefined;
}
