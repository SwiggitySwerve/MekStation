/**
 * Battle Armor Construction Interfaces
 *
 * Defines all types, enums, and interfaces required for Battle Armor
 * construction per the battle-armor-unit-system spec delta.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';

// ============================================================================
// Chassis
// ============================================================================

/**
 * Battle Armor chassis type.
 * Biped: two manipulator arms.
 * Quad: four legs, no arm manipulators.
 */
export enum BAChassisType {
  BIPED = 'Biped',
  QUAD = 'Quad',
}

// ============================================================================
// Weight Class
// ============================================================================

/**
 * Battle Armor weight class.
 * Governs mass range, armor cap, and movement limits per trooper.
 */
export enum BAWeightClass {
  PA_L = 'PA(L)',
  LIGHT = 'Light',
  MEDIUM = 'Medium',
  HEAVY = 'Heavy',
  ASSAULT = 'Assault',
}

/**
 * Per-weight-class mass range (kg per trooper).
 * Armor + weapons + equipment must fall in this band.
 */
export interface BAWeightClassLimits {
  /** Minimum trooper mass in kg (inclusive) */
  readonly minMassKg: number;
  /** Maximum trooper mass in kg (inclusive) */
  readonly maxMassKg: number;
  /** Maximum armor points per trooper */
  readonly maxArmorPoints: number;
  /** Ground MP cap */
  readonly maxGroundMP: number;
  /** Jump MP cap (0 = no jump allowed) */
  readonly maxJumpMP: number;
  /** Whether VTOL movement is legal for this class */
  readonly vtolAllowed: boolean;
  /** UMU MP cap */
  readonly maxUmuMP: number;
}

/**
 * Per-weight-class kg cost for each **extra** movement point beyond the
 * free base 1 MP. Applies equally to extra ground / jump / UMU MP.
 *
 * Values follow Total Warfare p.260 (BA construction movement mass table):
 *   PA(L)    25 kg / extra MP
 *   Light    40 kg / extra MP
 *   Medium   80 kg / extra MP
 *   Heavy   120 kg / extra MP
 *   Assault 150 kg / extra MP
 *
 * Extra MP beyond the first costs the weight-class MP cost per point in
 * the dominant movement track. Since a BA squad pays for its highest
 * single track (ground, jump, UMU — whichever is greater beyond base 1),
 * the helper `extraMPMassKg` takes the greatest of those three and bills
 * that many extra points.
 */
export const BA_EXTRA_MP_MASS_KG: Readonly<Record<BAWeightClass, number>> = {
  [BAWeightClass.PA_L]: 25,
  [BAWeightClass.LIGHT]: 40,
  [BAWeightClass.MEDIUM]: 80,
  [BAWeightClass.HEAVY]: 120,
  [BAWeightClass.ASSAULT]: 150,
};

/**
 * Weight-class limit table.
 * Values from Total Warfare / Tactical Operations construction rules.
 */
export const BA_WEIGHT_CLASS_LIMITS: Readonly<
  Record<BAWeightClass, BAWeightClassLimits>
> = {
  [BAWeightClass.PA_L]: {
    minMassKg: 80,
    maxMassKg: 400,
    maxArmorPoints: 2,
    maxGroundMP: 3,
    maxJumpMP: 3,
    vtolAllowed: false,
    maxUmuMP: 3,
  },
  [BAWeightClass.LIGHT]: {
    minMassKg: 401,
    maxMassKg: 750,
    maxArmorPoints: 5,
    maxGroundMP: 3,
    maxJumpMP: 3,
    vtolAllowed: true,
    maxUmuMP: 3,
  },
  [BAWeightClass.MEDIUM]: {
    minMassKg: 751,
    maxMassKg: 1000,
    maxArmorPoints: 8,
    maxGroundMP: 2,
    maxJumpMP: 3,
    vtolAllowed: true,
    maxUmuMP: 3,
  },
  [BAWeightClass.HEAVY]: {
    minMassKg: 1001,
    maxMassKg: 1500,
    maxArmorPoints: 10,
    maxGroundMP: 2,
    maxJumpMP: 2,
    vtolAllowed: false,
    maxUmuMP: 3,
  },
  [BAWeightClass.ASSAULT]: {
    minMassKg: 1501,
    maxMassKg: 2000,
    maxArmorPoints: 14,
    maxGroundMP: 1,
    maxJumpMP: 0,
    vtolAllowed: false,
    maxUmuMP: 3,
  },
};

// ============================================================================
// Movement
// ============================================================================

/**
 * Battle Armor movement type.
 * Governs which MP pools are relevant for this squad.
 */
export enum BAMovementType {
  GROUND = 'Ground',
  JUMP = 'Jump',
  VTOL = 'VTOL',
  UMU = 'UMU',
}

// ============================================================================
// Armor
// ============================================================================

/**
 * Battle Armor armor type.
 * Each type has a different kg-per-point cost and may impose slot requirements.
 */
export enum BAArmorType {
  STANDARD = 'Standard BA',
  STEALTH_BASIC = 'Stealth (Basic)',
  STEALTH_IMPROVED = 'Stealth (Improved)',
  STEALTH_PROTOTYPE = 'Stealth (Prototype)',
  MIMETIC = 'Mimetic',
  REACTIVE = 'Reactive',
  REFLECTIVE = 'Reflective',
  FIRE_RESISTANT = 'Fire-Resistant',
}

/**
 * Per-armor-type metadata for BA construction.
 */
export interface BAArmorTypeData {
  /** kg per armor point */
  readonly kgPerPoint: number;
  /** Whether a body slot is consumed by a camouflage generator */
  readonly requiresCamoBodySlot: boolean;
  /** Armor types only valid on certain weight classes (undefined = any) */
  readonly forbiddenClasses?: readonly BAWeightClass[];
}

/**
 * Armor type catalog.
 * Standard = 50 kg/pt, Stealth variants = 60 kg/pt, Mimetic = 60 kg/pt,
 * Reactive / Reflective = 50 kg/pt, Fire-Resistant = 50 kg/pt.
 * Mimetic is not available on Heavy or Assault per standard rules.
 */
export const BA_ARMOR_TYPE_DATA: Readonly<
  Record<BAArmorType, BAArmorTypeData>
> = {
  [BAArmorType.STANDARD]: {
    kgPerPoint: 50,
    requiresCamoBodySlot: false,
  },
  [BAArmorType.STEALTH_BASIC]: {
    kgPerPoint: 60,
    requiresCamoBodySlot: true,
  },
  [BAArmorType.STEALTH_IMPROVED]: {
    kgPerPoint: 60,
    requiresCamoBodySlot: true,
  },
  [BAArmorType.STEALTH_PROTOTYPE]: {
    kgPerPoint: 60,
    requiresCamoBodySlot: true,
  },
  [BAArmorType.MIMETIC]: {
    kgPerPoint: 60,
    requiresCamoBodySlot: true,
    forbiddenClasses: [BAWeightClass.HEAVY, BAWeightClass.ASSAULT],
  },
  [BAArmorType.REACTIVE]: {
    kgPerPoint: 50,
    requiresCamoBodySlot: false,
  },
  [BAArmorType.REFLECTIVE]: {
    kgPerPoint: 50,
    requiresCamoBodySlot: false,
  },
  [BAArmorType.FIRE_RESISTANT]: {
    kgPerPoint: 50,
    requiresCamoBodySlot: false,
  },
};

// ============================================================================
// Manipulators
// ============================================================================

/**
 * Battle Armor manipulator type.
 * Applies per arm on Biped chassis; Quad has no manipulators.
 */
export enum BAManipulator {
  NONE = 'None',
  BASIC_CLAW = 'Basic Claw',
  BATTLE_CLAW = 'Battle Claw',
  VIBRO_CLAW = 'Vibro Claw',
  HEAVY_CLAW = 'Heavy Claw',
  MINE_CLEARANCE = 'Mine Clearance',
  CARGO_LIFTER = 'Cargo Lifter',
  INDUSTRIAL_DRILL = 'Industrial Drill',
  MAGNET = 'Magnet',
}

/**
 * Manipulator capability metadata.
 */
export interface BAManipulatorData {
  /** Mass added to per-trooper weight (kg) */
  readonly massKg: number;
  /** Allows heavy weapon arm-mounting */
  readonly allowsHeavyWeapon: boolean;
  /** Enables vibro-blade bonus damage */
  readonly hasVibroBlade: boolean;
  /** Provides lift capability (Cargo Lifter) */
  readonly hasLiftCapability: boolean;
  /** Provides mine-detection / clearance */
  readonly hasMineClearance: boolean;
}

/**
 * Manipulator catalog.
 * Basic Claw is the free default on Biped; Heavy Claw gates heavy weapons.
 */
export const BA_MANIPULATOR_DATA: Readonly<
  Record<BAManipulator, BAManipulatorData>
> = {
  [BAManipulator.NONE]: {
    massKg: 0,
    allowsHeavyWeapon: false,
    hasVibroBlade: false,
    hasLiftCapability: false,
    hasMineClearance: false,
  },
  [BAManipulator.BASIC_CLAW]: {
    massKg: 0,
    allowsHeavyWeapon: false,
    hasVibroBlade: false,
    hasLiftCapability: false,
    hasMineClearance: false,
  },
  [BAManipulator.BATTLE_CLAW]: {
    massKg: 15,
    allowsHeavyWeapon: true,
    hasVibroBlade: false,
    hasLiftCapability: false,
    hasMineClearance: false,
  },
  [BAManipulator.VIBRO_CLAW]: {
    massKg: 20,
    allowsHeavyWeapon: false,
    hasVibroBlade: true,
    hasLiftCapability: false,
    hasMineClearance: false,
  },
  [BAManipulator.HEAVY_CLAW]: {
    massKg: 25,
    allowsHeavyWeapon: true,
    hasVibroBlade: false,
    hasLiftCapability: false,
    hasMineClearance: false,
  },
  [BAManipulator.MINE_CLEARANCE]: {
    massKg: 10,
    allowsHeavyWeapon: false,
    hasVibroBlade: false,
    hasLiftCapability: false,
    hasMineClearance: true,
  },
  [BAManipulator.CARGO_LIFTER]: {
    massKg: 15,
    allowsHeavyWeapon: false,
    hasVibroBlade: false,
    hasLiftCapability: true,
    hasMineClearance: false,
  },
  [BAManipulator.INDUSTRIAL_DRILL]: {
    massKg: 20,
    allowsHeavyWeapon: false,
    hasVibroBlade: false,
    hasLiftCapability: false,
    hasMineClearance: false,
  },
  [BAManipulator.MAGNET]: {
    massKg: 10,
    allowsHeavyWeapon: false,
    hasVibroBlade: false,
    hasLiftCapability: false,
    hasMineClearance: false,
  },
};

// ============================================================================
// Equipment location (BA-specific; leg slots added over existing enum)
// ============================================================================

/**
 * Battle Armor mounting location used in construction logic.
 * Distinct from the runtime BattleArmorLocation to include leg slots.
 */
export enum BALocation {
  BODY = 'Body',
  LEFT_ARM = 'Left Arm',
  RIGHT_ARM = 'Right Arm',
  LEFT_LEG = 'Left Leg',
  RIGHT_LEG = 'Right Leg',
}

/**
 * Slot capacity per BA location (for Biped).
 * Quad chassis zeroes out arm slots; both chassis share leg counts.
 */
export const BA_BIPED_SLOT_CAPACITY: Readonly<Record<BALocation, number>> = {
  [BALocation.BODY]: 2,
  [BALocation.LEFT_ARM]: 2,
  [BALocation.RIGHT_ARM]: 2,
  [BALocation.LEFT_LEG]: 1,
  [BALocation.RIGHT_LEG]: 1,
};

/**
 * Slot capacity for Quad chassis (no arm slots).
 */
export const BA_QUAD_SLOT_CAPACITY: Readonly<Record<BALocation, number>> = {
  [BALocation.BODY]: 2,
  [BALocation.LEFT_ARM]: 0,
  [BALocation.RIGHT_ARM]: 0,
  [BALocation.LEFT_LEG]: 1,
  [BALocation.RIGHT_LEG]: 1,
};

// ============================================================================
// Weapon / Equipment mount interfaces
// ============================================================================

/**
 * Classifies whether a weapon or piece of equipment is considered heavy
 * (requires Battle Claw or Heavy Claw for arm mounting).
 */
export type BAWeaponWeight = 'light' | 'heavy';

/**
 * A single weapon or equipment item mounted on a BA trooper.
 */
export interface IBAWeaponMount {
  /** Equipment ID from the equipment catalog */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Mounting location */
  readonly location: BALocation;
  /** Mass contribution to per-trooper weight (kg) */
  readonly massKg: number;
  /** Heavy weapons require Battle Claw or Heavy Claw */
  readonly weaponWeight: BAWeaponWeight;
  /** True if this occupies an AP weapon slot rather than a regular slot */
  readonly isAPWeapon: boolean;
}

/**
 * General equipment item mounted on a BA trooper (non-weapon).
 */
export interface IBAEquipmentMount {
  /** Equipment ID from the equipment catalog */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Mounting location */
  readonly location: BALocation;
  /** Mass contribution to per-trooper weight (kg) */
  readonly massKg: number;
  /** Number of slots consumed at the given location */
  readonly slotsUsed: number;
}

// ============================================================================
// Anti-Mech Equipment
// ============================================================================

/**
 * Anti-mech and special equipment catalog entries.
 */
export interface BAAntiMechEquipment {
  readonly id: string;
  readonly name: string;
  /** Mass added to per-trooper weight (kg) */
  readonly massKg: number;
  /** Mounting location */
  readonly location: BALocation;
  /** Slots consumed */
  readonly slotsUsed: number;
  /** Grants swarm attack eligibility */
  readonly grantsSwarm: boolean;
  /** Additional jump MP provided */
  readonly bonusJumpMP: number;
  /** Weight class restriction (undefined = any class) */
  readonly restrictedToClass?: BAWeightClass;
}

/**
 * Catalog of standard anti-mech equipment.
 */
export const BA_ANTI_MECH_EQUIPMENT: readonly BAAntiMechEquipment[] = [
  {
    id: 'ba-magnetic-clamp',
    name: 'Magnetic Clamp',
    massKg: 15,
    location: BALocation.BODY,
    slotsUsed: 1,
    grantsSwarm: true,
    bonusJumpMP: 0,
  },
  {
    id: 'ba-mechanical-jump-booster',
    name: 'Mechanical Jump Booster',
    massKg: 30,
    location: BALocation.BODY,
    slotsUsed: 1,
    grantsSwarm: false,
    bonusJumpMP: 1,
  },
  {
    id: 'ba-partial-wing',
    name: 'Partial Wing',
    massKg: 30,
    location: BALocation.BODY,
    slotsUsed: 1,
    grantsSwarm: false,
    bonusJumpMP: 0,
    restrictedToClass: BAWeightClass.LIGHT,
  },
  {
    id: 'ba-detachable-weapon-pack',
    name: 'Detachable Weapon Pack',
    massKg: 40,
    location: BALocation.BODY,
    slotsUsed: 1,
    grantsSwarm: false,
    bonusJumpMP: 0,
  },
];

// ============================================================================
// Squad Composition
// ============================================================================

/**
 * Squad tech-base defaults.
 * IS defaults to 4 troopers; Clan defaults to 5 (Elemental Point).
 */
export function defaultSquadSize(techBase: TechBase): number {
  return techBase === TechBase.CLAN ? 5 : 4;
}

/**
 * Minimum and maximum legal squad sizes.
 * Sizes outside 4 (IS) / 5 (Clan) generate warnings, not errors.
 */
export const BA_SQUAD_SIZE_MIN = 1;
export const BA_SQUAD_SIZE_MAX = 6;

// ============================================================================
// Construction validation error codes
// ============================================================================

/**
 * Validation rule identifiers for the BA construction pipeline.
 */
export const BA_VALIDATION_RULES = {
  VAL_BA_CLASS: 'VAL-BA-CLASS',
  VAL_BA_ARMOR: 'VAL-BA-ARMOR',
  VAL_BA_MP: 'VAL-BA-MP',
  VAL_BA_MANIPULATOR: 'VAL-BA-MANIPULATOR',
  VAL_BA_SQUAD: 'VAL-BA-SQUAD',
  VAL_BA_MOVE_TYPE: 'VAL-BA-MOVE-TYPE',
} as const;

export type BAValidationRuleId =
  (typeof BA_VALIDATION_RULES)[keyof typeof BA_VALIDATION_RULES];

// ============================================================================
// IBattleArmorUnit — main construction interface
// ============================================================================

/**
 * Full construction-time representation of a Battle Armor squad.
 * This is what the construction utilities accept and validate.
 */
export interface IBattleArmorUnit {
  // --- Identity ---
  readonly id: string;
  readonly name: string;
  readonly chassis: string;
  readonly model: string;
  readonly techBase: TechBase;

  // --- Classification ---
  readonly chassisType: BAChassisType;
  readonly weightClass: BAWeightClass;

  // --- Squad ---
  /** Number of troopers (1–6; warn outside 4/5 default) */
  readonly squadSize: number;

  // --- Movement ---
  readonly movementType: BAMovementType;
  readonly groundMP: number;
  readonly jumpMP: number;
  readonly umuMP: number;
  readonly hasMechanicalJumpBoosters: boolean;

  // --- Armor ---
  readonly armorType: BAArmorType;
  /** Armor points per trooper */
  readonly armorPointsPerTrooper: number;

  // --- Manipulators (Biped only) ---
  readonly leftManipulator: BAManipulator;
  readonly rightManipulator: BAManipulator;

  // --- Weapons & Equipment ---
  readonly weapons: readonly IBAWeaponMount[];
  readonly equipment: readonly IBAEquipmentMount[];

  // --- Anti-Mech ---
  readonly hasMagneticClamp: boolean;
  readonly hasMechanicalJumpBooster: boolean;
  readonly hasPartialWing: boolean;
  readonly hasDetachableWeaponPack: boolean;

  // --- Derived ---
  /**
   * Latest BV breakdown produced by `calculateBattleArmorBV`. Derived from
   * the construction inputs above and kept on the unit so UI layers and
   * downstream consumers can read BV directly from the unit state instead
   * of recomputing locally.
   *
   * Matches the shape called out in the spec delta
   * (`perTrooper.defensive`, `perTrooper.offensive`, `squadTotal`,
   * `pilotMultiplier`, `final`).
   *
   * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
   *       Requirement: BA BV Breakdown on Unit State
   */
  readonly bvBreakdown?: import('@/utils/construction/battlearmor/battleArmorBV').IBABreakdown;
}
