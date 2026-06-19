import type {
  IPhysicalAttackInput,
  IPhysicalAttackOption,
  IPhysicalAttackRestriction,
  IPhysicalAttackSelfRisk,
  PhysicalAttackInvalidReason,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from './types';

import { calculatePhysicalDamage } from './damage';
import { calculatePhysicalToHit } from './toHit';

function restrictionFailedCodes(
  restriction: IPhysicalAttackRestriction,
): readonly PhysicalAttackInvalidReason[] {
  if (restriction.allowed) return [];
  if (restriction.reasonCode) return [restriction.reasonCode];
  return [];
}

/**
 * Per `physical-attack-system` delta "Self-Risk Summary in Options":
 * compute the UI-facing self-risk for each attack type. Driven by the
 * same damage helper used at resolution — no new rules here.
 */
function buildSelfRisk(
  attackType: PhysicalAttackType,
  input: IPhysicalAttackInput,
): IPhysicalAttackSelfRisk {
  const damage = calculatePhysicalDamage(input);

  switch (attackType) {
    case 'charge':
      return {
        damageToAttacker: damage.attackerDamage,
        legDamagePerLeg: 0,
        pilotingSkillRoll: {
          trigger: 'ChargeCompleted',
          required: true,
        },
        onMiss: 'None',
      };
    case 'dfa':
      return {
        damageToAttacker: damage.attackerDamage,
        legDamagePerLeg: damage.attackerLegDamagePerLeg,
        pilotingSkillRoll: {
          trigger: 'DFACompleted',
          required: true,
        },
        onMiss: 'AttackerFalls',
      };
    case 'kick':
      return {
        damageToAttacker: 0,
        legDamagePerLeg: 0,
        pilotingSkillRoll: {
          trigger: 'KickMiss',
          required: false,
        },
        onMiss: 'AttackerFalls',
      };
    case 'push':
      return {
        damageToAttacker: 0,
        legDamagePerLeg: 0,
        pilotingSkillRoll: null,
        onMiss: null,
      };
    case 'thrash':
      return {
        damageToAttacker: 0,
        legDamagePerLeg: 0,
        pilotingSkillRoll: {
          trigger: 'ThrashCompleted',
          required: true,
        },
        onMiss: null,
      };
    case 'brush-off':
      return {
        damageToAttacker: damage.targetDamage,
        legDamagePerLeg: 0,
        pilotingSkillRoll: null,
        onMiss: 'None',
      };
    default:
      return {
        damageToAttacker: 0,
        legDamagePerLeg: 0,
        pilotingSkillRoll: null,
        onMiss: null,
      };
  }
}

/**
 * Build a single option row. Keeps the shape uniform across eligible
 * and ineligible rows — the forecast modal + sub-panel both render
 * the same skeleton and switch on `restrictionsFailed.length` for
 * enabled/disabled styling.
 */
export function buildOption(
  attackType: PhysicalAttackType,
  input: IPhysicalAttackInput,
  restriction: IPhysicalAttackRestriction,
  limb?: PhysicalAttackLimb,
): IPhysicalAttackOption {
  const toHit = calculatePhysicalToHit(input);
  const damage = calculatePhysicalDamage(input);
  const selfRisk = buildSelfRisk(attackType, input);

  return {
    attackType,
    limb,
    toHit,
    damage,
    selfRisk,
    restrictionsFailed: restrictionFailedCodes(restriction),
  };
}
