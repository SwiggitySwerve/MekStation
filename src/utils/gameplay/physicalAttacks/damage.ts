import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { CombatLocation, Facing, FiringArc } from '@/types/gameplay';
import { calculateFallDamage } from '@/utils/gameplay/fallMechanics';
import {
  determineHitLocation,
  roll2d6,
  type D6Roller,
} from '@/utils/gameplay/hitLocation';
import { getMeleeSpecialistDamageBonus } from '@/utils/gameplay/spaModifiers';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

import { calculateBrushOffAttackDamage } from './brushOffEligibility';
import {
  CHARGE_DAMAGE_DIVISOR,
  CHARGE_HIT_PSR_MODIFIER,
  CLAW_PUNCH_DAMAGE_DIVISOR,
  DFA_ATTACKER_DAMAGE_DIVISOR,
  DFA_DAMAGE_MULTIPLIER,
  DFA_HIT_ATTACKER_PSR_MODIFIER,
  DFA_MISS_FALL_FACING_OFFSET,
  DFA_MISS_FALL_HEIGHT,
  DFA_MISS_PSR_MODIFIER,
  DFA_TARGET_DAMAGE_DIVISOR,
  FLAIL_DAMAGE,
  HATCHET_DAMAGE_DIVISOR,
  KICK_DAMAGE_DIVISOR,
  LANCE_CHARGE_DAMAGE_MULTIPLIER,
  LANCE_DAMAGE_DIVISOR,
  MACE_DAMAGE_DIVISOR,
  PHYSICAL_CLUSTER_SIZE,
  PUNCH_DAMAGE_DIVISOR,
  RETRACTABLE_BLADE_DAMAGE_DIVISOR,
  SWORD_DAMAGE_BONUS,
  SWORD_DAMAGE_DIVISOR,
  TSM_ACTIVATION_HEAT,
  WRECKING_BALL_DAMAGE,
} from './constants';
import {
  getJumpJetAttackDamage,
  type JumpJetAttackSelectedLeg,
} from './jumpJetAttackEligibility';
import { getThrashAttackDamageForWeight } from './thrashEligibility';
import {
  IPhysicalAttackInput,
  IPhysicalDamageResult,
  PhysicalHitTable,
  PhysicalAttackType,
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  isZweihanderPhysicalAttackType,
} from './types';

export interface IPhysicalDamageCluster {
  readonly damage: number;
  readonly location: CombatLocation;
}

export interface IDfaMissFallDamageResult {
  readonly fallDamage: number;
  readonly fallHeight: number;
  readonly newFacing: Facing;
  readonly pilotDamage: number;
  readonly clusters: readonly IPhysicalDamageCluster[];
}

export interface IDfaMissFallPilotDamageAvoidanceResult {
  readonly targetNumber: number;
  readonly roll: number;
  readonly dice: readonly number[];
  readonly passed: boolean;
  readonly pilotDamage: number;
}

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

export function applyUnderwaterModifier(
  damage: number,
  isUnderwater: boolean,
): number {
  if (isUnderwater) {
    return Math.floor(damage / 2);
  }
  return damage;
}

function physicalDamageBonus(input: IPhysicalAttackInput): number {
  return getMeleeSpecialistDamageBonus(input.pilotAbilities ?? []);
}

function punchDamageBonus(input: IPhysicalAttackInput): number {
  return physicalDamageBonus(input);
}

function isTwoHandedZweihanderAttack(input: IPhysicalAttackInput): boolean {
  return (
    isZweihanderPhysicalAttackType(input.attackType) &&
    input.twoHandedZweihander === true &&
    hasSPA(input.pilotAbilities ?? [], 'zweihander')
  );
}

function twoHandedZweihanderDamageBonus(
  input: IPhysicalAttackInput,
  tsmApplies: boolean = true,
): number {
  if (!isTwoHandedZweihanderAttack(input)) return 0;

  const effectiveWeight = tsmApplies
    ? getEffectiveWeight(
        input.attackerTonnage,
        input.heat ?? 0,
        input.hasTSM ?? false,
      )
    : input.attackerTonnage;
  return Math.floor(effectiveWeight / PUNCH_DAMAGE_DIVISOR);
}

function footActuatorWorksForLeg(
  input: IPhysicalAttackInput,
  limb: 'leftLeg' | 'rightLeg',
): boolean {
  if (input.componentDamage.actuators[ActuatorType.FOOT]) return false;
  if (input.footActuatorPresent === false) return false;
  if (limb === 'leftLeg') return input.leftFootActuatorPresent !== false;
  return input.rightFootActuatorPresent !== false;
}

function footActuatorWorksForArmLeg(
  input: IPhysicalAttackInput,
  limb: 'leftArm' | 'rightArm',
): boolean {
  if (input.componentDamage.actuators[ActuatorType.FOOT]) return false;
  if (input.footActuatorPresent === false) return false;
  if (limb === 'leftArm') return input.leftArmFootActuatorPresent !== false;
  return input.rightArmFootActuatorPresent !== false;
}

function talonLocationForKick(
  input: IPhysicalAttackInput,
  limb: 'leftLeg' | 'rightLeg',
): 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm' {
  if (!input.attackerIsQuad) return limb;
  return limb === 'leftLeg' ? 'leftArm' : 'rightArm';
}

function talonLocationHasWorkingTalons(
  input: IPhysicalAttackInput,
  location: 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm',
): boolean {
  if (location === 'leftLeg') {
    return (
      input.leftLegHasTalons === true &&
      footActuatorWorksForLeg(input, 'leftLeg')
    );
  }
  if (location === 'rightLeg') {
    return (
      input.rightLegHasTalons === true &&
      footActuatorWorksForLeg(input, 'rightLeg')
    );
  }
  if (location === 'leftArm') {
    return (
      input.leftArmHasTalons === true &&
      footActuatorWorksForArmLeg(input, 'leftArm')
    );
  }
  return (
    input.rightArmHasTalons === true &&
    footActuatorWorksForArmLeg(input, 'rightArm')
  );
}

function legHasWorkingTalons(
  input: IPhysicalAttackInput,
  limb: 'leftLeg' | 'rightLeg',
): boolean {
  return talonLocationHasWorkingTalons(
    input,
    talonLocationForKick(input, limb),
  );
}

function selectedKickLegHasWorkingTalons(input: IPhysicalAttackInput): boolean {
  if (input.limb === 'leftLeg' || input.limb === 'rightLeg') {
    return legHasWorkingTalons(input, input.limb);
  }

  return (
    legHasWorkingTalons(input, 'leftLeg') ||
    legHasWorkingTalons(input, 'rightLeg')
  );
}

function nonBipedDfaArmLocationsHaveTalons(
  input: IPhysicalAttackInput,
): boolean {
  if (input.rightArmHasTalons !== true) return false;

  // MegaMek gates the non-biped arm-location DFA branch on a right-arm talon
  // mount, then accepts either the right-arm foot or the paired left arm.
  return (
    footActuatorWorksForArmLeg(input, 'rightArm') ||
    talonLocationHasWorkingTalons(input, 'leftArm')
  );
}

function dfaHasWorkingTalons(input: IPhysicalAttackInput): boolean {
  const legTalons =
    talonLocationHasWorkingTalons(input, 'leftLeg') ||
    talonLocationHasWorkingTalons(input, 'rightLeg');
  if (!input.attackerIsQuad) return legTalons;

  return legTalons || nonBipedDfaArmLocationsHaveTalons(input);
}

function selectedPunchArmHasClaw(input: IPhysicalAttackInput): boolean {
  if (input.arm === 'left' || input.limb === 'leftArm') {
    return input.leftArmHasClaw === true;
  }
  if (input.arm === 'right' || input.limb === 'rightArm') {
    return input.rightArmHasClaw === true;
  }
  return input.rightArmHasClaw === true || input.leftArmHasClaw === true;
}

export function calculatePunchDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  const divisor = selectedPunchArmHasClaw(input)
    ? CLAW_PUNCH_DAMAGE_DIVISOR
    : PUNCH_DAMAGE_DIVISOR;
  let damage = Math.ceil(effectiveWeight / divisor);
  damage += twoHandedZweihanderDamageBonus(input);
  const actuators = input.componentDamage.actuators;

  if (actuators[ActuatorType.UPPER_ARM]) {
    damage = Math.floor(damage / 2);
  }

  if (actuators[ActuatorType.LOWER_ARM]) {
    damage = Math.floor(damage / 2);
  }

  damage += punchDamageBonus(input);

  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateKickDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  let damage = Math.floor(effectiveWeight / KICK_DAMAGE_DIVISOR);
  if (selectedKickLegHasWorkingTalons(input)) {
    damage = Math.round(damage * 1.5);
  }
  damage += physicalDamageBonus(input);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

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
  const damage =
    Math.ceil(effectiveWeight / CHARGE_DAMAGE_DIVISOR) * multiplier +
    physicalDamageBonus(input);

  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateChargeDamageToAttacker(
  input: IPhysicalAttackInput,
): number {
  const targetTonnage = input.targetTonnage ?? 0;
  const damage = Math.ceil(targetTonnage / CHARGE_DAMAGE_DIVISOR);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateDFADamageToTarget(
  input: IPhysicalAttackInput,
): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );

  let damage =
    Math.ceil(effectiveWeight / DFA_TARGET_DAMAGE_DIVISOR) *
    DFA_DAMAGE_MULTIPLIER;
  if (dfaHasWorkingTalons(input)) {
    damage = Math.trunc(damage * 1.5);
  }
  damage += physicalDamageBonus(input);

  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateDFADamageToAttacker(
  input: IPhysicalAttackInput,
): number {
  const totalDamage = Math.ceil(
    input.attackerTonnage / DFA_ATTACKER_DAMAGE_DIVISOR,
  );
  return Math.ceil(totalDamage / 2);
}

export function resolveDfaMissFallDamage(
  attackerTonnage: number,
  currentFacing: Facing,
  diceRoller: D6Roller,
): IDfaMissFallDamageResult {
  const fallDamage = calculateFallDamage(attackerTonnage, DFA_MISS_FALL_HEIGHT);
  const clusters = splitPhysicalDamageIntoClusters(fallDamage).map(
    (damage): IPhysicalDamageCluster => ({
      damage,
      location: determineHitLocation(FiringArc.Rear, diceRoller).location,
    }),
  );

  return {
    fallDamage,
    fallHeight: DFA_MISS_FALL_HEIGHT,
    newFacing: ((currentFacing + DFA_MISS_FALL_FACING_OFFSET) % 6) as Facing,
    // MegaMek rolls separately to avoid pilot damage after doEntityFall.
    // MekStation does not yet model that pilot-damage avoidance check here.
    pilotDamage: 0,
    clusters,
  };
}

export function resolveDfaMissFallPilotDamageAvoidance(
  pilotingSkill: number,
  fallHeight: number,
  diceRoller: D6Roller,
  pilotAbilities: readonly string[] = [],
): IDfaMissFallPilotDamageAvoidanceResult {
  const hasPilotDamageImmunity =
    pilotAbilities.includes('dermal_armor') ||
    pilotAbilities.includes('tsm_implant');
  const targetNumber = pilotingSkill + Math.max(0, fallHeight - 1);
  if (hasPilotDamageImmunity) {
    return {
      targetNumber,
      roll: Infinity,
      dice: [],
      passed: true,
      pilotDamage: 0,
    };
  }

  const roll = roll2d6(diceRoller);
  const passed = roll.total >= targetNumber;
  return {
    targetNumber,
    roll: roll.total,
    dice: roll.dice,
    passed,
    pilotDamage: passed ? 0 : 1,
  };
}

export function calculateHatchetDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const damage =
    Math.floor(effectiveWeight / HATCHET_DAMAGE_DIVISOR) +
    twoHandedZweihanderDamageBonus(input) +
    physicalDamageBonus(input);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateSwordDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const damage =
    Math.ceil(effectiveWeight / SWORD_DAMAGE_DIVISOR) +
    SWORD_DAMAGE_BONUS +
    twoHandedZweihanderDamageBonus(input) +
    physicalDamageBonus(input);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateMaceDamage(input: IPhysicalAttackInput): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const damage =
    Math.ceil(effectiveWeight / MACE_DAMAGE_DIVISOR) +
    twoHandedZweihanderDamageBonus(input) +
    physicalDamageBonus(input);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateRetractableBladeDamage(
  input: IPhysicalAttackInput,
): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const damage =
    Math.ceil(effectiveWeight / RETRACTABLE_BLADE_DAMAGE_DIVISOR) +
    twoHandedZweihanderDamageBonus(input) +
    physicalDamageBonus(input);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

/**
 * Per `implement-physical-attack-phase` task 9.4: lance damage is
 * floor(weight / 5); when the attacker is charging (caller sets
 * `attackType: 'charge'` with lance context, or passes an override via
 * `hexesMoved`), the result is doubled. We keep the charge-multiplier
 * decision at the caller (`resolvePhysicalAttack`) because the same
 * lance-equipped mech can deliver either a stationary swing or a charge.
 */
export function calculateLanceDamage(
  input: IPhysicalAttackInput,
  isCharging: boolean = false,
): number {
  const effectiveWeight = getEffectiveWeight(
    input.attackerTonnage,
    input.heat ?? 0,
    input.hasTSM ?? false,
  );
  const base = Math.floor(effectiveWeight / LANCE_DAMAGE_DIVISOR);
  const damage =
    (isCharging ? base * LANCE_CHARGE_DAMAGE_MULTIPLIER : base) +
    twoHandedZweihanderDamageBonus(input) +
    physicalDamageBonus(input);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateFlailDamage(input: IPhysicalAttackInput): number {
  const damage =
    FLAIL_DAMAGE +
    twoHandedZweihanderDamageBonus(input, false) +
    physicalDamageBonus(input);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateWreckingBallDamage(
  input: IPhysicalAttackInput,
): number {
  const damage =
    WRECKING_BALL_DAMAGE +
    twoHandedZweihanderDamageBonus(input, false) +
    physicalDamageBonus(input);
  return applyUnderwaterModifier(damage, input.isUnderwater ?? false);
}

export function calculateThrashDamage(input: IPhysicalAttackInput): number {
  return getThrashAttackDamageForWeight(input.attackerTonnage);
}

function selectedJumpJetAttackLeg(
  input: IPhysicalAttackInput,
): JumpJetAttackSelectedLeg {
  if (input.jumpJetAttackSelectedLeg) return input.jumpJetAttackSelectedLeg;
  return input.limb === 'leftLeg' ? 'left' : 'right';
}

export function calculateJumpJetAttackDamage(
  input: IPhysicalAttackInput,
): number {
  return getJumpJetAttackDamage({
    selectedLeg: selectedJumpJetAttackLeg(input),
    leftReadyJumpJetCount: input.leftReadyJumpJetCount,
    rightReadyJumpJetCount: input.rightReadyJumpJetCount,
    leftLegWet: input.leftLegWet,
    rightLegWet: input.rightLegWet,
  });
}

export function calculateBrushOffDamage(input: IPhysicalAttackInput): number {
  return calculateBrushOffAttackDamage(input);
}

/**
 * Per `implement-physical-attack-phase` tasks 6.4 / 7.4: split damage
 * into 5-point clusters before hit-location resolution. Zero damage
 * returns an empty list; damage under the cluster size returns a single
 * cluster of the remaining damage.
 */
export function splitPhysicalDamageIntoClusters(
  totalDamage: number,
): readonly number[] {
  if (totalDamage <= 0) return [];
  const clusters: number[] = [];
  let remaining = totalDamage;
  while (remaining > 0) {
    const size = Math.min(PHYSICAL_CLUSTER_SIZE, remaining);
    clusters.push(size);
    remaining -= size;
  }
  return clusters;
}

const MELEE_WEAPON_ATTACK_TYPE_SET = new Set<string>(
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
);
const MEK_TARGET_TYPES = new Set([
  'battlemech',
  'mek',
  'mech',
  'omnimech',
  'industrialmech',
]);

function isMeleeWeaponAttack(attackType: PhysicalAttackType): boolean {
  return MELEE_WEAPON_ATTACK_TYPE_SET.has(attackType);
}

function representedMekTarget(unitType: string | undefined): boolean {
  const canonical = unitType?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return canonical === undefined || MEK_TARGET_TYPES.has(canonical);
}

export function selectPhysicalHitTable(
  input: IPhysicalAttackInput,
): PhysicalHitTable {
  if (input.hitTableOverride) return input.hitTableOverride;
  if (input.attackType === 'kick') return 'kick';

  if (input.attackType === 'punch') {
    if (!input.attackerHullDown || !input.elevationContext) return 'punch';

    return input.elevationContext.attackerArmElevation >
      input.elevationContext.targetBaseElevation
      ? 'punch'
      : 'kick';
  }

  if (
    isMeleeWeaponAttack(input.attackType) &&
    input.attackerHullDown &&
    representedMekTarget(input.targetUnitType)
  ) {
    return 'kick';
  }

  return 'punch';
}

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
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'kick':
      return {
        targetDamage: calculateKickDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: true,
        attackerPSR: false,
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
        attackerPSRModifier: CHARGE_HIT_PSR_MODIFIER,
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'dfa':
      return {
        targetDamage: calculateDFADamageToTarget(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: calculateDFADamageToAttacker(input),
        targetPSR: true,
        attackerPSR: true,
        attackerPSRModifier: DFA_HIT_ATTACKER_PSR_MODIFIER,
        hitTable: selectPhysicalHitTable(input),
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
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: true,
      };
    case 'trip':
      return {
        targetDamage: 0,
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: true,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'thrash':
      return {
        targetDamage: calculateThrashDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: true,
        attackerPSRModifier: 0,
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'jump-jet-attack':
      return {
        targetDamage: calculateJumpJetAttackDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'brush-off':
      return {
        targetDamage: calculateBrushOffDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'grapple':
    case 'break-grapple':
      return {
        targetDamage: 0,
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'hatchet':
      return {
        targetDamage: calculateHatchetDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: selectPhysicalHitTable(input),
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
        hitTable: selectPhysicalHitTable(input),
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
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'lance':
      return {
        // Per task 9.4: the charge-double variant is applied at the
        // resolution layer when the attacker is simultaneously charging;
        // the baseline damage path is used here.
        targetDamage: calculateLanceDamage(input, false),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'retractable-blade':
      return {
        targetDamage: calculateRetractableBladeDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'flail':
      return {
        targetDamage: calculateFlailDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: selectPhysicalHitTable(input),
        targetDisplaced: false,
      };
    case 'wrecking-ball':
      return {
        targetDamage: calculateWreckingBallDamage(input),
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: selectPhysicalHitTable(input),
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

export function getPhysicalMissConsequences(
  attackType: PhysicalAttackType,
  input?: IPhysicalAttackInput,
): {
  attackerPSR: boolean;
  attackerPSRModifier: number;
  attackerDamage: number;
  hitTable?: 'punch' | 'kick';
} {
  switch (attackType) {
    case 'kick':
      return { attackerPSR: true, attackerPSRModifier: 0, attackerDamage: 0 };
    case 'charge':
      return { attackerPSR: false, attackerPSRModifier: 0, attackerDamage: 0 };
    case 'dfa':
      return {
        attackerPSR: true,
        attackerPSRModifier: DFA_MISS_PSR_MODIFIER,
        attackerDamage: 0,
      };
    case 'brush-off':
      return {
        attackerPSR: false,
        attackerPSRModifier: 0,
        attackerDamage: input ? calculateBrushOffDamage(input) : 0,
        hitTable: 'punch',
      };
    default:
      if (input && isTwoHandedZweihanderAttack(input)) {
        return {
          attackerPSR: true,
          attackerPSRModifier: 0,
          attackerDamage: 0,
        };
      }
      return { attackerPSR: false, attackerPSRModifier: 0, attackerDamage: 0 };
  }
}
