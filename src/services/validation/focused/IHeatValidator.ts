/**
 * IHeatValidator - Single Responsibility Principle compliant heat validation interface
 * 
 * This interface is responsible ONLY for heat-related validation logic.
 * Extracted from the monolithic ConstructionRulesValidator to follow SOLID principles.
 */

import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';

export interface IHeatValidator {
  /**
   * Validates heat management for a unit configuration
   */
  validateHeat(config: UnitConfiguration, equipment: any[]): HeatValidation;

  /**
   * Validates minimum heat sink requirements
   */
  validateMinimumHeatSinks(config: UnitConfiguration, equipment: any[]): HeatValidation;

  /**
   * Validates heat sink type compatibility with engine
   */
  validateHeatSinkCompatibility(config: UnitConfiguration, equipment: any[]): HeatCompatibilityValidation;

  /**
   * Calculates total heat generation from equipment
   */
  calculateHeatGeneration(equipment: any[]): number;

  /**
   * Calculates total heat dissipation capacity
   */
  calculateHeatDissipation(config: UnitConfiguration, equipment: any[]): HeatDissipation;

  /**
   * Analyzes heat balance and efficiency
   */
  analyzeHeatBalance(config: UnitConfiguration, equipment: any[]): HeatBalanceAnalysis;
}

export interface HeatValidation {
  isValid: boolean;
  heatGeneration: number;
  heatDissipation: number;
  heatDeficit: number;
  minimumHeatSinks: number;
  actualHeatSinks: number;
  engineHeatSinks: number;
  externalHeatSinks: number;
  violations: HeatViolation[];
  recommendations: string[];
  efficiency: number; // 0-100 score
}

export interface HeatCompatibilityValidation {
  isValid: boolean;
  engineType: string;
  heatSinkType: string;
  compatible: boolean;
  restrictions: string[];
  violations: HeatCompatibilityViolation[];
  alternatives: string[];
}

export interface HeatDissipation {
  total: number;
  engine: number;
  external: number;
  byType: {
    single: number;
    double: number;
    clan: number;
    compact: number;
    laser: number;
  };
}

export interface HeatBalanceAnalysis {
  balance: number; // Positive = heat surplus, negative = heat deficit
  sustainedFireCapacity: number; // Heat that can be sustained indefinitely
  alphaStrikeCapacity: number; // Maximum single-turn heat generation
  heatScale: {
    shutdown: number; // Heat level that causes shutdown
    ammoExplosion: number; // Heat level that risks ammo explosion
    movementPenalty: number; // Heat level that affects movement
  };
  firingPatterns: FiringPattern[];
  recommendations: string[];
}

export interface FiringPattern {
  name: string;
  weapons: string[];
  heatGenerated: number;
  sustainable: boolean;
  description: string;
}

export interface HeatViolation {
  type: 'insufficient_heat_sinks' | 'invalid_heat_sink_type' | 'heat_overflow' | 'engine_heat_sink_violation' | 'heat_sink_compatibility';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
  impact: string;
  heatDeficit?: number;
}

export interface HeatCompatibilityViolation {
  type: 'engine_incompatible' | 'tech_level_mismatch' | 'era_restriction';
  component: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
  alternatives: string[];
}




