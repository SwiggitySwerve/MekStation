/**
 * Dice Types Module
 * Single source of truth for all dice roller types and basic dice functions.
 *
 * Two roller types serve different purposes:
 * - D6Roller: Returns a single d6 value (used by hitLocation, criticalHits, ammo, physicalAttacks, fallMechanics, pilotingSkillRolls)
 * - DiceRoller: Returns a full 2d6 roll result object with snake eyes/boxcars detection (used by gameSession, specialWeapons)
 */

import { IDiceRoll } from '@/types/gameplay';

// =============================================================================
// Dice Roller Types
// =============================================================================

/**
 * Simple d6 roller function type.
 * Returns a single die value (1-6).
 */
export type D6Roller = () => number;

/**
 * Full 2d6 dice roller function type.
 * Returns complete roll result with individual dice, total, and special roll detection.
 */
export type DiceRoller = () => {
  dice: readonly number[];
  total: number;
  isSnakeEyes: boolean;
  isBoxcars: boolean;
};

// =============================================================================
// Dice Rolling Functions
// =============================================================================

export const defaultD6Roller: D6Roller = () =>
  Math.floor(Math.random() * 6) + 1;

/**
 * Roll a single d6. Accepts an optional injectable roller for deterministic testing.
 */
export function rollD6(roller: D6Roller = defaultD6Roller): number {
  return roller();
}

/**
 * Roll 2d6 and return detailed result. Accepts an optional injectable roller.
 */
export function roll2d6(roller: D6Roller = defaultD6Roller): IDiceRoll {
  const die1 = rollD6(roller);
  const die2 = rollD6(roller);
  const total = die1 + die2;

  return {
    dice: [die1, die2],
    total,
    isSnakeEyes: total === 2,
    isBoxcars: total === 12,
  };
}
