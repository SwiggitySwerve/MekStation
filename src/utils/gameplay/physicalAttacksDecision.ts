import { IComponentDamageState } from '@/types/gameplay';

import {
  calculateChargeDamageToTarget,
  calculateDFADamageToTarget,
  calculateHatchetDamage,
  calculateKickDamage,
  calculateMaceDamage,
  calculatePunchDamage,
  calculateSwordDamage,
} from './physicalAttacksDamage';
import {
  canKick,
  canMeleeWeapon,
  canPunch,
} from './physicalAttacksRestrictions';
import {
  IChooseBestPhysicalAttackOptions,
  IPhysicalAttackCandidate,
  IPhysicalAttackInput,
  PhysicalAttackType,
} from './physicalAttacksTypes';

export function chooseBestPhysicalAttack(
  attackerTonnage: number,
  pilotingSkill: number,
  componentDamage: IComponentDamageState,
  options: IChooseBestPhysicalAttackOptions = {},
): PhysicalAttackType | null {
  const candidates: IPhysicalAttackCandidate[] = [];

  const baseInput: IPhysicalAttackInput = {
    attackerTonnage,
    pilotingSkill,
    componentDamage,
    attackType: 'punch',
    heat: options.heat,
    hasTSM: options.hasTSM,
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
    const dfaDamage = calculateDFADamageToTarget({
      ...baseInput,
      attackType: 'dfa',
    });
    candidates.push({ type: 'dfa', expectedDamage: dfaDamage });
  }

  if (options.canReachForCharge && (options.hexesMoved ?? 0) > 1) {
    const chargeDamage = calculateChargeDamageToTarget({
      ...baseInput,
      attackType: 'charge',
      hexesMoved: options.hexesMoved,
    });
    candidates.push({ type: 'charge', expectedDamage: chargeDamage });
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
