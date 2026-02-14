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

import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IPerson, IInjury } from '@/types/campaign/Person';

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
 * Gets medicine skill value for a doctor
 * @stub Plan 7 - Replace with actual skill lookup when available
 * @param _doctor - The doctor person
 * @returns Medicine skill value (default 7)
 */
function getMedicineSkillValue(_doctor: IPerson): number {
  // @stub Plan 7 - Replace with actual skill lookup
  return 7;
}

/**
 * Gets shorthanded modifier based on doctor's patient load
 * @stub Plan 7 - Replace with actual patient count lookup
 * @param _doctor - The doctor person
 * @param _options - Campaign options
 * @returns Shorthanded modifier (0 if not overloaded)
 */
function getShorthandedModifier(
  _doctor: IPerson,
  _options: ICampaignOptions,
): number {
  // @stub Plan 7 - Replace with actual patient count lookup
  return 0;
}

/**
 * Natural healing without a doctor
 * Much slower than with medical care
 *
 * @param patient - The injured person
 * @param injury - The injury being treated
 * @param options - Campaign options
 * @returns Medical check result (always no_change, waits for next period)
 */
export function naturalHealing(
  patient: IPerson,
  injury: IInjury,
  options: ICampaignOptions,
): IMedicalCheckResult {
  const modifiers = [
    { name: 'Natural Healing', value: 0 },
    { name: 'Waiting Period', value: options.healingWaitingPeriod },
  ];

  return {
    patientId: patient.id,
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
 * Standard medical check with doctor
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
 * @param patient - The injured person
 * @param injury - The injury being treated
 * @param doctor - The doctor (null = natural healing)
 * @param options - Campaign options
 * @param random - Injectable random function (0-1)
 * @returns Medical check result
 */
export function standardMedicalCheck(
  patient: IPerson,
  injury: IInjury,
  doctor: IPerson | null,
  options: ICampaignOptions,
  random: RandomFn,
): IMedicalCheckResult {
  // No doctor: use natural healing
  if (!doctor) {
    return naturalHealing(patient, injury, options);
  }

  // Get medicine skill
  const medicineSkill = getMedicineSkillValue(doctor);

  // Calculate modifiers
  const modifiers: { name: string; value: number }[] = [
    { name: 'Medicine Skill', value: medicineSkill },
  ];

  // Tougher healing: +1 per injury beyond 2
  const tougherHealingModifier = Math.max(0, patient.injuries.length - 2);
  if (tougherHealingModifier > 0) {
    modifiers.push({ name: 'Tougher Healing', value: tougherHealingModifier });
  }

  // Shorthanded modifier (Plan 7)
  const shorthandedModifier = getShorthandedModifier(doctor, options);
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
    patientId: patient.id,
    doctorId: doctor.id,
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
