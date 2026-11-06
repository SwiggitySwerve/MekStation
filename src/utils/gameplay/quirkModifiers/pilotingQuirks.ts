/**
 * Piloting quirk modifiers.
 */

import {
  hasActiveDNI,
  type IActiveDNIOptions,
} from '@/lib/spa/neuralInterface';
import { PSRTrigger } from '@/types/gameplay/PSRTriggerCodes';

import { UNIT_QUIRK_IDS, hasQuirk } from './catalog';

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
 * @param nativeDNI - Native game mode and verified DNI cockpit hardware
 * @returns Modifier to add to PSR target number
 */
export function calculatePilotingQuirkPSRModifier(
  unitQuirks: readonly string[],
  isTerrainPSR: boolean,
  reasonCode?: PilotingQuirkPSRReason,
  basePilotingSkill?: number,
  pilotAbilities: readonly string[] = [],
  nativeDNI: IActiveDNIOptions = {},
): number {
  let modifier = 0;

  // Stable: MegaMek applies -1 only to kick/push PSRs.
  if (hasQuirk(unitQuirks, UNIT_QUIRK_IDS.STABLE) && isStablePSR(reasonCode)) {
    modifier -= 1;
  }

  // MegaMek 48fcb2f64 Entity.java:8939-8946: active native DNI suppresses HTP.
  if (
    hasQuirk(unitQuirks, UNIT_QUIRK_IDS.HARD_TO_PILOT) &&
    !hasActiveDNI(pilotAbilities, nativeDNI)
  ) {
    modifier += 1;
  }

  // Cramped Cockpit: MegaMek suppresses this penalty for Small Pilot.
  if (
    hasQuirk(unitQuirks, UNIT_QUIRK_IDS.CRAMPED_COCKPIT) &&
    !pilotAbilities.includes(SMALL_PILOT_ABILITY_ID)
  ) {
    modifier += 1;
  }

  // Easy to Pilot: MegaMek gates relief to pilots worse than 3.
  if (
    hasQuirk(unitQuirks, UNIT_QUIRK_IDS.EASY_TO_PILOT) &&
    basePilotingSkill !== undefined &&
    basePilotingSkill > 3 &&
    isEasyToPilotPSR(isTerrainPSR, reasonCode)
  ) {
    modifier -= 1;
  }

  // No/Minimal Arms: MegaMek applies +2 only to stand-up PSRs.
  if (
    hasQuirk(unitQuirks, UNIT_QUIRK_IDS.NO_ARMS) &&
    isStandingUpPSR(reasonCode)
  ) {
    modifier += 2;
  }

  // Unbalanced: +1 to terrain PSRs only
  if (isTerrainPSR && hasQuirk(unitQuirks, UNIT_QUIRK_IDS.UNBALANCED)) {
    modifier += 1;
  }

  return modifier;
}
