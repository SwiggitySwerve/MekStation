import { MechLocation } from '../../types/construction/CriticalSlotAllocation';

/**
 * Armor values per location for front, rear, and max armor.
 * Uses MechLocation enum from base types for consistency.
 */
export interface ArmorData {
  front: Partial<Record<MechLocation, number>>;
  rear: Partial<Record<MechLocation, number>>;
  max: Partial<Record<MechLocation, number>>;
}

export type ArmorAllocationType = 'even' | 'front-weighted' | 'rear-weighted';
export type ArmorFacing = 'front' | 'rear';
