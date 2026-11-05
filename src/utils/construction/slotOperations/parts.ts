import type { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

/** The item's slots per location, including a split weapon's second part. */
export function getSlotParts(
  item: IMountedEquipmentInstance,
): ReadonlyArray<{ location: MechLocation; slots: readonly number[] }> {
  if (!item.location) return [];
  const parts = [
    { location: item.location as MechLocation, slots: item.slots ?? [] },
  ];
  return item.splitSlots ? [...parts, item.splitSlots] : parts;
}
