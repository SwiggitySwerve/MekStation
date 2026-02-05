/**
 * Faction Standing Escalation System
 *
 * Manages accolades (positive escalations) and censures (negative escalations)
 * that trigger when faction standing crosses thresholds.
 *
 * Accolades trigger when regard >= Level 5 threshold (+10)
 * Censures trigger when regard < 0
 */

import { IFactionStanding } from '../../../types/campaign/factionStanding/IFactionStanding';

/**
 * Accolade escalation levels (0-5)
 * Positive recognition from the faction
 */
export enum AccoladeLevel {
  NONE = 0,
  TAKING_NOTICE = 1,
  PRESS_RECOGNITION = 2,
  CASH_BONUS = 3,
  ADOPTION = 4,
  STATUE = 5,
}

/**
 * Censure escalation levels (0-5)
 * Negative consequences from the faction
 */
export enum CensureLevel {
  NONE = 0,
  FORMAL_WARNING = 1,
  NEWS_ARTICLE = 2,
  COMMANDER_RETIREMENT = 3,
  LEADERSHIP_REPLACEMENT = 4,
  DISBAND = 5,
}

/**
 * Check if an accolade escalation is eligible.
 * Triggers when regard >= Level 5 threshold (+10) and accoladeLevel < max
 *
 * @param standing The faction standing to check
 * @returns The next accolade level if eligible, null otherwise
 */
export function checkAccoladeEscalation(
  standing: IFactionStanding,
): AccoladeLevel | null {
  // Accolades trigger at Level 5 threshold (+10)
  if (standing.regard < 10) {
    return null;
  }

  // Can't escalate beyond max level (STATUE = 5)
  if (standing.accoladeLevel >= 5) {
    return null;
  }

  // Return the next level
  return (standing.accoladeLevel + 1) as AccoladeLevel;
}

/**
 * Check if a censure escalation is eligible.
 * Triggers when regard < 0 and censureLevel < max
 *
 * @param standing The faction standing to check
 * @returns The next censure level if eligible, null otherwise
 */
export function checkCensureEscalation(
  standing: IFactionStanding,
): CensureLevel | null {
  // Censures trigger at negative regard
  if (standing.regard >= 0) {
    return null;
  }

  // Can't escalate beyond max level (DISBAND = 5)
  if (standing.censureLevel >= 5) {
    return null;
  }

  // Return the next level
  return (standing.censureLevel + 1) as CensureLevel;
}

/**
 * Apply an accolade escalation to a standing.
 * Increments accoladeLevel, capped at max (5)
 *
 * @param standing The faction standing to update
 * @param level The accolade level to apply
 * @returns A new standing object with updated accoladeLevel
 */
export function applyAccolade(
  standing: IFactionStanding,
  level: AccoladeLevel,
): IFactionStanding {
  // Calculate new accolade level (increment by 1, capped at 5)
  const newAccoladeLevel = Math.min(standing.accoladeLevel + 1, 5);

  return {
    ...standing,
    accoladeLevel: newAccoladeLevel,
  };
}

/**
 * Apply a censure escalation to a standing.
 * Increments censureLevel, capped at max (5)
 *
 * @param standing The faction standing to update
 * @param level The censure level to apply
 * @returns A new standing object with updated censureLevel
 */
export function applyCensure(
  standing: IFactionStanding,
  level: CensureLevel,
): IFactionStanding {
  // Calculate new censure level (increment by 1, capped at 5)
  const newCensureLevel = Math.min(standing.censureLevel + 1, 5);

  return {
    ...standing,
    censureLevel: newCensureLevel,
  };
}
