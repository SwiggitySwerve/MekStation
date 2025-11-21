/**
 * Type definitions for Tech Level validation system
 * 
 * Contains all interfaces and types used across the tech level validation modules.
 * Extracted from TechLevelRulesValidator.ts for better modularity.
 */

import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';

export interface TechLevelValidation {
  isValid: boolean;
  unitTechLevel: string;
  unitTechBase: string;
  era: string;
  mixedTech: MixedTechValidation;
  eraRestrictions: EraValidation;
  availability: AvailabilityValidation;
  techBaseCompliance: TechBaseCompliance;
  violations: TechLevelViolation[];
  recommendations: string[];
}

export interface MixedTechValidation {
  isMixed: boolean;
  innerSphereComponents: number;
  clanComponents: number;
  allowedMixed: boolean;
  mixedTechRules: MixedTechRules;
  violations: string[];
}

export interface MixedTechRules {
  allowMixedTech: boolean;
  requiresSpecialPilot: boolean;
  battleValueModifier: number;
  restrictedCombinations: string[];
  compatibilityMatrix: CompatibilityMatrix;
}

export interface CompatibilityMatrix {
  [techBase: string]: {
    compatible: string[];
    restricted: string[];
    forbidden: string[];
  };
}

export interface EraValidation {
  isValid: boolean;
  era: string;
  targetEra: string;
  invalidComponents: EraViolation[];
  eraProgression: EraProgression;
  recommendations: string[];
}

export interface EraViolation {
  component: string;
  availableEra: string;
  currentEra: string;
  earliestAvailability: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface EraProgression {
  currentEra: string;
  availableEras: string[];
  eraTimeline: EraTimelineEntry[];
  technologyIntroductions: TechIntroduction[];
}

export interface EraTimelineEntry {
  era: string;
  startYear: number;
  endYear: number;
  description: string;
  majorEvents: string[];
}

export interface TechIntroduction {
  technology: string;
  era: string;
  year: number;
  techBase: string;
  description: string;
}

export interface AvailabilityValidation {
  isValid: boolean;
  overallRating: string;
  componentRatings: ComponentAvailability[];
  ratingBreakdown: AvailabilityBreakdown;
  violations: AvailabilityViolation[];
}

export interface ComponentAvailability {
  component: string;
  rating: string;
  available: boolean;
  techBase: string;
  era: string;
  rarity: string;
  cost: number;
  notes: string;
}

export interface AvailabilityBreakdown {
  totalComponents: number;
  ratingDistribution: { [rating: string]: number };
  averageRating: number;
  limitingFactors: string[];
  improvementSuggestions: string[];
}

export interface AvailabilityViolation {
  component: string;
  rating: string;
  requiredRating: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  impact: string;
}

export interface TechBaseCompliance {
  isValid: boolean;
  unitTechBase: string;
  componentTechBases: ComponentTechBase[];
  conflicts: TechBaseConflict[];
  complianceScore: number;
}

export interface ComponentTechBase {
  component: string;
  techBase: string;
  category: string;
  isCompliant: boolean;
  notes: string;
}

export interface TechBaseConflict {
  component: string;
  unitTechBase: string;
  componentTechBase: string;
  conflictType: 'incompatible' | 'restricted' | 'requires_mixed';
  resolution: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface TechLevelViolation {
  type: 'tech_base_mismatch' | 'era_violation' | 'availability_violation' | 'mixed_tech_violation';
  component: string;
  expected: string;
  actual: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface TechLevelValidationContext {
  strictEraCompliance: boolean;
  allowMixedTech: boolean;
  targetAvailabilityRating: string;
  validateTechProgression: boolean;
  enforceCanonicalRestrictions: boolean;
}

export interface TechOptimization {
  recommendations: TechOptimizationRecommendation[];
  alternativeTechBases: AlternativeTechBase[];
  upgradePaths: TechUpgradePath[];
  costAnalysis: TechCostAnalysis;
}

export interface TechOptimizationRecommendation {
  type: 'tech_base_change' | 'era_adjustment' | 'component_replacement' | 'mixed_tech_optimization';
  description: string;
  component?: string;
  fromValue: string;
  toValue: string;
  benefit: string;
  impact: TechImpact;
  difficulty: 'easy' | 'moderate' | 'hard';
  priority: 'high' | 'medium' | 'low';
}

export interface TechImpact {
  availabilityChange: number;
  costChange: number;
  performanceChange: number;
  compatibilityChange: number;
  ruleCompliance: number;
}

export interface AlternativeTechBase {
  name: string;
  description: string;
  techBase: string;
  era: string;
  advantages: string[];
  disadvantages: string[];
  componentChanges: ComponentChange[];
  overallRating: number;
}

export interface ComponentChange {
  component: string;
  from: string;
  to: string;
  reason: string;
  impact: string;
}

export interface TechUpgradePath {
  name: string;
  description: string;
  steps: UpgradeStep[];
  totalCost: number;
  timeframe: string;
  feasibility: number;
}

export interface UpgradeStep {
  step: number;
  description: string;
  components: string[];
  cost: number;
  timeline: string;
  prerequisites: string[];
}

export interface TechCostAnalysis {
  baselineCost: number;
  optimizedCost: number;
  savings: number;
  costBreakdown: CostBreakdown;
  returnOnInvestment: number;
}

export interface CostBreakdown {
  components: number;
  research: number;
  development: number;
  production: number;
  maintenance: number;
}

export interface ComponentInfo {
  name: string;
  techBase: string;
  category: string;
}




