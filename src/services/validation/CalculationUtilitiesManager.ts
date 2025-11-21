/**
 * CalculationUtilitiesManager
 * Handles various calculation methods for BattleTech unit construction.
 * Extracted from ConstructionRulesValidator for modularity and SOLID compliance.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { calculateInternalHeatSinks } from '../../utils/heatSinkCalculations';
import { getMaxArmorPoints } from '../../utils/internalStructureTable';

export interface WeightCalculationResult {
  totalWeight: number;
  distribution: WeightDistribution;
  breakdown: WeightBreakdown;
}

export interface WeightDistribution {
  structure: number;
  armor: number;
  engine: number;
  equipment: number;
  ammunition: number;
  systems: number;
}

export interface WeightBreakdown {
  structure: { type: string; weight: number };
  armor: { type: string; weight: number };
  engine: { type: string; weight: number };
  gyro: { type: string; weight: number };
  cockpit: { type: string; weight: number };
  equipment: { items: Array<{ name: string; weight: number }>; total: number };
}

export interface HeatCalculationResult {
  heatGeneration: number;
  heatDissipation: number;
  heatDeficit: number;
  engineHeatSinks: number;
  externalHeatSinks: number;
  heatSinkTypes: string[];
}

export interface MovementCalculationResult {
  walkMP: number;
  runMP: number;
  jumpMP: number;
  engineRating: number;
  tonnage: number;
  engineType: string;
  jumpJetCount: number;
}

export interface ArmorCalculationResult {
  totalArmor: number;
  maxArmor: number;
  armorWeight: number;
  armorType: string;
  locationBreakdown: { [location: string]: number };
}

export interface StructureCalculationResult {
  structureType: string;
  structureWeight: number;
  internalStructure: number;
  criticalSlots: number;
}

export interface EngineCalculationResult {
  engineType: string;
  engineRating: number;
  engineWeight: number;
  walkMP: number;
  heatSinks: number;
}

export interface GyroCalculationResult {
  gyroType: string;
  gyroWeight: number;
  engineCompatible: boolean;
}

export interface CockpitCalculationResult {
  cockpitType: string;
  cockpitWeight: number;
  criticalSlots: number;
}

export class CalculationUtilitiesManager {
  /**
   * Calculate total weight and distribution
   */
  calculateTotalWeight(config: UnitConfiguration, equipment: any[]): WeightCalculationResult {
    const structureWeight = this.calculateStructureWeight(config.tonnage, this.extractComponentType(config.structureType));
    const armorWeight = this.calculateArmorWeight(this.calculateMaxArmor(config.tonnage), this.extractComponentType(config.armorType));
    const engineWeight = this.calculateEngineWeight(config.engineRating, this.extractComponentType(config.engineType));
    const gyroWeight = this.calculateGyroWeight(config.engineRating, this.extractComponentType(config.gyroType));
    const cockpitWeight = this.calculateCockpitWeight('Standard'); // Default cockpit type
    const equipmentWeight = equipment.reduce((sum, item) => sum + (item.weight || 0), 0);

    const totalWeight = structureWeight + armorWeight + engineWeight + gyroWeight + cockpitWeight + equipmentWeight;

    const distribution: WeightDistribution = {
      structure: (structureWeight / totalWeight) * 100,
      armor: (armorWeight / totalWeight) * 100,
      engine: (engineWeight / totalWeight) * 100,
      equipment: (equipmentWeight / totalWeight) * 100,
      ammunition: 0, // Will be calculated separately
      systems: ((gyroWeight + cockpitWeight) / totalWeight) * 100
    };

    const breakdown: WeightBreakdown = {
      structure: { type: this.extractComponentType(config.structureType), weight: structureWeight },
      armor: { type: this.extractComponentType(config.armorType), weight: armorWeight },
      engine: { type: this.extractComponentType(config.engineType), weight: engineWeight },
      gyro: { type: this.extractComponentType(config.gyroType), weight: gyroWeight },
      cockpit: { type: 'Standard', weight: cockpitWeight },
      equipment: {
        items: equipment.map(item => ({ name: item.name, weight: item.weight || 0 })),
        total: equipmentWeight
      }
    };

    return { totalWeight, distribution, breakdown };
  }

  /**
   * Calculate weight distribution
   */
  calculateWeightDistribution(config: UnitConfiguration, equipment: any[]): WeightDistribution {
    const result = this.calculateTotalWeight(config, equipment);
    return result.distribution;
  }

  /**
   * Calculate heat generation and dissipation
   */
  calculateHeatManagement(config: UnitConfiguration, equipment: any[]): HeatCalculationResult {
    const heatGeneration = this.calculateHeatGeneration(equipment);
    const engineHeatSinks = this.getEngineHeatSinks(config);
    const externalHeatSinks = this.getExternalHeatSinks(equipment);
    const heatDissipation = engineHeatSinks + externalHeatSinks;
    const heatDeficit = Math.max(0, heatGeneration - heatDissipation);

    const heatSinkTypes = equipment
      .filter(item => item.type === 'heat_sink')
      .map(item => item.name)
      .filter((name, index, arr) => arr.indexOf(name) === index);

    return {
      heatGeneration,
      heatDissipation,
      heatDeficit,
      engineHeatSinks,
      externalHeatSinks,
      heatSinkTypes
    };
  }

  /**
   * Calculate movement profile
   */
  calculateMovementProfile(config: UnitConfiguration, equipment: any[]): MovementCalculationResult {
    const engineRating = config.engineRating;
    const tonnage = config.tonnage;
    const walkMP = Math.floor(engineRating / tonnage);
    const runMP = Math.floor(walkMP * 1.5);
    
    const jumpJets = equipment.filter(item => item.type === 'jump_jet');
    const jumpJetCount = jumpJets.length;
    const jumpMP = jumpJetCount;

    return {
      walkMP,
      runMP,
      jumpMP,
      engineRating,
      tonnage,
      engineType: this.extractComponentType(config.engineType),
      jumpJetCount
    };
  }

  /**
   * Calculate armor allocation
   */
  calculateArmorAllocation(config: UnitConfiguration, armorAllocation?: any): ArmorCalculationResult {
    const maxArmor = this.calculateMaxArmor(config.tonnage);
    const totalArmor = armorAllocation ? this.calculateTotalArmorFromAllocation(armorAllocation) : maxArmor * 0.8;
    const armorWeight = this.calculateArmorWeight(totalArmor, this.extractComponentType(config.armorType));
    const armorType = this.extractComponentType(config.armorType);

    const locationBreakdown: { [location: string]: number } = {};
    if (armorAllocation) {
      ['head', 'center_torso', 'left_torso', 'right_torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg'].forEach(location => {
        locationBreakdown[location] = this.getLocationArmor(armorAllocation, location);
      });
    }

    return {
      totalArmor,
      maxArmor,
      armorWeight,
      armorType,
      locationBreakdown
    };
  }

  /**
   * Calculate structure details
   */
  calculateStructureDetails(config: UnitConfiguration): StructureCalculationResult {
    const structureType = this.extractComponentType(config.structureType);
    const structureWeight = this.calculateStructureWeight(config.tonnage, structureType);
    const internalStructure = this.calculateInternalStructure(config.tonnage);
    const criticalSlots = this.calculateStructureCriticalSlots(config.tonnage, structureType);

    return {
      structureType,
      structureWeight,
      internalStructure,
      criticalSlots
    };
  }

  /**
   * Calculate engine details
   */
  calculateEngineDetails(config: UnitConfiguration): EngineCalculationResult {
    const engineType = this.extractComponentType(config.engineType);
    const engineRating = config.engineRating;
    const engineWeight = this.calculateEngineWeight(engineRating, engineType);
    const walkMP = Math.floor(engineRating / config.tonnage);
    const heatSinks = this.getEngineHeatSinks(config);

    return {
      engineType,
      engineRating,
      engineWeight,
      walkMP,
      heatSinks
    };
  }

  /**
   * Calculate gyro details
   */
  calculateGyroDetails(config: UnitConfiguration): GyroCalculationResult {
    const gyroType = this.extractComponentType(config.gyroType);
    const gyroWeight = this.calculateGyroWeight(config.engineRating, gyroType);
    const engineCompatible = this.isGyroEngineCompatible(gyroType, this.extractComponentType(config.engineType));

    return {
      gyroType,
      gyroWeight,
      engineCompatible
    };
  }

  /**
   * Calculate cockpit details
   */
  calculateCockpitDetails(config: UnitConfiguration): CockpitCalculationResult {
    const cockpitType = 'Standard'; // Default cockpit type
    const cockpitWeight = this.calculateCockpitWeight(cockpitType);
    const criticalSlots = this.calculateCockpitCriticalSlots(cockpitType);

    return {
      cockpitType,
      cockpitWeight,
      criticalSlots
    };
  }

  /**
   * Calculate total slots used
   */
  calculateTotalSlotsUsed(config: UnitConfiguration, equipment: any[]): number {
    const structureSlots = this.calculateStructureCriticalSlots(config.tonnage, this.extractComponentType(config.structureType));
    const cockpitSlots = this.calculateCockpitCriticalSlots('Standard'); // Default cockpit type
    const equipmentSlots = equipment.reduce((sum, item) => sum + (item.criticalSlots || 0), 0);

    return structureSlots + cockpitSlots + equipmentSlots;
  }

  /**
   * Extract component type
   */
  private extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') {
      return component;
    }
    return component.type;
  }

  /**
   * Calculate heat generation
   */
  private calculateHeatGeneration(equipment: any[]): number {
    return equipment.reduce((sum, item) => sum + (item.heat || 0), 0);
  }

  /**
   * Get engine heat sinks
   */
  private getEngineHeatSinks(config: UnitConfiguration): number {
    const engineRating = config.engineRating;
    return calculateInternalHeatSinks(engineRating);
  }

  /**
   * Get external heat sinks
   */
  private getExternalHeatSinks(equipment: any[]): number {
    return equipment.filter(item => item.type === 'heat_sink').length;
  }

  /**
   * Calculate max armor
   */
  private calculateMaxArmor(tonnage: number): number {
    return getMaxArmorPoints(tonnage);
  }

  /**
   * Calculate total armor from allocation
   */
  private calculateTotalArmorFromAllocation(armorAllocation: any): number {
    const locations = ['head', 'center_torso', 'left_torso', 'right_torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg'];
    return locations.reduce((sum, location) => sum + this.getLocationArmor(armorAllocation, location), 0);
  }

  /**
   * Get location armor
   */
  private getLocationArmor(armorAllocation: any, location: string): number {
    return armorAllocation[location]?.armor || 0;
  }

  /**
   * Calculate structure weight
   */
  private calculateStructureWeight(tonnage: number, structureType: string): number {
    const baseWeight = tonnage * 0.1; // 10% of tonnage
    if (structureType === 'Endo Steel' || structureType === 'Endo Steel (Clan)') {
      return baseWeight * 0.5; // Endo Steel is lighter
    }
    return baseWeight;
  }

  /**
   * Calculate armor weight
   */
  private calculateArmorWeight(totalArmor: number, armorType: string): number {
    const baseWeight = totalArmor * 0.0625; // 1/16 ton per point
    if (armorType === 'Ferro-Fibrous' || armorType === 'Ferro-Fibrous (Clan)') {
      return baseWeight * 0.84; // Ferro-Fibrous is lighter
    }
    return baseWeight;
  }

  /**
   * Calculate engine weight
   */
  private calculateEngineWeight(engineRating: number, engineType: string): number {
    const { calculateEngineWeight } = require('../../types/systemComponents');
    // Type-safe engine type validation with fallback
    const validEngineTypes = ['Standard', 'XL', 'Light', 'Compact', 'XXL', 'ICE', 'Fuel Cell'];
    const safeEngineType = validEngineTypes.includes(engineType) ? engineType : 'Standard';
    return calculateEngineWeight(engineRating, 100, safeEngineType);
  }

  /**
   * Calculate gyro weight
   */
  private calculateGyroWeight(engineRating: number, gyroType: string): number {
    const baseWeight = engineRating * 0.01; // 1% of engine rating
    switch (gyroType) {
      case 'XL':
        return baseWeight * 0.5;
      case 'Compact':
        return baseWeight * 1.5;
      case 'Heavy-Duty':
        return baseWeight * 2;
      default:
        return baseWeight;
    }
  }

  /**
   * Calculate cockpit weight
   */
  private calculateCockpitWeight(cockpitType: string): number {
    switch (cockpitType) {
      case 'Small':
        return 2;
      case 'Torso-Mounted':
        return 4;
      default:
        return 3; // Standard cockpit
    }
  }

  /**
   * Calculate internal structure
   */
  private calculateInternalStructure(tonnage: number): number {
    return Math.floor(tonnage / 5) + 1; // Simplified calculation
  }

  /**
   * Calculate structure critical slots
   */
  private calculateStructureCriticalSlots(tonnage: number, structureType: string): number {
    const baseSlots = Math.floor(tonnage / 10) + 2; // Base slots
    if (structureType === 'Endo Steel' || structureType === 'Endo Steel (Clan)') {
      return baseSlots + 7; // Endo Steel takes more critical slots
    }
    return baseSlots;
  }

  /**
   * Calculate cockpit critical slots
   */
  private calculateCockpitCriticalSlots(cockpitType: string): number {
    switch (cockpitType) {
      case 'Small':
        return 2;
      case 'Torso-Mounted':
        return 4;
      default:
        return 3; // Standard cockpit
    }
  }

  /**
   * Check gyro-engine compatibility
   */
  private isGyroEngineCompatible(gyroType: string, engineType?: string): boolean {
    // Simplified compatibility check
    if (gyroType === 'XL' && engineType === 'ICE') {
      return false; // XL gyro not compatible with ICE engine
    }
    return true;
  }

  /**
   * Calculate efficiency metrics
   */
  calculateEfficiencyMetrics(config: UnitConfiguration, equipment: any[]): {
    weightEfficiency: number;
    slotEfficiency: number;
    heatEfficiency: number;
    firepowerEfficiency: number;
  } {
    const weightResult = this.calculateTotalWeight(config, equipment);
    const heatResult = this.calculateHeatManagement(config, equipment);
    const slotsUsed = this.calculateTotalSlotsUsed(config, equipment);
    const maxSlots = this.calculateStructureCriticalSlots(config.tonnage, this.extractComponentType(config.structureType)) + 
                    this.calculateCockpitCriticalSlots('Standard'); // Default cockpit type

    const weightEfficiency = Math.min(100, (weightResult.totalWeight / config.tonnage) * 100);
    const slotEfficiency = Math.min(100, (slotsUsed / maxSlots) * 100);
    const heatEfficiency = heatResult.heatDeficit === 0 ? 100 : Math.max(0, 100 - (heatResult.heatDeficit * 10));
    const firepowerEfficiency = this.calculateFirepowerEfficiency(equipment);

    return {
      weightEfficiency,
      slotEfficiency,
      heatEfficiency,
      firepowerEfficiency
    };
  }

  /**
   * Calculate firepower efficiency
   */
  private calculateFirepowerEfficiency(equipment: any[]): number {
    const weapons = equipment.filter(item => item.type === 'weapon');
    const totalDamage = weapons.reduce((sum, weapon) => sum + (weapon.damage || 0), 0);
    const totalHeat = weapons.reduce((sum, weapon) => sum + (weapon.heat || 0), 0);
    
    // Simplified firepower efficiency calculation
    if (totalHeat === 0) return 100;
    return Math.min(100, (totalDamage / totalHeat) * 20); // Damage per heat point
  }
} 




