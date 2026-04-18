/**
 * Aerospace Unit Interfaces
 *
 * Defines interfaces for aerospace fighters, conventional fighters, and small craft.
 * Extended by add-aerospace-construction to include construction-time types.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.1
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 */

import { AerospaceLocation } from '../construction/UnitLocation';
import { IAerospaceUnit, AerospaceMotionType } from './BaseUnitInterfaces';
import { UnitType } from './BattleMechInterfaces';

// ============================================================================
// Aerospace Sub-Type Discriminant
// ============================================================================

/**
 * Aerospace chassis sub-type used to discriminate construction rules.
 * ASF: 5-100t fusion/XL/compact. CF: 5-50t ICE/FuelCell only. SC: 100-200t.
 */
export enum AerospaceSubType {
  AEROSPACE_FIGHTER = 'AerospaceFighter',
  CONVENTIONAL_FIGHTER = 'ConventionalFighter',
  SMALL_CRAFT = 'SmallCraft',
}

// ============================================================================
// Aerospace Arc Enum (construction-canonical)
// ============================================================================

/**
 * Arc names used during construction and validation.
 * ASF/CF share NOSE/LEFT_WING/RIGHT_WING/AFT.
 * Small craft replaces LEFT_WING/RIGHT_WING with LEFT_SIDE/RIGHT_SIDE.
 * FUSELAGE is an internal location with no arc-slot cap.
 */
export enum AerospaceArc {
  NOSE = 'Nose',
  LEFT_WING = 'LeftWing',
  RIGHT_WING = 'RightWing',
  LEFT_SIDE = 'LeftSide',
  RIGHT_SIDE = 'RightSide',
  AFT = 'Aft',
  FUSELAGE = 'Fuselage',
}

// ============================================================================
// Aerospace Engine Type (construction-canonical)
// ============================================================================

/**
 * Engine types legal for aerospace construction.
 * Conventional fighters are restricted to ICE and FuelCell.
 * Water heat sinks are forbidden on all aerospace.
 */
export enum AerospaceEngineType {
  FUSION = 'Fusion',
  XL = 'XL',
  COMPACT_FUSION = 'CompactFusion',
  ICE = 'ICE',
  FUEL_CELL = 'FuelCell',
}

// ============================================================================
// Small Craft Crew Interface
// ============================================================================

/**
 * Crew and quarters breakdown for small craft construction.
 * Standard quarters cost 5 tons/crew; steerage costs 3 tons/passenger.
 */
export interface ISmallCraftCrew {
  /** Number of crew requiring standard quarters */
  readonly crew: number;
  /** Number of passengers using steerage quarters */
  readonly passengers: number;
  /** Number of marine berths (same weight as crew quarters) */
  readonly marines: number;
  /** Total tonnage consumed by quarters and life support */
  readonly quartersTons: number;
}

// ============================================================================
// Aerospace Weight Breakdown
// ============================================================================

/**
 * Complete weight-usage summary for an aerospace unit at construction time.
 * All values in tons.
 */
export interface IAerospaceBreakdown {
  /** Engine tonnage (from rating × weight table) */
  readonly engineTons: number;
  /** Structural integrity tonnage above default */
  readonly siTons: number;
  /** Fuel tonnage allocated */
  readonly fuelTons: number;
  /** Armor tonnage */
  readonly armorTons: number;
  /** Heat sink tonnage (sinks above the 10 engine-free baseline) */
  readonly heatSinkTons: number;
  /** Cockpit tonnage (3 for standard, 2 for small) */
  readonly cockpitTons: number;
  /** Crew quarters tonnage (small craft only; 0 for ASF/CF) */
  readonly quartersTons: number;
  /** Equipment tonnage (sum of all mounted items) */
  readonly equipmentTons: number;
  /** Total tons used */
  readonly totalUsed: number;
  /** Tons remaining (chassis tonnage − totalUsed) */
  readonly remaining: number;
}

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
