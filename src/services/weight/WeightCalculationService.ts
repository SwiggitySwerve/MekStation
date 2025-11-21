/**
 * WeightCalculationService - Focused service for weight calculations
 * 
 * Extracted from WeightBalanceService to handle specific weight calculation concerns
 * Implements SOLID principles with proper type safety and dependency injection support
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { IEquipmentInstance } from '../../types/core/UnitInterfaces';
import { 
  IWeightCalculationService, 
  WeightSummary, 
  ComponentWeightBreakdown, 
  TonnageValidation, 
  isValidUnitConfiguration,
  isValidEquipmentArray
} from './IWeightCalculationService';

export class WeightCalculationService implements IWeightCalculationService {
  
  calculateTotalWeight(config: UnitConfiguration, equipment: IEquipmentInstance[]): WeightSummary {
    // Type safety validation
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }
    
    const componentWeights = this.calculateComponentWeights(config);
    const equipmentWeight = this.calculateEquipmentWeight(equipment);
    
    const totalWeight = 
      componentWeights.structure.weight +
      componentWeights.engine.weight +
      componentWeights.gyro.weight +
      componentWeights.heatSinks.total +
      componentWeights.armor.weight +
      componentWeights.jumpJets.weight +
      equipmentWeight;
    
    const remainingTonnage = config.tonnage - totalWeight;
    
    return {
      totalWeight,
      maxTonnage: config.tonnage,
      remainingTonnage,
      percentageUsed: (totalWeight / config.tonnage) * 100,
      isOverweight: totalWeight > config.tonnage,
      breakdown: {
        structure: componentWeights.structure.weight,
        engine: componentWeights.engine.weight,
        gyro: componentWeights.gyro.weight,
        heatSinks: componentWeights.heatSinks.total,
        armor: componentWeights.armor.weight,
        equipment: this.extractEquipmentWeight(equipment),
        ammunition: this.extractAmmoWeight(equipment),
        jumpJets: componentWeights.jumpJets.weight
      }
    };
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
    // Check for null/undefined equipment parameter - should throw
    if (equipment === null || equipment === undefined) {
      throw new Error('Invalid equipment array provided');
    }
    
    // Handle invalid equipment arrays gracefully by returning 0 (for arrays with invalid items)
    if (!isValidEquipmentArray(equipment)) {
      return 0;
    }
    
    return equipment.reduce((total, item) => {
      if (!item || !item.equipment) return total;
      return total + (item.equipment.weight || 0) * (item.quantity || 1);
    }, 0);
  }
  
  validateTonnageLimit(config: UnitConfiguration, equipment: IEquipmentInstance[]): TonnageValidation {
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }
    
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
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }
    
    const totalWeight = this.calculateTotalWeight(config, equipment);
    return Math.max(0, config.tonnage - totalWeight.totalWeight);
  }
  
  isWithinTonnageLimit(config: UnitConfiguration, equipment: IEquipmentInstance[]): boolean {
    if (!isValidUnitConfiguration(config)) {
      throw new Error('Invalid unit configuration provided');
    }
    if (!isValidEquipmentArray(equipment)) {
      throw new Error('Invalid equipment array provided');
    }
    
    const totalWeight = this.calculateTotalWeight(config, equipment);
    return totalWeight.totalWeight <= config.tonnage;
  }
  
  calculateJumpJetWeight(config: UnitConfiguration): number {
    if (config.jumpMP === 0) return 0;
    
    const baseWeight = Math.ceil(config.tonnage / 10) * config.jumpMP * 0.5;
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
  
  // ===== PRIVATE HELPER METHODS =====
  
  private calculateStructureWeight(config: UnitConfiguration): ComponentWeightBreakdown['structure'] {
    const structureType = this.extractComponentType(config.structureType);
    const tonnage = config.tonnage;
    let weight = Math.ceil(tonnage / 10);
    let efficiency = 1.0;
    
    switch (structureType) {
      case 'Endo Steel':
      case 'Endo Steel (Clan)':
        weight *= 0.5;
        efficiency = 2.0;
        break;
      case 'Composite':
        weight *= 0.5;
        efficiency = 1.5;
        break;
      case 'Reinforced':
        weight *= 2.0;
        efficiency = 0.5;
        break;
      case 'Standard':
      default:
        break;
    }
    
    return { weight, type: structureType, efficiency };
  }
  
  private calculateEngineWeight(config: UnitConfiguration): ComponentWeightBreakdown['engine'] {
    const engineType = config.engineType || 'Standard';
    const rating = config.engineRating || 0;
    let weight = rating / 25;
    let efficiency = 1.0;
    
    switch (engineType) {
      case 'XL':
      case 'XL (Clan)':
        weight *= 0.5;
        efficiency = 2.0;
        break;
      case 'XXL':
        weight *= 0.33;
        efficiency = 3.0;
        break;
      case 'Light':
        weight *= 0.75;
        efficiency = 1.33;
        break;
      case 'Compact':
        weight *= 1.5;
        efficiency = 0.67;
        break;
      case 'Standard':
      default:
        break;
    }
    
    return { weight, type: engineType, rating, efficiency };
  }
  
  private calculateGyroWeight(config: UnitConfiguration): ComponentWeightBreakdown['gyro'] {
    const gyroType = this.extractComponentType(config.gyroType);
    const engineRating = config.engineRating || 0;
    let weight = Math.ceil(engineRating / 100);
    let efficiency = 1.0;
    
    switch (gyroType) {
      case 'XL Gyro':
        weight *= 0.5;
        efficiency = 2.0;
        break;
      case 'Compact Gyro':
        weight *= 1.5;
        efficiency = 0.67;
        break;
      case 'Heavy-Duty Gyro':
        weight *= 2.0;
        efficiency = 0.5;
        break;
      case 'Standard Gyro':
      default:
        break;
    }
    
    return { weight, type: gyroType, efficiency };
  }
  
  private calculateHeatSinkWeight(config: UnitConfiguration): ComponentWeightBreakdown['heatSinks'] {
    const heatSinkType = this.extractComponentType(config.heatSinkType);
    const external = 0; // Simplified - would need to count external heat sinks from equipment
    
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
      internal: 0,
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
        efficiency = 35.2 / 32;
        break;
      case 'Hardened':
        efficiency = 0.5;
        break;
      case 'Standard':
      default:
        efficiency = 1.0;
        break;
    }
    
    return { weight, type: armorType, points, efficiency };
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
  
  private calculateTotalArmorPoints(armorAllocation: any): number {
    if (!armorAllocation) return 0;
    
    return Object.values(armorAllocation).reduce((total: number, location: any) => {
      if (!location) return total;
      const front = location.front || 0;
      const rear = location.rear || 0;
      return total + front + rear;
    }, 0);
  }
  
  private extractEquipmentWeight(equipment: IEquipmentInstance[]): number {
    return equipment.reduce((total, item) => {
      // Exclude ammunition from equipment weight (it's calculated separately)
      if (!item?.equipment || item.equipment.type === 'ammunition' || item.equipment.category === 'ammunition') return total;
      return total + (item.equipment.weight || 0) * (item.quantity || 1);
    }, 0);
  }
  
  private extractAmmoWeight(equipment: IEquipmentInstance[]): number {
    return equipment.reduce((total, item) => {
      // Include ONLY ammunition
      if (!item?.equipment || (item.equipment.type !== 'ammunition' && item.equipment.category !== 'ammunition')) return total;
      return total + (item.equipment.weight || 0) * (item.quantity || 1);
    }, 0);
  }
  
  private extractComponentType(component: string | { type?: string; name?: string } | null | undefined): string {
    if (typeof component === 'string') return component;
    if (component && typeof component === 'object') {
      return component.type || component.name || 'Standard';
    }
    return 'Standard';
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
}

export const createWeightCalculationService = (): IWeightCalculationService => {
  return new WeightCalculationService();
};




