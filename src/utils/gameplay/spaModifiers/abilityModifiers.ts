/**
 * General Ability Modifiers
 * Blood Stalker, Multi-Tasker, Jumping/Hopping Jack, Dodge, Melee Specialist,
 * Tactical Genius, Iron Man, Hot Dog, Cluster Hitter, and related abilities.
 */

import { MovementType } from '@/types/gameplay';
import { IToHitModifierDetail } from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

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

function isMekOrProtoMekUnitType(unitType?: string): boolean {
  if (!unitType) return true;

  const normalized = unitType.replace(/[\s_-]/g, '').toLowerCase();
  return (
    normalized === 'battlemech' ||
    normalized === 'omnimech' ||
    normalized === 'industrialmech' ||
    normalized === 'protomech'
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

function hasAnyTerrain(
  terrainFeatures: readonly ITerrainFeature[],
  types: readonly TerrainType[],
): boolean {
  return terrainFeatures.some((feature) => types.includes(feature.type));
}

function isRunBasedMovement(movementType: MovementType): boolean {
  return (
    movementType === MovementType.Run ||
    movementType === MovementType.Evade ||
    movementType === MovementType.Sprint
  );
}

/**
 * Terrain Master defensive gunnery variants.
 */
export function calculateTerrainMasterDefensiveToHitModifier(
  targetAbilities: readonly string[],
  targetMovementType: MovementType,
  targetTerrainFeatures: readonly ITerrainFeature[],
): IToHitModifierDetail | null {
  if (
    hasSPA(targetAbilities, 'tm_forest_ranger') &&
    targetMovementType === MovementType.Walk &&
    hasAnyTerrain(targetTerrainFeatures, [
      TerrainType.LightWoods,
      TerrainType.HeavyWoods,
    ])
  ) {
    return {
      name: 'Forest Ranger',
      value: 1,
      source: 'spa',
      description:
        'Terrain Master: Forest Ranger: walking target in woods (+1)',
    };
  }

  if (
    hasSPA(targetAbilities, 'tm_swamp_beast') &&
    isRunBasedMovement(targetMovementType) &&
    hasAnyTerrain(targetTerrainFeatures, [TerrainType.Mud, TerrainType.Swamp])
  ) {
    return {
      name: 'Swamp Beast',
      value: 1,
      source: 'spa',
      description:
        'Terrain Master: Swamp Beast: running target in mud/swamp (+1)',
    };
  }

  return null;
}

/**
 * Shaky Stick: +1 enemy to-hit for airborne targets attacked from the ground.
 */
export function calculateShakyStickModifier(
  targetAbilities: readonly string[],
  targetIsAirborne?: boolean,
  attackerIsAirborne?: boolean,
): IToHitModifierDetail | null {
  if (!hasSPA(targetAbilities, 'shaky_stick')) return null;
  if (targetIsAirborne !== true) return null;
  if (attackerIsAirborne === true) return null;

  return {
    name: 'Shaky Stick',
    value: 1,
    source: 'spa',
    description: 'Shaky Stick: airborne target attacked from ground (+1)',
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
 * Terrain Master: Frogman: -1 to physical to-hit in depth-2+ water.
 */
export function calculateFrogmanPhysicalToHitModifier(
  abilities: readonly string[],
  attackerWaterDepth?: number,
  attackerUnitType?: string,
): IToHitModifierDetail | null {
  if (!hasSPA(abilities, 'tm_frogman')) return null;
  if (!isMekOrProtoMekUnitType(attackerUnitType)) return null;
  if ((attackerWaterDepth ?? 0) <= 1) return null;

  return {
    name: 'Frogman',
    value: -1,
    source: 'spa',
    description: 'Frogman: -1 physical attack to-hit in depth-2+ water',
  };
}

/**
 * Terrain Master: Frogman: -1 to entering depth-2+ water PSRs.
 */
export function getFrogmanWaterPSRModifier(
  abilities: readonly string[],
  waterDepth?: number,
  unitType?: string,
): number {
  if (!hasSPA(abilities, 'tm_frogman')) return 0;
  if (!isMekOrProtoMekUnitType(unitType)) return 0;
  if ((waterDepth ?? 0) <= 1) return 0;

  return -1;
}

/**
 * Terrain Master: Mountaineer: -1 to entering-rubble PSRs.
 */
export function getMountaineerRubblePSRModifier(
  abilities: readonly string[],
): number {
  return hasSPA(abilities, 'tm_mountaineer') ? -1 : 0;
}

/**
 * Melee Specialist: +1 physical attack damage bonus.
 * Not a to-hit modifier -- returns a damage bonus.
 */
export function getMeleeSpecialistDamageBonus(
  abilities: readonly string[],
): number {
  return hasSPA(abilities, 'melee_specialist') ? 1 : 0;
}

/**
 * Melee Master grants an additional physical attack, not flat damage.
 */
export function getMeleeMasterDamageBonus(
  _abilities: readonly string[],
): number {
  return 0;
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
 * Tactical Genius is an initiative reroll gate, not a flat initiative bonus.
 */
export function getTacticalGeniusBonus(_abilities: readonly string[]): number {
  return 0;
}

/**
 * MegaMek uses Pain Resistance for consciousness/wake-up rolls and
 * ammunition-explosion pilot damage, not ranged to-hit wound relief.
 */
export function getEffectiveWounds(
  _abilities: readonly string[],
  pilotWounds: number,
): number {
  return pilotWounds;
}

/**
 * MegaMek Iron Man reduces ammunition-explosion pilot damage only.
 */
export function getIronManModifier(_abilities: readonly string[]): number {
  return 0;
}

/**
 * Hot Dog: -1 to heat check target numbers.
 */
export function getHotDogHeatTargetNumberModifier(
  abilities: readonly string[],
): number {
  return hasSPA(abilities, 'hot_dog') ? -1 : 0;
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
