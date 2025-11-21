/**
 * WeightRulesValidator - Weight and tonnage validation for BattleTech construction rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles weight limits, tonnage validation, and weight distribution analysis.
 * 
 * @see TECHNICAL_ARCHITECTURE.md for service architecture patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { calculateGyroWeight } from '../../types/systemComponents';

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

export interface WeightValidationContext {
  strictMode: boolean;
  allowUnderweight: boolean;
  weightTolerance: number;
  validateDistribution: boolean;
}

export class WeightRulesValidator {
  private static readonly DEFAULT_CONTEXT: WeightValidationContext = {
    strictMode: false,
    allowUnderweight: true,
    weightTolerance: 0.1,
    validateDistribution: true
  };

  /**
   * Validate weight limits and tonnage compliance
   */
  static validateWeightLimits(
    config: UnitConfiguration, 
    equipment: any[], 
    context: Partial<WeightValidationContext> = {}
  ): WeightValidation {
    const ctx = { ...this.DEFAULT_CONTEXT, ...context };
    const violations: WeightViolation[] = [];
    const recommendations: string[] = [];
    
    const maxWeight = config.tonnage || 100;
    const totalWeight = this.calculateTotalWeight(config, equipment);
    const overweight = Math.max(0, totalWeight - maxWeight);
    const underweight = Math.max(0, maxWeight - totalWeight);
    
    // Check for overweight violations
    if (overweight > ctx.weightTolerance) {
      violations.push({
        type: 'overweight',
        component: 'Unit',
        actual: totalWeight,
        expected: maxWeight,
        severity: overweight > 5 ? 'critical' : 'major',
        message: `Unit is ${overweight.toFixed(2)} tons overweight (${totalWeight.toFixed(2)}/${maxWeight})`
      });
      recommendations.push('Remove equipment or use lighter alternatives');
      recommendations.push('Consider upgrading to XL Engine or Endo Steel structure');
    }
    
    // Check for significant underweight
    if (!ctx.allowUnderweight && underweight > maxWeight * 0.05) {
      violations.push({
        type: 'underweight',
        component: 'Unit',
        actual: totalWeight,
        expected: maxWeight,
        severity: 'minor',
        message: `Unit is ${underweight.toFixed(2)} tons underweight - consider adding more equipment`
      });
      recommendations.push('Add more armor, weapons, or equipment to utilize available tonnage');
    }
    
    // Suggest efficiency improvements for moderate underweight
    if (underweight > maxWeight * 0.1) {
      recommendations.push('Consider adding more equipment to utilize available tonnage');
      recommendations.push('Additional armor could improve survivability');
    }
    
    const distribution = this.calculateWeightDistribution(config, equipment);
    
    // Validate weight distribution if enabled
    if (ctx.validateDistribution) {
      this.validateWeightDistribution(distribution, maxWeight, violations, recommendations);
    }
    
    return {
      isValid: violations.filter(v => v.severity === 'critical').length === 0,
      totalWeight,
      maxWeight,
      overweight,
      underweight,
      distribution,
      violations,
      recommendations
    };
  }

  /**
   * Calculate total unit weight including all components
   */
  static calculateTotalWeight(config: UnitConfiguration, equipment: any[]): number {
    let totalWeight = 0;
    
    // Add structure weight
    totalWeight += this.calculateStructureWeight(config.tonnage || 100, this.extractComponentType(config.structureType));
    
    // Add engine weight
    totalWeight += this.calculateEngineWeight(config.engineRating || 0, config.engineType || 'Standard');
    
    // Add gyro weight
    totalWeight += this.calculateGyroWeight(config.engineRating || 0, this.extractComponentType(config.gyroType));
    
    // Add cockpit weight (standard)
    totalWeight += 3; // Standard cockpit weight
    
    // Add armor weight
    const totalArmor = this.calculateTotalArmorFromAllocation(config.armorAllocation) || 0;
    totalWeight += this.calculateArmorWeight(totalArmor, this.extractComponentType(config.armorType));
    
    // Add heat sink weight
    const externalHeatSinks = this.getExternalHeatSinks(equipment);
    totalWeight += this.calculateHeatSinkWeight(externalHeatSinks, this.extractComponentType(config.heatSinkType));
    
    // Add equipment weight
    totalWeight += equipment.reduce((sum, item) => sum + (item.equipmentData?.tonnage || 0), 0);
    
    return totalWeight;
  }

  /**
   * Calculate weight distribution breakdown
   */
  static calculateWeightDistribution(config: UnitConfiguration, equipment: any[]): WeightDistribution {
    const structure = this.calculateStructureWeight(config.tonnage || 100, this.extractComponentType(config.structureType));
    const totalArmor = this.calculateTotalArmorFromAllocation(config.armorAllocation) || 0;
    const armor = this.calculateArmorWeight(totalArmor, this.extractComponentType(config.armorType));
    const engine = this.calculateEngineWeight(config.engineRating || 0, config.engineType || 'Standard');
    
    const equipmentItems = equipment.filter(item => item.equipmentData?.type !== 'ammunition');
    const ammunitionItems = equipment.filter(item => item.equipmentData?.type === 'ammunition');
    
    const equipmentWeight = equipmentItems.reduce((sum, item) => sum + (item.equipmentData?.tonnage || 0), 0);
    const ammunition = ammunitionItems.reduce((sum, item) => sum + (item.equipmentData?.tonnage || 0), 0);
    
    // Systems include gyro, cockpit, heat sinks
    const gyroWeight = this.calculateGyroWeight(config.engineRating || 0, this.extractComponentType(config.gyroType));
    const cockpitWeight = 3;
    const externalHeatSinks = this.getExternalHeatSinks(equipment);
    const heatSinkWeight = this.calculateHeatSinkWeight(externalHeatSinks, this.extractComponentType(config.heatSinkType));
    const systems = gyroWeight + cockpitWeight + heatSinkWeight;
    
    return {
      structure,
      armor,
      engine,
      equipment: equipmentWeight,
      ammunition,
      systems
    };
  }

  /**
   * Validate weight distribution ratios
   */
  private static validateWeightDistribution(
    distribution: WeightDistribution, 
    maxWeight: number, 
    violations: WeightViolation[],
    recommendations: string[]
  ): void {
    const total = distribution.structure + distribution.armor + distribution.engine + 
                 distribution.equipment + distribution.ammunition + distribution.systems;
    
    // Check armor percentage
    const armorPercentage = (distribution.armor / maxWeight) * 100;
    if (armorPercentage < 15) {
      recommendations.push(`Armor is only ${armorPercentage.toFixed(1)}% of unit weight - consider adding more protection`);
    } else if (armorPercentage > 35) {
      recommendations.push(`Armor is ${armorPercentage.toFixed(1)}% of unit weight - may be excessive`);
    }
    
    // Check weapon/equipment percentage
    const weaponPercentage = (distribution.equipment / maxWeight) * 100;
    if (weaponPercentage < 20) {
      recommendations.push(`Equipment is only ${weaponPercentage.toFixed(1)}% of unit weight - consider adding more weapons`);
    } else if (weaponPercentage > 50) {
      recommendations.push(`Equipment is ${weaponPercentage.toFixed(1)}% of unit weight - may limit survivability`);
    }
    
    // Check engine percentage for different weight classes
    const enginePercentage = (distribution.engine / maxWeight) * 100;
    let expectedEngineRange = [10, 25]; // Default range
    
    if (maxWeight <= 35) {
      expectedEngineRange = [15, 35]; // Light mechs need larger engines proportionally
    } else if (maxWeight >= 80) {
      expectedEngineRange = [8, 20]; // Heavy/Assault mechs can use smaller engine percentages
    }
    
    if (enginePercentage < expectedEngineRange[0]) {
      recommendations.push(`Engine is only ${enginePercentage.toFixed(1)}% of unit weight - consider higher mobility`);
    } else if (enginePercentage > expectedEngineRange[1]) {
      recommendations.push(`Engine is ${enginePercentage.toFixed(1)}% of unit weight - may be oversized for weight class`);
    }
  }

  /**
   * Generate weight optimization suggestions
   */
  static generateWeightOptimizations(config: UnitConfiguration, equipment: any[]): string[] {
    const suggestions: string[] = [];
    const distribution = this.calculateWeightDistribution(config, equipment);
    const totalWeight = this.calculateTotalWeight(config, equipment);
    const maxWeight = config.tonnage || 100;
    
    if (totalWeight > maxWeight) {
      const overweight = totalWeight - maxWeight;
      suggestions.push(`Reduce weight by ${overweight.toFixed(2)} tons:`);
      
      // Suggest structure optimizations
      const structureType = this.extractComponentType(config.structureType);
      if (structureType === 'Standard') {
        const endoSteelSavings = distribution.structure * 0.5;
        suggestions.push(`• Switch to Endo Steel structure (saves ${endoSteelSavings.toFixed(2)} tons)`);
      }
      
      // Suggest engine optimizations
      const engineType = config.engineType || 'Standard';
      if (engineType === 'Standard') {
        const xlEngineSavings = distribution.engine * 0.5;
        suggestions.push(`• Switch to XL Engine (saves ${xlEngineSavings.toFixed(2)} tons)`);
      }
      
      // Suggest armor reductions
      if (distribution.armor > maxWeight * 0.25) {
        suggestions.push(`• Reduce armor by ${Math.min(overweight, distribution.armor * 0.1).toFixed(2)} tons`);
      }
      
      // Suggest equipment reductions
      if (distribution.equipment > maxWeight * 0.3) {
        suggestions.push(`• Remove or downgrade ${overweight.toFixed(2)} tons of equipment`);
      }
    }
    
    return suggestions;
  }

  /**
   * Calculate weight efficiency score (0-100)
   */
  static calculateWeightEfficiency(config: UnitConfiguration, equipment: any[]): number {
    const totalWeight = this.calculateTotalWeight(config, equipment);
    const maxWeight = config.tonnage || 100;
    const utilization = (totalWeight / maxWeight) * 100;
    
    // Optimal utilization is 90-98%
    if (utilization >= 90 && utilization <= 98) {
      return 100;
    } else if (utilization > 98) {
      // Penalize overweight more severely
      const penalty = Math.min(100, (utilization - 98) * 20);
      return Math.max(0, 100 - penalty);
    } else {
      // Penalize underutilization moderately
      const penalty = (90 - utilization) * 2;
      return Math.max(0, 100 - penalty);
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private static extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') return component;
    return component?.type || 'Standard';
  }

  private static calculateStructureWeight(tonnage: number, structureType: string): number {
    const baseWeight = tonnage * 0.1;
    if (structureType.includes('Endo Steel')) {
      return baseWeight * 0.5;
    } else if (structureType.includes('Reinforced')) {
      return baseWeight * 2;
    } else if (structureType.includes('Composite')) {
      return baseWeight * 0.75;
    }
    return baseWeight;
  }

  private static calculateEngineWeight(engineRating: number, engineType: string): number {
    if (engineRating <= 0) return 0;
    
    // Base engine weight calculation
    let baseWeight: number;
    if (engineRating <= 100) {
      baseWeight = Math.ceil(engineRating / 100) * 0.5;
    } else if (engineRating <= 200) {
      baseWeight = Math.ceil(engineRating / 100);
    } else if (engineRating <= 300) {
      baseWeight = Math.ceil(engineRating / 100) * 1.5;
    } else {
      baseWeight = Math.ceil(engineRating / 100) * 2;
    }
    
    // Apply engine type modifiers
    switch (engineType) {
      case 'XL':
      case 'XL (Clan)':
        return baseWeight * 0.5;
      case 'Light':
      case 'Light (Clan)':
        return baseWeight * 0.75;
      case 'Compact':
        return baseWeight * 1.5;
      case 'Fuel Cell':
        return baseWeight * 1.2;
      default:
        return baseWeight;
    }
  }

  private static calculateGyroWeight(engineRating: number, gyroType: string): number {
    const baseWeight = Math.ceil(engineRating / 100);
    
    switch (gyroType) {
      case 'XL':
        return baseWeight * 0.5;
      case 'Compact':
        return baseWeight * 1.5;
      case 'Heavy Duty':
        return baseWeight * 2;
      default:
        return baseWeight;
    }
  }

  private static calculateArmorWeight(totalArmor: number, armorType: string): number {
    if (totalArmor <= 0) return 0;
    
    const baseWeight = totalArmor / 16; // Standard armor: 16 points per ton
    
    switch (armorType) {
      case 'Ferro-Fibrous':
      case 'Ferro-Fibrous (Clan)':
        return baseWeight * (14/16); // 14 points per ton
      case 'Light Ferro-Fibrous':
        return baseWeight * (12/16); // 12 points per ton
      case 'Heavy Ferro-Fibrous':
        return baseWeight * (10/16); // 10 points per ton
      case 'Stealth':
        return baseWeight * (12/16); // 12 points per ton
      case 'Hardened':
        return baseWeight * 2; // 8 points per ton
      default:
        return baseWeight;
    }
  }

  private static calculateHeatSinkWeight(externalHeatSinks: number, heatSinkType: string): number {
    if (externalHeatSinks <= 0) return 0;
    
    switch (heatSinkType) {
      case 'Double':
      case 'Double (Clan)':
        return externalHeatSinks; // 1 ton each
      case 'Compact':
        return externalHeatSinks * 0.5; // 0.5 tons each
      case 'Laser':
        return externalHeatSinks * 1.5; // 1.5 tons each
      default:
        return externalHeatSinks; // Single heat sinks: 1 ton each
    }
  }

  private static getExternalHeatSinks(equipment: any[]): number {
    return equipment.filter(item => 
      item.equipmentData?.type === 'heat_sink' || 
      item.equipmentData?.name?.toLowerCase().includes('heat sink')
    ).length;
  }

  private static calculateTotalArmorFromAllocation(armorAllocation: any): number {
    if (!armorAllocation) return 0;
    
    let total = 0;
    const locations = ['head', 'centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    
    for (const location of locations) {
      if (armorAllocation[location]) {
        if (typeof armorAllocation[location] === 'number') {
          total += armorAllocation[location];
        } else if (armorAllocation[location].front !== undefined) {
          total += armorAllocation[location].front;
          if (armorAllocation[location].rear !== undefined) {
            total += armorAllocation[location].rear;
          }
        }
      }
    }
    
    return total;
  }

  /**
   * Get validation rules for UI display
   */
  static getValidationRules(): Array<{
    name: string;
    description: string;
    severity: string;
    category: string;
  }> {
    return [
      {
        name: 'Weight Limit',
        description: 'Unit weight must not exceed tonnage class maximum',
        severity: 'critical',
        category: 'weight'
      },
      {
        name: 'Weight Distribution',
        description: 'Weight should be distributed appropriately across components',
        severity: 'minor',
        category: 'weight'
      },
      {
        name: 'Armor Ratio',
        description: 'Armor should be 15-35% of total unit weight',
        severity: 'minor',
        category: 'weight'
      },
      {
        name: 'Equipment Balance',
        description: 'Equipment should be 20-50% of total unit weight',
        severity: 'minor',
        category: 'weight'
      }
    ];
  }
}





