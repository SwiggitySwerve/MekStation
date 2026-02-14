/**
 * Advanced Medical System - d100 roll system with fumble/crit thresholds
 *
 * Implements an advanced medical system using d100 rolls with:
 * - Experience-based fumble thresholds (Green: 50, Regular: 20, Veteran: 10, Elite: 5)
 * - Experience-based crit thresholds (Green: 95, Regular: 90, Veteran: 85, Elite: 80)
 * - Fumble: +20% healing time or +5 days
 * - Critical success: -10% healing time
 * - Untreated: 30% chance injury worsens per day
 *
 * @module campaign/medical/advancedMedical
 */

import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IPerson, IInjury } from '@/types/campaign/Person';

import { IMedicalCheckResult, MedicalSystem } from './medicalTypes';
import { RandomFn } from './standardMedical';

// =============================================================================
// Experience Level Type
// =============================================================================

/**
 * Experience level for medical system fumble/crit thresholds.
 *
 * Local type alias scoped to the advanced medical system for determining
 * fumble and critical success thresholds based on doctor experience.
 *
 * @see SkillExperienceLevel for character progression in campaign skills
 * @see MarketExperienceLevel for personnel market hiring
 * @see PilotExperienceLevel for pilot templates
 */
type ExperienceLevel = 'green' | 'regular' | 'veteran' | 'elite';

// =============================================================================
// Fumble and Crit Thresholds
// =============================================================================

const FUMBLE_THRESHOLDS: Record<ExperienceLevel, number> = {
  green: 50,
  regular: 20,
  veteran: 10,
  elite: 5,
};

const CRIT_THRESHOLDS: Record<ExperienceLevel, number> = {
  green: 95,
  regular: 90,
  veteran: 85,
  elite: 80,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Rolls d100 (1-100) using injectable random function
 * @param random - Random function returning 0-1
 * @returns Roll result (1-100)
 */
export function rollD100(random: RandomFn): number {
  return Math.floor(random() * 100) + 1;
}

/**
 * Gets medicine skill value for a doctor
 * @stub Plan 7 - Replace with actual skill lookup when available
 * @param _doctor - The doctor person
 * @returns Medicine skill value (default 70)
 */
function getMedicineSkillValue(_doctor: IPerson): number {
  // @stub Plan 7 - Replace with actual skill lookup
  return 70;
}

/**
 * Gets experience level for a doctor
 * @stub Plan 7 - Replace with actual experience lookup when available
 * @param _doctor - The doctor person
 * @returns Experience level (default 'regular')
 */
function getExperienceLevel(_doctor: IPerson): ExperienceLevel {
  // @stub Plan 7 - Replace with actual experience lookup
  return 'regular';
}

// =============================================================================
// Untreated Injury Handling
// =============================================================================

/**
 * Handles untreated injury with 30% chance of worsening per day
 *
 * @param patient - The injured person
 * @param injury - The injury being treated
 * @param random - Injectable random function (0-1)
 * @returns Medical check result (worsened or no_change)
 */
export function untreatedAdvanced(
  patient: IPerson,
  injury: IInjury,
  random: RandomFn,
): IMedicalCheckResult {
  const roll = random();
  const outcome = roll < 0.3 ? 'worsened' : 'no_change';

  const modifiers = [{ name: 'Untreated', value: 0 }];

  return {
    patientId: patient.id,
    system: MedicalSystem.ADVANCED,
    roll: 0,
    targetNumber: 0,
    margin: 0,
    outcome: outcome as 'worsened' | 'no_change',
    injuryId: injury.id,
    healingDaysReduced: 0,
    modifiers,
  };
}

// =============================================================================
// Advanced Medical Check
// =============================================================================

/**
 * Advanced medical check with d100 roll system
 *
 * Doctor performs Medicine skill check using d100:
 * - Roll d100 (1-100)
 * - Fumble (roll <= threshold): +20% healing time or +5 days
 * - Critical success (roll >= threshold): -10% healing time
 * - Success (roll <= skill): heals injury
 * - Failure (roll > skill): no change
 *
 * Fumble/Crit thresholds vary by doctor experience:
 * - Green: fumble 50, crit 95
 * - Regular: fumble 20, crit 90
 * - Veteran: fumble 10, crit 85
 * - Elite: fumble 5, crit 80
 *
 * @param patient - The injured person
 * @param injury - The injury being treated
 * @param doctor - The doctor (null = untreated)
 * @param options - Campaign options
 * @param random - Injectable random function (0-1)
 * @returns Medical check result
 */
export function advancedMedicalCheck(
  patient: IPerson,
  injury: IInjury,
  doctor: IPerson | null,
  options: ICampaignOptions,
  random: RandomFn,
): IMedicalCheckResult {
  // No doctor: use untreated advanced
  if (!doctor) {
    return untreatedAdvanced(patient, injury, random);
  }

  // Get medicine skill and experience level
  const medicineSkill = getMedicineSkillValue(doctor);
  const experienceLevel = getExperienceLevel(doctor);

  // Get fumble and crit thresholds
  const fumbleThreshold = FUMBLE_THRESHOLDS[experienceLevel];
  const critThreshold = CRIT_THRESHOLDS[experienceLevel];

  // Roll d100
  const roll = rollD100(random);

  // Calculate modifiers
  const modifiers: { name: string; value: number }[] = [
    { name: 'Medicine Skill', value: medicineSkill },
    { name: 'Experience Level', value: 0 },
  ];

  // Determine outcome
  let outcome: IMedicalCheckResult['outcome'];
  let healingDaysReduced: number;

  if (roll <= fumbleThreshold) {
    // Fumble: +20% healing time or +5 days
    outcome = 'fumble';
    const timeIncrease = Math.max(Math.ceil(injury.daysToHeal * 0.2), 5);
    healingDaysReduced = -timeIncrease;
  } else if (roll >= critThreshold) {
    // Critical success: -10% healing time
    outcome = 'critical_success';
    const timeReduction = Math.ceil(injury.daysToHeal * 0.1);
    healingDaysReduced = timeReduction;
  } else if (roll <= medicineSkill) {
    // Success: heals injury
    outcome = 'healed';
    healingDaysReduced = injury.daysToHeal;
  } else {
    // Failure: no change
    outcome = 'no_change';
    healingDaysReduced = 0;
  }

  return {
    patientId: patient.id,
    doctorId: doctor.id,
    system: MedicalSystem.ADVANCED,
    roll,
    targetNumber: medicineSkill,
    margin: roll - medicineSkill,
    outcome,
    injuryId: injury.id,
    healingDaysReduced,
    modifiers,
  };
}
