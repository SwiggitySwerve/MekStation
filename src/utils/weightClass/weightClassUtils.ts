/**
 * Weight Class Utilities - Re-exports
 *
 * The core weight class functionality is defined in the enum file.
 * This file provides additional utilities and re-exports for convenience.
 *
 * @spec openspec/specs/weight-class-system/spec.md
 */

// Re-export everything from the enum file
export {
  WeightClass,
  WEIGHT_CLASS_RANGES,
  STANDARD_WEIGHT_CLASSES,
  getWeightClass,
  getWeightClassRange,
  isValidMechTonnage,
  getValidMechTonnages,
} from '../../types/enums/WeightClass';
export type { WeightClassRange } from '../../types/enums/WeightClass';

/**
 * Compare two weight classes by size
 *
 * @param a - First weight class
 * @param b - Second weight class
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
import {
  WeightClass,
  WEIGHT_CLASS_RANGES,
} from '../../types/enums/WeightClass';

export function compareWeightClasses(a: WeightClass, b: WeightClass): number {
  const rangeA = WEIGHT_CLASS_RANGES.find((r) => r.weightClass === a);
  const rangeB = WEIGHT_CLASS_RANGES.find((r) => r.weightClass === b);

  if (!rangeA || !rangeB) {
    return 0;
  }

  return rangeA.minTonnage - rangeB.minTonnage;
}

/**
 * Get all valid tonnages for a specific weight class
 *
 * @param weightClass - Weight class
 * @returns Array of valid tonnages (in 5-ton increments)
 */
export function getTonnagesForWeightClass(weightClass: WeightClass): number[] {
  const range = WEIGHT_CLASS_RANGES.find((r) => r.weightClass === weightClass);
  if (!range) {
    return [];
  }

  const tonnages: number[] = [];
  for (let t = range.minTonnage; t <= range.maxTonnage; t += 5) {
    tonnages.push(t);
  }
  return tonnages;
}

/**
 * Weight class validation result
 */
export interface WeightClassValidationResult {
  isValid: boolean;
  weightClass?: WeightClass;
  errors: string[];
}

/**
 * Validate a tonnage and return its weight class
 *
 * @param tonnage - Tonnage to validate
 * @returns Validation result with weight class if valid
 */
export function validateTonnage(tonnage: number): WeightClassValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(tonnage)) {
    errors.push('Tonnage must be a finite number');
    return { isValid: false, errors };
  }

  if (tonnage < 20) {
    errors.push('Tonnage must be at least 20 tons for standard mechs');
  }

  if (tonnage > 100) {
    errors.push('Tonnage must be at most 100 tons for standard mechs');
  }

  if (tonnage % 5 !== 0) {
    errors.push('Tonnage must be in 5-ton increments');
  }

  // Inline calculation to avoid circular dependency
  const getWeightClassFromTonnage = (t: number): WeightClass => {
    if (t <= 35) return WeightClass.LIGHT;
    if (t <= 55) return WeightClass.MEDIUM;
    if (t <= 75) return WeightClass.HEAVY;
    return WeightClass.ASSAULT;
  };
  const weightClass = getWeightClassFromTonnage(tonnage);

  return {
    isValid: errors.length === 0,
    weightClass,
    errors,
  };
}
