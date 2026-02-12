/**
 * Physical Attack System
 * Implements BattleTech physical attack calculations: punch, kick, charge, DFA, push,
 * and melee weapons (hatchet, sword, mace).
 *
 * All functions follow immutable patterns and use injectable DiceRoller.
 *
 * @spec openspec/changes/full-combat-parity/specs/physical-attack-system/spec.md
 * @spec openspec/changes/full-combat-parity/specs/physical-weapons-system/spec.md
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { IComponentDamageState, IUnitGameState } from '@/types/gameplay';
import { CombatLocation } from '@/types/gameplay';

import { D6Roller } from './hitLocation';

// =============================================================================
// Types
// =============================================================================

/** Physical attack types */
export type PhysicalAttackType =
  | 'punch'
  | 'kick'
  | 'charge'
  | 'dfa'
  | 'push'
  | 'hatchet'
  | 'sword'
  | 'mace';

/** Input for physical attack resolution */
export interface IPhysicalAttackInput {
  /** Attacker's tonnage */
  readonly attackerTonnage: number;
  /** Attacker's piloting skill */
  readonly pilotingSkill: number;
  /** Component damage state for actuator checks */
  readonly componentDamage: IComponentDamageState;
  /** Attack type */
  readonly attackType: PhysicalAttackType;
  /** Which arm is punching (for punch/melee weapons) */
  readonly arm?: 'left' | 'right';
  /** Hexes moved (for charge) */
  readonly hexesMoved?: number;
  /** Attacker's current heat (for TSM check) */
  readonly heat?: number;
  /** Whether attacker has TSM installed */
  readonly hasTSM?: boolean;
  /** Whether attacker is underwater (depth 2+) */
  readonly isUnderwater?: boolean;
  /** Weapon IDs fired this turn (from the arm, for restrictions) */
  readonly weaponsFiredFromArm?: readonly string[];
  /** Is attacker prone? */
  readonly attackerProne?: boolean;
  /** Target's tonnage (for charge return damage) */
  readonly targetTonnage?: number;
}

/** Result of a physical attack to-hit calculation */
export interface IPhysicalToHitResult {
  /** Base target number */
  readonly baseToHit: number;
  /** Final target number after all modifiers */
  readonly finalToHit: number;
  /** Individual modifiers applied */
  readonly modifiers: readonly IPhysicalModifier[];
  /** Whether the attack is allowed */
  readonly allowed: boolean;
  /** Reason if not allowed */
  readonly restrictionReason?: string;
}

/** A to-hit modifier */
export interface IPhysicalModifier {
  readonly name: string;
  readonly value: number;
  readonly source: string;
}

/** Result of physical attack damage calculation */
export interface IPhysicalDamageResult {
  /** Damage to target */
  readonly targetDamage: number;
  /** Damage to attacker (charge/DFA) */
  readonly attackerDamage: number;
  /** Attacker leg damage per leg (DFA only) */
  readonly attackerLegDamagePerLeg: number;
  /** Whether target must make PSR */
  readonly targetPSR: boolean;
  /** Whether attacker must make PSR */
  readonly attackerPSR: boolean;
  /** Attacker PSR modifier (e.g., +4 for DFA miss) */
  readonly attackerPSRModifier: number;
  /** Hit location table to use */
  readonly hitTable: 'punch' | 'kick';
  /** Whether target is displaced (push) */
  readonly targetDisplaced: boolean;
}

/** Result of resolving a physical attack (after dice roll) */
export interface IPhysicalAttackResult {
  /** Attack type */
  readonly attackType: PhysicalAttackType;
  /** To-hit target number */
  readonly toHitNumber: number;
  /** Roll result */
  readonly roll: number;
  /** Did it hit? */
  readonly hit: boolean;
  /** Damage dealt to target (if hit) */
  readonly targetDamage: number;
  /** Damage dealt to attacker (charge/DFA) */
  readonly attackerDamage: number;
  /** Attacker leg damage per leg (DFA) */
  readonly attackerLegDamagePerLeg: number;
  /** Target must make PSR */
  readonly targetPSR: boolean;
  /** Attacker must make PSR */
  readonly attackerPSR: boolean;
  /** Attacker PSR modifier */
  readonly attackerPSRModifier: number;
  /** Hit location (if hit) */
  readonly hitLocation?: CombatLocation;
  /** Whether target is displaced */
  readonly targetDisplaced: boolean;
}

// =============================================================================
// Punch Hit Location Table (1d6)
// =============================================================================

/**
 * Punch hit location table: 1d6
 * 1=LA, 2=LT, 3=CT, 4=RT, 5=RA, 6=Head
 */
export const PUNCH_HIT_TABLE: Readonly<Record<number, CombatLocation>> = {
  1: 'left_arm',
  2: 'left_torso',
  3: 'center_torso',
  4: 'right_torso',
  5: 'right_arm',
  6: 'head',
};

/**
 * Kick hit location table: 1d6
 * 1-3 = right leg, 4-6 = left leg
 */
export const KICK_HIT_TABLE: Readonly<Record<number, CombatLocation>> = {
  1: 'right_leg',
  2: 'right_leg',
  3: 'right_leg',
  4: 'left_leg',
  5: 'left_leg',
  6: 'left_leg',
};

// =============================================================================
// TSM Heat Threshold
// =============================================================================

/** TSM activates at heat 9+ and doubles weight-based melee damage */
export const TSM_ACTIVATION_HEAT = 9;

// =============================================================================
// Restriction Checks
// =============================================================================

/**
 * Check if a punch attack is allowed.
 * Cannot punch if:
 * - Shoulder actuator destroyed
 * - Arm fired weapons this turn
 * - Unit has no arm (destroyed)
 */
export function canPunch(input: IPhysicalAttackInput): {
  allowed: boolean;
  reason?: string;
} {
  const actuators = input.componentDamage.actuators;

  // Shoulder destroyed = cannot punch
  if (actuators[ActuatorType.SHOULDER]) {
    return { allowed: false, reason: 'Shoulder actuator destroyed' };
  }

  // Arm fired weapon this turn
  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
    };
  }

  return { allowed: true };
}

/**
 * Check if a kick attack is allowed.
 * Cannot kick if:
 * - Unit is prone
 * - Hip actuator destroyed
 */
export function canKick(input: IPhysicalAttackInput): {
  allowed: boolean;
  reason?: string;
} {
  if (input.attackerProne) {
    return { allowed: false, reason: 'Cannot kick while prone' };
  }

  const actuators = input.componentDamage.actuators;
  if (actuators[ActuatorType.HIP]) {
    return { allowed: false, reason: 'Hip actuator destroyed' };
  }

  return { allowed: true };
}

/**
 * Check if a melee weapon attack is allowed.
 * Requires functional lower arm and hand actuator in the weapon's arm.
 */
export function canMeleeWeapon(input: IPhysicalAttackInput): {
  allowed: boolean;
  reason?: string;
} {
  const actuators = input.componentDamage.actuators;

  // Arm fired weapon this turn
  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
    };
  }

  // Shoulder destroyed
  if (actuators[ActuatorType.SHOULDER]) {
    return { allowed: false, reason: 'Shoulder actuator destroyed' };
  }

  // Requires lower arm actuator
  if (actuators[ActuatorType.LOWER_ARM]) {
    return { allowed: false, reason: 'Lower arm actuator destroyed' };
  }

  // Requires hand actuator
  if (actuators[ActuatorType.HAND]) {
    return { allowed: false, reason: 'Hand actuator destroyed' };
  }

  return { allowed: true };
}

// =============================================================================
// To-Hit Calculations
// =============================================================================

/**
 * Calculate punch to-hit.
 * Base: piloting skill
 * Modifiers: +2 upper arm destroyed, +2 lower arm destroyed, +1 hand destroyed
 */
export function calculatePunchToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canPunch(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
    };
  }

  const modifiers: IPhysicalModifier[] = [];
  const actuators = input.componentDamage.actuators;

  if (actuators[ActuatorType.UPPER_ARM]) {
    modifiers.push({
      name: 'Upper arm actuator destroyed',
      value: 2,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.LOWER_ARM]) {
    modifiers.push({
      name: 'Lower arm actuator destroyed',
      value: 2,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.HAND]) {
    modifiers.push({
      name: 'Hand actuator destroyed',
      value: 1,
      source: 'actuator',
    });
  }

  const totalMod = modifiers.reduce((s, m) => s + m.value, 0);

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + totalMod,
    modifiers,
    allowed: true,
  };
}

/**
 * Calculate kick to-hit.
 * Base: piloting skill - 2
 * Modifiers: actuator damage
 */
export function calculateKickToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canKick(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill - 2,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
    };
  }

  const modifiers: IPhysicalModifier[] = [];
  const actuators = input.componentDamage.actuators;

  if (actuators[ActuatorType.UPPER_LEG]) {
    modifiers.push({
      name: 'Upper leg actuator destroyed',
      value: 2,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.LOWER_LEG]) {
    modifiers.push({
      name: 'Lower leg actuator destroyed',
      value: 2,
      source: 'actuator',
    });
  }

  if (actuators[ActuatorType.FOOT]) {
    modifiers.push({
      name: 'Foot actuator destroyed',
      value: 1,
      source: 'actuator',
    });
  }

  const totalMod = modifiers.reduce((s, m) => s + m.value, 0);
  const baseToHit = input.pilotingSkill - 2;

  return {
    baseToHit,
    finalToHit: baseToHit + totalMod,
    modifiers,
    allowed: true,
  };
}

/**
 * Calculate charge to-hit.
 * Base: piloting skill + movement mods + skill differential
 */
export function calculateChargeToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const modifiers: IPhysicalModifier[] = [];

  return {
    baseToHit: input.pilotingSkill,
    finalToHit:
      input.pilotingSkill + modifiers.reduce((s, m) => s + m.value, 0),
    modifiers,
    allowed: true,
  };
}

/**
 * Calculate DFA to-hit.
 * Base: piloting skill + jump movement mods
 */
export function calculateDFAToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const modifiers: IPhysicalModifier[] = [];

  return {
    baseToHit: input.pilotingSkill,
    finalToHit:
      input.pilotingSkill + modifiers.reduce((s, m) => s + m.value, 0),
    modifiers,
    allowed: true,
  };
}

/**
 * Calculate push to-hit.
 * Base: piloting skill - 1
 */
export function calculatePushToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const baseToHit = input.pilotingSkill - 1;

  return {
    baseToHit,
    finalToHit: baseToHit,
    modifiers: [],
    allowed: true,
  };
}

/**
 * Calculate melee weapon to-hit.
 * Hatchet: piloting - 1
 * Sword: piloting - 2
 * Mace: piloting + 1
 */
export function calculateMeleeWeaponToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  const restriction = canMeleeWeapon(input);
  if (!restriction.allowed) {
    return {
      baseToHit: input.pilotingSkill,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: restriction.reason,
    };
  }

  let weaponMod = 0;
  switch (input.attackType) {
    case 'hatchet':
      weaponMod = -1;
      break;
    case 'sword':
      weaponMod = -2;
      break;
    case 'mace':
      weaponMod = 1;
      break;
  }

  const modifiers: IPhysicalModifier[] = [
    {
      name: `${input.attackType} modifier`,
      value: weaponMod,
      source: 'weapon',
    },
  ];

  return {
    baseToHit: input.pilotingSkill,
    finalToHit: input.pilotingSkill + weaponMod,
    modifiers,
    allowed: true,
  };
}

/**
 * Calculate to-hit for any physical attack type.
 */
export function calculatePhysicalToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  switch (input.attackType) {
    case 'punch':
      return calculatePunchToHit(input);
    case 'kick':
      return calculateKickToHit(input);
    case 'charge':
      return calculateChargeToHit(input);
    case 'dfa':
      return calculateDFAToHit(input);
    case 'push':
      return calculatePushToHit(input);
    case 'hatchet':
    case 'sword':
    case 'mace':
      return calculateMeleeWeaponToHit(input);
    default:
      return {
        baseToHit: Infinity,
        finalToHit: Infinity,
        modifiers: [],
        allowed: false,
        restrictionReason: `Unknown attack type`,
      };
  }
}

// =============================================================================
// Damage Calculations
// =============================================================================

/**
 * Get effective weight for damage calculations.
 * TSM doubles weight-based damage when heat >= 9.
 */
export function getEffectiveWeight(
  tonnage: number,
  heat: number = 0,
  hasTSM: boolean = false,
): number {
  if (hasTSM && heat >= TSM_ACTIVATION_HEAT) {
    return tonnage * 2;
  }
  return tonnage;
}

/**
 * Apply underwater halving to damage.
 */
export function applyUnderwaterModifier(
  damage: number,
  isUnderwater: boolean,
): number {
  if (isUnderwater) {
    return Math.floor(damage / 2);
  }
  return damage;
}

/**
 * Calculate punch damage.
 * Formula: ceil(weight / 10) per arm
 * Upper arm destroyed: halve damage
 * Lower arm destroyed: halve damage
 */
export function calculatePunchDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  let damage = Math.ceil(effectiveWeight / 10);

  const actuators = input.componentDamage.actuators;

  // Upper arm destroyed halves damage
  if (actuators[ActuatorType.UPPER_ARM]) {
    damage = Math.floor(damage / 2);
  }

  // Lower arm destroyed halves damage
  if (actuators[ActuatorType.LOWER_ARM]) {
    damage = Math.floor(damage / 2);
  }

  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

/**
 * Calculate kick damage.
 * Formula: floor(weight / 5)
 */
export function calculateKickDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  const damage = Math.floor(effectiveWeight / 5);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

/**
 * Calculate charge damage to target.
 * Formula: ceil(weight / 10) × (hexesMoved - 1)
 */
export function calculateChargeDamageToTarget(
  input: IPhysicalAttackInput,
): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  const hexesMoved = input.hexesMoved ?? 0;
  const multiplier = Math.max(0, hexesMoved - 1);
  const damage = Math.ceil(effectiveWeight / 10) * multiplier;
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

/**
 * Calculate charge damage to attacker (return damage from target's weight).
 * Formula: ceil(targetTonnage / 10)
 */
export function calculateChargeDamageToAttacker(
  input: IPhysicalAttackInput,
): number {
  const targetTonnage = input.targetTonnage ?? 0;
  const damage = Math.ceil(targetTonnage / 10);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

/**
 * Calculate DFA damage to target.
 * Formula: ceil(weight / 10) × 3
 */
export function calculateDFADamageToTarget(
  input: IPhysicalAttackInput,
): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  const damage = Math.ceil(effectiveWeight / 10) * 3;
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

/**
 * Calculate DFA damage to attacker (per leg).
 * Formula: ceil(weight / 5) total, split between both legs
 * Each leg takes ceil(weight / 5) / 2 (round up for odd)
 */
export function calculateDFADamageToAttacker(
  input: IPhysicalAttackInput,
): number {
  // Total attacker damage = ceil(weight / 5), split per leg
  const totalDamage = Math.ceil(input.attackerTonnage / 5);
  // Per leg = ceil(totalDamage / 2)
  return Math.ceil(totalDamage / 2);
}

/**
 * Calculate hatchet damage.
 * Formula: floor(weight / 5)
 */
export function calculateHatchetDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const damage = Math.floor(effectiveWeight / 5);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

/**
 * Calculate sword damage.
 * Formula: floor(weight / 10) + 1
 */
export function calculateSwordDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const damage = Math.floor(effectiveWeight / 10) + 1;
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

/**
 * Calculate mace damage.
 * Formula: floor(weight × 2 / 5)
 */
export function calculateMaceDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const damage = Math.floor((effectiveWeight * 2) / 5);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

/**
 * Calculate damage result for any physical attack type.
 */
export function calculatePhysicalDamage(
  input: IPhysicalAttackInput,
): IPhysicalDamageResult {
  switch (input.attackType) {
    case 'punch':
      return {
        targetDamage: calculatePunchDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };

    case 'kick':
      return {
        targetDamage: calculateKickDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: true, // Target PSR on hit
        attackerPSR: false, // Attacker PSR only on miss
        attackerPSRModifier: 0,
        hitTable: 'kick',
        targetDisplaced: false,
      };

    case 'charge':
      return {
        targetDamage: calculateChargeDamageToTarget(input),
        attackerDamage: calculateChargeDamageToAttacker(input),
        attackerLegDamagePerLeg: 0,
        targetPSR: true,
        attackerPSR: true,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };

    case 'dfa':
      return {
        targetDamage: calculateDFADamageToTarget(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: calculateDFADamageToAttacker(input),
        targetPSR: true,
        attackerPSR: true,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };

    case 'push':
      return {
        targetDamage: 0,
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: true,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: true,
      };

    case 'hatchet':
      return {
        targetDamage: calculateHatchetDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };

    case 'sword':
      return {
        targetDamage: calculateSwordDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };

    case 'mace':
      return {
        targetDamage: calculateMaceDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };

    default:
      return {
        targetDamage: 0,
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      };
  }
}

/**
 * Get damage result on a MISS for physical attacks that have miss consequences.
 * - Kick miss: attacker PSR
 * - DFA miss: attacker PSR +4
 */
export function getPhysicalMissConsequences(attackType: PhysicalAttackType): {
  attackerPSR: boolean;
  attackerPSRModifier: number;
} {
  switch (attackType) {
    case 'kick':
      return { attackerPSR: true, attackerPSRModifier: 0 };
    case 'dfa':
      return { attackerPSR: true, attackerPSRModifier: 4 };
    default:
      return { attackerPSR: false, attackerPSRModifier: 0 };
  }
}

// =============================================================================
// Hit Location Resolution
// =============================================================================

/**
 * Determine physical attack hit location.
 * Punch/DFA/melee weapons use 1d6 punch table.
 * Kick uses 1d6 kick table.
 */
export function determinePhysicalHitLocation(
  hitTable: 'punch' | 'kick',
  diceRoller: D6Roller,
): CombatLocation {
  const roll = diceRoller();
  // Clamp to 1-6
  const clamped = Math.max(1, Math.min(6, roll));

  if (hitTable === 'kick') {
    return KICK_HIT_TABLE[clamped];
  }
  return PUNCH_HIT_TABLE[clamped];
}

// =============================================================================
// Full Resolution
// =============================================================================

/**
 * Resolve a complete physical attack: to-hit check, damage, hit location.
 *
 * @param input - Physical attack parameters
 * @param diceRoller - Injectable D6 roller (provides individual d6 values)
 * @returns Complete attack result
 */
export function resolvePhysicalAttack(
  input: IPhysicalAttackInput,
  diceRoller: D6Roller,
): IPhysicalAttackResult {
  const toHitResult = calculatePhysicalToHit(input);

  if (!toHitResult.allowed) {
    return {
      attackType: input.attackType,
      toHitNumber: Infinity,
      roll: 0,
      hit: false,
      targetDamage: 0,
      attackerDamage: 0,
      attackerLegDamagePerLeg: 0,
      targetPSR: false,
      attackerPSR: false,
      attackerPSRModifier: 0,
      targetDisplaced: false,
    };
  }

  // Roll 2d6 for to-hit
  const die1 = diceRoller();
  const die2 = diceRoller();
  const roll = die1 + die2;
  const hit = roll >= toHitResult.finalToHit;

  if (hit) {
    const damageResult = calculatePhysicalDamage(input);
    const hitLocation =
      damageResult.targetDamage > 0
        ? determinePhysicalHitLocation(damageResult.hitTable, diceRoller)
        : undefined;

    return {
      attackType: input.attackType,
      toHitNumber: toHitResult.finalToHit,
      roll,
      hit: true,
      targetDamage: damageResult.targetDamage,
      attackerDamage: damageResult.attackerDamage,
      attackerLegDamagePerLeg: damageResult.attackerLegDamagePerLeg,
      targetPSR: damageResult.targetPSR,
      attackerPSR: damageResult.attackerPSR,
      attackerPSRModifier: damageResult.attackerPSRModifier,
      hitLocation,
      targetDisplaced: damageResult.targetDisplaced,
    };
  } else {
    // Miss — check for miss consequences
    const missConsequences = getPhysicalMissConsequences(input.attackType);

    return {
      attackType: input.attackType,
      toHitNumber: toHitResult.finalToHit,
      roll,
      hit: false,
      targetDamage: 0,
      attackerDamage: 0,
      attackerLegDamagePerLeg: 0,
      targetPSR: false,
      attackerPSR: missConsequences.attackerPSR,
      attackerPSRModifier: missConsequences.attackerPSRModifier,
      targetDisplaced: false,
    };
  }
}

// =============================================================================
// Physical Attack AI Decision Logic
// =============================================================================

/**
 * Simple AI decision: choose best physical attack for a unit.
 * Returns the attack type with highest expected damage, or null if none available.
 */
export function chooseBestPhysicalAttack(
  attackerTonnage: number,
  pilotingSkill: number,
  componentDamage: IComponentDamageState,
  options: {
    canReachForCharge?: boolean;
    hexesMoved?: number;
    isJumping?: boolean;
    hasMeleeWeapon?: PhysicalAttackType;
    weaponsFiredFromLeftArm?: readonly string[];
    weaponsFiredFromRightArm?: readonly string[];
    attackerProne?: boolean;
    heat?: number;
    hasTSM?: boolean;
  } = {},
): PhysicalAttackType | null {
  const candidates: Array<{
    type: PhysicalAttackType;
    expectedDamage: number;
  }> = [];

  const baseInput: IPhysicalAttackInput = {
    attackerTonnage,
    pilotingSkill,
    componentDamage,
    attackType: 'punch',
    heat: options.heat,
    hasTSM: options.hasTSM,
  };

  // Check kick first (highest standard damage)
  const kickInput = {
    ...baseInput,
    attackType: 'kick' as PhysicalAttackType,
    attackerProne: options.attackerProne,
  };
  const kickRestriction = canKick(kickInput);
  if (kickRestriction.allowed) {
    const kickDamage = calculateKickDamage(kickInput);
    candidates.push({ type: 'kick', expectedDamage: kickDamage });
  }

  // Check punch (both arms)
  const leftPunchInput = {
    ...baseInput,
    attackType: 'punch' as PhysicalAttackType,
    arm: 'left' as const,
    weaponsFiredFromArm: options.weaponsFiredFromLeftArm,
  };
  const rightPunchInput = {
    ...baseInput,
    attackType: 'punch' as PhysicalAttackType,
    arm: 'right' as const,
    weaponsFiredFromArm: options.weaponsFiredFromRightArm,
  };

  if (canPunch(leftPunchInput).allowed || canPunch(rightPunchInput).allowed) {
    const punchDamage = calculatePunchDamage(baseInput);
    candidates.push({ type: 'punch', expectedDamage: punchDamage });
  }

  // DFA if jumping
  if (options.isJumping) {
    const dfaDamage = calculateDFADamageToTarget({
      ...baseInput,
      attackType: 'dfa',
    });
    candidates.push({ type: 'dfa', expectedDamage: dfaDamage });
  }

  // Charge if in range
  if (options.canReachForCharge && (options.hexesMoved ?? 0) > 1) {
    const chargeDamage = calculateChargeDamageToTarget({
      ...baseInput,
      attackType: 'charge',
      hexesMoved: options.hexesMoved,
    });
    candidates.push({ type: 'charge', expectedDamage: chargeDamage });
  }

  // Melee weapon
  if (options.hasMeleeWeapon) {
    const meleeInput = {
      ...baseInput,
      attackType: options.hasMeleeWeapon,
    };
    const meleeRestriction = canMeleeWeapon(meleeInput);
    if (meleeRestriction.allowed) {
      let meleeDamage = 0;
      switch (options.hasMeleeWeapon) {
        case 'hatchet':
          meleeDamage = calculateHatchetDamage(meleeInput);
          break;
        case 'sword':
          meleeDamage = calculateSwordDamage(meleeInput);
          break;
        case 'mace':
          meleeDamage = calculateMaceDamage(meleeInput);
          break;
      }
      candidates.push({
        type: options.hasMeleeWeapon,
        expectedDamage: meleeDamage,
      });
    }
  }

  if (candidates.length === 0) return null;

  // Sort by expected damage, pick highest
  candidates.sort((a, b) => b.expectedDamage - a.expectedDamage);
  return candidates[0].type;
}
