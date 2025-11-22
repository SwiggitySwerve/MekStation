import { ICompleteUnitConfiguration, IEquipmentInstance } from './core/UnitInterfaces';
import { IEquipment, IWeapon } from './core/EquipmentInterfaces';
import { ComponentCategory, TechBase, EntityId } from './core/BaseTypes';
import { IArmorDef, ISystemComponent } from './core/ComponentInterfaces';
import type { UnitData } from './index';

// Core Editor Types
export type EditorTab = 'structure' | 'equipment' | 'criticals' | 'fluff' | 'quirks' | 'preview';

export interface ValidationError {
  id: string;
  category: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Editable Unit Interface - Extends the Core Configuration
export interface EditableUnit extends ICompleteUnitConfiguration {
  // Editor-specific metadata
  editorMetadata: {
    lastModified: Date;
    isDirty: boolean;
    version: string;
    isCustom?: boolean;
    originalUnit?: string;
    customNotes?: string;
  };
  
  // Validation state
  validationState: ValidationResult;
  
  // Fluff content
  fluffData: FluffContent;
  
  // Unallocated equipment (Staging area)
  unallocatedEquipment: IEquipmentInstance[];
  
  // Pilot/Crew (Optional)
  pilot?: {
    name: string;
    pilotingSkill: number;
    gunnerySkill: number;
  };

  // Game State (Optional - for simulation/preview)
  currentMovementPoints?: number;
  currentTerrain?: string;

  // Extended editor state
  data?: Partial<UnitData>;
  
  // Legacy properties (deprecated - use camelCase from ICompleteUnitConfiguration instead)
  // Prefer: techBase, rulesLevel, tonnage from ICompleteUnitConfiguration
  /** @deprecated Use techBase from ICompleteUnitConfiguration */
  tech_base?: string;
  /** @deprecated Use tonnage from ICompleteUnitConfiguration */
  mass?: number;
  
  // Editor-specific properties
  armorAllocation?: ArmorAllocationMap;
  equipmentPlacements?: EquipmentPlacement[];
  criticalSlots?: CriticalSlotAssignment[];

  // Legacy compatibility (to be removed after full migration)
  systemComponents?: import('./systemComponents').SystemComponents;
  criticalAllocations?: import('./systemComponents').CriticalAllocationMap;
}

// Fluff Content
export interface FluffContent {
  overview?: string;
  capabilities?: string;
  deployment?: string;
  history?: string;
  variants?: string;
  notable_pilots?: string;
  manufacturer?: string;
  primaryFactory?: string;
  communicationsSystem?: string;
  targetingTracking?: string;
  notes?: string;
  fluffImage?: string; // Base64 encoded
}

// Editor State
export interface UnitEditorState {
  unit: EditableUnit;
  activeTab: EditorTab;
  validationErrors: ValidationError[];
  isDirty: boolean;
  autoSave: boolean;
  isLoading: boolean;
  lastSaved?: Date;
}

// Component Props
export interface EditorComponentProps {
  unit: EditableUnit;
  onUnitChange: (updates: Partial<EditableUnit>) => void;
  validationErrors?: ValidationError[];
  readOnly?: boolean;
  compact?: boolean;
}

// Armor Allocation Props
export interface ArmorAllocationProps extends EditorComponentProps {
  showRearArmor?: boolean;
  allowAutoAllocation?: boolean;
  mechType?: 'Biped' | 'Quad' | 'LAM' | 'Tripod';
}

// Location Armor Data for UI
export interface LocationArmor {
  location: string;
  front: number;
  rear: number;
  maxFront: number;
  maxRear: number;
  armorType: IArmorDef;
}

export interface EquipmentPlacement {
  id: string;
  equipment: IEquipment;
  location: string;
  criticalSlots: number[];
  isFixed?: boolean;
  isRearMounted?: boolean;
}

export interface CriticalSlotAssignment {
  location: string;
  slotIndex: number;
  isFixed: boolean;
  isEmpty: boolean;
  equipment?: IEquipment;
  systemType?: 'engine' | 'gyro' | 'cockpit' | 'lifesupport' | 'sensors' | 'actuator';
}

export interface ArmorAllocationType {
  id?: string;
  name: string;
  pointsPerTon?: number;
  criticalSlots?: number;
  hasRearArmor?: boolean;
}

export type ArmorAllocationMap = Record<string, {
  front: number;
  rear?: number;
  maxFront?: number;
  maxRear?: number;
  type: ArmorAllocationType;
}>;

// Equipment Filters for UI
export interface EquipmentFilters {
  category?: string[];
  techLevel?: number[];
  weight?: { min?: number; max?: number };
  criticals?: { min?: number; max?: number };
  searchTerm?: string;
  showUnavailable?: boolean;
}

// Validation Rules
export interface ValidationRule {
  name: string;
  category: 'warning' | 'error';
  validator: (unit: EditableUnit) => boolean;
  message: string;
  field?: string;
}

// Auto-allocation Settings
export interface AutoAllocationSettings {
  headArmorMultiplier: number;
  rearArmorPercentage: number;
  prioritizeSymmetry: boolean;
  minimumHeadArmor: number;
}

// Mech Locations
export const MECH_LOCATIONS = {
  HEAD: 'Head',
  LEFT_ARM: 'Left Arm',
  RIGHT_ARM: 'Right Arm',
  LEFT_TORSO: 'Left Torso',
  CENTER_TORSO: 'Center Torso',
  RIGHT_TORSO: 'Right Torso',
  LEFT_LEG: 'Left Leg',
  RIGHT_LEG: 'Right Leg',
  CENTER_LEG: 'Center Leg', // For tripods
} as const;

export type MechLocation = typeof MECH_LOCATIONS[keyof typeof MECH_LOCATIONS];
