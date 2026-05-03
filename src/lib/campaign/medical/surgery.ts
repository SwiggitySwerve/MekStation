/**
 * Surgery System - Permanent injury treatment
 *
 * Provides surgical procedures for treating permanent injuries:
 * - performSurgery: Attempt to heal a permanent injury via surgery
 * - installProsthetic: Install a prosthetic at an injury location
 *
 * @module campaign/medical/surgery
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IInjury } from '@/types/campaign/Person';

import { ISurgeryResult } from './medicalTypes';
import { roll2d6, RandomFn } from './standardMedical';

/**
 * Gets medicine skill value for a surgeon.
 *
 * @stub Plan 7 - IPilot.skills only carries gunnery/piloting; medicine skill
 * will be added in a future change. Returns hardcoded 7 until then.
 *
 * @param _surgeonEntry - The surgeon's roster entry
 * @param _pilot - The surgeon's vault pilot (null for NPC surgeons)
 * @returns Medicine skill value (default 7)
 */
function getMedicineSkillValue(
  _surgeonEntry: ICampaignRosterEntry,
  _pilot: IPilot | null,
): number {
  // @stub Plan 7 - Replace with actual skill lookup
  return 7;
}

/**
 * Perform surgery on a permanent injury.
 *
 * Surgery check:
 * - Target Number = Medicine Skill + Surgery Difficulty (2)
 * - Roll 2d6
 * - margin >= 3: permanent_healed (injury no longer permanent)
 * - margin >= 0: healed (prosthetic installed)
 * - margin < 0: no_change
 *
 * NPC behavior: NPCs can undergo surgery too (medical domain = PROCESS). Pass
 * `surgeonPilot = null` for NPC surgeons; identity resolves from
 * `surgeonEntry.pilotId`. NPC patients resolve identity from
 * `patientEntry.pilotId`.
 *
 * @param patientEntry - The injured person's roster entry
 * @param injury - The permanent injury being treated
 * @param surgeonEntry - The surgeon's roster entry
 * @param surgeonPilot - The surgeon's vault pilot (null for NPCs)
 * @param options - Campaign options
 * @param random - Injectable random function (0-1)
 * @returns Surgery result
 */
export function performSurgery(
  patientEntry: ICampaignRosterEntry,
  injury: IInjury,
  surgeonEntry: ICampaignRosterEntry,
  surgeonPilot: IPilot | null,
  options: ICampaignOptions,
  random: RandomFn,
): ISurgeryResult {
  if (!injury.permanent) {
    throw new Error('Injury must be permanent to perform surgery');
  }

  const medicineSkill = getMedicineSkillValue(surgeonEntry, surgeonPilot);
  const surgeryDifficulty = 2;

  const modifiers: { name: string; value: number }[] = [
    { name: 'Medicine Skill', value: medicineSkill },
    { name: 'Surgery Difficulty', value: surgeryDifficulty },
  ];

  const targetNumber = modifiers.reduce((sum, m) => sum + m.value, 0);
  const roll = roll2d6(random);
  const margin = roll - targetNumber;

  let outcome: 'permanent_healed' | 'healed' | 'no_change';
  let permanentRemoved = false;
  let prostheticInstalled = false;

  if (margin >= 3) {
    outcome = 'permanent_healed';
    permanentRemoved = true;
  } else if (margin >= 0) {
    outcome = 'healed';
    prostheticInstalled = true;
  } else {
    outcome = 'no_change';
  }

  return {
    patientId: patientEntry.pilotId,
    doctorId: surgeonEntry.pilotId,
    system: options.medicalSystem,
    roll,
    targetNumber,
    margin,
    outcome,
    injuryId: injury.id,
    healingDaysReduced: margin >= 0 ? injury.daysToHeal : 0,
    modifiers,
    permanentRemoved,
    prostheticInstalled,
  };
}

export function installProsthetic(
  injury: IInjury,
  location: string,
): IInjury & { hasProsthetic: boolean; prostheticLocation: string } {
  return {
    ...injury,
    hasProsthetic: true,
    prostheticLocation: location,
  };
}
