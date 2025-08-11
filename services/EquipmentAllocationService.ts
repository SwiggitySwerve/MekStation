/**
 * EquipmentAllocationService - Equipment placement and allocation management
 * 
 * Extracted from UnitCriticalManager as part of large file refactoring.
 * Handles equipment placement, auto-allocation algorithms, validation, and optimization for BattleMech construction.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../utils/criticalSlots/UnitCriticalManager';
import { ComponentConfiguration } from '../types/componentConfiguration';
import { SystemComponentRules } from '../utils/criticalSlots/SystemComponentRules';
import { AutoAllocationManager } from './allocation/AutoAllocationManager';
import { ValidationManager } from './allocation/ValidationManager';
import { AnalysisManager } from './allocation/AnalysisManager';

export interface EquipmentAllocationService {
  // Core allocation methods
  allocateEquipment(config: UnitConfiguration, equipment: any[]): AllocationResult;
  autoAllocateEquipment(config: UnitConfiguration, equipment: any[]): AutoAllocationResult;
  reallocateEquipment(config: UnitConfiguration, equipment: any[], constraints: AllocationConstraints): ReallocationResult;
  
  // Placement strategies
  findOptimalPlacement(equipment: any, config: UnitConfiguration, existingAllocations: EquipmentPlacement[]): PlacementSuggestion[];
  validatePlacement(equipment: any, location: string, config: UnitConfiguration): PlacementValidation;
  suggestAlternativePlacements(equipment: any, config: UnitConfiguration): AlternativePlacement[];
  
  // Auto-allocation algorithms
  autoAllocateWeapons(weapons: any[], config: UnitConfiguration): WeaponAllocationResult;
  autoAllocateAmmunition(ammunition: any[], config: UnitConfiguration): AmmoAllocationResult;
  autoAllocateHeatSinks(heatSinks: any[], config: UnitConfiguration): HeatSinkAllocationResult;
  autoAllocateJumpJets(jumpJets: any[], config: UnitConfiguration): JumpJetAllocationResult;
  
  // Validation and compliance
  validateEquipmentPlacement(config: UnitConfiguration, allocations: EquipmentPlacement[]): ValidationResult;
  checkBattleTechRules(config: UnitConfiguration, allocations: EquipmentPlacement[]): RuleComplianceResult;
  validateTechLevel(equipment: any[], config: UnitConfiguration): TechLevelValidation;
  validateMountingRestrictions(equipment: any, location: string, config: UnitConfiguration): MountingValidation;
  
  // Optimization and analysis
  optimizeEquipmentLayout(config: UnitConfiguration, allocations: EquipmentPlacement[]): OptimizationResult;
  analyzeLoadoutEfficiency(config: UnitConfiguration, allocations: EquipmentPlacement[]): EfficiencyAnalysis;
  generateLoadoutReport(config: UnitConfiguration, allocations: EquipmentPlacement[]): LoadoutReport;
  
  // Equipment management
  addEquipment(equipment: any, config: UnitConfiguration, preferences: PlacementPreferences): AddEquipmentResult;
  removeEquipment(equipmentId: string, config: UnitConfiguration): RemoveEquipmentResult;
  moveEquipment(equipmentId: string, fromLocation: string, toLocation: string, config: UnitConfiguration): MoveEquipmentResult;
  
  // Utility methods
  getEquipmentConstraints(equipment: any): EquipmentConstraints;
  calculateHeatGeneration(allocations: EquipmentPlacement[]): HeatAnalysis;
  calculateFirepower(allocations: EquipmentPlacement[]): FirepowerAnalysis;
  generateEquipmentSummary(allocations: EquipmentPlacement[]): EquipmentSummary;
}

export interface AllocationResult {
  success: boolean;
  allocations: EquipmentPlacement[];
  unallocated: any[];
  warnings: AllocationWarning[];
  suggestions: string[];
  efficiency: number; // 0-100 score
}

export interface ReallocationResult {
  success: boolean;
  originalAllocations: EquipmentPlacement[];
  newAllocations: EquipmentPlacement[];
  improvement: number;
  constraintsApplied: AllocationConstraints;
  warnings: AllocationWarning[];
}

export interface EquipmentPlacement {
  equipmentId: string;
  equipment: any;
  location: string;
  slots: number[];
  isFixed: boolean; // Cannot be moved during optimization
  isValid: boolean;
  constraints: EquipmentConstraints;
  conflicts: string[];
}

export interface AutoAllocationResult {
  success: boolean;
  strategy: string;
  allocations: EquipmentPlacement[];
  unallocated: any[];
  metrics: {
    successRate: number;
    efficiencyScore: number;
    balanceScore: number;
    utilization: number;
  };
  improvements: string[];
  warnings: AllocationWarning[];
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

export interface PlacementSuggestion {
  location: string;
  slots: number[];
  score: number; // 0-100, higher is better
  reasoning: string[];
  tradeoffs: string[];
  alternatives: AlternativePlacement[];
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
  type: 'suboptimal_placement' | 'balance_issue' | 'heat_concern' | 'vulnerability';
  message: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
}

export interface AlternativePlacement {
  location: string;
  slots: number[];
  pros: string[];
  cons: string[];
  score: number;
}

export interface WeaponAllocationResult {
  allocated: EquipmentPlacement[];
  unallocated: any[];
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
  unallocated: any[];
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

export interface PlacementPreferences {
  preferredLocations: string[];
  avoidLocations: string[];
  prioritizeBalance: boolean;
  prioritizeProtection: boolean;
  allowSplitting: boolean;
  groupWith: string[];
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

export interface AllocationWarning {
  type: 'balance' | 'protection' | 'efficiency' | 'heat' | 'tech_level';
  equipment: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
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

export class EquipmentAllocationServiceImpl implements EquipmentAllocationService {
  
  // Location preferences for different equipment types
  private readonly EQUIPMENT_PREFERENCES = {
    'energy_weapon': ['leftArm', 'rightArm', 'leftTorso', 'rightTorso'],
    'ballistic_weapon': ['leftTorso', 'rightTorso', 'leftArm', 'rightArm'],
    'missile_weapon': ['leftTorso', 'rightTorso'],
    'ammunition': ['leftTorso', 'rightTorso', 'leftLeg', 'rightLeg'],
    'heat_sink': ['leftLeg', 'rightLeg', 'leftTorso', 'rightTorso'],
    'jump_jet': ['centerTorso', 'leftLeg', 'rightLeg'],
    'equipment': ['head', 'centerTorso', 'leftTorso', 'rightTorso']
  };

  private readonly autoAllocationManager = new AutoAllocationManager();
  private readonly validationManager = new ValidationManager();
  private readonly analysisManager = new AnalysisManager();

  // ===== CORE ALLOCATION METHODS =====
  
  allocateEquipment(config: UnitConfiguration, equipment: any[]): AllocationResult {
    const allocations: EquipmentPlacement[] = [];
    const unallocated: any[] = [];
    const warnings: AllocationWarning[] = [];
    const suggestions: string[] = [];
    
    // Sort equipment by priority (weapons first, then equipment, then ammo)
    const sortedEquipment = this.sortEquipmentByPriority(equipment);
    
    for (const item of sortedEquipment) {
      const placementResult = this.findOptimalPlacement(item, config, allocations);
      
      if (placementResult.length > 0) {
        const bestPlacement = placementResult[0];
        const placement: EquipmentPlacement = {
          equipmentId: item.id || `${item.equipmentData?.name}_${Date.now()}`,
          equipment: item,
          location: bestPlacement.location,
          slots: bestPlacement.slots,
          isFixed: false,
          isValid: true,
          constraints: this.getEquipmentConstraints(item),
          conflicts: []
        };
        
        allocations.push(placement);
        
        // Check for warnings
        if (bestPlacement.score < 70) {
          warnings.push({
            type: 'efficiency',
            equipment: item.equipmentData?.name || 'Unknown',
            message: 'Suboptimal placement',
            severity: 'medium',
            suggestion: bestPlacement.reasoning.join(', ')
          });
        }
      } else {
        unallocated.push(item);
        suggestions.push(`Cannot place ${item.equipmentData?.name}: No suitable location found`);
      }
    }
    
    const efficiency = this.calculateAllocationEfficiency(allocations, config);
    
    return {
      success: unallocated.length === 0,
      allocations,
      unallocated,
      warnings,
      suggestions,
      efficiency
    };
  }
  
  autoAllocateEquipment(config: UnitConfiguration, equipment: any[]): AutoAllocationResult {
    const strategies = [
      { name: 'balanced', fn: this.balancedAllocationStrategy },
      { name: 'front_loaded', fn: this.frontLoadedStrategy },
      { name: 'distributed', fn: this.distributedStrategy },
      { name: 'concentrated', fn: this.concentratedStrategy }
    ];
    
    let bestResult: AllocationResult | null = null;
    let bestStrategy = '';
    let bestScore = 0;
    
    for (const strategy of strategies) {
      const result = strategy.fn.call(this, config, equipment);
      const score = this.calculateStrategyScore(result, config);
      
      if (score > bestScore) {
        bestResult = result;
        bestStrategy = strategy.name;
        bestScore = score;
      }
    }
    
    const metrics = this.calculateAllocationMetrics(bestResult!, config);
    const improvements = this.generateImprovementSuggestions(bestResult!, config);
    
    return {
      success: bestResult!.success,
      strategy: bestStrategy,
      allocations: bestResult!.allocations,
      unallocated: bestResult!.unallocated,
      metrics,
      improvements,
      warnings: bestResult!.warnings
    };
  }
  
  reallocateEquipment(config: UnitConfiguration, equipment: any[], constraints: AllocationConstraints): ReallocationResult {
    const currentAllocations = this.allocateEquipment(config, equipment);
    
    // Apply constraints and optimize
    const optimizedAllocations = this.applyConstraints(currentAllocations.allocations, constraints);
    const finalAllocations = this.optimizeWithConstraints(optimizedAllocations, config, constraints);
    
    const improvement = this.calculateImprovement(currentAllocations, finalAllocations);
    
    return {
      success: true,
      originalAllocations: currentAllocations.allocations,
      newAllocations: finalAllocations,
      improvement,
      constraintsApplied: constraints,
      warnings: []
    };
  }
  
  // ===== PLACEMENT STRATEGIES =====
  
  findOptimalPlacement(equipment: any, config: UnitConfiguration, existingAllocations: EquipmentPlacement[]): PlacementSuggestion[] {
    const constraints = this.getEquipmentConstraints(equipment);
    const suggestions: PlacementSuggestion[] = [];
    
    for (const location of constraints.allowedLocations) {
      const validation = this.validatePlacement(equipment, location, config);
      
      if (validation.isValid) {
        const availableSlots = this.findAvailableSlots(location, equipment, existingAllocations, config);
        
        if (availableSlots.length >= (equipment.equipmentData?.criticals || 1)) {
          const score = this.calculatePlacementScore(equipment, location, config, existingAllocations);
          const reasoning = this.generatePlacementReasoning(equipment, location, score);
          const tradeoffs = this.identifyTradeoffs(equipment, location, config);
          const alternatives = this.generateAlternatives(equipment, location, config);
          
          suggestions.push({
            location,
            slots: availableSlots.slice(0, equipment.equipmentData?.criticals || 1),
            score,
            reasoning,
            tradeoffs,
            alternatives
          });
        }
      }
    }
    
    return suggestions.sort((a, b) => b.score - a.score);
  }
  
  validatePlacement(equipment: any, location: string, config: UnitConfiguration): PlacementValidation {
    const errors: PlacementError[] = [];
    const warnings: PlacementWarning[] = [];
    const restrictions: string[] = [];
    const suggestions: string[] = [];
 
    const normalizeLoc = (loc: string): string => {
      const key = loc.replace(/\s+/g, '').toLowerCase()
      switch (key) {
        case 'head': return 'head'
        case 'centertorso': return 'centerTorso'
        case 'lefttorso': return 'leftTorso'
        case 'righttorso': return 'rightTorso'
        case 'leftarm': return 'leftArm'
        case 'rightarm': return 'rightArm'
        case 'leftleg': return 'leftLeg'
        case 'rightleg': return 'rightLeg'
        default: return loc
      }
    }

    const constraints = this.getEquipmentConstraints(equipment);
    const locKey = normalizeLoc(location)
 
    
    // Check location restrictions
    if (constraints.forbiddenLocations.includes(locKey)) {
      errors.push({
        type: 'location_invalid',
        message: `${equipment.equipmentData?.name} cannot be mounted in ${location}`,
        severity: 'critical',
        suggestedFix: `Try mounting in: ${constraints.allowedLocations.join(', ')}`
      });
    }
    // Enforce allowed locations
    if (!constraints.allowedLocations.includes(locKey)) {
      errors.push({
        type: 'location_invalid',
        message: `${equipment.equipmentData?.name} cannot be mounted in ${location}`,
        severity: 'critical',
        suggestedFix: `Allowed locations: ${constraints.allowedLocations.join(', ')}`
      })
    }
    
    // Special rule: Supercharger must be placed in a torso location that contains engine slots
    const eqName = (equipment.equipmentData?.name || equipment.name || '').toString().toLowerCase();
    const eqBaseType = (equipment.equipmentData?.baseType || equipment.baseType || '').toString().toLowerCase();
    const isSupercharger = eqName === 'supercharger' || eqBaseType === 'supercharger';
    if (isSupercharger) {
      const locNorm = location.replace(/\s+/g, '').toLowerCase();
      const inCenter = locNorm === 'centertorso';
      const inLeft = locNorm === 'lefttorso';
      const inRight = locNorm === 'righttorso';
      const engineType = (config as any)?.engineType || 'Standard';
      const gyroValue = (config as any)?.gyroType || 'Standard';
      const gyroType: ComponentConfiguration = typeof gyroValue === 'string'
        ? { type: gyroValue, techBase: (config as any)?.techBase || 'Inner Sphere' }
        : gyroValue as ComponentConfiguration;
      const engineSlots = SystemComponentRules.getEngineAllocation(engineType as any, gyroType);
      const hasEngineSlots = (
        (inCenter && engineSlots.centerTorso.length > 0) ||
        (inLeft && engineSlots.leftTorso.length > 0) ||
        (inRight && engineSlots.rightTorso.length > 0)
      );
      if (!hasEngineSlots) {
        errors.push({
          type: 'rule_violation',
          message: 'Supercharger must be placed in a torso location that contains engine slots',
          severity: 'critical',
          suggestedFix: 'Move Supercharger to Center, Left, or Right Torso containing engine slots for the current engine/gyro'
        });
      }
    }
 
     // Check weight restrictions
    if (locKey === 'head' && (equipment.equipmentData?.tonnage || 0) > 1) {
      errors.push({
        type: 'weight_exceeded',
        message: 'Head location limited to 1 ton equipment',
        severity: 'critical',
        suggestedFix: 'Move to torso or arm location'
      });
    }
    
    // Check tech level
    const techValidation = this.validateTechLevel([equipment], config);
    if (!techValidation.isValid) {
      errors.push({
        type: 'tech_level',
        message: techValidation.issues[0]?.equipment || 'Tech level mismatch',
        severity: 'major',
        suggestedFix: 'Adjust unit tech level or use alternative equipment'
      });
    }
    
    // Generate warnings for suboptimal placement
    if (equipment.equipmentData?.type === 'ammunition' && locKey === 'head') {
      warnings.push({
        type: 'vulnerability',
        message: 'Ammunition in head location is highly vulnerable',
        recommendation: 'Consider torso or leg placement with CASE protection',
        impact: 'high'
      });
    }

    // Artemis dependency: warn if no compatible missile weapons present
    const baseType = (equipment.equipmentData?.baseType || equipment.baseType || '').toString().toLowerCase();
    if (baseType.includes('artemis')) {
      const hasMissile = ((config as any)?.weapons || []).some((w: any) => {
        const n = (w?.name || '').toString().toLowerCase();
        return n.includes('lrm') || n.includes('srm') || n.includes('mrm') || n.includes('streak');
      });
      if (!hasMissile) {
        warnings.push({
          type: 'dependency',
          message: 'Artemis installed without compatible missile weapons',
          recommendation: 'Add LRM/SRM/MRM/Streak missiles to benefit from Artemis',
          impact: 'low'
        } as any);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      restrictions,
      suggestions
    };
  }
  
  suggestAlternativePlacements(equipment: any, config: UnitConfiguration): AlternativePlacement[] {
    const constraints = this.getEquipmentConstraints(equipment);
    const alternatives: AlternativePlacement[] = [];
    
    for (const location of constraints.allowedLocations) {
      const validation = this.validatePlacement(equipment, location, config);
      
      if (validation.isValid) {
        const score = this.calculatePlacementScore(equipment, location, config, []);
        const pros = this.getLocationPros(equipment, location);
        const cons = this.getLocationCons(equipment, location);
        const slots = this.findAvailableSlots(location, equipment, [], config);
        
        alternatives.push({
          location,
          slots: slots.slice(0, equipment.equipmentData?.criticals || 1),
          pros,
          cons,
          score
        });
      }
    }
    
    return alternatives.sort((a, b) => b.score - a.score);
  }
  
  // ===== AUTO-ALLOCATION ALGORITHMS =====
  
  autoAllocateWeapons(weapons: any[], config: UnitConfiguration): WeaponAllocationResult {
    return this.autoAllocationManager.autoAllocateWeapons(weapons, config);
  }
  
  autoAllocateAmmunition(ammunition: any[], config: UnitConfiguration): AmmoAllocationResult {
    return this.autoAllocationManager.autoAllocateAmmunition(ammunition, config);
  }
  
  autoAllocateHeatSinks(heatSinks: any[], config: UnitConfiguration): HeatSinkAllocationResult {
    return this.autoAllocationManager.autoAllocateHeatSinks(heatSinks, config);
  }
  
  autoAllocateJumpJets(jumpJets: any[], config: UnitConfiguration): JumpJetAllocationResult {
    return this.autoAllocationManager.autoAllocateJumpJets(jumpJets, config);
  }
  
  // ===== VALIDATION AND COMPLIANCE =====
  
  validateEquipmentPlacement(config: UnitConfiguration, allocations: EquipmentPlacement[]): ValidationResult {
    return this.validationManager.validateEquipmentPlacement(config, allocations);
  }
  
  checkBattleTechRules(config: UnitConfiguration, allocations: EquipmentPlacement[]): RuleComplianceResult {
    return this.validationManager.checkBattleTechRules(config, allocations);
  }
  
  validateTechLevel(equipment: any[], config: UnitConfiguration): TechLevelValidation {
    return this.validationManager.validateTechLevel(equipment, config);
  }
  
  validateMountingRestrictions(equipment: any, location: string, config: UnitConfiguration): MountingValidation {
    return this.validationManager.validateMountingRestrictions(equipment, location, config);
  }
  
  optimizeEquipmentLayout(config: UnitConfiguration, allocations: EquipmentPlacement[]): OptimizationResult {
    return this.analysisManager.optimizeEquipmentLayout(config, allocations);
  }
  
  analyzeLoadoutEfficiency(config: UnitConfiguration, allocations: EquipmentPlacement[]): EfficiencyAnalysis {
    return this.analysisManager.analyzeLoadoutEfficiency(config, allocations);
  }
  
  generateLoadoutReport(config: UnitConfiguration, allocations: EquipmentPlacement[]): LoadoutReport {
    return this.analysisManager.generateLoadoutReport(config, allocations);
  }
  
  // Equipment management
  addEquipment(equipment: any, config: UnitConfiguration, preferences: PlacementPreferences): AddEquipmentResult {
    const alternatives = this.suggestAlternativePlacements(equipment, config);
    const impact = this.calculateEquipmentImpact(equipment);
    
    if (alternatives.length > 0) {
      const bestPlacement = alternatives[0];
      const placement: EquipmentPlacement = {
        equipmentId: `${equipment.equipmentData?.name}_${Date.now()}`,
        equipment,
        location: bestPlacement.location,
        slots: bestPlacement.slots,
        isFixed: false,
        isValid: true,
        constraints: this.getEquipmentConstraints(equipment),
        conflicts: []
      };
      
      return {
        success: true,
        placement,
        alternatives,
        warnings: [],
        impact
      };
    }
    
    return {
      success: false,
      alternatives,
      warnings: ['No suitable location found'],
      impact
    };
  }
  
  removeEquipment(equipmentId: string, config: UnitConfiguration): RemoveEquipmentResult {
    // Simplified implementation
    const freedSlots = { location: 'centerTorso', slots: [1, 2, 3] };
    const impact = { weight: -5, heat: -10, firepower: -15, balance: 0, efficiency: 5 };
    
    return {
      success: true,
      freedSlots,
      impact,
      suggestions: ['Consider replacing with alternative equipment']
    };
  }
  
  moveEquipment(equipmentId: string, fromLocation: string, toLocation: string, config: UnitConfiguration): MoveEquipmentResult {
    // Simplified implementation
    const impact = { weight: 0, heat: 0, firepower: 0, balance: 5, efficiency: 3 };
    
    return {
      success: true,
      warnings: [],
      impact
    };
  }
  
  // Utility methods
  getEquipmentConstraints(equipment: any): EquipmentConstraints {
    const type = equipment.equipmentData?.type || 'equipment';
    let allowedLocations = ['head', 'centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    const forbiddenLocations: string[] = [];
    
    // Apply type-specific restrictions
    if (type === 'ammunition' && equipment.equipmentData?.explosive) {
      forbiddenLocations.push('head'); // No explosive ammo in head
    }
    
    if (equipment.equipmentData?.tonnage > 1) {
      forbiddenLocations.push('head'); // No heavy equipment in head
    }

    // Targeting Computer: torso-only restriction
    const baseType = (equipment.equipmentData?.baseType || equipment.baseType || '').toString().toLowerCase();
    if (baseType === 'targeting computer') {
      allowedLocations = ['centerTorso', 'leftTorso', 'rightTorso'];
    }

    // Common EW systems typically mount in torsos: ECM, Active Probe, TAG, C3
    if (
      baseType === 'guardian ecm' ||
      baseType === 'angel ecm' ||
      baseType === 'clan ecm suite' ||
      baseType === 'beagle active probe' ||
      baseType === 'clan active probe' ||
      baseType === 'bloodhound active probe' ||
      baseType === 'target acquisition gear' ||
      baseType === 'light target acquisition gear' ||
      baseType === 'c3 master computer' ||
      baseType === 'c3 slave unit'
    ) {
      allowedLocations = ['centerTorso', 'leftTorso', 'rightTorso'];
    }

    // Prototype Artemis IV: torso-only and requires compatible missile weapons (LRM/SRM/MRM/Streak)
    if (baseType === 'prototype artemis iv' || baseType === 'artemis iv') {
      allowedLocations = ['centerTorso', 'leftTorso', 'rightTorso'];
    }

    // Partial Wing: LT/RT only
    if (baseType === 'partial wing') {
      allowedLocations = ['leftTorso', 'rightTorso']
      forbiddenLocations.push('centerTorso')
      forbiddenLocations.push('head')
      forbiddenLocations.push('leftArm')
      forbiddenLocations.push('rightArm')
      forbiddenLocations.push('leftLeg')
      forbiddenLocations.push('rightLeg')
    }
    
    return {
      allowedLocations: allowedLocations.filter(loc => !forbiddenLocations.includes(loc)),
      forbiddenLocations,
      requiresCASE: type === 'ammunition' && equipment.equipmentData?.explosive,
      requiresArtemis: false,
      minTonnageLocation: 0,
      maxTonnageLocation: 100,
      heatGeneration: equipment.equipmentData?.heat || 0,
      specialRules: []
    };
  }
  
  calculateHeatGeneration(allocations: EquipmentPlacement[]): HeatAnalysis {
    return this.analysisManager.calculateHeatGeneration(allocations);
  }
  
  calculateFirepower(allocations: EquipmentPlacement[]): FirepowerAnalysis {
    return this.analysisManager.calculateFirepower(allocations);
  }
  
  generateEquipmentSummary(allocations: EquipmentPlacement[]): EquipmentSummary {
    return this.analysisManager.generateEquipmentSummary(allocations);
  }
  
  // ===== PRIVATE HELPER METHODS =====
  
  private sortEquipmentByPriority(equipment: any[]): any[] {
    return equipment.sort((a, b) => {
      const priorityA = this.getEquipmentPriority(a);
      const priorityB = this.getEquipmentPriority(b);
      return priorityB - priorityA;
    });
  }
  
  private getEquipmentPriority(equipment: any): number {
    const type = equipment.equipmentData?.type || 'equipment';
    if (type.includes('weapon')) return 100;
    if (type === 'heat_sink') return 90;
    if (type === 'jump_jet') return 80;
    if (type === 'ammunition') return 70;
    return 60;
  }
  
  private calculateAllocationEfficiency(allocations: EquipmentPlacement[], config: UnitConfiguration): number {
    // Simplified efficiency calculation
    let score = 80; // Base score
    
    // Bonus for successful allocations
    score += allocations.length * 2;
    
    // Penalty for conflicts
    const conflicts = allocations.reduce((total, alloc) => total + alloc.conflicts.length, 0);
    score -= conflicts * 10;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private balancedAllocationStrategy(config: UnitConfiguration, equipment: any[]): AllocationResult {
    return this.allocateEquipment(config, equipment);
  }
  
  private frontLoadedStrategy(config: UnitConfiguration, equipment: any[]): AllocationResult {
    return this.allocateEquipment(config, equipment);
  }
  
  private distributedStrategy(config: UnitConfiguration, equipment: any[]): AllocationResult {
    return this.allocateEquipment(config, equipment);
  }
  
  private concentratedStrategy(config: UnitConfiguration, equipment: any[]): AllocationResult {
    return this.allocateEquipment(config, equipment);
  }
  
  private calculateStrategyScore(result: AllocationResult, config: UnitConfiguration): number {
    let score = result.efficiency;
    score += result.success ? 20 : 0;
    score -= result.warnings.length * 5;
    return Math.max(0, score);
  }
  
  private calculateAllocationMetrics(result: AllocationResult, config: UnitConfiguration) {
    return {
      successRate: result.success ? 100 : (result.allocations.length / (result.allocations.length + result.unallocated.length)) * 100,
      efficiencyScore: result.efficiency,
      balanceScore: 85, // Simplified
      utilization: 75 // Simplified
    };
  }
  
  private generateImprovementSuggestions(result: AllocationResult, config: UnitConfiguration): string[] {
    const suggestions: string[] = [];
    
    if (result.unallocated.length > 0) {
      suggestions.push(`${result.unallocated.length} items could not be allocated`);
    }
    
    if (result.efficiency < 70) {
      suggestions.push('Consider optimizing equipment layout');
    }
    
    return suggestions;
  }
  
  private applyConstraints(allocations: EquipmentPlacement[], constraints: AllocationConstraints): EquipmentPlacement[] {
    return allocations; // Simplified implementation
  }
  
  private optimizeWithConstraints(allocations: EquipmentPlacement[], config: UnitConfiguration, constraints: AllocationConstraints): EquipmentPlacement[] {
    return allocations; // Simplified implementation
  }
  
  private calculateImprovement(current: AllocationResult, optimized: EquipmentPlacement[]): number {
    return 10; // Simplified improvement score
  }
  
  private findAvailableSlots(location: string, equipment: any, existingAllocations: EquipmentPlacement[], config: UnitConfiguration): number[] {
    // Simplified slot finding
    const slotsNeeded = equipment.equipmentData?.criticals || 1;
    return Array.from({ length: slotsNeeded }, (_, i) => i);
  }
  
  private calculatePlacementScore(equipment: any, location: string, config: UnitConfiguration, existingAllocations: EquipmentPlacement[]): number {
    const preferences = this.EQUIPMENT_PREFERENCES[equipment.equipmentData?.type as keyof typeof this.EQUIPMENT_PREFERENCES] || [];
    const preferenceBonus = preferences.includes(location) ? 20 : 0;
    return 60 + preferenceBonus; // Base score plus preference bonus
  }
  
  private generatePlacementReasoning(equipment: any, location: string, score: number): string[] {
    return [`Score: ${score}`, `Location: ${location}`, 'Optimal placement for equipment type'];
  }
  
  private identifyTradeoffs(equipment: any, location: string, config: UnitConfiguration): string[] {
    const tradeoffs: string[] = [];
    
    if (location === 'head') {
      tradeoffs.push('Higher vulnerability to head hits');
    }
    
    if (location.includes('Arm')) {
      tradeoffs.push('May be lost if arm is destroyed');
    }
    
    return tradeoffs;
  }
  
  private generateAlternatives(equipment: any, location: string, config: UnitConfiguration): AlternativePlacement[] {
    return []; // Simplified - would return actual alternatives
  }
  
  private getLocationPros(equipment: any, location: string): string[] {
    const pros: string[] = [];
    
    if (location === 'centerTorso') {
      pros.push('Well protected location');
    }
    
    if (location.includes('Leg')) {
      pros.push('Good for heat sinks');
    }
    
    return pros;
  }
  
  private getLocationCons(equipment: any, location: string): string[] {
    const cons: string[] = [];
    
    if (location === 'head') {
      cons.push('Vulnerable to critical hits');
    }
    
    if (location.includes('Arm')) {
      cons.push('Can be lost if arm destroyed');
    }
    
    return cons;
  }
  
  // Additional helper methods for weapon allocation
  private findBestWeaponPlacement(weapon: any, config: UnitConfiguration, allocated: EquipmentPlacement[]): EquipmentPlacement | null {
    const placements = this.findOptimalPlacement(weapon, config, allocated);
    
    if (placements.length > 0) {
      const best = placements[0];
      return {
        equipmentId: `${weapon.equipmentData?.name}_${Date.now()}`,
        equipment: weapon,
        location: best.location,
        slots: best.slots,
        isFixed: false,
        isValid: true,
        constraints: this.getEquipmentConstraints(weapon),
        conflicts: []
      };
    }
    
    return null;
  }
  
  private determineWeaponStrategy(allocated: EquipmentPlacement[]): 'balanced' | 'front_loaded' | 'distributed' | 'concentrated' {
    return 'balanced'; // Simplified determination
  }
  
  private calculateWeaponHeatEfficiency(allocated: EquipmentPlacement[]): number {
    const heatAnalysis = this.calculateHeatGeneration(allocated);
    return Math.max(0, 100 - heatAnalysis.totalGeneration * 2);
  }
  
  private calculateWeaponFirepower(allocated: EquipmentPlacement[]) {
    const analysis = this.calculateFirepower(allocated);
    return analysis.totalDamage;
  }
  
  private generateWeaponRecommendations(allocated: EquipmentPlacement[], unallocated: any[]): string[] {
    const recommendations: string[] = [];
    
    if (unallocated.length > 0) {
      recommendations.push(`${unallocated.length} weapons could not be allocated`);
    }
    
    return recommendations;
  }
  
  // Additional helper methods for other allocation types
  private getCASEProtectedLocations(config: UnitConfiguration): string[] {
    return []; // Simplified - would check for CASE equipment
  }
  

  

  
  private calculateEquipmentImpact(equipment: any): EquipmentImpact {
    const equipmentData = equipment.equipmentData || {};
    
    return {
      weight: equipmentData.tonnage || 0,
      heat: equipmentData.heat || 0,
      firepower: equipmentData.damage || 0,
      balance: 0, // Simplified
      efficiency: 5 // Simplified
    };
  }
}

// Export factory function for dependency injection
export const createEquipmentAllocationService = (): EquipmentAllocationService => {
  return new EquipmentAllocationServiceImpl();
};
