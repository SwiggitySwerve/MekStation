import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { getMeleeSpecialistDamageBonus } from '@/utils/gameplay/spaModifiers';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

import {
  CHARGE_DAMAGE_DIVISOR,
  CHARGE_HIT_PSR_MODIFIER,
  CLAW_PUNCH_DAMAGE_DIVISOR,
  DFA_ATTACKER_DAMAGE_DIVISOR,
  DFA_DAMAGE_MULTIPLIER,
  DFA_TARGET_DAMAGE_DIVISOR,
  FLAIL_DAMAGE,
  HATCHET_DAMAGE_DIVISOR,
  KICK_DAMAGE_DIVISOR,
  LANCE_CHARGE_DAMAGE_MULTIPLIER,
  LANCE_DAMAGE_DIVISOR,
  MACE_DAMAGE_DIVISOR,
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
  isZweihanderPhysicalAttackType,
} from './types';

export {
  type IDfaMissFallDamageResult,
  type IDfaMissFallPilotDamageAvoidanceResult,
  type IPhysicalDamageCluster,
  resolveDfaMissFallDamage,
  resolveDfaMissFallPilotDamageAvoidance,
} from './dfaMissDamage';
export { getPhysicalMissConsequences } from './missConsequences';
export { calculatePhysicalDamage } from './physicalDamage';
export {
  selectPhysicalHitTable,
  splitPhysicalDamageIntoClusters,
} from './physicalHitTable';

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

export function isTwoHandedZweihanderAttack(
  input: IPhysicalAttackInput,
): boolean {
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

export function calculateBrushOffAttackDamage(
  input: IPhysicalAttackInput,
): number {
  return calculatePunchDamage(input);
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
