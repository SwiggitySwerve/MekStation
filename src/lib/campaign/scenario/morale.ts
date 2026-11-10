/**
 * Contract morale tracking and update system
 *
 * Provides the level/number mapping. The morale CHECK (how a level changes)
 * is in `contractMorale.ts`.
 *
 * @module campaign/scenario/morale
 */

import {
  AtBMoraleLevel,
  MORALE_VALUES,
} from '@/types/campaign/scenario/scenarioTypes';

/**
 * Maps a numeric morale value to its corresponding morale level.
 *
 * @param value - Numeric morale value (-3 to +3)
 * @returns Corresponding morale level
 * @throws Error if value is outside valid range
 *
 * @example
 * const level = getMoraleLevelFromValue(0);
 * // Returns AtBMoraleLevel.STALEMATE
 */
export function getMoraleLevelFromValue(value: number): AtBMoraleLevel {
  const level = Object.entries(MORALE_VALUES).find(([, v]) => v === value)?.[0];

  if (!level) {
    throw new Error(
      `Invalid morale value: ${value}. Must be between -3 and 3.`,
    );
  }

  return level as AtBMoraleLevel;
}
