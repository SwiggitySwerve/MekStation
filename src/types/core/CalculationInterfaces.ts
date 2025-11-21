/**
 * Calculation Interfaces for BattleTech Editor
 * 
 * Segmented calculation interfaces that provide type safety and enable
 * proper dependency injection for calculation services.
 * 
 * These interfaces eliminate the need for "as any" type casting by providing
 * strongly typed calculation contexts and results.
 */

import {
  ICalculationResult,
  ICalculationContext,
  IService,
  IObservableService,
  IStrategy,
  ICalculationStrategy,
  EntityId,
  TechBase,
  RulesLevel,
  Severity,
  Result
} from './BaseTypes';

import { IUnitConfiguration, IEquipmentAllocation } from './ValidationInterfaces';

// ===== CALCULATION STRATEGY INTERFACES =====

/**
 * Weight calculation strategy
 */
export interface IWeightCalculationStrategy extends ICalculationStrategy {
  calculateTotalWeight(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<IWeightCalculationResult>;

  calculateComponentWeight(
    componentType: string,
    componentConfig: any,
    context: ICalculationContext
  ): Promise<IComponentWeightResult>;

  calculateDistribution(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<IWeightDistributionResult>;
}

/**
 * Heat calculation strategy
 */
export interface IHeatCalculationStrategy extends ICalculationStrategy {
  calculateHeatGeneration(
    equipment: IEquipmentAllocation[]
  ): Promise<IHeatGenerationResult>;

  calculateHeatDissipation(
    config: IUnitConfiguration
  ): Promise<IHeatDissipationResult>;

  calculateHeatBalance(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<IHeatBalanceResult>;
}

/**
 * Armor calculation strategy
 */
export interface IArmorCalculationStrategy extends ICalculationStrategy {
  calculateArmorWeight(
    armorType: string,
    totalPoints: number,
    techBase: TechBase
  ): Promise<IArmorWeightResult>;

  calculateMaxArmor(
    tonnage: number,
    armorType: string
  ): Promise<IMaxArmorResult>;

  calculateArmorEfficiency(
    config: IUnitConfiguration
  ): Promise<IArmorEfficiencyResult>;
}

/**
 * Critical slots calculation strategy
 */
export interface ICriticalSlotsCalculationStrategy extends ICalculationStrategy {
  calculateSlotRequirements(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<ISlotRequirementsResult>;

  calculateSlotAvailability(
    config: IUnitConfiguration
  ): Promise<ISlotAvailabilityResult>;

  calculateSlotUtilization(
    requirements: ISlotRequirementsResult,
    availability: ISlotAvailabilityResult
  ): Promise<ISlotUtilizationResult>;
}

/**
 * Movement calculation strategy
 */
export interface IMovementCalculationStrategy extends ICalculationStrategy {
  calculateMovementPoints(
    engineRating: number,
    tonnage: number
  ): Promise<IMovementPointsResult>;

  calculateEngineWeight(
    engineRating: number,
    engineType: string,
    tonnage: number
  ): Promise<IEngineWeightResult>;

  calculateJumpCapacity(
    tonnage: number,
    jumpJetCount: number,
    jumpJetType: string
  ): Promise<IJumpCapacityResult>;
}

// ===== SPECIFIC CALCULATION RESULT INTERFACES =====

/**
 * Weight calculation result
 */
export interface IWeightCalculationResult extends ICalculationResult {
  readonly totalWeight: number;
  readonly maxTonnage: number;
  readonly remainingTonnage: number;
  readonly percentageUsed: number;
  readonly isOverweight: boolean;
  readonly componentBreakdown: IComponentWeightBreakdown;
  readonly locationBreakdown: ILocationWeightBreakdown;
  readonly optimization: IWeightOptimization;
}

/**
 * Component weight breakdown
 */
export interface IComponentWeightBreakdown {
  readonly structure: IComponentWeight;
  readonly armor: IComponentWeight;
  readonly engine: IComponentWeight;
  readonly gyro: IComponentWeight;
  readonly cockpit: IComponentWeight;
  readonly heatSinks: IComponentWeight;
  readonly jumpJets: IComponentWeight;
  readonly equipment: IComponentWeight;
  readonly ammunition: IComponentWeight;
}

/**
 * Individual component weight details
 */
export interface IComponentWeight {
  readonly weight: number;
  readonly type: string;
  readonly techBase: TechBase;
  readonly efficiency: number;
  readonly optimization: IComponentOptimization;
}

/**
 * Component optimization details
 */
export interface IComponentOptimization {
  readonly canOptimize: boolean;
  readonly potentialSavings: number;
  readonly alternativeOptions: IAlternativeComponent[];
  readonly recommendations: string[];
}

/**
 * Alternative component option
 */
export interface IAlternativeComponent {
  readonly name: string;
  readonly type: string;
  readonly weight: number;
  readonly weightSavings: number;
  readonly techBase: TechBase;
  readonly tradeoffs: string[];
  readonly feasibility: 'high' | 'medium' | 'low';
}

/**
 * Location weight breakdown
 */
export interface ILocationWeightBreakdown {
  readonly head: number;
  readonly centerTorso: number;
  readonly leftTorso: number;
  readonly rightTorso: number;
  readonly leftArm: number;
  readonly rightArm: number;
  readonly leftLeg: number;
  readonly rightLeg: number;
  readonly balance: IWeightBalance;
}

/**
 * Weight balance analysis
 */
export interface IWeightBalance {
  readonly frontToRear: number;
  readonly leftToRight: number;
  readonly topToBottom: number;
  readonly stability: 'excellent' | 'good' | 'acceptable' | 'poor' | 'critical';
  readonly recommendations: string[];
}

/**
 * Weight optimization analysis
 */
export interface IWeightOptimization {
  readonly currentEfficiency: number;
  readonly maxEfficiency: number;
  readonly improvements: IWeightImprovement[];
  readonly alternativeConfigurations: IAlternativeConfiguration[];
}

/**
 * Weight improvement suggestion
 */
export interface IWeightImprovement {
  readonly component: string;
  readonly currentWeight: number;
  readonly optimizedWeight: number;
  readonly savings: number;
  readonly method: string;
  readonly difficulty: 'easy' | 'moderate' | 'hard';
  readonly impact: string;
}

/**
 * Alternative configuration
 */
export interface IAlternativeConfiguration {
  readonly name: string;
  readonly description: string;
  readonly weightSavings: number;
  readonly changes: IConfigurationChange[];
  readonly benefits: string[];
  readonly drawbacks: string[];
}

/**
 * Configuration change
 */
export interface IConfigurationChange {
  readonly component: string;
  readonly from: string;
  readonly to: string;
  readonly weightChange: number;
  readonly reason: string;
}

/**
 * Component weight calculation result
 */
export interface IComponentWeightResult extends ICalculationResult {
  readonly componentType: string;
  readonly componentName: string;
  readonly baseWeight: number;
  readonly modifiedWeight: number;
  readonly modifiers: IWeightModifier[];
  readonly techBase: TechBase;
}

/**
 * Weight modifier
 */
export interface IWeightModifier {
  readonly name: string;
  readonly type: 'multiplier' | 'additive' | 'percentage';
  readonly value: number;
  readonly reason: string;
  readonly source: string;
}

/**
 * Weight distribution result
 */
export interface IWeightDistributionResult extends ICalculationResult {
  readonly totalWeight: number;
  readonly distribution: ILocationWeightBreakdown;
  readonly centerOfGravity: ICenterOfGravity;
  readonly stability: IStabilityAnalysis;
}

/**
 * Center of gravity calculation
 */
export interface ICenterOfGravity {
  readonly x: number; // Left (-) to Right (+)
  readonly y: number; // Front (-) to Rear (+)
  readonly z: number; // Bottom (-) to Top (+)
  readonly offset: number; // Distance from center
  readonly classification: 'centered' | 'front_heavy' | 'rear_heavy' | 'left_heavy' | 'right_heavy';
}

/**
 * Stability analysis
 */
export interface IStabilityAnalysis {
  readonly overallScore: number; // 0-100
  readonly balanceScore: number;
  readonly weightDistributionScore: number;
  readonly structuralIntegrityScore: number;
  readonly factors: IStabilityFactor[];
  readonly risks: IStabilityRisk[];
}

/**
 * Stability factor
 */
export interface IStabilityFactor {
  readonly name: string;
  readonly impact: number; // -100 to +100
  readonly description: string;
  readonly category: 'balance' | 'structure' | 'weight' | 'design';
}

/**
 * Stability risk
 */
export interface IStabilityRisk {
  readonly type: string;
  readonly severity: Severity;
  readonly probability: number;
  readonly description: string;
  readonly mitigation: string[];
}

// ===== HEAT CALCULATION INTERFACES =====

/**
 * Heat generation result
 */
export interface IHeatGenerationResult extends ICalculationResult {
  readonly totalHeatGeneration: number;
  readonly weaponHeat: IWeaponHeat[];
  readonly movementHeat: IMovementHeat;
  readonly environmentalHeat: number;
  readonly heatProfile: IHeatProfile;
}

/**
 * Weapon heat generation
 */
export interface IWeaponHeat {
  readonly weaponName: string;
  readonly weaponType: string;
  readonly heatPerShot: number;
  readonly shotsPerTurn: number;
  readonly totalHeat: number;
  readonly location: string;
  readonly modifiers: IHeatModifier[];
}

/**
 * Heat modifier
 */
export interface IHeatModifier {
  readonly name: string;
  readonly type: 'multiplier' | 'additive' | 'percentage';
  readonly value: number;
  readonly reason: string;
  readonly source: string;
}

/**
 * Movement heat generation
 */
export interface IMovementHeat {
  readonly walkingHeat: number;
  readonly runningHeat: number;
  readonly jumpingHeat: number;
  readonly sprintingHeat: number;
  readonly movementType: 'walk' | 'run' | 'jump' | 'sprint';
}

/**
 * Heat profile analysis
 */
export interface IHeatProfile {
  readonly sustainedFire: number;
  readonly alphastrike: number;
  readonly peakHeat: number;
  readonly averageHeat: number;
  readonly heatCurve: IHeatDataPoint[];
}

/**
 * Heat data point for curves
 */
export interface IHeatDataPoint {
  readonly turn: number;
  readonly heat: number;
  readonly cumulative: number;
  readonly scenario: string;
}

/**
 * Heat dissipation result
 */
export interface IHeatDissipationResult extends ICalculationResult {
  readonly totalDissipation: number;
  readonly engineHeatSinks: IEngineHeatSinks;
  readonly externalHeatSinks: IExternalHeatSinks[];
  readonly environmentalDissipation: number;
  readonly efficiency: IHeatSinkEfficiency;
}

/**
 * Engine heat sinks
 */
export interface IEngineHeatSinks {
  readonly count: number;
  readonly type: string;
  readonly dissipationPerSink: number;
  readonly totalDissipation: number;
  readonly engineRating: number;
  readonly maxEngineHeatSinks: number;
}

/**
 * External heat sinks
 */
export interface IExternalHeatSinks {
  readonly type: string;
  readonly count: number;
  readonly dissipationPerSink: number;
  readonly totalDissipation: number;
  readonly location: string;
  readonly weight: number;
}

/**
 * Heat sink efficiency
 */
export interface IHeatSinkEfficiency {
  readonly overallEfficiency: number;
  readonly engineEfficiency: number;
  readonly externalEfficiency: number;
  readonly optimalConfiguration: IOptimalHeatSinkConfig;
  readonly improvements: IHeatSinkImprovement[];
}

/**
 * Optimal heat sink configuration
 */
export interface IOptimalHeatSinkConfig {
  readonly engineHeatSinks: number;
  readonly externalHeatSinks: number;
  readonly heatSinkType: string;
  readonly totalDissipation: number;
  readonly weightSavings: number;
}

/**
 * Heat sink improvement
 */
export interface IHeatSinkImprovement {
  readonly type: 'add' | 'remove' | 'upgrade' | 'relocate';
  readonly description: string;
  readonly dissipationImprovement: number;
  readonly weightImpact: number;
  readonly cost: string;
  readonly feasibility: 'high' | 'medium' | 'low';
}

/**
 * Heat balance result
 */
export interface IHeatBalanceResult extends ICalculationResult {
  readonly heatGeneration: number;
  readonly heatDissipation: number;
  readonly heatBalance: number; // Positive = surplus, Negative = deficit
  readonly scenarios: IHeatScenario[];
  readonly recommendations: IHeatRecommendation[];
}

/**
 * Heat scenario analysis
 */
export interface IHeatScenario {
  readonly name: string;
  readonly description: string;
  readonly heatGeneration: number;
  readonly heatDissipation: number;
  readonly balance: number;
  readonly sustainability: 'indefinite' | 'limited' | 'unsustainable';
  readonly turnsToOverheat: number;
}

/**
 * Heat recommendation
 */
export interface IHeatRecommendation {
  readonly type: 'heat_sinks' | 'weapons' | 'movement' | 'tactics';
  readonly description: string;
  readonly heatImprovement: number;
  readonly difficulty: 'easy' | 'moderate' | 'hard';
  readonly priority: 'high' | 'medium' | 'low';
  readonly cost: string;
}

// ===== ARMOR CALCULATION INTERFACES =====

/**
 * Armor weight result
 */
export interface IArmorWeightResult extends ICalculationResult {
  readonly armorType: string;
  readonly totalPoints: number;
  readonly totalWeight: number;
  readonly pointsPerTon: number;
  readonly techBase: TechBase;
  readonly efficiency: IArmorEfficiency;
}

/**
 * Armor efficiency analysis
 */
export interface IArmorEfficiency {
  readonly pointsPerTon: number;
  readonly protection: number;
  readonly overallRating: 'excellent' | 'good' | 'average' | 'poor';
  readonly comparison: IArmorComparison[];
}

/**
 * Armor type comparison
 */
export interface IArmorComparison {
  readonly armorType: string;
  readonly pointsPerTon: number;
  readonly protection: number;
  readonly specialProperties: string[];
  readonly recommendation: string;
}

/**
 * Maximum armor result
 */
export interface IMaxArmorResult extends ICalculationResult {
  readonly maxArmorPoints: number;
  readonly tonnage: number;
  readonly armorType: string;
  readonly locationBreakdown: ILocationArmorMax[];
  readonly optimization: IArmorOptimization;
}

/**
 * Location maximum armor
 */
export interface ILocationArmorMax {
  readonly location: string;
  readonly maxFront: number;
  readonly maxRear: number;
  readonly maxTotal: number;
  readonly internalStructure: number;
}

/**
 * Armor optimization
 */
export interface IArmorOptimization {
  readonly currentTotal: number;
  readonly maxPossible: number;
  readonly utilizationPercent: number;
  readonly improvements: IArmorImprovement[];
  readonly alternativeDistributions: IAlternativeArmorDistribution[];
}

/**
 * Armor improvement
 */
export interface IArmorImprovement {
  readonly location: string;
  readonly currentArmor: number;
  readonly suggestedArmor: number;
  readonly improvement: number;
  readonly reason: string;
  readonly priority: 'high' | 'medium' | 'low';
}

/**
 * Alternative armor distribution
 */
export interface IAlternativeArmorDistribution {
  readonly name: string;
  readonly strategy: 'balanced' | 'front_heavy' | 'protection_priority' | 'weight_optimized';
  readonly distribution: Record<string, number>;
  readonly totalPoints: number;
  readonly benefits: string[];
  readonly drawbacks: string[];
}

/**
 * Armor efficiency result
 */
export interface IArmorEfficiencyResult extends ICalculationResult {
  readonly overallEfficiency: number;
  readonly pointsPerTon: number;
  readonly coverage: ICoverageAnalysis;
  readonly distribution: IDistributionAnalysis;
  readonly optimization: IArmorOptimization;
}

/**
 * Coverage analysis
 */
export interface ICoverageAnalysis {
  readonly totalCoverage: number;
  readonly locationCoverage: ILocationCoverage[];
  readonly vulnerabilities: IVulnerability[];
  readonly recommendations: string[];
}

/**
 * Location coverage
 */
export interface ILocationCoverage {
  readonly location: string;
  readonly coverage: number;
  readonly maxCoverage: number;
  readonly utilizationPercent: number;
  readonly priority: 'critical' | 'important' | 'standard' | 'low';
}

/**
 * Vulnerability analysis
 */
export interface IVulnerability {
  readonly location: string;
  readonly type: 'under_armored' | 'critical_location' | 'ammunition_risk' | 'engine_exposure';
  readonly severity: Severity;
  readonly description: string;
  readonly mitigation: string[];
}

/**
 * Distribution analysis
 */
export interface IDistributionAnalysis {
  readonly balance: 'balanced' | 'front_heavy' | 'rear_heavy' | 'unbalanced';
  readonly frontToRearRatio: number;
  readonly centerToLimbRatio: number;
  readonly efficiency: number;
  readonly recommendations: string[];
}

// ===== CRITICAL SLOTS CALCULATION INTERFACES =====

/**
 * Slot requirements result
 */
export interface ISlotRequirementsResult extends ICalculationResult {
  readonly totalRequired: number;
  readonly systemComponents: ISystemSlotRequirements;
  readonly equipment: IEquipmentSlotRequirements[];
  readonly specialComponents: ISpecialSlotRequirements;
  readonly locationBreakdown: ILocationSlotRequirements[];
}

/**
 * System slot requirements
 */
export interface ISystemSlotRequirements {
  readonly engine: number;
  readonly gyro: number;
  readonly cockpit: number;
  readonly lifeSupport: number;
  readonly sensors: number;
  readonly actuators: IActuatorRequirements;
}

/**
 * Actuator requirements
 */
export interface IActuatorRequirements {
  readonly shoulder: number;
  readonly upperArm: number;
  readonly lowerArm: number;
  readonly hand: number;
  readonly hip: number;
  readonly upperLeg: number;
  readonly lowerLeg: number;
  readonly foot: number;
}

/**
 * Equipment slot requirements
 */
export interface IEquipmentSlotRequirements {
  readonly equipmentName: string;
  readonly equipmentType: string;
  readonly slotsRequired: number;
  readonly location: string;
  readonly constraints: ISlotConstraint[];
}

/**
 * Slot constraint
 */
export interface ISlotConstraint {
  readonly type: 'location' | 'adjacency' | 'separation' | 'special';
  readonly description: string;
  readonly mandatory: boolean;
  readonly alternatives: string[];
}

/**
 * Special slot requirements
 */
export interface ISpecialSlotRequirements {
  readonly endoSteel: number;
  readonly ferroFibrous: number;
  readonly doubleHeatSinks: number;
  readonly artemis: number;
  readonly targetingComputer: number;
  readonly other: ISpecialComponentSlots[];
}

/**
 * Special component slots
 */
export interface ISpecialComponentSlots {
  readonly componentName: string;
  readonly slotsRequired: number;
  readonly distribution: Record<string, number>;
  readonly constraints: ISlotConstraint[];
}

/**
 * Location slot requirements
 */
export interface ILocationSlotRequirements {
  readonly location: string;
  readonly required: number;
  readonly system: number;
  readonly equipment: number;
  readonly special: number;
  readonly breakdown: ISlotAllocation[];
}

/**
 * Slot allocation
 */
export interface ISlotAllocation {
  readonly slotIndex: number;
  readonly itemName: string;
  readonly itemType: string;
  readonly required: boolean;
  readonly moveable: boolean;
}

/**
 * Slot availability result
 */
export interface ISlotAvailabilityResult extends ICalculationResult {
  readonly totalAvailable: number;
  readonly locationAvailability: ILocationSlotAvailability[];
  readonly reservedSlots: IReservedSlots;
  readonly constraints: ISlotAvailabilityConstraint[];
}

/**
 * Location slot availability
 */
export interface ILocationSlotAvailability {
  readonly location: string;
  readonly totalSlots: number;
  readonly systemReserved: number;
  readonly availableForEquipment: number;
  readonly currentlyUsed: number;
  readonly remaining: number;
}

/**
 * Reserved slots
 */
export interface IReservedSlots {
  readonly engine: Record<string, number>;
  readonly gyro: Record<string, number>;
  readonly actuators: Record<string, number>;
  readonly cockpit: Record<string, number>;
  readonly lifeSupport: Record<string, number>;
}

/**
 * Slot availability constraint
 */
export interface ISlotAvailabilityConstraint {
  readonly location: string;
  readonly constraintType: string;
  readonly description: string;
  readonly slotsAffected: number;
  readonly mitigation: string[];
}

/**
 * Slot utilization result
 */
export interface ISlotUtilizationResult extends ICalculationResult {
  readonly overallUtilization: number;
  readonly locationUtilization: ILocationSlotUtilization[];
  readonly efficiency: ISlotEfficiency;
  readonly optimization: ISlotOptimization;
}

/**
 * Location slot utilization
 */
export interface ILocationSlotUtilization {
  readonly location: string;
  readonly available: number;
  readonly used: number;
  readonly utilization: number;
  readonly efficiency: number;
  readonly waste: number;
  readonly overflow: boolean;
}

/**
 * Slot efficiency
 */
export interface ISlotEfficiency {
  readonly overallEfficiency: number;
  readonly utilizationEfficiency: number;
  readonly distributionEfficiency: number;
  readonly wastage: number;
  readonly improvements: ISlotEfficiencyImprovement[];
}

/**
 * Slot efficiency improvement
 */
export interface ISlotEfficiencyImprovement {
  readonly type: 'redistribution' | 'consolidation' | 'optimization';
  readonly description: string;
  readonly efficiencyGain: number;
  readonly feasibility: 'high' | 'medium' | 'low';
  readonly steps: string[];
}

/**
 * Slot optimization
 */
export interface ISlotOptimization {
  readonly currentEfficiency: number;
  readonly maxPossibleEfficiency: number;
  readonly improvementPotential: number;
  readonly optimizations: ISlotOptimizationOption[];
  readonly alternativeLayouts: IAlternativeSlotLayout[];
}

/**
 * Slot optimization option
 */
export interface ISlotOptimizationOption {
  readonly type: 'move' | 'consolidate' | 'redistribute' | 'replace';
  readonly description: string;
  readonly equipmentAffected: string[];
  readonly slotsSaved: number;
  readonly difficulty: 'easy' | 'moderate' | 'hard';
  readonly benefits: string[];
  readonly tradeoffs: string[];
}

/**
 * Alternative slot layout
 */
export interface IAlternativeSlotLayout {
  readonly name: string;
  readonly strategy: 'balanced' | 'protection' | 'efficiency' | 'specialized';
  readonly layout: Record<string, ISlotAllocation[]>;
  readonly efficiency: number;
  readonly benefits: string[];
  readonly drawbacks: string[];
}

// ===== MOVEMENT CALCULATION INTERFACES =====

/**
 * Movement points result
 */
export interface IMovementPointsResult extends ICalculationResult {
  readonly walkMP: number;
  readonly runMP: number;
  readonly jumpMP: number;
  readonly sprintMP: number;
  readonly engineRating: number;
  readonly tonnage: number;
  readonly efficiency: IMovementEfficiency;
}

/**
 * Movement efficiency
 */
export interface IMovementEfficiency {
  readonly walkRatio: number;
  readonly runRatio: number;
  readonly jumpRatio: number;
  readonly overallRating: 'excellent' | 'good' | 'average' | 'poor';
  readonly comparison: IMovementComparison[];
}

/**
 * Movement comparison
 */
export interface IMovementComparison {
  readonly weightClass: string;
  readonly averageWalk: number;
  readonly averageRun: number;
  readonly ranking: 'above_average' | 'average' | 'below_average';
}

/**
 * Engine weight result
 */
export interface IEngineWeightResult extends ICalculationResult {
  readonly engineType: string;
  readonly engineRating: number;
  readonly engineWeight: number;
  readonly tonnage: number;
  readonly heatSinks: number;
  readonly efficiency: IEngineEfficiency;
}

/**
 * Engine efficiency
 */
export interface IEngineEfficiency {
  readonly weightEfficiency: number;
  readonly movementEfficiency: number;
  readonly heatEfficiency: number;
  readonly overallRating: 'excellent' | 'good' | 'average' | 'poor';
  readonly alternatives: IEngineAlternative[];
}

/**
 * Engine alternative
 */
export interface IEngineAlternative {
  readonly engineType: string;
  readonly engineRating: number;
  readonly weight: number;
  readonly walkMP: number;
  readonly runMP: number;
  readonly weightSavings: number;
  readonly tradeoffs: string[];
  readonly feasibility: 'high' | 'medium' | 'low';
}

/**
 * Jump capacity result
 */
export interface IJumpCapacityResult extends ICalculationResult {
  readonly jumpMP: number;
  readonly jumpJetCount: number;
  readonly jumpJetType: string;
  readonly jumpJetWeight: number;
  readonly maxJumpMP: number;
  readonly efficiency: IJumpEfficiency;
}

/**
 * Jump efficiency
 */
export interface IJumpEfficiency {
  readonly weightToMobilityRatio: number;
  readonly capacityUtilization: number;
  readonly overallRating: 'excellent' | 'good' | 'average' | 'poor';
  readonly optimization: IJumpOptimization;
}

/**
 * Jump optimization
 */
export interface IJumpOptimization {
  readonly optimalJumpJets: number;
  readonly currentEfficiency: number;
  readonly maxEfficiency: number;
  readonly recommendations: IJumpRecommendation[];
}

/**
 * Jump recommendation
 */
export interface IJumpRecommendation {
  readonly type: 'add' | 'remove' | 'upgrade' | 'relocate';
  readonly description: string;
  readonly jumpMPChange: number;
  readonly weightChange: number;
  readonly feasibility: 'high' | 'medium' | 'low';
}

// ===== CALCULATION SERVICE INTERFACES =====

/**
 * Calculation orchestrator service
 */
export interface ICalculationOrchestrator extends IObservableService {
  calculateAll(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<ICompleteCalculationResult>>;

  calculateWeight(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<IWeightCalculationResult>>;

  calculateHeat(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<IHeatBalanceResult>>;

  calculateArmor(
    config: IUnitConfiguration
  ): Promise<Result<IArmorEfficiencyResult>>;

  calculateSlots(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<ISlotUtilizationResult>>;

  calculateMovement(
    config: IUnitConfiguration
  ): Promise<Result<IMovementPointsResult>>;

  getCalculationStrategies(): Record<string, string[]>;
  setCalculationStrategy(category: string, strategyName: string): void;
}

/**
 * Complete calculation result
 */
export interface ICompleteCalculationResult {
  readonly weight: IWeightCalculationResult;
  readonly heat: IHeatBalanceResult;
  readonly armor: IArmorEfficiencyResult;
  readonly slots: ISlotUtilizationResult;
  readonly movement: IMovementPointsResult;
  readonly optimization: IOptimizationSummary;
  readonly performance: ICalculationMetrics;
}

/**
 * Optimization summary
 */
export interface IOptimizationSummary {
  readonly overallScore: number;
  readonly weightOptimization: number;
  readonly heatOptimization: number;
  readonly armorOptimization: number;
  readonly slotOptimization: number;
  readonly movementOptimization: number;
  readonly topImprovements: IOptimizationImprovement[];
}

/**
 * Optimization improvement
 */
export interface IOptimizationImprovement {
  readonly category: 'weight' | 'heat' | 'armor' | 'slots' | 'movement';
  readonly description: string;
  readonly impact: number;
  readonly difficulty: 'easy' | 'moderate' | 'hard';
  readonly priority: 'high' | 'medium' | 'low';
}

/**
 * Calculation metrics
 */
export interface ICalculationMetrics {
  readonly totalCalculationTime: number;
  readonly strategyMetrics: ICalculationStrategyMetrics[];
  readonly cacheHitRate: number;
  readonly memoryUsage: number;
  readonly bottlenecks: string[];
}

/**
 * Calculation strategy metrics
 */
export interface ICalculationStrategyMetrics {
  readonly strategyName: string;
  readonly category: string;
  readonly executionTime: number;
  readonly calculationCount: number;
  readonly averageTime: number;
  readonly cacheHitRate: number;
}