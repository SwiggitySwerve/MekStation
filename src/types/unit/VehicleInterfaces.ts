/**
 * Vehicle Unit Interfaces
 *
 * Defines interfaces for combat vehicles, VTOLs, and support vehicles.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.1
 */

import { UnitType } from './BattleMechInterfaces';
import { IGroundUnit, GroundMotionType } from './BaseUnitInterfaces';
import { VehicleLocation, VTOLLocation } from '../construction/UnitLocation';

// ============================================================================
// Turret Configuration
// ============================================================================

/**
 * Turret type enumeration
 */
export enum TurretType {
  NONE = 'None',
  SINGLE = 'Single',
  DUAL = 'Dual',
  CHIN = 'Chin',
  SPONSON_LEFT = 'Sponson Left',
  SPONSON_RIGHT = 'Sponson Right',
}

/**
 * Turret configuration
 */
export interface ITurretConfiguration {
  /** Type of turret */
  readonly type: TurretType;
  /** Maximum turret weight capacity */
  readonly maxWeight: number;
  /** Current turret weight usage */
  readonly currentWeight: number;
  /** Turret rotation arc (degrees, 0 for fixed) */
  readonly rotationArc: number;
}

// ============================================================================
// Vehicle Equipment
// ============================================================================

/**
 * Vehicle-mounted equipment item
 */
export interface IVehicleMountedEquipment {
  /** Unique mount ID */
  readonly id: string;
  /** Equipment definition ID */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Location where mounted */
  readonly location: VehicleLocation | VTOLLocation;
  /** Is this rear-facing */
  readonly isRearMounted: boolean;
  /** Is this turret-mounted */
  readonly isTurretMounted: boolean;
  /** Is this sponson-mounted */
  readonly isSponsonMounted: boolean;
  /** Linked ammunition ID */
  readonly linkedAmmoId?: string;
}

// ============================================================================
// Combat Vehicle Interface
// ============================================================================

/**
 * Interface for combat vehicles (tanks, APCs, etc.)
 */
export interface IVehicle extends IGroundUnit {
  readonly unitType: UnitType.VEHICLE;

  /** Motion type (Tracked, Wheeled, Hover, etc.) */
  readonly motionType: GroundMotionType;

  /** Turret configuration */
  readonly turret?: ITurretConfiguration;

  /** Secondary turret (for dual-turret vehicles) */
  readonly secondaryTurret?: ITurretConfiguration;

  /** Internal structure type code */
  readonly internalStructureType: number;

  /** Armor per location */
  readonly armorByLocation: Record<VehicleLocation, number>;

  /** Equipment mounted on this vehicle */
  readonly equipment: readonly IVehicleMountedEquipment[];

  // ===== Vehicle-Specific Options =====

  /** Is this a superheavy vehicle (>100 tons) */
  readonly isSuperheavy: boolean;

  /** Has environmental sealing */
  readonly hasEnvironmentalSealing: boolean;

  /** Has flotation hull */
  readonly hasFlotationHull: boolean;

  /** Has amphibious chassis */
  readonly isAmphibious: boolean;

  /** Has trailer hitch */
  readonly hasTrailerHitch: boolean;

  /** Is this a trailer (no engine) */
  readonly isTrailer: boolean;
}

// ============================================================================
// VTOL Interface
// ============================================================================

/**
 * Interface for VTOL (Vertical Take-Off and Landing) vehicles
 */
export interface IVTOL extends IGroundUnit {
  readonly unitType: UnitType.VTOL;

  /** Always VTOL motion type */
  readonly motionType: GroundMotionType.VTOL;

  /** Chin turret configuration */
  readonly chinTurret?: ITurretConfiguration;

  /** Rotor type */
  readonly rotorType: string;

  /** Rotor hits remaining (max 2) */
  readonly rotorHits: number;

  /** Armor per location (includes rotor) */
  readonly armorByLocation: Record<VTOLLocation, number>;

  /** Equipment mounted on this VTOL */
  readonly equipment: readonly IVehicleMountedEquipment[];
}

// ============================================================================
// Support Vehicle Interface
// ============================================================================

/**
 * Support vehicle size class
 */
export enum SupportVehicleSizeClass {
  SMALL = 'Small',
  MEDIUM = 'Medium',
  LARGE = 'Large',
}

/**
 * Interface for support vehicles (civilian/non-combat vehicles)
 */
export interface ISupportVehicle extends IGroundUnit {
  readonly unitType: UnitType.SUPPORT_VEHICLE;

  /** Motion type */
  readonly motionType: GroundMotionType;

  /** Size class */
  readonly sizeClass: SupportVehicleSizeClass;

  /** BAR (Barrier Armor Rating) - support vehicles use BAR instead of standard armor */
  readonly barRating: number;

  /** Structural tech rating */
  readonly structuralTechRating: number;

  /** Armor tech rating */
  readonly armorTechRating: number;

  /** Engine tech rating */
  readonly engineTechRating: number;

  /** Cargo capacity (tons) */
  readonly cargoCapacity: number;

  /** Crew size */
  readonly crewSize: number;

  /** Passenger capacity */
  readonly passengerCapacity: number;

  /** Equipment mounted on this vehicle */
  readonly equipment: readonly IVehicleMountedEquipment[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if unit is a combat vehicle
 */
export function isVehicle(unit: { unitType: UnitType }): unit is IVehicle {
  return unit.unitType === UnitType.VEHICLE;
}

/**
 * Check if unit is a VTOL
 */
export function isVTOL(unit: { unitType: UnitType }): unit is IVTOL {
  return unit.unitType === UnitType.VTOL;
}

/**
 * Check if unit is a support vehicle
 */
export function isSupportVehicle(unit: { unitType: UnitType }): unit is ISupportVehicle {
  return unit.unitType === UnitType.SUPPORT_VEHICLE;
}
