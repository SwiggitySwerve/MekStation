/**
 * Aerospace Unit Interfaces
 *
 * Defines interfaces for aerospace fighters, conventional fighters, and small craft.
 * Extended by add-aerospace-construction to include construction-time types.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.1
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 */

import type { IUnitMountedEquipmentIdentity } from './MountedEquipmentInterfaces';

import { AerospaceLocation } from '../construction/UnitLocation';
import { AerospaceArc } from './AerospaceArcTypes';
import { IAerospaceUnit, AerospaceMotionType } from './BaseUnitInterfaces';
import { UnitType } from './BattleMechInterfaces';
export { AerospaceArc } from './AerospaceArcTypes';

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

/** Native equipment components, all in tons and charged exactly once. */
export interface IAerospaceEquipmentWeightTerms {
  readonly weaponsTons: number;
  readonly ammunitionTons: number;
  readonly miscellaneousTons: number;
  readonly powerAmplifiersTons: number;
  /** Native miscellaneous systems, such as VSTOL. */
  readonly systemsTons: number;
  readonly carryingSpaceTons: number;
  /** Excludes accommodation already included in controls. */
  readonly quartersTons: number;
  readonly armoredComponentsTons: number;
}

/** Complete native construction weight summary. All values are in tons. */
export interface IAerospaceBreakdown {
  readonly engineTons: number;
  /** Entire native structure/SI contribution. */
  readonly structureTons: number;
  readonly armorTons: number;
  readonly heatSinkTons: number;
  /** Native controls and crew accommodation contribution. */
  readonly cockpitTons: number;
  readonly fuelTons: number;
  /** Sum of the equipment components exactly once. */
  readonly equipmentTons: number;
  readonly equipment: IAerospaceEquipmentWeightTerms;
  /** Native calculateWeightExact / weightTotal. */
  readonly total: number;
  /** Native calculateWeight, kept separate from the exact total. */
  readonly roundedTotal: number;
  /** Design tonnage minus exact total; overweight values remain negative. */
  readonly remaining: number;
}

// ============================================================================
// Aerospace Equipment
// ============================================================================

/**
 * Aerospace-mounted equipment item
 */
export interface IAerospaceMountedEquipment extends IUnitMountedEquipmentIdentity {
  /** Firing arc/location */
  readonly location: AerospaceLocation;
  /** Rear-mounted; a rear side mount fires into the aft-side arc */
  readonly isRearMounted?: boolean;
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

  /** Loaded engine technology, independent of chassis technology. */
  readonly clanEngine?: boolean;

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
export interface ISmallCraftMountedEquipment extends IUnitMountedEquipmentIdentity {
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
