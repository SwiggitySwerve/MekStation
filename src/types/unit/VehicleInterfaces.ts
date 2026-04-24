/**
 * Vehicle Unit Interfaces
 *
 * Defines interfaces for combat vehicles, VTOLs, and support vehicles.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.1
 */

import { VehicleLocation, VTOLLocation } from '../construction/UnitLocation';
import { IGroundUnit, GroundMotionType } from './BaseUnitInterfaces';
import { UnitType } from './BattleMechInterfaces';

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

  /**
   * Last-computed BV 2.0 breakdown for this combat vehicle.
   *
   * Populated by the vehicle BV path (see {@link calculateVehicleBV}) and
   * persisted on the unit so status bars, force-level tools, and the parity
   * harness can read the breakdown without recomputing. Optional because
   * legacy fixtures and freshly-parsed units may not yet have a breakdown
   * attached.
   *
   * @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
   *       — Requirement: Vehicle BV Breakdown on Unit State
   */
  readonly bvBreakdown?: import('@/utils/construction/vehicle/vehicleBV').IVehicleBVBreakdown;
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

  /**
   * Last-computed BV 2.0 breakdown for this VTOL.
   *
   * @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
   *       — Requirement: Vehicle BV Breakdown on Unit State
   */
  readonly bvBreakdown?: import('@/utils/construction/vehicle/vehicleBV').IVehicleBVBreakdown;
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

  /**
   * Last-computed BV 2.0 breakdown for this support vehicle.
   *
   * @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
   *       — Requirement: Vehicle BV Breakdown on Unit State
   */
  readonly bvBreakdown?: import('@/utils/construction/vehicle/vehicleBV').IVehicleBVBreakdown;
}

// ============================================================================
// Vehicle Unit Discriminated Union
// ============================================================================

/**
 * Canonical vehicle unit shape across all three vehicle subtypes.
 *
 * The BV dispatcher (`calculateBattleValueForUnit`) and per-unit consumers
 * (status bars, force-level tools, the parity harness) accept any of the
 * three vehicle interfaces, so we publish them under a single discriminated
 * union and narrow on `unitType`.
 *
 * Each member carries an optional `bvBreakdown` populated by the vehicle BV
 * calculator. The optionality matches BattleArmor / ProtoMech / Infantry —
 * legacy fixtures may not have a breakdown attached until the calculator
 * runs against them.
 *
 * @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
 *       — Requirement: Vehicle BV Breakdown on Unit State
 * @spec openspec/changes/add-vehicle-battle-value/specs/battle-value-system/spec.md
 *       — Requirement: Vehicle BV Dispatch
 */
export type IVehicleUnit = IVehicle | IVTOL | ISupportVehicle;

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
export function isSupportVehicle(unit: {
  unitType: UnitType;
}): unit is ISupportVehicle {
  return unit.unitType === UnitType.SUPPORT_VEHICLE;
}

/**
 * Narrowing type guard for the {@link IVehicleUnit} discriminated union.
 *
 * Returns `true` when the candidate carries a vehicle-class `unitType`
 * (`VEHICLE`, `VTOL`, or `SUPPORT_VEHICLE`). Callers that hold a generic
 * `{ unitType }` reference can use this to narrow into the union before
 * routing to the vehicle BV calculator.
 */
export function isVehicleUnitShape(unit: {
  unitType: UnitType;
}): unit is IVehicleUnit {
  return (
    unit.unitType === UnitType.VEHICLE ||
    unit.unitType === UnitType.VTOL ||
    unit.unitType === UnitType.SUPPORT_VEHICLE
  );
}
