/**
 * Common validation types extracted from ConstructionRulesValidator
 * These interfaces define the structure for validation results across the system
 */

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




