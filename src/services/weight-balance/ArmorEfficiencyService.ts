/**
 * Armor Efficiency Service - Specialized armor calculations and analysis
 * 
 * Handles armor efficiency calculations, optimization recommendations,
 * and armor-specific weight analysis for BattleMech construction.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ArmorEfficiency } from './types';

export class ArmorEfficiencyService {
  
  /**
   * Calculate comprehensive armor efficiency metrics
   */
  static calculateArmorEfficiency(config: UnitConfiguration): ArmorEfficiency {
    const armorType = this.extractComponentType(config.armorType);
    const basePointsPerTon = this.getBaseArmorEfficiency(armorType);
    
    const totalPoints = this.calculateTotalArmorPoints(config.armorAllocation);
    const totalWeight = config.armorTonnage || 0;
    const pointsPerTon = totalWeight > 0 ? totalPoints / totalWeight : 0;
    
    const maxPossiblePoints = Math.floor(config.tonnage * 0.4 * basePointsPerTon);
    const utilizationPercentage = maxPossiblePoints > 0 ? (totalPoints / maxPossiblePoints) * 100 : 0;
    
    const efficiency = this.calculateEfficiencyRating(pointsPerTon, basePointsPerTon);
    const recommendations = this.generateArmorEfficiencyRecommendations(
      efficiency, utilizationPercentage, armorType, config
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
  
  /**
   * Get optimal armor allocation for maximum efficiency
   */
  static getOptimalArmorAllocation(config: UnitConfiguration): {
    recommended: any;
    currentEfficiency: number;
    optimizedEfficiency: number;
    weightSavings: number;
  } {
    const current = this.calculateArmorEfficiency(config);
    
    // Calculate optimal distribution based on location priorities
    const locationPriorities = this.getLocationPriorities();
    const totalWeight = config.armorTonnage || 0;
    const armorType = this.extractComponentType(config.armorType);
    const pointsPerTon = this.getBaseArmorEfficiency(armorType);
    
    const maxPoints = Math.floor(totalWeight * pointsPerTon);
    const recommended = this.distributeArmorOptimally(maxPoints, locationPriorities);
    
    const optimizedPoints = this.calculateTotalArmorPoints(recommended);
    const optimizedWeight = optimizedPoints / pointsPerTon;
    
    return {
      recommended,
      currentEfficiency: current.pointsPerTon,
      optimizedEfficiency: optimizedPoints / optimizedWeight,
      weightSavings: totalWeight - optimizedWeight
    };
  }
  
  /**
   * Analyze armor type upgrade options
   */
  static analyzeArmorUpgrades(config: UnitConfiguration): {
    currentType: string;
    upgrades: Array<{
      type: string;
      pointsPerTon: number;
      weightSavings: number;
      criticalSlots: number;
      recommendation: string;
    }>;
  } {
    const currentType = this.extractComponentType(config.armorType);
    const currentWeight = config.armorTonnage || 0;
    const currentPoints = this.calculateTotalArmorPoints(config.armorAllocation);
    
    const upgrades = [];
    
    // Ferro-Fibrous upgrade
    if (currentType === 'Standard') {
      const ferroPointsPerTon = 35.2;
      const ferroWeight = currentPoints / ferroPointsPerTon;
      const weightSavings = currentWeight - ferroWeight;
      
      upgrades.push({
        type: 'Ferro-Fibrous',
        pointsPerTon: ferroPointsPerTon,
        weightSavings,
        criticalSlots: 14,
        recommendation: weightSavings > 0.5 ? 
          'Highly recommended - significant weight savings' :
          'Minimal benefit for this configuration'
      });
    }
    
    // Hardened armor analysis
    if (config.tonnage >= 50) {
      upgrades.push({
        type: 'Hardened',
        pointsPerTon: 16, // Half points but double protection
        weightSavings: currentWeight * -1, // Actually increases weight
        criticalSlots: 0,
        recommendation: 'Provides double protection but doubles weight - for heavily armored builds'
      });
    }
    
    return {
      currentType,
      upgrades
    };
  }
  
  /**
   * Calculate armor coverage analysis
   */
  static analyzeArmorCoverage(config: UnitConfiguration): {
    coverage: {
      [location: string]: {
        current: number;
        maximum: number;
        percentage: number;
        priority: 'high' | 'medium' | 'low';
        recommendation: string;
      };
    };
    overallCoverage: number;
    vulnerabilities: string[];
  } {
    const allocation = config.armorAllocation || {};
    const maxArmorByLocation = this.getMaxArmorByLocation(config.tonnage);
    const locationPriorities = this.getLocationPriorities();
    
    const coverage: any = {};
    const vulnerabilities: string[] = [];
    let totalCoverage = 0;
    let totalMaxCoverage = 0;
    
    Object.entries(maxArmorByLocation).forEach(([location, maxArmor]) => {
      // Type-safe allocation access using unknown conversion
      const allocationRecord = allocation as unknown as Record<string, unknown>;
      const current = this.getLocationArmorPoints(allocationRecord[location] || {});
      const percentage = (current / maxArmor) * 100;
      const priority = locationPriorities[location] || 'medium';
      
      let recommendation = '';
      if (percentage < 50) {
        recommendation = 'Critically under-armored - immediate attention needed';
        vulnerabilities.push(`${location} has only ${percentage.toFixed(1)}% armor coverage`);
      } else if (percentage < 75) {
        recommendation = 'Below recommended armor levels';
        if (priority === 'high') {
          vulnerabilities.push(`${location} armor below recommended for critical location`);
        }
      } else if (percentage > 95) {
        recommendation = 'Well protected';
      } else {
        recommendation = 'Adequate protection';
      }
      
      coverage[location] = {
        current,
        maximum: maxArmor,
        percentage,
        priority,
        recommendation
      };
      
      totalCoverage += current;
      totalMaxCoverage += maxArmor;
    });
    
    const overallCoverage = totalMaxCoverage > 0 ? (totalCoverage / totalMaxCoverage) * 100 : 0;
    
    return {
      coverage,
      overallCoverage,
      vulnerabilities
    };
  }
  
  // ===== PRIVATE CALCULATION METHODS =====
  
  /**
   * Get base armor efficiency for armor type
   */
  private static getBaseArmorEfficiency(armorType: string): number {
    switch (armorType) {
      case 'Ferro-Fibrous':
      case 'Ferro-Fibrous (Clan)':
        return 35.2;
      case 'Hardened':
        return 16; // Half points but double protection
      case 'Laser-Reflective':
        return 32; // Same as standard but special properties
      case 'Reactive':
        return 32; // Same as standard but special properties
      case 'Standard':
      default:
        return 32;
    }
  }
  
  /**
   * Calculate efficiency rating from points per ton
   */
  private static calculateEfficiencyRating(
    pointsPerTon: number, 
    basePointsPerTon: number
  ): ArmorEfficiency['efficiency'] {
    const efficiency = pointsPerTon / basePointsPerTon;
    
    if (efficiency >= 0.95) return 'excellent';
    if (efficiency >= 0.85) return 'good';
    if (efficiency >= 0.7) return 'average';
    return 'poor';
  }
  
  /**
   * Generate armor efficiency recommendations
   */
  private static generateArmorEfficiencyRecommendations(
    efficiency: ArmorEfficiency['efficiency'],
    utilization: number,
    armorType: string,
    config: UnitConfiguration
  ): string[] {
    const recommendations: string[] = [];
    
    if (efficiency === 'poor') {
      recommendations.push('Consider upgrading to Ferro-Fibrous armor for better efficiency');
    }
    
    if (utilization < 70) {
      recommendations.push('Increase armor allocation for better protection');
    }
    
    if (armorType === 'Standard' && utilization > 80) {
      recommendations.push('Ferro-Fibrous armor would provide more protection for same weight');
    }
    
    if (utilization > 95) {
      recommendations.push('Armor allocation is near maximum - excellent protection');
    }
    
    // Tonnage-specific recommendations
    if (config.tonnage >= 75 && armorType === 'Standard') {
      recommendations.push('Heavy mechs benefit significantly from Ferro-Fibrous armor');
    }
    
    if (config.tonnage <= 35 && utilization < 60) {
      recommendations.push('Light mechs need maximum armor efficiency - consider upgrades');
    }
    
    return recommendations;
  }
  
  /**
   * Calculate total armor points from allocation
   */
  private static calculateTotalArmorPoints(armorAllocation: any): number {
    if (!armorAllocation) return 0;
    
    return Object.values(armorAllocation).reduce((total: number, location: any) => {
      if (!location) return total;
      return total + this.getLocationArmorPoints(location);
    }, 0);
  }
  
  /**
   * Get armor points for a specific location
   */
  private static getLocationArmorPoints(location: any): number {
    if (!location) return 0;
    const front = location.front || 0;
    const rear = location.rear || 0;
    return front + rear;
  }
  
  /**
   * Get location priorities for armor allocation
   */
  private static getLocationPriorities(): { [location: string]: 'high' | 'medium' | 'low' } {
    return {
      CT: 'high',     // Center Torso
      HD: 'high',     // Head
      LT: 'high',     // Left Torso
      RT: 'high',     // Right Torso
      LA: 'medium',   // Left Arm
      RA: 'medium',   // Right Arm
      LL: 'medium',   // Left Leg
      RL: 'medium'    // Right Leg
    };
  }
  
  /**
   * Get maximum armor by location for tonnage
   */
  private static getMaxArmorByLocation(tonnage: number): { [location: string]: number } {
    // Simplified max armor calculation based on BattleTech rules
    const maxTotal = tonnage * 2; // Rough maximum armor points
    
    return {
      HD: Math.min(9, Math.ceil(tonnage * 0.18)),
      CT: Math.ceil(maxTotal * 0.25),
      LT: Math.ceil(maxTotal * 0.2),
      RT: Math.ceil(maxTotal * 0.2),
      LA: Math.ceil(maxTotal * 0.125),
      RA: Math.ceil(maxTotal * 0.125),
      LL: Math.ceil(maxTotal * 0.15),
      RL: Math.ceil(maxTotal * 0.15)
    };
  }
  
  /**
   * Distribute armor optimally based on priorities
   */
  private static distributeArmorOptimally(
    totalPoints: number, 
    priorities: { [location: string]: 'high' | 'medium' | 'low' }
  ): any {
    const allocation: any = {};
    let remainingPoints = totalPoints;
    
    // Prioritize high-priority locations first
    const locations = Object.keys(priorities).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[priorities[b]] - priorityOrder[priorities[a]];
    });
    
    // This is a simplified distribution - real implementation would be more complex
    locations.forEach(location => {
      if (remainingPoints <= 0) return;
      
      const priority = priorities[location];
      let allocation_points;
      
      if (priority === 'high') {
        allocation_points = Math.min(remainingPoints * 0.2, remainingPoints);
      } else if (priority === 'medium') {
        allocation_points = Math.min(remainingPoints * 0.15, remainingPoints);
      } else {
        allocation_points = Math.min(remainingPoints * 0.1, remainingPoints);
      }
      
      allocation[location] = {
        front: Math.floor(allocation_points * 0.8),
        rear: Math.floor(allocation_points * 0.2)
      };
      
      remainingPoints -= allocation_points;
    });
    
    return allocation;
  }
  
  /**
   * Extract component type helper
   */
  private static extractComponentType(component: any): string {
    if (typeof component === 'string') return component;
    return component?.type || 'Standard';
  }
}




