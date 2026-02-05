/**
 * Contract morale tracking and update system
 *
 * Provides functions to update morale based on scenario outcomes and retrieve
 * display information for UI rendering.
 *
 * @module campaign/scenario/morale
 */

import {
  AtBMoraleLevel,
  MORALE_VALUES,
} from '@/types/campaign/scenario/scenarioTypes';

/**
 * Updates morale level based on scenario outcome.
 *
 * - Victory: increases morale by 1 (capped at OVERWHELMING +3)
 * - Defeat: decreases morale by 1 (capped at ROUTED -3)
 * - Draw: keeps morale unchanged
 *
 * @param currentLevel - Current morale level
 * @param scenarioOutcome - Outcome of the scenario
 * @returns Updated morale level
 *
 * @example
 * const newMorale = updateMorale(AtBMoraleLevel.STALEMATE, 'victory');
 * // Returns AtBMoraleLevel.ADVANCING
 */
export function updateMorale(
  currentLevel: AtBMoraleLevel,
  scenarioOutcome: 'victory' | 'defeat' | 'draw',
): AtBMoraleLevel {
  const currentValue = MORALE_VALUES[currentLevel];
  let newValue = currentValue;

  switch (scenarioOutcome) {
    case 'victory':
      newValue = Math.min(3, currentValue + 1);
      break;
    case 'defeat':
      newValue = Math.max(-3, currentValue - 1);
      break;
    case 'draw':
      break;
  }

  return getMoraleLevelFromValue(newValue);
}

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
