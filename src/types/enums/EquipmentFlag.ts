/**
 * Equipment Flag Enumeration
 *
 * Flags that define equipment properties, behaviors, and unit type compatibility.
 * Based on MegaMek's MiscTypeFlag and WeaponTypeFlag systems.
 *
 * @see E:\Projects\megamek\megamek\src\megamek\common\equipment\enums\MiscTypeFlag.java
 * @see E:\Projects\megamek\megamek\src\megamek\common\equipment\WeaponTypeFlag.java
 */

/**
 * Unit type compatibility flags
 *
 * These flags determine which unit types can mount a piece of equipment.
 * Equipment can have multiple unit type flags (e.g., MASC works on mechs AND vehicles).
 */
export enum UnitTypeEquipmentFlag {
  /** Equipment mountable on BattleMechs and IndustrialMechs */
  MECH_EQUIPMENT = 'MECH_EQUIPMENT',

  /** Equipment mountable on Combat Vehicles (tanks, etc.) */
  VEHICLE_EQUIPMENT = 'VEHICLE_EQUIPMENT',

  /** Equipment mountable on VTOLs specifically */
  VTOL_EQUIPMENT = 'VTOL_EQUIPMENT',

  /** Equipment mountable on Aerospace Fighters */
  FIGHTER_EQUIPMENT = 'FIGHTER_EQUIPMENT',

  /** Equipment mountable on Support Vehicles */
  SUPPORT_VEHICLE_EQUIPMENT = 'SUPPORT_VEHICLE_EQUIPMENT',

  /** Equipment mountable on Battle Armor */
  BATTLE_ARMOR_EQUIPMENT = 'BA_EQUIPMENT',

  /** Equipment mountable on conventional Infantry */
  INFANTRY_EQUIPMENT = 'INF_EQUIPMENT',

  /** Equipment mountable on ProtoMechs */
  PROTOMECH_EQUIPMENT = 'PROTO_EQUIPMENT',

  /** Equipment mountable on Small Craft */
  SMALL_CRAFT_EQUIPMENT = 'SC_EQUIPMENT',

  /** Equipment mountable on DropShips */
  DROPSHIP_EQUIPMENT = 'DS_EQUIPMENT',

  /** Equipment mountable on JumpShips */
  JUMPSHIP_EQUIPMENT = 'JS_EQUIPMENT',

  /** Equipment mountable on WarShips */
  WARSHIP_EQUIPMENT = 'WS_EQUIPMENT',

  /** Equipment mountable on Space Stations */
  SPACE_STATION_EQUIPMENT = 'SS_EQUIPMENT',
}

/**
 * Equipment behavior flags
 *
 * These flags define special behaviors and properties of equipment.
 */
export enum EquipmentBehaviorFlag {
  // === Heat Management ===
  /** Single heat sink */
  HEAT_SINK = 'HEAT_SINK',
  /** Double heat sink */
  DOUBLE_HEAT_SINK = 'DOUBLE_HEAT_SINK',
  /** Laser heat sink */
  LASER_HEAT_SINK = 'LASER_HEAT_SINK',
  /** Compact heat sink */
  COMPACT_HEAT_SINK = 'COMPACT_HEAT_SINK',

  // === Movement Enhancement ===
  /** Jump jet equipment */
  JUMP_JET = 'JUMP_JET',
  /** Jump booster */
  JUMP_BOOSTER = 'JUMP_BOOSTER',
  /** Mechanical jump booster (BA/Proto) */
  MECHANICAL_JUMP_BOOSTER = 'MECHANICAL_JUMP_BOOSTER',
  /** MASC (Myomer Accelerator Signal Circuitry) */
  MASC = 'MASC',
  /** Triple Strength Myomer */
  TSM = 'TSM',
  /** Industrial TSM */
  INDUSTRIAL_TSM = 'INDUSTRIAL_TSM',
  /** Underwater Maneuvering Unit */
  UMU = 'UMU',
  /** Tracks conversion */
  TRACKS = 'TRACKS',

  // === Defensive Systems ===
  /** CASE (Cellular Ammunition Storage Equipment) */
  CASE = 'CASE',
  /** CASE II */
  CASE_II = 'CASE_II',
  /** Stealth armor system */
  STEALTH = 'STEALTH',
  /** Blue Shield Particle Field Damper */
  BLUE_SHIELD = 'BLUE_SHIELD',
  /** Armored components */
  ARMORED_COMPONENT = 'ARMORED_COMPONENT',

  // === Electronic Warfare ===
  /** ECM suite */
  ECM = 'ECM',
  /** Angel ECM */
  ANGEL_ECM = 'ANGEL_ECM',
  /** Beagle Active Probe */
  BAP = 'BAP',
  /** Watchdog CEWS */
  WATCHDOG = 'WATCHDOG',
  /** Electronic warfare equipment */
  EW_EQUIPMENT = 'EW_EQUIPMENT',

  // === C3 Systems ===
  /** C3 Slave */
  C3S = 'C3S',
  /** C3 Improved */
  C3I = 'C3I',
  /** Naval C3 */
  NAVAL_C3 = 'NAVAL_C3',

  // === Targeting Systems ===
  /** Artemis IV FCS */
  ARTEMIS = 'ARTEMIS',
  /** Artemis V FCS */
  ARTEMIS_V = 'ARTEMIS_V',
  /** Targeting Computer */
  TARGETING_COMPUTER = 'TARGETING_COMPUTER',
  /** Apollo FCS */
  APOLLO = 'APOLLO',

  // === Physical Properties ===
  /** Equipment is explosive */
  EXPLOSIVE = 'EXPLOSIVE',
  /** Equipment can be spread across locations */
  SPREADABLE = 'SPREADABLE',
  /** Equipment has variable size/weight */
  VARIABLE_SIZE = 'VARIABLE_SIZE',
  /** Equipment cannot be hit by critical hits */
  NOT_HITTABLE = 'NOT_HITTABLE',

  // === Mounting Properties ===
  /** Requires turret mounting */
  TURRET_MOUNTED = 'TURRET_MOUNTED',
  /** Can only be fixed on OmniMechs (not pod-mounted) */
  OMNI_FIXED_ONLY = 'OMNI_FIXED_ONLY',

  // === Battle Armor Specific ===
  /** BA manipulator equipment */
  BA_MANIPULATOR = 'BA_MANIPULATOR',
  /** Basic manipulator */
  BASIC_MANIPULATOR = 'BASIC_MANIPULATOR',
  /** Battle claw */
  BATTLE_CLAW = 'BATTLE_CLAW',
  /** Armored glove */
  ARMORED_GLOVE = 'ARMORED_GLOVE',
  /** BA anti-personnel mount */
  AP_MOUNT = 'AP_MOUNT',
  /** BA modular weapon mount */
  MODULAR_WEAPON_MOUNT = 'MODULAR_WEAPON_MOUNT',

  // === Vehicle Specific ===
  /** Environmental sealing */
  ENVIRONMENTAL_SEALING = 'ENVIRONMENTAL_SEALING',
  /** Flotation hull */
  FLOTATION_HULL = 'FLOTATION_HULL',
  /** Amphibious modification */
  AMPHIBIOUS = 'AMPHIBIOUS',
  /** Off-road modification */
  OFF_ROAD = 'OFF_ROAD',

  // === Aerospace Specific ===
  /** Bomb bay */
  BOMB_BAY = 'BOMB_BAY',
  /** Fuel tank */
  FUEL = 'FUEL',

  // === Capital Ship Specific ===
  /** Gravity deck */
  GRAVITY_DECK = 'GRAVITY_DECK',
  /** Lithium-Fusion Battery */
  LF_BATTERY = 'LF_BATTERY',
  /** HPG (Hyperpulse Generator) */
  HPG = 'HPG',

  // === Weapon Behavior Flags ===
  /** Direct fire weapon (affected by targeting computer) */
  DIRECT_FIRE = 'DIRECT_FIRE',
  /** Artillery weapon */
  ARTILLERY = 'ARTILLERY',
  /** Anti-Missile System */
  AMS = 'AMS',
  /** One-shot weapon */
  ONE_SHOT = 'ONE_SHOT',
  /** Rapid fire capable */
  RAPID_FIRE = 'RAPID_FIRE',
  /** Pulse weapon */
  PULSE = 'PULSE',
  /** Flamer weapon */
  FLAMER = 'FLAMER',
  /** Can start fires */
  INCENDIARY = 'INCENDIARY',

  // === Misc ===
  /** Searchlight */
  SEARCHLIGHT = 'SEARCHLIGHT',
  /** Cargo equipment */
  CARGO = 'CARGO',
  /** Communications equipment */
  COMMUNICATIONS = 'COMMUNICATIONS',
  /** Prototype equipment */
  PROTOTYPE = 'PROTOTYPE',
}

/**
 * Combined equipment flag type
 *
 * Equipment can have both unit type flags and behavior flags.
 */
export type EquipmentFlag = UnitTypeEquipmentFlag | EquipmentBehaviorFlag;

/**
 * Helper to check if a flag is a unit type flag
 */
export function isUnitTypeFlag(flag: EquipmentFlag): flag is UnitTypeEquipmentFlag {
  return Object.values(UnitTypeEquipmentFlag).includes(flag as UnitTypeEquipmentFlag);
}

/**
 * Helper to check if a flag is a behavior flag
 */
export function isBehaviorFlag(flag: EquipmentFlag): flag is EquipmentBehaviorFlag {
  return Object.values(EquipmentBehaviorFlag).includes(flag as EquipmentBehaviorFlag);
}

/**
 * Get all unit type flags from a flag array
 */
export function getUnitTypeFlags(flags: EquipmentFlag[]): UnitTypeEquipmentFlag[] {
  return flags.filter(isUnitTypeFlag);
}

/**
 * Get all behavior flags from a flag array
 */
export function getBehaviorFlags(flags: EquipmentFlag[]): EquipmentBehaviorFlag[] {
  return flags.filter(isBehaviorFlag);
}
