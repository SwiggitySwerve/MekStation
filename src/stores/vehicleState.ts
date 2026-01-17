/**
 * Vehicle State Interface
 *
 * Defines the complete state for a single vehicle (combat vehicle, VTOL, or support vehicle).
 * Parallels the UnitState interface for BattleMechs but with vehicle-specific properties.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.1
 */

import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  TurretType,
  ITurretConfiguration,
  IVehicleMountedEquipment,
} from '@/types/unit/VehicleInterfaces';
import { VehicleLocation, VTOLLocation } from '@/types/construction/UnitLocation';
import { EngineType } from '@/types/construction/EngineType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { IEquipmentItem } from '@/types/equipment';
import { generateUnitId as generateUUID } from '@/utils/uuid';

// =============================================================================
// Vehicle Armor Allocation
// =============================================================================

/**
 * Vehicle armor allocation by location
 */
export interface IVehicleArmorAllocation {
  /** Index signature for dynamic access */
  [key: string]: number;

  /** Front armor points */
  [VehicleLocation.FRONT]: number;
  /** Left side armor points */
  [VehicleLocation.LEFT]: number;
  /** Right side armor points */
  [VehicleLocation.RIGHT]: number;
  /** Rear armor points */
  [VehicleLocation.REAR]: number;
  /** Turret armor points (if turret exists) */
  [VehicleLocation.TURRET]: number;
  /** Body/internal armor points (for some vehicle types) */
  [VehicleLocation.BODY]: number;
}

/**
 * VTOL armor allocation (includes rotor)
 */
export interface IVTOLArmorAllocation extends IVehicleArmorAllocation {
  /** Rotor armor points (VTOL only) */
  [VTOLLocation.ROTOR]: number;
}

/**
 * Create empty vehicle armor allocation
 */
export function createEmptyVehicleArmorAllocation(): IVehicleArmorAllocation {
  return {
    [VehicleLocation.FRONT]: 0,
    [VehicleLocation.LEFT]: 0,
    [VehicleLocation.RIGHT]: 0,
    [VehicleLocation.REAR]: 0,
    [VehicleLocation.TURRET]: 0,
    [VehicleLocation.BODY]: 0,
  };
}

/**
 * Create empty VTOL armor allocation
 */
export function createEmptyVTOLArmorAllocation(): IVTOLArmorAllocation {
  return {
    ...createEmptyVehicleArmorAllocation(),
    [VTOLLocation.ROTOR]: 0,
  };
}

/**
 * Calculate total allocated vehicle armor
 */
export function getTotalVehicleArmor(
  allocation: IVehicleArmorAllocation,
  hasTurret: boolean = false
): number {
  let total =
    (allocation[VehicleLocation.FRONT] || 0) +
    (allocation[VehicleLocation.LEFT] || 0) +
    (allocation[VehicleLocation.RIGHT] || 0) +
    (allocation[VehicleLocation.REAR] || 0);

  if (hasTurret) {
    total += allocation[VehicleLocation.TURRET] || 0;
  }

  // Add rotor for VTOLs
  if (VTOLLocation.ROTOR in allocation) {
    total += (allocation as IVTOLArmorAllocation)[VTOLLocation.ROTOR] || 0;
  }

  return total;
}

// =============================================================================
// Vehicle Mounted Equipment
// =============================================================================

/**
 * Create mounted equipment instance for vehicles
 */
export function createVehicleMountedEquipment(
  item: IEquipmentItem,
  instanceId: string,
  location?: VehicleLocation | VTOLLocation,
  isTurretMounted: boolean = false
): IVehicleMountedEquipment {
  return {
    id: instanceId,
    equipmentId: item.id,
    name: item.name,
    location: location ?? VehicleLocation.BODY,
    isRearMounted: false,
    isTurretMounted,
    isSponsonMounted: false,
    linkedAmmoId: undefined,
  };
}

// =============================================================================
// Vehicle State Interface
// =============================================================================

/**
 * Complete state for a single vehicle
 */
export interface VehicleState {
  // =========================================================================
  // Identity
  // =========================================================================

  /** Unique vehicle identifier */
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

  /** Vehicle tonnage */
  tonnage: number;

  /** Weight class (derived from tonnage) */
  readonly weightClass: WeightClass;

  /** Tech base */
  readonly techBase: TechBase;

  // =========================================================================
  // Unit Type & Configuration
  // =========================================================================

  /** Unit type (Vehicle, VTOL, or Support Vehicle) */
  readonly unitType: UnitType.VEHICLE | UnitType.VTOL | UnitType.SUPPORT_VEHICLE;

  /** Motion type (Wheeled, Tracked, Hover, VTOL, etc.) */
  motionType: GroundMotionType;

  /** Is this an OmniVehicle */
  isOmni: boolean;

  // =========================================================================
  // Engine & Movement
  // =========================================================================

  /** Engine type */
  engineType: EngineType;

  /** Engine rating */
  engineRating: number;

  /** Cruise MP (walk equivalent) */
  cruiseMP: number;

  /** Flank MP (run equivalent) - derived from cruiseMP */
  readonly flankMP: number;

  // =========================================================================
  // Turret Configuration
  // =========================================================================

  /** Primary turret configuration (or null if no turret) */
  turret: ITurretConfiguration | null;

  /** Secondary turret (for dual-turret vehicles) */
  secondaryTurret: ITurretConfiguration | null;

  // =========================================================================
  // Armor
  // =========================================================================

  /** Armor type */
  armorType: ArmorTypeEnum;

  /** Total armor tonnage allocated */
  armorTonnage: number;

  /** Per-location armor allocation */
  armorAllocation: IVehicleArmorAllocation | IVTOLArmorAllocation;

  // =========================================================================
  // Special Features
  // =========================================================================

  /** Is this a superheavy vehicle (>100 tons) */
  isSuperheavy: boolean;

  /** Has environmental sealing */
  hasEnvironmentalSealing: boolean;

  /** Has flotation hull */
  hasFlotationHull: boolean;

  /** Is amphibious */
  isAmphibious: boolean;

  /** Has trailer hitch */
  hasTrailerHitch: boolean;

  /** Is this a trailer (no engine) */
  isTrailer: boolean;

  // =========================================================================
  // Equipment
  // =========================================================================

  /** Mounted equipment on the vehicle */
  equipment: readonly IVehicleMountedEquipment[];

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
// Vehicle Store Actions
// =============================================================================

/**
 * Actions available on a vehicle store
 */
export interface VehicleActions {
  // Identity
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setModel: (model: string) => void;
  setMulId: (mulId: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (rulesLevel: RulesLevel) => void;

  // Chassis
  setTonnage: (tonnage: number) => void;
  setMotionType: (motionType: GroundMotionType) => void;
  setIsOmni: (isOmni: boolean) => void;

  // Engine & Movement
  setEngineType: (type: EngineType) => void;
  setEngineRating: (rating: number) => void;
  setCruiseMP: (cruiseMP: number) => void;

  // Turret
  setTurretType: (type: TurretType) => void;
  setTurretWeight: (weight: number) => void;

  // Armor
  setArmorType: (type: ArmorTypeEnum) => void;
  setArmorTonnage: (tonnage: number) => void;
  setLocationArmor: (location: VehicleLocation | VTOLLocation, points: number) => void;
  autoAllocateArmor: () => void;
  clearAllArmor: () => void;

  // Special Features
  setEnvironmentalSealing: (value: boolean) => void;
  setFlotationHull: (value: boolean) => void;
  setAmphibious: (value: boolean) => void;
  setTrailerHitch: (value: boolean) => void;
  setIsTrailer: (value: boolean) => void;

  // Equipment
  addEquipment: (item: IEquipmentItem, location?: VehicleLocation | VTOLLocation, isTurretMounted?: boolean) => string;
  removeEquipment: (instanceId: string) => void;
  updateEquipmentLocation: (instanceId: string, location: VehicleLocation | VTOLLocation, isTurretMounted?: boolean) => void;
  setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) => void;
  linkAmmo: (weaponInstanceId: string, ammoInstanceId: string | undefined) => void;
  clearAllEquipment: () => void;

  // Metadata
  markModified: (modified?: boolean) => void;
}

/**
 * Combined vehicle store type
 */
export type VehicleStore = VehicleState & VehicleActions;

// =============================================================================
// Factory Helpers
// =============================================================================

/**
 * Options for creating a new vehicle
 */
export interface CreateVehicleOptions {
  id?: string;
  name: string;
  tonnage: number;
  techBase: TechBase;
  motionType?: GroundMotionType;
  unitType?: UnitType.VEHICLE | UnitType.VTOL | UnitType.SUPPORT_VEHICLE;
}

/**
 * Generate a unique vehicle ID
 */
export function generateVehicleId(): string {
  return generateUUID();
}

/**
 * Determine weight class from tonnage for vehicles
 */
function getVehicleWeightClass(tonnage: number): WeightClass {
  if (tonnage <= 19) return WeightClass.LIGHT;
  if (tonnage <= 39) return WeightClass.MEDIUM;
  if (tonnage <= 59) return WeightClass.HEAVY;
  if (tonnage <= 100) return WeightClass.ASSAULT;
  return WeightClass.SUPERHEAVY;
}

/**
 * Create default vehicle state
 */
export function createDefaultVehicleState(options: CreateVehicleOptions): VehicleState {
  const id = options.id ?? generateVehicleId();
  const now = Date.now();
  const motionType = options.motionType ?? GroundMotionType.TRACKED;
  const unitType = options.unitType ?? UnitType.VEHICLE;

  // Default engine rating: tonnage * 4 (for cruise MP 4)
  const cruiseMP = 4;
  const engineRating = options.tonnage * cruiseMP;

  // Parse name into chassis and model
  const nameParts = options.name.split(' ');
  const defaultChassis = nameParts[0] || 'New Vehicle';
  const defaultModel = nameParts.slice(1).join(' ') || '';

  // Determine if VTOL
  const isVTOL = unitType === UnitType.VTOL || motionType === GroundMotionType.VTOL;

  return {
    // Identity
    id,
    name: options.name,
    chassis: defaultChassis,
    model: defaultModel,
    mulId: '-1',
    year: 3145,
    rulesLevel: RulesLevel.STANDARD,
    tonnage: options.tonnage,
    weightClass: getVehicleWeightClass(options.tonnage),
    techBase: options.techBase,

    // Unit Type & Configuration
    unitType: isVTOL ? UnitType.VTOL : unitType,
    motionType: isVTOL ? GroundMotionType.VTOL : motionType,
    isOmni: false,

    // Engine & Movement
    engineType: EngineType.STANDARD,
    engineRating,
    cruiseMP,
    flankMP: Math.floor(cruiseMP * 1.5),

    // Turret
    turret: null,
    secondaryTurret: null,

    // Armor
    armorType: ArmorTypeEnum.STANDARD,
    armorTonnage: 0,
    armorAllocation: isVTOL
      ? createEmptyVTOLArmorAllocation()
      : createEmptyVehicleArmorAllocation(),

    // Special Features
    isSuperheavy: options.tonnage > 100,
    hasEnvironmentalSealing: false,
    hasFlotationHull: false,
    isAmphibious: false,
    hasTrailerHitch: false,
    isTrailer: false,

    // Equipment
    equipment: [],

    // Metadata
    isModified: true,
    createdAt: now,
    lastModifiedAt: now,
  };
}
