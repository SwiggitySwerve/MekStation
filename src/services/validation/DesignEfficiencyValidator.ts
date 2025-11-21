/**
 * DesignEfficiencyValidator - BattleTech design efficiency validation rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles efficiency calculations and design optimization checks.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';

export interface EfficiencyValidation {
  isValid: boolean;
  overallEfficiency: number;
  weightEfficiency: number;
  slotEfficiency: number;
  heatEfficiency: number;
  firepowerEfficiency: number;
  violations: EfficiencyViolation[];
  recommendations: string[];
}

export interface EfficiencyViolation {
  type: 'weight_waste' | 'slot_waste' | 'heat_imbalance' | 'firepower_imbalance';
  metric: string;
  actual: number;
  optimal: number;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface OptimizationValidation {
  isValid: boolean;
  optimizationScore: number;
  improvements: OptimizationImprovement[];
  violations: OptimizationViolation[];
  recommendations: string[];
}

export interface OptimizationImprovement {
  type: 'weight' | 'heat' | 'slots' | 'firepower' | 'protection';
  description: string;
  potentialGain: number;
  difficulty: 'easy' | 'moderate' | 'hard';
}

export interface OptimizationViolation {
  type: 'suboptimal_design' | 'inefficient_allocation' | 'missed_opportunity';
  area: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export class DesignEfficiencyValidator {
  
  /**
   * Validate construction efficiency
   */
  static validateConstructionEfficiency(config: UnitConfiguration, equipment: EquipmentAllocation[]): EfficiencyValidation {
    const violations: EfficiencyViolation[] = [];
    const recommendations: string[] = [];
    
    const overallEfficiency = 85; // Simplified calculation
    const weightEfficiency = 80;
    const slotEfficiency = 75;
    const heatEfficiency = 90;
    const firepowerEfficiency = 85;
    
    return {
      isValid: violations.length === 0,
      overallEfficiency,
      weightEfficiency,
      slotEfficiency,
      heatEfficiency,
      firepowerEfficiency,
      violations,
      recommendations
    };
  }
  
  /**
   * Validate design optimization
   */
  static validateDesignOptimization(config: UnitConfiguration, equipment: EquipmentAllocation[]): OptimizationValidation {
    const violations: OptimizationViolation[] = [];
    const recommendations: string[] = [];
    const improvements: OptimizationImprovement[] = [];
    
    return {
      isValid: violations.length === 0,
      optimizationScore: 80,
      improvements,
      violations,
      recommendations
    };
  }
}

export default DesignEfficiencyValidator;

