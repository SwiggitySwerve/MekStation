/**
 * Standard Medical System - Basic healing mechanics
 *
 * Implements the standard medical system with simple skill checks:
 * - Doctor performs Medicine skill check
 * - Success (roll >= TN): heals injury completely
 * - Failure (roll < TN): no change, wait for next check
 * - No doctor: natural healing (very slow)
 *
 * @module campaign/medical/standardMedical
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IInjury } from '@/types/campaign/Person';

import { IMedicalCheckResult, MedicalSystem } from './medicalTypes';

/**
 * Random function type for injectable randomness (0-1)
 */
export type RandomFn = () => number;

/**
 * Rolls 2d6 using injectable random function
 * @param random - Random function returning 0-1
 * @returns Roll result (2-12)
 */
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
  doctorEntry: ICampaignRosterEntry,
  pilot: IPilot | null,
): number {
  const pilotSkills = pilot?.skills as
    | { readonly medicine?: number }
    | undefined;
  const statblockSkills = (
    doctorEntry.statblockData as
      | { readonly skills?: { readonly medicine?: number } }
      | undefined
  )?.skills;
  return (
    doctorEntry.medicineSkill ??
    statblockSkills?.medicine ??
    pilotSkills?.medicine ??
    7
  );
}

/**
 * Gets shorthanded modifier based on doctor's patient load.
 *
 * @stub Plan 7 - Replace with actual patient count lookup
 *
 * @param _doctorEntry - The doctor roster entry
 * @param _pilot - The doctor's vault pilot (null for NPC doctors)
 * @param _options - Campaign options
 * @returns Shorthanded modifier (0 if not overloaded)
 */
function getShorthandedModifier(
  doctorEntry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  _options: ICampaignOptions,
): number {
  const patientCount = doctorEntry.assignedPatientIds?.length ?? 0;
  const capacity = doctorEntry.patientCapacity ?? 6;
  return Math.max(0, patientCount - capacity);
}

/**
 * Natural healing without a doctor.
 * Much slower than with medical care.
 *
 * NPC behavior: NPCs heal too (medical domain = PROCESS). Entry is the sole
 * source of truth for identity; no vault pilot is needed for natural healing.
 *
 * @param patientEntry - The injured person's roster entry
 * @param injury - The injury being treated
 * @param options - Campaign options
 * @returns Medical check result (always no_change, waits for next period)
 */
export function naturalHealing(
  patientEntry: ICampaignRosterEntry,
  injury: IInjury,
  options: ICampaignOptions,
): IMedicalCheckResult {
  const modifiers = [
    { name: 'Natural Healing', value: 0 },
    { name: 'Waiting Period', value: options.healingWaitingPeriod },
  ];

  return {
    patientId: patientEntry.pilotId,
    system: MedicalSystem.STANDARD,
    roll: 0,
    targetNumber: 0,
    margin: 0,
    outcome: 'no_change',
    injuryId: injury.id,
    healingDaysReduced: 0,
    modifiers,
  };
}

/**
 * Standard medical check with doctor.
 *
 * Doctor performs Medicine skill check:
 * - Target Number = Medicine Skill + Modifiers
 * - Roll 2d6
 * - Success (roll >= TN): heals injury (daysToHeal → 0)
 * - Failure (roll < TN): no change, wait for next check
 *
 * Modifiers:
 * - Tougher Healing: +1 per injury beyond 2 (if enabled)
 * - Shorthanded: +X if doctor overloaded (Plan 7)
 *
 * NPC behavior: NPCs heal too (medical domain = PROCESS). Pass
 * `doctorEntry = null` when no doctor is available (natural healing path).
 * NPC patients resolve injuries from `patientEntry.injuries ?? []`.
 * NPC doctors from `doctorEntry.pilotId` when `doctorPilot` is null.
 *
 * @param patientEntry - The injured person's roster entry
 * @param injury - The injury being treated
 * @param doctorEntry - The doctor's roster entry (null = natural healing)
 * @param doctorPilot - The doctor's vault pilot (null for NPCs or no doctor)
 * @param options - Campaign options
 * @param random - Injectable random function (0-1)
 * @returns Medical check result
 */
export function standardMedicalCheck(
  patientEntry: ICampaignRosterEntry,
  injury: IInjury,
  doctorEntry: ICampaignRosterEntry | null,
  doctorPilot: IPilot | null,
  options: ICampaignOptions,
  random: RandomFn,
): IMedicalCheckResult {
  // No doctor: use natural healing
  if (!doctorEntry) {
    return naturalHealing(patientEntry, injury, options);
  }

  // Get medicine skill
  const medicineSkill = getMedicineSkillValue(doctorEntry, doctorPilot);

  // Calculate modifiers
  const modifiers: { name: string; value: number }[] = [
    { name: 'Medicine Skill', value: medicineSkill },
  ];

  // Tougher healing: +1 per injury beyond 2
  // Entry.injuries defaults to [] when unset
  const patientInjuries = patientEntry.injuries ?? [];
  const tougherHealingModifier = Math.max(0, patientInjuries.length - 2);
  if (tougherHealingModifier > 0) {
    modifiers.push({ name: 'Tougher Healing', value: tougherHealingModifier });
  }

  // Shorthanded modifier (Plan 7)
  const shorthandedModifier = getShorthandedModifier(
    doctorEntry,
    doctorPilot,
    options,
  );
  if (shorthandedModifier > 0) {
    modifiers.push({ name: 'Shorthanded', value: shorthandedModifier });
  }

  // Calculate target number
  const targetNumber = modifiers.reduce((sum, m) => sum + m.value, 0);

  // Roll 2d6
  const roll = roll2d6(random);

  // Calculate margin
  const margin = roll - targetNumber;

  // Determine outcome
  const outcome = margin >= 0 ? 'healed' : 'no_change';
  const healingDaysReduced = margin >= 0 ? injury.daysToHeal : 0;

  return {
    patientId: patientEntry.pilotId,
    doctorId: doctorEntry.pilotId,
    system: MedicalSystem.STANDARD,
    roll,
    targetNumber,
    margin,
    outcome: outcome as 'healed' | 'no_change',
    injuryId: injury.id,
    healingDaysReduced,
    modifiers,
  };
}
