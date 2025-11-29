/**
 * CriticalSlot Utilities - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export interface CriticalSlotContent {
  id: string;
  name: string;
  type: 'equipment' | 'actuator' | 'system' | 'empty';
  equipmentId?: string;
  isDestroyed?: boolean;
}

export interface CriticalSlotInfo {
  index: number;
  slotIndex?: number;
  location: string;
  content: CriticalSlotContent | null;
  isFixed: boolean;
}

export type CriticalSlot = CriticalSlotInfo;

export interface EquipmentAllocation {
  id: string;
  name: string;
  location: string;
  slotIndex: number;
  slots: number;
  type?: string;
  equipmentGroupId: string;
  equipmentData: {
    name: string;
    type: string;
    requiredSlots: number;
    weight: number;
    techBase: string;
    heat?: number;
    componentType?: string;
    equipmentReference?: EquipmentObject;
    [key: string]: unknown;
  };
  occupiedSlots: number[];
}

export interface EquipmentObject {
  id: string;
  name: string;
  type: string;
  weight: number;
  requiredSlots: number;
  techBase?: string;
  heat?: number;
  damage?: number | string;
  range?: string;
  description?: string;
}

export function createEmptySlot(location: string, index: number): CriticalSlotInfo {
  return { index, slotIndex: index, location, content: null, isFixed: false };
}

export function isSlotAvailable(slot: CriticalSlotInfo): boolean {
  return slot.content === null && !slot.isFixed;
}

export function getLocationSlotCount(location: string): number {
  const counts: Record<string, number> = {
    'Head': 6,
    'Center Torso': 12,
    'Left Torso': 12,
    'Right Torso': 12,
    'Left Arm': 12,
    'Right Arm': 12,
    'Left Leg': 6,
    'Right Leg': 6,
  };
  return counts[location] ?? 0;
}


