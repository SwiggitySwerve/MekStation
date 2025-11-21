/**
 * CockpitRulesValidator - BattleTech cockpit validation rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles cockpit type validation and weight calculations.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ValidationCalculations } from './ValidationCalculations';

export interface CockpitValidation {
  isValid: boolean;
  cockpitType: string;
  cockpitWeight: number;
  violations: CockpitViolation[];
  recommendations: string[];
}

export interface CockpitViolation {
  type: 'invalid_type' | 'weight_mismatch' | 'era_incompatible';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export class CockpitRulesValidator {
  
  /**
   * Validate cockpit rules for a unit configuration
   */
  static validateCockpitRules(config: UnitConfiguration): CockpitValidation {
    const violations: CockpitViolation[] = [];
    const recommendations: string[] = [];
    
    // Cockpit type might not be explicitly in UnitConfiguration in some versions, defaulting to Standard
    // If it's added later, we can access it here.
    const cockpitType = config.cockpitType ? 
      (typeof config.cockpitType === 'string' ? config.cockpitType : config.cockpitType.type) 
      : 'Standard';
      
    const cockpitWeight = ValidationCalculations.calculateCockpitWeight(cockpitType);
    
    // Validate cockpit type logic (placeholders as most are Standard)
    if (cockpitType === 'Torso-Mounted' && config.type !== 'Mech') {
       // Theoretical check
       recommendations.push('Torso-Mounted cockpits are typically for BattleMechs');
    }

    return {
      isValid: violations.length === 0,
      cockpitType,
      cockpitWeight,
      violations,
      recommendations
    };
  }
  
  /**
   * Get critical slots required by cockpit type
   */
  static getCockpitCriticalSlots(cockpitType: string): number {
    switch (cockpitType) {
      case 'Small': return 2; // + sensors
      case 'Torso-Mounted': return 1; // + sensors elsewhere
      case 'Industrial': return 0; // Usually standard
      default: return 0; // Standard sensors are implicit in Head slots
    }
  }
}

export default CockpitRulesValidator;

