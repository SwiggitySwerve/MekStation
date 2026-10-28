import { MechLocation } from '@/types/construction';

export interface SlotContent {
  index: number;
  type: 'empty' | 'system' | 'equipment';
  name?: string;
  equipmentId?: string;
  isFirstSlot?: boolean;
  isLastSlot?: boolean;
  totalSlots?: number;
  isRemovable?: boolean;
  isOmniPodMounted?: boolean;
}

export interface CritEntry {
  index: number;
  primary: SlotContent;
  secondary?: SlotContent;
  isDoubleSlot: boolean;
}

export function flattenEntries(entries: CritEntry[]): SlotContent[] {
  return entries.flatMap((entry) =>
    entry.secondary ? [entry.primary, entry.secondary] : [entry.primary],
  );
}

export function slotsToCritEntries(
  slots: SlotContent[],
  isSuperheavy: boolean = false,
): CritEntry[] {
  return slots.map((slot) => ({
    index: slot.index,
    primary: slot,
    secondary: undefined,
    isDoubleSlot: isSuperheavy,
  }));
}

export interface LocationData {
  location: MechLocation;
  slots: SlotContent[];
  entries: CritEntry[];
  isSuperheavy: boolean;
}

/**
 * Occupied rows in a location, fixed systems included: the "8 / 12" count in
 * the wide location headers and the phone location pills.
 */
export function countOccupiedEntries(entries: readonly CritEntry[]): number {
  return entries.filter(
    (entry) =>
      entry.primary.type !== 'empty' ||
      (entry.secondary !== undefined && entry.secondary.type !== 'empty'),
  ).length;
}
