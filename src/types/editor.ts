/**
 * Editor.ts
 * Rich editor-centric types that capture unit editing state, armor allocation,
 * and drag/drop metadata for BattleTech construction flows.
 */

import { RulesLevel, TechBase } from './TechBase';
import { IUnitData } from './Unit';
import { IEquipment, FullEquipment } from './Equipment';
import { IValidationResult, IValidationError } from './Validation';

export const MECH_LOCATIONS = {
  HEAD: 'Head',
  LEFT_ARM: 'Left Arm',
  RIGHT_ARM: 'Right Arm',
  LEFT_TORSO: 'Left Torso',
  CENTER_TORSO: 'Center Torso',
  RIGHT_TORSO: 'Right Torso',
  LEFT_LEG: 'Left Leg',
  RIGHT_LEG: 'Right Leg',
  CENTER_LEG: 'Center Leg',
} as const;

export type MechLocation = typeof MECH_LOCATIONS[keyof typeof MECH_LOCATIONS];

export type EditorTab = 'structure' | 'equipment' | 'criticals' | 'fluff' | 'quirks' | 'preview';

export interface IFluffContent {
  readonly overview?: string;
  readonly capabilities?: string;
  readonly deployment?: string;
  readonly history?: string;
  readonly variants?: string;
  readonly notable_pilots?: string;
  readonly manufacturer?: string;
  readonly primaryFactory?: string;
  readonly communicationsSystem?: string;
  readonly targetingTracking?: string;
  readonly notes?: string;
  readonly fluffImage?: string;
}

export type FluffContent = IFluffContent;

export interface IArmorAllocationType {
  readonly id?: string;
  readonly name: string;
  readonly pointsPerTon?: number;
  readonly criticalSlots?: number;
  readonly hasRearArmor?: boolean;
}

export type ArmorAllocationType = IArmorAllocationType;

export interface IArmorAllocationEntry {
  readonly front: number;
  readonly rear?: number;
  readonly maxFront?: number;
  readonly maxRear?: number;
  readonly type: ArmorAllocationType;
}

export type ArmorAllocationMap = Record<string, IArmorAllocationEntry>;

export type SlotEquipment = IEquipment | FullEquipment;

export interface IEquipmentPlacement {
  readonly id: string;
  readonly equipment: SlotEquipment;
  readonly location: string;
  readonly criticalSlots: number[];
  readonly isFixed?: boolean;
  readonly isRearMounted?: boolean;
}

export type EquipmentPlacement = IEquipmentPlacement;

export interface ICriticalSlotAssignment {
  readonly location: string;
  readonly slotIndex: number;
  readonly isFixed: boolean;
  readonly isEmpty: boolean;
  readonly equipment?: SlotEquipment;
  readonly systemType?: 'engine' | 'gyro' | 'cockpit' | 'lifesupport' | 'sensors' | 'actuator';
}

export type CriticalSlotAssignment = ICriticalSlotAssignment;

export interface IEquipmentInstance {
  readonly id: string;
  readonly equipmentId: string;
  readonly equipment: IEquipment;
  readonly location: string;
  readonly slotIndex: number;
  readonly quantity: number;
  readonly status?: string;
}

export interface IEditorMetadata {
  readonly lastModified: Date;
  readonly isDirty: boolean;
  readonly version: string;
  readonly isCustom?: boolean;
  readonly originalUnit?: string;
  readonly customNotes?: string;
}

export interface IEditableUnit {
  readonly id: string | number;
  readonly name: string;
  readonly chassis?: string;
  readonly model?: string;
  readonly techBase?: TechBase;
  readonly tech_base?: string;
  readonly rulesLevel?: RulesLevel;
  readonly rulesLevelString?: string;
  readonly tonnage: number;
  readonly mass?: number;
  readonly era?: string;
  readonly unitType?: string;
  readonly data?: Partial<IUnitData>;
  readonly armor?: {
    readonly allocation?: Record<string, number>;
    readonly type?: string;
  };
  readonly armorAllocation?: ArmorAllocationMap;
  readonly equipmentPlacements?: IEquipmentPlacement[];
  readonly criticalSlots?: ICriticalSlotAssignment[];
  readonly unallocatedEquipment?: IEquipmentInstance[];
  readonly editorMetadata?: IEditorMetadata;
  readonly validationState?: IValidationResult;
  readonly fluffData?: IFluffContent;
  readonly pilot?: {
    readonly name: string;
    readonly pilotingSkill: number;
    readonly gunnerySkill: number;
  };
  readonly currentMovementPoints?: number;
  readonly currentTerrain?: string;
  readonly systemComponents?: Record<string, unknown>;
  readonly criticalAllocations?: Record<string, unknown>;
}

export type EditableUnit = IEditableUnit;

export interface IValidationRuleDefinition {
  readonly name: string;
  readonly category: 'warning' | 'error';
  readonly validator: (unit: IEditableUnit) => boolean;
  readonly message: string;
  readonly field?: string;
}

export type ValidationRule = IValidationRuleDefinition;

export interface IEditorComponentProps {
  readonly unit: IEditableUnit;
  readonly onUnitChange: (updates: Partial<IEditableUnit>) => void;
  readonly validationErrors?: IValidationError[];
  readonly readOnly?: boolean;
  readonly compact?: boolean;
}

export interface IEditorState {
  readonly unit: IEditableUnit;
  readonly activeTab: EditorTab;
  readonly validationErrors: IValidationError[];
  readonly isDirty: boolean;
  readonly autoSave: boolean;
  readonly isLoading: boolean;
  readonly lastSaved?: Date;
}


