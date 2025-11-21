/**
 * Validation Calculations
 * Utility functions for weight, heat, armor, structure, and other calculations
 * Extracted from ConstructionRulesValidator.ts for modularization
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { getTotalInternalStructure, getMaxArmorPoints } from '../../utils/internalStructureTable';
import { calculateGyroWeight } from '../../types/systemComponents';
import { calculateInternalHeatSinks } from '../../utils/heatSinkCalculations';
import { EngineType, GyroType } from '../../types/systemComponents';

// Type-safe casting functions
function castToEngineType(engineType: string): EngineType {
  const validTypes: EngineType[] = ['Standard', 'XL (IS)', 'XL (Clan)', 'Light', 'XXL', 'Compact', 'ICE', 'Fuel Cell'];
  return validTypes.includes(engineType as EngineType) ? engineType as EngineType : 'Standard';
}

function castToGyroType(gyroType: string): GyroType {
  const validTypes: GyroType[] = ['Standard', 'XL', 'Compact', 'Heavy-Duty'];
  return validTypes.includes(gyroType as GyroType) ? gyroType as GyroType : 'Standard';
}

export const ValidationCalculations = {
  extractComponentType(component: ComponentConfiguration): string {
    return component.type;
  },

  calculateTotalWeight(config: UnitConfiguration, equipment: any[]): number {
    let totalWeight = 0;
    totalWeight += ValidationCalculations.calculateStructureWeight(config.tonnage || 100, ValidationCalculations.extractComponentType(config.structureType as any));
    totalWeight += ValidationCalculations.calculateEngineWeight(config.engineRating || 0, config.engineType || 'Standard');
    totalWeight += ValidationCalculations.calculateArmorWeight(ValidationCalculations.calculateTotalArmorFromAllocation(config.armorAllocation) || 0, ValidationCalculations.extractComponentType(config.armorType as any));
    totalWeight += equipment.reduce((sum, item) => sum + (item.equipmentData?.tonnage || 0), 0);
    return totalWeight;
  },

  calculateWeightDistribution(config: UnitConfiguration, equipment: any[]): any {
    const structure = ValidationCalculations.calculateStructureWeight(config.tonnage || 100, ValidationCalculations.extractComponentType(config.structureType as any));
    const armor = ValidationCalculations.calculateArmorWeight(ValidationCalculations.calculateTotalArmorFromAllocation(config.armorAllocation) || 0, ValidationCalculations.extractComponentType(config.armorType as any));
    const engine = ValidationCalculations.calculateEngineWeight(config.engineRating || 0, config.engineType || 'Standard');
    const equipmentItems = equipment.filter(item => item.equipmentData?.type !== 'ammunition');
    const ammunitionItems = equipment.filter(item => item.equipmentData?.type === 'ammunition');
    const equipmentWeight = equipmentItems.reduce((sum, item) => sum + (item.equipmentData?.tonnage || 0), 0);
    const ammunition = ammunitionItems.reduce((sum, item) => sum + (item.equipmentData?.tonnage || 0), 0);
    const systems = 5;
    return { structure, armor, engine, equipment: equipmentWeight, ammunition, systems };
  },

  calculateHeatGeneration(equipment: any[]): number {
    return equipment.reduce((total, item) => total + (item.equipmentData?.heat || 0), 0);
  },

  getEngineHeatSinks(config: UnitConfiguration): number {
    const engineRating = config.engineRating || 0;
    const engineType = config.engineType || 'Standard';
    const { calculateInternalHeatSinksForEngine } = require('../../utils/heatSinkCalculations');
    return calculateInternalHeatSinksForEngine(engineRating, engineType);
  },

  getExternalHeatSinks(equipment: any[]): number {
    return equipment.filter(item => item.equipmentData?.type === 'heat_sink').length;
  },

  calculateMaxArmor(tonnage: number): number {
    return getMaxArmorPoints(tonnage);
  },

  calculateArmorWeight(totalArmor: number, armorType: string): number {
    const baseWeight = totalArmor / 16;
    if (armorType.includes('Ferro-Fibrous')) return baseWeight * 1.12;
    return baseWeight;
  },

  isValidStructureType(structureType: string): boolean {
    const validTypes = ['Standard', 'Endo Steel', 'Endo Steel (Clan)', 'Reinforced', 'Composite'];
    return validTypes.includes(structureType);
  },

  calculateStructureWeight(tonnage: number, structureType: string): number {
    const baseWeight = tonnage * 0.1;
    if (structureType.includes('Endo Steel')) return baseWeight * 0.5;
    return baseWeight;
  },

  calculateInternalStructure(tonnage: number): number {
    return getTotalInternalStructure(tonnage);
  },

  calculateEngineWeight(engineRating: number, engineType: string): number {
    const { calculateEngineWeight } = require('../../types/systemComponents');
    return calculateEngineWeight(engineRating, 100, castToEngineType(engineType));
  },

  calculateGyroWeight(engineRating: number, gyroType: string): number {
    return calculateGyroWeight(engineRating, castToGyroType(gyroType));
  },

  calculateCockpitWeight(cockpitType: string): number {
    switch (cockpitType) {
      case 'Small': return 2;
      case 'Torso-Mounted': return 4;
      case 'Industrial': return 5;
      default: return 3;
    }
  },

  isGyroEngineCompatible(gyroType: string, engineType?: string): boolean {
    if (engineType === 'XL' && gyroType === 'Standard') return true;
    if (engineType === 'Light' && gyroType === 'XL') return false;
    return true;
  },

  calculateTotalSlotsUsed(config: UnitConfiguration, equipment: any[]): number {
    return equipment.reduce((total, item) => total + (item.equipmentData?.criticals || 1), 0);
  },

  calculateTotalArmorFromAllocation(armorAllocation: any): number {
    if (!armorAllocation) return 0;
    let total = 0;
    Object.values(armorAllocation).forEach((location: any) => {
      if (location && typeof location === 'object') {
        total += (location.front || 0) + (location.rear || 0);
      }
    });
    return total;
  },

  getLocationArmor(armorAllocation: any, location: string): number {
    if (!armorAllocation || !armorAllocation[location]) return 0;
    const locationData = armorAllocation[location];
    return (locationData.front || 0) + (locationData.rear || 0);
  }
}; 






