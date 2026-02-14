/**
 * General Ability Modifiers
 * Blood Stalker, Multi-Tasker, Jumping Jack, Dodge, Melee Specialist,
 * Tactical Genius, Iron Man, Hot Dog, Cluster Hitter, and related abilities.
 */

import { MovementType } from '@/types/gameplay';
import { IToHitModifierDetail } from '@/types/gameplay';

/**
 * Blood Stalker: -1 vs designated target, +2 vs all others.
 */
export function calculateBloodStalkerModifier(
  abilities: readonly string[],
  targetId?: string,
  designatedTargetId?: string,
): IToHitModifierDetail | null {
  if (!abilities.includes('blood-stalker')) return null;
  if (!targetId || !designatedTargetId) return null;

  const isDesignated = targetId === designatedTargetId;
  return {
    name: 'Blood Stalker',
    value: isDesignated ? -1 : 2,
    source: 'spa',
    description: isDesignated
      ? 'Blood Stalker (designated target): -1'
      : 'Blood Stalker (non-designated target): +2',
  };
}

/**
 * Multi-Tasker: -1 to secondary target penalty.
 */
export function calculateMultiTaskerModifier(
  abilities: readonly string[],
  isSecondaryTarget?: boolean,
): IToHitModifierDetail | null {
  if (!abilities.includes('multi-tasker')) return null;
  if (!isSecondaryTarget) return null;

  return {
    name: 'Multi-Tasker',
    value: -1,
    source: 'spa',
    description: 'Multi-Tasker: -1 secondary target penalty',
  };
}

/**
 * Cluster Hitter: +1 column shift on cluster hit table.
 * This doesn't return a to-hit modifier — it's a damage modifier.
 * Used when resolving cluster weapon hits.
 */
export function getClusterHitterBonus(abilities: readonly string[]): number {
  return abilities.includes('cluster-hitter') ? 1 : 0;
}

/**
 * Jumping Jack: reduces jump attack modifier from +3 to +1.
 */
export function calculateJumpingJackModifier(
  abilities: readonly string[],
  movementType: MovementType,
): IToHitModifierDetail | null {
  if (!abilities.includes('jumping-jack')) return null;
  if (movementType !== MovementType.Jump) return null;

  return {
    name: 'Jumping Jack',
    value: -2,
    source: 'spa',
    description: 'Jumping Jack: jump modifier reduced to +1 (instead of +3)',
  };
}

/**
 * Dodge Maneuver: +2 to-hit for enemies when dodging.
 * Applied to the TARGET's modifier — affects attacker's roll.
 */
export function calculateDodgeManeuverModifier(
  targetAbilities: readonly string[],
  isDodging?: boolean,
): IToHitModifierDetail | null {
  if (!targetAbilities.includes('dodge-maneuver')) return null;
  if (!isDodging) return null;

  return {
    name: 'Dodge Maneuver',
    value: 2,
    source: 'spa',
    description: 'Dodge Maneuver: target is dodging (+2)',
  };
}

/**
 * Melee Specialist: -1 to-hit for physical attacks.
 */
export function calculateMeleeSpecialistModifier(
  abilities: readonly string[],
): IToHitModifierDetail | null {
  if (!abilities.includes('melee-specialist')) return null;

  return {
    name: 'Melee Specialist',
    value: -1,
    source: 'spa',
    description: 'Melee Specialist: -1 physical attack',
  };
}

/**
 * Melee Master: +1 physical attack damage bonus.
 * Not a to-hit modifier — returns a damage bonus.
 */
export function getMeleeMasterDamageBonus(
  abilities: readonly string[],
): number {
  return abilities.includes('melee-master') ? 1 : 0;
}

/**
 * Tactical Genius: +1 initiative.
 */
export function getTacticalGeniusBonus(abilities: readonly string[]): number {
  return abilities.includes('tactical-genius') ? 1 : 0;
}

/**
 * Pain Resistance: ignore first wound penalty.
 * Returns the effective wound count for to-hit penalty calculation.
 */
export function getEffectiveWounds(
  abilities: readonly string[],
  pilotWounds: number,
): number {
  if (abilities.includes('pain-resistance') && pilotWounds > 0) {
    return pilotWounds - 1;
  }
  return pilotWounds;
}

/**
 * Iron Man: -2 to consciousness check target numbers.
 */
export function getIronManModifier(abilities: readonly string[]): number {
  return abilities.includes('iron-man') ? -2 : 0;
}

/**
 * Hot Dog: +3 to shutdown heat threshold.
 * Increases the heat level at which shutdown checks begin.
 */
export function getHotDogShutdownThresholdBonus(
  abilities: readonly string[],
): number {
  return abilities.includes('hot-dog') ? 3 : 0;
}
