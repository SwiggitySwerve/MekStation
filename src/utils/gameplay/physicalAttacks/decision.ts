import { IComponentDamageState } from '@/types/gameplay';

import {
  calculateChargeDamageToTarget,
  calculateDFADamageToTarget,
  calculateHatchetDamage,
  calculateKickDamage,
  calculateLanceDamage,
  calculateMaceDamage,
  calculatePunchDamage,
  calculateRetractableBladeDamage,
  calculateSwordDamage,
} from './damage';
import {
  canCharge,
  canDFA,
  canKick,
  canMeleeWeapon,
  canPunch,
} from './restrictions';
import {
  IChooseBestPhysicalAttackOptions,
  IPhysicalAttackCandidate,
  IPhysicalAttackInput,
  PhysicalAttackType,
} from './types';

export function chooseBestPhysicalAttack(
  attackerTonnage: number,
  pilotingSkill: number,
  componentDamage: IComponentDamageState,
  options: IChooseBestPhysicalAttackOptions = {},
): PhysicalAttackType | null {
  const candidates: IPhysicalAttackCandidate[] = [];

  const baseInput: IPhysicalAttackInput = {
    attackerId: options.attackerId,
    targetId: options.targetId,
    attackerTonnage,
    pilotingSkill,
    componentDamage,
    attackType: 'punch',
    heat: options.heat,
    hasTSM: options.hasTSM,
    pilotAbilities: options.pilotAbilities,
    unitQuirks: options.unitQuirks,
    attackerEvading: options.attackerEvading,
    attackerLoadingOrUnloadingCargo: options.attackerLoadingOrUnloadingCargo,
    attackerTargetedByDisplacementAttackerId:
      options.attackerTargetedByDisplacementAttackerId,
    attackerBoardId: options.attackerBoardId,
    targetBoardId: options.targetBoardId,
    elevationDifference: options.elevationDifference,
    targetIsMakingDisplacementAttack: options.targetIsMakingDisplacementAttack,
    targetIsPushing: options.targetIsPushing,
    targetDisplacementAttackTargetId: options.targetDisplacementAttackTargetId,
    targetedByDisplacementAttackerId: options.targetedByDisplacementAttackerId,
  };

  const kickInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'kick',
    attackerProne: options.attackerProne,
  };
  const kickRestriction = canKick(kickInput);
  if (kickRestriction.allowed) {
    const kickDamage = calculateKickDamage(kickInput);
    candidates.push({ type: 'kick', expectedDamage: kickDamage });
  }

  const leftPunchInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'punch',
    arm: 'left',
    weaponsFiredFromArm: options.weaponsFiredFromLeftArm,
  };
  const rightPunchInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'punch',
    arm: 'right',
    weaponsFiredFromArm: options.weaponsFiredFromRightArm,
  };

  if (canPunch(leftPunchInput).allowed || canPunch(rightPunchInput).allowed) {
    const punchDamage = calculatePunchDamage(baseInput);
    candidates.push({ type: 'punch', expectedDamage: punchDamage });
  }

  if (options.isJumping) {
    const dfaInput: IPhysicalAttackInput = {
      ...baseInput,
      attackType: 'dfa',
      attackerJumpedThisTurn: true,
    };
    if (canDFA(dfaInput).allowed) {
      const dfaDamage = calculateDFADamageToTarget(dfaInput);
      candidates.push({ type: 'dfa', expectedDamage: dfaDamage });
    }
  }

  if (options.canReachForCharge && (options.hexesMoved ?? 0) > 1) {
    const chargeInput: IPhysicalAttackInput = {
      ...baseInput,
      attackType: 'charge',
      hexesMoved: options.hexesMoved,
      attackerRanThisTurn: true,
    };
    if (canCharge(chargeInput).allowed) {
      const chargeDamage = calculateChargeDamageToTarget(chargeInput);
      candidates.push({ type: 'charge', expectedDamage: chargeDamage });
    }
  }

  if (options.hasMeleeWeapon) {
    const meleeInput: IPhysicalAttackInput = {
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
        case 'lance':
          meleeDamage = calculateLanceDamage(meleeInput);
          break;
        case 'retractable-blade':
          meleeDamage = calculateRetractableBladeDamage(meleeInput);
          break;
      }
      candidates.push({
        type: options.hasMeleeWeapon,
        expectedDamage: meleeDamage,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.expectedDamage - a.expectedDamage);
  return candidates[0].type;
}
