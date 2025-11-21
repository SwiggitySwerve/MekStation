/**
 * Critical Slots Object-Based Data Model
 * A complete object-based system for tracking critical slot allocations
 * NO STRINGS - only objects and references
 */

import {
  IEquipmentInstance,
  IFixedAllocation,
  IEquipment
} from './core/UnitInterfaces';

// Core slot object - never a string
export interface CriticalSlotObject {
  slotIndex: number;
  location: string;
  equipment: EquipmentReference | null;  // null = empty, never a string
  isPartOfMultiSlot: boolean;
  multiSlotGroupId?: string;
  multiSlotIndex?: number;  // 0 = first slot, 1 = second, etc.
  slotType: SlotType;
}

export enum SlotType {
  NORMAL = 'normal',
  REAR = 'rear',
  TURRET = 'turret'
}

// Reference to actual equipment or system component
export interface EquipmentReference {
  id: string; // UUID of the Allocation (Instance ID)
  equipmentData: IEquipment | IFixedAllocation; // The actual definition or fixed allocation record
  allocatedSlots: number;
  startSlotIndex: number;
  endSlotIndex: number;
  type: 'equipment' | 'system'; // Differentiate between inventory items and fixed system components
}

// Location-based allocation map
export interface CriticalAllocationMap {
  [location: string]: CriticalSlotObject[];
}

// Drag and drop state
export interface CriticalDragState {
  isDragging: boolean;
  draggedItem: EquipmentReference | null;
  sourceLocation?: string;
  sourceSlotIndex?: number;
  hoveredLocation?: string;
  hoveredSlotIndex?: number;
  canDrop: boolean;
  dropPreview: {
    location: string;
    slots: number[];
  } | null;
}

// Location slot configuration
export interface LocationSlotConfig {
  location: string;
  totalSlots: number;
  rearSlots?: number;
  turretSlots?: number;
}

// Mech location configurations
export const LOCATION_CONFIGS: LocationSlotConfig[] = [
  { location: 'Head', totalSlots: 6 },
  { location: 'Center Torso', totalSlots: 12, rearSlots: 2 },
  { location: 'Left Torso', totalSlots: 12 },
  { location: 'Right Torso', totalSlots: 12 },
  { location: 'Left Arm', totalSlots: 12 },
  { location: 'Right Arm', totalSlots: 12 },
  { location: 'Left Leg', totalSlots: 6 },
  { location: 'Right Leg', totalSlots: 6 }
];

// Helper type for slot operations
export interface SlotOperation {
  type: 'allocate' | 'remove' | 'move';
  location: string;
  slotIndex: number;
  item?: EquipmentReference;
  targetLocation?: string;
  targetSlotIndex?: number;
}

// Slot change event
export interface SlotChangeEvent {
  operation: SlotOperation;
  previousState: CriticalSlotObject | null;
  newState: CriticalSlotObject | null;
  affectedSlots: number[];
  timestamp: Date;
}

// Critical slot state for UI
export interface CriticalSlotUIState {
  allocations: CriticalAllocationMap;
  dragState: CriticalDragState;
  hoveredSlot: {
    location: string;
    index: number;
  } | null;
  selectedSlots: Array<{
    location: string;
    index: number;
  }>;
  // Validation should be handled by a service, not stored in UI state ideally, but keeping for compatibility if needed
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}
