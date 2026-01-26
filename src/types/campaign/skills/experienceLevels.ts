/**
 * Experience levels for character progression in the MekStation campaign system.
 *
 * Characters gain experience through missions and combat, advancing through
 * levels that reflect their overall competence and battlefield experience.
 */

/**
 * Character experience level categories.
 */
export enum ExperienceLevel {
  /** 0-999 XP: Inexperienced, fresh recruit */
  Green = 'Green',
  /** 1000-4999 XP: Competent, standard trooper */
  Regular = 'Regular',
  /** 5000-11999 XP: Skilled veteran */
  Veteran = 'Veteran',
  /** 12000+ XP: Elite warrior, master of combat */
  Elite = 'Elite',
}

/**
 * XP threshold ranges for each experience level.
 */
export const EXPERIENCE_THRESHOLDS: Record<
  ExperienceLevel,
  { min: number; max: number | null }
> = {
  [ExperienceLevel.Green]: { min: 0, max: 999 },
  [ExperienceLevel.Regular]: { min: 1000, max: 4999 },
  [ExperienceLevel.Veteran]: { min: 5000, max: 11999 },
  [ExperienceLevel.Elite]: { min: 12000, max: null }, // No upper limit
};

/**
 * Determines a character's experience level based on their total XP.
 *
 * @param totalXP - The character's total accumulated experience points
 * @returns The corresponding experience level
 *
 * @example
 * getExperienceLevel(500)    // ExperienceLevel.Green
 * getExperienceLevel(2500)   // ExperienceLevel.Regular
 * getExperienceLevel(8000)   // ExperienceLevel.Veteran
 * getExperienceLevel(15000)  // ExperienceLevel.Elite
 */
export function getExperienceLevel(totalXP: number): ExperienceLevel {
  if (totalXP < 0) {
    throw new Error('Total XP cannot be negative');
  }

  if (totalXP >= EXPERIENCE_THRESHOLDS[ExperienceLevel.Elite].min) {
    return ExperienceLevel.Elite;
  }
  if (totalXP >= EXPERIENCE_THRESHOLDS[ExperienceLevel.Veteran].min) {
    return ExperienceLevel.Veteran;
  }
  if (totalXP >= EXPERIENCE_THRESHOLDS[ExperienceLevel.Regular].min) {
    return ExperienceLevel.Regular;
  }
  return ExperienceLevel.Green;
}
