/**
 * Validation Interfaces for BattleTech Editor
 * 
 * Segmented validation interfaces that provide type safety and enable
 * proper dependency injection for validation services.
 * 
 * These interfaces follow SOLID principles:
 * - Single Responsibility: Each interface has one validation concern
 * - Open/Closed: Extensible through composition
 * - Liskov Substitution: All implementations are substitutable
 * - Interface Segregation: Clients depend only on what they need
 * - Dependency Inversion: Depend on abstractions, not concretions
 */

import { 
  IValidationResult, 
  IViolation, 
  IWarning, 
  IRecommendation,
  IService,
  IObservableService,
  IStrategy,
  IValidationStrategy,
  EntityId,
  TechBase,
  RulesLevel,
  Severity,
  Priority,
  Result
} from './BaseTypes';
import { ComponentConfiguration } from '../componentConfiguration';
import { 
  ILocationSlotUtilization, 
  IOptimizationImprovement 
} from './CalculationInterfaces';
import {
  IArmorAllocation,
  ILocationArmor
} from './EquipmentInterfaces';

// ===== CORE VALIDATION INTERFACES =====

/**
 * Configuration data for validation operations
 */
export interface IUnitConfiguration {
  readonly id: EntityId;
  readonly tonnage: number;
  readonly chassisName: string;
  readonly model: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly engineRating: number;
  readonly engineType: string;
  readonly gyroType: string;
  readonly cockpitType: string;
  readonly structureType: string;
  readonly armorType: string;
  readonly heatSinkType: string;
  readonly enhancements?: ComponentConfiguration[];
  readonly jumpJetType?: string;
  readonly armorAllocation: IArmorAllocation;
  readonly metadata?: Record<string, any>;
}

/**
 * Armor allocation by location
 * Note: This interface is also defined in EquipmentInterfaces.ts
 * Commenting out to avoid duplication - use the one from EquipmentInterfaces instead
 */
// export interface IArmorAllocation {
//   readonly head: ILocationArmor;
//   readonly centerTorso: ILocationArmor;
//   readonly leftTorso: ILocationArmor;
//   readonly rightTorso: ILocationArmor;
//   readonly leftArm: ILocationArmor;
//   readonly rightArm: ILocationArmor;
//   readonly leftLeg: ILocationArmor;
//   readonly rightLeg: ILocationArmor;
// }

/**
 * Armor configuration for a location
 * Note: This interface is also defined in EquipmentInterfaces.ts
 * Commenting out to avoid duplication - use the one from EquipmentInterfaces instead
 */
// export interface ILocationArmor {
//   readonly front: number;
//   readonly rear?: number;
// }

/**
 * Equipment allocation information
 */
export interface IEquipmentAllocation {
  readonly id: EntityId;
  readonly equipmentId: EntityId;
  readonly location: string;
  readonly slotIndex: number;
  readonly quantity: number;
  readonly metadata?: Record<string, any>;
}

// ===== VALIDATION STRATEGY INTERFACES =====

/**
 * Weight validation strategy
 */
export interface IWeightValidationStrategy extends IStrategy {
  validateWeight(
    config: IUnitConfiguration, 
    equipment: IEquipmentAllocation[]
  ): Promise<IWeightValidationResult>;
}

/**
 * Heat validation strategy
 */
export interface IHeatValidationStrategy extends IStrategy {
  validateHeat(
    config: IUnitConfiguration, 
    equipment: IEquipmentAllocation[]
  ): Promise<IHeatValidationResult>;
}

/**
 * Movement validation strategy
 */
export interface IMovementValidationStrategy extends IStrategy {
  validateMovement(
    config: IUnitConfiguration
  ): Promise<IMovementValidationResult>;
}

/**
 * Armor validation strategy
 */
export interface IArmorValidationStrategy extends IStrategy {
  validateArmor(
    config: IUnitConfiguration
  ): Promise<IArmorValidationResult>;
}

/**
 * Structure validation strategy
 */
export interface IStructureValidationStrategy extends IStrategy {
  validateStructure(
    config: IUnitConfiguration
  ): Promise<IStructureValidationResult>;
}

/**
 * Critical slots validation strategy
 */
export interface ICriticalSlotsValidationStrategy extends IStrategy {
  validateCriticalSlots(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<ICriticalSlotsValidationResult>;
}

/**
 * Tech level validation strategy
 */
export interface ITechLevelValidationStrategy extends IStrategy {
  validateTechLevel(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<ITechLevelValidationResult>;
}

/**
 * Equipment validation strategy
 */
export interface IEquipmentValidationStrategy extends IStrategy {
  validateEquipment(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<IEquipmentValidationResult>;
}

// ===== SPECIFIC VALIDATION RESULT INTERFACES =====

/**
 * Weight validation result
 */
export interface IWeightValidationResult extends IValidationResult {
  readonly totalWeight: number;
  readonly maxWeight: number;
  readonly overweight: number;
  readonly underweight: number;
  readonly distribution: IWeightDistribution;
  readonly efficiency: number;
}

/**
 * Weight distribution breakdown
 */
export interface IWeightDistribution {
  readonly structure: number;
  readonly armor: number;
  readonly engine: number;
  readonly gyro: number;
  readonly cockpit: number;
  readonly heatSinks: number;
  readonly jumpJets: number;
  readonly equipment: number;
  readonly ammunition: number;
}

/**
 * Heat validation result
 */
export interface IHeatValidationResult extends IValidationResult {
  readonly heatGeneration: number;
  readonly heatDissipation: number;
  readonly heatDeficit: number;
  readonly minimumHeatSinks: number;
  readonly actualHeatSinks: number;
  readonly engineHeatSinks: number;
  readonly externalHeatSinks: number;
  readonly efficiency: number;
}

/**
 * Movement validation result
 */
export interface IMovementValidationResult extends IValidationResult {
  readonly walkMP: number;
  readonly runMP: number;
  readonly jumpMP: number;
  readonly engineRating: number;
  readonly tonnage: number;
  readonly engineType: string;
  readonly movementProfile: IMovementProfile;
}

/**
 * Movement profile classification
 */
export interface IMovementProfile {
  readonly classification: 'slow' | 'moderate' | 'fast' | 'very_fast';
  readonly walkRatio: number;
  readonly runRatio: number;
  readonly jumpRatio: number;
}

/**
 * Armor validation result
 */
export interface IArmorValidationResult extends IValidationResult {
  readonly totalArmor: number;
  readonly maxArmor: number;
  readonly armorType: string;
  readonly armorWeight: number;
  readonly armorEfficiency: number;
  readonly locationValidation: ILocationValidation[];
}

/**
 * Location-specific armor validation
 */
export interface ILocationValidation {
  readonly location: string;
  readonly currentArmor: number;
  readonly maxArmor: number;
  readonly utilizationPercent: number;
  readonly isValid: boolean;
  readonly violations: IViolation[];
}

/**
 * Structure validation result
 */
export interface IStructureValidationResult extends IValidationResult {
  readonly structureType: string;
  readonly structureWeight: number;
  readonly internalStructure: number;
  readonly structureEfficiency: number;
  readonly slotsRequired: number;
  readonly slotsAvailable: number;
}

/**
 * Critical slots validation result
 */
export interface ICriticalSlotsValidationResult extends IValidationResult {
  readonly totalSlotsUsed: number;
  readonly totalSlotsAvailable: number;
  readonly utilizationPercent: number;
  readonly locationUtilization: ILocationSlotUtilization[];
  readonly overflow: boolean;
}

/**
 * Location-specific slot utilization
 * Note: This interface is also defined in CalculationInterfaces.ts with a different shape.
 * Commenting out to avoid duplication - use the one from CalculationInterfaces instead.
 */
// export interface ILocationSlotUtilization {
//   readonly location: string;
//   readonly slotsUsed: number;
//   readonly slotsAvailable: number;
//   readonly utilization: number;
//   readonly overflow: boolean;
//   readonly reservedSlots: number;
//   readonly specialComponents: string[];
// }

/**
 * Tech level validation result
 */
export interface ITechLevelValidationResult extends IValidationResult {
  readonly unitTechLevel: RulesLevel;
  readonly unitTechBase: TechBase;
  readonly era: string;
  readonly mixedTech: IMixedTechValidation;
  readonly componentCompliance: IComponentCompliance[];
}

/**
 * Mixed tech validation
 */
export interface IMixedTechValidation {
  readonly isMixed: boolean;
  readonly innerSphereComponents: number;
  readonly clanComponents: number;
  readonly allowedMixed: boolean;
  readonly restrictions: string[];
}

/**
 * Component compliance validation
 */
export interface IComponentCompliance {
  readonly componentName: string;
  readonly componentType: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly availableEra: string;
  readonly isCompliant: boolean;
  readonly violations: IViolation[];
}

/**
 * Equipment validation result
 */
export interface IEquipmentValidationResult extends IValidationResult {
  readonly weaponValidation: IWeaponValidation;
  readonly ammoValidation: IAmmoValidation;
  readonly specialEquipmentValidation: ISpecialEquipmentValidation;
  readonly placementValidation: IPlacementValidation;
}

/**
 * Weapon-specific validation
 */
export interface IWeaponValidation {
  readonly weaponCount: number;
  readonly totalWeaponWeight: number;
  readonly heatGeneration: number;
  readonly firepowerRating: number;
  readonly rangeProfile: IRangeAnalysis;
  readonly weaponCompatibility: IWeaponCompatibility[];
}

/**
 * Range analysis for weapons
 */
export interface IRangeAnalysis {
  readonly shortRange: IRangeBracket;
  readonly mediumRange: IRangeBracket;
  readonly longRange: IRangeBracket;
  readonly overallEffectiveness: number;
}

/**
 * Range bracket analysis
 */
export interface IRangeBracket {
  readonly damage: number;
  readonly accuracy: number;
  readonly effectiveness: number;
}

/**
 * Weapon compatibility analysis
 */
export interface IWeaponCompatibility {
  readonly weaponName: string;
  readonly requiredAmmo: string[];
  readonly availableAmmo: string[];
  readonly isCompatible: boolean;
  readonly violations: IViolation[];
}

/**
 * Ammunition validation
 */
export interface IAmmoValidation {
  readonly totalAmmoWeight: number;
  readonly ammoBalance: IAmmoBalance[];
  readonly caseProtection: ICaseProtection;
  readonly explosiveRisks: IExplosiveRisk[];
}

/**
 * Ammunition balance analysis
 */
export interface IAmmoBalance {
  readonly weaponName: string;
  readonly ammoType: string;
  readonly ammoTons: number;
  readonly recommendedTons: number;
  readonly battlesOfSupply: number;
  readonly isAdequate: boolean;
}

/**
 * CASE protection analysis
 */
export interface ICaseProtection {
  readonly requiredLocations: string[];
  readonly protectedLocations: string[];
  readonly unprotectedLocations: string[];
  readonly isCompliant: boolean;
  readonly riskLevel: Severity;
}

/**
 * Explosive risk analysis
 */
export interface IExplosiveRisk {
  readonly location: string;
  readonly explosiveItems: string[];
  readonly riskLevel: Severity;
  readonly recommendedProtection: string[];
}

/**
 * Special equipment validation
 */
export interface ISpecialEquipmentValidation {
  readonly specialEquipment: ISpecialEquipmentCheck[];
  readonly synergies: ISynergy[];
  readonly conflicts: IConflict[];
}

/**
 * Special equipment check
 */
export interface ISpecialEquipmentCheck {
  readonly equipmentName: string;
  readonly isValid: boolean;
  readonly requirements: string[];
  readonly restrictions: string[];
  readonly compatibility: string[];
}

/**
 * Equipment synergy analysis
 */
export interface ISynergy {
  readonly equipmentA: string;
  readonly equipmentB: string;
  readonly synergyType: string;
  readonly benefit: string;
  readonly isActive: boolean;
}

/**
 * Equipment conflict analysis
 */
export interface IConflict {
  readonly equipmentA: string;
  readonly equipmentB: string;
  readonly conflictType: string;
  readonly impact: string;
  readonly resolution: string;
}

/**
 * Placement validation
 */
export interface IPlacementValidation {
  readonly locationConstraints: ILocationConstraint[];
  readonly placementViolations: IPlacementViolation[];
  readonly optimization: IPlacementOptimization;
}

/**
 * Location constraint validation
 */
export interface ILocationConstraint {
  readonly location: string;
  readonly allowedTypes: string[];
  readonly forbiddenTypes: string[];
  readonly capacity: number;
  readonly utilization: number;
  readonly violations: IViolation[];
}

/**
 * Placement violation
 */
export interface IPlacementViolation extends IViolation {
  readonly equipmentName: string;
  readonly currentLocation: string;
  readonly validLocations: string[];
  readonly reason: string;
}

/**
 * Placement optimization
 */
export interface IPlacementOptimization {
  readonly currentEfficiency: number;
  readonly potentialEfficiency: number;
  readonly improvements: IPlacementImprovement[];
}

/**
 * Placement improvement suggestion
 */
export interface IPlacementImprovement {
  readonly equipmentName: string;
  readonly currentLocation: string;
  readonly suggestedLocation: string;
  readonly benefit: string;
  readonly priority: Priority;
}

// ===== COMPREHENSIVE VALIDATION INTERFACES =====

/**
 * Complete unit validation result
 */
export interface ICompleteValidationResult extends IValidationResult {
  readonly configurationValidation: IConfigurationValidationResult;
  readonly equipmentValidation: IEquipmentValidationResult;
  readonly complianceValidation: IComplianceValidationResult;
  readonly optimizationValidation: IOptimizationValidationResult;
  readonly performanceMetrics: IValidationMetrics;
}

/**
 * Configuration validation result
 */
export interface IConfigurationValidationResult extends IValidationResult {
  readonly weight: IWeightValidationResult;
  readonly heat: IHeatValidationResult;
  readonly movement: IMovementValidationResult;
  readonly armor: IArmorValidationResult;
  readonly structure: IStructureValidationResult;
  readonly criticalSlots: ICriticalSlotsValidationResult;
}

/**
 * Compliance validation result
 */
export interface IComplianceValidationResult extends IValidationResult {
  readonly techLevel: ITechLevelValidationResult;
  readonly ruleCompliance: IRuleCompliance[];
  readonly overallScore: number;
  readonly complianceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Rule compliance check
 */
export interface IRuleCompliance {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly category: string;
  readonly isCompliant: boolean;
  readonly severity: Severity;
  readonly violations: IViolation[];
  readonly score: number;
}

/**
 * Optimization validation result
 */
export interface IOptimizationValidationResult extends IValidationResult {
  readonly overallScore: number;
  readonly improvements: IOptimizationImprovement[];
  readonly alternatives: IAlternativeDesign[];
}

/**
 * Optimization improvement
 * Note: This interface is also defined in CalculationInterfaces.ts with a different shape.
 * Commenting out to avoid duplication - use the one from CalculationInterfaces instead.
 */
// export interface IOptimizationImprovement extends IRecommendation {
//   readonly category: 'weight' | 'heat' | 'slots' | 'firepower' | 'protection' | 'cost';
//   readonly currentValue: number;
//   readonly improvedValue: number;
//   readonly improvement: number;
//   readonly tradeoffs: string[];
// }

/**
 * Alternative design suggestion
 */
export interface IAlternativeDesign {
  readonly name: string;
  readonly description: string;
  readonly changes: IDesignChange[];
  readonly benefits: string[];
  readonly drawbacks: string[];
  readonly feasibility: Priority;
}

/**
 * Design change specification
 */
export interface IDesignChange {
  readonly component: string;
  readonly currentValue: any;
  readonly suggestedValue: any;
  readonly reason: string;
  readonly impact: string;
}

/**
 * Validation performance metrics
 */
export interface IValidationMetrics {
  readonly totalValidationTime: number;
  readonly strategyMetrics: IStrategyMetrics[];
  readonly cacheHitRate: number;
  readonly bottlenecks: string[];
  readonly optimizationSuggestions: string[];
}

/**
 * Strategy-specific metrics
 */
export interface IStrategyMetrics {
  readonly strategyName: string;
  readonly executionTime: number;
  readonly validationCount: number;
  readonly successRate: number;
  readonly averageTime: number;
}

// ===== VALIDATION SERVICE INTERFACES =====

/**
 * Core validation service interface
 */
export interface IValidationService extends IObservableService {
  validateUnit(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<ICompleteValidationResult>>;

  validateConfiguration(
    config: IUnitConfiguration
  ): Promise<Result<IConfigurationValidationResult>>;

  validateEquipment(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<IEquipmentValidationResult>>;

  validateCompliance(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<IComplianceValidationResult>>;

  getValidationStrategies(): string[];
  setValidationStrategy(strategyName: string): void;
  getValidationMetrics(): IValidationMetrics;
}

/**
 * Validation orchestrator interface
 */
export interface IValidationOrchestrator extends IService {
  orchestrateValidation(
    config: IUnitConfiguration,
    equipment: IEquipmentAllocation[]
  ): Promise<Result<ICompleteValidationResult>>;

  addValidationStrategy(
    category: string,
    strategy: IValidationStrategy
  ): void;

  removeValidationStrategy(
    category: string,
    strategyName: string
  ): void;

  getRegisteredStrategies(): Record<string, string[]>;
}

/**
 * Validation cache interface
 */
export interface IValidationCache extends IService {
  getCachedResult(key: string): Promise<IValidationResult | null>;
  setCachedResult(key: string, result: IValidationResult): Promise<void>;
  invalidateCache(pattern?: string): Promise<void>;
  getCacheStatistics(): ICacheStatistics;
}

/**
 * Cache statistics
 */
export interface ICacheStatistics {
  readonly totalEntries: number;
  readonly hitRate: number;
  readonly missRate: number;
  readonly memoryUsage: number;
  readonly oldestEntry: Date;
  readonly newestEntry: Date;
}

/**
 * Validation reporter interface
 */
export interface IValidationReporter extends IService {
  generateReport(
    result: ICompleteValidationResult,
    format: 'json' | 'html' | 'pdf' | 'xml'
  ): Promise<Result<string>>;

  generateSummary(
    result: ICompleteValidationResult
  ): Promise<Result<IValidationSummary>>;

  generateRecommendations(
    result: ICompleteValidationResult
  ): Promise<Result<IRecommendation[]>>;
}

/**
 * Validation summary
 */
export interface IValidationSummary {
  readonly unitName: string;
  readonly overallScore: number;
  readonly totalViolations: number;
  readonly criticalViolations: number;
  readonly majorViolations: number;
  readonly minorViolations: number;
  readonly topIssues: IViolation[];
  readonly topRecommendations: IRecommendation[];
  readonly complianceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}