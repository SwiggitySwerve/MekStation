/**
 * Critical Slots Components
 *
 * Drag-and-drop critical slot management.
 *
 * @spec openspec/specs/critical-slots-display/spec.md
 */

export { CriticalSlotsDisplay } from './CriticalSlotsDisplay';
export type {
  LocationData,
  SlotContent,
  CritEntry,
} from './CriticalSlotsDisplay';
export { flattenEntries, slotsToCritEntries } from './CriticalSlotsDisplay';
export { LocationGrid } from './LocationGrid';
export { SlotRow } from './SlotRow';
export { DoubleSlotRow } from './DoubleSlotRow';
export { DraggableEquipment } from './DraggableEquipment';
export { CriticalSlotToolbar } from './CriticalSlotToolbar';
