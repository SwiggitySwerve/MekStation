/**
 * Piloting quirk modifiers.
 */

import { UNIT_QUIRK_IDS } from './catalog';

/**
 * PSR modifier from piloting quirks.
 * @param unitQuirks - Unit's quirk identifiers
 * @param isTerrainPSR - Whether this PSR was triggered by terrain
 * @returns Modifier to add to PSR target number
 */
export function calculatePilotingQuirkPSRModifier(
  unitQuirks: readonly string[],
  isTerrainPSR: boolean,
): number {
  let modifier = 0;

  // Stable: -1 to all PSRs
  if (unitQuirks.includes(UNIT_QUIRK_IDS.STABLE)) {
    modifier -= 1;
  }

  // Hard to Pilot: +1 to all PSRs
  if (unitQuirks.includes(UNIT_QUIRK_IDS.HARD_TO_PILOT)) {
    modifier += 1;
  }

  // Cramped Cockpit: +1 to all piloting rolls
  if (unitQuirks.includes(UNIT_QUIRK_IDS.CRAMPED_COCKPIT)) {
    modifier += 1;
  }

  // Easy to Pilot: -1 to terrain PSRs only
  if (isTerrainPSR && unitQuirks.includes(UNIT_QUIRK_IDS.EASY_TO_PILOT)) {
    modifier -= 1;
  }

  // Unbalanced: +1 to terrain PSRs only
  if (isTerrainPSR && unitQuirks.includes(UNIT_QUIRK_IDS.UNBALANCED)) {
    modifier += 1;
  }

  return modifier;
}
