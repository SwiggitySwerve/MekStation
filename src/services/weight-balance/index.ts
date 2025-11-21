/**
 * Weight Balance Services - Modular Weight and Balance System
 * 
 * Unified interface for all weight balance functionality.
 * Provides both individual service access and a comprehensive facade.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { WeightCalculationService } from './WeightCalculationService';
import { BalanceAnalysisService } from './BalanceAnalysisService';
import { OptimizationService } from './OptimizationService';
import { ValidationService } from './ValidationService';
import { ArmorEfficiencyService } from './ArmorEfficiencyService';

// Export all types
export * from './types';

// Export individual services
export { WeightCalculationService } from './WeightCalculationService';
export { BalanceAnalysisService } from './BalanceAnalysisService';
export { OptimizationService } from './OptimizationService';
export { ValidationService } from './ValidationService';
export { ArmorEfficiencyService } from './ArmorEfficiencyService';

// Import types
import {
  WeightSummary,
  ComponentWeightBreakdown,
  WeightDistribution,
  CenterOfGravity,
  StabilityAnalysis,
  OptimizationSuggestion,
  WeightReductionOptions,
  WeightSaving,
  TonnageValidation,
  ArmorEfficiency,
  WeightPenalty,
  Equipment,
  WeightCalculationContext
} from './types';

/**
 * Unified Weight Balance Service Interface
 * 
 * Provides the same interface as the original monolithic service
 * but uses the modular services internally.
 */
export interface WeightBalanceService {
  // Total weight calculations
  calculateTotalWeight(config: UnitConfiguration, equipment: Equipment[], context?: WeightCalculationContext): WeightSummary;
  calculateComponentWeights(config: UnitConfiguration): ComponentWeightBreakdown;
  calculateEquipmentWeight(equipment: Equipment[]): number;
  
  // Balance analysis
  analyzeWeightDistribution(config: UnitConfiguration, equipment: Equipment[]): WeightDistribution;
  calculateCenterOfGravity(config: UnitConfiguration, equipment: Equipment[]): CenterOfGravity;
  analyzeStability(config: UnitConfiguration, equipment: Equipment[]): StabilityAnalysis;
  
  // Optimization
  generateOptimizationSuggestions(config: UnitConfiguration, equipment: Equipment[]): OptimizationSuggestion[];
  calculateWeightReduction(config: UnitConfiguration): WeightReductionOptions;
  findWeightSavings(config: UnitConfiguration, equipment: Equipment[]): WeightSaving[];
  
  // Validation
  validateTonnageLimit(config: UnitConfiguration, equipment: Equipment[]): TonnageValidation;
  calculateRemainingTonnage(config: UnitConfiguration, equipment: Equipment[]): number;
  isWithinTonnageLimit(config: UnitConfiguration, equipment: Equipment[]): boolean;
  
  // Specialized calculations
  calculateJumpJetWeight(config: UnitConfiguration): number;
  calculateArmorEfficiency(config: UnitConfiguration): ArmorEfficiency;
  calculateWeightPenalties(config: UnitConfiguration): WeightPenalty[];
}

/**
 * Unified Weight Balance Service Implementation
 * 
 * Acts as a facade that delegates to the appropriate modular services
 */
export class WeightBalanceServiceImpl implements WeightBalanceService {
  
  // ===== TOTAL WEIGHT CALCULATIONS =====
  
  calculateTotalWeight(
    config: UnitConfiguration, 
    equipment: Equipment[], 
    context?: WeightCalculationContext
  ): WeightSummary {
    return WeightCalculationService.calculateTotalWeight(config, equipment, context);
  }
  
  calculateComponentWeights(config: UnitConfiguration): ComponentWeightBreakdown {
    return WeightCalculationService.calculateComponentWeights(config);
  }
  
  calculateEquipmentWeight(equipment: Equipment[]): number {
    return WeightCalculationService.calculateEquipmentWeight(equipment);
  }
  
  // ===== BALANCE ANALYSIS =====
  
  analyzeWeightDistribution(config: UnitConfiguration, equipment: Equipment[]): WeightDistribution {
    return BalanceAnalysisService.analyzeWeightDistribution(config, equipment);
  }
  
  calculateCenterOfGravity(config: UnitConfiguration, equipment: Equipment[]): CenterOfGravity {
    return BalanceAnalysisService.calculateCenterOfGravity(config, equipment);
  }
  
  analyzeStability(config: UnitConfiguration, equipment: Equipment[]): StabilityAnalysis {
    return BalanceAnalysisService.analyzeStability(config, equipment);
  }
  
  // ===== OPTIMIZATION =====
  
  generateOptimizationSuggestions(config: UnitConfiguration, equipment: Equipment[]): OptimizationSuggestion[] {
    return OptimizationService.generateOptimizationSuggestions(config, equipment);
  }
  
  calculateWeightReduction(config: UnitConfiguration): WeightReductionOptions {
    return OptimizationService.calculateWeightReduction(config);
  }
  
  findWeightSavings(config: UnitConfiguration, equipment: Equipment[]): WeightSaving[] {
    return OptimizationService.findWeightSavings(config, equipment);
  }
  
  // ===== VALIDATION =====
  
  validateTonnageLimit(config: UnitConfiguration, equipment: Equipment[]): TonnageValidation {
    return ValidationService.validateTonnageLimit(config, equipment);
  }
  
  calculateRemainingTonnage(config: UnitConfiguration, equipment: Equipment[]): number {
    return ValidationService.calculateRemainingTonnage(config, equipment);
  }
  
  isWithinTonnageLimit(config: UnitConfiguration, equipment: Equipment[]): boolean {
    return ValidationService.isWithinTonnageLimit(config, equipment);
  }
  
  // ===== SPECIALIZED CALCULATIONS =====
  
  calculateJumpJetWeight(config: UnitConfiguration): number {
    const jumpJets = WeightCalculationService.calculateJumpJetWeight(config);
    return jumpJets.weight;
  }
  
  calculateArmorEfficiency(config: UnitConfiguration): ArmorEfficiency {
    return ArmorEfficiencyService.calculateArmorEfficiency(config);
  }
  
  calculateWeightPenalties(config: UnitConfiguration): WeightPenalty[] {
    return OptimizationService.calculateWeightPenalties(config);
  }
}

/**
 * Factory function for dependency injection
 * Maintains compatibility with the original service
 */
export const createWeightBalanceService = (): WeightBalanceService => {
  return new WeightBalanceServiceImpl();
};

/**
 * Default export for backward compatibility
 */
export default WeightBalanceServiceImpl;




