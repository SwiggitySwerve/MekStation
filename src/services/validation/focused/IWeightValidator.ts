/**
 * IWeightValidator - Single Responsibility Principle compliant weight validation interface
 * 
 * This interface is responsible ONLY for weight-related validation logic.
 * Extracted from the monolithic ConstructionRulesValidator to follow SOLID principles.
 */

import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';

export interface IWeightValidator {
  /**
   * Validates weight limits and distribution for a unit configuration
   */
  validateWeight(config: UnitConfiguration, equipment: any[]): WeightValidation;

  /**
   * Validates if the unit meets minimum weight requirements
   */
  validateMinimumWeight(config: UnitConfiguration, equipment: any[]): WeightValidation;

  /**
   * Validates weight distribution across components
   */
  validateWeightDistribution(config: UnitConfiguration, equipment: any[]): WeightDistribution;

  /**
   * Calculates total weight of the unit
   */
  calculateTotalWeight(config: UnitConfiguration, equipment: any[]): number;

  /**
   * Calculates weight breakdown by component type
   */
  calculateWeightBreakdown(config: UnitConfiguration, equipment: any[]): WeightBreakdown;
}

export interface WeightValidation {
  isValid: boolean;
  totalWeight: number;
  maxWeight: number;
  overweight: number;
  underweight: number;
  distribution: WeightDistribution;
  violations: WeightViolation[];
  recommendations: string[];
  efficiency: number; // 0-100 score
}

export interface WeightDistribution {
  structure: number;
  armor: number;
  engine: number;
  equipment: number;
  ammunition: number;
  systems: number;
  jumpJets: number;
  heatSinks: number;
  weapons: number;
  total: number;
}

export interface WeightBreakdown {
  components: {
    [componentType: string]: {
      weight: number;
      percentage: number;
      items: WeightItem[];
    };
  };
  summary: {
    totalWeight: number;
    utilizationPercentage: number;
    remainingCapacity: number;
  };
}

export interface WeightItem {
  name: string;
  type: string;
  weight: number;
  location?: string;
  isFixed: boolean;
}

export interface WeightViolation {
  type: 'overweight' | 'underweight' | 'invalid_distribution' | 'negative_weight' | 'component_overweight';
  component: string;
  actual: number;
  expected: number;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  suggestedFix: string;
  impact: string;
}




