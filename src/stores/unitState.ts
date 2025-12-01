/**
 * Unit State Interface
 * 
 * Defines the complete state for a single unit.
 * This is the shape of data stored in each isolated unit store.
 * 
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  TechBaseMode,
  IComponentTechBases,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { generateUnitId as generateUUID } from '@/utils/uuid';

// =============================================================================
// Armor Allocation Types
// =============================================================================

/**
 * Per-location armor allocation
 * Stores armor points assigned to each location (front and rear for torsos)
 */
export interface IArmorAllocation {
  /** Head armor points */
  [MechLocation.HEAD]: number;
  /** Center Torso front armor points */
  [MechLocation.CENTER_TORSO]: number;
  /** Center Torso rear armor points */
  centerTorsoRear: number;
  /** Left Torso front armor points */
  [MechLocation.LEFT_TORSO]: number;
  /** Left Torso rear armor points */
  leftTorsoRear: number;
  /** Right Torso front armor points */
  [MechLocation.RIGHT_TORSO]: number;
  /** Right Torso rear armor points */
  rightTorsoRear: number;
  /** Left Arm armor points */
  [MechLocation.LEFT_ARM]: number;
  /** Right Arm armor points */
  [MechLocation.RIGHT_ARM]: number;
  /** Left Leg armor points */
  [MechLocation.LEFT_LEG]: number;
  /** Right Leg armor points */
  [MechLocation.RIGHT_LEG]: number;
}

/**
 * Create empty armor allocation (all zeros)
 */
export function createEmptyArmorAllocation(): IArmorAllocation {
  return {
    [MechLocation.HEAD]: 0,
    [MechLocation.CENTER_TORSO]: 0,
    centerTorsoRear: 0,
    [MechLocation.LEFT_TORSO]: 0,
    leftTorsoRear: 0,
    [MechLocation.RIGHT_TORSO]: 0,
    rightTorsoRear: 0,
    [MechLocation.LEFT_ARM]: 0,
    [MechLocation.RIGHT_ARM]: 0,
    [MechLocation.LEFT_LEG]: 0,
    [MechLocation.RIGHT_LEG]: 0,
  };
}

/**
 * Calculate total allocated armor points from allocation
 */
export function getTotalAllocatedArmor(allocation: IArmorAllocation): number {
  return (
    allocation[MechLocation.HEAD] +
    allocation[MechLocation.CENTER_TORSO] +
    allocation.centerTorsoRear +
    allocation[MechLocation.LEFT_TORSO] +
    allocation.leftTorsoRear +
    allocation[MechLocation.RIGHT_TORSO] +
    allocation.rightTorsoRear +
    allocation[MechLocation.LEFT_ARM] +
    allocation[MechLocation.RIGHT_ARM] +
    allocation[MechLocation.LEFT_LEG] +
    allocation[MechLocation.RIGHT_LEG]
  );
}

// =============================================================================
// Selection Memory Types
// =============================================================================

/**
 * Memory entry for a single component's selections per tech base
 * Stores the last selected value for each tech base
 * Uses TechBase enum values as keys for type safety
 */
export type ITechBaseMemory<T> = {
  [key in TechBase]?: T;
};

/**
 * Memory of component selections per tech base
 * Used to restore previous selections when switching tech bases
 */
export interface ISelectionMemory {
  engine: ITechBaseMemory<EngineType>;
  gyro: ITechBaseMemory<GyroType>;
  structure: ITechBaseMemory<InternalStructureType>;
  cockpit: ITechBaseMemory<CockpitType>;
  heatSink: ITechBaseMemory<HeatSinkType>;
  armor: ITechBaseMemory<ArmorTypeEnum>;
}

/**
 * Create an empty selection memory object
 */
export function createEmptySelectionMemory(): ISelectionMemory {
  return {
    engine: {},
    gyro: {},
    structure: {},
    cockpit: {},
    heatSink: {},
    armor: {},
  };
}

// =============================================================================
// Unit State Interface
// =============================================================================

/**
 * Complete state for a single unit
 * 
 * This interface contains ALL configuration data for one unit.
 * Each unit has its own isolated store containing this state.
 */
export interface UnitState {
  // =========================================================================
  // Identity
  // =========================================================================
  
  /** Unique unit identifier */
  readonly id: string;
  
  /** Display name (user-editable) */
  name: string;
  
  /** Unit tonnage (editable) */
  tonnage: number;
  
  /** Base tech base for the unit */
  readonly techBase: TechBase;
  
  // =========================================================================
  // Configuration
  // =========================================================================
  
  /** Unit type (BattleMech, Vehicle, etc.) */
  readonly unitType: UnitType;
  
  /** Mech configuration (Biped, Quad, etc.) */
  configuration: MechConfiguration;
  
  /** Whether this is an OmniMech */
  isOmni: boolean;
  
  /** Tech base mode: inner_sphere, clan, or mixed */
  techBaseMode: TechBaseMode;
  
  /** Per-component tech base settings (used when techBaseMode is 'mixed') */
  componentTechBases: IComponentTechBases;
  
  /** Memory of component selections per tech base for restoration */
  selectionMemory: ISelectionMemory;
  
  // =========================================================================
  // Component Selections
  // =========================================================================
  
  /** Engine type */
  engineType: EngineType;
  
  /** Engine rating */
  engineRating: number;
  
  /** Gyro type */
  gyroType: GyroType;
  
  /** Internal structure type */
  internalStructureType: InternalStructureType;
  
  /** Cockpit type */
  cockpitType: CockpitType;
  
  /** Heat sink type */
  heatSinkType: HeatSinkType;
  
  /** Number of heat sinks */
  heatSinkCount: number;
  
  /** Armor type */
  armorType: ArmorTypeEnum;
  
  /** Armor tonnage allocated (user-set) */
  armorTonnage: number;
  
  /** Per-location armor allocation */
  armorAllocation: IArmorAllocation;
  
  /** Movement enhancement (MASC, TSM, etc.) or null for none */
  enhancement: MovementEnhancementType | null;
  
  // =========================================================================
  // Metadata
  // =========================================================================
  
  /** Has unsaved changes */
  isModified: boolean;
  
  /** Creation timestamp */
  readonly createdAt: number;
  
  /** Last modified timestamp */
  lastModifiedAt: number;
}

// =============================================================================
// Unit Store Actions
// =============================================================================

/**
 * Actions available on a unit store
 */
export interface UnitActions {
  // Name
  setName: (name: string) => void;
  
  // Chassis
  setTonnage: (tonnage: number) => void;
  setConfiguration: (configuration: MechConfiguration) => void;
  setIsOmni: (isOmni: boolean) => void;
  
  // Tech base
  setTechBaseMode: (mode: TechBaseMode) => void;
  setComponentTechBase: (component: keyof IComponentTechBases, techBase: TechBase) => void;
  setAllComponentTechBases: (techBases: IComponentTechBases) => void;
  
  // Components
  setEngineType: (type: EngineType) => void;
  setEngineRating: (rating: number) => void;
  setGyroType: (type: GyroType) => void;
  setInternalStructureType: (type: InternalStructureType) => void;
  setCockpitType: (type: CockpitType) => void;
  setHeatSinkType: (type: HeatSinkType) => void;
  setHeatSinkCount: (count: number) => void;
  setArmorType: (type: ArmorTypeEnum) => void;
  setEnhancement: (enhancement: MovementEnhancementType | null) => void;
  
  // Armor allocation
  setArmorTonnage: (tonnage: number) => void;
  setLocationArmor: (location: MechLocation, front: number, rear?: number) => void;
  autoAllocateArmor: () => void;
  maximizeArmor: () => void;
  clearAllArmor: () => void;
  
  // Metadata
  markModified: (modified?: boolean) => void;
}

/**
 * Combined unit store type
 */
export type UnitStore = UnitState & UnitActions;

// =============================================================================
// Factory Helpers
// =============================================================================

/**
 * Options for creating a new unit
 */
export interface CreateUnitOptions {
  id?: string;
  name: string;
  tonnage: number;
  techBase: TechBase;
  walkMP?: number;
}

/**
 * Generate a unique unit ID using UUID v4
 * UUIDs enable multi-user support and shareable unit URLs
 */
export function generateUnitId(): string {
  return generateUUID();
}

/**
 * Create default unit state
 */
export function createDefaultUnitState(options: CreateUnitOptions): UnitState {
  const id = options.id ?? generateUnitId();
  const now = Date.now();
  const walkMP = options.walkMP ?? 4;
  const engineRating = options.tonnage * walkMP;
  const techBaseMode: TechBaseMode = options.techBase === TechBase.CLAN ? TechBaseMode.CLAN : TechBaseMode.INNER_SPHERE;
  
  return {
    // Identity
    id,
    name: options.name,
    tonnage: options.tonnage,
    techBase: options.techBase,
    
    // Configuration
    unitType: UnitType.BATTLEMECH,
    configuration: MechConfiguration.BIPED,
    isOmni: false,
    techBaseMode,
    componentTechBases: createDefaultComponentTechBases(options.techBase),
    selectionMemory: createEmptySelectionMemory(),
    
    // Components
    engineType: EngineType.STANDARD,
    engineRating,
    gyroType: GyroType.STANDARD,
    internalStructureType: InternalStructureType.STANDARD,
    cockpitType: CockpitType.STANDARD,
    heatSinkType: HeatSinkType.SINGLE,
    heatSinkCount: 10,
    armorType: ArmorTypeEnum.STANDARD,
    armorTonnage: 0,
    armorAllocation: createEmptyArmorAllocation(),
    enhancement: null,
    
    // Metadata
    isModified: true,
    createdAt: now,
    lastModifiedAt: now,
  };
}

