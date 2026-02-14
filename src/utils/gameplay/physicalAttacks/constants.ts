import { CombatLocation } from '@/types/gameplay';

export const PUNCH_DAMAGE_DIVISOR = 10;
export const KICK_DAMAGE_DIVISOR = 5;
export const KICK_TO_HIT_BONUS = 2;
export const PUSH_TO_HIT_BONUS = 1;
export const CHARGE_DAMAGE_DIVISOR = 10;
export const DFA_TARGET_DAMAGE_DIVISOR = 10;
export const DFA_DAMAGE_MULTIPLIER = 3;
export const DFA_ATTACKER_DAMAGE_DIVISOR = 5;
export const HATCHET_DAMAGE_DIVISOR = 5;
export const SWORD_DAMAGE_DIVISOR = 10;
export const SWORD_DAMAGE_BONUS = 1;
export const MACE_WEIGHT_MULTIPLIER = 2;
export const MACE_DAMAGE_DIVISOR = 5;
export const UPPER_ARM_PUNCH_MODIFIER = 2;
export const LOWER_ARM_PUNCH_MODIFIER = 2;
export const HAND_PUNCH_MODIFIER = 1;
export const UPPER_LEG_KICK_MODIFIER = 2;
export const LOWER_LEG_KICK_MODIFIER = 2;
export const FOOT_KICK_MODIFIER = 1;
export const HATCHET_TO_HIT_MODIFIER = -1;
export const SWORD_TO_HIT_MODIFIER = -2;
export const MACE_TO_HIT_MODIFIER = 1;
export const DFA_MISS_PSR_MODIFIER = 4;

export const PUNCH_HIT_TABLE: Readonly<Record<number, CombatLocation>> = {
  1: 'left_arm',
  2: 'left_torso',
  3: 'center_torso',
  4: 'right_torso',
  5: 'right_arm',
  6: 'head',
};

export const KICK_HIT_TABLE: Readonly<Record<number, CombatLocation>> = {
  1: 'right_leg',
  2: 'right_leg',
  3: 'right_leg',
  4: 'left_leg',
  5: 'left_leg',
  6: 'left_leg',
};

export const TSM_ACTIVATION_HEAT = 9;
