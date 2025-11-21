/**
 * WeightOptimizationService - Focused service for weight optimization
 * 
 * Extracted from WeightBalanceService to handle optimization suggestions and analysis
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { IEquipmentInstance } from '../../types/core/UnitInterfaces';
// import { ComponentWeightBreakdown } from './WeightCalculationService'; // TODO: This interface doesn't exist yet

export interface OptimizationSuggestion {
  category: 'engine' | 'armor' | 'structure' | 'equipment' | 'heatsinks' | 'jumpjets';
  type: 'weight_reduction' | 'efficiency_improvement' | 'cost_reduction';
  description: string;
  currentWeight: number;
  suggestedWeight: number;
  weightSavings: number;
  impact: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  priority: 'high' | 'medium' | 'low';
}

export interface WeightReductionOptions {
  structureUpgrade: {
    available: boolean;
    currentWeight: number;
    newWeight: number;
    savings: number;
    cost: string;
  };
  engineDowngrade: {
    available: boolean;
    options: {
      rating: number;
      weight: number;
      savings: number;
      walkMP: number;
    }[];
  };
  armorOptimization: {
    available: boolean;
    maxReduction: number;
    recommendations: string[];
  };
  equipmentAlternatives: {
    available: boolean;
    suggestions: {
      current: string;
      alternative: string;
      weightSavings: number;
    }[];
  };
}

export interface WeightSaving {
  component: string;
  currentWeight: number;
  proposedWeight: number;
  savings: number;
  method: string;
  tradeoffs: string[];
  feasible: boolean;
}

export interface ArmorEfficiency {
  totalPoints: number;
  totalWeight: number;
  pointsPerTon: number;
  efficiency: 'excellent' | 'good' | 'average' | 'poor';
  maxPossiblePoints: number;
  utilizationPercentage: number;
  recommendations: string[];
}

export interface WeightPenalty {
  component: string;
  reason: string;
  penalty: number;
  description: string;
  canBeAvoided: boolean;
  suggestion?: string;
}

export interface WeightOptimizationService {
  generateOptimizationSuggestions(config: UnitConfiguration, equipment: IEquipmentInstance[]): OptimizationSuggestion[];
  calculateWeightReduction(config: UnitConfiguration): WeightReductionOptions;
  findWeightSavings(config: UnitConfiguration, equipment: IEquipmentInstance[]): WeightSaving[];
  calculateArmorEfficiency(config: UnitConfiguration): ArmorEfficiency;
  calculateWeightPenalties(config: UnitConfiguration): WeightPenalty[];
}

export class WeightOptimizationServiceImpl implements WeightOptimizationService {
  
  generateOptimizationSuggestions(config: UnitConfiguration, equipment: IEquipmentInstance[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Engine optimization
    suggestions.push(...this.generateEngineOptimizations(config));
    
    // Structure optimization
    suggestions.push(...this.generateStructureOptimizations(config));
    
    // Armor optimization
    suggestions.push(...this.generateArmorOptimizations(config));
    
    // Heat sink optimization
    suggestions.push(...this.generateHeatSinkOptimizations(config));
    
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
    
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Standard' && config.tonnage >= 75) {
      penalties.push({
        component: 'Structure',
        reason: 'Standard structure on heavy mech',
        penalty: 2.5,
        description: 'Heavy mechs benefit significantly from Endo Steel structure',
        canBeAvoided: true,
        suggestion: 'Upgrade to Endo Steel structure for weight savings'
      });
    }
    
    if (config.engineType === 'Standard' && config.tonnage <= 50) {
      const engineWeight = (config.engineRating || 0) / 25;
      const xlWeight = engineWeight * 0.5;
      penalties.push({
        component: 'Engine',
        reason: 'Standard engine on light mech',
        penalty: engineWeight - xlWeight,
        description: 'Light mechs benefit from XL engines despite vulnerability',
        canBeAvoided: true,
        suggestion: 'Consider XL engine for significant weight savings'
      });
    }
    
    return penalties;
  }
  
  // ===== PRIVATE HELPER METHODS =====
  
  private generateEngineOptimizations(config: UnitConfiguration): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    if (config.engineType === 'Standard' && config.tonnage <= 50) {
      const currentWeight = (config.engineRating || 0) / 25;
      const xlWeight = currentWeight * 0.5;
      suggestions.push({
        category: 'engine',
        type: 'weight_reduction',
        description: 'Upgrade to XL Engine for significant weight savings',
        currentWeight,
        suggestedWeight: xlWeight,
        weightSavings: currentWeight - xlWeight,
        impact: 'Reduced survivability but major weight savings',
        difficulty: 'moderate',
        priority: 'high'
      });
    }
    
    return suggestions;
  }
  
  private generateStructureOptimizations(config: UnitConfiguration): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Standard' && config.tonnage >= 50) {
      const currentWeight = Math.ceil(config.tonnage / 10);
      const endoWeight = currentWeight * 0.5;
      suggestions.push({
        category: 'structure',
        type: 'weight_reduction',
        description: 'Upgrade to Endo Steel structure',
        currentWeight,
        suggestedWeight: endoWeight,
        weightSavings: currentWeight - endoWeight,
        impact: 'Uses critical slots but saves significant weight',
        difficulty: 'easy',
        priority: 'high'
      });
    }
    
    return suggestions;
  }
  
  private generateArmorOptimizations(config: UnitConfiguration): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    const armorType = this.extractComponentType(config.armorType);
    if (armorType === 'Standard') {
      const currentWeight = config.armorTonnage || 0;
      const ferroWeight = currentWeight * (32 / 35.2);
      suggestions.push({
        category: 'armor',
        type: 'efficiency_improvement',
        description: 'Upgrade to Ferro-Fibrous armor for more protection per ton',
        currentWeight,
        suggestedWeight: ferroWeight,
        weightSavings: currentWeight - ferroWeight,
        impact: 'Uses critical slots but improves armor efficiency',
        difficulty: 'easy',
        priority: 'medium'
      });
    }
    
    return suggestions;
  }
  
  private generateHeatSinkOptimizations(config: UnitConfiguration): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    const heatSinkType = this.extractComponentType(config.heatSinkType);
    if (heatSinkType === 'Single') {
      // Simplified - would need to count actual external heat sinks
      const externalHeatSinks = 5; // Example count
      if (externalHeatSinks > 0) {
        const doubleCount = Math.ceil(externalHeatSinks / 2);
        const doubleWeight = doubleCount * 1.0;
        suggestions.push({
          category: 'heatsinks',
          type: 'efficiency_improvement',
          description: 'Upgrade to Double Heat Sinks for better heat dissipation',
          currentWeight: externalHeatSinks,
          suggestedWeight: doubleWeight,
          weightSavings: externalHeatSinks - doubleWeight,
          impact: 'Improved heat management with weight savings',
          difficulty: 'easy',
          priority: 'medium'
        });
      }
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
    const currentRating = config.engineRating || 0;
    
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
      const currentWeight = (config.engineRating || 0) / 25;
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
  
  private calculateTotalArmorPoints(armorAllocation: any): number {
    if (!armorAllocation) return 0;
    
    return Object.values(armorAllocation).reduce((total: number, location: any) => {
      if (!location) return total;
      const front = location.front || 0;
      const rear = location.rear || 0;
      return total + front + rear;
    }, 0);
  }
  
  private extractComponentType(component: any): string {
    if (typeof component === 'string') return component;
    if (component && typeof component === 'object') {
      return component.type || component.name || 'Standard';
    }
    return 'Standard';
  }
}

export const createWeightOptimizationService = (): WeightOptimizationService => {
  return new WeightOptimizationServiceImpl();
};




