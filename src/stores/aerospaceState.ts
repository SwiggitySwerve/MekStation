/**
 * Aerospace State Interface
 *
 * Defines the complete state for aerospace fighters and conventional fighters.
 * Parallels VehicleState but with aerospace-specific properties.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4.1
 */

import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  AerospaceCockpitType,
  IAerospaceMountedEquipment,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { EngineType } from '@/types/construction/EngineType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { IEquipmentItem } from '@/types/equipment';
import { generateUnitId as generateUUID } from '@/utils/uuid';

// =============================================================================
// Aerospace Armor Allocation
// =============================================================================

/**
 * Aerospace armor allocation by arc
 */
export interface IAerospaceArmorAllocation {
  /** Index signature for dynamic access */
  [key: string]: number;

  /** Nose armor points */
  [AerospaceLocation.NOSE]: number;
  /** Left wing armor points */
  [AerospaceLocation.LEFT_WING]: number;
  /** Right wing armor points */
  [AerospaceLocation.RIGHT_WING]: number;
  /** Aft armor points */
  [AerospaceLocation.AFT]: number;
}

/**
 * Create empty aerospace armor allocation
 */
export function createEmptyAerospaceArmorAllocation(): IAerospaceArmorAllocation {
  return {
    [AerospaceLocation.NOSE]: 0,
    [AerospaceLocation.LEFT_WING]: 0,
    [AerospaceLocation.RIGHT_WING]: 0,
    [AerospaceLocation.AFT]: 0,
  };
}

/**
 * Calculate total allocated aerospace armor
 */
export function getTotalAerospaceArmor(allocation: IAerospaceArmorAllocation): number {
  return (
    (allocation[AerospaceLocation.NOSE] || 0) +
    (allocation[AerospaceLocation.LEFT_WING] || 0) +
    (allocation[AerospaceLocation.RIGHT_WING] || 0) +
    (allocation[AerospaceLocation.AFT] || 0)
  );
}

// =============================================================================
// Aerospace Mounted Equipment
// =============================================================================

/**
 * Create mounted equipment instance for aerospace
 */
export function createAerospaceMountedEquipment(
  item: IEquipmentItem,
  instanceId: string,
  location?: AerospaceLocation
): IAerospaceMountedEquipment {
  return {
    id: instanceId,
    equipmentId: item.id,
    name: item.name,
    location: location ?? AerospaceLocation.NOSE,
    linkedAmmoId: undefined,
  };
}

// =============================================================================
// Aerospace State Interface
// =============================================================================

/**
 * Complete state for a single aerospace fighter
 */
export interface AerospaceState {
  // =========================================================================
  // Identity
  // =========================================================================

  /** Unique aerospace identifier */
  readonly id: string;

  /** Display name (chassis + variant) */
  name: string;

  /** Base chassis name */
  chassis: string;

  /** Model/variant designation */
  model: string;

  /** Master Unit List ID (-1 for custom) */
  mulId: string;

  /** Introduction year */
  year: number;

  /** Rules level */
  rulesLevel: RulesLevel;

  /** Aerospace tonnage (typically 5-100 tons) */
  tonnage: number;

  /** Weight class (derived from tonnage) */
  readonly weightClass: WeightClass;

  /** Tech base */
  readonly techBase: TechBase;

  // =========================================================================
  // Unit Type & Configuration
  // =========================================================================

  /** Unit type (Aerospace or Conventional Fighter) */
  readonly unitType: UnitType.AEROSPACE | UnitType.CONVENTIONAL_FIGHTER;

  /** Motion type (always Aerodyne for fighters) */
  motionType: AerospaceMotionType;

  /** Is this an OmniFighter */
  isOmni: boolean;

  // =========================================================================
  // Engine & Movement
  // =========================================================================

  /** Engine type */
  engineType: EngineType;

  /** Engine rating */
  engineRating: number;

  /** Safe thrust */
  safeThrust: number;

  /** Max thrust (safe * 1.5) */
  readonly maxThrust: number;

  /** Fuel points */
  fuel: number;

  // =========================================================================
  // Structure & Cockpit
  // =========================================================================

  /** Structural integrity */
  structuralIntegrity: number;

  /** Cockpit type */
  cockpitType: AerospaceCockpitType;

  /** Heat sinks (total, including engine integral) */
  heatSinks: number;

  /** Double heat sinks */
  doubleHeatSinks: boolean;

  // =========================================================================
  // Armor
  // =========================================================================

  /** Armor type */
  armorType: ArmorTypeEnum;

  /** Total armor tonnage allocated */
  armorTonnage: number;

  /** Per-arc armor allocation */
  armorAllocation: IAerospaceArmorAllocation;

  // =========================================================================
  // Special Features
  // =========================================================================

  /** Has bomb bay */
  hasBombBay: boolean;

  /** Bomb capacity (tons) */
  bombCapacity: number;

  /** Has reinforced cockpit */
  hasReinforcedCockpit: boolean;

  /** Has ejection seat */
  hasEjectionSeat: boolean;

  // =========================================================================
  // Equipment
  // =========================================================================

  /** Mounted equipment on the aerospace */
  equipment: readonly IAerospaceMountedEquipment[];

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
// Aerospace Store Actions
// =============================================================================

/**
 * Actions available on an aerospace store
 */
export interface AerospaceActions {
  // Identity
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setModel: (model: string) => void;
  setMulId: (mulId: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (rulesLevel: RulesLevel) => void;

  // Chassis
  setTonnage: (tonnage: number) => void;
  setIsOmni: (isOmni: boolean) => void;

  // Engine & Movement
  setEngineType: (type: EngineType) => void;
  setEngineRating: (rating: number) => void;
  setSafeThrust: (thrust: number) => void;
  setFuel: (fuel: number) => void;

  // Structure & Cockpit
  setStructuralIntegrity: (si: number) => void;
  setCockpitType: (type: AerospaceCockpitType) => void;
  setHeatSinks: (count: number) => void;
  setDoubleHeatSinks: (value: boolean) => void;

  // Armor
  setArmorType: (type: ArmorTypeEnum) => void;
  setArmorTonnage: (tonnage: number) => void;
  setArcArmor: (arc: AerospaceLocation, points: number) => void;
  autoAllocateArmor: () => void;
  clearAllArmor: () => void;

  // Special Features
  setHasBombBay: (value: boolean) => void;
  setBombCapacity: (capacity: number) => void;
  setReinforcedCockpit: (value: boolean) => void;
  setEjectionSeat: (value: boolean) => void;

  // Equipment
  addEquipment: (item: IEquipmentItem, arc?: AerospaceLocation) => string;
  removeEquipment: (instanceId: string) => void;
  updateEquipmentArc: (instanceId: string, arc: AerospaceLocation) => void;
  linkAmmo: (weaponInstanceId: string, ammoInstanceId: string | undefined) => void;
  clearAllEquipment: () => void;

  // Metadata
  markModified: (modified?: boolean) => void;
}

/**
 * Combined aerospace store type
 */
export type AerospaceStore = AerospaceState & AerospaceActions;

// =============================================================================
// Factory Helpers
// =============================================================================

/**
 * Options for creating a new aerospace unit
 */
export interface CreateAerospaceOptions {
  id?: string;
  name: string;
  tonnage: number;
  techBase: TechBase;
  isConventional?: boolean;
}

/**
 * Generate a unique aerospace ID
 */
export function generateAerospaceId(): string {
  return generateUUID();
}

/**
 * Determine weight class from tonnage for aerospace
 */
function getAerospaceWeightClass(tonnage: number): WeightClass {
  if (tonnage <= 19) return WeightClass.LIGHT;
  if (tonnage <= 39) return WeightClass.MEDIUM;
  if (tonnage <= 69) return WeightClass.HEAVY;
  return WeightClass.ASSAULT;
}

/**
 * Create default aerospace state
 */
export function createDefaultAerospaceState(options: CreateAerospaceOptions): AerospaceState {
  const id = options.id ?? generateAerospaceId();
  const now = Date.now();
  const isConventional = options.isConventional ?? false;

  // Default thrust: larger fighters have lower thrust
  const safeThrust = options.tonnage <= 30 ? 6 : options.tonnage <= 60 ? 5 : 4;

  // Default engine rating: tonnage * safe thrust
  const engineRating = options.tonnage * safeThrust;

  // Parse name into chassis and model
  const nameParts = options.name.split(' ');
  const defaultChassis = nameParts[0] || 'New Fighter';
  const defaultModel = nameParts.slice(1).join(' ') || '';

  return {
    // Identity
    id,
    name: options.name,
    chassis: defaultChassis,
    model: defaultModel,
    mulId: '-1',
    year: 3025,
    rulesLevel: RulesLevel.STANDARD,
    tonnage: options.tonnage,
    weightClass: getAerospaceWeightClass(options.tonnage),
    techBase: options.techBase,

    // Unit Type & Configuration
    unitType: isConventional ? UnitType.CONVENTIONAL_FIGHTER : UnitType.AEROSPACE,
    motionType: AerospaceMotionType.AERODYNE,
    isOmni: false,

    // Engine & Movement
    engineType: EngineType.STANDARD,
    engineRating,
    safeThrust,
    maxThrust: Math.floor(safeThrust * 1.5),
    fuel: options.tonnage * 5, // Default: 5 fuel points per ton

    // Structure & Cockpit
    structuralIntegrity: Math.ceil(options.tonnage / 10),
    cockpitType: AerospaceCockpitType.STANDARD,
    heatSinks: 10, // Default 10 heat sinks
    doubleHeatSinks: false,

    // Armor
    armorType: ArmorTypeEnum.STANDARD,
    armorTonnage: 0,
    armorAllocation: createEmptyAerospaceArmorAllocation(),

    // Special Features
    hasBombBay: false,
    bombCapacity: 0,
    hasReinforcedCockpit: false,
    hasEjectionSeat: true, // Most fighters have ejection seats

    // Equipment
    equipment: [],

    // Metadata
    isModified: true,
    createdAt: now,
    lastModifiedAt: now,
  };
}
