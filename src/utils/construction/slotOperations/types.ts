import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

export interface SlotAssignment {
  readonly instanceId: string;
  readonly location: MechLocation;
  readonly slots: readonly number[];
}

export interface SlotOperationResult {
  readonly assignments: readonly SlotAssignment[];
  readonly unassigned: readonly string[];
}
