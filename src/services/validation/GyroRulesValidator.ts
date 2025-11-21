/**
 * GyroRulesValidator - BattleTech gyro validation rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles gyro type validation, weight calculations, and engine compatibility.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { IComponentConfiguration } from '../../types/core/ComponentInterfaces';
import { ValidationCalculations } from './ValidationCalculations';

export interface GyroValidation {
  isValid: boolean;
  gyroType: string;
  gyroWeight: number;
  engineCompatible: boolean;
  violations: GyroViolation[];
  recommendations: string[];
}

export interface GyroViolation {
  type: 'invalid_type' | 'weight_mismatch' | 'engine_incompatible';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export class GyroRulesValidator {
  
  /**
   * Validate gyro rules for a unit configuration
   */
  static validateGyroRules(config: UnitConfiguration): GyroValidation {
    const violations: GyroViolation[] = [];
    const recommendations: string[] = [];
    
    const gyroType = this.extractComponentType(config.gyroType);
    const engineRating = config.engineRating || 0;
    const gyroWeight = ValidationCalculations.calculateGyroWeight(engineRating, gyroType);
    const engineCompatible = ValidationCalculations.isGyroEngineCompatible(gyroType, config.engineType);
    
    if (!engineCompatible) {
      violations.push({
        type: 'engine_incompatible',
        message: `Gyro type ${gyroType} incompatible with engine type ${config.engineType}`,
        severity: 'major',
        suggestedFix: 'Select compatible gyro and engine types'
      });
    }
    
    // Recommendations
    if (gyroType === 'Standard' && engineRating >= 300) {
      recommendations.push('Heavy-Duty or Compact gyro might be better for high-rating engines');
    }
    
    if (gyroType === 'XL' && config.tonnage && config.tonnage >= 60) {
      recommendations.push('XL Gyro saves weight but occupies more critical slots in CT');
    }
    
    return {
      isValid: violations.length === 0,
      gyroType,
      gyroWeight,
      engineCompatible,
      violations,
      recommendations
    };
  }
  
  /**
   * Extract component type from configuration
   */
  private static extractComponentType(component: IComponentConfiguration | string | undefined): string {
    if (!component) return 'Standard';
    if (typeof component === 'string') return component;
    return component.type;
  }
  
  /**
   * Get critical slots required by gyro type
   */
  static getGyroCriticalSlots(gyroType: string): number {
    switch (gyroType) {
      case 'Standard': return 4;
      case 'XL': return 6;
      case 'Compact': return 2;
      case 'Heavy-Duty': return 4;
      default: return 4;
    }
  }
}

export default GyroRulesValidator;

