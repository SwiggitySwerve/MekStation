/**
 * Unit State Interface
 *
 * Defines the complete state for a single unit.
 * This is the shape of data stored in each isolated unit store.
 *
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { IArmorAllocation } from '@/types/construction/ArmorAllocation';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  LAMMode,
  QuadVeeMode,
} from '@/types/construction/MechConfigurationSystem';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import {
  TechBaseMode,
  IComponentTechBases,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { IEquipmentItem } from '@/types/equipment';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  getMaxTotalArmor,
  calculateArmorWeight,
  calculateArmorPoints,
  calculateOptimalArmorAllocation,
  ArmorAllocationResult,
} from '@/utils/construction/armorCalculations';
import { JumpJetType } from '@/utils/construction/movementCalculations';
import { generateUnitId as generateUUID } from '@/utils/uuid';

// =============================================================================
// Armor Allocation Types
// =============================================================================

/**
 * Convert ArmorAllocationResult from calculation utility to IArmorAllocation format
 * Maps the flat result structure to the keyed interface used in unit state
 */
export function armorResultToAllocation(
  result: ArmorAllocationResult,
): IArmorAllocation {
  return {
    // Universal locations
    [MechLocation.HEAD]: result.head,
    [MechLocation.CENTER_TORSO]: result.centerTorsoFront,
    centerTorsoRear: result.centerTorsoRear,
    [MechLocation.LEFT_TORSO]: result.leftTorsoFront,
    leftTorsoRear: result.leftTorsoRear,
    [MechLocation.RIGHT_TORSO]: result.rightTorsoFront,
    rightTorsoRear: result.rightTorsoRear,
    // Biped/Tripod/LAM locations
    [MechLocation.LEFT_ARM]: result.leftArm,
    [MechLocation.RIGHT_ARM]: result.rightArm,
    [MechLocation.LEFT_LEG]: result.leftLeg,
    [MechLocation.RIGHT_LEG]: result.rightLeg,
    // Tripod-specific
    [MechLocation.CENTER_LEG]: result.centerLeg,
    // Quad/QuadVee-specific
    [MechLocation.FRONT_LEFT_LEG]: result.frontLeftLeg,
    [MechLocation.FRONT_RIGHT_LEG]: result.frontRightLeg,
    [MechLocation.REAR_LEFT_LEG]: result.rearLeftLeg,
    [MechLocation.REAR_RIGHT_LEG]: result.rearRightLeg,
  };
}

/**
 * Calculate total allocated armor points from allocation based on configuration
 * Uses the configuration to determine which locations to include
 */
export function getTotalAllocatedArmor(
  allocation: IArmorAllocation,
  configuration?: MechConfiguration,
): number {
  // Core torso armor (always included)
  let total =
    (allocation[MechLocation.HEAD] || 0) +
    (allocation[MechLocation.CENTER_TORSO] || 0) +
    (allocation.centerTorsoRear || 0) +
    (allocation[MechLocation.LEFT_TORSO] || 0) +
    (allocation.leftTorsoRear || 0) +
    (allocation[MechLocation.RIGHT_TORSO] || 0) +
    (allocation.rightTorsoRear || 0);

  // Add limb armor based on configuration
  if (
    configuration === MechConfiguration.QUAD ||
    configuration === MechConfiguration.QUADVEE
  ) {
    // Quad mechs have 4 legs, no arms
    total +=
      (allocation[MechLocation.FRONT_LEFT_LEG] || 0) +
      (allocation[MechLocation.FRONT_RIGHT_LEG] || 0) +
      (allocation[MechLocation.REAR_LEFT_LEG] || 0) +
      (allocation[MechLocation.REAR_RIGHT_LEG] || 0);
  } else if (configuration === MechConfiguration.TRIPOD) {
    // Tripod has arms + 3 legs (including center leg)
    total +=
      (allocation[MechLocation.LEFT_ARM] || 0) +
      (allocation[MechLocation.RIGHT_ARM] || 0) +
      (allocation[MechLocation.LEFT_LEG] || 0) +
      (allocation[MechLocation.RIGHT_LEG] || 0) +
      (allocation[MechLocation.CENTER_LEG] || 0);
  } else {
    // Biped/LAM/default: standard arms + legs
    total +=
      (allocation[MechLocation.LEFT_ARM] || 0) +
      (allocation[MechLocation.RIGHT_ARM] || 0) +
      (allocation[MechLocation.LEFT_LEG] || 0) +
      (allocation[MechLocation.RIGHT_LEG] || 0);
  }

  return total;
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
  setComponentTechBase: (
    component: keyof IComponentTechBases,
    techBase: TechBase,
  ) => void;
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
  setLocationArmor: (
    location: MechLocation,
    front: number,
    rear?: number,
  ) => void;
  autoAllocateArmor: () => void;
  maximizeArmor: () => void;
  clearAllArmor: () => void;

  // Equipment
  addEquipment: (item: IEquipmentItem) => string;
  removeEquipment: (instanceId: string) => void;
  updateEquipmentLocation: (
    instanceId: string,
    location: MechLocation,
    slots: readonly number[],
  ) => void;
  bulkUpdateEquipmentLocations: (
    updates: ReadonlyArray<{
      instanceId: string;
      location: MechLocation;
      slots: readonly number[];
    }>,
  ) => void;
  clearEquipmentLocation: (instanceId: string) => void;
  setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) => void;
  linkAmmo: (
    weaponInstanceId: string,
    ammoInstanceId: string | undefined,
  ) => void;
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
 * Default armor percentage for new units (70% of max)
 */
const DEFAULT_ARMOR_PERCENTAGE = 0.7;

/**
 * Create default unit state
 */
export function createDefaultUnitState(options: CreateUnitOptions): UnitState {
  const id = options.id ?? generateUnitId();
  const now = Date.now();
  const walkMP = options.walkMP ?? 4;
  const engineRating = options.tonnage * walkMP;
  const techBaseMode: TechBaseMode =
    options.techBase === TechBase.CLAN
      ? TechBaseMode.CLAN
      : TechBaseMode.INNER_SPHERE;

  // Parse name into chassis and model if possible
  const nameParts = options.name.split(' ');
  const defaultChassis = nameParts[0] || 'New Mech';
  const defaultModel = nameParts.slice(1).join(' ') || '';

  // Calculate default armor (70% of max, optimally allocated)
  const configuration = MechConfiguration.BIPED; // Default configuration
  const maxArmorPoints = getMaxTotalArmor(options.tonnage, configuration);
  const targetArmorPoints = Math.floor(
    maxArmorPoints * DEFAULT_ARMOR_PERCENTAGE,
  );
  const armorTonnage = calculateArmorWeight(
    targetArmorPoints,
    ArmorTypeEnum.STANDARD,
  );
  const actualArmorPoints = calculateArmorPoints(
    armorTonnage,
    ArmorTypeEnum.STANDARD,
  );
  const allocationResult = calculateOptimalArmorAllocation(
    actualArmorPoints,
    options.tonnage,
    configuration,
  );
  const armorAllocation = armorResultToAllocation(allocationResult);

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
    configuration,
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
    armorTonnage,
    armorAllocation,
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
