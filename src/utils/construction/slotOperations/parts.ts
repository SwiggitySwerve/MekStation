import type { ICriticalSlotPart } from '@/types/equipment/MountedEquipment';

type SlotPart<TLocation extends string> = Omit<
  ICriticalSlotPart,
  'location'
> & {
  readonly location: TLocation;
};

/** Every location occupied by one mount, including split and spreadable parts. */
export function getSlotParts<TLocation extends string>(item: {
  readonly location?: TLocation;
  readonly slots?: ICriticalSlotPart['slots'];
  readonly splitSlots?: SlotPart<TLocation>;
  readonly spreadSlots?: readonly SlotPart<TLocation>[];
}): readonly SlotPart<TLocation>[] {
  return [
    ...(item.location
      ? [{ location: item.location, slots: item.slots ?? [] }]
      : []),
    ...(item.splitSlots ? [item.splitSlots] : []),
    ...(item.spreadSlots ?? []),
  ];
}
