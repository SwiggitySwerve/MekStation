/**
 * Piloting quirk modifiers.
 */

import { PSRTrigger } from '@/types/gameplay/PSRTriggerCodes';

import { UNIT_QUIRK_IDS } from './catalog';

const SMALL_PILOT_ABILITY_ID = 'small_pilot';

type PilotingQuirkPSRReason = PSRTrigger | string | undefined;

function isStablePSR(reasonCode: PilotingQuirkPSRReason): boolean {
  return reasonCode === PSRTrigger.Kicked || reasonCode === PSRTrigger.Pushed;
}

function isEasyToPilotPSR(
  isTerrainPSR: boolean,
  reasonCode: PilotingQuirkPSRReason,
): boolean {
  return isTerrainPSR || reasonCode === PSRTrigger.PhaseDamage20Plus;
}

function isStandingUpPSR(reasonCode: PilotingQuirkPSRReason): boolean {
  return reasonCode === PSRTrigger.StandingUp;
}

/**
 * PSR modifier from piloting quirks.
 * @param unitQuirks - Unit's quirk identifiers
 * @param isTerrainPSR - Whether this PSR was triggered by terrain
 * @param reasonCode - Canonical PSR reason/trigger for source-scoped quirks
 * @param basePilotingSkill - Unmodified piloting skill before PSR modifiers
 * @param pilotAbilities - Pilot ability identifiers that can gate quirk behavior
 * @returns Modifier to add to PSR target number
 */
export function calculatePilotingQuirkPSRModifier(
  unitQuirks: readonly string[],
  isTerrainPSR: boolean,
  reasonCode?: PilotingQuirkPSRReason,
  basePilotingSkill?: number,
  pilotAbilities: readonly string[] = [],
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

  // Cramped Cockpit: MegaMek suppresses this penalty for Small Pilot.
  if (
    unitQuirks.includes(UNIT_QUIRK_IDS.CRAMPED_COCKPIT) &&
    !pilotAbilities.includes(SMALL_PILOT_ABILITY_ID)
  ) {
    modifier += 1;
  }

  // Easy to Pilot: MegaMek gates relief to pilots worse than 3.
  if (
    unitQuirks.includes(UNIT_QUIRK_IDS.EASY_TO_PILOT) &&
    basePilotingSkill !== undefined &&
    basePilotingSkill > 3 &&
    isEasyToPilotPSR(isTerrainPSR, reasonCode)
  ) {
    modifier -= 1;
  }

  // No/Minimal Arms: MegaMek applies +2 only to stand-up PSRs.
  if (
    unitQuirks.includes(UNIT_QUIRK_IDS.NO_ARMS) &&
    isStandingUpPSR(reasonCode)
  ) {
    modifier += 2;
  }

  // Unbalanced: +1 to terrain PSRs only
  if (isTerrainPSR && unitQuirks.includes(UNIT_QUIRK_IDS.UNBALANCED)) {
    modifier += 1;
  }

  return modifier;
}
