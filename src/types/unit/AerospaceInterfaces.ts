/**
 * Aerospace Unit Interfaces
 *
 * Defines interfaces for aerospace fighters, conventional fighters, and small craft.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.1
 */

import { AerospaceLocation } from '../construction/UnitLocation';
import { IAerospaceUnit, AerospaceMotionType } from './BaseUnitInterfaces';
import { UnitType } from './BattleMechInterfaces';

// ============================================================================
// Aerospace Equipment
// ============================================================================

/**
 * Aerospace-mounted equipment item
 */
export interface IAerospaceMountedEquipment {
  /** Unique mount ID */
  readonly id: string;
  /** Equipment definition ID */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Firing arc/location */
  readonly location: AerospaceLocation;
  /** Linked ammunition ID */
  readonly linkedAmmoId?: string;
}

// ============================================================================
// Aerospace Fighter Interface
// ============================================================================

/**
 * Cockpit type for aerospace fighters
 */
export enum AerospaceCockpitType {
  STANDARD = 'Standard',
  SMALL = 'Small',
  PRIMITIVE = 'Primitive',
  COMMAND_CONSOLE = 'Command Console',
}

/**
 * Interface for aerospace fighters (ASF)
 */
export interface IAerospace extends IAerospaceUnit {
  readonly unitType: UnitType.AEROSPACE;

  /** Always aerodyne for ASF */
  readonly motionType: AerospaceMotionType.AERODYNE;

  /** Cockpit type */
  readonly cockpitType: AerospaceCockpitType;

  /** Armor per arc */
  readonly armorByArc: {
    readonly nose: number;
    readonly leftWing: number;
    readonly rightWing: number;
    readonly aft: number;
  };

  /** Equipment mounted by firing arc */
  readonly equipment: readonly IAerospaceMountedEquipment[];

  // ===== ASF-Specific Options =====

  /** Has bomb bay */
  readonly hasBombBay: boolean;

  /** Bomb capacity (tons) */
  readonly bombCapacity: number;

  /** Current bomb load */
  readonly bombs: readonly string[];

  /** Has reinforced cockpit */
  readonly hasReinforcedCockpit: boolean;

  /** Has ejection seat */
  readonly hasEjectionSeat: boolean;
}

// ============================================================================
// Conventional Fighter Interface
// ============================================================================

/**
 * Conventional fighter engine type
 */
export enum ConventionalFighterEngineType {
  ICE = 'ICE',
  FUEL_CELL = 'Fuel Cell',
  ELECTRIC = 'Electric',
  MAGLEV = 'MagLev',
  SOLAR = 'Solar',
  FISSION = 'Fission',
  FUSION = 'Fusion',
}

/**
 * Interface for conventional fighters (non-fusion aerospace)
 */
export interface IConventionalFighter extends IAerospaceUnit {
  readonly unitType: UnitType.CONVENTIONAL_FIGHTER;

  /** Always aerodyne */
  readonly motionType: AerospaceMotionType.AERODYNE;

  /** Engine type (non-fusion) */
  readonly conventionalEngineType: ConventionalFighterEngineType;

  /** Cockpit type */
  readonly cockpitType: AerospaceCockpitType;

  /** Armor per arc */
  readonly armorByArc: {
    readonly nose: number;
    readonly leftWing: number;
    readonly rightWing: number;
    readonly aft: number;
  };

  /** Equipment mounted by firing arc */
  readonly equipment: readonly IAerospaceMountedEquipment[];

  /** Has bomb bay */
  readonly hasBombBay: boolean;

  /** Bomb capacity (tons) */
  readonly bombCapacity: number;
}

// ============================================================================
// Small Craft Interface
// ============================================================================

/**
 * Small craft-mounted equipment item
 */
export interface ISmallCraftMountedEquipment {
  /** Unique mount ID */
  readonly id: string;
  /** Equipment definition ID */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Firing arc/location */
  readonly location: string;
  /** Linked ammunition ID */
  readonly linkedAmmoId?: string;
}

/**
 * Interface for small craft (shuttles, assault boats, etc.)
 */
export interface ISmallCraft extends IAerospaceUnit {
  readonly unitType: UnitType.SMALL_CRAFT;

  /** Motion type (aerodyne or spheroid) */
  readonly motionType: AerospaceMotionType;

  /** Armor per arc */
  readonly armorByArc: {
    readonly nose: number;
    readonly leftSide: number;
    readonly rightSide: number;
    readonly aft: number;
  };

  /** Equipment mounted by firing arc */
  readonly equipment: readonly ISmallCraftMountedEquipment[];

  /** Crew size */
  readonly crew: number;

  /** Passenger capacity */
  readonly passengers: number;

  /** Cargo capacity (tons) */
  readonly cargoCapacity: number;

  /** Escape pods */
  readonly escapePods: number;

  /** Life boats */
  readonly lifeBoats: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if unit is an aerospace fighter
 */
export function isAerospace(unit: { unitType: UnitType }): unit is IAerospace {
  return unit.unitType === UnitType.AEROSPACE;
}

/**
 * Check if unit is a conventional fighter
 */
export function isConventionalFighter(unit: {
  unitType: UnitType;
}): unit is IConventionalFighter {
  return unit.unitType === UnitType.CONVENTIONAL_FIGHTER;
}

/**
 * Check if unit is a small craft
 */
export function isSmallCraft(unit: {
  unitType: UnitType;
}): unit is ISmallCraft {
  return unit.unitType === UnitType.SMALL_CRAFT;
}
