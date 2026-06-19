import type {
  IChooseBestPhysicalAttackOptions,
  IPhysicalAttackCandidate,
  IPhysicalAttackInput,
  PhysicalAttackType,
} from './types';

import {
  calculateBrushOffDamage,
  calculateChargeDamageToTarget,
  calculateDFADamageToTarget,
  calculateFlailDamage,
  calculateHatchetDamage,
  calculateJumpJetAttackDamage,
  calculateKickDamage,
  calculateLanceDamage,
  calculateMaceDamage,
  calculatePunchDamage,
  calculateRetractableBladeDamage,
  calculateSwordDamage,
  calculateThrashDamage,
  calculateWreckingBallDamage,
} from './damage';
import {
  canBrushOffPhysical,
  canBreakGrapplePhysical,
  canCharge,
  canDFA,
  canGrapplePhysical,
  canJumpJetAttackPhysical,
  canKick,
  canMeleeWeapon,
  canPunch,
  canThrashPhysical,
} from './restrictions';

type CandidateAppender = (
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
  options: IChooseBestPhysicalAttackOptions,
) => void;

type DamageCalculator = (input: IPhysicalAttackInput) => number;

const MELEE_DAMAGE_BY_TYPE: Readonly<
  Partial<Record<PhysicalAttackType, DamageCalculator>>
> = {
  hatchet: calculateHatchetDamage,
  sword: calculateSwordDamage,
  mace: calculateMaceDamage,
  lance: calculateLanceDamage,
  'retractable-blade': calculateRetractableBladeDamage,
  flail: calculateFlailDamage,
  'wrecking-ball': calculateWreckingBallDamage,
};

function appendThrashCandidate(
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
  options: IChooseBestPhysicalAttackOptions,
): void {
  const input: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'thrash',
    weaponsFiredFromArm: options.weaponsFiredThisTurn,
  };
  if (canThrashPhysical(input).allowed) {
    candidates.push({
      type: 'thrash',
      expectedDamage: calculateThrashDamage(input),
    });
  }
}

function appendJumpJetCandidate(
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
  options: IChooseBestPhysicalAttackOptions,
): void {
  const input: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'jump-jet-attack',
    limb: options.jumpJetAttackSelectedLeg === 'left' ? 'leftLeg' : 'rightLeg',
  };
  if (canJumpJetAttackPhysical(input).allowed) {
    candidates.push({
      type: 'jump-jet-attack',
      expectedDamage: calculateJumpJetAttackDamage(input),
    });
  }
}

function appendBrushOffCandidate(
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
  options: IChooseBestPhysicalAttackOptions,
): void {
  const input: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'brush-off',
    arm: 'right',
    limb: 'rightArm',
    weaponsFiredFromArm: options.weaponsFiredFromRightArm,
  };
  if (canBrushOffPhysical(input).allowed) {
    candidates.push({
      type: 'brush-off',
      expectedDamage: calculateBrushOffDamage(input),
    });
  }
}

function appendGrappleCandidate(
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
  options: IChooseBestPhysicalAttackOptions,
): void {
  const input: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'grapple',
    weaponsFiredFromArm: options.weaponsFiredThisTurn,
  };
  if (canGrapplePhysical(input).allowed) {
    candidates.push({ type: 'grapple', expectedDamage: 0 });
  }
}

function appendBreakGrappleCandidate(
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
): void {
  const input: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'break-grapple',
  };
  if (canBreakGrapplePhysical(input).allowed) {
    candidates.push({ type: 'break-grapple', expectedDamage: 0 });
  }
}

function appendKickCandidate(
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
): void {
  const input: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'kick',
  };
  if (canKick(input).allowed) {
    candidates.push({
      type: 'kick',
      expectedDamage: calculateKickDamage(input),
    });
  }
}

function appendPunchCandidate(
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
  options: IChooseBestPhysicalAttackOptions,
): void {
  const leftInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'punch',
    arm: 'left',
    weaponsFiredFromArm: options.weaponsFiredFromLeftArm,
  };
  const rightInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'punch',
    arm: 'right',
    weaponsFiredFromArm: options.weaponsFiredFromRightArm,
  };
  const leftAllowed = canPunch(leftInput).allowed;
  const rightAllowed = canPunch(rightInput).allowed;
  if (!leftAllowed && !rightAllowed) return;

  candidates.push({
    type: 'punch',
    expectedDamage: Math.max(
      leftAllowed ? calculatePunchDamage(leftInput) : 0,
      rightAllowed ? calculatePunchDamage(rightInput) : 0,
    ),
  });
}

function appendDfaCandidate(
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
  options: IChooseBestPhysicalAttackOptions,
): void {
  if (!options.isJumping) return;

  const input: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'dfa',
    attackerJumpedThisTurn: true,
  };
  if (canDFA(input).allowed) {
    candidates.push({
      type: 'dfa',
      expectedDamage: calculateDFADamageToTarget(input),
    });
  }
}

function appendChargeCandidate(
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
  options: IChooseBestPhysicalAttackOptions,
): void {
  if (!options.canReachForCharge || (options.hexesMoved ?? 0) <= 1) return;

  const input: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'charge',
    hexesMoved: options.hexesMoved,
    attackerJumpedThisTurn: options.isJumping,
    attackerRanThisTurn: true,
    attackerMovedBackwardThisTurn: options.attackerMovedBackwardThisTurn,
  };
  if (canCharge(input).allowed) {
    candidates.push({
      type: 'charge',
      expectedDamage: calculateChargeDamageToTarget(input),
    });
  }
}

function appendMeleeWeaponCandidate(
  candidates: IPhysicalAttackCandidate[],
  baseInput: IPhysicalAttackInput,
  options: IChooseBestPhysicalAttackOptions,
): void {
  if (!options.hasMeleeWeapon) return;

  const input: IPhysicalAttackInput = {
    ...baseInput,
    attackType: options.hasMeleeWeapon,
  };
  if (!canMeleeWeapon(input).allowed) return;

  const calculateDamage = MELEE_DAMAGE_BY_TYPE[options.hasMeleeWeapon];
  candidates.push({
    type: options.hasMeleeWeapon,
    expectedDamage: calculateDamage ? calculateDamage(input) : 0,
  });
}

const CANDIDATE_APPENDERS: readonly CandidateAppender[] = [
  appendThrashCandidate,
  appendJumpJetCandidate,
  appendBrushOffCandidate,
  appendGrappleCandidate,
  appendBreakGrappleCandidate,
  appendKickCandidate,
  appendPunchCandidate,
  appendDfaCandidate,
  appendChargeCandidate,
  appendMeleeWeaponCandidate,
];

export function collectPhysicalAttackCandidates(
  baseInput: IPhysicalAttackInput,
  options: IChooseBestPhysicalAttackOptions,
): IPhysicalAttackCandidate[] {
  const candidates: IPhysicalAttackCandidate[] = [];
  for (const appendCandidate of CANDIDATE_APPENDERS) {
    appendCandidate(candidates, baseInput, options);
  }
  return candidates;
}
