/**
 * Hit Location Module
 * Implements BattleTech hit location tables and damage location determination.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

import { FiringArc } from '@/types/gameplay';
import {
  CombatLocation,
  IDiceRoll,
  IHitLocationResult,
} from '@/types/gameplay';
export { type D6Roller, defaultD6Roller, rollD6, roll2d6 } from './diceTypes';
import { type D6Roller, defaultD6Roller, rollD6, roll2d6 } from './diceTypes';

// =============================================================================
// Hit Location Tables
// =============================================================================

/**
 * Front arc hit location table (standard biped mech).
 * Based on 2d6 roll.
 */
export const FRONT_HIT_LOCATION_TABLE: Readonly<
  Record<number, CombatLocation>
> = {
  2: 'center_torso', // Critical hit trigger
  3: 'right_arm',
  4: 'right_arm',
  5: 'right_leg',
  6: 'right_torso',
  7: 'center_torso',
  8: 'left_torso',
  9: 'left_leg',
  10: 'left_arm',
  11: 'left_arm',
  12: 'head',
};

/**
 * Left side arc hit location table.
 */
export const LEFT_HIT_LOCATION_TABLE: Readonly<Record<number, CombatLocation>> =
  {
    2: 'left_torso', // Critical hit trigger
    3: 'left_leg',
    4: 'left_arm',
    5: 'left_arm',
    6: 'left_leg',
    7: 'left_torso',
    8: 'center_torso',
    9: 'right_torso',
    10: 'right_arm',
    11: 'right_leg',
    12: 'head',
  };

/**
 * Right side arc hit location table.
 */
export const RIGHT_HIT_LOCATION_TABLE: Readonly<
  Record<number, CombatLocation>
> = {
  2: 'right_torso', // Critical hit trigger
  3: 'right_leg',
  4: 'right_arm',
  5: 'right_arm',
  6: 'right_leg',
  7: 'right_torso',
  8: 'center_torso',
  9: 'left_torso',
  10: 'left_arm',
  11: 'left_leg',
  12: 'head',
};

/**
 * Rear arc hit location table.
 * Uses rear armor values for torso locations.
 */
export const REAR_HIT_LOCATION_TABLE: Readonly<Record<number, CombatLocation>> =
  {
    2: 'center_torso_rear', // Critical hit trigger
    3: 'right_arm',
    4: 'right_arm',
    5: 'right_leg',
    6: 'right_torso_rear',
    7: 'center_torso_rear',
    8: 'left_torso_rear',
    9: 'left_leg',
    10: 'left_arm',
    11: 'left_arm',
    12: 'head',
  };

/**
 * Get the appropriate hit location table for a firing arc.
 */
export function getHitLocationTable(
  arc: FiringArc,
): Readonly<Record<number, CombatLocation>> {
  switch (arc) {
    case FiringArc.Front:
      return FRONT_HIT_LOCATION_TABLE;
    case FiringArc.Left:
      return LEFT_HIT_LOCATION_TABLE;
    case FiringArc.Right:
      return RIGHT_HIT_LOCATION_TABLE;
    case FiringArc.Rear:
      return REAR_HIT_LOCATION_TABLE;
    default:
      return FRONT_HIT_LOCATION_TABLE;
  }
}

// =============================================================================
// Dice Rolling (re-exported from diceTypes.ts — single source of truth)
// =============================================================================

/**
 * Create a dice roll result from a predetermined value (for testing/replays).
 */
export function createDiceRoll(die1: number, die2: number): IDiceRoll {
  const total = die1 + die2;
  return {
    dice: [die1, die2],
    total,
    isSnakeEyes: total === 2,
    isBoxcars: total === 12,
  };
}

// =============================================================================
// Hit Location Determination
// =============================================================================

/**
 * Determine hit location from a firing arc.
 * Uses 2d6 on the appropriate hit location table.
 */
export function determineHitLocation(
  arc: FiringArc,
  diceRoller: D6Roller = defaultD6Roller,
): IHitLocationResult {
  const roll = roll2d6(diceRoller);
  return determineHitLocationFromRoll(arc, roll);
}

/**
 * Determine hit location from a specific roll (for testing/replays).
 */
export function determineHitLocationFromRoll(
  arc: FiringArc,
  roll: IDiceRoll,
): IHitLocationResult {
  const table = getHitLocationTable(arc);
  const location = table[roll.total];

  return {
    roll,
    arc,
    location,
    isCritical: isCriticalLocation(location) || roll.total === 2,
  };
}

/**
 * Check if a location is inherently critical (head, CT).
 */
export function isCriticalLocation(location: CombatLocation): boolean {
  return (
    location === 'head' ||
    location === 'center_torso' ||
    location === 'center_torso_rear'
  );
}

/**
 * Check if a location is a head hit.
 */
export function isHeadHit(location: CombatLocation): boolean {
  return location === 'head';
}

/**
 * Check if a location uses rear armor.
 */
export function usesRearArmor(location: CombatLocation): boolean {
  return (
    location === 'center_torso_rear' ||
    location === 'left_torso_rear' ||
    location === 'right_torso_rear'
  );
}

// =============================================================================
// Punch and Kick Tables (Physical Attacks)
// =============================================================================

/**
 * Punch hit location table (1d6).
 */
export const PUNCH_HIT_LOCATION_TABLE: Readonly<
  Record<number, CombatLocation>
> = {
  1: 'left_arm',
  2: 'left_torso',
  3: 'center_torso',
  4: 'right_torso',
  5: 'right_arm',
  6: 'head',
};

/**
 * Kick hit location table (1d6).
 */
export const KICK_HIT_LOCATION_TABLE: Readonly<Record<number, CombatLocation>> =
  {
    1: 'right_leg',
    2: 'right_leg',
    3: 'right_leg',
    4: 'left_leg',
    5: 'left_leg',
    6: 'left_leg',
  };

/**
 * Determine punch hit location.
 */
export function determinePunchLocation(
  diceRoller: D6Roller = defaultD6Roller,
): {
  roll: number;
  location: CombatLocation;
} {
  const roll = rollD6(diceRoller);
  return {
    roll,
    location: PUNCH_HIT_LOCATION_TABLE[roll],
  };
}

/**
 * Determine kick hit location.
 */
export function determineKickLocation(diceRoller: D6Roller = defaultD6Roller): {
  roll: number;
  location: CombatLocation;
} {
  const roll = rollD6(diceRoller);
  return {
    roll,
    location: KICK_HIT_LOCATION_TABLE[roll],
  };
}

// =============================================================================
// Cluster Damage Distribution
// =============================================================================

/**
 * Distribute cluster weapon hits across locations.
 * Each hit gets its own hit location roll.
 */
export function distributeClusterHits(
  arc: FiringArc,
  numberOfHits: number,
  damagePerHit: number,
  diceRoller: D6Roller = defaultD6Roller,
): { location: CombatLocation; damage: number; roll: IDiceRoll }[] {
  const results: {
    location: CombatLocation;
    damage: number;
    roll: IDiceRoll;
  }[] = [];

  for (let i = 0; i < numberOfHits; i++) {
    const hitResult = determineHitLocation(arc, diceRoller);
    results.push({
      location: hitResult.location,
      damage: damagePerHit,
      roll: hitResult.roll,
    });
  }

  return results;
}

/**
 * Group cluster hits by location for damage application.
 */
export function groupHitsByLocation(
  hits: readonly { location: CombatLocation; damage: number }[],
): Map<CombatLocation, number> {
  const grouped = new Map<CombatLocation, number>();

  for (const hit of hits) {
    const current = grouped.get(hit.location) ?? 0;
    grouped.set(hit.location, current + hit.damage);
  }

  return grouped;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get display name for a combat location.
 */
export function getLocationDisplayName(location: CombatLocation): string {
  const names: Record<CombatLocation, string> = {
    head: 'Head',
    center_torso: 'Center Torso',
    center_torso_rear: 'Center Torso (Rear)',
    left_torso: 'Left Torso',
    left_torso_rear: 'Left Torso (Rear)',
    right_torso: 'Right Torso',
    right_torso_rear: 'Right Torso (Rear)',
    left_arm: 'Left Arm',
    right_arm: 'Right Arm',
    left_leg: 'Left Leg',
    right_leg: 'Right Leg',
  };
  return names[location];
}

/**
 * Get all standard mech locations (excluding rear).
 */
export function getStandardLocations(): readonly CombatLocation[] {
  return [
    'head',
    'center_torso',
    'left_torso',
    'right_torso',
    'left_arm',
    'right_arm',
    'left_leg',
    'right_leg',
  ];
}

/**
 * Get all mech locations including rear.
 */
export function getAllLocations(): readonly CombatLocation[] {
  return [
    'head',
    'center_torso',
    'center_torso_rear',
    'left_torso',
    'left_torso_rear',
    'right_torso',
    'right_torso_rear',
    'left_arm',
    'right_arm',
    'left_leg',
    'right_leg',
  ];
}
