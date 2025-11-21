/**
 * MovementRulesValidator - BattleTech movement and engine validation rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles movement calculations, engine rating limits, and mobility validation.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { calculateInternalHeatSinks } from '../../utils/heatSinkCalculations';

export interface MovementValidation {
  isValid: boolean;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  engineRating: number;
  tonnage: number;
  engineType: string;
  violations: MovementViolation[];
  recommendations: string[];
}

export interface MovementViolation {
  type: 'invalid_engine_rating' | 'impossible_movement' | 'engine_tonnage_mismatch' | 'jump_mp_violation';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export class MovementRulesValidator {
  
  /**
   * Validate movement rules for a unit configuration
   */
  static validateMovementRules(config: UnitConfiguration): MovementValidation {
    const violations: MovementViolation[] = [];
    const recommendations: string[] = [];
    
    const engineRating = config.engineRating || 0;
    const tonnage = config.tonnage || 100;
    const engineType = config.engineType || 'Standard';
    
    const walkMP = Math.floor(engineRating / tonnage);
    const runMP = walkMP * 1.5;
    const jumpMP = config.jumpMP || 0;
    
    // Check engine rating limits
    if (engineRating > 400) {
      violations.push({
        type: 'invalid_engine_rating',
        message: `Engine rating ${engineRating} exceeds maximum of 400`,
        severity: 'critical',
        suggestedFix: 'Reduce engine rating to 400 or less'
      });
    }
    
    if (engineRating < 10) {
      violations.push({
        type: 'invalid_engine_rating',
        message: `Engine rating ${engineRating} is below minimum of 10`,
        severity: 'critical',
        suggestedFix: 'Increase engine rating to at least 10'
      });
    }
    
    // Check if engine rating is appropriate for tonnage
    if (engineRating < tonnage) {
      recommendations.push('Engine rating is very low for unit tonnage - consider increasing for better mobility');
    }
    
    // Check movement calculations
    if (walkMP < 1) {
      recommendations.push('Unit has very low mobility - consider increasing engine rating');
    }
    
    if (walkMP > 8) {
      recommendations.push('Unit has exceptional mobility - ensure adequate armor and weaponry');
    }
    
    // Validate engine type compatibility with rating
    if (!this.isEngineTypeCompatible(engineType, engineRating, tonnage)) {
      violations.push({
        type: 'engine_tonnage_mismatch',
        message: `Engine type ${engineType} incompatible with rating ${engineRating} for ${tonnage}-ton unit`,
        severity: 'major',
        suggestedFix: 'Select compatible engine type or adjust rating'
      });
    }
    
    // Validate jump MP limits
    const maxJumpMP = Math.min(8, Math.floor(tonnage / 10));
    if (jumpMP > maxJumpMP) {
      violations.push({
        type: 'jump_mp_violation',
        message: `Jump MP ${jumpMP} exceeds maximum of ${maxJumpMP} for ${tonnage}-ton unit`,
        severity: 'critical',
        suggestedFix: `Reduce jump jets to achieve maximum ${maxJumpMP} jump MP`
      });
    }
    
    return {
      isValid: violations.length === 0,
      walkMP,
      runMP,
      jumpMP,
      engineRating,
      tonnage,
      engineType,
      violations,
      recommendations
    };
  }
  
  /**
   * Calculate engine weight based on rating and type
   */
  static calculateEngineWeight(engineRating: number, engineType: string): number {
    // Normalize engine type to match engineCalculations format
    let normalizedType = engineType;
    if (engineType === 'XL (IS)' || engineType === 'XL') {
      normalizedType = 'XL (IS)';
    } else if (engineType === 'XL (Clan)') {
      normalizedType = 'XL (Clan)';
    }
    
    // Use BattleTech engine weight formula: rating / 25 * 2.5 for standard
    const baseWeight = (engineRating / 25) * 2.5;
    const multipliers: Record<string, number> = {
      'Standard': 1.0,
      'XL (IS)': 0.5,
      'XL (Clan)': 0.5,
      'XL': 0.5,
      'Light': 0.75,
      'XXL': 0.33,
      'Compact': 1.5,
      'ICE': 2.0,
      'Fuel Cell': 1.5
    };
    
    const multiplier = multipliers[normalizedType] || 1.0;
    return Math.ceil(baseWeight * multiplier * 2) / 2; // Round to nearest 0.5 ton
  }
  
  /**
   * Get maximum engine rating for a given tonnage
   */
  static getMaxEngineRating(tonnage: number): number {
    return Math.min(400, tonnage * 8); // Practical maximum is usually tonnage * 8
  }
  
  /**
   * Get minimum recommended engine rating for mobility
   */
  static getMinRecommendedEngineRating(tonnage: number): number {
    return tonnage * 2; // 2 walk MP minimum recommended
  }
  
  /**
   * Calculate heat generated by engine
   */
  static calculateEngineHeatGeneration(engineRating: number, engineType: string): number {
    // Most engines don't generate additional heat beyond movement
    if (engineType === 'ICE' || engineType === 'Fuel Cell') {
      return 0; // No heat generation
    }
    return 0; // Standard fusion engines generate heat only when moving
  }
  
  /**
   * Get internal heat sinks provided by engine
   */
  static getEngineInternalHeatSinks(engineRating: number, engineType: string): number {
    const { calculateInternalHeatSinksForEngine } = require('../../utils/heatSinkCalculations');
    return calculateInternalHeatSinksForEngine(engineRating, engineType);
  }
  
  /**
   * Validate engine type compatibility with rating and tonnage
   */
  private static isEngineTypeCompatible(engineType: string, engineRating: number, tonnage: number): boolean {
    // Check if engine rating is feasible for the tonnage
    const walkMP = Math.floor(engineRating / tonnage);
    
    if (walkMP < 1) return false; // Engine too small
    if (walkMP > 8 && !['XL', 'Light', 'XXL'].includes(engineType)) {
      return false; // Very high speed requires advanced engine
    }
    
    // Validate specific engine type constraints
    switch (engineType) {
      case 'Compact':
        return walkMP <= 4; // Compact engines limited to 4 MP
      case 'ICE':
      case 'Fuel Cell':
        return walkMP <= 3; // Non-fusion engines very limited
      case 'XXL':
        return tonnage >= 55; // XXL engines only for heavier units
      default:
        return true;
    }
  }
  
  /**
   * Calculate critical slots required by engine
   */
  static getEngineCriticalSlots(engineRating: number, engineType: string): {
    centerTorso: number;
    sideTorsos: number;
    total: number;
  } {
    const baseSlots = Math.ceil(engineRating / 25);
    
    switch (engineType) {
      case 'XL':
      case 'Clan XL':
        return {
          centerTorso: 6,
          sideTorsos: 3, // 3 per side torso
          total: 12
        };
      case 'Light':
      case 'Clan Light':
        return {
          centerTorso: 6,
          sideTorsos: 2, // 2 per side torso
          total: 10
        };
      case 'XXL':
        return {
          centerTorso: 6,
          sideTorsos: 6, // 6 per side torso
          total: 18
        };
      case 'Compact':
        return {
          centerTorso: Math.min(6, baseSlots + 3),
          sideTorsos: 0,
          total: Math.min(6, baseSlots + 3)
        };
      default: // Standard, ICE, Fuel Cell, Fission
        return {
          centerTorso: Math.min(6, baseSlots),
          sideTorsos: 0,
          total: Math.min(6, baseSlots)
        };
    }
  }
  
  /**
   * Get movement type classification
   */
  static getMovementClassification(walkMP: number): {
    class: 'Very Slow' | 'Slow' | 'Medium' | 'Fast' | 'Very Fast';
    description: string;
  } {
    if (walkMP <= 2) {
      return {
        class: 'Very Slow',
        description: 'Heavily armored assault unit or superheavy'
      };
    } else if (walkMP <= 4) {
      return {
        class: 'Slow',
        description: 'Standard heavy combat unit'
      };
    } else if (walkMP <= 6) {
      return {
        class: 'Medium',
        description: 'Balanced medium combat unit'
      };
    } else if (walkMP <= 8) {
      return {
        class: 'Fast',
        description: 'Fast reconnaissance or striker unit'
      };
    } else {
      return {
        class: 'Very Fast',
        description: 'Ultra-fast scout or interceptor'
      };
    }
  }
  
  /**
   * Calculate total movement heat for continuous operation
   */
  static calculateMovementHeat(walkMP: number, runMP: number, jumpMP: number, movementType: 'walk' | 'run' | 'jump'): number {
    switch (movementType) {
      case 'walk':
        return 1; // Walking generates 1 heat
      case 'run':
        return 2; // Running generates 2 heat
      case 'jump':
        return jumpMP; // Jumping generates 1 heat per hex
      default:
        return 0;
    }
  }
}

export default MovementRulesValidator;





