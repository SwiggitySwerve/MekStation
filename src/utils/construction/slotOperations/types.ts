import type { IEquipmentSlotAllocation } from '@/types/equipment/MountedEquipment';

import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

export interface SlotAssignment extends IEquipmentSlotAllocation {
  readonly instanceId: string;
  readonly location: MechLocation;
  readonly slots: readonly number[];
}

export interface SlotOperationResult {
  readonly assignments: readonly SlotAssignment[];
  readonly unassigned: readonly string[];
}
