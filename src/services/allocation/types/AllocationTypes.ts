/**
 * Allocation Types
 * Shared interfaces for equipment allocation, validation, and analysis
 * Extracted from EquipmentAllocationService.ts
 */

import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';

// =============================================================================
// Core Placement Types
// =============================================================================

export interface EquipmentPlacement {
  equipmentId: string;
  equipment: EquipmentAllocation;
  location: string;
  slots: number[];
  isFixed: boolean; // Cannot be moved during optimization
  isValid: boolean;
  constraints: EquipmentConstraints;
  conflicts: string[];
}

export interface EquipmentConstraints {
  allowedLocations: string[];
  forbiddenLocations: string[];
  requiresCASE: boolean;
  requiresArtemis: boolean;
  minTonnageLocation: number;
  maxTonnageLocation: number;
  heatGeneration: number;
  specialRules: string[];
}

export interface PlacementPreferences {
  preferredLocations: string[];
  avoidLocations: string[];
  prioritizeBalance: boolean;
  prioritizeProtection: boolean;
  allowSplitting: boolean;
  groupWith: string[];
}

export interface AllocationConstraints {
  preferredLocations: string[];
  forbiddenLocations: string[];
  groupTogether: string[][]; // Equipment that should be grouped
  separateFrom: string[][]; // Equipment that should be separated
  prioritizeBalance: boolean;
  prioritizeProtection: boolean;
  allowSplitting: boolean;
}

// =============================================================================
// Allocation Result Types
// =============================================================================

export interface AllocationResult {
  success: boolean;
  allocations: EquipmentPlacement[];
  unallocated: EquipmentAllocation[];
  warnings: AllocationWarning[];
  suggestions: string[];
  efficiency: number; // 0-100 score
}

export interface AutoAllocationResult {
  success: boolean;
  strategy: string;
  allocations: EquipmentPlacement[];
  unallocated: EquipmentAllocation[];
  metrics: {
    successRate: number;
    efficiencyScore: number;
    balanceScore: number;
    utilization: number;
  };
  improvements: string[];
  warnings: AllocationWarning[];
}

export interface ReallocationResult {
  success: boolean;
  originalAllocations: EquipmentPlacement[];
  newAllocations: EquipmentPlacement[];
  improvement: number;
  constraintsApplied: AllocationConstraints;
  warnings: AllocationWarning[];
}

export interface AllocationWarning {
  type: 'balance' | 'protection' | 'efficiency' | 'heat' | 'tech_level';
  equipment: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

// =============================================================================
// Specialized Allocation Results
// =============================================================================

export interface WeaponAllocationResult {
  allocated: EquipmentPlacement[];
  unallocated: EquipmentAllocation[];
  strategy: 'balanced' | 'front_loaded' | 'distributed' | 'concentrated';
  heatEfficiency: number;
  firepower: {
    short: number;
    medium: number;
    long: number;
  };
  recommendations: string[];
}

export interface AmmoAllocationResult {
  allocated: EquipmentPlacement[];
  unallocated: EquipmentAllocation[];
  caseProtection: {
    protected: string[];
    unprotected: string[];
    recommendations: string[];
  };
  ammoBalance: {
    weapon: string;
    tons: number;
    turns: number;
    adequate: boolean;
  }[];
  suggestions: string[];
}

export interface HeatSinkAllocationResult {
  allocated: EquipmentPlacement[];
  engineHeatSinks: number;
  externalHeatSinks: number;
  heatDissipation: number;
  heatBalance: {
    generation: number;
    dissipation: number;
    deficit: number;
  };
  optimization: string[];
}

export interface JumpJetAllocationResult {
  allocated: EquipmentPlacement[];
  jumpMP: number;
  distribution: {
    centerTorso: number;
    legs: number;
    recommended: boolean;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// =============================================================================
// Placement & Alternatives
// =============================================================================

export interface PlacementSuggestion {
  location: string;
  slots: number[];
  score: number; // 0-100, higher is better
  reasoning: string[];
  tradeoffs: string[];
  alternatives: AlternativePlacement[];
}

export interface AlternativePlacement {
  location: string;
  slots: number[];
  pros: string[];
  cons: string[];
  score: number;
}

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  compliance: {
    battleTechRules: boolean;
    techLevel: boolean;
    mountingRules: boolean;
    weightLimits: boolean;
  };
  suggestions: string[];
}

export interface ValidationError {
  equipmentId: string;
  type: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  location?: string;
  suggestedFix: string;
}

export interface ValidationWarning {
  equipmentId: string;
  type: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface PlacementValidation {
  isValid: boolean;
  errors: PlacementError[];
  warnings: PlacementWarning[];
  restrictions: string[];
  suggestions: string[];
}

export interface PlacementError {
  type: 'slot_conflict' | 'location_invalid' | 'weight_exceeded' | 'rule_violation' | 'tech_level';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface PlacementWarning {
  type: 'suboptimal_placement' | 'balance_issue' | 'heat_concern' | 'vulnerability' | 'dependency';
  message: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
}

export interface RuleComplianceResult {
  compliant: boolean;
  violations: RuleViolation[];
  techLevelIssues: TechLevelIssue[];
  mountingIssues: MountingIssue[];
  suggestions: ComplianceSuggestion[];
}

export interface RuleViolation {
  rule: string;
  description: string;
  affectedEquipment: string[];
  severity: 'critical' | 'major' | 'minor';
  resolution: string;
}

export interface TechLevelIssue {
  equipment: string;
  requiredTechLevel: string;
  currentTechLevel: string;
  era: string;
  canBeResolved: boolean;
  suggestion: string;
}

export interface MountingIssue {
  equipment: string;
  location: string;
  issue: string;
  restriction: string;
  alternatives: string[];
}

export interface ComplianceSuggestion {
  type: 'tech_level' | 'mounting' | 'rule_compliance';
  equipment: string;
  suggestion: string;
  impact: string;
}

export interface TechLevelValidation {
  isValid: boolean;
  issues: TechLevelIssue[];
  summary: {
    innerSphere: number;
    clan: number;
    mixed: boolean;
    era: string;
    techLevel: string;
  };
  recommendations: string[];
}

export interface MountingValidation {
  canMount: boolean;
  restrictions: MountingRestriction[];
  requirements: MountingRequirement[];
  alternatives: string[];
  warnings: string[];
}

export interface MountingRestriction {
  type: 'location' | 'tonnage' | 'heat' | 'ammunition' | 'special';
  description: string;
  severity: 'blocking' | 'warning';
}

export interface MountingRequirement {
  type: 'case' | 'artemis' | 'targeting_computer' | 'special';
  description: string;
  satisfied: boolean;
  suggestion?: string;
}

// =============================================================================
// Optimization & Analysis Types
// =============================================================================

export interface OptimizationResult {
  improved: boolean;
  originalScore: number;
  optimizedScore: number;
  improvements: Improvement[];
  newAllocations: EquipmentPlacement[];
  summary: string;
}

export interface Improvement {
  type: 'balance' | 'efficiency' | 'protection' | 'heat' | 'firepower';
  description: string;
  benefit: string;
  tradeoff?: string;
}

export interface EfficiencyAnalysis {
  overallScore: number; // 0-100
  categories: {
    placement: number;
    balance: number;
    protection: number;
    heat: number;
    firepower: number;
  };
  bottlenecks: string[];
  recommendations: EfficiencyRecommendation[];
}

export interface EfficiencyRecommendation {
  category: string;
  issue: string;
  suggestion: string;
  expectedImprovement: number;
  difficulty: 'easy' | 'moderate' | 'hard';
}

export interface LoadoutReport {
  summary: {
    totalEquipment: number;
    totalWeight: number;
    distribution: { [location: string]: number };
    efficiency: number;
  };
  weapons: WeaponSummary;
  ammunition: AmmoSummary;
  heatManagement: HeatSummary;
  protection: ProtectionSummary;
  recommendations: string[];
}

export interface WeaponSummary {
  count: number;
  totalWeight: number;
  firepower: {
    short: number;
    medium: number;
    long: number;
  };
  heatGeneration: number;
  distribution: { [location: string]: number };
  analysis: string[];
}

export interface AmmoSummary {
  totalTons: number;
  distribution: { [location: string]: number };
  caseProtected: number;
  vulnerableLocations: string[];
  ammoBalance: { weapon: string; tons: number; adequate: boolean }[];
  recommendations: string[];
}

export interface HeatSummary {
  generation: number;
  dissipation: number;
  efficiency: number;
  bottlenecks: string[];
  heatSinkDistribution: { [location: string]: number };
  recommendations: string[];
}

export interface ProtectionSummary {
  criticalEquipment: string[];
  vulnerableLocations: string[];
  protectionScore: number;
  caseRecommendations: string[];
  redundancy: { equipment: string; count: number; adequate: boolean }[];
}

export interface HeatAnalysis {
  totalGeneration: number;
  byLocation: { [location: string]: number };
  continuousGeneration: number;
  alphaStrikeGeneration: number;
  heatScale: {
    low: number;
    medium: number;
    high: number;
  };
  recommendations: string[];
}

export interface FirepowerAnalysis {
  totalDamage: {
    short: number;
    medium: number;
    long: number;
  };
  byLocation: {
    [location: string]: {
      short: number;
      medium: number;
      long: number;
    };
  };
  weaponTypes: {
    energy: number;
    ballistic: number;
    missile: number;
  };
  alphaStrike: number;
  sustainedFire: number;
  recommendations: string[];
}

export interface EquipmentSummary {
  totalItems: number;
  totalWeight: number;
  categories: {
    weapons: number;
    ammunition: number;
    heatSinks: number;
    jumpJets: number;
    equipment: number;
  };
  distribution: { [location: string]: number };
  technicalSummary: string[];
}

// =============================================================================
// Equipment Action Types
// =============================================================================

export interface AddEquipmentResult {
  success: boolean;
  placement?: EquipmentPlacement;
  alternatives: AlternativePlacement[];
  warnings: string[];
  impact: EquipmentImpact;
}

export interface RemoveEquipmentResult {
  success: boolean;
  freedSlots: { location: string; slots: number[] };
  impact: EquipmentImpact;
  suggestions: string[];
}

export interface MoveEquipmentResult {
  success: boolean;
  newPlacement?: EquipmentPlacement;
  warnings: string[];
  impact: EquipmentImpact;
}

export interface EquipmentImpact {
  weight: number;
  heat: number;
  firepower: number;
  balance: number;
  efficiency: number;
}

