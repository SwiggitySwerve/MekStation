/**
 * Weight Calculation Service - Core weight calculations
 * 
 * Handles fundamental weight calculations for BattleMech components and equipment.
 * Separated from the main service for better modularity and testability.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { 
  WeightSummary, 
  ComponentWeightBreakdown, 
  Equipment,
  WeightCalculationContext 
} from './types';

export class WeightCalculationService {
  
  /**
   * Calculate total weight summary for a unit
   */
  static calculateTotalWeight(
    config: UnitConfiguration, 
    equipment: Equipment[], 
    context?: WeightCalculationContext
  ): WeightSummary {
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
  
  /**
   * Calculate weights for all major components
   */
  static calculateComponentWeights(config: UnitConfiguration): ComponentWeightBreakdown {
    return {
      structure: this.calculateStructureWeight(config),
      engine: this.calculateEngineWeight(config),
      gyro: this.calculateGyroWeight(config),
      heatSinks: this.calculateHeatSinkWeight(config),
      armor: this.calculateArmorWeight(config),
      jumpJets: this.calculateJumpJetWeight(config)
    };
  }
  
  /**
   * Calculate total equipment weight
   */
  static calculateEquipmentWeight(equipment: Equipment[]): number {
    return equipment.reduce((total, item) => {
      if (!item || !item.equipmentData) return total;
      return total + (item.equipmentData.tonnage || 0) * (item.quantity || 1);
    }, 0);
  }
  
  /**
   * Calculate remaining tonnage available
   */
  static calculateRemainingTonnage(config: UnitConfiguration, equipment: Equipment[]): number {
    const totalWeight = this.calculateTotalWeight(config, equipment);
    return Math.max(0, config.tonnage - totalWeight.totalWeight);
  }
  
  /**
   * Check if unit is within tonnage limits
   */
  static isWithinTonnageLimit(config: UnitConfiguration, equipment: Equipment[]): boolean {
    const totalWeight = this.calculateTotalWeight(config, equipment);
    return totalWeight.totalWeight <= config.tonnage;
  }
  
  // ===== COMPONENT-SPECIFIC CALCULATIONS =====
  
  /**
   * Calculate structure weight and efficiency
   */
  static calculateStructureWeight(config: UnitConfiguration): ComponentWeightBreakdown['structure'] {
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
  
  /**
   * Calculate engine weight and efficiency
   */
  static calculateEngineWeight(config: UnitConfiguration): ComponentWeightBreakdown['engine'] {
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
  
  /**
   * Calculate gyro weight and efficiency
   */
  static calculateGyroWeight(config: UnitConfiguration): ComponentWeightBreakdown['gyro'] {
    const gyroType = this.extractComponentType(config.gyroType);
    const baseWeight = Math.ceil(config.engineRating / 100);
    
    let weight: number;
    let efficiency: number;
    
    switch (gyroType) {
      case 'XL':
        weight = baseWeight * 0.5;
        efficiency = 2.0;
        break;
      case 'Compact':
        weight = baseWeight * 1.5;
        efficiency = 0.67;
        break;
      case 'Heavy-Duty':
        weight = baseWeight * 2.0;
        efficiency = 0.5;
        break;
      case 'Standard':
      default:
        weight = baseWeight;
        efficiency = 1.0;
        break;
    }
    
    return { weight, type: gyroType, efficiency };
  }
  
  /**
   * Calculate heat sink weight and efficiency
   */
  static calculateHeatSinkWeight(config: UnitConfiguration): ComponentWeightBreakdown['heatSinks'] {
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
  
  /**
   * Calculate armor weight and efficiency
   */
  static calculateArmorWeight(config: UnitConfiguration): ComponentWeightBreakdown['armor'] {
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
  
  /**
   * Calculate jump jet weight and efficiency
   */
  static calculateJumpJetWeight(config: UnitConfiguration): ComponentWeightBreakdown['jumpJets'] {
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
  
  // ===== HELPER METHODS =====
  
  /**
   * Extract component type from configuration
   */
  private static extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') return component;
    return component.type;
  }
  
  /**
   * Calculate total armor points from allocation
   */
  private static calculateTotalArmorPoints(armorAllocation: any): number {
    if (!armorAllocation) return 0;
    
    return Object.values(armorAllocation).reduce((total: number, location: any) => {
      if (!location) return total;
      const front = location.front || 0;
      const rear = location.rear || 0;
      return total + front + rear;
    }, 0);
  }
  
  /**
   * Extract equipment weight (excluding ammunition)
   */
  private static extractEquipmentWeight(equipment: Equipment[]): number {
    return equipment.reduce((total, item) => {
      if (!item?.equipmentData || item.equipmentData.type === 'ammunition') return total;
      return total + (item.equipmentData.tonnage || 0) * (item.quantity || 1);
    }, 0);
  }
  
  /**
   * Extract ammunition weight only
   */
  private static extractAmmoWeight(equipment: Equipment[]): number {
    return equipment.reduce((total, item) => {
      if (!item?.equipmentData || item.equipmentData.type !== 'ammunition') return total;
      return total + (item.equipmentData.tonnage || 0) * (item.quantity || 1);
    }, 0);
  }
}




