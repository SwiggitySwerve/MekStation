/**
 * Engine.ts
 * Mechanics for Engine calculations.
 */

import { EngineType } from '../types/SystemComponents';
import { TechBase } from '../types/TechBase';
import { STANDARD_ENGINE_WEIGHTS, ENGINE_WEIGHT_MULTIPLIERS, ENGINE_SLOTS, IEngineSlotConfiguration } from '../data/EngineTables';

export class EngineMechanics {
  
  /**
   * Calculate Engine Rating based on Tonnage and Desired Walking MP.
   * Formula: Rating = Tonnage * Walking MP
   */
  public static calculateRating(tonnage: number, walkingMP: number): number {
    return tonnage * walkingMP;
  }

  /**
   * Calculate Engine Weight.
   */
  public static calculateWeight(rating: number, type: EngineType): number {
    // 1. Get Standard Weight
    const standardWeight = STANDARD_ENGINE_WEIGHTS[rating];
    
    // If exact rating not in table, we might need to interpolate or find nearest?
    // TechManual says: "If the engine rating is not listed, use the next higher rating."
    // But our table covers 10-400 in 5/10 increments. 
    // Ratings are strictly Tonnage * WalkMP. 
    // Tonnage is 20-100 (5 ton steps). WalkMP is integer.
    // So Rating is always a multiple of 5?
    // 25 * 4 = 100. 20 * 3 = 60.
    // Yes. The table should cover all valid ratings.
    
    let baseWeight = standardWeight;
    if (baseWeight === undefined) {
       // Fallback logic if rating is > 400 or weird.
       // For now throw or approximate.
       if (rating > 400) {
         // Approximate: Rating / 25 * 0.5 * something? 
         // Large engines grow exponentially.
         throw new Error(`Engine rating ${rating} not supported (Max 400)`);
       }
       throw new Error(`Engine rating ${rating} not found in standard table`);
    }

    // 2. Apply Multiplier
    const multiplier = ENGINE_WEIGHT_MULTIPLIERS[type];
    
    // Rounding rules for engines:
    // XL/Light: "Divide the weight of the standard engine by 2 (XL) or 0.75 (Light)... Round up to nearest 0.5 ton."
    
    let finalWeight = baseWeight * multiplier;
    
    // Special handling for specific types if needed, but usually it's strictly round up to 0.5.
    // Base weights are already 0.5 increments.
    // 0.5 * 0.5 = 0.25 -> rounds to 0.5?
    // TechManual: "Round up to the nearest 0.5 ton."
    
    return Math.ceil(finalWeight * 2) / 2;
  }

  /**
   * Get required slots for the engine.
   */
  public static getRequiredSlots(type: EngineType, techBase: TechBase): IEngineSlotConfiguration {
    const techMap = ENGINE_SLOTS[type];
    if (!techMap) {
       // Default to standard
       return { ct: 6, sideTorso: 0 };
    }
    return techMap[techBase] || techMap[TechBase.INNER_SPHERE];
  }
  
  /**
   * Calculate Heat Sinks provided by the engine (Internal).
   * Rule: Rating / 25, rounded down.
   */
  public static calculateInternalHeatSinks(rating: number): number {
    return Math.floor(rating / 25);
  }
}

