/**
 * BLK File Format Interfaces
 *
 * Defines the structure for parsing MegaMek BLK (Building Block) files.
 * BLK is the primary format for non-mech units in mm-data:
 * - Vehicles (tanks, VTOLs, support vehicles)
 * - Aerospace fighters
 * - Battle Armor
 * - Infantry
 * - DropShips, JumpShips, WarShips
 * - Small Craft, Space Stations
 * - ProtoMechs
 *
 * BLK files use XML-like tags with content between opening and closing tags.
 * Format: <TagName>\nvalue\n</TagName>
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.2
 */

import type { ResultType } from "@/services/core/types/BaseTypes";

import { UnitType } from "../unit/BattleMechInterfaces";

/**
 * Raw parsed BLK document before type-specific conversion
 */
export interface IBlkDocument {
  /** Block version (typically 1) */
  readonly blockVersion: number;
  /** Format version (typically "MAM0") */
  readonly version: string;
  /** Unit type string from file */
  readonly unitType: string;
  /** Mapped UnitType enum value */
  readonly mappedUnitType: UnitType;
  /** Unit name */
  readonly name: string;
  /** Model/variant designation */
  readonly model: string;
  /** Master Unit List ID */
  readonly mulId?: number;
  /** Introduction year */
  readonly year: number;
  /** Original build year (may differ from year) */
  readonly originalBuildYear?: number;
  /** Tech base/rules level string (e.g., "IS Level 2", "Clan Level 3") */
  readonly type: string;
  /** Combat role */
  readonly role?: string;
  /** Motion type (Hover, Tracked, Jump, Aerodyne, Spheroid, etc.) */
  readonly motionType?: string;
  /** Source book reference */
  readonly source?: string;

  // ===== Common Structural Fields =====
  /** Tonnage */
  readonly tonnage: number;
  /** Cruise MP (ground units) */
  readonly cruiseMP?: number;
  /** Jumping MP */
  readonly jumpingMP?: number;
  /** Safe thrust (aerospace) */
  readonly safeThrust?: number;
  /** Heat sinks count */
  readonly heatsinks?: number;
  /** Heat sink type (0 = single, 1 = double) */
  readonly sinkType?: number;
  /** Fuel points (aerospace) */
  readonly fuel?: number;
  /** Structural integrity (aerospace/dropships) */
  readonly structuralIntegrity?: number;

  // ===== Type Codes =====
  /** Engine type code */
  readonly engineType?: number;
  /** Armor type code */
  readonly armorType?: number;
  /** Armor tech base code */
  readonly armorTech?: number;
  /** Internal structure type code */
  readonly internalType?: number;
  /** Cockpit type code */
  readonly cockpitType?: number;

  // ===== Armor Array =====
  /** Armor values per location (array format varies by unit type) */
  readonly armor: readonly number[];
  /** BAR rating (support vehicles) */
  readonly barRating?: number;

  // ===== Equipment Blocks =====
  /** Equipment by location - keys are location names */
  readonly equipmentByLocation: Record<string, readonly string[]>;

  // ===== Battle Armor Specific =====
  /** Chassis type (biped/quad) */
  readonly chassis?: string;
  /** Trooper count */
  readonly trooperCount?: number;
  /** Weight class (1-5 for PA(L) to Assault) */
  readonly weightClass?: number;

  // ===== Infantry Specific =====
  /** Squad size */
  readonly squadSize?: number;
  /** Number of squads */
  readonly squadn?: number;
  /** Primary weapon */
  readonly primary?: string;
  /** Secondary weapon */
  readonly secondary?: string;
  /** Number of secondary weapons */
  readonly secondn?: number;
  /** Armor kit type */
  readonly armorKit?: string;

  // ===== Capital Ship Specific =====
  /** Design type (0 = military, 1 = civilian) */
  readonly designType?: number;
  /** Crew count */
  readonly crew?: number;
  /** Officer count */
  readonly officers?: number;
  /** Gunner count */
  readonly gunners?: number;
  /** Passenger count */
  readonly passengers?: number;
  /** Marine count */
  readonly marines?: number;
  /** Battle armor capacity */
  readonly battlearmor?: number;
  /** Other passenger count */
  readonly otherpassenger?: number;
  /** Life boat count */
  readonly lifeBoat?: number;
  /** Escape pod count */
  readonly escapePod?: number;
  /** Transporters/bays definitions */
  readonly transporters?: readonly string[];

  // ===== Fluff Text =====
  /** Unit overview */
  readonly overview?: string;
  /** Capabilities description */
  readonly capabilities?: string;
  /** Deployment notes */
  readonly deployment?: string;
  /** History text */
  readonly history?: string;
  /** Manufacturer(s) */
  readonly manufacturer?: string;
  /** Primary factory location(s) */
  readonly primaryFactory?: string;

  // ===== Quirks =====
  /** Unit quirks */
  readonly quirks?: readonly string[];
  /** Weapon-specific quirks: weapon name → quirk IDs */
  readonly weaponQuirks?: Readonly<Record<string, readonly string[]>>;

  // ===== Raw Data =====
  /** All parsed tags for debugging/extension */
  readonly rawTags: Record<string, string | string[]>;
}

/**
 * Success data from parsing a BLK file
 */
export interface IBlkParseData {
  /** Parsed document */
  readonly document: IBlkDocument;
  /** Parse warnings (non-fatal issues) */
  readonly warnings: readonly string[];
}

/**
 * Error data from a failed BLK parse
 */
export interface IBlkParseError {
  /** Parse errors */
  readonly errors: readonly string[];
  /** Parse warnings (non-fatal issues) */
  readonly warnings: readonly string[];
}

/**
 * Result of parsing a BLK file
 *
 * Uses discriminated union: check `success` to narrow to data or error.
 */
export type IBlkParseResult = ResultType<IBlkParseData, IBlkParseError>;

// ============================================================================
// Per-Type Discriminated Union Results
// ============================================================================

/**
 * Parsed vehicle-specific data extracted from a BLK document.
 * Covers Tank, VTOL, SupportTank, SupportVTOL, and Naval unit types.
 */
export interface IVehicleBlkResult {
  /** Chassis name */
  readonly name: string;
  /** Model/variant designation */
  readonly model: string;
  /** Master Unit List ID */
  readonly mulId?: number;
  /** Introduction year */
  readonly year: number;
  /** Tonnage */
  readonly tonnage: number;
  /** Tech base (INNER_SPHERE | CLAN | MIXED) */
  readonly techBase: string;
  /** Motion type string as in BLK (Tracked, Wheeled, Hover, VTOL, etc.) */
  readonly motionType: string;
  /** Cruise MP */
  readonly cruiseMP: number;
  /** Jumping / UMU MP */
  readonly jumpingMP: number;
  /** Armor values: [Front, Right, Left, Rear, Turret?] */
  readonly armor: readonly number[];
  /** BAR rating for support vehicles (0 for standard combat vehicles) */
  readonly barRating: number;
  /** Engine type code */
  readonly engineType: number;
  /** Armor type code */
  readonly armorType: number;
  /** Equipment keyed by location (Front, Left, Right, Rear, Turret, Body) */
  readonly equipmentByLocation: Record<string, readonly string[]>;
  /** Role */
  readonly role?: string;
  /** Source book */
  readonly source?: string;
  /** Quirks */
  readonly quirks?: readonly string[];
  /** Raw BLK unit type string (Tank | VTOL | SupportTank | Naval | …) */
  readonly blkUnitType: string;
}

/**
 * Parsed aerospace-specific data from a BLK document.
 * Covers Aero / AeroSpaceFighter, ConvFighter, and SmallCraft.
 */
export interface IAerospaceBlkResult {
  readonly name: string;
  readonly model: string;
  readonly mulId?: number;
  readonly year: number;
  readonly tonnage: number;
  readonly techBase: string;
  /** Safe thrust (acceleration thrust points) */
  readonly safeThrust: number;
  /** Maximum thrust (2 × safe for most fighters) */
  readonly maxThrust: number;
  /** Fuel points */
  readonly fuelPoints: number;
  /** Structural integrity */
  readonly structuralIntegrity: number;
  /** Heat sinks count */
  readonly heatsinks: number;
  /** Heat sink type (0 = single, 1 = double) */
  readonly sinkType: number;
  /** Cockpit type code */
  readonly cockpitType: number;
  /** Armor per arc: [Nose, LW, RW, Aft] */
  readonly armor: readonly number[];
  /** Equipment by firing arc (Nose, Left Wing, Right Wing, Aft, Wings, Fuselage) */
  readonly equipmentByLocation: Record<string, readonly string[]>;
  readonly role?: string;
  readonly source?: string;
  readonly quirks?: readonly string[];
  /** Raw BLK unit type (Aero | AeroSpaceFighter | ConvFighter | SmallCraft) */
  readonly blkUnitType: string;
}

/**
 * Parsed Battle Armor-specific data from a BLK document.
 */
export interface IBattleArmorBlkResult {
  readonly name: string;
  readonly model: string;
  readonly mulId?: number;
  readonly year: number;
  /** Weight per trooper (kg) — derived from weightclass tag */
  readonly weightClass: number;
  readonly techBase: string;
  /** Motion type (Jump, Ground, UMU, etc.) */
  readonly motionType: string;
  /** Cruise MP */
  readonly cruiseMP: number;
  /** Jump MP */
  readonly jumpMP: number;
  /** Chassis type (biped | quad) */
  readonly chassis: string;
  /** Trooper count per point/squad */
  readonly trooperCount: number;
  /** Armor points per trooper */
  readonly armorPerTrooper: number;
  /** Armor type code */
  readonly armorType: number;
  /** Equipment list from Point Equipment block (pre-parsed location suffixes) */
  readonly equipmentByLocation: Record<string, readonly string[]>;
  readonly role?: string;
  readonly source?: string;
  readonly quirks?: readonly string[];
}

/**
 * Parsed Infantry-specific data from a BLK document.
 */
export interface IInfantryBlkResult {
  readonly name: string;
  readonly model: string;
  readonly mulId?: number;
  readonly year: number;
  readonly techBase: string;
  /** Motion type (Leg, Wheeled, Motorized, Jump, etc.) */
  readonly motionType: string;
  /** Squad size (soldiers per squad) */
  readonly squadSize: number;
  /** Number of squads */
  readonly squadCount: number;
  /** Primary weapon equipment ID */
  readonly primaryWeapon: string;
  /** Secondary weapon equipment ID */
  readonly secondaryWeapon?: string;
  /** Number of secondary weapons */
  readonly secondaryCount: number;
  /** Armor kit type */
  readonly armorKit?: string;
  readonly role?: string;
  readonly source?: string;
}

/**
 * Parsed ProtoMech-specific data from a BLK document.
 */
export interface IProtoMechBlkResult {
  readonly name: string;
  readonly model: string;
  readonly mulId?: number;
  readonly year: number;
  readonly tonnage: number;
  readonly techBase: string;
  /** Motion type (Biped | Quad | Glider | UMU) */
  readonly motionType: string;
  /** Cruise MP */
  readonly cruiseMP: number;
  /** Jump MP */
  readonly jumpMP: number;
  /** Is glider proto */
  readonly isGlider: boolean;
  /** Armor values: [Head, Torso, L Arm, R Arm, Legs, Main Gun?] — order matches BLK armor tag */
  readonly armor: readonly number[];
  /** Equipment by location */
  readonly equipmentByLocation: Record<string, readonly string[]>;
  readonly role?: string;
  readonly source?: string;
  readonly quirks?: readonly string[];
}

/**
 * Result for an unsupported/skipped unit type (WarShip, DropShip, JumpShip, LAM, QuadVee, Mobile Structure)
 */
export interface IUnsupportedBlkResult {
  /** Reason key identifying the unsupported type */
  readonly reason: string;
  /** Human-readable name if parseable */
  readonly name?: string;
  /** Raw unit type string from BLK */
  readonly blkUnitType: string;
}

/**
 * Discriminated union result from parseByUnitType.
 *
 * Discriminator is `kind`:
 * - 'vehicle'    → IVehicleBlkResult
 * - 'aerospace'  → IAerospaceBlkResult
 * - 'battlearmor'→ IBattleArmorBlkResult
 * - 'infantry'   → IInfantryBlkResult
 * - 'protomech'  → IProtoMechBlkResult
 * - 'unsupported'→ IUnsupportedBlkResult
 */
export type BlkDispatchResult =
  | { readonly kind: "vehicle"; readonly data: IVehicleBlkResult }
  | { readonly kind: "aerospace"; readonly data: IAerospaceBlkResult }
  | { readonly kind: "battlearmor"; readonly data: IBattleArmorBlkResult }
  | { readonly kind: "infantry"; readonly data: IInfantryBlkResult }
  | { readonly kind: "protomech"; readonly data: IProtoMechBlkResult }
  | { readonly kind: "unsupported"; readonly data: IUnsupportedBlkResult };

/**
 * Result of parseByUnitType call: either a dispatched result or a parse failure.
 */
export type BlkDispatchParseResult =
  | { readonly success: true; readonly result: BlkDispatchResult }
  | { readonly success: false; readonly errors: readonly string[] };

/**
 * BLK unit type strings and their UnitType mappings
 */
export const BLK_UNIT_TYPE_MAP: Record<string, UnitType> = {
  // Vehicles
  Tank: UnitType.VEHICLE,
  SupportTank: UnitType.SUPPORT_VEHICLE,
  SupportVTOL: UnitType.SUPPORT_VEHICLE,
  VTOL: UnitType.VTOL,
  Naval: UnitType.VEHICLE,
  // Aerospace
  Aero: UnitType.AEROSPACE,
  AeroSpaceFighter: UnitType.AEROSPACE,
  ConvFighter: UnitType.CONVENTIONAL_FIGHTER,
  // Capital ships
  Dropship: UnitType.DROPSHIP,
  Jumpship: UnitType.JUMPSHIP,
  Warship: UnitType.WARSHIP,
  SmallCraft: UnitType.SMALL_CRAFT,
  SpaceStation: UnitType.SPACE_STATION,
  // Personnel
  BattleArmor: UnitType.BATTLE_ARMOR,
  Infantry: UnitType.INFANTRY,
  // ProtoMech
  ProtoMech: UnitType.PROTOMECH,
  Protomech: UnitType.PROTOMECH,
  // Mechs (rarely in BLK but possible)
  BattleMech: UnitType.BATTLEMECH,
  Mek: UnitType.BATTLEMECH,
  IndustrialMech: UnitType.INDUSTRIALMECH,
};

/**
 * Equipment location patterns by unit type
 */
export const BLK_EQUIPMENT_LOCATIONS: Record<string, readonly string[]> = {
  // Vehicles
  Vehicle: ["Front", "Left", "Right", "Rear", "Turret", "Body"],
  VTOL: ["Front", "Left", "Right", "Rear", "Turret", "Body", "Rotor"],
  // Aerospace
  Aero: ["Nose", "Left Wing", "Right Wing", "Aft", "Wings", "Fuselage"],
  // Capital ships
  Dropship: ["Nose", "Left Side", "Right Side", "Aft", "Hull"],
  Capital: ["Nose", "FL", "FR", "AL", "AR", "Aft", "LBS", "RBS"],
  // Battle Armor
  BattleArmor: ["Squad", "Body", "Left Arm", "Right Arm", "Turret"],
  // Infantry - no location-based equipment
  Infantry: [],
  // ProtoMech
  ProtoMech: ["Head", "Torso", "Main Gun", "Left Arm", "Right Arm", "Legs"],
};

/**
 * Known equipment block tag patterns
 */
export const BLK_EQUIPMENT_BLOCK_TAGS: readonly string[] = [
  // Standard location-based
  "Front Equipment",
  "Left Equipment",
  "Left Side Equipment",
  "Right Equipment",
  "Right Side Equipment",
  "Rear Equipment",
  "Turret Equipment",
  "Body Equipment",
  // Aerospace
  "Nose Equipment",
  "Left Wing Equipment",
  "Right Wing Equipment",
  "Aft Equipment",
  "Wings Equipment",
  "Fuselage Equipment",
  "Hull Equipment",
  // Capital arcs
  "FL Equipment",
  "FR Equipment",
  "AL Equipment",
  "AR Equipment",
  "LBS Equipment",
  "RBS Equipment",
  // Battle Armor
  "Squad Equipment",
  "Point Equipment",
  "Trooper 1 Equipment",
  "Trooper 2 Equipment",
  "Trooper 3 Equipment",
  "Trooper 4 Equipment",
  "Trooper 5 Equipment",
  "Trooper 6 Equipment",
  // ProtoMech
  "Head Equipment",
  "Torso Equipment",
  "Main Gun Equipment",
  "Left Arm Equipment",
  "Right Arm Equipment",
  "Legs Equipment",
];
