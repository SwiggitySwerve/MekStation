/**
 * Validation Service - Tonnage and weight constraint validation
 * 
 * Handles tonnage limits, weight constraints, and validation logic
 * for BattleMech construction and configuration compliance.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { WeightCalculationService } from './WeightCalculationService';
import { OptimizationService } from './OptimizationService';
import { 
  TonnageValidation, 
  Equipment,
  WeightCalculationContext 
} from './types';

export class ValidationService {
  
  /**
   * Validate tonnage limits and constraints
   */
  static validateTonnageLimit(
    config: UnitConfiguration, 
    equipment: Equipment[]
  ): TonnageValidation {
    const totalWeight = WeightCalculationService.calculateTotalWeight(config, equipment);
    const overweight = Math.max(0, totalWeight.totalWeight - config.tonnage);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Check for overweight condition
    if (overweight > 0) {
      errors.push(`Unit is ${overweight.toFixed(2)} tons overweight`);
      suggestions.push(...this.generateWeightReductionSuggestions(overweight));
    }
    
    // Check for near-capacity usage
    if (totalWeight.percentageUsed > 95 && totalWeight.percentageUsed <= 100) {
      warnings.push('Unit is using more than 95% of available tonnage');
      suggestions.push('Consider weight optimization for future equipment additions');
    }
    
    // Check for inefficient weight usage
    if (totalWeight.percentageUsed < 75) {
      warnings.push(`Unit is only using ${totalWeight.percentageUsed.toFixed(1)}% of available tonnage`);
      suggestions.push('Consider adding more equipment, armor, or weapons');
    }
    
    // Check for weight penalties
    const penalties = OptimizationService.calculateWeightPenalties(config);
    penalties.forEach(penalty => {
      if (penalty.canBeAvoided) {
        warnings.push(`${penalty.component}: ${penalty.description}`);
        if (penalty.suggestion) {
          suggestions.push(penalty.suggestion);
        }
      }
    });
    
    return {
      isValid: overweight === 0,
      currentWeight: totalWeight.totalWeight,
      maxTonnage: config.tonnage,
      overweight,
      errors,
      warnings,
      suggestions
    };
  }
  
  /**
   * Check if unit is within tonnage limits
   */
  static isWithinTonnageLimit(config: UnitConfiguration, equipment: Equipment[]): boolean {
    return WeightCalculationService.isWithinTonnageLimit(config, equipment);
  }
  
  /**
   * Calculate remaining tonnage available
   */
  static calculateRemainingTonnage(config: UnitConfiguration, equipment: Equipment[]): number {
    return WeightCalculationService.calculateRemainingTonnage(config, equipment);
  }
  
  /**
   * Validate weight distribution constraints
   */
  static validateWeightDistribution(
    config: UnitConfiguration, 
    equipment: Equipment[]
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Import balance analysis to avoid circular dependency
    const totalWeight = WeightCalculationService.calculateTotalWeight(config, equipment);
    
    // Check for extreme weight concentration
    const breakdown = totalWeight.breakdown;
    const total = totalWeight.totalWeight;
    
    if (total > 0) {
      // Check if any single system dominates weight
      const equipmentRatio = breakdown.equipment / total;
      if (equipmentRatio > 0.6) {
        warnings.push('Equipment weight exceeds 60% of total - consider weight distribution');
      }
      
      // Check for minimal armor
      const armorRatio = breakdown.armor / total;
      if (armorRatio < 0.15 && config.tonnage >= 35) {
        warnings.push('Armor weight is less than 15% of total - consider increasing protection');
      }
      
      // Check for excessive structure weight (usually indicates inefficient design)
      const structureRatio = breakdown.structure / total;
      if (structureRatio > 0.25) {
        warnings.push('Structure weight exceeds 25% of total - consider Endo Steel upgrade');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate technical constraints and rules compliance
   */
  static validateTechnicalConstraints(
    config: UnitConfiguration,
    context?: WeightCalculationContext
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate engine rating vs tonnage
    const minEngineRating = config.tonnage;
    const maxEngineRating = config.tonnage * 8; // BattleTech max
    
    if (config.engineRating < minEngineRating) {
      errors.push(`Engine rating ${config.engineRating} is below minimum ${minEngineRating} for ${config.tonnage}-ton mech`);
    }
    
    if (config.engineRating > maxEngineRating) {
      errors.push(`Engine rating ${config.engineRating} exceeds maximum ${maxEngineRating} for ${config.tonnage}-ton mech`);
    }
    
    // Validate heat sink requirements
    const minHeatSinks = Math.ceil(config.engineRating / 25);
    const totalHeatSinks = (config.internalHeatSinks || 0) + (config.externalHeatSinks || 0);
    
    if (totalHeatSinks < minHeatSinks) {
      errors.push(`Insufficient heat sinks: ${totalHeatSinks} provided, minimum ${minHeatSinks} required`);
    }
    
    // Validate jump MP constraints
    if (config.jumpMP > 8) {
      errors.push(`Jump MP ${config.jumpMP} exceeds maximum of 8`);
    }
    
    if (config.jumpMP > config.walkMP) {
      errors.push(`Jump MP ${config.jumpMP} cannot exceed Walk MP ${config.walkMP}`);
    }
    
    // Technology base validation
    if (context?.techLevel === 'standard') {
      this.validateStandardTech(config, errors, warnings);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Get comprehensive validation summary
   */
  static getValidationSummary(
    config: UnitConfiguration, 
    equipment: Equipment[],
    context?: WeightCalculationContext
  ): {
    isValid: boolean;
    tonnageValidation: TonnageValidation;
    technicalValidation: ReturnType<typeof ValidationService.validateTechnicalConstraints>;
    distributionValidation: ReturnType<typeof ValidationService.validateWeightDistribution>;
    overallScore: number;
  } {
    const tonnageValidation = this.validateTonnageLimit(config, equipment);
    const technicalValidation = this.validateTechnicalConstraints(config, context);
    const distributionValidation = this.validateWeightDistribution(config, equipment);
    
    const isValid = tonnageValidation.isValid && 
                   technicalValidation.isValid && 
                   distributionValidation.isValid;
    
    // Calculate overall score
    let score = 100;
    
    // Deduct for errors (major issues)
    const totalErrors = tonnageValidation.errors.length + 
                       technicalValidation.errors.length + 
                       distributionValidation.errors.length;
    score -= totalErrors * 25;
    
    // Deduct for warnings (minor issues)
    const totalWarnings = tonnageValidation.warnings.length + 
                         technicalValidation.warnings.length + 
                         distributionValidation.warnings.length;
    score -= totalWarnings * 5;
    
    // Bonus for efficient weight usage
    if (tonnageValidation.currentWeight / tonnageValidation.maxTonnage > 0.85 &&
        tonnageValidation.currentWeight / tonnageValidation.maxTonnage <= 0.95) {
      score += 10;
    }
    
    const overallScore = Math.max(0, Math.min(100, score));
    
    return {
      isValid,
      tonnageValidation,
      technicalValidation,
      distributionValidation,
      overallScore
    };
  }
  
  // ===== PRIVATE VALIDATION METHODS =====
  
  /**
   * Generate weight reduction suggestions based on overweight amount
   */
  private static generateWeightReductionSuggestions(overweight: number): string[] {
    const suggestions: string[] = [];
    
    if (overweight <= 2) {
      suggestions.push('Remove or reduce ammunition loads');
      suggestions.push('Optimize armor allocation');
      suggestions.push('Consider lighter equipment variants');
    } else if (overweight <= 5) {
      suggestions.push('Consider engine downgrade if mobility allows');
      suggestions.push('Upgrade to advanced structure (Endo Steel)');
      suggestions.push('Reduce non-essential equipment');
    } else if (overweight <= 10) {
      suggestions.push('Major component upgrades needed (XL engine, Endo Steel)');
      suggestions.push('Significant equipment reduction required');
      suggestions.push('Consider armor reduction on non-critical locations');
    } else {
      suggestions.push('Complete redesign required');
      suggestions.push('Reduce equipment loadout significantly');
      suggestions.push('Consider lower tonnage chassis');
    }
    
    return suggestions;
  }
  
  /**
   * Validate standard technology constraints
   */
  private static validateStandardTech(
    config: UnitConfiguration, 
    errors: string[], 
    warnings: string[]
  ): void {
    // Check for advanced technologies in standard tech level
    const structureType = this.extractComponentType(config.structureType);
    if (structureType !== 'Standard') {
      warnings.push(`${structureType} structure not available in standard technology`);
    }
    
    const armorType = this.extractComponentType(config.armorType);
    if (armorType !== 'Standard') {
      warnings.push(`${armorType} armor not available in standard technology`);
    }
    
    if (config.engineType !== 'Standard') {
      warnings.push(`${config.engineType} engine not available in standard technology`);
    }
    
    const heatSinkType = this.extractComponentType(config.heatSinkType);
    if (heatSinkType !== 'Single') {
      warnings.push(`${heatSinkType} heat sinks not available in standard technology`);
    }
  }
  
  /**
   * Extract component type helper
   */
  private static extractComponentType(component: any): string {
    if (typeof component === 'string') return component;
    return component?.type || 'Standard';
  }
}




