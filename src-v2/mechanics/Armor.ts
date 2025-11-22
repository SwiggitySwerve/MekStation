/**
 * Armor.ts
 * Mechanics for Armor calculations.
 */

import { ArmorType } from '../types/SystemComponents';
import { TechBase } from '../types/TechBase';
import { ARMOR_POINTS_PER_TON, ARMOR_SLOTS_REQUIRED } from '../data/ArmorTables';
import { StructureMechanics } from './Structure';

export class ArmorMechanics {
  
  /**
   * Calculate the maximum armor points for a given tonnage.
   * Rule: 2x Internal Structure (Head is always 9).
   */
  public static calculateMaxPoints(tonnage: number): number {
    const structure = StructureMechanics.getPoints(tonnage);
    
    // Head max is 9
    const headMax = 9;
    
    // All other locations are 2x Structure
    const ct = structure.ct * 2;
    const lt = structure.lt * 2;
    const rt = structure.rt * 2;
    const la = structure.la * 2;
    const ra = structure.ra * 2;
    const ll = structure.ll * 2;
    const rl = structure.rl * 2;
    
    return headMax + ct + lt + rt + la + ra + ll + rl;
  }

  /**
   * Calculate the weight of the armor based on total points and type.
   */
  public static calculateWeight(points: number, type: ArmorType): number {
    const pointsPerTon = ARMOR_POINTS_PER_TON[type];
    if (!pointsPerTon) {
      throw new Error(`Unknown armor type: ${type}`);
    }
    
    // Weight = Points / PointsPerTon.
    // Must round up to nearest 0.5 ton? 
    // TechManual: "The weight of armor is equal to the number of armor points divided by the Armor Point Value... rounded up to the nearest 0.5 ton."
    // Wait, normally you allocate by tonnage (e.g. 10 tons of armor = 160 points).
    // But if you calculate weight FROM points, yes, you round up.
    
    const weight = points / pointsPerTon;
    // Actually, strictly speaking, you buy armor in 0.5 ton lots usually.
    // But for "Exact Weight" calculation of a design:
    // "Divide the total number of Armor Points by the appropriate Armor Point Value... Round this figure up to the nearest 0.5 ton."
    
    return Math.ceil(weight * 2) / 2;
  }

  /**
   * Get the required number of critical slots for the armor type.
   */
  public static getRequiredSlots(type: ArmorType, techBase: TechBase): number {
    const techMap = ARMOR_SLOTS_REQUIRED[type];
    if (!techMap) {
      return 0;
    }
    return techMap[techBase] || techMap[TechBase.INNER_SPHERE];
  }
}

