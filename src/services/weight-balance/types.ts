/**
 * Shared types and interfaces for Weight Balance Services
 * 
 * Extracted from WeightBalanceService for better modularization and reusability.
 * Contains all type definitions used across weight balance calculations.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';

export interface WeightSummary {
  totalWeight: number;
  maxTonnage: number;
  remainingTonnage: number;
  percentageUsed: number;
  isOverweight: boolean;
  breakdown: {
    structure: number;
    engine: number;
    gyro: number;
    heatSinks: number;
    armor: number;
    equipment: number;
    ammunition: number;
    jumpJets: number;
  };
}

export interface ComponentWeightBreakdown {
  structure: {
    weight: number;
    type: string;
    efficiency: number;
  };
  engine: {
    weight: number;
    type: string;
    rating: number;
    efficiency: number;
  };
  gyro: {
    weight: number;
    type: string;
    efficiency: number;
  };
  heatSinks: {
    internal: number;
    external: number;
    total: number;
    type: string;
    efficiency: number;
  };
  armor: {
    weight: number;
    type: string;
    points: number;
    efficiency: number;
  };
  jumpJets: {
    weight: number;
    count: number;
    type: string;
    efficiency: number;
  };
}

export interface WeightDistribution {
  frontHeavy: boolean;
  rearHeavy: boolean;
  leftHeavy: boolean;
  rightHeavy: boolean;
  distribution: {
    head: number;
    centerTorso: number;
    leftTorso: number;
    rightTorso: number;
    leftArm: number;
    rightArm: number;
    leftLeg: number;
    rightLeg: number;
  };
  balance: {
    frontToRear: number;
    leftToRight: number;
  };
}

export interface CenterOfGravity {
  x: number; // Left (-) to Right (+)
  y: number; // Front (-) to Rear (+)
  z: number; // Bottom (-) to Top (+)
  stability: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unstable';
  recommendations: string[];
}

export interface StabilityAnalysis {
  overallStability: number; // 0-100 score
  balanceScore: number;
  weightDistributionScore: number;
  structuralIntegrityScore: number;
  recommendations: string[];
  warnings: string[];
}

export interface OptimizationSuggestion {
  category: 'engine' | 'armor' | 'structure' | 'equipment' | 'heatsinks' | 'jumpjets';
  type: 'weight_reduction' | 'efficiency_improvement' | 'cost_reduction';
  description: string;
  currentWeight: number;
  suggestedWeight: number;
  weightSavings: number;
  impact: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  priority: 'high' | 'medium' | 'low';
}

export interface WeightReductionOptions {
  structureUpgrade: {
    available: boolean;
    currentWeight: number;
    newWeight: number;
    savings: number;
    cost: string;
  };
  engineDowngrade: {
    available: boolean;
    options: {
      rating: number;
      weight: number;
      savings: number;
      walkMP: number;
    }[];
  };
  armorOptimization: {
    available: boolean;
    maxReduction: number;
    recommendations: string[];
  };
  equipmentAlternatives: {
    available: boolean;
    suggestions: {
      current: string;
      alternative: string;
      weightSavings: number;
    }[];
  };
}

export interface WeightSaving {
  component: string;
  currentWeight: number;
  proposedWeight: number;
  savings: number;
  method: string;
  tradeoffs: string[];
  feasible: boolean;
}

export interface TonnageValidation {
  isValid: boolean;
  currentWeight: number;
  maxTonnage: number;
  overweight: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ArmorEfficiency {
  totalPoints: number;
  totalWeight: number;
  pointsPerTon: number;
  efficiency: 'excellent' | 'good' | 'average' | 'poor';
  maxPossiblePoints: number;
  utilizationPercentage: number;
  recommendations: string[];
}

export interface WeightPenalty {
  component: string;
  reason: string;
  penalty: number;
  description: string;
  canBeAvoided: boolean;
  suggestion?: string;
}

// Common context and configuration types
export interface WeightCalculationContext {
  includeOptimization?: boolean;
  strictValidation?: boolean;
  techLevel?: 'standard' | 'advanced' | 'experimental';
}

export interface ComponentConfiguration {
  type: string;
  techBase: 'Inner Sphere' | 'Clan';
}

// Equipment-related types
export interface Equipment {
  equipmentData: {
    name: string;
    tonnage: number;
    type: string;
    criticalSlots?: number;
    heatGeneration?: number;
  };
  quantity: number;
  location?: string;
}

// Location weight distribution
export interface LocationWeights {
  head: number;
  centerTorso: number;
  leftTorso: number;
  rightTorso: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}




