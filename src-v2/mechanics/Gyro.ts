/**
 * Gyro.ts
 * Mechanics for Gyro calculations.
 */

import { GyroType } from '../types/SystemComponents';
import { GYRO_WEIGHT_MULTIPLIERS, GYRO_SLOTS } from '../data/GyroTables';

export class GyroMechanics {

  /**
   * Calculate Gyro Weight.
   * Formula: Standard Gyro = CEIL(Engine Rating / 100).
   * Then apply multipliers.
   */
  public static calculateWeight(engineRating: number, type: GyroType): number {
    // 1. Standard Weight
    const standardWeight = Math.ceil(engineRating / 100);
    
    // 2. Modifiers
    if (type === GyroType.HEAVY_DUTY) {
      return standardWeight + 1.0; // Heavy Duty is Standard + 1 ton
    }
    
    const multiplier = GYRO_WEIGHT_MULTIPLIERS[type];
    let weight = standardWeight * multiplier;
    
    // Rounding: "Round up to the nearest 0.5 ton"
    return Math.ceil(weight * 2) / 2;
  }

  /**
   * Get required slots for Gyro.
   * Gyros are always in CT (usually).
   */
  public static getRequiredSlots(type: GyroType): number {
    return GYRO_SLOTS[type] || 4;
  }
}

