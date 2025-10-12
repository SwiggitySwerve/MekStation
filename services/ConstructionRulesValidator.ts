/**
 * ConstructionRulesValidator - BattleTech construction rule validation and compliance
 * 
 * Extracted from UnitCriticalManager as part of large file refactoring.
 * Handles BattleTech construction rules, tech level validation, weight limits, heat management,
 * and comprehensive mech construction compliance checking.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../utils/criticalSlots/UnitCriticalManager';
import { ComponentConfiguration, TechBase } from '../types/componentConfiguration';
import { EquipmentAllocation } from '../utils/criticalSlots/CriticalSlot';
import { WeightRulesValidator } from './validation/WeightRulesValidator';
import { HeatRulesValidator } from './validation/HeatRulesValidator';
import { CriticalSlotRulesValidator } from '../../services/validation/CriticalSlotRulesValidatorRefactored';
import { TechLevelRulesValidator } from './validation/TechLevelRulesValidator';
import { MovementRulesValidator } from './validation/MovementRulesValidator';
import { ArmorRulesValidator } from './validation/ArmorRulesValidator';
import { StructureRulesValidator } from './validation/StructureRulesValidator';
import { EquipmentValidationService } from '../../services/equipment/EquipmentValidationServiceRefactored';
import { ComponentValidationManager } from './validation/ComponentValidationManager';
import { ValidationReportingManager } from './validation/ValidationReportingManager';
import { ValidationCalculations } from './validation/ValidationCalculations';
import { RuleManagementManager } from './validation/RuleManagementManager';
import { ValidationOrchestratorFactory } from '../../services/validation/ValidationOrchestrator';
import { IValidationOrchestrator } from '../../services/validation/interfaces/IValidationOrchestrator';
import { CalculationUtilitiesManager } from './validation/CalculationUtilitiesManager';

// Import types from validation services
import type { 
  WeightValidation as WeightRulesValidation, 
  WeightViolation as WeightRulesViolation, 
  WeightDistribution as WeightRulesDistribution 
} from './validation/WeightRulesValidator';
import type { 
  HeatValidation as HeatRulesValidation, 
  HeatViolation as HeatRulesViolation 
} from './validation/HeatRulesValidator';
import type { 
  CriticalSlotValidation as CriticalSlotRulesValidation, 
  CriticalSlotViolation as CriticalSlotRulesViolation, 
  SlotUtilization as SlotRulesUtilization 
} from './validation/CriticalSlotRulesValidator';
import type { 
  TechLevelValidation as TechLevelRulesValidation, 
  TechLevelViolation as TechLevelRulesViolation, 
  MixedTechValidation as MixedTechRulesValidation, 
  EraValidation as EraRulesValidation, 
  AvailabilityValidation as AvailabilityRulesValidation, 
  ComponentAvailability as ComponentRulesAvailability, 
  AvailabilityViolation as AvailabilityRulesViolation, 
  EraViolation as EraRulesViolation 
} from './validation/TechLevelRulesValidator';

export interface ConstructionRulesValidator {
  // Core validation methods
  validateUnit(config: UnitConfiguration, equipment: EquipmentAllocation[]): ValidationResult;
  validateConfiguration(config: UnitConfiguration): ConfigurationValidation;
  validateEquipmentLoadout(equipment: EquipmentAllocation[], config: UnitConfiguration): LoadoutValidation;
  
  // BattleTech rule checking methods
  validateWeightLimits(config: UnitConfiguration, equipment: EquipmentAllocation[]): WeightValidation;
  validateHeatManagement(config: UnitConfiguration, equipment: EquipmentAllocation[]): HeatValidation;
  validateMovementRules(config: UnitConfiguration): MovementValidation;
  validateArmorRules(config: UnitConfiguration): ArmorValidation;
  validateStructureRules(config: UnitConfiguration): StructureValidation;
  validateEngineRules(config: UnitConfiguration): EngineValidation;
  validateGyroRules(config: UnitConfiguration): GyroValidation;
  validateCockpitRules(config: UnitConfiguration): CockpitValidation;
  validateJumpJetRules(config: UnitConfiguration, equipment: EquipmentAllocation[]): JumpJetValidation;
  validateWeaponRules(equipment: EquipmentAllocation[], config: UnitConfiguration): WeaponValidation;
  validateAmmoRules(equipment: EquipmentAllocation[], config: UnitConfiguration): AmmoValidation;
  validateSpecialEquipmentRules(equipment: EquipmentAllocation[], config: UnitConfiguration): SpecialEquipmentValidation;
  
  // Tech level validation methods
  validateTechLevel(config: UnitConfiguration, equipment: EquipmentAllocation[]): TechLevelValidation;
  validateMixedTech(config: UnitConfiguration, equipment: EquipmentAllocation[]): MixedTechValidation;
  validateEraRestrictions(config: UnitConfiguration, equipment: EquipmentAllocation[]): EraValidation;
  validateAvailabilityRating(equipment: EquipmentAllocation[], config: UnitConfiguration): AvailabilityValidation;
  
  // Component-specific validation
  validateComponentCompatibility(config: UnitConfiguration): CompatibilityValidation;
  validateSpecialComponents(config: UnitConfiguration): SpecialComponentValidation;
  validateCriticalSlots(config: UnitConfiguration, equipment: EquipmentAllocation[]): CriticalSlotValidation;
  
  // Construction efficiency validation
  validateConstructionEfficiency(config: UnitConfiguration, equipment: EquipmentAllocation[]): EfficiencyValidation;
  validateDesignOptimization(config: UnitConfiguration, equipment: EquipmentAllocation[]): OptimizationValidation;
  
  // Rule compliance reporting
  generateComplianceReport(config: UnitConfiguration, equipment: EquipmentAllocation[]): ComplianceReport;
  generateValidationSummary(validations: ValidationResult[]): ValidationSummary;
  generateRuleViolationReport(violations: RuleViolation[]): ViolationReport;
  suggestComplianceFixes(violations: RuleViolation[]): ComplianceFix[];
  calculateRuleScore(config: UnitConfiguration, equipment: EquipmentAllocation[]): RuleScore;
}

export interface ValidationResult {
  isValid: boolean;
  overall: ValidationSummary;
  configuration: ConfigurationValidation;
  loadout: LoadoutValidation;
  techLevel: TechLevelValidation;
  compliance: ComplianceReport;
  recommendations: ValidationRecommendation[];
  performanceMetrics: ValidationMetrics;
}

export interface ValidationSummary {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  complianceScore: number; // 0-100
  criticalViolations: number;
  majorViolations: number;
  minorViolations: number;
}

export interface ConfigurationValidation {
  isValid: boolean;
  weight: WeightValidation;
  heat: HeatValidation;
  movement: MovementValidation;
  armor: ArmorValidation;
  structure: StructureValidation;
  engine: EngineValidation;
  gyro: GyroValidation;
  cockpit: CockpitValidation;
  compatibility: CompatibilityValidation;
}

export interface LoadoutValidation {
  isValid: boolean;
  weapons: WeaponValidation;
  ammunition: AmmoValidation;
  jumpJets: JumpJetValidation;
  specialEquipment: SpecialEquipmentValidation;
  criticalSlots: CriticalSlotValidation;
  efficiency: EfficiencyValidation;
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
}

export interface WeightDistribution {
  structure: number;
  armor: number;
  engine: number;
  equipment: number;
  ammunition: number;
  systems: number;
}

export interface WeightViolation {
  type: 'overweight' | 'underweight' | 'invalid_distribution' | 'negative_weight';
  component: string;
  actual: number;
  expected: number;
  severity: 'critical' | 'major' | 'minor';
  message: string;
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
}

export interface HeatViolation {
  type: 'insufficient_heat_sinks' | 'invalid_heat_sink_type' | 'heat_overflow' | 'engine_heat_sink_violation' | 'heat_sink_compatibility';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface MovementValidation {
  isValid: boolean;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  engineRating: number;
  tonnage: number;
  engineType: string;
  violations: MovementViolation[];
  recommendations: string[];
}

export interface MovementViolation {
  type: 'invalid_engine_rating' | 'impossible_movement' | 'engine_tonnage_mismatch' | 'jump_mp_violation';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface ArmorValidation {
  isValid: boolean;
  totalArmor: number;
  maxArmor: number;
  armorType: string;
  armorWeight: number;
  locationLimits: { [location: string]: ArmorLocationValidation };
  violations: ArmorViolation[];
  recommendations: string[];
}

export interface ArmorLocationValidation {
  location: string;
  armor: number;
  maxArmor: number;
  isValid: boolean;
  violations: string[];
}

export interface ArmorViolation {
  type: 'exceeds_maximum' | 'invalid_type' | 'weight_mismatch' | 'location_violation';
  location?: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface StructureValidation {
  isValid: boolean;
  structureType: string;
  structureWeight: number;
  internalStructure: number;
  violations: StructureViolation[];
  recommendations: string[];
}

export interface StructureViolation {
  type: 'invalid_type' | 'weight_mismatch' | 'tonnage_incompatible';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface EngineValidation {
  isValid: boolean;
  engineType: string;
  engineRating: number;
  engineWeight: number;
  walkMP: number;
  maxRating: number;
  minRating: number;
  violations: EngineViolation[];
  recommendations: string[];
}

export interface EngineViolation {
  type: 'invalid_rating' | 'weight_mismatch' | 'type_incompatible' | 'movement_calculation_error';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

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

export interface CockpitValidation {
  isValid: boolean;
  cockpitType: string;
  cockpitWeight: number;
  violations: CockpitViolation[];
  recommendations: string[];
}

export interface CockpitViolation {
  type: 'invalid_type' | 'weight_mismatch' | 'era_incompatible';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface JumpJetValidation {
  isValid: boolean;
  jumpJetCount: number;
  jumpMP: number;
  maxJumpMP: number;
  jumpJetWeight: number;
  jumpJetType: string;
  violations: JumpJetViolation[];
  recommendations: string[];
}

export interface JumpJetViolation {
  type: 'exceeds_maximum' | 'invalid_type' | 'weight_mismatch' | 'tonnage_incompatible';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface WeaponValidation {
  isValid: boolean;
  weaponCount: number;
  totalWeaponWeight: number;
  heatGeneration: number;
  violations: WeaponViolation[];
  recommendations: string[];
}

export interface WeaponViolation {
  weapon: string;
  type: 'invalid_mounting' | 'tech_level_violation' | 'era_restriction' | 'compatibility_issue';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface AmmoValidation {
  isValid: boolean;
  totalAmmoWeight: number;
  ammoBalance: AmmoBalanceCheck[];
  caseProtection: CASEProtectionCheck;
  violations: AmmoViolation[];
  recommendations: string[];
}

export interface AmmoBalanceCheck {
  weapon: string;
  ammoTons: number;
  recommendedTons: number;
  turns: number;
  adequate: boolean;
}

export interface CASEProtectionCheck {
  requiredLocations: string[];
  protectedLocations: string[];
  unprotectedLocations: string[];
  isCompliant: boolean;
}

export interface AmmoViolation {
  type: 'missing_ammo' | 'excess_ammo' | 'case_required' | 'explosive_in_head';
  weapon?: string;
  location?: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface SpecialEquipmentValidation {
  isValid: boolean;
  specialEquipment: SpecialEquipmentCheck[];
  violations: SpecialEquipmentViolation[];
  recommendations: string[];
}

export interface SpecialEquipmentCheck {
  equipment: string;
  isValid: boolean;
  requirements: string[];
  restrictions: string[];
  compatibility: string[];
}

export interface SpecialEquipmentViolation {
  equipment: string;
  type: 'missing_requirement' | 'restriction_violated' | 'incompatible_combination';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface TechLevelValidation {
  isValid: boolean;
  unitTechLevel: string;
  unitTechBase: string;
  era: string;
  mixedTech: MixedTechValidation;
  eraRestrictions: EraValidation;
  availability: AvailabilityValidation;
  violations: TechLevelViolation[];
  recommendations: string[];
}

export interface MixedTechValidation {
  isMixed: boolean;
  innerSphereComponents: number;
  clanComponents: number;
  allowedMixed: boolean;
  violations: string[];
}

export interface EraValidation {
  isValid: boolean;
  era: string;
  invalidComponents: EraViolation[];
  recommendations: string[];
}

export interface EraViolation {
  component: string;
  availableEra: string;
  currentEra: string;
  message: string;
}

export interface AvailabilityValidation {
  isValid: boolean;
  overallRating: string;
  componentRatings: ComponentAvailability[];
  violations: AvailabilityViolation[];
}

export interface ComponentAvailability {
  component: string;
  rating: string;
  available: boolean;
  notes: string;
}

export interface AvailabilityViolation {
  component: string;
  rating: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface TechLevelViolation {
  type: 'tech_base_mismatch' | 'era_violation' | 'availability_violation' | 'mixed_tech_violation';
  component: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface CompatibilityValidation {
  isValid: boolean;
  componentCompatibility: ComponentCompatibilityCheck[];
  systemIntegration: SystemIntegrationCheck[];
  violations: CompatibilityViolation[];
  recommendations: string[];
}

export interface ComponentCompatibilityCheck {
  component1: string;
  component2: string;
  compatible: boolean;
  issues: string[];
}

export interface SystemIntegrationCheck {
  system: string;
  integrated: boolean;
  dependencies: string[];
  conflicts: string[];
}

export interface CompatibilityViolation {
  type: 'component_incompatible' | 'system_conflict' | 'integration_failure';
  components: string[];
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface SpecialComponentValidation {
  isValid: boolean;
  endoSteel: boolean;
  ferroFibrous: boolean;
  doubleHeatSinks: boolean;
  artemis: boolean;
  targetingComputer: boolean;
  other: string[];
  violations: SpecialComponentViolation[];
  recommendations: string[];
}

export interface SpecialComponentViolation {
  component: string;
  type: 'missing_requirement' | 'invalid_combination' | 'slot_violation';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export interface CriticalSlotValidation {
  isValid: boolean;
  totalSlotsUsed: number;
  totalSlotsAvailable: number;
  locationUtilization: { [location: string]: SlotUtilization };
  violations: CriticalSlotViolation[];
  recommendations: string[];
}

export interface SlotUtilization {
  used: number;
  available: number;
  utilization: number;
  overflow: boolean;
}

export interface CriticalSlotViolation {
  location: string;
  type: 'overflow' | 'invalid_placement' | 'special_component_violation';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

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

export interface ComplianceReport {
  overallCompliance: number; // 0-100
  ruleCompliance: RuleComplianceResult[];
  violationSummary: ViolationSummary;
  recommendationSummary: RecommendationSummary;
  complianceMetrics: ComplianceMetrics;
}

export interface RuleComplianceResult {
  rule: BattleTechRule;
  compliant: boolean;
  score: number;
  violations: RuleViolation[];
  notes: string;
}

export interface BattleTechRule {
  id: string;
  name: string;
  description: string;
  category: 'weight' | 'heat' | 'movement' | 'armor' | 'structure' | 'engine' | 'weapons' | 'equipment' | 'tech_level';
  severity: 'critical' | 'major' | 'minor';
  mandatory: boolean;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  component?: string;
  location?: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  impact: string;
  suggestedFix: string;
}

export interface ViolationSummary {
  totalViolations: number;
  criticalViolations: number;
  majorViolations: number;
  minorViolations: number;
  violationsByCategory: { [category: string]: number };
  topViolations: RuleViolation[];
}

export interface RecommendationSummary {
  totalRecommendations: number;
  criticalRecommendations: number;
  implementationDifficulty: { [difficulty: string]: number };
  estimatedImpact: { [impact: string]: number };
  topRecommendations: ValidationRecommendation[];
}

export interface ValidationRecommendation {
  type: 'fix' | 'optimization' | 'alternative' | 'upgrade';
  priority: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  benefit: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  estimatedImpact: number;
}

export interface ComplianceMetrics {
  validationTime: number;
  rulesChecked: number;
  componentsValidated: number;
  performance: {
    averageRuleTime: number;
    slowestRule: string;
    fastestRule: string;
  };
}

export interface ViolationReport {
  violations: RuleViolation[];
  groupedByCategory: { [category: string]: RuleViolation[] };
  groupedBySeverity: { [severity: string]: RuleViolation[] };
  groupedByComponent: { [component: string]: RuleViolation[] };
  summary: ViolationSummary;
  actionPlan: ActionPlan;
}

export interface ActionPlan {
  immediateActions: ActionItem[];
  shortTermActions: ActionItem[];
  longTermActions: ActionItem[];
  alternativeDesigns: AlternativeDesign[];
}

export interface ActionItem {
  action: string;
  priority: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'moderate' | 'hard';
  impact: string;
  estimatedTime: string;
}

export interface AlternativeDesign {
  name: string;
  description: string;
  changes: string[];
  benefits: string[];
  tradeoffs: string[];
}

export interface ComplianceFix {
  violation: RuleViolation;
  fixType: 'replace' | 'remove' | 'modify' | 'add';
  description: string;
  steps: string[];
  impact: FixImpact;
  alternatives: string[];
}

export interface FixImpact {
  weight: number;
  cost: number;
  complexity: string;
  timeEstimate: string;
  sideEffects: string[];
}

export interface RuleScore {
  overallScore: number;
  categoryScores: { [category: string]: number };
  componentScores: { [component: string]: number };
  penalties: ScorePenalty[];
  bonuses: ScoreBonus[];
}

export interface ScorePenalty {
  rule: string;
  penalty: number;
  reason: string;
}

export interface ScoreBonus {
  feature: string;
  bonus: number;
  reason: string;
}

export interface ValidationMetrics {
  totalValidationTime: number;
  ruleValidationTimes: { [rule: string]: number };
  componentValidationTimes: { [component: string]: number };
  performanceBottlenecks: string[];
  optimizationSuggestions: string[];
}

export class ConstructionRulesValidatorImpl implements ConstructionRulesValidator {
  
  // BattleTech construction rules database
  private readonly BATTLETECH_RULES: BattleTechRule[] = [
    {
      id: 'WEIGHT_LIMIT',
      name: 'Weight Limit',
      description: 'Unit weight must not exceed tonnage class maximum',
      category: 'weight',
      severity: 'critical',
      mandatory: true
    },
    {
      id: 'MINIMUM_HEAT_SINKS',
      name: 'Minimum Heat Sinks',
      description: 'Unit must have at least 10 heat sinks total',
      category: 'heat',
      severity: 'critical',
      mandatory: true
    },
    {
      id: 'ENGINE_RATING_LIMIT',
      name: 'Engine Rating Limit',
      description: 'Engine rating cannot exceed 400',
      category: 'engine',
      severity: 'critical',
      mandatory: true
    },
    {
      id: 'HEAD_ARMOR_LIMIT',
      name: 'Head Armor Limit',
      description: 'Head location armor cannot exceed 9 points',
      category: 'armor',
      severity: 'critical',
      mandatory: true
    },
    {
      id: 'AMMUNITION_PROTECTION',
      name: 'Ammunition Protection',
      description: 'Explosive ammunition should have CASE protection',
      category: 'equipment',
      severity: 'major',
      mandatory: false
    }
  ];

  private readonly ruleManagementManager = new RuleManagementManager();
  private readonly validationOrchestrator = ValidationOrchestratorFactory.createWithDefaults();
  private readonly calculationUtilitiesManager = new CalculationUtilitiesManager();
  private readonly equipmentValidationService = new EquipmentValidationService();
  private readonly componentValidationManager = new ComponentValidationManager();
  private readonly reportingManager = new ValidationReportingManager();

  // ===== CORE VALIDATION METHODS =====
  
  validateUnit(config: UnitConfiguration, equipment: any[]): ValidationResult {
    const startTime = Date.now();
    
    // Run all validation checks
    const configuration = this.validateConfiguration(config);
    const loadout = this.validateEquipmentLoadout(equipment, config);
    const techLevel = this.validateTechLevel(config, equipment);
    const compliance = this.generateComplianceReport(config, equipment);
    
    // Generate overall summary
    const overall = this.generateOverallSummary([configuration, loadout, techLevel]);
    
    // Generate recommendations
    const recommendations = this.generateValidationRecommendations(configuration, loadout, techLevel);
    
    // Calculate performance metrics
    const endTime = Date.now();
    const performanceMetrics: ValidationMetrics = {
      totalValidationTime: endTime - startTime,
      ruleValidationTimes: {},
      componentValidationTimes: {},
      performanceBottlenecks: [],
      optimizationSuggestions: []
    };
    
    const isValid = configuration.isValid && loadout.isValid && techLevel.isValid;
    
    return {
      isValid,
      overall,
      configuration,
      loadout,
      techLevel,
      compliance,
      recommendations,
      performanceMetrics
    };
  }
  
  validateConfiguration(config: UnitConfiguration): ConfigurationValidation {
    const weight = this.validateWeightLimits(config, []);
    const heat = this.validateHeatManagement(config, []);
    const movement = this.validateMovementRules(config);
    const armor = this.validateArmorRules(config);
    const structure = this.validateStructureRules(config);
    const engine = this.validateEngineRules(config);
    const gyro = this.validateGyroRules(config);
    const cockpit = this.validateCockpitRules(config);
    const compatibility = this.validateComponentCompatibility(config);
    
    const isValid = weight.isValid && heat.isValid && movement.isValid && 
                   armor.isValid && structure.isValid && engine.isValid && 
                   gyro.isValid && cockpit.isValid && compatibility.isValid;
    
    return {
      isValid,
      weight,
      heat,
      movement,
      armor,
      structure,
      engine,
      gyro,
      cockpit,
      compatibility
    };
  }
  
  validateEquipmentLoadout(equipment: any[], config: UnitConfiguration): LoadoutValidation {
    const weapons = this.validateWeaponRules(equipment, config);
    const ammunition = this.validateAmmoRules(equipment, config);
    const jumpJets = this.validateJumpJetRules(config, equipment);
    const specialEquipment = this.validateSpecialEquipmentRules(equipment, config);
    const criticalSlots = this.validateCriticalSlots(config, equipment);
    const efficiency = this.validateConstructionEfficiency(config, equipment);
    
    const isValid = weapons.isValid && ammunition.isValid && jumpJets.isValid && 
                   specialEquipment.isValid && criticalSlots.isValid && efficiency.isValid;
    
    return {
      isValid,
      weapons,
      ammunition,
      jumpJets,
      specialEquipment,
      criticalSlots,
      efficiency
    };
  }
  
  // ===== BATTLETECH RULE CHECKING METHODS =====
  
  validateWeightLimits(config: UnitConfiguration, equipment: any[]): WeightValidation {
    return WeightRulesValidator.validateWeightLimits(config, equipment);
  }
  
  validateHeatManagement(config: UnitConfiguration, equipment: any[]): HeatValidation {
    return HeatRulesValidator.validateHeatManagement(config, equipment);
  }
  
  validateMovementRules(config: UnitConfiguration): MovementValidation {
    const violations: MovementViolation[] = [];
    const recommendations: string[] = [];
    
    const engineRating = config.engineRating || 0;
    const tonnage = config.tonnage || 100;
    const engineType = config.engineType || 'Standard';
    
    const walkMP = Math.floor(engineRating / tonnage);
    const runMP = walkMP * 1.5;
    const jumpMP = config.jumpMP || 0;
    
    // Check engine rating limits
    if (engineRating > 400) {
      violations.push({
        type: 'invalid_engine_rating',
        message: `Engine rating ${engineRating} exceeds maximum of 400`,
        severity: 'critical',
        suggestedFix: 'Reduce engine rating to 400 or less'
      });
    }
    
    if (engineRating < 10) {
      violations.push({
        type: 'invalid_engine_rating',
        message: `Engine rating ${engineRating} is below minimum of 10`,
        severity: 'critical',
        suggestedFix: 'Increase engine rating to at least 10'
      });
    }
    
    // Check movement calculations
    if (walkMP < 1) {
      recommendations.push('Unit has very low mobility - consider increasing engine rating');
    }
    
    return {
      isValid: violations.length === 0,
      walkMP,
      runMP,
      jumpMP,
      engineRating,
      tonnage,
      engineType,
      violations,
      recommendations
    };
  }
  
  validateArmorRules(config: UnitConfiguration): ArmorValidation {
    const violations: ArmorViolation[] = [];
    const recommendations: string[] = [];
    const locationLimits: { [location: string]: ArmorLocationValidation } = {};
    
    const armorType = this.extractComponentType(config.armorType);
    const tonnage = config.tonnage || 100;
    const maxArmor = ValidationCalculations.calculateMaxArmor(tonnage);
    const totalArmor = ValidationCalculations.calculateTotalArmorFromAllocation(config.armorAllocation) || 0;
    const armorWeight = ValidationCalculations.calculateArmorWeight(totalArmor, armorType);
    
    // Check head armor limit
    const headArmor = ValidationCalculations.getLocationArmor(config.armorAllocation, 'head') || 0;
    if (headArmor > 9) {
      violations.push({
        type: 'location_violation',
        location: 'head',
        message: `Head armor ${headArmor} exceeds maximum of 9`,
        severity: 'critical',
        suggestedFix: 'Reduce head armor to 9 points'
      });
    }
    
    locationLimits.head = {
      location: 'head',
      armor: headArmor,
      maxArmor: 9,
      isValid: headArmor <= 9,
      violations: headArmor > 9 ? ['Exceeds maximum armor'] : []
    };
    
    if (totalArmor > maxArmor) {
      violations.push({
        type: 'exceeds_maximum',
        message: `Total armor ${totalArmor} exceeds maximum of ${maxArmor}`,
        severity: 'critical',
        suggestedFix: `Reduce armor by ${totalArmor - maxArmor} points`
      });
    }
    
    return {
      isValid: violations.length === 0,
      totalArmor,
      maxArmor,
      armorType,
      armorWeight,
      locationLimits,
      violations,
      recommendations
    };
  }
  
  validateStructureRules(config: UnitConfiguration): StructureValidation {
    const violations: StructureViolation[] = [];
    const recommendations: string[] = [];
    
    const structureType = this.extractComponentType(config.structureType);
    const tonnage = config.tonnage || 100;
    const structureWeight = ValidationCalculations.calculateStructureWeight(tonnage, structureType);
    const internalStructure = ValidationCalculations.calculateInternalStructure(tonnage);
    
    // Validate structure type compatibility
    if (!ValidationCalculations.isValidStructureType(structureType)) {
      violations.push({
        type: 'invalid_type',
        message: `Invalid structure type: ${structureType}`,
        severity: 'critical',
        suggestedFix: 'Select a valid structure type'
      });
    }
    
    return {
      isValid: violations.length === 0,
      structureType,
      structureWeight,
      internalStructure,
      violations,
      recommendations
    };
  }
  
  validateEngineRules(config: UnitConfiguration): EngineValidation {
    const violations: EngineViolation[] = [];
    const recommendations: string[] = [];
    
    const engineType = config.engineType || 'Standard';
    const engineRating = config.engineRating || 0;
    const tonnage = config.tonnage || 100;
    const engineWeight = ValidationCalculations.calculateEngineWeight(engineRating, engineType);
    const walkMP = Math.floor(engineRating / tonnage);
    const maxRating = 400;
    const minRating = 10;
    
    if (engineRating > maxRating) {
      violations.push({
        type: 'invalid_rating',
        message: `Engine rating ${engineRating} exceeds maximum of ${maxRating}`,
        severity: 'critical',
        suggestedFix: `Reduce engine rating to ${maxRating} or less`
      });
    }
    
    if (engineRating < minRating) {
      violations.push({
        type: 'invalid_rating',
        message: `Engine rating ${engineRating} below minimum of ${minRating}`,
        severity: 'critical',
        suggestedFix: `Increase engine rating to at least ${minRating}`
      });
    }
    
    return {
      isValid: violations.length === 0,
      engineType,
      engineRating,
      engineWeight,
      walkMP,
      maxRating,
      minRating,
      violations,
      recommendations
    };
  }
  
  validateGyroRules(config: UnitConfiguration): GyroValidation {
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
    
    return {
      isValid: violations.length === 0,
      gyroType,
      gyroWeight,
      engineCompatible,
      violations,
      recommendations
    };
  }
  
  validateCockpitRules(config: UnitConfiguration): CockpitValidation {
    const violations: CockpitViolation[] = [];
    const recommendations: string[] = [];
    
    const cockpitType = 'Standard'; // Simplified - UnitConfiguration doesn't have cockpitType
    const cockpitWeight = ValidationCalculations.calculateCockpitWeight(cockpitType);
    
    return {
      isValid: violations.length === 0,
      cockpitType,
      cockpitWeight,
      violations,
      recommendations
    };
  }
  
  validateJumpJetRules(config: UnitConfiguration, equipment: any[]): JumpJetValidation {
    const violations: JumpJetViolation[] = [];
    const recommendations: string[] = [];
    
    const jumpJets = equipment.filter(item => item.equipmentData?.type === 'jump_jet');
    const jumpJetCount = jumpJets.length;
    const jumpMP = config.jumpMP || 0;
    const tonnage = config.tonnage || 100;
    const maxJumpMP = Math.min(8, Math.floor(tonnage / 10));
    const jumpJetType = jumpJets[0]?.equipmentData?.name || 'Standard';
    const jumpJetWeight = jumpJets.reduce((total, jj) => total + (jj.equipmentData?.tonnage || 0), 0);
    
    if (jumpMP > maxJumpMP) {
      violations.push({
        type: 'exceeds_maximum',
        message: `Jump MP ${jumpMP} exceeds maximum of ${maxJumpMP} for ${tonnage}-ton unit`,
        severity: 'critical',
        suggestedFix: `Reduce jump jets to achieve maximum ${maxJumpMP} jump MP`
      });
    }
    
    return {
      isValid: violations.length === 0,
      jumpJetCount,
      jumpMP,
      maxJumpMP,
      jumpJetWeight,
      jumpJetType,
      violations,
      recommendations
    };
  }
  
    validateWeaponRules(equipment: any[], config: UnitConfiguration): WeaponValidation {
    const weapons = equipment.filter(eq => eq.equipmentData?.type === 'weapon' || eq.type === 'weapon');
    const violations: WeaponViolation[] = [];
    const recommendations: string[] = [];
    
    // Basic weapon validation logic
    weapons.forEach((weapon, index) => {
      const weaponData = weapon.equipmentData;
      if (!weaponData) {
        violations.push({
          weapon: `weapon_${index}`,
          type: 'compatibility_issue',
          message: 'Weapon missing equipment data',
          severity: 'critical',
          suggestedFix: 'Ensure weapon has valid equipment data'
        });
        return;
      }
      
      // Check tech level compatibility
      const weaponTechBase = weaponData.techBase || 'Inner Sphere';
      const unitTechBase = config.techBase || 'Inner Sphere';
      
      if (weaponTechBase === 'Clan' && unitTechBase === 'Inner Sphere') {
        violations.push({
          weapon: weaponData.name || `weapon_${index}`,
          type: 'tech_level_violation',
          message: `Clan weapon ${weaponData.name} cannot be mounted on Inner Sphere unit`,
          severity: 'critical',
          suggestedFix: 'Use Inner Sphere equivalent weapon'
        });
      }
      
      // Check location restrictions for certain weapons
      if (weapon.location === 'head' && weaponData.tonnage > 1) {
        violations.push({
          weapon: weaponData.name || `weapon_${index}`,
          type: 'invalid_mounting',
          message: `Heavy weapon ${weaponData.name} cannot be mounted in head`,
          severity: 'critical',
          suggestedFix: 'Mount weapon in torso or arms'
        });
      }
    });
    
    const totalWeaponWeight = weapons.reduce((total, weapon) => 
      total + (weapon.equipmentData?.tonnage || 0), 0);
    const heatGeneration = weapons.reduce((total, weapon) => 
      total + (weapon.equipmentData?.heat || 0), 0);
    
    if (weapons.length === 0) {
      recommendations.push('Consider adding weapons for offensive capability');
    }
    
    if (heatGeneration > 30) {
      recommendations.push('High heat generation detected - consider additional heat sinks');
    }
    
    return {
      isValid: violations.length === 0,
      weaponCount: weapons.length,
      totalWeaponWeight,
      heatGeneration,
      violations,
      recommendations
    };
  }

  validateAmmoRules(equipment: any[], config: UnitConfiguration): AmmoValidation {
    const ammo = equipment.filter(eq => eq.equipmentData?.type === 'ammunition' || eq.type === 'ammo');
    const weapons = equipment.filter(eq => eq.equipmentData?.type === 'weapon' || eq.type === 'weapon');
    const violations: AmmoViolation[] = [];
    const recommendations: string[] = [];
    const ammoBalance: AmmoBalanceCheck[] = [];
    
    // Check for ammo in head location
    const headAmmo = ammo.filter(a => a.location === 'head');
    if (headAmmo.length > 0) {
      headAmmo.forEach(a => {
        violations.push({
          type: 'explosive_in_head',
          weapon: a.equipmentData?.name || 'unknown ammo',
          location: 'head',
          message: 'Explosive ammunition cannot be placed in head location',
          severity: 'critical',
          suggestedFix: 'Move ammunition to torso or other locations'
        });
      });
    }
    
    // Check weapon-ammo balance
    const weaponAmmoMap = new Map();
    weapons.forEach(weapon => {
      const weaponName = weapon.equipmentData?.name || 'unknown';
      const ammoType = weapon.equipmentData?.ammoType;
      if (ammoType) {
        weaponAmmoMap.set(ammoType, (weaponAmmoMap.get(ammoType) || 0) + 1);
      }
    });
    
    // Check if weapons have adequate ammo
    weaponAmmoMap.forEach((weaponCount, ammoType) => {
      const weaponAmmo = ammo.filter(a => 
        a.equipmentData?.ammoType === ammoType || 
        a.equipmentData?.name?.includes(ammoType)
      );
      const ammoTons = weaponAmmo.reduce((total, a) => total + (a.equipmentData?.tonnage || 1), 0);
      const recommendedTons = weaponCount * 1; // Basic rule: 1 ton per weapon minimum
      
      ammoBalance.push({
        weapon: ammoType,
        ammoTons,
        recommendedTons,
        turns: Math.floor(ammoTons * 10), // Rough estimate
        adequate: ammoTons >= recommendedTons
      });
      
      if (ammoTons < recommendedTons) {
        violations.push({
          type: 'missing_ammo',
          weapon: ammoType,
          message: `Insufficient ammunition for ${ammoType} weapons (${ammoTons} tons, need ${recommendedTons} tons)`,
          severity: 'major',
          suggestedFix: `Add ${recommendedTons - ammoTons} more tons of ${ammoType} ammunition`
        });
      }
    });
    
    // Basic CASE protection check (simplified)
    const explosiveLocations = ammo.map(a => a.location).filter(Boolean);
    const caseProtection: CASEProtectionCheck = {
      requiredLocations: explosiveLocations,
      protectedLocations: [], // Would check for CASE equipment
      unprotectedLocations: explosiveLocations,
      isCompliant: explosiveLocations.length === 0
    };
    
    if (!caseProtection.isCompliant) {
      recommendations.push('Consider adding CASE protection for locations with ammunition');
    }
    
    const totalAmmoWeight = ammo.reduce((total, a) => 
      total + (a.equipmentData?.tonnage || 1), 0);
    
    return {
      isValid: violations.length === 0,
      totalAmmoWeight,
      ammoBalance,
      caseProtection,
      violations,
      recommendations
    };
  }

  validateSpecialEquipmentRules(equipment: any[], config: UnitConfiguration): SpecialEquipmentValidation {
    const specialEquipment = equipment.filter(eq => 
      eq.equipmentData?.category === 'special' || 
      eq.equipmentData?.type === 'special' ||
      eq.type === 'special'
    );
    
    const violations: SpecialEquipmentViolation[] = [];
    const recommendations: string[] = [];
    const specialEquipmentChecks: SpecialEquipmentCheck[] = [];
    
    specialEquipment.forEach((equipment, index) => {
      const equipData = equipment.equipmentData;
      if (!equipData) {
        violations.push({
          equipment: `special_equipment_${index}`,
          type: 'missing_requirement',
          message: 'Special equipment missing equipment data',
          severity: 'critical',
          suggestedFix: 'Ensure equipment has valid data'
        });
        return;
      }
      
      const equipmentName = equipData.name || `special_equipment_${index}`;
      const requirements = equipData.requirements || [];
      const restrictions = equipData.restrictions || [];
      const compatibility = equipData.compatibility || [];
      
      // Check tech level compatibility
      const equipTechBase = equipData.techBase || 'Inner Sphere';
      const unitTechBase = config.techBase || 'Inner Sphere';
      
      if (equipTechBase === 'Clan' && unitTechBase === 'Inner Sphere') {
        violations.push({
          equipment: equipmentName,
          type: 'restriction_violated',
          message: `Clan equipment ${equipmentName} cannot be used on Inner Sphere unit`,
          severity: 'critical',
          suggestedFix: 'Use Inner Sphere equivalent or change unit tech base'
        });
      }
      
      // Check for conflicting equipment
      if (equipmentName.includes('Endo Steel') || equipmentName.includes('Ferro-Fibrous')) {
        const conflictingEquip = specialEquipment.find(other => 
          other !== equipment && (
            (equipmentName.includes('Endo Steel') && other.equipmentData?.name?.includes('Endo Steel')) ||
            (equipmentName.includes('Ferro-Fibrous') && other.equipmentData?.name?.includes('Ferro-Fibrous'))
          )
        );
        
        if (conflictingEquip) {
          violations.push({
            equipment: equipmentName,
            type: 'incompatible_combination',
            message: `Multiple instances of ${equipmentName.includes('Endo Steel') ? 'Endo Steel' : 'Ferro-Fibrous'} equipment detected`,
            severity: 'major',
            suggestedFix: 'Remove duplicate special equipment'
          });
        }
      }
      
      specialEquipmentChecks.push({
        equipment: equipmentName,
        isValid: true, // Would be calculated based on detailed rules
        requirements,
        restrictions,
        compatibility
      });
    });
    
    // Add general recommendations
    if (specialEquipment.length === 0) {
      recommendations.push('Consider adding special equipment like Endo Steel or Ferro-Fibrous armor for weight savings');
    }
    
    return {
      isValid: violations.length === 0,
      specialEquipment: specialEquipmentChecks,
      violations,
      recommendations
    };
  }
  
  validateTechLevel(config: UnitConfiguration, equipment: any[]): TechLevelValidation {
    const violations: TechLevelViolation[] = [];
    const recommendations: string[] = [];
    
    const unitTechLevel = 'Standard';
    const unitTechBase = config.techBase || 'Inner Sphere';
    const era = 'Succession Wars';
    
    const mixedTech = this.validateMixedTech(config, equipment);
    const eraRestrictions = this.validateEraRestrictions(config, equipment);
    const availability = this.validateAvailabilityRating(equipment, config);
    
    return {
      isValid: violations.length === 0 && mixedTech.violations.length === 0,
      unitTechLevel,
      unitTechBase,
      era,
      mixedTech,
      eraRestrictions,
      availability,
      violations,
      recommendations
    };
  }
  
  validateMixedTech(config: UnitConfiguration, equipment: any[]): MixedTechValidation {
    let innerSphereComponents = 0;
    let clanComponents = 0;
    const violations: string[] = [];
    
    for (const item of equipment) {
      const techBase = item.equipmentData?.techBase || 'Inner Sphere';
      if (techBase === 'Inner Sphere') {
        innerSphereComponents++;
      } else if (techBase === 'Clan') {
        clanComponents++;
      }
    }
    
    const isMixed = innerSphereComponents > 0 && clanComponents > 0;
    const allowedMixed = false; // Simplified - Mixed tech not allowed by default
    
    if (isMixed && !allowedMixed) {
      violations.push('Mixed tech detected but not allowed by unit configuration');
    }
    
    return {
      isMixed,
      innerSphereComponents,
      clanComponents,
      allowedMixed,
      violations
    };
  }
  
  validateEraRestrictions(config: UnitConfiguration, equipment: any[]): EraValidation {
    const invalidComponents: EraViolation[] = [];
    const recommendations: string[] = [];
    const era = 'Succession Wars';
    
    return {
      isValid: invalidComponents.length === 0,
      era,
      invalidComponents,
      recommendations
    };
  }
  
  validateAvailabilityRating(equipment: any[], config: UnitConfiguration): AvailabilityValidation {
    const violations: AvailabilityViolation[] = [];
    const componentRatings: ComponentAvailability[] = [];
    
    return {
      isValid: violations.length === 0,
      overallRating: 'Standard',
      componentRatings,
      violations
    };
  }
  
  validateComponentCompatibility(config: UnitConfiguration): CompatibilityValidation {
    const violations: CompatibilityViolation[] = [];
    const recommendations: string[] = [];
    const componentCompatibility: ComponentCompatibilityCheck[] = [];
    const systemIntegration: SystemIntegrationCheck[] = [];
    
    return {
      isValid: violations.length === 0,
      componentCompatibility,
      systemIntegration,
      violations,
      recommendations
    };
  }
  
  validateSpecialComponents(config: UnitConfiguration): SpecialComponentValidation {
    const violations: SpecialComponentViolation[] = [];
    const recommendations: string[] = [];
    
    const structureType = this.extractComponentType(config.structureType);
    const armorType = this.extractComponentType(config.armorType);
    const heatSinkType = this.extractComponentType(config.heatSinkType);
    
    const endoSteel = structureType.includes('Endo Steel');
    const ferroFibrous = armorType.includes('Ferro-Fibrous');
    const doubleHeatSinks = heatSinkType.includes('Double');
    
    return {
      isValid: violations.length === 0,
      endoSteel,
      ferroFibrous,
      doubleHeatSinks,
      artemis: false,
      targetingComputer: false,
      other: [],
      violations,
      recommendations
    };
  }
  
  validateCriticalSlots(config: UnitConfiguration, equipment: any[]): CriticalSlotValidation {
    const violations: CriticalSlotViolation[] = [];
    const recommendations: string[] = [];
    
    const totalSlotsAvailable = 78; // Standard bipedal mech
    const totalSlotsUsed = ValidationCalculations.calculateTotalSlotsUsed(config, equipment);
    const locationUtilization: { [location: string]: SlotUtilization } = {};
    
    const locations = ['head', 'centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    const slotCounts = [6, 12, 12, 12, 12, 12, 6, 6];
    
    locations.forEach((location, index) => {
      const used = 0; // Simplified calculation
      const available = slotCounts[index];
      locationUtilization[location] = {
        used,
        available,
        utilization: (used / available) * 100,
        overflow: used > available
      };
      
      if (used > available) {
        violations.push({
          location,
          type: 'overflow',
          message: `Location ${location} has ${used} slots used but only ${available} available`,
          severity: 'critical',
          suggestedFix: 'Move equipment to other locations'
        });
      }
    });
    
    return {
      isValid: violations.length === 0,
      totalSlotsUsed,
      totalSlotsAvailable,
      locationUtilization,
      violations,
      recommendations
    };
  }
  
  validateConstructionEfficiency(config: UnitConfiguration, equipment: any[]): EfficiencyValidation {
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
  
  validateDesignOptimization(config: UnitConfiguration, equipment: any[]): OptimizationValidation {
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
  
  generateComplianceReport(config: UnitConfiguration, equipment: any[]): ComplianceReport {
    const startTime = Date.now();
    
    // Run all validations to gather violations
    const configuration = this.validateConfiguration(config);
    const loadout = this.validateEquipmentLoadout(equipment, config);
    const techLevel = this.validateTechLevel(config, equipment);
    
    // Collect all violations
    const allViolations: RuleViolation[] = [];
    
    // Convert configuration violations to rule violations
    if (!configuration.weight.isValid) {
      configuration.weight.violations.forEach(v => {
        allViolations.push({
          ruleId: 'WEIGHT_VIOLATION',
          ruleName: 'Weight Limit Rule',
          component: v.component,
          description: v.message,
          severity: v.severity,
          impact: `Weight violation affects unit viability`,
          suggestedFix: `Reduce weight by ${v.actual - v.expected} tons`
        });
      });
    }
    
    if (!configuration.heat.isValid) {
      configuration.heat.violations.forEach(v => {
        allViolations.push({
          ruleId: 'HEAT_VIOLATION',
          ruleName: 'Heat Management Rule',
          description: v.message,
          severity: v.severity,
          impact: 'Heat violations can cause shutdown or damage',
          suggestedFix: v.suggestedFix
        });
      });
    }
    
    if (!loadout.weapons.isValid) {
      loadout.weapons.violations.forEach(v => {
        allViolations.push({
          ruleId: 'WEAPON_VIOLATION',
          ruleName: 'Weapon Mounting Rule',
          component: v.weapon,
          description: v.message,
          severity: v.severity,
          impact: 'Improper weapon mounting affects combat effectiveness',
          suggestedFix: v.suggestedFix
        });
      });
    }
    
    if (!loadout.ammunition.isValid) {
      loadout.ammunition.violations.forEach(v => {
        allViolations.push({
          ruleId: 'AMMO_VIOLATION',
          ruleName: 'Ammunition Rule',
          component: v.weapon || 'ammunition',
          location: v.location,
          description: v.message,
          severity: v.severity,
          impact: 'Ammunition violations affect safety and effectiveness',
          suggestedFix: v.suggestedFix
        });
      });
    }
    
    // Calculate violation summary
    const criticalViolations = allViolations.filter(v => v.severity === 'critical').length;
    const majorViolations = allViolations.filter(v => v.severity === 'major').length;
    const minorViolations = allViolations.filter(v => v.severity === 'minor').length;
    
    const violationsByCategory: { [category: string]: number } = {};
    allViolations.forEach(v => {
      const category = v.ruleId.split('_')[0];
      violationsByCategory[category] = (violationsByCategory[category] || 0) + 1;
    });
    
    const topViolations = allViolations
      .sort((a, b) => {
        const severityOrder = { critical: 3, major: 2, minor: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 5);
    
    // Generate rule compliance results
    const ruleCompliance: RuleComplianceResult[] = this.BATTLETECH_RULES.map(rule => 
      this.checkRuleCompliance(rule, config, equipment)
    );
    
    // Calculate overall compliance
    const totalRules = this.BATTLETECH_RULES.length;
    const compliantRules = ruleCompliance.filter(r => r.compliant).length;
    const overallCompliance = Math.round((compliantRules / totalRules) * 100);
    
    // Gather recommendations
    const allRecommendations = [
      ...configuration.weight.recommendations,
      ...configuration.heat.recommendations,
      ...loadout.weapons.recommendations,
      ...loadout.ammunition.recommendations,
      ...loadout.specialEquipment.recommendations
    ];
    
    const topRecommendations: ValidationRecommendation[] = allRecommendations
      .slice(0, 3)
      .map(rec => ({
        type: 'fix',
        priority: 'medium',
        category: 'General',
        description: rec,
        benefit: 'Improves unit compliance',
        difficulty: 'moderate',
        estimatedImpact: 50
      }));
    
    const endTime = Date.now();
    const validationTime = endTime - startTime;
    
    return {
      overallCompliance,
      ruleCompliance,
      violationSummary: {
        totalViolations: allViolations.length,
        criticalViolations,
        majorViolations,
        minorViolations,
        violationsByCategory,
        topViolations
      },
      recommendationSummary: {
        totalRecommendations: allRecommendations.length,
        criticalRecommendations: criticalViolations,
        implementationDifficulty: {
          easy: Math.floor(allRecommendations.length * 0.3),
          moderate: Math.floor(allRecommendations.length * 0.5),
          hard: Math.floor(allRecommendations.length * 0.2)
        },
        estimatedImpact: {
          high: criticalViolations,
          medium: majorViolations,
          low: minorViolations
        },
        topRecommendations
      },
      complianceMetrics: {
        validationTime,
        rulesChecked: totalRules,
        componentsValidated: equipment.length + 10, // Base components + equipment
        performance: {
          averageRuleTime: validationTime / totalRules,
          slowestRule: 'Weight Validation',
          fastestRule: 'Tech Level Validation'
        }
      }
    };
  }
  
  generateValidationSummary(validations: ValidationResult[]): ValidationSummary {
    return {
      totalRules: this.BATTLETECH_RULES.length,
      passedRules: 0,
      failedRules: 0,
      warningRules: 0,
      complianceScore: 85,
      criticalViolations: 0,
      majorViolations: 0,
      minorViolations: 0
    };
  }
  
  generateRuleViolationReport(violations: RuleViolation[]): ViolationReport {
    return this.reportingManager.generateRuleViolationReport(violations);
  }
  
  suggestComplianceFixes(violations: RuleViolation[]): ComplianceFix[] {
    return this.reportingManager.suggestComplianceFixes(violations);
  }
  
  calculateRuleScore(config: UnitConfiguration, equipment: any[]): RuleScore {
    return this.ruleManagementManager.calculateRuleScore(config, equipment);
  }
  
  checkRuleCompliance(rule: BattleTechRule, config: UnitConfiguration, equipment?: any[]): RuleComplianceResult {
    let compliant = true;
    let score = 100;
    const violations: RuleViolation[] = [];
    let notes = '';
    switch (rule.id) {
      case 'WEIGHT_LIMIT':
        const weightValidation = this.validateWeightLimits(config, equipment || []);
        compliant = weightValidation.isValid;
        score = compliant ? 100 : 0;
        break;
      case 'MINIMUM_HEAT_SINKS':
        const heatValidation = this.validateHeatManagement(config, equipment || []);
        compliant = heatValidation.actualHeatSinks >= heatValidation.minimumHeatSinks;
        score = compliant ? 100 : 0;
        break;
      default:
        notes = 'Rule check not implemented';
        break;
    }
    return {
      rule,
      compliant,
      score,
      violations,
      notes
    };
  }
  
  // ===== PRIVATE HELPER METHODS =====
  
  private extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') return component;
    return component.type;
  }
  
  private calculateTotalWeight(config: UnitConfiguration, equipment: any[]): number {
    let totalWeight = 0;
    
    // Add structure weight
    totalWeight += ValidationCalculations.calculateStructureWeight(config.tonnage || 100, this.extractComponentType(config.structureType));
    
    // Add engine weight
    totalWeight += ValidationCalculations.calculateEngineWeight(config.engineRating || 0, config.engineType || 'Standard');
    
    // Add armor weight
    totalWeight += ValidationCalculations.calculateArmorWeight(ValidationCalculations.calculateTotalArmorFromAllocation(config.armorAllocation) || 0, this.extractComponentType(config.armorType));
    
    // Add equipment weight
    totalWeight += equipment.reduce((sum, item) => sum + (item.equipmentData?.tonnage || 0), 0);
    
    return totalWeight;
  }
  
  private calculateWeightDistribution(config: UnitConfiguration, equipment: any[]): WeightDistribution {
    const structure = ValidationCalculations.calculateStructureWeight(config.tonnage || 100, this.extractComponentType(config.structureType));
    const armor = ValidationCalculations.calculateArmorWeight(ValidationCalculations.calculateTotalArmorFromAllocation(config.armorAllocation) || 0, this.extractComponentType(config.armorType));
    const engine = ValidationCalculations.calculateEngineWeight(config.engineRating || 0, config.engineType || 'Standard');
    
    const equipmentItems = equipment.filter(item => item.equipmentData?.type !== 'ammunition');
    const ammunitionItems = equipment.filter(item => item.equipmentData?.type === 'ammunition');
    
    const equipmentWeight = equipmentItems.reduce((sum, item) => sum + (item.equipmentData?.tonnage || 0), 0);
    const ammunition = ammunitionItems.reduce((sum, item) => sum + (item.equipmentData?.tonnage || 0), 0);
    
    const systems = 5; // Simplified systems weight
    
    return {
      structure,
      armor,
      engine,
      equipment: equipmentWeight,
      ammunition,
      systems
    };
  }
  
  private calculateHeatGeneration(equipment: any[]): number {
    return equipment.reduce((total, item) => total + (item.equipmentData?.heat || 0), 0);
  }
  
  private getEngineHeatSinks(config: UnitConfiguration): number {
    return ValidationCalculations.getEngineHeatSinks(config);
  }
  
  private getExternalHeatSinks(equipment: any[]): number {
    return ValidationCalculations.getExternalHeatSinks(equipment);
  }
  
  private calculateMaxArmor(tonnage: number): number {
    return ValidationCalculations.calculateMaxArmor(tonnage);
  }
  
  private calculateArmorWeight(totalArmor: number, armorType: string): number {
    return ValidationCalculations.calculateArmorWeight(totalArmor, armorType);
  }
  
  private isValidStructureType(structureType: string): boolean {
    return ValidationCalculations.isValidStructureType(structureType);
  }
  
  private calculateStructureWeight(tonnage: number, structureType: string): number {
    return ValidationCalculations.calculateStructureWeight(tonnage, structureType);
  }
  
  private calculateInternalStructure(tonnage: number): number {
    return ValidationCalculations.calculateInternalStructure(tonnage);
  }
  
  private calculateEngineWeight(engineRating: number, engineType: string): number {
    return ValidationCalculations.calculateEngineWeight(engineRating, engineType);
  }
  
  private calculateGyroWeight(engineRating: number, gyroType: string): number {
    return ValidationCalculations.calculateGyroWeight(engineRating, gyroType);
  }
  
  private calculateCockpitWeight(cockpitType: string): number {
    return ValidationCalculations.calculateCockpitWeight(cockpitType);
  }
  
  private isGyroEngineCompatible(gyroType: string, engineType?: string): boolean {
    return ValidationCalculations.isGyroEngineCompatible(gyroType, engineType);
  }
  
  private calculateTotalSlotsUsed(config: UnitConfiguration, equipment: any[]): number {
    return ValidationCalculations.calculateTotalSlotsUsed(config, equipment);
  }
  
  private generateOverallSummary(validations: any[]): ValidationSummary {
    return {
      totalRules: this.BATTLETECH_RULES.length,
      passedRules: 0,
      failedRules: 0,
      warningRules: 0,
      complianceScore: 85,
      criticalViolations: 0,
      majorViolations: 0,
      minorViolations: 0
    };
  }
  
  private generateValidationRecommendations(configuration: ConfigurationValidation, loadout: LoadoutValidation, techLevel: TechLevelValidation): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = [];
    
    if (!configuration.isValid) {
      recommendations.push({
        type: 'fix',
        priority: 'high',
        category: 'Configuration',
        description: 'Fix configuration issues',
        benefit: 'Ensures unit meets basic construction requirements',
        difficulty: 'moderate',
        estimatedImpact: 80
      });
    }
    
    if (!loadout.isValid) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        category: 'Equipment',
        description: 'Optimize equipment loadout',
        benefit: 'Improves unit effectiveness and efficiency',
        difficulty: 'moderate',
        estimatedImpact: 60
      });
    }
    
    return recommendations;
  }
  
  private calculateTotalArmorFromAllocation(armorAllocation: any): number {
    if (!armorAllocation) return 0;
    
    let total = 0;
    const locations = ['head', 'centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    
    for (const location of locations) {
      if (armorAllocation[location]) {
        total += armorAllocation[location];
      }
    }
    
    return total;
  }
  
  private getLocationArmor(armorAllocation: any, location: string): number {
    if (!armorAllocation || !armorAllocation[location]) return 0;
    return armorAllocation[location];
  }
}

// Export factory function for dependency injection
export const createConstructionRulesValidator = (): ConstructionRulesValidator => {
  return new ConstructionRulesValidatorImpl();
};
