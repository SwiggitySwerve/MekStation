/**
 * Personnel Unit Interfaces
 *
 * Defines interfaces for Battle Armor and Infantry units.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.1
 */

import { UnitType } from './BattleMechInterfaces';
import { ISquadUnit, SquadMotionType } from './BaseUnitInterfaces';
import { BattleArmorLocation, ProtoMechLocation } from '../construction/UnitLocation';

// ============================================================================
// Battle Armor Types
// ============================================================================

/**
 * Battle Armor chassis type
 */
export enum BattleArmorChassisType {
  BIPED = 'Biped',
  QUAD = 'Quad',
}

/**
 * Battle Armor weight class
 */
export enum BattleArmorWeightClass {
  PA_L = 'PA(L)',
  LIGHT = 'Light',
  MEDIUM = 'Medium',
  HEAVY = 'Heavy',
  ASSAULT = 'Assault',
}

/**
 * Battle Armor manipulator type
 */
export enum ManipulatorType {
  NONE = 'None',
  ARMORED_GLOVE = 'Armored Glove',
  BASIC = 'Basic',
  BASIC_MINE_CLEARANCE = 'Basic/Mine Clearance',
  BATTLE = 'Battle',
  BATTLE_VIBRO = 'Battle Vibro',
  HEAVY_BATTLE = 'Heavy Battle',
  HEAVY_BATTLE_VIBRO = 'Heavy Battle Vibro',
  CARGO_LIFTER = 'Cargo Lifter',
  INDUSTRIAL_DRILL = 'Industrial Drill',
  SALVAGE_ARM = 'Salvage Arm',
}

// ============================================================================
// Battle Armor Equipment
// ============================================================================

/**
 * Battle Armor-mounted equipment item
 */
export interface IBattleArmorMountedEquipment {
  /** Unique mount ID */
  readonly id: string;
  /** Equipment definition ID */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Location (Squad, Body, Left Arm, Right Arm, Turret) */
  readonly location: BattleArmorLocation;
  /** Is this anti-personnel mount equipment */
  readonly isAPMount: boolean;
  /** Is this turret-mounted */
  readonly isTurretMounted: boolean;
  /** Is this modular (can be swapped in field) */
  readonly isModular: boolean;
}

// ============================================================================
// Battle Armor Interface
// ============================================================================

/**
 * Interface for Battle Armor units
 */
export interface IBattleArmor extends ISquadUnit {
  readonly unitType: UnitType.BATTLE_ARMOR;

  /** Chassis type (biped or quad) */
  readonly chassisType: BattleArmorChassisType;

  /** Weight class */
  readonly baWeightClass: BattleArmorWeightClass;

  /** Weight per trooper (kg) */
  readonly weightPerTrooper: number;

  /** Squad size (typically 4-6) */
  readonly squadSize: number;

  /** Left arm manipulator */
  readonly leftManipulator: ManipulatorType;

  /** Right arm manipulator */
  readonly rightManipulator: ManipulatorType;

  /** Motion type */
  readonly motionType: SquadMotionType;

  /** Jump MP (if jump capable) */
  readonly jumpMP: number;

  /** Has mechanical jump boosters (instead of jump jets) */
  readonly hasMechanicalJumpBoosters: boolean;

  /** UMU MP (underwater maneuvering unit) */
  readonly umuMP: number;

  /** Armor type code */
  readonly armorType: number;

  /** Armor points per trooper */
  readonly armorPerTrooper: number;

  /** Equipment mounted on this BA */
  readonly equipment: readonly IBattleArmorMountedEquipment[];

  // ===== BA-Specific Options =====

  /** Has anti-personnel weapon mount */
  readonly hasAPMount: boolean;

  /** Has modular weapon mount */
  readonly hasModularMount: boolean;

  /** Has turret mount */
  readonly hasTurretMount: boolean;

  /** Has stealth system */
  readonly hasStealthSystem: boolean;

  /** Stealth system type */
  readonly stealthType?: string;

  /** Has mimetic armor */
  readonly hasMimeticArmor: boolean;

  /** Has fire-resistant armor */
  readonly hasFireResistantArmor: boolean;

  // ===== Special Abilities =====

  /** Can swarm attack mechs */
  readonly canSwarm: boolean;

  /** Can make leg attacks */
  readonly canLegAttack: boolean;

  /** Can mount on OmniMechs */
  readonly canMountOmni: boolean;

  /** Can perform anti-mech attacks */
  readonly canAntiMech: boolean;
}

// ============================================================================
// Infantry Types
// ============================================================================

/**
 * Infantry primary weapon type
 */
export enum InfantryPrimaryWeaponType {
  RIFLE = 'Rifle',
  LASER = 'Laser',
  SRM = 'SRM',
  FLAMER = 'Flamer',
  MACHINE_GUN = 'Machine Gun',
  AUTO_RIFLE = 'Auto-Rifle',
  NEEDLER = 'Needler',
  GYROJET = 'Gyrojet',
  SUPPORT = 'Support',
  ARCHAIC = 'Archaic',
}

/**
 * Infantry armor kit type
 */
export enum InfantryArmorKit {
  NONE = 'None',
  STANDARD = 'Standard',
  FLAK = 'Flak',
  ABLATIVE = 'Ablative',
  SNEAK_CAMO = 'Sneak (Camo)',
  SNEAK_IR = 'Sneak (IR)',
  SNEAK_ECM = 'Sneak (ECM)',
  SNEAK_CAMO_IR = 'Sneak (Camo/IR)',
  SNEAK_IR_ECM = 'Sneak (IR/ECM)',
  SNEAK_COMPLETE = 'Sneak (Complete)',
  CLAN = 'Clan',
  ENVIRONMENTAL = 'Environmental',
}

/**
 * Infantry specialization
 */
export enum InfantrySpecialization {
  NONE = 'None',
  ANTI_MECH = 'Anti-Mech',
  PARATROOPER = 'Paratrooper',
  MOUNTAIN = 'Mountain',
  MARINE = 'Marine',
  XCT = 'XCT',
  TAG = 'TAG',
  ENGINEER = 'Engineer',
}

// ============================================================================
// Infantry Equipment
// ============================================================================

/**
 * Infantry field gun configuration
 */
export interface IInfantryFieldGun {
  /** Equipment ID of the field gun */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Number of crew required */
  readonly crew: number;
}

// ============================================================================
// Infantry Interface
// ============================================================================

/**
 * Interface for conventional Infantry units
 */
export interface IInfantry extends ISquadUnit {
  readonly unitType: UnitType.INFANTRY;

  /** Squad size (soldiers per squad) */
  readonly squadSize: number;

  /** Number of squads in platoon */
  readonly numberOfSquads: number;

  /** Total platoon strength */
  readonly platoonStrength: number;

  /** Motion type */
  readonly motionType: SquadMotionType;

  /** Primary weapon type */
  readonly primaryWeapon: string;

  /** Primary weapon equipment ID */
  readonly primaryWeaponId?: string;

  /** Secondary weapon (if any) */
  readonly secondaryWeapon?: string;

  /** Secondary weapon equipment ID */
  readonly secondaryWeaponId?: string;

  /** Number of secondary weapons in squad */
  readonly secondaryWeaponCount: number;

  /** Armor kit type */
  readonly armorKit: InfantryArmorKit;

  /** Specialization */
  readonly specialization: InfantrySpecialization;

  /** Field guns (if any) */
  readonly fieldGuns: readonly IInfantryFieldGun[];

  // ===== Infantry-Specific Options =====

  /** Has anti-mech training */
  readonly hasAntiMechTraining: boolean;

  /** Is augmented (cybernetics) */
  readonly isAugmented: boolean;

  /** Augmentation type */
  readonly augmentationType?: string;

  /** Can make swarm attacks */
  readonly canSwarm: boolean;

  /** Can make leg attacks */
  readonly canLegAttack: boolean;
}

// ============================================================================
// ProtoMech Interface
// ============================================================================

// ProtoMechLocation is imported from ../construction/UnitLocation

/**
 * ProtoMech-mounted equipment item
 */
export interface IProtoMechMountedEquipment {
  /** Unique mount ID */
  readonly id: string;
  /** Equipment definition ID */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
  /** Location */
  readonly location: ProtoMechLocation;
  /** Linked ammunition ID */
  readonly linkedAmmoId?: string;
}

/**
 * Interface for ProtoMechs
 */
export interface IProtoMech extends ISquadUnit {
  readonly unitType: UnitType.PROTOMECH;

  /** Weight per ProtoMech (tons) */
  readonly weightPerUnit: number;

  /** Point size (typically 5) */
  readonly pointSize: number;

  /** Engine rating */
  readonly engineRating: number;

  /** Cruise MP */
  readonly cruiseMP: number;

  /** Jump MP */
  readonly jumpMP: number;

  /** Has main gun mount */
  readonly hasMainGun: boolean;

  /** Armor per location */
  readonly armorByLocation: Record<ProtoMechLocation, number>;

  /** Internal structure per location */
  readonly structureByLocation: Record<ProtoMechLocation, number>;

  /** Equipment mounted on this ProtoMech */
  readonly equipment: readonly IProtoMechMountedEquipment[];

  // ===== ProtoMech-Specific Options =====

  /** Is this a glider (has extended jump) */
  readonly isGlider: boolean;

  /** Is this a quad ProtoMech */
  readonly isQuad: boolean;

  /** Has myomer booster */
  readonly hasMyomerBooster: boolean;

  /** Has magnetic clamps */
  readonly hasMagneticClamps: boolean;

  /** Has extended torso twist */
  readonly hasExtendedTorsoTwist: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if unit is Battle Armor
 */
export function isBattleArmor(unit: { unitType: UnitType }): unit is IBattleArmor {
  return unit.unitType === UnitType.BATTLE_ARMOR;
}

/**
 * Check if unit is Infantry
 */
export function isInfantry(unit: { unitType: UnitType }): unit is IInfantry {
  return unit.unitType === UnitType.INFANTRY;
}

/**
 * Check if unit is ProtoMech
 */
export function isProtoMech(unit: { unitType: UnitType }): unit is IProtoMech {
  return unit.unitType === UnitType.PROTOMECH;
}

/**
 * Check if unit is any personnel type
 */
export function isPersonnelUnit(
  unit: { unitType: UnitType }
): unit is IBattleArmor | IInfantry | IProtoMech {
  return (
    unit.unitType === UnitType.BATTLE_ARMOR ||
    unit.unitType === UnitType.INFANTRY ||
    unit.unitType === UnitType.PROTOMECH
  );
}
