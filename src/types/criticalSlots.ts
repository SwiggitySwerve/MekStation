/**
 * Canonical critical-slot types shared across the BattleTech editor.
 * All UI components and services should import from this module (via the
 * root types barrel) to avoid duplicating structural definitions.
 */

import { SlotEquipment } from './Editor';
import { TechBase } from './TechBase';

// =============================================================================
// UI-Facing Critical Slot Models
// =============================================================================

export enum SlotType {
  NORMAL = 'normal',
  REAR = 'rear',
  TURRET = 'turret',
}

export interface FixedSlotAllocation {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly slotIndex: number;
  readonly slots: number;
  readonly type: 'engine' | 'gyro' | 'cockpit' | 'structure' | 'armor' | 'heatsink' | 'other';
  readonly isRemovable?: boolean;
}

export interface EquipmentReference {
  readonly id: string;
  readonly equipmentData: SlotEquipment | FixedSlotAllocation;
  readonly allocatedSlots: number;
  readonly startSlotIndex: number;
  readonly endSlotIndex: number;
  readonly type: 'equipment' | 'system';
}

export interface CriticalSlotObject {
  readonly slotIndex: number;
  readonly location: string;
  readonly equipment: EquipmentReference | null;
  readonly isPartOfMultiSlot: boolean;
  readonly multiSlotGroupId?: string;
  readonly multiSlotIndex?: number;
  readonly slotType: SlotType;
}

export type CriticalAllocationMap = Record<string, CriticalSlotObject[]>;

export interface CriticalDragState {
  readonly isDragging: boolean;
  readonly draggedItem: EquipmentReference | null;
  readonly sourceLocation?: string;
  readonly sourceSlotIndex?: number;
  readonly hoveredLocation?: string;
  readonly hoveredSlotIndex?: number;
  readonly canDrop: boolean;
  readonly dropPreview: {
    readonly location: string;
    readonly slots: number[];
  } | null;
}

export interface LocationSlotConfig {
  readonly location: string;
  readonly totalSlots: number;
  readonly rearSlots?: number;
  readonly turretSlots?: number;
}

export interface SlotOperation {
  readonly type: 'allocate' | 'remove' | 'move';
  readonly location: string;
  readonly slotIndex: number;
  readonly item?: EquipmentReference;
  readonly targetLocation?: string;
  readonly targetSlotIndex?: number;
}

export interface SlotChangeEvent {
  readonly operation: SlotOperation;
  readonly previousState: CriticalSlotObject | null;
  readonly newState: CriticalSlotObject | null;
  readonly affectedSlots: number[];
  readonly timestamp: Date;
}

export interface CriticalSlotUIState {
  readonly allocations: CriticalAllocationMap;
  readonly dragState: CriticalDragState;
  readonly hoveredSlot: {
    readonly location: string;
    readonly index: number;
  } | null;
  readonly selectedSlots: Array<{
    readonly location: string;
    readonly index: number;
  }>;
  readonly validation: {
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
  };
}

// =============================================================================
// Equipment + Allocation Types (shared by services + UI)
// =============================================================================

export interface LocationRestrictions {
  readonly type: 'static' | 'engine_slots' | 'custom';
  readonly validator?: (unit: unknown, location: string) => boolean;
}

export interface EquipmentObject {
  readonly id: string;
  readonly name: string;
  readonly requiredSlots: number;
  readonly weight: number;
  readonly type: 'weapon' | 'ammo' | 'ammunition' | 'equipment' | 'heat_sink' | 'jump_jet';
  readonly techBase: TechBase | 'Both';
  readonly heat?: number;
  readonly damage?: number | string;
  readonly tonnage?: number;
  readonly explosive?: boolean;
  readonly allowedLocations?: string[];
  readonly locationRestrictions?: LocationRestrictions;
  readonly componentType?: string;
}

export interface EquipmentAllocation {
  readonly equipmentGroupId: string;
  readonly equipmentData: EquipmentObject;
  readonly location: string;
  readonly occupiedSlots: number[];
  readonly startSlotIndex: number;
  readonly endSlotIndex: number;
}

export interface SlotContent {
  readonly type: 'system' | 'equipment' | 'empty';
  readonly equipmentGroupId?: string;
  readonly equipmentReference?: EquipmentAllocation;
  readonly isSystemReserved: boolean;
  readonly systemComponentType?: 'engine' | 'gyro' | 'actuator' | 'life_support' | 'sensors' | 'cockpit';
  readonly systemComponentName?: string;
}

export interface SlotValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

// =============================================================================
// Critical Section Configuration + Validation
// =============================================================================

export interface FixedSystemComponent {
  readonly name: string;
  readonly slotIndex: number;
  readonly isRemovable: boolean;
  readonly componentType: 'actuator' | 'life_support' | 'sensors' | 'cockpit';
}

export interface LocationSlotConfiguration {
  readonly location: string;
  readonly totalSlots: number;
  readonly fixedSlots: Map<number, FixedSystemComponent>;
  readonly availableSlotIndices: number[];
  readonly systemReservedSlots: number[];
}

export interface SectionValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly slotResults: SlotValidationResult[];
}


