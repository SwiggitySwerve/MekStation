/**
 * WeightBalanceService - Refactored facade for weight, balance, and optimization services
 * 
 * Coordinates multiple focused services to provide comprehensive weight management functionality.
 * This service now acts as a facade pattern, delegating to specialized services.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration, ArmorAllocation } from '../utils/criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../types/componentConfiguration';
import { SystemComponentsGateway } from './systemComponents/SystemComponentsGateway';
import { GyroType } from '../types/systemComponents';
import { IEquipmentInstance } from '../types/core/UnitInterfaces';

// Import focused service interfaces and types
import { 
  IWeightCalculationService,
  WeightSummary,
  ComponentWeightBreakdown,
  TonnageValidation
} from './weight/IWeightCalculationService';

import { 
  WeightOptimizationService,
  OptimizationSuggestion,
  WeightReductionOptions,
  WeightSaving,
  ArmorEfficiency,
  WeightPenalty,
  createWeightOptimizationService 
} from './weight/WeightOptimizationService';

import { 
  WeightBalanceAnalysisService,
  WeightDistribution,
  CenterOfGravity,
  StabilityAnalysis,
  createWeightBalanceAnalysisService 
} from './weight/WeightBalanceAnalysisService';

import { createWeightCalculationService } from './weight/WeightCalculationServiceFactory';

// Re-export types for backward compatibility
export type { 
  WeightSummary,
  ComponentWeightBreakdown,
  WeightDistribution,
  CenterOfGravity,
  StabilityAnalysis,
  OptimizationSuggestion,
  WeightReductionOptions,
  WeightSaving,
  TonnageValidation,
  ArmorEfficiency,
  WeightPenalty
};

export interface WeightBalanceService {
  // Total weight calculations
  calculateTotalWeight(config: UnitConfiguration, equipment: IEquipmentInstance[]): WeightSummary;
  calculateComponentWeights(config: UnitConfiguration): ComponentWeightBreakdown;
  calculateEquipmentWeight(equipment: IEquipmentInstance[]): number;
  
  // Balance analysis
  analyzeWeightDistribution(config: UnitConfiguration, equipment: IEquipmentInstance[]): WeightDistribution;
  calculateCenterOfGravity(config: UnitConfiguration, equipment: IEquipmentInstance[]): CenterOfGravity;
  analyzeStability(config: UnitConfiguration, equipment: IEquipmentInstance[]): StabilityAnalysis;
  
  // Optimization
  generateOptimizationSuggestions(config: UnitConfiguration, equipment: IEquipmentInstance[]): OptimizationSuggestion[];
  calculateWeightReduction(config: UnitConfiguration): WeightReductionOptions;
  findWeightSavings(config: UnitConfiguration, equipment: IEquipmentInstance[]): WeightSaving[];
  
  // Validation
  validateTonnageLimit(config: UnitConfiguration, equipment: IEquipmentInstance[]): TonnageValidation;
  calculateRemainingTonnage(config: UnitConfiguration, equipment: IEquipmentInstance[]): number;
  isWithinTonnageLimit(config: UnitConfiguration, equipment: IEquipmentInstance[]): boolean;
  
  // Specialized calculations
  calculateJumpJetWeight(config: UnitConfiguration): number;
  calculateArmorEfficiency(config: UnitConfiguration): ArmorEfficiency;
  calculateWeightPenalties(config: UnitConfiguration): WeightPenalty[];
}

export class WeightBalanceServiceImpl implements WeightBalanceService {
  private readonly weightCalculationService: IWeightCalculationService;
  private readonly weightOptimizationService: WeightOptimizationService;
  private readonly weightBalanceAnalysisService: WeightBalanceAnalysisService;

  constructor(
    weightCalculationService?: IWeightCalculationService,
    weightOptimizationService?: WeightOptimizationService,
    weightBalanceAnalysisService?: WeightBalanceAnalysisService
  ) {
    this.weightCalculationService = weightCalculationService || createWeightCalculationService();
    this.weightOptimizationService = weightOptimizationService || createWeightOptimizationService();
    this.weightBalanceAnalysisService = weightBalanceAnalysisService || createWeightBalanceAnalysisService();
  }
  
  // ===== DELEGATE TO FOCUSED SERVICES =====
  
  calculateTotalWeight(config: UnitConfiguration, equipment: IEquipmentInstance[]): WeightSummary {
    return this.weightCalculationService.calculateTotalWeight(config, equipment);
  }
  
  calculateComponentWeights(config: UnitConfiguration): ComponentWeightBreakdown {
    return {
      structure: this.calculateStructureWeight(config),
      engine: this.calculateEngineWeight(config),
      gyro: this.calculateGyroWeight(config),
      heatSinks: this.calculateHeatSinkWeight(config),
      armor: this.calculateArmorWeight(config),
      jumpJets: this.calculateJumpJetWeightInternal(config)
    };
  }
  
  calculateEquipmentWeight(equipment: IEquipmentInstance[]): number {
    return equipment.reduce((total, item) => {
      if (!item || !item.equipment) return total;
      return total + (item.equipment.weight || 0) * (item.quantity || 1);
    }, 0);
  }
  
  // ===== BALANCE ANALYSIS =====
  
  analyzeWeightDistribution(config: UnitConfiguration, equipment: IEquipmentInstance[]): WeightDistribution {
    const distribution = this.calculateLocationWeights(config, equipment);
    
    // Calculate balance ratios
    const frontWeight = distribution.head + distribution.centerTorso * 0.6 + 
                       distribution.leftArm * 0.5 + distribution.rightArm * 0.5;
    const rearWeight = distribution.centerTorso * 0.4 + distribution.leftTorso + 
                      distribution.rightTorso + distribution.leftLeg + distribution.rightLeg;
    const leftWeight = distribution.leftTorso + distribution.leftArm + distribution.leftLeg;
    const rightWeight = distribution.rightTorso + distribution.rightArm + distribution.rightLeg;
    
    const totalWeight = frontWeight + rearWeight;
    const frontToRear = totalWeight > 0 ? (frontWeight - rearWeight) / totalWeight : 0;
    const leftToRight = totalWeight > 0 ? (leftWeight - rightWeight) / totalWeight : 0;
    
    return {
      frontHeavy: frontToRear > 0.15,
      rearHeavy: frontToRear < -0.15,
      leftHeavy: leftToRight > 0.1,
      rightHeavy: leftToRight < -0.1,
      distribution,
      balance: {
        frontToRear,
        leftToRight
      }
    };
  }
  
  calculateCenterOfGravity(config: UnitConfiguration, equipment: IEquipmentInstance[]): CenterOfGravity {
    const distribution = this.calculateLocationWeights(config, equipment);
    const totalWeight = Object.values(distribution).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight === 0) {
      return {
        x: 0, y: 0, z: 0,
        stability: 'unstable',
        recommendations: ['Add weight to stabilize unit']
      };
    }
    
    // Calculate weighted center positions (simplified model)
    const x = (distribution.rightTorso + distribution.rightArm + distribution.rightLeg - 
              distribution.leftTorso - distribution.leftArm - distribution.leftLeg) / totalWeight;
    const y = (distribution.centerTorso * 0.2 + distribution.head * 0.5 - 
              distribution.leftTorso * 0.3 - distribution.rightTorso * 0.3 - 
              distribution.leftLeg * 0.8 - distribution.rightLeg * 0.8) / totalWeight;
    const z = (distribution.head * 0.9 + distribution.centerTorso * 0.6 + 
              distribution.leftTorso * 0.6 + distribution.rightTorso * 0.6 +
              distribution.leftArm * 0.4 + distribution.rightArm * 0.4) / totalWeight;
    
    const stability = this.calculateStabilityRating(x, y, z);
    const recommendations = this.generateStabilityRecommendations(x, y, z);
    
    return { x, y, z, stability, recommendations };
  }
  
  analyzeStability(config: UnitConfiguration, equipment: IEquipmentInstance[]): StabilityAnalysis {
    const distribution = this.analyzeWeightDistribution(config, equipment);
    const centerOfGravity = this.calculateCenterOfGravity(config, equipment);
    
    // Calculate stability scores
    const balanceScore = this.calculateBalanceScore(distribution);
    const weightDistributionScore = this.calculateWeightDistributionScore(distribution);
    const structuralIntegrityScore = this.calculateStructuralIntegrityScore(config);
    
    const overallStability = (balanceScore + weightDistributionScore + structuralIntegrityScore) / 3;
    
    const recommendations = this.generateStabilityRecommendations(
      centerOfGravity.x, centerOfGravity.y, centerOfGravity.z
    );
    const warnings = this.generateStabilityWarnings(distribution, overallStability);
    
    return {
      overallStability,
      balanceScore,
      weightDistributionScore,
      structuralIntegrityScore,
      recommendations,
      warnings
    };
  }
  
  // ===== OPTIMIZATION =====
  
  generateOptimizationSuggestions(config: UnitConfiguration, equipment: IEquipmentInstance[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const weights = this.calculateComponentWeights(config);
    
    // Engine optimization
    suggestions.push(...this.generateEngineOptimizations(config, weights.engine));
    
    // Structure optimization
    suggestions.push(...this.generateStructureOptimizations(config, weights.structure));
    
    // Armor optimization
    suggestions.push(...this.generateArmorOptimizations(config, weights.armor));
    
    // Heat sink optimization
    suggestions.push(...this.generateHeatSinkOptimizations(config, weights.heatSinks));
    
    // Equipment optimization
    suggestions.push(...this.generateEquipmentOptimizations(equipment));
    
    // Sort by priority and weight savings
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.weightSavings - a.weightSavings;
    });
  }
  
  calculateWeightReduction(config: UnitConfiguration): WeightReductionOptions {
    const structureUpgrade = this.analyzeStructureUpgrade(config);
    const engineDowngrade = this.analyzeEngineDowngrade(config);
    const armorOptimization = this.analyzeArmorOptimization(config);
    const equipmentAlternatives = this.analyzeEquipmentAlternatives(config);
    
    return {
      structureUpgrade,
      engineDowngrade,
      armorOptimization,
      equipmentAlternatives
    };
  }
  
  findWeightSavings(config: UnitConfiguration, equipment: IEquipmentInstance[]): WeightSaving[] {
    const savings: WeightSaving[] = [];
    
    // Structure savings
    savings.push(...this.findStructureSavings(config));
    
    // Engine savings
    savings.push(...this.findEngineSavings(config));
    
    // Armor savings
    savings.push(...this.findArmorSavings(config));
    
    // Equipment savings
    savings.push(...this.findEquipmentSavings(equipment));
    
    return savings.filter(saving => saving.savings > 0).sort((a, b) => b.savings - a.savings);
  }
  
  // ===== VALIDATION =====
  
  validateTonnageLimit(config: UnitConfiguration, equipment: IEquipmentInstance[]): TonnageValidation {
    const totalWeight = this.calculateTotalWeight(config, equipment);
    const overweight = Math.max(0, totalWeight.totalWeight - config.tonnage);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    if (overweight > 0) {
      errors.push(`Unit is ${overweight.toFixed(2)} tons overweight`);
      suggestions.push(...this.generateWeightReductionSuggestions(overweight));
    }
    
    if (totalWeight.percentageUsed > 95) {
      warnings.push('Unit is using more than 95% of available tonnage');
      suggestions.push('Consider weight optimization for future equipment additions');
    }
    
    return {
      isValid: overweight === 0,
      currentWeight: totalWeight.totalWeight,
      maxTonnage: config.tonnage,
      overweight,
      errors,
      warnings,
      suggestions
    };
  }
  
  calculateRemainingTonnage(config: UnitConfiguration, equipment: IEquipmentInstance[]): number {
    const totalWeight = this.calculateTotalWeight(config, equipment);
    return Math.max(0, config.tonnage - totalWeight.totalWeight);
  }
  
  isWithinTonnageLimit(config: UnitConfiguration, equipment: IEquipmentInstance[]): boolean {
    const totalWeight = this.calculateTotalWeight(config, equipment);
    return totalWeight.totalWeight <= config.tonnage;
  }
  
  // ===== SPECIALIZED CALCULATIONS =====
  
  calculateJumpJetWeight(config: UnitConfiguration): number {
    if (config.jumpMP === 0) return 0;
    
    // Calculate based on tonnage and jump MP
    const baseWeight = Math.ceil(config.tonnage / 10) * config.jumpMP * 0.5;
    
    // Apply jump jet type modifiers
    const jumpJetType = this.extractComponentType(config.jumpJetType);
    switch (jumpJetType) {
      case 'Improved Jump Jet':
        return baseWeight * 2;
      case 'Mechanical Jump Booster':
        return baseWeight * 0.5;
      case 'Standard Jump Jet':
      default:
        return baseWeight;
    }
  }
  
  calculateArmorEfficiency(config: UnitConfiguration): ArmorEfficiency {
    const armorType = this.extractComponentType(config.armorType);
    const basePointsPerTon = armorType === 'Ferro-Fibrous' ? 35.2 : 32;
    
    const totalPoints = this.calculateTotalArmorPoints(config.armorAllocation);
    const totalWeight = config.armorTonnage || 0;
    const pointsPerTon = totalWeight > 0 ? totalPoints / totalWeight : 0;
    
    const maxPossiblePoints = Math.floor(config.tonnage * 0.4 * basePointsPerTon);
    const utilizationPercentage = maxPossiblePoints > 0 ? (totalPoints / maxPossiblePoints) * 100 : 0;
    
    let efficiency: ArmorEfficiency['efficiency'];
    if (pointsPerTon >= basePointsPerTon * 0.95) efficiency = 'excellent';
    else if (pointsPerTon >= basePointsPerTon * 0.85) efficiency = 'good';
    else if (pointsPerTon >= basePointsPerTon * 0.7) efficiency = 'average';
    else efficiency = 'poor';
    
    const recommendations = this.generateArmorEfficiencyRecommendations(
      efficiency, utilizationPercentage, armorType
    );
    
    return {
      totalPoints,
      totalWeight,
      pointsPerTon,
      efficiency,
      maxPossiblePoints,
      utilizationPercentage,
      recommendations
    };
  }
  
  calculateWeightPenalties(config: UnitConfiguration): WeightPenalty[] {
    const penalties: WeightPenalty[] = [];
    
    // Check for inefficient combinations
    if (config.engineType === 'Standard' && config.tonnage <= 35) {
      penalties.push({
        component: 'Engine',
        reason: 'Standard engine on light mech',
        penalty: 2,
        description: 'Standard engines are heavy for light mechs',
        canBeAvoided: true,
        suggestion: 'Consider XL or Light engine for weight savings'
      });
    }
    
    if (this.extractComponentType(config.structureType) === 'Standard' && config.tonnage >= 75) {
      penalties.push({
        component: 'Structure',
        reason: 'Standard structure on heavy mech',
        penalty: Math.ceil(config.tonnage / 20),
        description: 'Standard structure is inefficient on heavy mechs',
        canBeAvoided: true,
        suggestion: 'Upgrade to Endo Steel structure for significant weight savings'
      });
    }
    
    return penalties;
  }
  
  // ===== PRIVATE HELPER METHODS =====
  
  private extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') return component;
    return component.type;
  }

  /**
   * Type-safe armor location property accessor
   */
  private static getLocationArmorPoints(location: { front?: number; rear?: number }): { front: number; rear: number } {
    return {
      front: location?.front || 0,
      rear: location?.rear || 0
    };
  }

  /**
   * Type-safe calculation of total armor points from armor allocation
   */
  private static calculateTotalArmorPointsSafe(armorAllocation: ArmorAllocation | any): number {
    if (!armorAllocation) return 0;

    // Type-safe approach using known armor allocation structure
    const locations = ['HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'] as const;
    
    return locations.reduce((total, locationKey) => {
      const location = armorAllocation[locationKey];
      if (!location || typeof location !== 'object') return total;
      
      const armorPoints = WeightBalanceServiceImpl.getLocationArmorPoints(location);
      return total + armorPoints.front + armorPoints.rear;
    }, 0);
  }
  
  private calculateStructureWeight(config: UnitConfiguration): ComponentWeightBreakdown['structure'] {
    const structureType = this.extractComponentType(config.structureType);
    const baseWeight = Math.ceil(config.tonnage / 10);
    
    let weight: number;
    let efficiency: number;
    
    switch (structureType) {
      case 'Endo Steel':
      case 'Endo Steel (Clan)':
        weight = baseWeight * 0.5;
        efficiency = 2.0;
        break;
      case 'Composite':
        weight = baseWeight * 0.5;
        efficiency = 2.0;
        break;
      case 'Reinforced':
        weight = baseWeight * 2.0;
        efficiency = 0.5;
        break;
      case 'Standard':
      default:
        weight = baseWeight;
        efficiency = 1.0;
        break;
    }
    
    return { weight, type: structureType, efficiency };
  }
  
  private calculateEngineWeight(config: UnitConfiguration): ComponentWeightBreakdown['engine'] {
    const baseWeight = config.engineRating / 25;
    let weight: number;
    let efficiency: number;
    
    switch (config.engineType) {
      case 'XL':
        weight = baseWeight * 0.5;
        efficiency = 2.0;
        break;
      case 'Light':
        weight = baseWeight * 0.75;
        efficiency = 1.33;
        break;
      case 'XXL':
        weight = baseWeight * 0.33;
        efficiency = 3.0;
        break;
      case 'Compact':
        weight = baseWeight * 1.5;
        efficiency = 0.67;
        break;
      case 'ICE':
      case 'Fuel Cell':
        weight = baseWeight * 2.0;
        efficiency = 0.5;
        break;
      case 'Standard':
      default:
        weight = baseWeight;
        efficiency = 1.0;
        break;
    }
    
    return {
      weight,
      type: config.engineType,
      rating: config.engineRating,
      efficiency
    };
  }
  
  private calculateGyroWeight(config: UnitConfiguration): ComponentWeightBreakdown['gyro'] {
    const gyroType = this.extractComponentType(config.gyroType);
    
    // MIGRATED: Use SystemComponentsGateway for gyro weight calculation
    const validGyroTypes = ['Standard', 'XL', 'Compact', 'Heavy-Duty'];
    const safeGyroType = validGyroTypes.includes(gyroType) ? gyroType : 'Standard';
    
    // Map gyro type to ID
    const gyroIdMap: Record<string, string> = {
      'Standard': 'standard_gyro',
      'XL': 'xl_gyro',
      'Compact': 'compact_gyro',
      'Heavy-Duty': 'heavy_duty_gyro'
    };
    
    const gyroId = gyroIdMap[safeGyroType] || 'standard_gyro';
    let weight: number;
    try {
      weight = SystemComponentsGateway.calculateGyroWeight(gyroId, config.engineRating);
    } catch (error) {
      // Fallback to standard calculation if gateway fails
      weight = Math.ceil(config.engineRating / 100);
    }
    
    let efficiency: number;
    
    switch (gyroType) {
      case 'XL':
        efficiency = 2.0;
        break;
      case 'Compact':
        efficiency = 0.67;
        break;
      case 'Heavy-Duty':
        efficiency = 0.5;
        break;
      case 'Standard':
      default:
        efficiency = 1.0;
        break;
    }
    
    return { weight, type: gyroType, efficiency };
  }
  
  private calculateHeatSinkWeight(config: UnitConfiguration): ComponentWeightBreakdown['heatSinks'] {
    const heatSinkType = this.extractComponentType(config.heatSinkType);
    const internal = config.internalHeatSinks || 0;
    const external = config.externalHeatSinks || 0;
    
    let externalWeight: number;
    let efficiency: number;
    
    switch (heatSinkType) {
      case 'Double':
      case 'Double (Clan)':
        externalWeight = external * 1.0;
        efficiency = 2.0;
        break;
      case 'Compact':
        externalWeight = external * 0.5;
        efficiency = 1.0;
        break;
      case 'Laser':
        externalWeight = external * 1.5;
        efficiency = 1.0;
        break;
      case 'Single':
      default:
        externalWeight = external * 1.0;
        efficiency = 1.0;
        break;
    }
    
    return {
      internal: 0, // Internal heat sinks don't add weight
      external: externalWeight,
      total: externalWeight,
      type: heatSinkType,
      efficiency
    };
  }
  
  private calculateArmorWeight(config: UnitConfiguration): ComponentWeightBreakdown['armor'] {
    const armorType = this.extractComponentType(config.armorType);
    const weight = config.armorTonnage || 0;
    const points = this.calculateTotalArmorPoints(config.armorAllocation);
    
    let efficiency: number;
    switch (armorType) {
      case 'Ferro-Fibrous':
      case 'Ferro-Fibrous (Clan)':
        efficiency = 35.2 / 32; // ~1.1
        break;
      case 'Hardened':
        efficiency = 0.5; // Half points per ton but double protection
        break;
      case 'Standard':
      default:
        efficiency = 1.0;
        break;
    }
    
    return { weight, type: armorType, points, efficiency };
  }
  
  private calculateLocationWeights(config: UnitConfiguration, equipment: IEquipmentInstance[]) {
    // Simplified location weight calculation
    const baseWeights = {
      head: config.tonnage * 0.05,
      centerTorso: config.tonnage * 0.25,
      leftTorso: config.tonnage * 0.15,
      rightTorso: config.tonnage * 0.15,
      leftArm: config.tonnage * 0.1,
      rightArm: config.tonnage * 0.1,
      leftLeg: config.tonnage * 0.1,
      rightLeg: config.tonnage * 0.1
    };
    
    // Add equipment weights to locations
    // This is simplified - in reality we'd need to track equipment locations
    return baseWeights;
  }
  
  private calculateTotalArmorPoints(armorAllocation: ArmorAllocation | any): number {
    return WeightBalanceServiceImpl.calculateTotalArmorPointsSafe(armorAllocation);
  }
  
  private extractEquipmentWeight(equipment: IEquipmentInstance[]): number {
    return equipment.reduce((total, item) => {
      if (!item?.equipment || item.equipment.type === 'ammunition') return total;
      return total + (item.equipment.weight || 0) * (item.quantity || 1);
    }, 0);
  }
  
  private extractAmmoWeight(equipment: IEquipmentInstance[]): number {
    return equipment.reduce((total, item) => {
      if (!item?.equipment || item.equipment.type !== 'ammunition') return total;
      return total + (item.equipment.weight || 0) * (item.quantity || 1);
    }, 0);
  }
  
  private calculateStabilityRating(x: number, y: number, z: number): CenterOfGravity['stability'] {
    const deviation = Math.sqrt(x * x + y * y + z * z);
    
    if (deviation < 0.1) return 'excellent';
    if (deviation < 0.2) return 'good';
    if (deviation < 0.4) return 'acceptable';
    if (deviation < 0.6) return 'poor';
    return 'unstable';
  }
  
  private generateStabilityRecommendations(x: number, y: number, z: number): string[] {
    const recommendations: string[] = [];
    
    if (Math.abs(x) > 0.2) {
      recommendations.push(x > 0 ? 
        'Move weight from right side to left side' : 
        'Move weight from left side to right side'
      );
    }
    
    if (Math.abs(y) > 0.2) {
      recommendations.push(y > 0 ? 
        'Move weight from rear to front' : 
        'Move weight from front to rear'
      );
    }
    
    if (z > 0.3) {
      recommendations.push('Lower center of gravity by moving equipment to legs/torso');
    }
    
    return recommendations;
  }
  
  private calculateBalanceScore(distribution: WeightDistribution): number {
    let score = 100;
    
    if (distribution.frontHeavy || distribution.rearHeavy) score -= 15;
    if (distribution.leftHeavy || distribution.rightHeavy) score -= 10;
    
    return Math.max(0, score);
  }
  
  private calculateWeightDistributionScore(distribution: WeightDistribution): number {
    const totalWeight = Object.values(distribution.distribution).reduce((sum: number, w: any) => sum + (w as number), 0);
    if (totalWeight === 0) return 0;
    
    // Check for reasonable distribution
    let score = 100;
    
    // Center torso should carry significant weight
    const ctRatio = distribution.distribution.centerTorso / totalWeight;
    if (ctRatio < 0.2) score -= 20; // Too little weight in center
    if (ctRatio > 0.4) score -= 10; // Too much weight in center
    
    return Math.max(0, score);
  }
  
  private calculateStructuralIntegrityScore(config: UnitConfiguration): number {
    let score = 100;
    
    // Check for structural vulnerabilities
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Standard' && config.tonnage >= 75) score -= 15;
    
    // Check engine vulnerability
    if (config.engineType === 'XL' || config.engineType === 'XXL') score -= 10;
    
    return Math.max(0, score);
  }
  
  private generateStabilityWarnings(distribution: WeightDistribution, stability: number): string[] {
    const warnings: string[] = [];
    
    if (stability < 50) {
      warnings.push('Poor overall stability - unit may be prone to falling');
    }
    
    if (distribution.frontHeavy) {
      warnings.push('Front-heavy design may affect movement');
    }
    
    if (distribution.rearHeavy) {
      warnings.push('Rear-heavy design may affect turning');
    }
    
    return warnings;
  }
  
  private generateEngineOptimizations(config: UnitConfiguration, engine: ComponentWeightBreakdown['engine']): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    if (config.engineType === 'Standard' && config.tonnage <= 50) {
      const xlWeight = engine.weight * 0.5;
      suggestions.push({
        category: 'engine',
        type: 'weight_reduction',
        description: 'Upgrade to XL Engine for significant weight savings',
        currentWeight: engine.weight,
        suggestedWeight: xlWeight,
        weightSavings: engine.weight - xlWeight,
        impact: 'Reduced survivability but major weight savings',
        difficulty: 'moderate',
        priority: 'high'
      });
    }
    
    return suggestions;
  }
  
  private generateStructureOptimizations(config: UnitConfiguration, structure: ComponentWeightBreakdown['structure']): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    if (structure.type === 'Standard' && config.tonnage >= 50) {
      const endoWeight = structure.weight * 0.5;
      suggestions.push({
        category: 'structure',
        type: 'weight_reduction',
        description: 'Upgrade to Endo Steel structure',
        currentWeight: structure.weight,
        suggestedWeight: endoWeight,
        weightSavings: structure.weight - endoWeight,
        impact: 'Uses critical slots but saves significant weight',
        difficulty: 'easy',
        priority: 'high'
      });
    }
    
    return suggestions;
  }
  
  private generateArmorOptimizations(config: UnitConfiguration, armor: ComponentWeightBreakdown['armor']): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    if (armor.type === 'Standard') {
      const ferroWeight = armor.weight * (32 / 35.2);
      suggestions.push({
        category: 'armor',
        type: 'efficiency_improvement',
        description: 'Upgrade to Ferro-Fibrous armor for more protection per ton',
        currentWeight: armor.weight,
        suggestedWeight: ferroWeight,
        weightSavings: armor.weight - ferroWeight,
        impact: 'Uses critical slots but improves armor efficiency',
        difficulty: 'easy',
        priority: 'medium'
      });
    }
    
    return suggestions;
  }
  
  private generateHeatSinkOptimizations(config: UnitConfiguration, heatSinks: ComponentWeightBreakdown['heatSinks']): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    if (heatSinks.type === 'Single' && heatSinks.external > 0) {
      const doubleCount = Math.ceil(heatSinks.external / 2);
      const doubleWeight = doubleCount * 1.0;
      suggestions.push({
        category: 'heatsinks',
        type: 'efficiency_improvement',
        description: 'Upgrade to Double Heat Sinks for better heat dissipation',
        currentWeight: heatSinks.external,
        suggestedWeight: doubleWeight,
        weightSavings: heatSinks.external - doubleWeight,
        impact: 'Improved heat management with weight savings',
        difficulty: 'easy',
        priority: 'medium'
      });
    }
    
    return suggestions;
  }
  
  private generateEquipmentOptimizations(equipment: IEquipmentInstance[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // This would analyze equipment for weight optimization opportunities
    // Implementation depends on equipment data structure
    
    return suggestions;
  }
  
  private analyzeStructureUpgrade(config: UnitConfiguration) {
    const currentType = this.extractComponentType(config.structureType);
    const currentWeight = Math.ceil(config.tonnage / 10);
    
    if (currentType === 'Standard') {
      const newWeight = currentWeight * 0.5;
      return {
        available: true,
        currentWeight,
        newWeight,
        savings: currentWeight - newWeight,
        cost: '14 critical slots'
      };
    }
    
    return {
      available: false,
      currentWeight,
      newWeight: currentWeight,
      savings: 0,
      cost: 'Already using advanced structure'
    };
  }
  
  private analyzeEngineDowngrade(config: UnitConfiguration) {
    const options = [];
    const currentRating = config.engineRating;
    
    for (let rating = currentRating - 25; rating >= Math.max(25, config.tonnage); rating -= 25) {
      const walkMP = Math.floor(rating / config.tonnage);
      if (walkMP >= 1) {
        options.push({
          rating,
          weight: rating / 25,
          savings: (currentRating - rating) / 25,
          walkMP
        });
      }
    }
    
    return {
      available: options.length > 0,
      options
    };
  }
  
  private analyzeArmorOptimization(config: UnitConfiguration) {
    const currentWeight = config.armorTonnage || 0;
    const maxReduction = Math.min(currentWeight * 0.25, 2); // Max 25% or 2 tons
    
    return {
      available: currentWeight > 2,
      maxReduction,
      recommendations: [
        'Reduce armor on less critical locations',
        'Balance protection vs. weight trade-offs'
      ]
    };
  }
  
  private analyzeEquipmentAlternatives(config: UnitConfiguration) {
    return {
      available: false,
      suggestions: []
    };
  }
  
  private findStructureSavings(config: UnitConfiguration): WeightSaving[] {
    const savings: WeightSaving[] = [];
    const currentType = this.extractComponentType(config.structureType);
    
    if (currentType === 'Standard') {
      const currentWeight = Math.ceil(config.tonnage / 10);
      const newWeight = currentWeight * 0.5;
      
      savings.push({
        component: 'Structure',
        currentWeight,
        proposedWeight: newWeight,
        savings: currentWeight - newWeight,
        method: 'Upgrade to Endo Steel',
        tradeoffs: ['Uses 14 critical slots'],
        feasible: true
      });
    }
    
    return savings;
  }
  
  private findEngineSavings(config: UnitConfiguration): WeightSaving[] {
    const savings: WeightSaving[] = [];
    
    if (config.engineType === 'Standard') {
      const currentWeight = config.engineRating / 25;
      const xlWeight = currentWeight * 0.5;
      
      savings.push({
        component: 'Engine',
        currentWeight,
        proposedWeight: xlWeight,
        savings: currentWeight - xlWeight,
        method: 'Upgrade to XL Engine',
        tradeoffs: ['Reduced survivability', 'Uses side torso slots'],
        feasible: true
      });
    }
    
    return savings;
  }
  
  private findArmorSavings(config: UnitConfiguration): WeightSaving[] {
    const savings: WeightSaving[] = [];
    const currentWeight = config.armorTonnage || 0;
    
    if (currentWeight > 3) {
      const reduction = Math.min(currentWeight * 0.2, 2);
      
      savings.push({
        component: 'Armor',
        currentWeight,
        proposedWeight: currentWeight - reduction,
        savings: reduction,
        method: 'Optimize armor allocation',
        tradeoffs: ['Reduced protection'],
        feasible: true
      });
    }
    
    return savings;
  }
  
  private findEquipmentSavings(equipment: IEquipmentInstance[]): WeightSaving[] {
    return []; // Implementation depends on equipment data structure
  }
  
  private generateWeightReductionSuggestions(overweight: number): string[] {
    const suggestions: string[] = [];
    
    if (overweight <= 2) {
      suggestions.push('Remove or reduce ammunition loads');
      suggestions.push('Optimize armor allocation');
    } else if (overweight <= 5) {
      suggestions.push('Consider engine downgrade');
      suggestions.push('Upgrade to advanced structure (Endo Steel)');
    } else {
      suggestions.push('Major redesign required');
      suggestions.push('Consider XL engine upgrade');
      suggestions.push('Reduce equipment loadout');
    }
    
    return suggestions;
  }
  
  private generateArmorEfficiencyRecommendations(
    efficiency: ArmorEfficiency['efficiency'],
    utilization: number,
    armorType: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (efficiency === 'poor') {
      recommendations.push('Consider upgrading to Ferro-Fibrous armor');
    }
    
    if (utilization < 70) {
      recommendations.push('Increase armor allocation for better protection');
    }
    
    if (armorType === 'Standard' && utilization > 80) {
      recommendations.push('Ferro-Fibrous armor would provide more protection for same weight');
    }
    
    return recommendations;
  }
  
  private calculateJumpJetWeightInternal(config: UnitConfiguration): ComponentWeightBreakdown['jumpJets'] {
    if (config.jumpMP === 0) {
      return {
        weight: 0,
        count: 0,
        type: 'None',
        efficiency: 0
      };
    }
    
    const count = config.jumpMP;
    const jumpJetType = this.extractComponentType(config.jumpJetType);
    const baseWeight = Math.ceil(config.tonnage / 10) * count * 0.5;
    
    let weight: number;
    let efficiency: number;
    
    switch (jumpJetType) {
      case 'Improved Jump Jet':
        weight = baseWeight * 2;
        efficiency = 0.5;
        break;
      case 'Mechanical Jump Booster':
        weight = baseWeight * 0.5;
        efficiency = 2.0;
        break;
      case 'Standard Jump Jet':
      default:
        weight = baseWeight;
        efficiency = 1.0;
        break;
    }
    
    return { weight, count, type: jumpJetType, efficiency };
  }
}

// Export factory function for dependency injection
export const createWeightBalanceService = (): WeightBalanceService => {
  return new WeightBalanceServiceImpl();
};





