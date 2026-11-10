import type { MechLocation } from '@/types/construction/CriticalSlotAllocation';

/** Source cells the loader could not place. Editor metadata, never design data. */
export interface IUnrecoveredCriticalSlot {
  readonly text: string;
  readonly location: MechLocation;
  /** Zero-based source critical-slot index. */
  readonly slot: number;
}
