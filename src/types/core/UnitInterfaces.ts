/**
 * Unit Configuration and State Management Interfaces for BattleTech Editor
 * 
 * Comprehensive interfaces for unit configuration, state management, and validation
 * that provide complete type safety and eliminate the need for "as any" casting.
 */

import {
  EntityId,
  TechBase,
  RulesLevel,
  Severity,
  Result,
  IObservableService,
  IService,
  IObserver,
  IUnitMetadata,
  UnitType
} from './BaseTypes';

import {
  IEngineDef,
  IGyroDef,
  ICockpitDef,
  IStructureDef,
  IArmorDef,
  IHeatSinkDef,
  IJumpJetDef
} from './ComponentInterfaces';

import {
  IEquipment,
  IWeapon,
  IAmmunition,
  IHeatManagementEquipment,
  IMovementEquipment,
  IElectronicWarfareEquipment,
  IEquipmentQuery
} from './EquipmentInterfaces';

import { IUnitTechStatus } from './TechStatus';
import { IComponentDefinition } from './ComponentStructure';

import { 
    IUnitConfigurationService,
    IEquipmentAllocationService,
    IStatePersistenceService,
    IConfigurationSummary,
    ICriticalSlotManagementService,
    IUnitSynchronizationService,
    IUnitSnapshot,
    IConfigurationComparison,
    IConfigurationDifference,
    IComparisonSummary,
    IUnitConfigurationObserver,
    IEquipmentAllocationObserver,
    ICriticalSlotObserver,
    IConfigurationFactory,
    ICustomConfigurationSpecs,
    IConfigurationPreset
} from './ValidationInterfaces';

// ===== EQUIPMENT ALLOCATION AND MANAGEMENT =====

/**
 * Equipment allocation in a unit (Inventory Item)
 */
export interface IEquipmentInstance {
  readonly id: EntityId;
  readonly equipmentId: EntityId;
  readonly equipment: IEquipment;
  readonly location: string;
  readonly slotIndex: number;
  readonly quantity: number;
  readonly facing?: string; // For rear-mounted weapons
  readonly linkedEquipment?: EntityId[];
  readonly status: IEquipmentStatus;
  readonly configuration?: IEquipmentInstanceConfiguration;
}

/**
 * Fixed Allocation (System Component taking up slots)
 * e.g. XL Engine side torso slots, or Endo Steel slots
 */
export interface IFixedAllocation {
  readonly id: EntityId;
  readonly name: string; // "XL Engine", "Endo Steel"
  readonly location: string;
  readonly slotIndex: number;
  readonly slots: number; // Number of slots occupied
  readonly type: 'engine' | 'gyro' | 'cockpit' | 'structure' | 'armor' | 'heatsink' | 'other';
}

/**
 * Equipment status
 */
export interface IEquipmentStatus {
  readonly operational: boolean;
  readonly damaged: boolean;
  readonly destroyed: boolean;
  readonly criticalHits: number;
  readonly jammedTurns?: number;
  readonly overheated?: boolean;
  readonly ammunition?: number;
}

/**
 * Equipment instance configuration
 */
export interface IEquipmentInstanceConfiguration {
  readonly firingMode?: string;
  readonly ammunition?: string; // ID of ammo bin
  readonly linkingMode?: string;
  readonly customSettings?: Record<string, any>;
}

/**
 * Equipment group (for linked weapons)
 */
export interface IEquipmentGroup {
  readonly id: EntityId;
  readonly name: string;
  readonly type: 'weapon_group' | 'linked_systems' | 'ammunition_feed';
  readonly equipment: EntityId[];
  readonly firingSequence?: IFiringSequence[];
  readonly shared: ISharedResource[];
}

/**
 * Firing sequence for weapon groups
 */
export interface IFiringSequence {
  readonly equipmentId: EntityId;
  readonly order: number;
  readonly delay?: number;
  readonly conditions?: string[];
}

/**
 * Shared resource
 */
export interface ISharedResource {
  readonly resourceType: 'ammunition' | 'power' | 'cooling' | 'targeting';
  readonly capacity: number;
  readonly allocation: Record<EntityId, number>;
}

// ===== UNIT CONFIGURATION INTERFACES =====

/**
 * Complete unit configuration
 * Separates IDENTITY (Systems) from INVENTORY (Equipment)
 */
export interface ICompleteUnitConfiguration {
  readonly id: EntityId;
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly unitType: UnitType; // Explicit Unit Type
  
  // Technology Status
  readonly techBase: TechBase; // Simple access to overall tech base
  readonly techStatus: IUnitTechStatus; // Detailed tech breakdown
  
  readonly rulesLevel: RulesLevel;
  readonly era: string;
  readonly tonnage: number;
  
  // Structural Systems (The Chassis)
  readonly structure: IStructureConfiguration;
  readonly engine: IEngineConfiguration;
  readonly gyro: IGyroConfiguration;
  readonly cockpit: ICockpitConfiguration;
  readonly armor: IArmorConfiguration;
  readonly heatSinks: IHeatSinkConfiguration; // The system type (Double vs Single)
  readonly jumpJets: IJumpJetConfiguration;   // The capability (Standard vs Improved)
  readonly enhancement?: IEnhancementConfiguration; // MASC, TSM

  // Inventory (The Loadout)
  readonly equipment: IEquipmentInstance[]; // Weapons, Ammo, extra Heat Sinks, Jump Jets
  readonly fixedAllocations: IFixedAllocation[]; // Auto-generated from Systems
  
  readonly groups: IEquipmentGroup[];
  readonly metadata: IUnitMetadata;
  
  // Battle Armor Transport
  readonly mountedBattleArmor?: MountedBattleArmor[];
  readonly hasOmniMounts?: boolean;
  
  // LAM Configuration
  readonly lamConfiguration?: ILAMConfiguration;

  // ProtoMech Configuration
  readonly protoMechScale?: number;
  
  // QuadVee Configuration
  readonly quadVeeConfiguration?: IQuadVeeConfiguration;
}

/**
 * QuadVee Mode
 */
export type QuadVeeMode = 'Mech' | 'Vehicle';

/**
 * QuadVee Configuration
 */
export interface IQuadVeeConfiguration {
  readonly currentMode: QuadVeeMode;
  readonly conversionEquipmentDamaged?: boolean;
  readonly lastTransformation?: number;
}

/**
 * LAM Mode
 */
export type LAMMode = 'BattleMech' | 'AirMech' | 'Fighter';

/**
 * LAM Configuration
 */
export interface ILAMConfiguration {
  readonly currentMode: LAMMode;
  readonly currentFuel?: number;
  readonly structureMass?: number; // Conversion gear mass
}

/**
 * Mounted Battle Armor
 */
export interface MountedBattleArmor {
  readonly id: string;
  readonly name: string;
  readonly squad: string;
  readonly troopers: number;
  readonly location: string;
  readonly isOmniMount: boolean;
}

/**
 * Structure configuration
 */
export interface IStructureConfiguration {
  readonly definition: IStructureDef; // The type (Endo, Standard)
  readonly currentPoints: Record<string, number>; // Current HP by location ID
  readonly maxPoints: Record<string, number>;     // Max HP by location ID
}

/**
 * Engine configuration
 */
export interface IEngineConfiguration {
  readonly definition: IEngineDef; // The type (XL, Standard)
  readonly rating: number;
  readonly tonnage: number; // Calculated
}

/**
 * Gyro configuration
 */
export interface IGyroConfiguration {
  readonly definition: IGyroDef;
  readonly tonnage: number;
}

/**
 * Cockpit configuration
 */
export interface ICockpitConfiguration {
  readonly definition: ICockpitDef;
  readonly tonnage: number;
}

/**
 * Armor configuration
 */
export interface IArmorConfiguration {
  readonly definition: IArmorDef; // The type (Ferro, Standard)
  readonly tonnage: number;
  readonly allocation: Record<string, number>; // Armor points by location ID
  readonly rearAllocation?: Record<string, number>; // Rear armor points by location ID (if applicable)
}

/**
 * Heat sink configuration (System Level)
 */
export interface IHeatSinkConfiguration {
  readonly definition: IHeatSinkDef; // The type (Double, Single)
  readonly count: number; // Total number
  readonly engineHeatsinks: number; // Number inside engine
}

/**
 * Jump jet configuration (System Level)
 */
export interface IJumpJetConfiguration {
  readonly definition: IJumpJetDef; // The type (Standard, Improved)
  readonly count: number; // Total number
}

/**
 * Enhancement configuration
 */
export interface IEnhancementConfiguration {
  readonly type: string;
  readonly techBase: TechBase;
  readonly weight: number;
  readonly slots: number;
  readonly effect: IEnhancementEffect;
  readonly features?: string[];
}

/**
 * Enhancement effect
 */
export interface IEnhancementEffect {
  readonly movementBonus?: number;
  readonly heatReduction?: number;
  readonly armorBonus?: number;
  readonly weaponBonus?: number;
  readonly special?: string[];
}

/**
 * Unit variant
 */
export interface IUnitVariant {
  readonly name: string;
  readonly model: string;
  readonly changes: IVariantChange[];
  readonly era: string;
  readonly notes?: string;
}

/**
 * Variant change
 */
export interface IVariantChange {
  readonly component: string;
  readonly change: 'add' | 'remove' | 'replace' | 'modify';
  readonly from?: string;
  readonly to?: string;
  readonly description: string;
}

// ===== STATE MANAGEMENT INTERFACES =====

/**
 * Complete unit state for persistence
 */
export interface ICompleteUnitState {
  readonly configuration: ICompleteUnitConfiguration;
  readonly unallocatedEquipment: IUnallocatedEquipment[];
  readonly criticalSlots: ICriticalSlotState;
  readonly validation: IValidationState;
  readonly metadata: IStateMetadata;
}

/**
 * Unallocated equipment pool
 */
export interface IUnallocatedEquipment {
  readonly id: EntityId;
  readonly equipmentId: EntityId;
  readonly equipment: IEquipment;
  readonly quantity: number;
  readonly source: 'added' | 'removed' | 'moved';
  readonly timestamp: Date;
}

/**
 * Critical slot state
 */
export interface ICriticalSlotState {
  readonly slots: Record<string, ICriticalSlot[]>;
  readonly utilization: Record<string, number>;
  readonly overflow: string[];
  readonly violations: ICriticalSlotViolation[];
}

/**
 * Individual critical slot
 */
export interface ICriticalSlot {
  readonly index: number;
  readonly content?: IEquipmentInstance | IFixedAllocation; // Can be Equipment OR System
  readonly empty: boolean;
  readonly damaged: boolean;
  readonly destroyed: boolean;
}

/**
 * Critical slot violation
 */
export interface ICriticalSlotViolation {
  readonly type: string;
  readonly location: string;
  readonly slotIndex?: number;
  readonly equipmentId?: EntityId;
  readonly severity: Severity;
  readonly message: string;
  readonly suggestedFix?: string;
}

/**
 * Validation state
 */
export interface IValidationState {
  readonly isValid: boolean;
  readonly lastValidation: Date;
  readonly violations: IStateViolation[];
  readonly warnings: IStateWarning[];
  readonly score: number;
}

/**
 * State violation
 */
export interface IStateViolation {
  readonly id: EntityId;
  readonly type: string;
  readonly category: string;
  readonly severity: Severity;
  readonly message: string;
  readonly component?: string;
  readonly location?: string;
  readonly timestamp: Date;
}

/**
 * State warning
 */
export interface IStateWarning {
  readonly id: EntityId;
  readonly type: string;
  readonly message: string;
  readonly recommendation?: string;
  readonly timestamp: Date;
}

/**
 * State metadata
 */
export interface IStateMetadata {
  readonly version: string;
  readonly created: Date;
  readonly modified: Date;
  readonly author?: string;
  readonly checksum: string;
  readonly size: number;
  readonly compressionRatio?: number;
}

// Re-export services defined in ValidationInterfaces for convenience
export { 
    IUnitConfigurationService,
    IEquipmentAllocationService,
    IStatePersistenceService,
    IConfigurationSummary,
    ICriticalSlotManagementService,
    IUnitSynchronizationService,
    IUnitSnapshot,
    IConfigurationComparison,
    IConfigurationDifference,
    IComparisonSummary,
    IUnitConfigurationObserver,
    IEquipmentAllocationObserver,
    ICriticalSlotObserver,
    IConfigurationFactory,
    ICustomConfigurationSpecs,
    IConfigurationPreset
};
