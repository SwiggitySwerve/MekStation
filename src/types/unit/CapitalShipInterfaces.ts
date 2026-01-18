/**
 * Capital Ship Interfaces
 *
 * Defines interfaces for DropShips, JumpShips, WarShips, and Space Stations.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.1
 */

import { UnitType } from './BattleMechInterfaces';
import { IAerospaceUnit, AerospaceMotionType } from './BaseUnitInterfaces';

// ============================================================================
// Transporter/Bay Definitions
// ============================================================================

/**
 * Transporter bay type
 */
export enum BayType {
  MECH = 'Mech',
  VEHICLE = 'Vehicle',
  INFANTRY = 'Infantry',
  BATTLE_ARMOR = 'Battle Armor',
  FIGHTER = 'Fighter',
  SMALL_CRAFT = 'Small Craft',
  DROPSHIP = 'DropShip',
  CARGO = 'Cargo',
  LIQUID_CARGO = 'Liquid Cargo',
  LIVESTOCK = 'Livestock',
  REFUGEE = 'Refugee',
  PRISON = 'Prison',
}

/**
 * Transport bay configuration
 */
export interface ITransportBay {
  /** Bay type */
  readonly type: BayType;
  /** Capacity (units or tons for cargo) */
  readonly capacity: number;
  /** Number of doors */
  readonly doors: number;
  /** Bay number */
  readonly bayNumber: number;
}

/**
 * Crew quarters type
 */
export enum QuartersType {
  FIRST_CLASS = 'First Class',
  SECOND_CLASS = 'Second Class',
  STEERAGE = 'Steerage',
  CREW = 'Crew',
}

/**
 * Crew quarters configuration
 */
export interface ICrewQuarters {
  /** Quarters type */
  readonly type: QuartersType;
  /** Capacity (personnel) */
  readonly capacity: number;
}

// ============================================================================
// Capital Ship Equipment
// ============================================================================

/**
 * Capital weapon arc
 */
export enum CapitalArc {
  NOSE = 'Nose',
  FRONT_LEFT = 'FL',
  FRONT_RIGHT = 'FR',
  AFT_LEFT = 'AL',
  AFT_RIGHT = 'AR',
  AFT = 'Aft',
  LEFT_BROADSIDE = 'LBS',
  RIGHT_BROADSIDE = 'RBS',
}

/**
 * Capital ship-mounted equipment item
 */
export interface ICapitalMountedEquipment {
  /** Unique mount ID */
  readonly id: string;
  /** Equipment definition ID */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Firing arc */
  readonly arc: CapitalArc;
  /** Is this a capital-scale weapon */
  readonly isCapital: boolean;
  /** Weapon bay grouping */
  readonly bayGroup?: string;
  /** Linked ammunition ID */
  readonly linkedAmmoId?: string;
}

// ============================================================================
// Crew Configuration
// ============================================================================

/**
 * Capital ship crew configuration
 */
export interface ICapitalCrewConfiguration {
  /** Total crew */
  readonly crew: number;
  /** Officers */
  readonly officers: number;
  /** Gunners */
  readonly gunners: number;
  /** Pilots/navigators */
  readonly pilots: number;
  /** Marines */
  readonly marines: number;
  /** Battle armor complement */
  readonly battleArmor: number;
  /** Passengers */
  readonly passengers: number;
  /** Other personnel */
  readonly other: number;
}

// ============================================================================
// DropShip Interface
// ============================================================================

/**
 * DropShip design type
 */
export enum DropShipDesignType {
  MILITARY = 'Military',
  CIVILIAN = 'Civilian',
}

/**
 * Interface for DropShips
 */
export interface IDropShip extends IAerospaceUnit {
  readonly unitType: UnitType.DROPSHIP;

  /** Motion type (aerodyne or spheroid) */
  readonly motionType: AerospaceMotionType;

  /** Design type */
  readonly designType: DropShipDesignType;

  /** Docking collar present */
  readonly hasDockingCollar: boolean;

  /** Armor per arc */
  readonly armorByArc: {
    readonly nose: number;
    readonly frontLeftSide: number;
    readonly frontRightSide: number;
    readonly aftLeftSide: number;
    readonly aftRightSide: number;
    readonly aft: number;
  };

  /** Equipment mounted by firing arc */
  readonly equipment: readonly ICapitalMountedEquipment[];

  /** Transport bays */
  readonly transportBays: readonly ITransportBay[];

  /** Crew quarters */
  readonly quarters: readonly ICrewQuarters[];

  /** Crew configuration */
  readonly crewConfiguration: ICapitalCrewConfiguration;

  /** Escape pods */
  readonly escapePods: number;

  /** Life boats */
  readonly lifeBoats: number;
}

// ============================================================================
// JumpShip Interface
// ============================================================================

/**
 * K-F Drive type
 */
export enum KFDriveType {
  STANDARD = 'Standard',
  COMPACT = 'Compact',
}

/**
 * Interface for JumpShips
 */
export interface IJumpShip extends IAerospaceUnit {
  readonly unitType: UnitType.JUMPSHIP;

  /** Always spheroid */
  readonly motionType: AerospaceMotionType.SPHEROID;

  /** K-F Drive type */
  readonly kfDriveType: KFDriveType;

  /** Has Lithium-Fusion battery */
  readonly hasLFBattery: boolean;

  /** Sail area (square meters) */
  readonly sailArea: number;

  /** Jump range (light years) */
  readonly jumpRange: number;

  /** Docking hardpoints */
  readonly dockingHardpoints: number;

  /** Armor per arc */
  readonly armorByArc: {
    readonly nose: number;
    readonly frontLeftSide: number;
    readonly frontRightSide: number;
    readonly aftLeftSide: number;
    readonly aftRightSide: number;
    readonly aft: number;
  };

  /** Equipment mounted by firing arc */
  readonly equipment: readonly ICapitalMountedEquipment[];

  /** Transport bays */
  readonly transportBays: readonly ITransportBay[];

  /** Crew quarters */
  readonly quarters: readonly ICrewQuarters[];

  /** Crew configuration */
  readonly crewConfiguration: ICapitalCrewConfiguration;

  /** Escape pods */
  readonly escapePods: number;

  /** Life boats */
  readonly lifeBoats: number;

  /** Has HPG */
  readonly hasHPG: boolean;

  /** HPG class (A, B, or none) */
  readonly hpgClass?: string;
}

// ============================================================================
// WarShip Interface
// ============================================================================

/**
 * Gravity deck configuration
 */
export interface IGravityDeck {
  /** Deck size (large or standard) */
  readonly size: 'Large' | 'Standard';
  /** Deck capacity (crew accommodated) */
  readonly capacity: number;
}

/**
 * Interface for WarShips
 */
export interface IWarShip extends IAerospaceUnit {
  readonly unitType: UnitType.WARSHIP;

  /** Always spheroid */
  readonly motionType: AerospaceMotionType.SPHEROID;

  /** K-F Drive type */
  readonly kfDriveType: KFDriveType;

  /** Has Lithium-Fusion battery */
  readonly hasLFBattery: boolean;

  /** Sail area (square meters) */
  readonly sailArea: number;

  /** Jump range (light years) */
  readonly jumpRange: number;

  /** Docking hardpoints */
  readonly dockingHardpoints: number;

  /** Gravity decks */
  readonly gravityDecks: readonly IGravityDeck[];

  /** Armor per arc (including broadsides) */
  readonly armorByArc: {
    readonly nose: number;
    readonly frontLeftSide: number;
    readonly frontRightSide: number;
    readonly aftLeftSide: number;
    readonly aftRightSide: number;
    readonly aft: number;
    readonly leftBroadside?: number;
    readonly rightBroadside?: number;
  };

  /** Equipment mounted by firing arc */
  readonly equipment: readonly ICapitalMountedEquipment[];

  /** Transport bays */
  readonly transportBays: readonly ITransportBay[];

  /** Crew quarters */
  readonly quarters: readonly ICrewQuarters[];

  /** Crew configuration */
  readonly crewConfiguration: ICapitalCrewConfiguration;

  /** Escape pods */
  readonly escapePods: number;

  /** Life boats */
  readonly lifeBoats: number;

  /** Has HPG */
  readonly hasHPG: boolean;

  /** HPG class */
  readonly hpgClass?: string;
}

// ============================================================================
// Space Station Interface
// ============================================================================

/**
 * Interface for Space Stations
 */
export interface ISpaceStation extends IAerospaceUnit {
  readonly unitType: UnitType.SPACE_STATION;

  /** Always spheroid */
  readonly motionType: AerospaceMotionType.SPHEROID;

  /** Station has no drive - SI represents hull integrity */
  readonly hullIntegrity: number;

  /** Docking hardpoints */
  readonly dockingHardpoints: number;

  /** Gravity decks */
  readonly gravityDecks: readonly IGravityDeck[];

  /** Armor per arc */
  readonly armorByArc: {
    readonly nose: number;
    readonly frontLeftSide: number;
    readonly frontRightSide: number;
    readonly aftLeftSide: number;
    readonly aftRightSide: number;
    readonly aft: number;
  };

  /** Equipment mounted by firing arc */
  readonly equipment: readonly ICapitalMountedEquipment[];

  /** Transport bays */
  readonly transportBays: readonly ITransportBay[];

  /** Crew quarters */
  readonly quarters: readonly ICrewQuarters[];

  /** Crew configuration */
  readonly crewConfiguration: ICapitalCrewConfiguration;

  /** Escape pods */
  readonly escapePods: number;

  /** Life boats */
  readonly lifeBoats: number;

  /** Has HPG */
  readonly hasHPG: boolean;

  /** HPG class */
  readonly hpgClass?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if unit is a DropShip
 */
export function isDropShip(unit: { unitType: UnitType }): unit is IDropShip {
  return unit.unitType === UnitType.DROPSHIP;
}

/**
 * Check if unit is a JumpShip
 */
export function isJumpShip(unit: { unitType: UnitType }): unit is IJumpShip {
  return unit.unitType === UnitType.JUMPSHIP;
}

/**
 * Check if unit is a WarShip
 */
export function isWarShip(unit: { unitType: UnitType }): unit is IWarShip {
  return unit.unitType === UnitType.WARSHIP;
}

/**
 * Check if unit is a Space Station
 */
export function isSpaceStation(unit: { unitType: UnitType }): unit is ISpaceStation {
  return unit.unitType === UnitType.SPACE_STATION;
}

/**
 * Check if unit is any capital ship type
 */
export function isCapitalShip(
  unit: { unitType: UnitType }
): unit is IDropShip | IJumpShip | IWarShip | ISpaceStation {
  return (
    unit.unitType === UnitType.DROPSHIP ||
    unit.unitType === UnitType.JUMPSHIP ||
    unit.unitType === UnitType.WARSHIP ||
    unit.unitType === UnitType.SPACE_STATION
  );
}
