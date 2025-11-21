/**
 * EngineRulesValidator - BattleTech engine validation rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles engine rating limits, type compatibility, and weight calculations.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ValidationCalculations } from './ValidationCalculations';

export interface EngineValidation {
  isValid: boolean;
  engineType: string;
  engineRating: number;
  engineWeight: number;
  walkMP: number;
  maxRating: number;
  minRating: number;
  violations: EngineViolation[];
  recommendations: string[];
}

export interface EngineViolation {
  type: 'invalid_rating' | 'weight_mismatch' | 'type_incompatible' | 'movement_calculation_error';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export class EngineRulesValidator {
  
  /**
   * Validate engine rules for a unit configuration
   */
  static validateEngineRules(config: UnitConfiguration): EngineValidation {
    const violations: EngineViolation[] = [];
    const recommendations: string[] = [];
    
    const engineType = config.engineType || 'Standard';
    const engineRating = config.engineRating || 0;
    const tonnage = config.tonnage || 100;
    const engineWeight = ValidationCalculations.calculateEngineWeight(engineRating, engineType);
    const walkMP = Math.floor(engineRating / tonnage);
    const maxRating = 400;
    const minRating = 10;
    
    if (engineRating > maxRating) {
      violations.push({
        type: 'invalid_rating',
        message: `Engine rating ${engineRating} exceeds maximum of ${maxRating}`,
        severity: 'critical',
        suggestedFix: `Reduce engine rating to ${maxRating} or less`
      });
    }
    
    if (engineRating < minRating) {
      violations.push({
        type: 'invalid_rating',
        message: `Engine rating ${engineRating} below minimum of ${minRating}`,
        severity: 'critical',
        suggestedFix: `Increase engine rating to at least ${minRating}`
      });
    }
    
    // Check for engine efficiency recommendations
    if (engineType === 'Standard' && engineRating >= 300) {
      recommendations.push('Large standard engines are very heavy - consider XL engine for weight savings');
    }

    if (engineType.includes('XL') && tonnage < 35) {
      recommendations.push('XL engines on very light units may not be cost-effective due to critical slot usage');
    }
    
    return {
      isValid: violations.length === 0,
      engineType,
      engineRating,
      engineWeight,
      walkMP,
      maxRating,
      minRating,
      violations,
      recommendations
    };
  }

  /**
   * Get critical slots required by engine type
   */
  static getEngineCriticalSlots(engineType: string): number {
    if (engineType.includes('XL (IS)')) return 12; // 3 per side torso + 6 CT
    if (engineType.includes('XL (Clan)')) return 10; // 2 per side torso + 6 CT
    if (engineType.includes('Light')) return 10; // 2 per side torso + 6 CT
    if (engineType.includes('XXL')) return 18; // 6 per side torso + 6 CT
    if (engineType.includes('Compact')) return 3; // Only 3 in CT
    return 6; // Standard engine takes 6 CT slots
  }
}

export default EngineRulesValidator;

