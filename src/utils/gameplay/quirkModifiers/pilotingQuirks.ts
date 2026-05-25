/**
 * Piloting quirk modifiers.
 */

import { PSRTrigger } from '@/types/gameplay/PSRTriggerCodes';

import { UNIT_QUIRK_IDS } from './catalog';

type PilotingQuirkPSRReason = PSRTrigger | string | undefined;

function isStablePSR(reasonCode: PilotingQuirkPSRReason): boolean {
  return reasonCode === PSRTrigger.Kicked || reasonCode === PSRTrigger.Pushed;
}

/**
 * PSR modifier from piloting quirks.
 * @param unitQuirks - Unit's quirk identifiers
 * @param isTerrainPSR - Whether this PSR was triggered by terrain
 * @param reasonCode - Canonical PSR reason/trigger for source-scoped quirks
 * @returns Modifier to add to PSR target number
 */
export function calculatePilotingQuirkPSRModifier(
  unitQuirks: readonly string[],
  isTerrainPSR: boolean,
  reasonCode?: PilotingQuirkPSRReason,
): number {
  let modifier = 0;

  // Stable: MegaMek applies -1 only to kick/push PSRs.
  if (unitQuirks.includes(UNIT_QUIRK_IDS.STABLE) && isStablePSR(reasonCode)) {
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
