/**
 * Base Unit Interfaces
 *
 * Defines the hierarchical unit interface system for all MekStation unit types.
 * All units extend from IBaseUnit, with category-specific interfaces providing
 * shared properties for related unit types.
 *
 * Hierarchy:
 * - IBaseUnit (all units)
 *   - IGroundUnit (mechs, vehicles)
 *   - IAerospaceUnit (fighters, capital ships)
 *   - ISquadUnit (battle armor, infantry)
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.1
 */

import { IEntity, ITechBaseEntity, ITemporalEntity, IValuedComponent } from '../core';
import { Era, RulesLevel, TechBase, WeightClass } from '../enums';
import { UnitType, IUnitMetadata } from './BattleMechInterfaces';

// ============================================================================
// Base Unit Interface
// ============================================================================

/**
 * Base interface for all unit types
 *
 * All units in MekStation extend from IBaseUnit, providing common
 * identification, classification, and economic properties.
 */
export interface IBaseUnit extends IEntity, ITechBaseEntity, ITemporalEntity, IValuedComponent {
  /** Unit type discriminator for polymorphic handling */
  readonly unitType: UnitType;

  /** Unit tonnage/weight */
  readonly tonnage: number;

  /** Weight class classification */
  readonly weightClass: WeightClass;

  /** Unit metadata (chassis, model, year, etc.) */
  readonly metadata: IUnitMetadata;

  /** Source book reference */
  readonly source?: string;

  /** Combat role designation */
  readonly role?: string;

  /** Unit quirks */
  readonly quirks?: readonly string[];

  /** Fluff text */
  readonly fluff?: IUnitFluff;

  // ===== Calculated Values =====

  /** Total weight used by all components */
  readonly totalWeight: number;

  /** Remaining available tonnage */
  readonly remainingTonnage: number;

  /** Whether the unit passes all validation rules */
  readonly isValid: boolean;

  /** List of validation errors */
  readonly validationErrors: readonly string[];
}

/**
 * Unit fluff/background text
 */
export interface IUnitFluff {
  readonly overview?: string;
  readonly capabilities?: string;
  readonly deployment?: string;
  readonly history?: string;
  readonly manufacturer?: string;
  readonly primaryFactory?: string;
  readonly systemManufacturer?: ISystemManufacturer;
}

/**
 * System manufacturer details
 */
export interface ISystemManufacturer {
  readonly chassis?: string;
  readonly engine?: string;
  readonly armor?: string;
  readonly jumpJets?: string;
  readonly communications?: string;
  readonly targetingAndTracking?: string;
}

// ============================================================================
// Ground Unit Interface
// ============================================================================

/**
 * Motion type for ground vehicles
 */
export enum GroundMotionType {
  TRACKED = 'Tracked',
  WHEELED = 'Wheeled',
  HOVER = 'Hover',
  VTOL = 'VTOL',
  NAVAL = 'Naval',
  HYDROFOIL = 'Hydrofoil',
  SUBMARINE = 'Submarine',
  WIGE = 'WiGE',
  RAIL = 'Rail',
  MAGLEV = 'Maglev',
}

/**
 * Ground unit movement configuration
 */
export interface IGroundMovement {
  /** Cruise/walk MP */
  readonly cruiseMP: number;
  /** Flank/run MP (typically cruise * 1.5) */
  readonly flankMP: number;
  /** Jump MP (0 if no jump capability) */
  readonly jumpMP: number;
}

/**
 * Interface for ground-based units (Mechs and Vehicles)
 *
 * Provides shared properties for units that operate on the ground,
 * including movement, engine, and armor systems.
 */
export interface IGroundUnit extends IBaseUnit {
  /** Engine type code */
  readonly engineType: number;

  /** Engine rating */
  readonly engineRating: number;

  /** Movement configuration */
  readonly movement: IGroundMovement;

  /** Armor type code */
  readonly armorType: number;

  /** Armor allocation per location */
  readonly armor: readonly number[];

  /** Total armor points */
  readonly totalArmorPoints: number;

  /** Maximum armor points for this tonnage */
  readonly maxArmorPoints: number;
}

// ============================================================================
// Aerospace Unit Interface
// ============================================================================

/**
 * Aerospace motion type
 */
export enum AerospaceMotionType {
  AERODYNE = 'Aerodyne',
  SPHEROID = 'Spheroid',
}

/**
 * Aerospace movement configuration
 */
export interface IAerospaceMovement {
  /** Safe thrust rating */
  readonly safeThrust: number;
  /** Maximum thrust rating (safe * 1.5) */
  readonly maxThrust: number;
}

/**
 * Interface for aerospace units (Fighters and Capital Ships)
 *
 * Provides shared properties for units that operate in space,
 * including thrust, fuel, and structural integrity.
 */
export interface IAerospaceUnit extends IBaseUnit {
  /** Aerospace motion type */
  readonly motionType: AerospaceMotionType;

  /** Movement/thrust configuration */
  readonly movement: IAerospaceMovement;

  /** Fuel points */
  readonly fuel: number;

  /** Structural integrity */
  readonly structuralIntegrity: number;

  /** Heat sinks count */
  readonly heatSinks: number;

  /** Heat sink type (0 = single, 1 = double) */
  readonly heatSinkType: number;

  /** Engine type code */
  readonly engineType: number;

  /** Armor type code */
  readonly armorType: number;

  /** Armor allocation per arc/location */
  readonly armor: readonly number[];

  /** Total armor points */
  readonly totalArmorPoints: number;
}

// ============================================================================
// Squad Unit Interface
// ============================================================================

/**
 * Squad motion type
 */
export enum SquadMotionType {
  FOOT = 'Foot',
  JUMP = 'Jump',
  MOTORIZED = 'Motorized',
  MECHANIZED = 'Mechanized',
  WHEELED = 'Wheeled',
  TRACKED = 'Tracked',
  HOVER = 'Hover',
  VTOL = 'VTOL',
  UMU = 'UMU',
  BEAST = 'Beast',
}

/**
 * Squad movement configuration
 */
export interface ISquadMovement {
  /** Ground MP */
  readonly groundMP: number;
  /** Jump MP (0 if no jump capability) */
  readonly jumpMP: number;
  /** UMU/swimming MP (0 if no aquatic capability) */
  readonly umuMP: number;
}

/**
 * Interface for squad-based units (Battle Armor and Infantry)
 *
 * Provides shared properties for units composed of multiple
 * soldiers/troopers operating as a squad.
 */
export interface ISquadUnit extends IBaseUnit {
  /** Motion type for the squad */
  readonly motionType: SquadMotionType;

  /** Movement configuration */
  readonly movement: ISquadMovement;

  /** Squad size (number of soldiers/troopers) */
  readonly squadSize: number;

  /** Armor per trooper/soldier */
  readonly armorPerTrooper: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if unit is a ground unit
 */
export function isGroundUnit(unit: IBaseUnit): unit is IGroundUnit {
  return (
    unit.unitType === UnitType.BATTLEMECH ||
    unit.unitType === UnitType.OMNIMECH ||
    unit.unitType === UnitType.INDUSTRIALMECH ||
    unit.unitType === UnitType.VEHICLE ||
    unit.unitType === UnitType.VTOL ||
    unit.unitType === UnitType.SUPPORT_VEHICLE
  );
}

/**
 * Check if unit is an aerospace unit
 */
export function isAerospaceUnit(unit: IBaseUnit): unit is IAerospaceUnit {
  return (
    unit.unitType === UnitType.AEROSPACE ||
    unit.unitType === UnitType.CONVENTIONAL_FIGHTER ||
    unit.unitType === UnitType.SMALL_CRAFT ||
    unit.unitType === UnitType.DROPSHIP ||
    unit.unitType === UnitType.JUMPSHIP ||
    unit.unitType === UnitType.WARSHIP ||
    unit.unitType === UnitType.SPACE_STATION
  );
}

/**
 * Check if unit is a squad unit
 */
export function isSquadUnit(unit: IBaseUnit): unit is ISquadUnit {
  return (
    unit.unitType === UnitType.BATTLE_ARMOR ||
    unit.unitType === UnitType.INFANTRY
  );
}

/**
 * Check if unit is a mech (BattleMech, OmniMech, IndustrialMech)
 */
export function isMechUnit(unit: IBaseUnit): boolean {
  return (
    unit.unitType === UnitType.BATTLEMECH ||
    unit.unitType === UnitType.OMNIMECH ||
    unit.unitType === UnitType.INDUSTRIALMECH
  );
}

/**
 * Check if unit is a vehicle (Vehicle, VTOL, Support Vehicle)
 */
export function isVehicleUnit(unit: IBaseUnit): boolean {
  return (
    unit.unitType === UnitType.VEHICLE ||
    unit.unitType === UnitType.VTOL ||
    unit.unitType === UnitType.SUPPORT_VEHICLE
  );
}

/**
 * Check if unit is a capital ship (DropShip, JumpShip, WarShip, Space Station)
 */
export function isCapitalShipUnit(unit: IBaseUnit): boolean {
  return (
    unit.unitType === UnitType.DROPSHIP ||
    unit.unitType === UnitType.JUMPSHIP ||
    unit.unitType === UnitType.WARSHIP ||
    unit.unitType === UnitType.SPACE_STATION
  );
}
