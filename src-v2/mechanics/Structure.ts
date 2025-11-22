/**
 * Structure.ts
 * Mechanics for Internal Structure calculations.
 */

import { StructureType } from '../types/SystemComponents';
import { TechBase } from '../types/TechBase';
import { INTERNAL_STRUCTURE_PER_TONNAGE } from '../data/InternalStructureTables';
import { STRUCTURE_WEIGHT_MULTIPLIERS, STRUCTURE_SLOTS_REQUIRED } from '../data/StructureTables';

export class StructureMechanics {
  
  /**
   * Calculate the weight of the internal structure.
   */
  public static calculateWeight(tonnage: number, type: StructureType): number {
    const multiplier = STRUCTURE_WEIGHT_MULTIPLIERS[type];
    if (multiplier === undefined) {
      throw new Error(`Unknown structure type: ${type}`);
    }
    
    // BattleTech Rule: Round up to nearest 0.5 ton? 
    // Standard structure is exactly 10%.
    // Endo Steel is exactly 5%.
    // TechManual says: "The weight of the internal structure is determined by taking a percentage of the Unit's total tonnage... rounded up to the nearest 0.5 ton."
    // Wait, is it? 
    // For a 20 ton mech, 10% is 2 tons. 5% is 1 ton.
    // For a 55 ton mech, 10% is 5.5 tons. 5% is 2.75 tons -> rounds to 3.0 tons.
    
    const rawWeight = tonnage * multiplier;
    return Math.ceil(rawWeight * 2) / 2;
  }

  /**
   * Get the required number of critical slots for the structure type.
   */
  public static getRequiredSlots(type: StructureType, techBase: TechBase): number {
    const techMap = STRUCTURE_SLOTS_REQUIRED[type];
    if (!techMap) {
      return 0;
    }
    // If Mixed, usually defaults to Inner Sphere rules for IS chassis, but here we might need more context.
    // For now, simple lookup.
    return techMap[techBase] || techMap[TechBase.INNER_SPHERE];
  }

  /**
   * Get the internal structure points for a given tonnage.
   */
  public static getPoints(tonnage: number) {
    const points = INTERNAL_STRUCTURE_PER_TONNAGE[tonnage];
    if (!points) {
      throw new Error(`Unsupported tonnage: ${tonnage}`);
    }
    return points;
  }
}

