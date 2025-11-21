/**
 * WeightValidator - Single Responsibility Principle compliant weight validation implementation
 * 
 * This class is responsible ONLY for weight-related validation logic.
 * Extracted from the monolithic ConstructionRulesValidator to follow SOLID principles.
 */

import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../../types/componentConfiguration';
import { 
  IWeightValidator, 
  WeightValidation, 
  WeightDistribution, 
  WeightBreakdown, 
  WeightViolation, 
  WeightItem 
} from './IWeightValidator';

export class WeightValidator implements IWeightValidator {

  private readonly WEIGHT_TOLERANCE = 0.01; // 0.01 ton tolerance for floating point comparisons
  private readonly MINIMUM_WEIGHT_PERCENTAGE = 0.95; // 95% of tonnage
  private readonly OPTIMAL_WEIGHT_PERCENTAGE = 0.98; // 98% of tonnage

  /**
   * Validates overall weight limits and distribution
   */
  validateWeight(config: UnitConfiguration, equipment: any[]): WeightValidation {
    const totalWeight = this.calculateTotalWeight(config, equipment);
    const maxWeight = config.tonnage || 100;
    const minWeight = maxWeight * this.MINIMUM_WEIGHT_PERCENTAGE;
    
    const overweight = Math.max(0, totalWeight - maxWeight);
    const underweight = Math.max(0, minWeight - totalWeight);
    
    const distribution = this.validateWeightDistribution(config, equipment);
    const violations: WeightViolation[] = [];
    const recommendations: string[] = [];

    // Check overweight
    if (overweight > this.WEIGHT_TOLERANCE) {
      violations.push({
        type: 'overweight',
        component: 'unit',
        actual: totalWeight,
        expected: maxWeight,
        severity: 'critical',
        message: `Unit is overweight by ${overweight.toFixed(2)} tons (${totalWeight.toFixed(2)}/${maxWeight} tons)`,
        suggestedFix: `Remove ${overweight.toFixed(2)} tons of equipment or increase unit tonnage`,
        impact: 'Unit cannot be fielded due to weight violation'
      });
    }

    // Check underweight
    if (underweight > this.WEIGHT_TOLERANCE) {
      violations.push({
        type: 'underweight',
        component: 'unit',
        actual: totalWeight,
        expected: minWeight,
        severity: 'major',
        message: `Unit is underweight by ${underweight.toFixed(2)} tons (${totalWeight.toFixed(2)}/${minWeight.toFixed(2)} tons minimum)`,
        suggestedFix: `Add ${underweight.toFixed(2)} tons of equipment or reduce unit tonnage`,
        impact: 'Unit is not utilizing its full potential'
      });
    }

    // Generate recommendations based on weight utilization
    const utilization = (totalWeight / maxWeight) * 100;
    if (utilization < 90) {
      recommendations.push('Consider adding more equipment to better utilize unit capacity');
    } else if (utilization > 99) {
      recommendations.push('Unit is very close to weight limit - consider weight optimization');
    }

    // Check for component weight violations
    this.validateComponentWeights(config, equipment, violations);

    const isValid = violations.filter(v => v.severity === 'critical').length === 0;
    const efficiency = this.calculateWeightEfficiency(totalWeight, maxWeight);

    return {
      isValid,
      totalWeight,
      maxWeight,
      overweight,
      underweight,
      distribution,
      violations,
      recommendations,
      efficiency
    };
  }

  /**
   * Validates minimum weight requirements
   */
  validateMinimumWeight(config: UnitConfiguration, equipment: any[]): WeightValidation {
    const totalWeight = this.calculateTotalWeight(config, equipment);
    const maxWeight = config.tonnage || 100;
    const minWeight = maxWeight * this.MINIMUM_WEIGHT_PERCENTAGE;
    
    const underweight = Math.max(0, minWeight - totalWeight);
    const distribution = this.validateWeightDistribution(config, equipment);
    const violations: WeightViolation[] = [];
    const recommendations: string[] = [];

    if (underweight > this.WEIGHT_TOLERANCE) {
      violations.push({
        type: 'underweight',
        component: 'unit',
        actual: totalWeight,
        expected: minWeight,
        severity: 'major',
        message: `Unit does not meet minimum weight requirement of ${minWeight.toFixed(2)} tons`,
        suggestedFix: `Add ${underweight.toFixed(2)} tons of equipment`,
        impact: 'Unit may not meet combat effectiveness standards'
      });

      recommendations.push('Consider adding armor, weapons, or ammunition to reach minimum weight');
      recommendations.push('Verify that all required components are installed');
    }

    return {
      isValid: violations.length === 0,
      totalWeight,
      maxWeight,
      overweight: 0,
      underweight,
      distribution,
      violations,
      recommendations,
      efficiency: this.calculateWeightEfficiency(totalWeight, maxWeight)
    };
  }

  /**
   * Validates weight distribution across components
   */
  validateWeightDistribution(config: UnitConfiguration, equipment: any[]): WeightDistribution {
    const breakdown = this.calculateWeightBreakdown(config, equipment);
    
    return {
      structure: breakdown.components.structure?.weight || 0,
      armor: breakdown.components.armor?.weight || 0,
      engine: breakdown.components.engine?.weight || 0,
      equipment: breakdown.components.equipment?.weight || 0,
      ammunition: breakdown.components.ammunition?.weight || 0,
      systems: breakdown.components.systems?.weight || 0,
      jumpJets: breakdown.components.jumpJets?.weight || 0,
      heatSinks: breakdown.components.heatSinks?.weight || 0,
      weapons: breakdown.components.weapons?.weight || 0,
      total: breakdown.summary.totalWeight
    };
  }

  /**
   * Calculates total weight of the unit
   */
  calculateTotalWeight(config: UnitConfiguration, equipment: any[]): number {
    let totalWeight = 0;

    // Structure weight
    totalWeight += this.calculateStructureWeight(config);

    // Armor weight
    totalWeight += this.calculateArmorWeight(config);

    // Engine weight
    totalWeight += this.calculateEngineWeight(config);

    // Gyro weight
    totalWeight += this.calculateGyroWeight(config);

    // Cockpit weight
    totalWeight += this.calculateCockpitWeight(config);

    // Equipment weight
    totalWeight += this.calculateEquipmentWeight(equipment);

    return Math.round(totalWeight * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculates detailed weight breakdown by component type
   */
  calculateWeightBreakdown(config: UnitConfiguration, equipment: any[]): WeightBreakdown {
    const components: { [componentType: string]: { weight: number; percentage: number; items: WeightItem[] } } = {};
    
    // Initialize component categories
    const categories = ['structure', 'armor', 'engine', 'gyro', 'cockpit', 'weapons', 'ammunition', 'heatSinks', 'jumpJets', 'equipment', 'systems'];
    categories.forEach(category => {
      components[category] = { weight: 0, percentage: 0, items: [] };
    });

    // Calculate structure
    const structureWeight = this.calculateStructureWeight(config);
    components.structure.weight = structureWeight;
    components.structure.items.push({
      name: this.extractComponentType(config.structureType) || 'Standard Structure',
      type: 'structure',
      weight: structureWeight,
      isFixed: true
    });

    // Calculate armor
    const armorWeight = this.calculateArmorWeight(config);
    components.armor.weight = armorWeight;
    components.armor.items.push({
      name: this.extractComponentType(config.armorType) || 'Standard Armor',
      type: 'armor',
      weight: armorWeight,
      isFixed: true
    });

    // Calculate engine
    const engineWeight = this.calculateEngineWeight(config);
    components.engine.weight = engineWeight;
    components.engine.items.push({
      name: `${config.engineRating} ${this.extractComponentType(config.engineType)} Engine`,
      type: 'engine',
      weight: engineWeight,
      isFixed: true
    });

    // Calculate gyro
    const gyroWeight = this.calculateGyroWeight(config);
    components.gyro.weight = gyroWeight;
    components.systems.weight += gyroWeight;
    components.systems.items.push({
      name: this.extractComponentType(config.gyroType) || 'Standard Gyro',
      type: 'gyro',
      weight: gyroWeight,
      isFixed: true
    });

    // Calculate cockpit
    const cockpitWeight = this.calculateCockpitWeight(config);
    components.cockpit.weight = cockpitWeight;
    components.systems.weight += cockpitWeight;
    components.systems.items.push({
      name: 'Cockpit',
      type: 'cockpit',
      weight: cockpitWeight,
      isFixed: true
    });

    // Process equipment
    equipment.forEach(item => {
      const itemWeight = item.equipmentData?.tonnage || item.tonnage || 0;
      const itemType = this.categorizeEquipment(item);
      
      if (!components[itemType]) {
        components[itemType] = { weight: 0, percentage: 0, items: [] };
      }

      components[itemType].weight += itemWeight;
      components[itemType].items.push({
        name: item.equipmentData?.name || item.name || 'Unknown Equipment',
        type: itemType,
        weight: itemWeight,
        location: item.location,
        isFixed: false
      });
    });

    const totalWeight = this.calculateTotalWeight(config, equipment);

    // Calculate percentages
    Object.keys(components).forEach(category => {
      if (totalWeight > 0) {
        components[category].percentage = (components[category].weight / totalWeight) * 100;
      }
    });

    return {
      components,
      summary: {
        totalWeight,
        utilizationPercentage: (totalWeight / (config.tonnage || 100)) * 100,
        remainingCapacity: (config.tonnage || 100) - totalWeight
      }
    };
  }

  /**
   * Calculate structure weight based on tonnage and type
   */
  private calculateStructureWeight(config: UnitConfiguration): number {
    const tonnage = config.tonnage || 100;
    const structureType = this.extractComponentType(config.structureType);
    
    // Base structure weight is 10% of tonnage
    let structureWeight = tonnage * 0.1;
    
    // Adjust for structure type
    switch (structureType) {
      case 'Endo Steel':
        structureWeight *= 0.5; // Endo Steel is half weight
        break;
      case 'Composite':
        structureWeight *= 0.75; // Composite is 75% weight
        break;
      case 'Reinforced':
        structureWeight *= 2.0; // Reinforced is double weight
        break;
      default:
        // Standard structure remains at base weight
        break;
    }

    return Math.round(structureWeight * 100) / 100;
  }

  /**
   * Calculate armor weight based on total armor and type
   */
  private calculateArmorWeight(config: UnitConfiguration): number {
    const totalArmor = this.calculateTotalArmorPoints(config);
    const armorType = this.extractComponentType(config.armorType);
    
    // Import official BattleTech construction rules
    const { calculateArmorWeight } = require('../../../constants/BattleTechConstructionRules');
    
    // Use official armor weight calculation
    const armorWeight = calculateArmorWeight(totalArmor, armorType);

    return Math.round(armorWeight * 100) / 100;
  }

  /**
   * Calculate engine weight based on rating and type
   */
  private calculateEngineWeight(config: UnitConfiguration): number {
    const engineRating = config.engineRating || 0;
    const engineType = this.extractComponentType(config.engineType);
    
    if (engineRating === 0) return 0;

    // Base engine weight calculation varies by rating
    let engineWeight: number;
    
    if (engineRating <= 100) {
      engineWeight = engineRating / 10;
    } else if (engineRating <= 200) {
      engineWeight = (engineRating - 100) / 10 + 10;
    } else if (engineRating <= 300) {
      engineWeight = (engineRating - 200) / 10 + 20;
    } else {
      engineWeight = (engineRating - 300) / 10 + 30;
    }

    // Adjust for engine type
    switch (engineType) {
      case 'XL':
      case 'Extra-Light':
        engineWeight *= 0.5; // XL engines are half weight
        break;
      case 'Light':
        engineWeight *= 0.75; // Light engines are 75% weight
        break;
      case 'Compact':
        engineWeight *= 1.5; // Compact engines are 150% weight
        break;
      case 'XXL':
        engineWeight *= 0.33; // XXL engines are 1/3 weight
        break;
      case 'ICE':
        engineWeight *= 2.0; // ICE engines are double weight
        break;
      default:
        // Standard fusion remains at base weight
        break;
    }

    return Math.round(engineWeight * 100) / 100;
  }

  /**
   * Calculate gyro weight based on engine rating and type
   */
  private calculateGyroWeight(config: UnitConfiguration): number {
    const engineRating = config.engineRating || 0;
    const gyroType = this.extractComponentType(config.gyroType);
    
    // Base gyro weight is engine rating / 100, rounded up, in tons
    let gyroWeight = Math.ceil(engineRating / 100);
    
    // Adjust for gyro type
    switch (gyroType) {
      case 'XL Gyro':
        gyroWeight *= 0.5; // XL gyros are half weight
        break;
      case 'Compact Gyro':
        gyroWeight *= 1.5; // Compact gyros are 150% weight
        break;
      case 'Heavy Duty Gyro':
        gyroWeight *= 2.0; // Heavy duty gyros are double weight
        break;
      default:
        // Standard gyro remains at base weight
        break;
    }

    return Math.round(gyroWeight * 100) / 100;
  }

  /**
   * Calculate cockpit weight (typically fixed)
   */
  private calculateCockpitWeight(config: UnitConfiguration): number {
    // Standard cockpit is 3 tons for most BattleMechs
    return 3.0;
  }

  /**
   * Calculate total equipment weight
   */
  private calculateEquipmentWeight(equipment: any[]): number {
    return equipment.reduce((total, item) => {
      const weight = item.equipmentData?.tonnage || item.tonnage || 0;
      return total + weight;
    }, 0);
  }

  /**
   * Calculate total armor points from armor allocation
   */
  private calculateTotalArmorPoints(config: UnitConfiguration): number {
    if (!config.armorAllocation) return 0;

    let totalArmor = 0;
    
    // Sum armor from all locations using correct location codes
    totalArmor += config.armorAllocation.HD?.front || 0;
    totalArmor += config.armorAllocation.CT?.front || 0;
    totalArmor += config.armorAllocation.CT?.rear || 0;
    totalArmor += config.armorAllocation.LT?.front || 0;
    totalArmor += config.armorAllocation.LT?.rear || 0;
    totalArmor += config.armorAllocation.RT?.front || 0;
    totalArmor += config.armorAllocation.RT?.rear || 0;
    totalArmor += config.armorAllocation.LA?.front || 0;
    totalArmor += config.armorAllocation.RA?.front || 0;
    totalArmor += config.armorAllocation.LL?.front || 0;
    totalArmor += config.armorAllocation.RL?.front || 0;

    return totalArmor;
  }

  /**
   * Validate individual component weights
   */
  private validateComponentWeights(config: UnitConfiguration, equipment: any[], violations: WeightViolation[]): void {
    // Check if any single component is too heavy for the unit
    equipment.forEach(item => {
      const itemWeight = item.equipmentData?.tonnage || item.tonnage || 0;
      const maxComponentWeight = (config.tonnage || 100) * 0.5; // No single component should exceed 50% of unit weight
      
      if (itemWeight > maxComponentWeight) {
        violations.push({
          type: 'component_overweight',
          component: item.equipmentData?.name || item.name || 'Unknown Equipment',
          actual: itemWeight,
          expected: maxComponentWeight,
          severity: 'major',
          message: `Component weight ${itemWeight} tons exceeds reasonable limit of ${maxComponentWeight} tons`,
          suggestedFix: 'Consider lighter alternatives or split into multiple components',
          impact: 'Single component dominates unit weight distribution'
        });
      }
    });
  }

  /**
   * Calculate weight efficiency score
   */
  private calculateWeightEfficiency(totalWeight: number, maxWeight: number): number {
    const utilization = totalWeight / maxWeight;
    
    // Optimal range is 95-98% of max weight
    if (utilization >= 0.95 && utilization <= 0.98) {
      return 100;
    } else if (utilization >= 0.90 && utilization < 0.95) {
      return 80 + (utilization - 0.90) * 400; // Scale from 80-100
    } else if (utilization > 0.98 && utilization <= 1.0) {
      return 100 - ((utilization - 0.98) * 2500); // Penalty for being too close to limit
    } else if (utilization > 1.0) {
      return 0; // Critical failure - overweight
    } else {
      return Math.max(0, utilization * 88.89); // Scale 0-90% -> 0-80 points
    }
  }

  /**
   * Categorize equipment for weight breakdown
   */
  private categorizeEquipment(item: any): string {
    const type = item.equipmentData?.type || item.type || '';
    const name = (item.equipmentData?.name || item.name || '').toLowerCase();

    if (type === 'weapon' || name.includes('weapon') || name.includes('cannon') || name.includes('laser') || name.includes('missile')) {
      return 'weapons';
    } else if (type === 'ammunition' || type === 'ammo' || name.includes('ammo')) {
      return 'ammunition';
    } else if (type === 'heat_sink' || name.includes('heat sink')) {
      return 'heatSinks';
    } else if (type === 'jump_jet' || name.includes('jump jet')) {
      return 'jumpJets';
    } else {
      return 'equipment';
    }
  }

  /**
   * Extract component type from ComponentConfiguration or string
   */
  private extractComponentType(component: ComponentConfiguration | string | undefined): string {
    if (!component) return 'Standard';
    
    if (typeof component === 'string') {
      return component;
    }
    
    return component.type || 'Standard';
  }
}




