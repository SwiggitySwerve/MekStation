/**
 * Optimization Service - Weight reduction and efficiency suggestions
 * 
 * Generates optimization suggestions, weight reduction options, and efficiency improvements
 * for BattleMech construction and configuration.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { WeightCalculationService } from './WeightCalculationService';
import { 
  OptimizationSuggestion, 
  WeightReductionOptions, 
  WeightSaving, 
  WeightPenalty,
  ComponentWeightBreakdown,
  Equipment 
} from './types';

export class OptimizationService {
  
  /**
   * Generate comprehensive optimization suggestions
   */
  static generateOptimizationSuggestions(
    config: UnitConfiguration, 
    equipment: Equipment[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const weights = WeightCalculationService.calculateComponentWeights(config);
    
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
    
    // Jump jet optimization
    suggestions.push(...this.generateJumpJetOptimizations(config, weights.jumpJets));
    
    // Sort by priority and weight savings
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.weightSavings - a.weightSavings;
    });
  }
  
  /**
   * Calculate weight reduction options
   */
  static calculateWeightReduction(config: UnitConfiguration): WeightReductionOptions {
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
  
  /**
   * Find specific weight savings opportunities
   */
  static findWeightSavings(config: UnitConfiguration, equipment: Equipment[]): WeightSaving[] {
    const savings: WeightSaving[] = [];
    
    // Structure savings
    savings.push(...this.findStructureSavings(config));
    
    // Engine savings
    savings.push(...this.findEngineSavings(config));
    
    // Armor savings
    savings.push(...this.findArmorSavings(config));
    
    // Equipment savings
    savings.push(...this.findEquipmentSavings(equipment));
    
    // Heat sink savings
    savings.push(...this.findHeatSinkSavings(config));
    
    return savings.filter(saving => saving.savings > 0).sort((a, b) => b.savings - a.savings);
  }
  
  /**
   * Calculate weight penalties for inefficient designs
   */
  static calculateWeightPenalties(config: UnitConfiguration): WeightPenalty[] {
    const penalties: WeightPenalty[] = [];
    
    // Check for inefficient engine combinations
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
    
    // Check for inefficient structure combinations
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Standard' && config.tonnage >= 75) {
      penalties.push({
        component: 'Structure',
        reason: 'Standard structure on heavy mech',
        penalty: Math.ceil(config.tonnage / 20),
        description: 'Standard structure is inefficient on heavy mechs',
        canBeAvoided: true,
        suggestion: 'Upgrade to Endo Steel structure for significant weight savings'
      });
    }
    
    // Check for inefficient armor type
    const armorType = this.extractComponentType(config.armorType);
    if (armorType === 'Standard' && config.tonnage >= 50) {
      penalties.push({
        component: 'Armor',
        reason: 'Standard armor on medium+ mech',
        penalty: 1,
        description: 'Ferro-Fibrous armor provides better protection per ton',
        canBeAvoided: true,
        suggestion: 'Consider upgrading to Ferro-Fibrous armor'
      });
    }
    
    // Check for inefficient heat sinks
    const heatSinkType = this.extractComponentType(config.heatSinkType);
    if (heatSinkType === 'Single' && config.externalHeatSinks > 0) {
      penalties.push({
        component: 'Heat Sinks',
        reason: 'Single heat sinks with external units',
        penalty: config.externalHeatSinks * 0.5,
        description: 'Double heat sinks provide better heat dissipation per ton',
        canBeAvoided: true,
        suggestion: 'Upgrade to Double Heat Sinks for better efficiency'
      });
    }
    
    return penalties;
  }
  
  /**
   * Get quick optimization wins
   */
  static getQuickOptimizations(config: UnitConfiguration): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Easy structure upgrade
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Standard') {
      const currentWeight = Math.ceil(config.tonnage / 10);
      const newWeight = currentWeight * 0.5;
      
      suggestions.push({
        category: 'structure',
        type: 'weight_reduction',
        description: 'Upgrade to Endo Steel structure',
        currentWeight,
        suggestedWeight: newWeight,
        weightSavings: currentWeight - newWeight,
        impact: 'Frees significant weight for equipment',
        difficulty: 'easy',
        priority: 'high'
      });
    }
    
    // Easy armor upgrade
    const armorType = this.extractComponentType(config.armorType);
    if (armorType === 'Standard') {
      const currentWeight = config.armorTonnage || 0;
      const newWeight = currentWeight * (32 / 35.2);
      
      suggestions.push({
        category: 'armor',
        type: 'efficiency_improvement',
        description: 'Upgrade to Ferro-Fibrous armor',
        currentWeight,
        suggestedWeight: newWeight,
        weightSavings: currentWeight - newWeight,
        impact: 'Better protection per ton',
        difficulty: 'easy',
        priority: 'medium'
      });
    }
    
    return suggestions;
  }
  
  // ===== COMPONENT-SPECIFIC OPTIMIZATIONS =====
  
  private static generateEngineOptimizations(
    config: UnitConfiguration, 
    engine: ComponentWeightBreakdown['engine']
  ): OptimizationSuggestion[] {
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
    
    if (config.engineType === 'Standard' && config.tonnage <= 35) {
      const lightWeight = engine.weight * 0.75;
      suggestions.push({
        category: 'engine',
        type: 'weight_reduction',
        description: 'Consider Light Engine as middle ground',
        currentWeight: engine.weight,
        suggestedWeight: lightWeight,
        weightSavings: engine.weight - lightWeight,
        impact: 'Moderate weight savings with less vulnerability than XL',
        difficulty: 'moderate',
        priority: 'medium'
      });
    }
    
    return suggestions;
  }
  
  private static generateStructureOptimizations(
    config: UnitConfiguration, 
    structure: ComponentWeightBreakdown['structure']
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    if (structure.type === 'Standard') {
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
  
  private static generateArmorOptimizations(
    config: UnitConfiguration, 
    armor: ComponentWeightBreakdown['armor']
  ): OptimizationSuggestion[] {
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
  
  private static generateHeatSinkOptimizations(
    config: UnitConfiguration, 
    heatSinks: ComponentWeightBreakdown['heatSinks']
  ): OptimizationSuggestion[] {
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
  
  private static generateEquipmentOptimizations(equipment: Equipment[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Look for heavy weapons that could be optimized
    const heavyWeapons = equipment.filter(item => 
      item.equipmentData?.tonnage > 5 && item.equipmentData?.type?.includes('weapon')
    );
    
    heavyWeapons.forEach(weapon => {
      suggestions.push({
        category: 'equipment',
        type: 'weight_reduction',
        description: `Consider lighter alternative to ${weapon.equipmentData.name}`,
        currentWeight: weapon.equipmentData.tonnage * weapon.quantity,
        suggestedWeight: weapon.equipmentData.tonnage * weapon.quantity * 0.8,
        weightSavings: weapon.equipmentData.tonnage * weapon.quantity * 0.2,
        impact: 'Reduced firepower but significant weight savings',
        difficulty: 'moderate',
        priority: 'low'
      });
    });
    
    return suggestions;
  }
  
  private static generateJumpJetOptimizations(
    config: UnitConfiguration, 
    jumpJets: ComponentWeightBreakdown['jumpJets']
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    if (jumpJets.weight > 0 && jumpJets.type === 'Standard Jump Jet') {
      suggestions.push({
        category: 'jumpjets',
        type: 'weight_reduction',
        description: 'Consider reducing jump MP if not essential',
        currentWeight: jumpJets.weight,
        suggestedWeight: jumpJets.weight * 0.5,
        weightSavings: jumpJets.weight * 0.5,
        impact: 'Reduced mobility but significant weight savings',
        difficulty: 'easy',
        priority: 'low'
      });
    }
    
    return suggestions;
  }
  
  // ===== ANALYSIS METHODS =====
  
  private static analyzeStructureUpgrade(config: UnitConfiguration) {
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
  
  private static analyzeEngineDowngrade(config: UnitConfiguration) {
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
  
  private static analyzeArmorOptimization(config: UnitConfiguration) {
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
  
  private static analyzeEquipmentAlternatives(config: UnitConfiguration) {
    return {
      available: false,
      suggestions: []
    };
  }
  
  // ===== WEIGHT SAVINGS FINDERS =====
  
  private static findStructureSavings(config: UnitConfiguration): WeightSaving[] {
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
  
  private static findEngineSavings(config: UnitConfiguration): WeightSaving[] {
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
  
  private static findArmorSavings(config: UnitConfiguration): WeightSaving[] {
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
  
  private static findEquipmentSavings(equipment: Equipment[]): WeightSaving[] {
    const savings: WeightSaving[] = [];
    
    // Find heavy equipment that could be optimized
    const heavyItems = equipment.filter(item => 
      item.equipmentData?.tonnage > 3
    );
    
    heavyItems.forEach(item => {
      const currentWeight = item.equipmentData.tonnage * item.quantity;
      const reduction = currentWeight * 0.1; // 10% reduction example
      
      savings.push({
        component: item.equipmentData.name,
        currentWeight,
        proposedWeight: currentWeight - reduction,
        savings: reduction,
        method: 'Use lighter variant',
        tradeoffs: ['May reduce performance'],
        feasible: true
      });
    });
    
    return savings;
  }
  
  private static findHeatSinkSavings(config: UnitConfiguration): WeightSaving[] {
    const savings: WeightSaving[] = [];
    const heatSinkType = this.extractComponentType(config.heatSinkType);
    
    if (heatSinkType === 'Single' && config.externalHeatSinks > 0) {
      const currentWeight = config.externalHeatSinks;
      const newWeight = Math.ceil(config.externalHeatSinks / 2);
      
      savings.push({
        component: 'Heat Sinks',
        currentWeight,
        proposedWeight: newWeight,
        savings: currentWeight - newWeight,
        method: 'Upgrade to Double Heat Sinks',
        tradeoffs: ['None - pure improvement'],
        feasible: true
      });
    }
    
    return savings;
  }
  
  // ===== HELPER METHODS =====
  
  private static extractComponentType(component: any): string {
    if (typeof component === 'string') return component;
    return component?.type || 'Standard';
  }
}




