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

import { ICampaignOptions } from '../../../types/campaign/Campaign';
import { IPerson, IInjury } from '../../../types/campaign/Person';
import { IMedicalCheckResult, MedicalSystem } from './medicalTypes';

export type RandomFn = () => number;

export function roll2d6(random: RandomFn): number {
  const die1 = Math.floor(random() * 6) + 1;
  const die2 = Math.floor(random() * 6) + 1;
  return die1 + die2;
}

function getMedicineSkillValue(_doctor: IPerson): number {
  return 7;
}

function getTotalInjurySeverity(patient: IPerson): number {
  return patient.injuries.reduce((sum, inj) => sum + (inj.severity || 0), 0);
}

function getToughness(patient: IPerson): number {
  return patient.attributes.BOD || 0;
}

function hasProsthetic(_patient: IPerson, _location: string): boolean {
  // @stub Plan 8.5 - Replace with actual prosthetic tracking
  return false;
}

export function alternateMedicalCheck(
  patient: IPerson,
  injury: IInjury,
  doctor: IPerson | null,
  _options: ICampaignOptions,
  random: RandomFn,
): IMedicalCheckResult {
  const modifiers: { name: string; value: number }[] = [];

  const attributeValue = doctor
    ? getMedicineSkillValue(doctor)
    : patient.attributes.BOD;

  modifiers.push({ name: 'Attribute Value', value: attributeValue });

  const injurySeverity = getTotalInjurySeverity(patient);
  const toughness = getToughness(patient);
  let penalty = Math.max(0, injurySeverity - toughness);

  if (penalty > 0) {
    modifiers.push({ name: 'Injury Severity Penalty', value: penalty });
  }

  if (hasProsthetic(patient, injury.location)) {
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
    patientId: patient.id,
    doctorId: doctor?.id,
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
