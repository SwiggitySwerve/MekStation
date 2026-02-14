export type { SlotAssignment, SlotOperationResult } from './types';

export {
  getFixedSlotIndices,
  getAvailableSlotIndices,
  isUnhittableEquipment,
} from './queries';

export { getUnallocatedUnhittables, fillUnhittableSlots } from './filling';

export { compactEquipmentSlots, sortEquipmentBySize } from './assignment';
