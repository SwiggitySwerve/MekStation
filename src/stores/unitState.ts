/**
 * Unit State Interface
 * 
 * Defines the complete state for a single unit.
 * This is the shape of data stored in each isolated unit store.
 * 
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import { LAMMode, QuadVeeMode } from '@/types/construction/MechConfigurationSystem';
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
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import { generateUnitId as generateUUID } from '@/utils/uuid';
import { JumpJetType } from '@/utils/construction/movementCalculations';

// =============================================================================
// Armor Allocation Types
// =============================================================================

/**
 * Per-location armor allocation
 * Stores armor points assigned to each location (front and rear for torsos)
 */
export interface IArmorAllocation {
  /** Index signature allowing any MechLocation key */
  [key: string]: number;
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
// Mounted Equipment Types
// =============================================================================

/**
 * Mounted equipment instance on a unit
 *
 * Each instance represents a single piece of equipment added to the unit.
 * Multiple instances of the same equipment type can exist (e.g., 4 Medium Lasers).
 */
export interface IMountedEquipmentInstance {
  /** Unique instance identifier (generated when added) */
  readonly instanceId: string;
  /** Reference to equipment definition ID */
  readonly equipmentId: string;
  /** Display name of the equipment */
  readonly name: string;
  /** Equipment category for grouping */
  readonly category: EquipmentCategory;
  /** Weight in tons */
  readonly weight: number;
  /** Number of critical slots required */
  readonly criticalSlots: number;
  /** Heat generated (for weapons) */
  readonly heat: number;
  /** Tech base of the equipment */
  readonly techBase: TechBase;
  /** Location where equipment is placed (undefined = unallocated) */
  readonly location?: MechLocation;
  /** Critical slot indices in the location (undefined = unallocated) */
  readonly slots?: readonly number[];
  /** Whether mounted facing rear arc */
  readonly isRearMounted: boolean;
  /** Linked ammunition instance ID (for weapons that use ammo) */
  readonly linkedAmmoId?: string;
  /**
   * Whether this equipment can be removed via the loadout tray.
   * Configuration components (Endo Steel, Ferro-Fibrous, Jump Jets, etc.)
   * are managed via their respective tabs and cannot be removed directly.
   * Defaults to true for user-added equipment.
   */
  readonly isRemovable: boolean;
  /**
   * Whether this equipment is pod-mounted on an OmniMech.
   * Pod-mounted equipment can be swapped between configurations.
   * Fixed equipment (isOmniPodMounted: false) is part of the base chassis.
   * Only relevant when the unit's isOmni flag is true.
   */
  readonly isOmniPodMounted: boolean;
}

/**
 * Create a mounted equipment instance from an equipment item
 * @param item The equipment definition
 * @param instanceId Unique instance identifier
 * @param isRemovable Whether the equipment can be removed via the loadout tray (default: true)
 * @param isOmniPodMounted Whether the equipment is pod-mounted on an OmniMech (default: false)
 */
export function createMountedEquipment(
  item: IEquipmentItem,
  instanceId: string,
  isRemovable: boolean = true,
  isOmniPodMounted: boolean = false
): IMountedEquipmentInstance {
  return {
    instanceId,
    equipmentId: item.id,
    name: item.name,
    category: item.category,
    weight: item.weight,
    criticalSlots: item.criticalSlots,
    heat: 'heat' in item ? (item as { heat: number }).heat : 0,
    techBase: item.techBase,
    location: undefined,
    slots: undefined,
    isRearMounted: false,
    linkedAmmoId: undefined,
    isRemovable,
    isOmniPodMounted,
  };
}

/**
 * Calculate total equipment weight
 */
export function getTotalEquipmentWeight(equipment: readonly IMountedEquipmentInstance[]): number {
  return equipment.reduce((total, item) => total + item.weight, 0);
}

/**
 * Calculate total equipment critical slots
 */
export function getTotalEquipmentSlots(equipment: readonly IMountedEquipmentInstance[]): number {
  return equipment.reduce((total, item) => total + item.criticalSlots, 0);
}

/**
 * Get equipment count by category
 */
export function getEquipmentByCategory(
  equipment: readonly IMountedEquipmentInstance[]
): Record<EquipmentCategory, IMountedEquipmentInstance[]> {
  const result = {} as Record<EquipmentCategory, IMountedEquipmentInstance[]>;
  
  // Initialize all categories with empty arrays
  for (const category of Object.values(EquipmentCategory)) {
    result[category] = [];
  }
  
  // Group equipment by category
  for (const item of equipment) {
    result[item.category].push(item);
  }
  
  return result;
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
  // Identity (MegaMekLab format)
  // =========================================================================
  
  /** Unique unit identifier */
  readonly id: string;
  
  /** Display name (derived from chassis + model, kept for compatibility) */
  name: string;
  
  /** Base chassis name (e.g., "Atlas", "Timber Wolf") */
  chassis: string;
  
  /** Clan name / alternate designation (optional, e.g., "Mad Cat" for Timber Wolf) */
  clanName: string;
  
  /** Model/variant designation (e.g., "AS7-D", "Prime") */
  model: string;
  
  /** Master Unit List ID (-1 for custom units, can include hyphens) */
  mulId: string;
  
  /** Introduction year */
  year: number;
  
  /** Rules level for filtering available equipment */
  rulesLevel: RulesLevel;
  
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

  /** Current LAM operating mode (only relevant for LAM configuration) */
  lamMode: LAMMode;

  /** Current QuadVee operating mode (only relevant for QuadVee configuration) */
  quadVeeMode: QuadVeeMode;

  /** Whether this is an OmniMech */
  isOmni: boolean;

  /**
   * Number of heat sinks permanently fixed to the OmniMech chassis.
   * These cannot be removed when switching configurations.
   * Only relevant when isOmni is true.
   * -1 indicates not set (use engine integral heat sinks as default).
   */
  baseChassisHeatSinks: number;

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
  
  /** Jump movement points (number of jump jets) */
  jumpMP: number;
  
  /** Type of jump jets installed */
  jumpJetType: JumpJetType;
  
  // =========================================================================
  // Equipment
  // =========================================================================
  
  /** Mounted equipment on the unit */
  equipment: readonly IMountedEquipmentInstance[];
  
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
  // Identity
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setClanName: (clanName: string) => void;
  setModel: (model: string) => void;
setMulId: (mulId: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (rulesLevel: RulesLevel) => void;
  
  // Chassis
  setTonnage: (tonnage: number) => void;
  setConfiguration: (configuration: MechConfiguration) => void;
  setIsOmni: (isOmni: boolean) => void;

  // Mode switching (for transforming units)
  /** Set LAM operating mode (only applies to LAM configuration) */
  setLAMMode: (mode: LAMMode) => void;
  /** Set QuadVee operating mode (only applies to QuadVee configuration) */
  setQuadVeeMode: (mode: QuadVeeMode) => void;

  // OmniMech-specific
  /** Set the number of heat sinks fixed to the base chassis */
  setBaseChassisHeatSinks: (count: number) => void;
  /** Remove all pod-mounted equipment, preserving fixed equipment */
  resetChassis: () => void;
  /** Set whether a specific equipment instance is pod-mounted */
  setEquipmentPodMounted: (instanceId: string, isPodMounted: boolean) => void;

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
  setJumpMP: (jumpMP: number) => void;
  setJumpJetType: (type: JumpJetType) => void;
  
  // Armor allocation
  setArmorTonnage: (tonnage: number) => void;
  setLocationArmor: (location: MechLocation, front: number, rear?: number) => void;
  autoAllocateArmor: () => void;
  maximizeArmor: () => void;
  clearAllArmor: () => void;
  
  // Equipment
  addEquipment: (item: IEquipmentItem) => string;
  removeEquipment: (instanceId: string) => void;
  updateEquipmentLocation: (instanceId: string, location: MechLocation, slots: readonly number[]) => void;
  bulkUpdateEquipmentLocations: (updates: ReadonlyArray<{ instanceId: string; location: MechLocation; slots: readonly number[] }>) => void;
  clearEquipmentLocation: (instanceId: string) => void;
  setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) => void;
  linkAmmo: (weaponInstanceId: string, ammoInstanceId: string | undefined) => void;
  clearAllEquipment: () => void;
  
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
  
  // Parse name into chassis and model if possible
  const nameParts = options.name.split(' ');
  const defaultChassis = nameParts[0] || 'New Mech';
  const defaultModel = nameParts.slice(1).join(' ') || '';
  
  return {
    // Identity (MegaMekLab format)
    id,
    name: options.name,
    chassis: defaultChassis,
    clanName: '',
    model: defaultModel,
    mulId: '-1', // -1 for custom units
    year: 3145, // Default to Dark Age era
    rulesLevel: RulesLevel.STANDARD,
    tonnage: options.tonnage,
    techBase: options.techBase,
    
    // Configuration
    unitType: UnitType.BATTLEMECH,
    configuration: MechConfiguration.BIPED,
    lamMode: LAMMode.MECH, // Default to Mech mode for LAMs
    quadVeeMode: QuadVeeMode.MECH, // Default to Mech mode for QuadVees
    isOmni: false,
    baseChassisHeatSinks: -1, // -1 = not set, use engine integral heat sinks
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
    jumpMP: 0,
    jumpJetType: JumpJetType.STANDARD,
    
    // Equipment
    equipment: [],
    
    // Metadata
    isModified: true,
    createdAt: now,
    lastModifiedAt: now,
  };
}

