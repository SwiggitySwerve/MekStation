import { Facing, FiringArc, type CombatLocation } from '@/types/gameplay';
import { calculateFallDamage } from '@/utils/gameplay/fallMechanics';
import {
  determineHitLocation,
  roll2d6,
  type D6Roller,
} from '@/utils/gameplay/hitLocation';

import { DFA_MISS_FALL_FACING_OFFSET, DFA_MISS_FALL_HEIGHT } from './constants';
import { splitPhysicalDamageIntoClusters } from './physicalHitTable';

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
