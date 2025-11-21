/**
 * UnitCalculationManager
 * Handles all unit calculations including weight, armor, heat, and critical slots.
 * Extracted from UnitCriticalManager for modularity and SOLID compliance.
 */

import { UnitConfiguration } from './UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { getInternalStructurePoints } from '../internalStructureTable';
import { SystemComponentsGateway } from '../../services/systemComponents/SystemComponentsGateway';

export interface WeightBreakdown {
  structure: number;
  engine: number;
  gyro: number;
  cockpit: number;
  actuators: number;
  armor: number;
  equipment: number;
  heatSinks: number;
  jumpJets: number;
  total: number;
  remaining: number;
  isOverweight: boolean;
  utilizationPercentage: number;
}

export interface ArmorAnalysis {
  totalWasted: number;
  wastedFromRounding: number;
  trappedPoints: number;
  locationsAtCap: number;
  wastePercentage: number;
  optimalTonnage: number;
  tonnageSavings: number;
}

export interface HeatAnalysis {
  generation: number;
  dissipation: number;
  efficiency: number;
  isOverheating: boolean;
}

export class UnitCalculationManager {
  /**
   * Extract type string from ComponentConfiguration or return string as-is
   */
  private static extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') {
      return component;
    }
    return component.type;
  }

  /**
   * Calculate engine weight based on rating and type
   */
  calculateEngineWeight(config: UnitConfiguration): number {
    const rating = config.engineRating;
    let type = UnitCalculationManager.extractComponentType(config.engineType);
    
    // Normalize legacy types
    if (type === 'XL') {
      type = config.techBase === 'Clan' ? 'XL (Clan)' : 'XL (IS)';
    }

    // Determine tech base for search
    let techBase = config.techBase;
    if (techBase === 'Mixed') {
      techBase = type.includes('Clan') ? 'Clan' : 'Inner Sphere';
    }

    // Use Gateway to find engine
    const engines = SystemComponentsGateway.getEngines({
      techBase: techBase,
      unitTonnage: config.tonnage,
      desiredRating: rating,
      ignoreYearRestrictions: true
    });

    const engine = engines.find(e => e.type === type) || engines[0];
    return engine ? engine.weight : 0;
  }

  /**
   * Calculate gyro weight based on engine rating and type
   */
  calculateGyroWeight(config: UnitConfiguration): number {
    const rating = config.engineRating;
    const type = UnitCalculationManager.extractComponentType(config.gyroType);
    
    // Determine tech base
    let techBase = config.techBase;
    if (techBase === 'Mixed') {
      techBase = type.includes('Clan') ? 'Clan' : 'Inner Sphere';
    }

    const gyros = SystemComponentsGateway.getGyros({
      techBase: techBase,
      engineRating: rating,
      ignoreYearRestrictions: true
    });
    
    const gyro = gyros.find(g => g.type === type);
    return gyro ? gyro.weight : 0;
  }

  /**
   * Calculate heat sink tonnage per unit
   */
  calculateHeatSinkTonnage(config: UnitConfiguration): number {
    const type = UnitCalculationManager.extractComponentType(config.heatSinkType);
    
    switch (type) {
      case 'Double':
      case 'Double (IS)':
      case 'Double (Clan)':
        return 1.0;
      case 'Compact':
        return 0.5;
      case 'Laser':
        return 1.5;
      default: // Single
        return 1.0;
    }
  }

  /**
   * Calculate jump jet weight based on jump MP and tonnage
   */
  calculateJumpJetWeight(config: UnitConfiguration): number {
    const jumpMP = config.jumpMP || 0;
    if (jumpMP === 0) return 0;
    
    const tonnage = config.tonnage;
    
    if (tonnage <= 55) {
      return jumpMP * 0.5;
    } else if (tonnage <= 85) {
      return jumpMP * 1.0;
    } else {
      return jumpMP * 2.0;
    }
  }

  /**
   * Calculate structure weight based on tonnage and type
   */
  calculateStructureWeight(config: UnitConfiguration): number {
    const type = UnitCalculationManager.extractComponentType(config.structureType);
    const tonnage = config.tonnage;
    
    // Determine tech base
    let techBase = config.techBase;
    if (techBase === 'Mixed') {
      techBase = type.includes('Clan') ? 'Clan' : 'Inner Sphere';
    }

    const structures = SystemComponentsGateway.getStructures({
      techBase: techBase,
      unitType: 'BattleMech', // Default
      unitTonnage: tonnage,
      ignoreYearRestrictions: true
    });
    
    const structure = structures.find(s => s.type === type);
    return structure ? structure.weight : 0;
  }

  /**
   * Calculate total used tonnage
   */
  calculateUsedTonnage(config: UnitConfiguration): number {
    const structureWeight = this.calculateStructureWeight(config);
    const engineWeight = this.calculateEngineWeight(config);
    const gyroWeight = this.calculateGyroWeight(config);
    const cockpitWeight = 3.0; // Standard cockpit
    const heatSinkWeight = config.externalHeatSinks * this.calculateHeatSinkTonnage(config);
    const jumpJetWeight = this.calculateJumpJetWeight(config);
    const armorWeight = config.armorTonnage;
    
    return structureWeight + engineWeight + gyroWeight + cockpitWeight + heatSinkWeight + jumpJetWeight + armorWeight;
  }

  /**
   * Calculate remaining tonnage
   */
  calculateRemainingTonnage(config: UnitConfiguration): number {
    const usedTonnage = this.calculateUsedTonnage(config);
    return Math.max(0, config.tonnage - usedTonnage);
  }

  /**
   * Check if unit is overweight
   */
  isOverweight(config: UnitConfiguration): boolean {
    return this.calculateUsedTonnage(config) > config.tonnage;
  }

  /**
   * Calculate armor efficiency based on type
   */
  calculateArmorEfficiency(config: UnitConfiguration): number {
    const type = UnitCalculationManager.extractComponentType(config.armorType);
    
    switch (type) {
      case 'Ferro-Fibrous':
      case 'Ferro-Fibrous (Clan)':
        return 17.92;
      case 'Light Ferro-Fibrous':
        return 16; // Adjust if needed for other types
      case 'Heavy Ferro-Fibrous':
        return 16;
      case 'Stealth':
      case 'Stealth (Clan)':
        return 16;
      default: // Standard
        return 16;
    }
  }

  /**
   * Calculate available armor points from tonnage
   */
  calculateAvailableArmorPoints(config: UnitConfiguration): number {
    // Always use Math.floor for available points
    return Math.floor(config.armorTonnage * this.calculateArmorEfficiency(config));
  }

  /**
   * Calculate allocated armor points from location assignments
   */
  calculateAllocatedArmorPoints(config: UnitConfiguration): number {
    return Object.values(config.armorAllocation).reduce((total, location) => {
      return total + (location.front || 0) + (location.rear || 0);
    }, 0);
  }

  /**
   * Calculate unallocated armor points
   */
  calculateUnallocatedArmorPoints(config: UnitConfiguration): number {
    const availableFromTonnage = this.calculateAvailableArmorPoints(config);
    const allocated = this.calculateAllocatedArmorPoints(config);
    return availableFromTonnage - allocated;
  }

  /**
   * Calculate armor waste analysis
   */
  calculateArmorWasteAnalysis(config: UnitConfiguration): ArmorAnalysis {
    const unitMaximum = this.calculateMaxArmorPoints(config);
    const tonnageMaximum = this.calculateAvailableArmorPoints(config);
    const allocatedPoints = this.calculateAllocatedArmorPoints(config);
    const armorEfficiency = this.calculateArmorEfficiency(config);
    
    // Waste is always (available - max) if available > max, regardless of allocation
    const totalWasted = tonnageMaximum > unitMaximum ? tonnageMaximum - unitMaximum : 0;
    
    let locationsAtCap = 0;
    Object.entries(config.armorAllocation).forEach(([location, armor]) => {
      const maxForLocation = this.calculateMaxArmorPointsForLocation(location, config);
      const currentArmor = (armor.front || 0) + (armor.rear || 0);
      // Debug output for test diagnosis
      if (process.env.NODE_ENV === 'test') {
        console.log(`[DEBUG] Location: ${location}, Allocated: ${currentArmor}, Max: ${maxForLocation}`);
      }
      if (currentArmor >= maxForLocation) {
        locationsAtCap++;
      }
    });
    
    const optimalPoints = Math.min(allocatedPoints, unitMaximum);
    const optimalTonnage = Math.ceil(optimalPoints / armorEfficiency * 2) / 2;
    const tonnageSavings = Math.max(0, config.armorTonnage - optimalTonnage);
    const wastePercentage = tonnageMaximum > 0 ? (totalWasted / tonnageMaximum) * 100 : 0;
    
    return {
      totalWasted,
      wastedFromRounding: 0,
      trappedPoints: totalWasted,
      locationsAtCap,
      wastePercentage,
      optimalTonnage,
      tonnageSavings
    };
  }

  /**
   * Calculate maximum armor points for the unit
   */
  calculateMaxArmorPoints(config: UnitConfiguration): number {
    const internalStructure = this.calculateInternalStructurePoints(config);
    // Head is always capped at 9
    let total = 0;
    for (const [location, points] of Object.entries(internalStructure)) {
      if (location === 'HD') {
        total += 9;
      } else {
        total += points * 2;
      }
    }
    return total;
  }

  /**
   * Calculate maximum armor points for a specific location
   */
  calculateMaxArmorPointsForLocation(location: string, config: UnitConfiguration): number {
    const internalStructure = this.calculateInternalStructurePoints(config);
    
    if (location === 'HD') {
      return 9; // Head max is always 9
    }
    
    const structurePoints = internalStructure[location] || 0;
    return structurePoints * 2;
  }

  /**
   * Calculate internal structure points for each location
   */
  calculateInternalStructurePoints(config: UnitConfiguration): Record<string, number> {
    const tonnage = config.tonnage;
    
    // Use official BattleTech internal structure table
    const structure = getInternalStructurePoints(tonnage);
    
    return {
      HD: structure.HD,
      CT: structure.CT,
      LT: structure.LT,
      RT: structure.RT,
      LA: structure.LA,
      RA: structure.RA,
      LL: structure.LL,
      RL: structure.RL
    };
  }

  /**
   * Calculate heat sink efficiency
   */
  calculateHeatSinkEfficiency(config: UnitConfiguration): number {
    const type = UnitCalculationManager.extractComponentType(config.heatSinkType);
    
    switch (type) {
      case 'Double':
      case 'Double (IS)':
      case 'Double (Clan)':
        return 2.0;
      case 'Compact':
        return 1.0;
      case 'Laser':
        return 1.0;
      default: // Single
        return 1.0;
    }
  }

  /**
   * Calculate maximum walk MP for tonnage
   */
  calculateMaxWalkMP(config: UnitConfiguration): number {
    return Math.floor(400 / config.tonnage);
  }
} 