/**
 * General Ability Modifiers
 * Blood Stalker, Multi-Tasker, Jumping/Hopping Jack, Dodge, Melee Specialist,
 * Tactical Genius, Iron Man, Hot Dog, Cluster Hitter, and related abilities.
 */

import { MovementType } from '@/types/gameplay';
import { IToHitModifierDetail } from '@/types/gameplay';

import { hasSPA } from './canonicalize';

function isMekTargetUnitType(unitType?: string): boolean {
  if (!unitType) return true;

  const normalized = unitType.replace(/[\s_-]/g, '').toLowerCase();
  return (
    normalized === 'battlemech' ||
    normalized === 'omnimech' ||
    normalized === 'industrialmech'
  );
}

/**
 * Blood Stalker: -1 vs designated target, +2 vs all others.
 */
export function calculateBloodStalkerModifier(
  abilities: readonly string[],
  targetId?: string,
  designatedTargetId?: string,
): IToHitModifierDetail | null {
  if (!hasSPA(abilities, 'blood_stalker')) return null;
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
  if (!hasSPA(abilities, 'multi_tasker')) return null;
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
  return hasSPA(abilities, 'cluster_hitter') ? 1 : 0;
}

/**
 * Jumping Jack reduces jump attack modifier from +3 to +1.
 * Hopping Jack reduces jump attack modifier from +3 to +2.
 */
export function calculateJumpingJackModifier(
  abilities: readonly string[],
  movementType: MovementType,
): IToHitModifierDetail | null {
  if (movementType !== MovementType.Jump) return null;

  if (hasSPA(abilities, 'jumping_jack')) {
    return {
      name: 'Jumping Jack',
      value: -2,
      source: 'spa',
      description: 'Jumping Jack: jump modifier reduced to +1 (instead of +3)',
    };
  }

  if (hasSPA(abilities, 'hopping_jack')) {
    return {
      name: 'Hopping Jack',
      value: -1,
      source: 'spa',
      description: 'Hopping Jack: jump modifier reduced to +2 (instead of +3)',
    };
  }

  return null;
}

/**
 * Dodge Maneuver: +2 to-hit for enemies when dodging.
 * Applied to the TARGET's modifier — affects attacker's roll.
 */
export function calculateDodgeManeuverModifier(
  targetAbilities: readonly string[],
  isDodging?: boolean,
  targetUnitType?: string,
): IToHitModifierDetail | null {
  if (!hasSPA(targetAbilities, 'dodge_maneuver')) return null;
  if (!isDodging) return null;
  if (!isMekTargetUnitType(targetUnitType)) return null;

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
  if (!hasSPA(abilities, 'melee_specialist')) return null;

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
  return hasSPA(abilities, 'melee_master') ? 1 : 0;
}

/**
 * Maneuvering Ace: -1 to the movement-before-skid PSR modifier.
 */
export function getManeuveringAceSkidModifier(
  abilities: readonly string[],
): number {
  return hasSPA(abilities, 'maneuvering_ace') ? -1 : 0;
}

/**
 * Animal Mimicry: QuadMeks receive -1 on piloting rolls.
 */
export function getAnimalMimicryPSRModifier(
  abilities: readonly string[],
  isQuadMek: boolean,
): number {
  return isQuadMek && hasSPA(abilities, 'animal_mimic') ? -1 : 0;
}

/**
 * Tactical Genius: +1 initiative.
 */
export function getTacticalGeniusBonus(abilities: readonly string[]): number {
  return hasSPA(abilities, 'tactical_genius') ? 1 : 0;
}

/**
 * Pain Resistance: ignore first wound penalty.
 * Returns the effective wound count for to-hit penalty calculation.
 */
export function getEffectiveWounds(
  abilities: readonly string[],
  pilotWounds: number,
): number {
  if (hasSPA(abilities, 'pain_resistance') && pilotWounds > 0) {
    return pilotWounds - 1;
  }
  return pilotWounds;
}

/**
 * Iron Man: -2 to consciousness check target numbers.
 */
export function getIronManModifier(abilities: readonly string[]): number {
  return hasSPA(abilities, 'iron_man') ? -2 : 0;
}

/**
 * Hot Dog: +3 to shutdown heat threshold.
 * Increases the heat level at which shutdown checks begin.
 */
export function getHotDogShutdownThresholdBonus(
  abilities: readonly string[],
): number {
  return hasSPA(abilities, 'hot_dog') ? 3 : 0;
}

/**
 * Cool Under Fire: reduce generated heat by 1 per turn, minimum 0.
 */
export function getCoolUnderFireHeatReduction(
  abilities: readonly string[],
): number {
  return hasSPA(abilities, 'cool_under_fire') ||
    hasSPA(abilities, 'cool-under-fire')
    ? 1
    : 0;
}

/**
 * Some Like It Hot: reduce heat-induced to-hit penalties by 1.
 */
export function getSomeLikeItHotHeatPenaltyReduction(
  abilities: readonly string[],
): number {
  return hasSPA(abilities, 'some_like_it_hot') ||
    hasSPA(abilities, 'some-like-it-hot')
    ? 1
    : 0;
}
