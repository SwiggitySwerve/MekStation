import type {
  ICriticalSlotPart,
  IEquipmentSlotAllocation,
} from '@/types/equipment/MountedEquipment';

/** Every location occupied by one mount, including split and spreadable parts. */
export function getSlotParts(
  item: IEquipmentSlotAllocation,
): readonly ICriticalSlotPart[] {
  return [
    ...(item.location
      ? [{ location: item.location, slots: item.slots ?? [] }]
      : []),
    ...(item.splitSlots ? [item.splitSlots] : []),
    ...(item.spreadSlots ?? []),
  ];
}
