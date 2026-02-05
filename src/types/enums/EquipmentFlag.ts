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
  MechEquipment = 'MECH_EQUIPMENT',

  /** Equipment mountable on Combat Vehicles (tanks, etc.) */
  VehicleEquipment = 'VEHICLE_EQUIPMENT',

  /** Equipment mountable on VTOLs specifically */
  VtolEquipment = 'VTOL_EQUIPMENT',

  /** Equipment mountable on Aerospace Fighters */
  FighterEquipment = 'FIGHTER_EQUIPMENT',

  /** Equipment mountable on Support Vehicles */
  SupportVehicleEquipment = 'SUPPORT_VEHICLE_EQUIPMENT',

  /** Equipment mountable on Battle Armor */
  BattleArmorEquipment = 'BA_EQUIPMENT',

  /** Equipment mountable on conventional Infantry */
  InfantryEquipment = 'INF_EQUIPMENT',

  /** Equipment mountable on ProtoMechs */
  ProtomechEquipment = 'PROTO_EQUIPMENT',

  /** Equipment mountable on Small Craft */
  SmallCraftEquipment = 'SC_EQUIPMENT',

  /** Equipment mountable on DropShips */
  DropshipEquipment = 'DS_EQUIPMENT',

  /** Equipment mountable on JumpShips */
  JumpshipEquipment = 'JS_EQUIPMENT',

  /** Equipment mountable on WarShips */
  WarshipEquipment = 'WS_EQUIPMENT',

  /** Equipment mountable on Space Stations */
  SpaceStationEquipment = 'SS_EQUIPMENT',
}

/**
 * Equipment behavior flags
 *
 * These flags define special behaviors and properties of equipment.
 */
export enum EquipmentBehaviorFlag {
  // === Heat Management ===
  /** Single heat sink */
  HeatSink = 'HEAT_SINK',
  /** Double heat sink */
  DoubleHeatSink = 'DOUBLE_HEAT_SINK',
  /** Laser heat sink */
  LaserHeatSink = 'LASER_HEAT_SINK',
  /** Compact heat sink */
  CompactHeatSink = 'COMPACT_HEAT_SINK',

  // === Movement Enhancement ===
  /** Jump jet equipment */
  JumpJet = 'JUMP_JET',
  /** Jump booster */
  JumpBooster = 'JUMP_BOOSTER',
  /** Mechanical jump booster (BA/Proto) */
  MechanicalJumpBooster = 'MECHANICAL_JUMP_BOOSTER',
  /** MASC (Myomer Accelerator Signal Circuitry) */
  Masc = 'MASC',
  /** Triple Strength Myomer */
  Tsm = 'TSM',
  /** Industrial TSM */
  IndustrialTsm = 'INDUSTRIAL_TSM',
  /** Underwater Maneuvering Unit */
  Umu = 'UMU',
  /** Tracks conversion */
  Tracks = 'TRACKS',

  // === Defensive Systems ===
  /** CASE (Cellular Ammunition Storage Equipment) */
  Case = 'CASE',
  /** CASE II */
  CaseIi = 'CASE_II',
  /** Stealth armor system */
  Stealth = 'STEALTH',
  /** Blue Shield Particle Field Damper */
  BlueShield = 'BLUE_SHIELD',
  /** Armored components */
  ArmoredComponent = 'ARMORED_COMPONENT',

  // === Electronic Warfare ===
  /** ECM suite */
  Ecm = 'ECM',
  /** Angel ECM */
  AngelEcm = 'ANGEL_ECM',
  /** Beagle Active Probe */
  Bap = 'BAP',
  /** Watchdog CEWS */
  Watchdog = 'WATCHDOG',
  /** Electronic warfare equipment */
  EwEquipment = 'EW_EQUIPMENT',

  // === C3 Systems ===
  /** C3 Slave */
  C3s = 'C3S',
  /** C3 Improved */
  C3i = 'C3I',
  /** Naval C3 */
  NavalC3 = 'NAVAL_C3',

  // === Targeting Systems ===
  /** Artemis IV FCS */
  Artemis = 'ARTEMIS',
  /** Artemis V FCS */
  ArtemisV = 'ARTEMIS_V',
  /** Targeting Computer */
  TargetingComputer = 'TARGETING_COMPUTER',
  /** Apollo FCS */
  Apollo = 'APOLLO',

  // === Physical Properties ===
  /** Equipment is explosive */
  Explosive = 'EXPLOSIVE',
  /** Equipment can be spread across locations */
  Spreadable = 'SPREADABLE',
  /** Equipment has variable size/weight */
  VariableSize = 'VARIABLE_SIZE',
  /** Equipment cannot be hit by critical hits */
  NotHittable = 'NOT_HITTABLE',

  // === Mounting Properties ===
  /** Requires turret mounting */
  TurretMounted = 'TURRET_MOUNTED',
  /** Can only be fixed on OmniMechs (not pod-mounted) */
  OmniFixedOnly = 'OMNI_FIXED_ONLY',

  // === Battle Armor Specific ===
  /** BA manipulator equipment */
  BaManipulator = 'BA_MANIPULATOR',
  /** Basic manipulator */
  BasicManipulator = 'BASIC_MANIPULATOR',
  /** Battle claw */
  BattleClaw = 'BATTLE_CLAW',
  /** Armored glove */
  ArmoredGlove = 'ARMORED_GLOVE',
  /** BA anti-personnel mount */
  ApMount = 'AP_MOUNT',
  /** BA modular weapon mount */
  ModularWeaponMount = 'MODULAR_WEAPON_MOUNT',

  // === Vehicle Specific ===
  /** Environmental sealing */
  EnvironmentalSealing = 'ENVIRONMENTAL_SEALING',
  /** Flotation hull */
  FlotationHull = 'FLOTATION_HULL',
  /** Amphibious modification */
  Amphibious = 'AMPHIBIOUS',
  /** Off-road modification */
  OffRoad = 'OFF_ROAD',

  // === Aerospace Specific ===
  /** Bomb bay */
  BombBay = 'BOMB_BAY',
  /** Fuel tank */
  Fuel = 'FUEL',

  // === Capital Ship Specific ===
  /** Gravity deck */
  GravityDeck = 'GRAVITY_DECK',
  /** Lithium-Fusion Battery */
  LfBattery = 'LF_BATTERY',
  /** HPG (Hyperpulse Generator) */
  Hpg = 'HPG',

  // === Weapon Behavior Flags ===
  /** Direct fire weapon (affected by targeting computer) */
  DirectFire = 'DIRECT_FIRE',
  /** Artillery weapon */
  Artillery = 'ARTILLERY',
  /** Anti-Missile System */
  Ams = 'AMS',
  /** One-shot weapon */
  OneShot = 'ONE_SHOT',
  /** Rapid fire capable */
  RapidFire = 'RAPID_FIRE',
  /** Pulse weapon */
  Pulse = 'PULSE',
  /** Flamer weapon */
  Flamer = 'FLAMER',
  /** Can start fires */
  Incendiary = 'INCENDIARY',

  // === Misc ===
  /** Searchlight */
  Searchlight = 'SEARCHLIGHT',
  /** Cargo equipment */
  Cargo = 'CARGO',
  /** Communications equipment */
  Communications = 'COMMUNICATIONS',
  /** Prototype equipment */
  Prototype = 'PROTOTYPE',
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
export function isUnitTypeFlag(
  flag: EquipmentFlag,
): flag is UnitTypeEquipmentFlag {
  return Object.values(UnitTypeEquipmentFlag).includes(
    flag as UnitTypeEquipmentFlag,
  );
}

/**
 * Helper to check if a flag is a behavior flag
 */
export function isBehaviorFlag(
  flag: EquipmentFlag,
): flag is EquipmentBehaviorFlag {
  return Object.values(EquipmentBehaviorFlag).includes(
    flag as EquipmentBehaviorFlag,
  );
}

/**
 * Get all unit type flags from a flag array
 */
export function getUnitTypeFlags(
  flags: EquipmentFlag[],
): UnitTypeEquipmentFlag[] {
  return flags.filter(isUnitTypeFlag);
}

/**
 * Get all behavior flags from a flag array
 */
export function getBehaviorFlags(
  flags: EquipmentFlag[],
): EquipmentBehaviorFlag[] {
  return flags.filter(isBehaviorFlag);
}
