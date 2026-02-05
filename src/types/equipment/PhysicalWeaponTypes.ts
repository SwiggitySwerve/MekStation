/**
 * Physical Weapon Type Definitions
 *
 * Defines melee and physical weapons for BattleMechs.
 *
 * @spec openspec/specs/physical-weapons-system/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';

/**
 * Physical weapon type enumeration
 */
export enum PhysicalWeaponType {
  HATCHET = 'Hatchet',
  SWORD = 'Sword',
  CLAWS = 'Claws',
  MACE = 'Mace',
  LANCE = 'Lance',
  FLAIL = 'Flail',
  WRECKING_BALL = 'Wrecking Ball',
  TALONS = 'Talons',
  RETRACTABLE_BLADE = 'Retractable Blade',
}

/**
 * Physical weapon interface
 */
export interface IPhysicalWeapon {
  readonly type: PhysicalWeaponType;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** Weight formula type */
  readonly weightFormula: 'tonnage_divisor' | 'fixed';
  /** For tonnage_divisor: weight = ceil(tonnage / divisor) */
  readonly tonnageDivisor?: number;
  /** For fixed: exact weight */
  readonly fixedWeight?: number;
  /** Damage formula type */
  readonly damageFormula: 'tonnage_divisor' | 'tonnage_divisor_plus' | 'fixed';
  /** Damage divisor */
  readonly damageDivisor?: number;
  /** Damage bonus (for tonnage_divisor_plus) */
  readonly damageBonus?: number;
  /** Fixed damage */
  readonly fixedDamage?: number;
  /** Critical slots per weapon */
  readonly criticalSlots: number;
  /** Requires lower arm actuator */
  readonly requiresLowerArm: boolean;
  /** Requires hand actuator */
  readonly requiresHand: boolean;
  /** Valid locations for mounting */
  readonly validLocations: readonly string[];
  /** Introduction year */
  readonly introductionYear: number;
}

/**
 * Physical weapon definitions
 */
export const PHYSICAL_WEAPON_DEFINITIONS: readonly IPhysicalWeapon[] = [
  {
    type: PhysicalWeaponType.HATCHET,
    name: 'Hatchet',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weightFormula: 'tonnage_divisor',
    tonnageDivisor: 15,
    damageFormula: 'tonnage_divisor',
    damageDivisor: 5,
    criticalSlots: 0, // Calculated: 1 per 15 tons
    requiresLowerArm: true,
    requiresHand: true,
    validLocations: ['Left Arm', 'Right Arm'],
    introductionYear: 2515,
  },
  {
    type: PhysicalWeaponType.SWORD,
    name: 'Sword',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weightFormula: 'tonnage_divisor',
    tonnageDivisor: 15,
    damageFormula: 'tonnage_divisor_plus',
    damageDivisor: 10,
    damageBonus: 1,
    criticalSlots: 0, // Calculated
    requiresLowerArm: true,
    requiresHand: true,
    validLocations: ['Left Arm', 'Right Arm'],
    introductionYear: 3058,
  },
  {
    type: PhysicalWeaponType.CLAWS,
    name: 'Claws',
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    weightFormula: 'tonnage_divisor',
    tonnageDivisor: 15,
    damageFormula: 'tonnage_divisor',
    damageDivisor: 7,
    criticalSlots: 0,
    requiresLowerArm: true,
    requiresHand: false, // Replaces hand
    validLocations: ['Left Arm', 'Right Arm'],
    introductionYear: 3060,
  },
  {
    type: PhysicalWeaponType.MACE,
    name: 'Mace',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightFormula: 'tonnage_divisor',
    tonnageDivisor: 10,
    damageFormula: 'tonnage_divisor',
    damageDivisor: 4,
    criticalSlots: 0,
    requiresLowerArm: true,
    requiresHand: true,
    validLocations: ['Left Arm', 'Right Arm'],
    introductionYear: 3061,
  },
  {
    type: PhysicalWeaponType.LANCE,
    name: 'Lance',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightFormula: 'tonnage_divisor',
    tonnageDivisor: 20,
    damageFormula: 'tonnage_divisor',
    damageDivisor: 5, // Double when charging
    criticalSlots: 0,
    requiresLowerArm: true,
    requiresHand: true,
    validLocations: ['Left Arm', 'Right Arm'],
    introductionYear: 3064,
  },
  {
    type: PhysicalWeaponType.TALONS,
    name: 'Talons',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    weightFormula: 'tonnage_divisor',
    tonnageDivisor: 15,
    damageFormula: 'tonnage_divisor_plus',
    damageDivisor: 5,
    damageBonus: 0, // Adds to standard kick damage
    criticalSlots: 0,
    requiresLowerArm: false, // Leg mount
    requiresHand: false,
    validLocations: ['Left Leg', 'Right Leg'],
    introductionYear: 3072,
  },
  {
    type: PhysicalWeaponType.RETRACTABLE_BLADE,
    name: 'Retractable Blade',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightFormula: 'tonnage_divisor',
    tonnageDivisor: 20,
    damageFormula: 'tonnage_divisor',
    damageDivisor: 10,
    criticalSlots: 0,
    requiresLowerArm: true,
    requiresHand: false, // Can use with no hand
    validLocations: ['Left Arm', 'Right Arm'],
    introductionYear: 3069,
  },
  {
    type: PhysicalWeaponType.FLAIL,
    name: 'Flail',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightFormula: 'tonnage_divisor',
    tonnageDivisor: 10,
    damageFormula: 'tonnage_divisor',
    damageDivisor: 4,
    criticalSlots: 0,
    requiresLowerArm: true,
    requiresHand: true,
    validLocations: ['Left Arm', 'Right Arm'],
    introductionYear: 3064,
  },
  {
    type: PhysicalWeaponType.WRECKING_BALL,
    name: 'Wrecking Ball',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightFormula: 'tonnage_divisor',
    tonnageDivisor: 10,
    damageFormula: 'tonnage_divisor',
    damageDivisor: 5,
    criticalSlots: 0,
    requiresLowerArm: false, // Mounted on torso
    requiresHand: false,
    validLocations: ['Left Torso', 'Right Torso'],
    introductionYear: 3054,
  },
] as const;

/**
 * Get physical weapon definition by type
 */
export function getPhysicalWeaponDefinition(
  type: PhysicalWeaponType,
): IPhysicalWeapon | undefined {
  return PHYSICAL_WEAPON_DEFINITIONS.find((w) => w.type === type);
}

/**
 * Calculate physical weapon weight
 */
export function calculatePhysicalWeaponWeight(
  type: PhysicalWeaponType,
  mechTonnage: number,
): number {
  const def = getPhysicalWeaponDefinition(type);
  if (!def) return 0;

  if (def.weightFormula === 'fixed') {
    return def.fixedWeight ?? 0;
  }

  return Math.ceil(mechTonnage / (def.tonnageDivisor ?? 15));
}

/**
 * Calculate physical weapon damage
 */
export function calculatePhysicalWeaponDamage(
  type: PhysicalWeaponType,
  mechTonnage: number,
): number {
  const def = getPhysicalWeaponDefinition(type);
  if (!def) return 0;

  if (def.damageFormula === 'fixed') {
    return def.fixedDamage ?? 0;
  }

  const baseDamage = Math.floor(mechTonnage / (def.damageDivisor ?? 5));

  if (def.damageFormula === 'tonnage_divisor_plus') {
    return baseDamage + (def.damageBonus ?? 0);
  }

  return baseDamage;
}

/**
 * Calculate physical weapon critical slots
 */
export function calculatePhysicalWeaponSlots(
  type: PhysicalWeaponType,
  mechTonnage: number,
): number {
  const def = getPhysicalWeaponDefinition(type);
  if (!def) return 0;

  // Most physical weapons take 1 slot per 15 tons (rounded up)
  if (
    def.type === PhysicalWeaponType.HATCHET ||
    def.type === PhysicalWeaponType.SWORD
  ) {
    return Math.ceil(mechTonnage / 15);
  }

  return Math.ceil(mechTonnage / 15);
}

/**
 * Validate physical weapon placement
 */
export function validatePhysicalWeaponPlacement(
  type: PhysicalWeaponType,
  location: string,
  hasLowerArmActuator: boolean,
  hasHandActuator: boolean,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const def = getPhysicalWeaponDefinition(type);

  if (!def) {
    errors.push(`Unknown physical weapon type: ${type}`);
    return { isValid: false, errors };
  }

  if (!def.validLocations.includes(location)) {
    errors.push(`${def.name} cannot be mounted in ${location}`);
  }

  if (def.requiresLowerArm && !hasLowerArmActuator) {
    errors.push(`${def.name} requires lower arm actuator`);
  }

  if (def.requiresHand && !hasHandActuator) {
    errors.push(`${def.name} requires hand actuator`);
  }

  return { isValid: errors.length === 0, errors };
}
