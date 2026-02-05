/**
 * Weight Utilities
 *
 * Utilities for working with component weights per BattleTech rules.
 *
 * @spec openspec/specs/physical-properties-system/spec.md
 */

/**
 * Validate that a weight value is valid
 *
 * Weight must be a finite number >= 0
 *
 * @param weight - Weight value to validate
 * @returns True if weight is valid
 */
export function isValidWeight(weight: number): boolean {
  return Number.isFinite(weight) && weight >= 0;
}

/**
 * Round weight to nearest 0.5 ton increment
 *
 * BattleTech uses half-ton increments for most component weights.
 *
 * @param weight - Weight value to round
 * @returns Weight rounded to nearest 0.5 ton
 */
export function roundToHalfTon(weight: number): number {
  if (!Number.isFinite(weight)) {
    return 0;
  }
  return Math.round(weight * 2) / 2;
}

/**
 * Round weight up to nearest 0.5 ton increment
 *
 * Used when calculating minimum required weight.
 *
 * @param weight - Weight value to round
 * @returns Weight rounded up to nearest 0.5 ton
 */
export function ceilToHalfTon(weight: number): number {
  if (!Number.isFinite(weight)) {
    return 0;
  }
  return Math.ceil(weight * 2) / 2;
}

/**
 * Round weight down to nearest 0.5 ton increment
 *
 * Used when calculating available weight.
 *
 * @param weight - Weight value to round
 * @returns Weight rounded down to nearest 0.5 ton
 */
export function floorToHalfTon(weight: number): number {
  if (!Number.isFinite(weight)) {
    return 0;
  }
  return Math.floor(weight * 2) / 2;
}

/**
 * Calculate percentage of total tonnage
 *
 * Many BattleTech calculations use percentage of tonnage.
 *
 * @param percentage - Percentage as decimal (e.g., 0.10 for 10%)
 * @param tonnage - Unit tonnage
 * @returns Weight value
 */
export function percentOfTonnage(percentage: number, tonnage: number): number {
  if (!Number.isFinite(percentage) || !Number.isFinite(tonnage)) {
    return 0;
  }
  return percentage * tonnage;
}

/**
 * Calculate weight as percentage of tonnage, rounded to half-ton
 *
 * @param percentage - Percentage as decimal
 * @param tonnage - Unit tonnage
 * @returns Weight rounded to nearest 0.5 ton
 */
export function percentOfTonnageRounded(
  percentage: number,
  tonnage: number,
): number {
  return roundToHalfTon(percentOfTonnage(percentage, tonnage));
}

/**
 * Weight validation result
 */
export interface WeightValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate weight properties
 *
 * @param weight - Weight to validate
 * @param context - Optional context for error messages
 * @returns Validation result
 */
export function validateWeight(
  weight: number,
  context?: string,
): WeightValidationResult {
  const errors: string[] = [];
  const prefix = context ? `${context}: ` : '';

  if (!Number.isFinite(weight)) {
    errors.push(`${prefix}Weight must be a finite number`);
  } else if (weight < 0) {
    errors.push(`${prefix}Weight cannot be negative`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
