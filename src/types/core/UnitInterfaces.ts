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
  IUnitMetadata
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
  readonly techBase: TechBase;
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
}

/**
 * Structure configuration
 */
export interface IStructureConfiguration {
  readonly definition: IStructureDef; // The type (Endo, Standard)
  readonly currentPoints: IInternalStructure; // Current HP
  readonly maxPoints: IInternalStructure;     // Max HP
}

/**
 * Internal structure points by location
 */
export interface IInternalStructure {
  readonly head: number;
  readonly centerTorso: number;
  readonly leftTorso: number;
  readonly rightTorso: number;
  readonly leftArm: number;
  readonly rightArm: number;
  readonly leftLeg: number;
  readonly rightLeg: number;
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
  readonly allocation: IArmorAllocation;
}

/**
 * Armor allocation by location
 */
export interface IArmorAllocation {
  readonly head: number;
  readonly centerTorso: number;
  readonly centerTorsoRear: number;
  readonly leftTorso: number;
  readonly leftTorsoRear: number;
  readonly rightTorso: number;
  readonly rightTorsoRear: number;
  readonly leftArm: number;
  readonly rightArm: number;
  readonly leftLeg: number;
  readonly rightLeg: number;
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

// ===== SERVICE INTERFACES =====

/**
 * Unit configuration service
 */
export interface IUnitConfigurationService extends IObservableService {
  createConfiguration(template?: IConfigurationTemplate): Promise<Result<ICompleteUnitConfiguration>>;
  updateConfiguration(id: EntityId, updates: Partial<ICompleteUnitConfiguration>): Promise<Result<ICompleteUnitConfiguration>>;
  validateConfiguration(config: ICompleteUnitConfiguration): Promise<Result<IValidationState>>;
  cloneConfiguration(id: EntityId): Promise<Result<ICompleteUnitConfiguration>>;
  exportConfiguration(id: EntityId, format: 'json' | 'xml' | 'mtf' | 'pdf'): Promise<Result<string>>;
  importConfiguration(data: string, format: 'json' | 'xml' | 'mtf'): Promise<Result<ICompleteUnitConfiguration>>;
}

/**
 * Configuration template
 */
export interface IConfigurationTemplate {
  readonly name: string;
  readonly chassis: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly era: string;
  readonly preset?: 'basic' | 'advanced' | 'custom';
}

/**
 * Equipment allocation service
 */
export interface IEquipmentAllocationService extends IObservableService {
  allocateEquipment(
    configId: EntityId,
    equipmentId: EntityId,
    location: string,
    slotIndex?: number
  ): Promise<Result<IEquipmentInstance>>;

  deallocateEquipment(
    configId: EntityId,
    instanceId: EntityId
  ): Promise<Result<void>>;

  moveEquipment(
    configId: EntityId,
    instanceId: EntityId,
    newLocation: string,
    newSlotIndex?: number
  ): Promise<Result<IEquipmentInstance>>;

  createEquipmentGroup(
    configId: EntityId,
    equipmentIds: EntityId[],
    groupType: string
  ): Promise<Result<IEquipmentGroup>>;

  addToUnallocated(
    configId: EntityId,
    equipmentId: EntityId,
    quantity?: number
  ): Promise<Result<IUnallocatedEquipment>>;

  removeFromUnallocated(
    configId: EntityId,
    unallocatedId: EntityId
  ): Promise<Result<void>>;

  getUnallocatedEquipment(configId: EntityId): Promise<Result<IUnallocatedEquipment[]>>;
  getAllocatedEquipment(configId: EntityId): Promise<Result<IEquipmentInstance[]>>;
  getEquipmentByLocation(configId: EntityId, location: string): Promise<Result<IEquipmentInstance[]>>;
}

/**
 * State persistence service
 */
export interface IStatePersistenceService extends IService {
  saveState(configId: EntityId, state: ICompleteUnitState): Promise<Result<void>>;
  loadState(configId: EntityId): Promise<Result<ICompleteUnitState>>;
  saveConfiguration(config: ICompleteUnitConfiguration): Promise<Result<EntityId>>;
  loadConfiguration(configId: EntityId): Promise<Result<ICompleteUnitConfiguration>>;
  deleteConfiguration(configId: EntityId): Promise<Result<void>>;
  listConfigurations(): Promise<Result<IConfigurationSummary[]>>;
  exportState(configId: EntityId, format: 'json' | 'binary'): Promise<Result<Blob>>;
  importState(data: Blob, format: 'json' | 'binary'): Promise<Result<ICompleteUnitState>>;
}

/**
 * Configuration summary
 */
export interface IConfigurationSummary {
  readonly id: EntityId;
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly created: Date;
  readonly modified: Date;
  readonly isValid: boolean;
  readonly size: number;
}

/**
 * Critical slot management service
 */
export interface ICriticalSlotManagementService extends IObservableService {
  getSlotState(configId: EntityId): Promise<Result<ICriticalSlotState>>;
  updateSlotState(configId: EntityId, state: ICriticalSlotState): Promise<Result<void>>;
  allocateSlot(configId: EntityId, location: string, slotIndex: number, equipment: IEquipmentInstance): Promise<Result<void>>;
  deallocateSlot(configId: EntityId, location: string, slotIndex: number): Promise<Result<void>>;
  getAvailableSlots(configId: EntityId, location: string): Promise<Result<number[]>>;
  validateSlotAllocation(configId: EntityId, equipment: IEquipmentInstance, location: string, slotIndex: number): Promise<Result<boolean>>;
  optimizeSlotLayout(configId: EntityId): Promise<Result<ICriticalSlotState>>;
}

/**
 * Unit synchronization service
 */
export interface IUnitSynchronizationService extends IObservableService {
  synchronizeUnit(configId: EntityId): Promise<Result<void>>;
  createSnapshot(configId: EntityId): Promise<Result<IUnitSnapshot>>;
  restoreSnapshot(configId: EntityId, snapshotId: EntityId): Promise<Result<void>>;
  compareConfigurations(configId1: EntityId, configId2: EntityId): Promise<Result<IConfigurationComparison>>;
  mergeConfigurations(configIds: EntityId[]): Promise<Result<ICompleteUnitConfiguration>>;
}

/**
 * Unit snapshot
 */
export interface IUnitSnapshot {
  readonly id: EntityId;
  readonly configId: EntityId;
  readonly name: string;
  readonly timestamp: Date;
  readonly state: ICompleteUnitState;
  readonly checksum: string;
}

/**
 * Configuration comparison
 */
export interface IConfigurationComparison {
  readonly config1: EntityId;
  readonly config2: EntityId;
  readonly differences: IConfigurationDifference[];
  readonly similarity: number;
  readonly summary: IComparisonSummary;
}

/**
 * Configuration difference
 */
export interface IConfigurationDifference {
  readonly type: 'added' | 'removed' | 'modified';
  readonly category: string;
  readonly path: string;
  readonly oldValue?: any;
  readonly newValue?: any;
  readonly description: string;
  readonly impact: Severity;
}

/**
 * Comparison summary
 */
export interface IComparisonSummary {
  readonly totalDifferences: number;
  readonly addedItems: number;
  readonly removedItems: number;
  readonly modifiedItems: number;
  readonly categories: Record<string, number>;
  readonly significantChanges: IConfigurationDifference[];
}

// ===== OBSERVER INTERFACES =====

/**
 * Unit configuration observer
 */
export interface IUnitConfigurationObserver extends IObserver<ICompleteUnitConfiguration> {
  onConfigurationChanged(config: ICompleteUnitConfiguration): void;
  onValidationChanged(validation: IValidationState): void;
  onEquipmentChanged(equipment: IEquipmentInstance[]): void;
}

/**
 * Equipment allocation observer
 */
export interface IEquipmentAllocationObserver extends IObserver<IEquipmentInstance[]> {
  onEquipmentAllocated(instance: IEquipmentInstance): void;
  onEquipmentDeallocated(instanceId: EntityId): void;
  onEquipmentMoved(instance: IEquipmentInstance, oldLocation: string): void;
  onEquipmentGrouped(group: IEquipmentGroup): void;
}

/**
 * Critical slot observer
 */
export interface ICriticalSlotObserver extends IObserver<ICriticalSlotState> {
  onSlotAllocated(location: string, slotIndex: number, equipment: IEquipmentInstance): void;
  onSlotDeallocated(location: string, slotIndex: number): void;
  onSlotViolation(violation: ICriticalSlotViolation): void;
  onSlotOptimized(oldState: ICriticalSlotState, newState: ICriticalSlotState): void;
}

// ===== FACTORY INTERFACES =====

/**
 * Configuration factory
 */
export interface IConfigurationFactory {
  createBasicConfiguration(template: IConfigurationTemplate): Result<ICompleteUnitConfiguration>;
  createFromChassis(chassisId: EntityId, variant?: string): Result<ICompleteUnitConfiguration>;
  createCustomConfiguration(specs: ICustomConfigurationSpecs): Result<ICompleteUnitConfiguration>;
  cloneConfiguration(source: ICompleteUnitConfiguration, changes?: Partial<ICompleteUnitConfiguration>): Result<ICompleteUnitConfiguration>;
}

/**
 * Custom configuration specifications
 */
export interface ICustomConfigurationSpecs {
  readonly name: string;
  readonly chassis: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly era: string;
  readonly engineRating?: number;
  readonly armorType?: string;
  readonly structureType?: string;
  readonly presets?: IConfigurationPreset[];
}

/**
 * Configuration preset
 */
export interface IConfigurationPreset {
  readonly category: string;
  readonly type: string;
  readonly value: any;
  readonly justification?: string;
}
