import type {
  IPhysicalAttackInput,
  IPhysicalDamageResult,
  PhysicalAttackType,
} from './types';

import {
  CHARGE_HIT_PSR_MODIFIER,
  DFA_HIT_ATTACKER_PSR_MODIFIER,
} from './constants';
import {
  calculateBrushOffDamage,
  calculateChargeDamageToAttacker,
  calculateChargeDamageToTarget,
  calculateDFADamageToAttacker,
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
import { selectPhysicalHitTable } from './physicalHitTable';

type PhysicalDamageResolver = (
  input: IPhysicalAttackInput,
) => IPhysicalDamageResult;

function noDamageResult(
  input: IPhysicalAttackInput,
  overrides: Partial<IPhysicalDamageResult> = {},
): IPhysicalDamageResult {
  return {
    targetDamage: 0,
    attackerDamage: 0,
    attackerLegDamagePerLeg: 0,
    targetPSR: false,
    attackerPSR: false,
    attackerPSRModifier: 0,
    hitTable: selectPhysicalHitTable(input),
    targetDisplaced: false,
    ...overrides,
  };
}

const PHYSICAL_DAMAGE_RESOLVERS = {
  punch: (input) =>
    noDamageResult(input, {
      targetDamage: calculatePunchDamage(input),
    }),
  kick: (input) =>
    noDamageResult(input, {
      targetDamage: calculateKickDamage(input),
      targetPSR: true,
      hitTable: 'kick',
    }),
  charge: (input) =>
    noDamageResult(input, {
      targetDamage: calculateChargeDamageToTarget(input),
      attackerDamage: calculateChargeDamageToAttacker(input),
      targetPSR: true,
      attackerPSR: true,
      attackerPSRModifier: CHARGE_HIT_PSR_MODIFIER,
    }),
  dfa: (input) =>
    noDamageResult(input, {
      targetDamage: calculateDFADamageToTarget(input),
      attackerLegDamagePerLeg: calculateDFADamageToAttacker(input),
      targetPSR: true,
      attackerPSR: true,
      attackerPSRModifier: DFA_HIT_ATTACKER_PSR_MODIFIER,
    }),
  push: (input) =>
    noDamageResult(input, {
      targetPSR: true,
      targetDisplaced: true,
    }),
  trip: (input) =>
    noDamageResult(input, {
      targetPSR: true,
    }),
  thrash: (input) =>
    noDamageResult(input, {
      targetDamage: calculateThrashDamage(input),
      attackerPSR: true,
    }),
  'jump-jet-attack': (input) =>
    noDamageResult(input, {
      targetDamage: calculateJumpJetAttackDamage(input),
    }),
  'brush-off': (input) =>
    noDamageResult(input, {
      targetDamage: calculateBrushOffDamage(input),
    }),
  grapple: noDamageResult,
  'break-grapple': noDamageResult,
  hatchet: (input) =>
    noDamageResult(input, {
      targetDamage: calculateHatchetDamage(input),
    }),
  sword: (input) =>
    noDamageResult(input, {
      targetDamage: calculateSwordDamage(input),
    }),
  mace: (input) =>
    noDamageResult(input, {
      targetDamage: calculateMaceDamage(input),
    }),
  lance: (input) =>
    noDamageResult(input, {
      // Per task 9.4: charge-double is applied by the resolution layer.
      targetDamage: calculateLanceDamage(input, false),
    }),
  'retractable-blade': (input) =>
    noDamageResult(input, {
      targetDamage: calculateRetractableBladeDamage(input),
    }),
  flail: (input) =>
    noDamageResult(input, {
      targetDamage: calculateFlailDamage(input),
    }),
  'wrecking-ball': (input) =>
    noDamageResult(input, {
      targetDamage: calculateWreckingBallDamage(input),
    }),
} satisfies Record<PhysicalAttackType, PhysicalDamageResolver>;

export function calculatePhysicalDamage(
  input: IPhysicalAttackInput,
): IPhysicalDamageResult {
  return (
    PHYSICAL_DAMAGE_RESOLVERS[input.attackType]?.(input) ?? {
      targetDamage: 0,
      attackerDamage: 0,
      attackerLegDamagePerLeg: 0,
      targetPSR: false,
      attackerPSR: false,
      attackerPSRModifier: 0,
      hitTable: 'punch',
      targetDisplaced: false,
    }
  );
}
