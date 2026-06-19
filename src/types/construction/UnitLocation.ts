/**
 * Unit-Type-Specific Location Enumerations
 *
 * Defines equipment mounting locations for different unit types.
 * Used for equipment compatibility filtering and placement validation.
 *
 * @see E:\Projects\megamek - Reference implementation
 * @see openspec/changes/add-multi-unit-type-support/design.md
 */

// Re-export MechLocation for consistency
export { MechLocation } from './CriticalSlotAllocation';

/**
 * Vehicle locations
 * Combat vehicles have 6 primary locations
 */
export enum VehicleLocation {
  /** Front facing armor and equipment */
  FRONT = 'Front',
  /** Left side armor and equipment */
  LEFT = 'Left',
  /** Right side armor and equipment */
  RIGHT = 'Right',
  /** Rear facing armor and equipment */
  REAR = 'Rear',
  /** Primary turret (if equipped) - can rotate 360 degrees */
  TURRET = 'Turret',
  /** Secondary turret for dual-turret vehicles (independent rotation) */
  TURRET_2 = 'Turret 2',
  /** Body/chassis - internal components */
  BODY = 'Body',
}

/**
 * VTOL locations
 * Extends vehicle locations with rotor
 */
export enum VTOLLocation {
  FRONT = 'Front',
  LEFT = 'Left',
  RIGHT = 'Right',
  REAR = 'Rear',
  /** Turret (chin turret typically) */
  TURRET = 'Turret',
  BODY = 'Body',
  /** Rotor assembly - critical for flight */
  ROTOR = 'Rotor',
}

/**
 * Aerospace fighter locations
 * Based on weapon arcs and structural areas
 */
export enum AerospaceLocation {
  /** Forward firing arc */
  NOSE = 'Nose',
  /** Left wing - includes left aft arc */
  LEFT_WING = 'Left Wing',
  /** Right wing - includes right aft arc */
  RIGHT_WING = 'Right Wing',
  /** Rear firing arc */
  AFT = 'Aft',
  /** Main body/fuselage - internal components */
  FUSELAGE = 'Fuselage',
}

/**
 * Conventional fighter locations
 * Same as aerospace but may have different armor values
 */
export type ConventionalFighterLocation = AerospaceLocation;

/**
 * Small craft locations
 * Similar to aerospace but may have additional internal bays
 */
export enum SmallCraftLocation {
  NOSE = 'Nose',
  LEFT_SIDE = 'Left Side',
  RIGHT_SIDE = 'Right Side',
  AFT = 'Aft',
  /** Main hull - structural and cargo areas */
  HULL = 'Hull',
}

/**
 * DropShip locations
 * Large aerospace craft with multiple weapon arcs
 */
export enum DropShipLocation {
  /** Forward firing arc */
  NOSE = 'Nose',
  /** Forward left arc */
  FRONT_LEFT_SIDE = 'Front Left Side',
  /** Forward right arc */
  FRONT_RIGHT_SIDE = 'Front Right Side',
  /** Aft left arc */
  AFT_LEFT_SIDE = 'Aft Left Side',
  /** Aft right arc */
  AFT_RIGHT_SIDE = 'Aft Right Side',
  /** Rear firing arc */
  AFT = 'Aft',
  /** Broadside arcs (spheroid only) */
  LEFT_SIDE = 'Left Side',
  RIGHT_SIDE = 'Right Side',
}

/**
 * JumpShip and WarShip locations
 * Capital ships with comprehensive arc coverage
 */
export enum CapitalShipLocation {
  /** Forward firing arc */
  NOSE = 'Nose',
  /** Forward left arc */
  FRONT_LEFT_SIDE = 'FL',
  /** Forward right arc */
  FRONT_RIGHT_SIDE = 'FR',
  /** Aft left arc */
  AFT_LEFT_SIDE = 'AL',
  /** Aft right arc */
  AFT_RIGHT_SIDE = 'AR',
  /** Rear firing arc */
  AFT = 'Aft',
  /** Broadside - both sides */
  LEFT_BROADSIDE = 'LBS',
  RIGHT_BROADSIDE = 'RBS',
}

/**
 * Space station locations
 * Similar to capital ships but with different internal structure
 */
export type SpaceStationLocation = CapitalShipLocation;

/**
 * Battle Armor locations
 * Squad-based equipment mounting
 */
export enum BattleArmorLocation {
  /** Entire squad - shared equipment */
  SQUAD = 'Squad',
  /** Individual trooper body */
  BODY = 'Body',
  /** Left arm/manipulator */
  LEFT_ARM = 'Left Arm',
  /** Right arm/manipulator */
  RIGHT_ARM = 'Right Arm',
  /** Left leg — AP weapons only */
  LEFT_LEG = 'Left Leg',
  /** Right leg — AP weapons only */
  RIGHT_LEG = 'Right Leg',
  /** Turret mount (if equipped) */
  TURRET = 'Turret',
}

/**
 * ProtoMech locations
 * Simplified mech-like structure
 */
export enum ProtoMechLocation {
  HEAD = 'Head',
  TORSO = 'Torso',
  LEFT_ARM = 'Left Arm',
  RIGHT_ARM = 'Right Arm',
  LEGS = 'Legs',
  /** Main gun mount - special equipment slot */
  MAIN_GUN = 'Main Gun',
}

/**
 * Infantry locations
 * Simplified - infantry is treated as a unit rather than individuals
 */
export enum InfantryLocation {
  /** Entire platoon/squad */
  PLATOON = 'Platoon',
  /** Field guns or support weapons */
  FIELD_GUN = 'Field Gun',
}

/**
 * Support vehicle locations
 * Varies by chassis type but generally simpler than combat vehicles
 */
export enum SupportVehicleLocation {
  FRONT = 'Front',
  LEFT = 'Left',
  RIGHT = 'Right',
  REAR = 'Rear',
  BODY = 'Body',
  /** Pintle mount (external weapon mount) */
  PINTLE = 'Pintle',
}

/**
 * Union type of all unit locations
 */
export type UnitLocation =
  | AerospaceLocation
  | BattleArmorLocation
  | CapitalShipLocation
  | DropShipLocation
  | InfantryLocation
  | ProtoMechLocation
  | SmallCraftLocation
  | SupportVehicleLocation
  | VehicleLocation
  | VTOLLocation;

/**
 * Get locations available for a unit type
 */
import { UnitType } from '../unit/BattleMechInterfaces';
import { MechLocation } from './CriticalSlotAllocation';

const MECH_UNIT_LOCATIONS = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
] as const satisfies readonly string[];

const CAPITAL_SHIP_LOCATIONS = Object.values(CapitalShipLocation);

const UNIT_LOCATIONS_BY_UNIT_TYPE = {
  [UnitType.BATTLEMECH]: MECH_UNIT_LOCATIONS,
  [UnitType.OMNIMECH]: MECH_UNIT_LOCATIONS,
  [UnitType.INDUSTRIALMECH]: MECH_UNIT_LOCATIONS,
  [UnitType.VEHICLE]: Object.values(VehicleLocation),
  [UnitType.VTOL]: Object.values(VTOLLocation),
  [UnitType.AEROSPACE]: Object.values(AerospaceLocation),
  [UnitType.CONVENTIONAL_FIGHTER]: Object.values(AerospaceLocation),
  [UnitType.SMALL_CRAFT]: Object.values(SmallCraftLocation),
  [UnitType.DROPSHIP]: Object.values(DropShipLocation),
  [UnitType.JUMPSHIP]: CAPITAL_SHIP_LOCATIONS,
  [UnitType.WARSHIP]: CAPITAL_SHIP_LOCATIONS,
  [UnitType.SPACE_STATION]: CAPITAL_SHIP_LOCATIONS,
  [UnitType.BATTLE_ARMOR]: Object.values(BattleArmorLocation),
  [UnitType.PROTOMECH]: Object.values(ProtoMechLocation),
  [UnitType.INFANTRY]: Object.values(InfantryLocation),
  [UnitType.SUPPORT_VEHICLE]: Object.values(SupportVehicleLocation),
} as const satisfies Readonly<Record<UnitType, readonly string[]>>;

/**
 * Returns the appropriate location enum values for a given unit type
 */
export function getLocationsForUnitType(unitType: UnitType): string[] {
  return [...(UNIT_LOCATIONS_BY_UNIT_TYPE[unitType] ?? MECH_UNIT_LOCATIONS)];
}

/**
 * Check if a location string is valid for a given unit type
 */
export function isValidLocationForUnitType(
  location: string,
  unitType: UnitType,
): boolean {
  const validLocations = getLocationsForUnitType(unitType);
  return validLocations.includes(location);
}
