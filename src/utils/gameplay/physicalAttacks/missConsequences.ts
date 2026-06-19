import type { IPhysicalAttackInput, PhysicalAttackType } from './types';

import { DFA_MISS_PSR_MODIFIER } from './constants';
import { calculateBrushOffDamage, isTwoHandedZweihanderAttack } from './damage';

interface PhysicalMissConsequences {
  attackerPSR: boolean;
  attackerPSRModifier: number;
  attackerDamage: number;
  hitTable?: 'punch' | 'kick';
}

type PhysicalMissConsequenceResolver = (
  input?: IPhysicalAttackInput,
) => PhysicalMissConsequences;

const NO_MISS_CONSEQUENCE: PhysicalMissConsequences = {
  attackerPSR: false,
  attackerPSRModifier: 0,
  attackerDamage: 0,
};

const PHYSICAL_MISS_CONSEQUENCE_RESOLVERS = {
  kick: () => ({
    attackerPSR: true,
    attackerPSRModifier: 0,
    attackerDamage: 0,
  }),
  charge: () => NO_MISS_CONSEQUENCE,
  dfa: () => ({
    attackerPSR: true,
    attackerPSRModifier: DFA_MISS_PSR_MODIFIER,
    attackerDamage: 0,
  }),
  'brush-off': (input) => ({
    attackerPSR: false,
    attackerPSRModifier: 0,
    attackerDamage: input ? calculateBrushOffDamage(input) : 0,
    hitTable: 'punch',
  }),
} satisfies Partial<
  Record<PhysicalAttackType, PhysicalMissConsequenceResolver>
>;

function hasExplicitMissConsequence(
  attackType: PhysicalAttackType,
): attackType is keyof typeof PHYSICAL_MISS_CONSEQUENCE_RESOLVERS {
  return attackType in PHYSICAL_MISS_CONSEQUENCE_RESOLVERS;
}

export function getPhysicalMissConsequences(
  attackType: PhysicalAttackType,
  input?: IPhysicalAttackInput,
): PhysicalMissConsequences {
  if (hasExplicitMissConsequence(attackType)) {
    return PHYSICAL_MISS_CONSEQUENCE_RESOLVERS[attackType](input);
  }
  if (!input || !isTwoHandedZweihanderAttack(input)) return NO_MISS_CONSEQUENCE;
  return { attackerPSR: true, attackerPSRModifier: 0, attackerDamage: 0 };
}
