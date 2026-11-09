/**
 * Contract morale tracking and update system
 *
 * Provides the level/number mapping and display information for UI rendering.
 * The morale CHECK (how a level changes) is in `contractMorale.ts`.
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

/**
 * Display information for a morale level.
 */
export interface IMoraleDisplayInfo {
  readonly label: string;
  readonly color: string;
  readonly description: string;
}

/**
 * Gets display information for a morale level.
 *
 * Returns label, color, and description suitable for UI rendering.
 *
 * @param level - Morale level
 * @returns Display information (immutable)
 *
 * @example
 * const info = getMoraleDisplayInfo(AtBMoraleLevel.OVERWHELMING);
 * // Returns { label: 'Overwhelming', color: 'darkgreen', description: '...' }
 */
export function getMoraleDisplayInfo(
  level: AtBMoraleLevel,
): Readonly<IMoraleDisplayInfo> {
  const displayMap: Record<AtBMoraleLevel, IMoraleDisplayInfo> = {
    [AtBMoraleLevel.ROUTED]: {
      label: 'Routed',
      color: 'red',
      description: 'Company morale has collapsed',
    },
    [AtBMoraleLevel.CRITICAL]: {
      label: 'Critical',
      color: 'orange',
      description: 'Company morale is critically low',
    },
    [AtBMoraleLevel.WEAKENED]: {
      label: 'Weakened',
      color: 'yellow',
      description: 'Company morale is weakened',
    },
    [AtBMoraleLevel.STALEMATE]: {
      label: 'Stalemate',
      color: 'gray',
      description: 'Neither side has the advantage',
    },
    [AtBMoraleLevel.ADVANCING]: {
      label: 'Advancing',
      color: 'lightgreen',
      description: 'Company morale is improving',
    },
    [AtBMoraleLevel.DOMINATING]: {
      label: 'Dominating',
      color: 'green',
      description: 'Company morale is high',
    },
    [AtBMoraleLevel.OVERWHELMING]: {
      label: 'Overwhelming',
      color: 'darkgreen',
      description: 'Company morale is overwhelming',
    },
  };

  return Object.freeze(displayMap[level]);
}
