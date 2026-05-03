/**
 * Alternate Medical System - Attribute-based healing with margin-of-success
 *
 * Implements the alternate medical system with attribute checks:
 * - Doctor uses Medicine skill, patient uses BOD attribute
 * - Penalty based on injury severity and prosthetics
 * - Margin determines outcome:
 *   - Positive: healed
 *   - -1 to -5: extended healing time (no_change)
 *   - ≤ -6: becomes permanent (worsened)
 *
 * @module campaign/medical/alternateMedical
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IInjury } from '@/types/campaign/Person';

import { IMedicalCheckResult, MedicalSystem } from './medicalTypes';

export type RandomFn = () => number;

export function roll2d6(random: RandomFn): number {
  const die1 = Math.floor(random() * 6) + 1;
  const die2 = Math.floor(random() * 6) + 1;
  return die1 + die2;
}

/**
 * Gets medicine skill value for a doctor.
 *
 * @stub Plan 7 - IPilot.skills only carries gunnery/piloting; medicine skill
 * will be added in a future change. Returns hardcoded 7 until then.
 *
 * @param _doctorEntry - The doctor roster entry
 * @param _pilot - The doctor's vault pilot (null for NPC doctors)
 * @returns Medicine skill value (default 7)
 */
function getMedicineSkillValue(
  _doctorEntry: ICampaignRosterEntry,
  _pilot: IPilot | null,
): number {
  // @stub Plan 7 - Replace with actual skill lookup
  return 7;
}

/**
 * Gets total injury severity for a patient.
 *
 * Uses entry.injuries (added in PR1.5 for medical migration). Defaults to []
 * when unset.
 *
 * @param patientEntry - The patient roster entry
 * @returns Sum of all injury severity values
 */
function getTotalInjurySeverity(patientEntry: ICampaignRosterEntry): number {
  return (patientEntry.injuries ?? []).reduce(
    (sum, inj) => sum + (inj.severity || 0),
    0,
  );
}

/**
 * Gets BOD (Body) attribute value for a patient.
 *
 * @stub Plan 7 - ICampaignRosterEntry has no attributes field; IPilot.skills
 * only carries gunnery/piloting. Returns default BOD of 5 until attributes
 * are added to the roster entry or a vault attribute lookup is available.
 *
 * @param _patientEntry - The patient roster entry
 * @param _pilot - The patient's vault pilot (null for NPCs)
 * @returns BOD attribute value (default 5)
 */
function getToughness(
  _patientEntry: ICampaignRosterEntry,
  _pilot: IPilot | null,
): number {
  // @stub Plan 7 - Replace with actual attribute lookup when available
  return 5;
}

function hasProsthetic(
  _patientEntry: ICampaignRosterEntry,
  _location: string,
): boolean {
  // @stub Plan 8.5 - Replace with actual prosthetic tracking
  return false;
}

/**
 * Alternate medical check with attribute-based margin-of-success system.
 *
 * NPC behavior: NPCs heal too (medical domain = PROCESS). Pass
 * `doctorEntry = null` when no doctor is available; the patient's BOD
 * attribute is used as the base value instead. NPC patients resolve injuries
 * from `patientEntry.injuries ?? []`; identity from `patientEntry.pilotId`.
 *
 * @param patientEntry - The injured person's roster entry
 * @param injury - The injury being treated
 * @param doctorEntry - The doctor's roster entry (null = self-heal using BOD)
 * @param doctorPilot - The doctor's vault pilot (null for NPCs or no doctor)
 * @param _options - Campaign options
 * @param random - Injectable random function (0-1)
 * @returns Medical check result
 */
export function alternateMedicalCheck(
  patientEntry: ICampaignRosterEntry,
  injury: IInjury,
  doctorEntry: ICampaignRosterEntry | null,
  doctorPilot: IPilot | null,
  _options: ICampaignOptions,
  random: RandomFn,
): IMedicalCheckResult {
  const modifiers: { name: string; value: number }[] = [];

  // Doctor uses Medicine skill; no doctor uses patient's BOD (stub: default 5)
  const attributeValue = doctorEntry
    ? getMedicineSkillValue(doctorEntry, doctorPilot)
    : getToughness(patientEntry, null);

  modifiers.push({ name: 'Attribute Value', value: attributeValue });

  const injurySeverity = getTotalInjurySeverity(patientEntry);
  const toughness = getToughness(patientEntry, null);
  let penalty = Math.max(0, injurySeverity - toughness);

  if (penalty > 0) {
    modifiers.push({ name: 'Injury Severity Penalty', value: penalty });
  }

  if (hasProsthetic(patientEntry, injury.location)) {
    modifiers.push({ name: 'Prosthetic Penalty', value: 4 });
    penalty += 4;
  }

  const roll = roll2d6(random);
  const targetNumber = attributeValue + penalty;
  const margin = roll - targetNumber;

  let outcome: 'healed' | 'no_change' | 'worsened';
  if (margin >= 0) {
    outcome = 'healed';
  } else if (margin > -6) {
    outcome = 'no_change';
  } else {
    outcome = 'worsened';
  }

  const healingDaysReduced = outcome === 'healed' ? injury.daysToHeal : 0;

  return {
    patientId: patientEntry.pilotId,
    doctorId: doctorEntry?.pilotId,
    system: MedicalSystem.ALTERNATE,
    roll,
    targetNumber,
    margin,
    outcome,
    injuryId: injury.id,
    healingDaysReduced,
    modifiers,
  };
}
