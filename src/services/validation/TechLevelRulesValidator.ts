/**
 * TechLevelRulesValidator - Tech level, era, and availability validation for BattleTech construction rules
 * 
 * Refactored from large monolithic file into modular architecture.
 * Now orchestrates validation using specialized modules for better maintainability and testability.
 * 
 * @see TECHNICAL_ARCHITECTURE.md for service architecture patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { 
  TechLevelValidation, 
  TechLevelValidationContext,
  TechLevelViolation,
  TechOptimization,
  AlternativeTechBase,
  TechUpgradePath,
  TechOptimizationRecommendation,
  TechCostAnalysis,
  ComponentAvailability
} from './types/TechLevelTypes';
import { EraManager } from './modules/EraManager';
import { TechBaseManager } from './modules/TechBaseManager';
import { AvailabilityManager } from './modules/AvailabilityManager';
import { MixedTechManager } from './modules/MixedTechManager';
import { ComponentManager } from './utils/ComponentManager';

export class TechLevelRulesValidator {
  private static readonly DEFAULT_CONTEXT: TechLevelValidationContext = {
    strictEraCompliance: false,
    allowMixedTech: false,
    targetAvailabilityRating: 'D',
    validateTechProgression: true,
    enforceCanonicalRestrictions: false
  };

  /**
   * Validate complete tech level compliance
   */
  static validateTechLevel(
    config: UnitConfiguration, 
    equipment: any[], 
    context: Partial<TechLevelValidationContext> = {}
  ): TechLevelValidation {
    const ctx = { ...this.DEFAULT_CONTEXT, ...context };
    const violations: TechLevelViolation[] = [];
    const recommendations: string[] = [];
    
    const unitTechLevel = this.determineUnitTechLevel(config, equipment);
    const unitTechBase = config.techBase || 'Inner Sphere';
    const era = EraManager.determineEra(config);
    
    // Extract all components
    const allComponents = ComponentManager.getAllComponents(config, equipment);
    
    // Adjust context for pure tech base units
    const adjustedCtx = this.adjustContextForTechBase(ctx, config, allComponents);
    
    // Validate mixed tech
    const mixedTech = MixedTechManager.validateMixedTech(config, allComponents, adjustedCtx);
    
    // Validate era restrictions
    const eraRestrictions = EraManager.validateEraRestrictions(config, allComponents, era, adjustedCtx);
    
    // Validate availability ratings
    const availability = AvailabilityManager.validateAvailabilityRating(allComponents, config, adjustedCtx);
    
    // Validate tech base compliance
    const techBaseCompliance = TechBaseManager.validateTechBaseCompliance(config, allComponents, adjustedCtx);
    
    // Compile violations from all sub-validations
    violations.push(...mixedTech.violations.map(v => ({
      type: 'mixed_tech_violation' as const,
      component: 'Mixed Tech',
      expected: 'Pure tech base',
      actual: 'Mixed tech detected',
      message: v,
      severity: 'major' as const,
      suggestedFix: 'Remove mixed tech components or enable mixed tech rules'
    })));
    
    violations.push(...eraRestrictions.invalidComponents.map(ec => ({
      type: 'era_violation' as const,
      component: ec.component,
      expected: ec.currentEra,
      actual: ec.availableEra,
      message: ec.message,
      severity: ec.severity,
      suggestedFix: `Replace with ${ec.currentEra}-appropriate equivalent or adjust era to ${ec.availableEra}`
    })));
    
    violations.push(...availability.violations.map(av => ({
      type: 'availability_violation' as const,
      component: av.component,
      expected: av.requiredRating,
      actual: av.rating,
      message: av.message,
      severity: av.severity,
      suggestedFix: `Replace with more commonly available alternative`
    })));
    
    violations.push(...techBaseCompliance.conflicts.map(tbc => ({
      type: 'tech_base_mismatch' as const,
      component: tbc.component,
      expected: tbc.unitTechBase,
      actual: tbc.componentTechBase,
      message: `Component tech base ${tbc.componentTechBase} incompatible with unit tech base ${tbc.unitTechBase}`,
      severity: tbc.severity,
      suggestedFix: tbc.resolution
    })));
    
    // Generate recommendations
    if (mixedTech.isMixed && !ctx.allowMixedTech) {
      recommendations.push('Consider enabling mixed tech rules or standardizing to single tech base');
    }
    
    if (eraRestrictions.invalidComponents.length > 0) {
      recommendations.push('Update components to match selected era or adjust era setting');
    }
    
    if (availability.violations.length > 0) {
      recommendations.push('Consider using more commonly available components to improve availability rating');
    }
    
    return {
      isValid: violations.filter(v => v.severity === 'critical' || v.severity === 'major').length === 0,
      unitTechLevel,
      unitTechBase,
      era,
      mixedTech,
      eraRestrictions,
      availability,
      techBaseCompliance,
      violations,
      recommendations
    };
  }

  /**
   * Validate mixed tech compliance (delegated to MixedTechManager)
   */
  static validateMixedTech(
    config: UnitConfiguration, 
    equipment: any[], 
    context: TechLevelValidationContext
  ) {
    const components = ComponentManager.getAllComponents(config, equipment);
    return MixedTechManager.validateMixedTech(config, components, context);
  }

  /**
   * Validate era restrictions (delegated to EraManager)
   */
  static validateEraRestrictions(
    config: UnitConfiguration, 
    equipment: any[], 
    era: string,
    context: TechLevelValidationContext
  ) {
    const components = ComponentManager.getAllComponents(config, equipment);
    return EraManager.validateEraRestrictions(config, components, era, context);
  }

  /**
   * Validate availability ratings (delegated to AvailabilityManager)
   */
  static validateAvailabilityRating(
    equipment: any[], 
    config: UnitConfiguration,
    context: TechLevelValidationContext
  ) {
    const components = ComponentManager.getAllComponents(config, equipment);
    return AvailabilityManager.validateAvailabilityRating(components, config, context);
  }

  /**
   * Validate tech base compliance (delegated to TechBaseManager)
   */
  static validateTechBaseCompliance(
    config: UnitConfiguration, 
    equipment: any[],
    context: TechLevelValidationContext
  ) {
    const components = ComponentManager.getAllComponents(config, equipment);
    return TechBaseManager.validateTechBaseCompliance(config, components, context);
  }

  /**
   * Generate tech optimization recommendations
   */
  static generateTechOptimizations(config: UnitConfiguration, equipment: any[]): TechOptimization {
    const recommendations: TechOptimizationRecommendation[] = [];
    const alternativeTechBases: AlternativeTechBase[] = [];
    const upgradePaths: TechUpgradePath[] = [];
    
    // Analyze current tech configuration
    const validation = this.validateTechLevel(config, equipment);
    
    // Generate tech base alternatives
    if (validation.techBaseCompliance.conflicts.length > 0) {
      alternativeTechBases.push(...this.generateAlternativeTechBases(config, equipment));
    }
    
    // Generate upgrade paths
    if (validation.availability.violations.length > 0) {
      upgradePaths.push(...this.generateUpgradePaths(config, equipment));
    }
    
    // Generate specific recommendations
    if (validation.mixedTech.isMixed && !validation.mixedTech.allowedMixed) {
      recommendations.push({
        type: 'tech_base_change',
        description: 'Standardize to single tech base',
        benefit: 'Eliminates mixed tech violations and simplifies procurement',
        fromValue: 'Mixed',
        toValue: validation.unitTechBase,
        impact: {
          availabilityChange: 10,
          costChange: -15,
          performanceChange: 0,
          compatibilityChange: 25,
          ruleCompliance: 30
        },
        difficulty: 'moderate',
        priority: 'high'
      });
    }
    
    const costAnalysis = this.calculateTechCostAnalysis(config, equipment, recommendations);
    
    return {
      recommendations,
      alternativeTechBases,
      upgradePaths,
      costAnalysis
    };
  }

  /**
   * Calculate tech level efficiency score (0-100)
   */
  static calculateTechEfficiency(config: UnitConfiguration, equipment: any[]): number {
    const validation = this.validateTechLevel(config, equipment);
    let efficiency = 100;
    
    // Penalize violations
    validation.violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          efficiency -= 25;
          break;
        case 'major':
          efficiency -= 15;
          break;
        case 'minor':
          efficiency -= 5;
          break;
      }
    });
    
    // Bonus for good availability
    const avgAvailability = AvailabilityManager.calculateAverageAvailabilityScore(validation.availability.componentRatings);
    efficiency += Math.max(0, (avgAvailability - 3) * 5); // Bonus for better than 'C' rating
    
    // Bonus for tech base consistency
    if (!validation.mixedTech.isMixed) {
      efficiency += 10;
    }
    
    return Math.max(0, Math.min(100, efficiency));
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
        name: 'Tech Base Compatibility',
        description: 'Components must be compatible with unit tech base',
        severity: 'major',
        category: 'tech_level'
      },
      {
        name: 'Era Restrictions',
        description: 'Components must be available in the selected era',
        severity: 'major',
        category: 'tech_level'
      },
      {
        name: 'Mixed Tech Rules',
        description: 'Mixed tech usage must follow canonical restrictions',
        severity: 'major',
        category: 'tech_level'
      },
      {
        name: 'Availability Rating',
        description: 'Component availability should meet target rating requirements',
        severity: 'minor',
        category: 'tech_level'
      }
    ];
  }

  // ===== PRIVATE HELPER METHODS =====

  private static determineUnitTechLevel(config: UnitConfiguration, equipment: any[]): string {
    // Simplified tech level determination
    const hasAdvancedTech = equipment.some(item => 
      item.equipmentData?.name?.toLowerCase().includes('advanced') ||
      item.equipmentData?.name?.toLowerCase().includes('improved')
    );
    
    const hasClanTech = equipment.some(item => 
      item.equipmentData?.techBase === 'Clan'
    );
    
    if (hasClanTech) return 'Advanced';
    if (hasAdvancedTech) return 'Advanced';
    return 'Standard';
  }

  private static generateAlternativeTechBases(config: UnitConfiguration, equipment: any[]): AlternativeTechBase[] {
    const alternatives: AlternativeTechBase[] = [];
    
    // Inner Sphere alternative
    if (config.techBase !== 'Inner Sphere') {
      alternatives.push({
        name: 'Inner Sphere Standard',
        description: 'Convert to pure Inner Sphere technology',
        techBase: 'Inner Sphere',
        era: 'Succession Wars',
        advantages: ['Widely available', 'Lower cost', 'Easier maintenance'],
        disadvantages: ['Lower performance', 'Heavier components'],
        componentChanges: [],
        overallRating: 75
      });
    }
    
    // Clan alternative
    if (config.techBase !== 'Clan') {
      alternatives.push({
        name: 'Clan Technology',
        description: 'Convert to pure Clan technology',
        techBase: 'Clan',
        era: 'Clan Invasion',
        advantages: ['Superior performance', 'Lighter weight', 'Advanced capabilities'],
        disadvantages: ['Very rare', 'Expensive', 'Difficult maintenance'],
        componentChanges: [],
        overallRating: 90
      });
    }
    
    return alternatives;
  }

  private static generateUpgradePaths(config: UnitConfiguration, equipment: any[]): TechUpgradePath[] {
    const upgradePaths: TechUpgradePath[] = [];
    
    upgradePaths.push({
      name: 'Availability Improvement',
      description: 'Replace rare components with more common alternatives',
      steps: [
        {
          step: 1,
          description: 'Replace exotic components',
          components: ['Advanced components'],
          cost: 1000,
          timeline: '1 month',
          prerequisites: ['Component analysis']
        }
      ],
      totalCost: 1000,
      timeframe: '1 month',
      feasibility: 85
    });
    
    return upgradePaths;
  }

  private static calculateTechCostAnalysis(config: UnitConfiguration, equipment: any[], recommendations: TechOptimizationRecommendation[]): TechCostAnalysis {
    const baselineCost = 100000; // Simplified baseline cost
    const optimizedCost = baselineCost * 0.85; // 15% savings from optimizations
    
    return {
      baselineCost,
      optimizedCost,
      savings: baselineCost - optimizedCost,
      costBreakdown: {
        components: 60000,
        research: 10000,
        development: 15000,
        production: 10000,
        maintenance: 5000
      },
      returnOnInvestment: 0.15
    };
  }

  private static adjustContextForTechBase(
    context: TechLevelValidationContext, 
    config: UnitConfiguration, 
    allComponents: any[]
  ): TechLevelValidationContext {
    const adjustedContext = { ...context };
    
    // Check if this is a pure tech base unit
    const unitTechBase = config.techBase || 'Inner Sphere';
    const isPureTechBase = allComponents.every(component => 
      component.techBase === unitTechBase || 
      component.techBase === 'Star League' // Star League is compatible with both
    );
    
    // For pure Clan units, adjust target availability to be more lenient
    if (isPureTechBase && unitTechBase === 'Clan') {
      // Clan components are inherently rare (E), so adjust target to E for pure Clan units
      adjustedContext.targetAvailabilityRating = 'E';
    }
    
    return adjustedContext;
  }
}

// Re-export types and modules for convenience
export * from './types/TechLevelTypes';
export { EraManager } from './modules/EraManager';
export { TechBaseManager } from './modules/TechBaseManager';
export { AvailabilityManager } from './modules/AvailabilityManager';
export { MixedTechManager } from './modules/MixedTechManager';
export { ComponentManager } from './utils/ComponentManager';





