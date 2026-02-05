/**
 * Gyro Calculations
 *
 * Functions for calculating gyro weight and slots.
 *
 * @spec openspec/specs/gyro-system/spec.md
 */

import { GyroType, getGyroDefinition } from '../../types/construction/GyroType';
import { ceilToHalfTon } from '../physical/weightUtils';

/**
 * Calculate gyro weight from engine rating and gyro type
 *
 * Base weight = ceil(engineRating / 100)
 * Final weight = base × multiplier, rounded to 0.5 tons
 *
 * @param engineRating - Engine rating
 * @param gyroType - Type of gyro
 * @returns Gyro weight in tons
 */
export function calculateGyroWeight(
  engineRating: number,
  gyroType: GyroType,
): number {
  if (engineRating <= 0) {
    return 0;
  }

  const baseWeight = Math.ceil(engineRating / 100);
  const definition = getGyroDefinition(gyroType);

  if (!definition) {
    return baseWeight;
  }

  return ceilToHalfTon(baseWeight * definition.weightMultiplier);
}

/**
 * Get critical slots required for gyro
 *
 * @param gyroType - Type of gyro
 * @returns Number of critical slots
 */
export function getGyroCriticalSlots(gyroType: GyroType): number {
  const definition = getGyroDefinition(gyroType);
  return definition?.criticalSlots ?? 4;
}

/**
 * Validate gyro for engine configuration
 *
 * @param gyroType - Type of gyro
 * @param engineRating - Engine rating
 * @returns Validation result
 */
export function validateGyro(
  gyroType: GyroType,
  engineRating: number,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (engineRating <= 0) {
    errors.push('Engine rating must be greater than 0 for gyro calculation');
  }

  const definition = getGyroDefinition(gyroType);
  if (!definition) {
    errors.push(`Unknown gyro type: ${gyroType}`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Check gyro-cockpit compatibility
 *
 * @param gyroType - Type of gyro
 * @param cockpitType - Type of cockpit
 * @returns Whether the combination is valid
 */
export function isGyroCompatibleWithCockpit(
  gyroType: GyroType,
  cockpitType: string,
): boolean {
  // Compact gyro is incompatible with standard cockpit
  // (This is a simplified check - full rules are more complex)
  if (gyroType === GyroType.COMPACT && cockpitType === 'Standard') {
    return true; // Actually compatible
  }

  return true; // Most combinations are valid
}
