/**
 * HeatRulesValidator - Heat management and thermal validation for BattleTech construction rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles heat balance, heat sink validation, and thermal management rules.
 * 
 * @see TECHNICAL_ARCHITECTURE.md for service architecture patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { calculateInternalHeatSinks, calculateInternalHeatSinksForEngine } from '../../utils/heatSinkCalculations';

export interface HeatValidation {
  isValid: boolean;
  heatGeneration: number;
  heatDissipation: number;
  heatDeficit: number;
  minimumHeatSinks: number;
  actualHeatSinks: number;
  engineHeatSinks: number;
  externalHeatSinks: number;
  heatEfficiency: number;
  thermalProfile: ThermalProfile;
  violations: HeatViolation[];
  recommendations: string[];
}

export interface HeatViolation {
  type: 'insufficient_heat_sinks' | 'invalid_heat_sink_type' | 'heat_overflow' | 'engine_heat_sink_violation' | 'heat_sink_compatibility';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
  component?: string;
}

export interface ThermalProfile {
  walkingHeat: number;
  runningHeat: number;
  jumpingHeat: number;
  weaponHeat: number;
  environmentalHeat: number;
  totalOperationalHeat: number;
  sustainableFirepower: number;
}

export interface HeatValidationContext {
  strictMode: boolean;
  enforceMinimumHeatSinks: boolean;
  validateHeatSinkTypes: boolean;
  checkThermalEfficiency: boolean;
  environmentalHeat: number;
}

export interface HeatSinkBreakdown {
  engineInternal: number;
  externalSingle: number;
  externalDouble: number;
  externalCompact: number;
  externalLaser: number;
  totalCount: number;
  totalDissipation: number;
  avgDissipationRate: number;
}

export interface HeatOptimization {
  recommendations: HeatOptimizationRecommendation[];
  potentialImprovements: HeatImprovement[];
  alternativeConfigurations: AlternativeHeatConfig[];
}

export interface HeatOptimizationRecommendation {
  type: 'add_heat_sinks' | 'upgrade_heat_sinks' | 'reduce_heat_generation' | 'relocate_heat_sinks';
  description: string;
  benefit: string;
  cost: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  priority: 'high' | 'medium' | 'low';
}

export interface HeatImprovement {
  category: 'heat_sinks' | 'weapons' | 'movement' | 'engine';
  currentValue: number;
  improvedValue: number;
  improvement: number;
  requirements: string[];
}

export interface AlternativeHeatConfig {
  name: string;
  description: string;
  heatSinkChanges: string[];
  weaponChanges: string[];
  expectedImprovement: number;
  tradeoffs: string[];
}

export class HeatRulesValidator {
  private static readonly DEFAULT_CONTEXT: HeatValidationContext = {
    strictMode: false,
    enforceMinimumHeatSinks: true,
    validateHeatSinkTypes: true,
    checkThermalEfficiency: true,
    environmentalHeat: 0
  };

  private static readonly MINIMUM_TOTAL_HEAT_SINKS = 10; // This is minimum TOTAL heat sinks for the mech, not engine heat sinks
  private static readonly HEAT_SINK_DISSIPATION_RATES = {
    'Single': 1,
    'Double': 2,
    'Double (Clan)': 2,
    'Compact': 1,
    'Laser': 2
  };

  /**
   * Validate heat management and thermal balance
   */
  static validateHeatManagement(
    config: UnitConfiguration, 
    equipment: any[], 
    context: Partial<HeatValidationContext> = {}
  ): HeatValidation {
    const ctx = { ...this.DEFAULT_CONTEXT, ...context };
    const violations: HeatViolation[] = [];
    const recommendations: string[] = [];
    
    // Calculate heat generation and dissipation
    const heatGeneration = this.calculateHeatGeneration(equipment);
    const engineHeatSinks = this.getEngineHeatSinks(config);
    const externalHeatSinks = this.getExternalHeatSinks(equipment);
    const actualHeatSinks = engineHeatSinks + externalHeatSinks;
    
    // Calculate heat dissipation based on heat sink types
    const heatSinkBreakdown = this.calculateHeatSinkBreakdown(config, equipment);
    const heatDissipation = heatSinkBreakdown.totalDissipation;
    
    const heatDeficit = Math.max(0, heatGeneration - heatDissipation);
    const heatEfficiency = heatDissipation > 0 ? (heatDissipation / Math.max(heatGeneration, 1)) * 100 : 100;
    
    // Validate minimum heat sinks rule
    if (ctx.enforceMinimumHeatSinks && actualHeatSinks < this.MINIMUM_TOTAL_HEAT_SINKS) {
      violations.push({
        type: 'insufficient_heat_sinks',
        message: `Unit has ${actualHeatSinks} heat sinks but requires minimum ${this.MINIMUM_TOTAL_HEAT_SINKS}`,
        severity: 'critical',
        suggestedFix: `Add ${this.MINIMUM_TOTAL_HEAT_SINKS - actualHeatSinks} more heat sinks`
      });
    }
    
    // Validate heat balance
    if (heatDeficit > 0) {
      const severity = heatDeficit > 10 ? 'critical' : heatDeficit > 5 ? 'major' : 'minor';
      violations.push({
        type: 'heat_overflow',
        message: `Heat generation exceeds dissipation by ${heatDeficit} points`,
        severity,
        suggestedFix: `Add ${Math.ceil(heatDeficit / 2)} double heat sinks or reduce heat-generating equipment`
      });
      recommendations.push(`Heat generation exceeds dissipation by ${heatDeficit} points`);
      recommendations.push('Consider adding more heat sinks or reducing heat-generating equipment');
    }
    
    // Validate heat sink types and compatibility
    if (ctx.validateHeatSinkTypes) {
      this.validateHeatSinkTypes(config, equipment, violations);
    }
    
    // Check thermal efficiency
    if (ctx.checkThermalEfficiency) {
      this.validateThermalEfficiency(heatEfficiency, heatGeneration, violations, recommendations);
    }
    
    // Generate thermal profile
    const thermalProfile = this.calculateThermalProfile(config, equipment, ctx.environmentalHeat);
    
    return {
      isValid: violations.filter(v => v.severity === 'critical').length === 0,
      heatGeneration,
      heatDissipation,
      heatDeficit,
      minimumHeatSinks: this.MINIMUM_TOTAL_HEAT_SINKS,
      actualHeatSinks,
      engineHeatSinks,
      externalHeatSinks,
      heatEfficiency,
      thermalProfile,
      violations,
      recommendations
    };
  }

  /**
   * Calculate total heat generation from all equipment
   */
  static calculateHeatGeneration(equipment: any[]): number {
    return equipment.reduce((total, item) => {
      const heat = item.equipmentData?.heat || 0;
      // Consider weapon firing rates and ammunition types
      const firingRate = item.equipmentData?.firingRate || 1;
      return total + (heat * firingRate);
    }, 0);
  }

  /**
   * Get engine-integrated heat sinks
   */
  static getEngineHeatSinks(config: UnitConfiguration): number {
    const engineRating = config.engineRating || 0;
    const engineType = config.engineType || 'Standard';
    
    return calculateInternalHeatSinksForEngine(engineRating, engineType);
  }

  /**
   * Get external heat sinks from equipment
   */
  static getExternalHeatSinks(equipment: any[]): number {
    return equipment.filter(item => 
      item.equipmentData?.type === 'heat_sink' || 
      item.equipmentData?.name?.toLowerCase().includes('heat sink')
    ).length;
  }

  /**
   * Calculate detailed heat sink breakdown
   */
  static calculateHeatSinkBreakdown(config: UnitConfiguration, equipment: any[]): HeatSinkBreakdown {
    const engineInternal = this.getEngineHeatSinks(config);
    
    // Categorize external heat sinks by type
    const externalHeatSinks = equipment.filter(item => 
      item.equipmentData?.type === 'heat_sink' || 
      item.equipmentData?.name?.toLowerCase().includes('heat sink')
    );
    
    let externalSingle = 0;
    let externalDouble = 0;
    let externalCompact = 0;
    let externalLaser = 0;
    
    externalHeatSinks.forEach(item => {
      const name = item.equipmentData?.name?.toLowerCase() || '';
      if (name.includes('double')) {
        externalDouble++;
      } else if (name.includes('compact')) {
        externalCompact++;
      } else if (name.includes('laser')) {
        externalLaser++;
      } else {
        externalSingle++;
      }
    });
    
    const totalCount = engineInternal + externalSingle + externalDouble + externalCompact + externalLaser;
    
    // Calculate total dissipation
    const heatSinkType = this.extractComponentType(config.heatSinkType);
    const engineDissipationRate = this.HEAT_SINK_DISSIPATION_RATES[heatSinkType as keyof typeof this.HEAT_SINK_DISSIPATION_RATES] || 1;
    
    const totalDissipation = 
      (engineInternal * engineDissipationRate) +
      (externalSingle * 1) +
      (externalDouble * 2) +
      (externalCompact * 1) +
      (externalLaser * 2);
    
    const avgDissipationRate = totalCount > 0 ? totalDissipation / totalCount : 0;
    
    return {
      engineInternal,
      externalSingle,
      externalDouble,
      externalCompact,
      externalLaser,
      totalCount,
      totalDissipation,
      avgDissipationRate
    };
  }

  /**
   * Calculate comprehensive thermal profile
   */
  static calculateThermalProfile(config: UnitConfiguration, equipment: any[], environmentalHeat: number = 0): ThermalProfile {
    const weaponHeat = this.calculateHeatGeneration(equipment);
    const tonnage = config.tonnage || 100;
    const engineRating = config.engineRating || 0;
    
    // Movement heat calculations
    const walkingHeat = 1; // Base walking heat
    const runningHeat = 2; // Base running heat
    
    // Jump jet heat calculation
    const jumpJets = equipment.filter(item => item.equipmentData?.type === 'jump_jet');
    const jumpingHeat = jumpJets.length; // 1 heat per jump jet used
    
    const totalOperationalHeat = walkingHeat + weaponHeat + environmentalHeat;
    
    // Calculate sustainable firepower (heat that can be generated continuously)
    const heatSinkBreakdown = this.calculateHeatSinkBreakdown(config, equipment);
    const sustainableFirepower = Math.max(0, heatSinkBreakdown.totalDissipation - walkingHeat - environmentalHeat);
    
    return {
      walkingHeat,
      runningHeat,
      jumpingHeat,
      weaponHeat,
      environmentalHeat,
      totalOperationalHeat,
      sustainableFirepower
    };
  }

  /**
   * Validate heat sink types and compatibility
   */
  private static validateHeatSinkTypes(config: UnitConfiguration, equipment: any[], violations: HeatViolation[]): void {
    const unitTechBase = config.techBase || 'Inner Sphere';
    const heatSinkType = this.extractComponentType(config.heatSinkType);
    
    // Check for tech base compatibility
    if (unitTechBase === 'Inner Sphere' && heatSinkType.includes('Clan')) {
      violations.push({
        type: 'heat_sink_compatibility',
        message: `Clan heat sinks incompatible with Inner Sphere tech base`,
        severity: 'major',
        suggestedFix: 'Use Inner Sphere heat sinks or change unit tech base to Mixed',
        component: 'heat_sinks'
      });
    }
    
    // Validate external heat sink consistency
    const externalHeatSinks = equipment.filter(item => 
      item.equipmentData?.type === 'heat_sink' || 
      item.equipmentData?.name?.toLowerCase().includes('heat sink')
    );
    
    const mixedHeatSinks = new Set(externalHeatSinks.map(item => item.equipmentData?.name)).size > 1;
    if (mixedHeatSinks) {
      violations.push({
        type: 'invalid_heat_sink_type',
        message: 'Mixed heat sink types detected - all heat sinks should be the same type',
        severity: 'minor',
        suggestedFix: 'Standardize on single heat sink type for consistency'
      });
    }
  }

  /**
   * Validate thermal efficiency and provide recommendations
   */
  private static validateThermalEfficiency(
    heatEfficiency: number, 
    heatGeneration: number, 
    violations: HeatViolation[], 
    recommendations: string[]
  ): void {
    if (heatEfficiency < 110 && heatGeneration > 0) {
      recommendations.push(`Heat efficiency is ${heatEfficiency.toFixed(1)}% - consider adding more heat sinks`);
      
      if (heatEfficiency < 90) {
        violations.push({
          type: 'heat_overflow',
          message: `Poor heat efficiency (${heatEfficiency.toFixed(1)}%) may cause overheating`,
          severity: 'major',
          suggestedFix: 'Add more heat sinks or reduce heat-generating equipment'
        });
      }
    }
    
    // Warning for excessive heat capacity
    if (heatEfficiency > 200 && heatGeneration > 0) {
      recommendations.push('Excessive heat dissipation capacity - consider reducing heat sinks for weight savings');
    }
  }

  /**
   * Generate heat optimization recommendations
   */
  static generateHeatOptimizations(config: UnitConfiguration, equipment: any[]): HeatOptimization {
    const heatValidation = this.validateHeatManagement(config, equipment);
    const recommendations: HeatOptimizationRecommendation[] = [];
    const potentialImprovements: HeatImprovement[] = [];
    const alternativeConfigurations: AlternativeHeatConfig[] = [];
    
    // Generate recommendations based on current thermal state
    if (heatValidation.heatDeficit > 0) {
      const heatSinksNeeded = Math.ceil(heatValidation.heatDeficit / 2);
      recommendations.push({
        type: 'add_heat_sinks',
        description: `Add ${heatSinksNeeded} double heat sinks to achieve heat balance`,
        benefit: `Eliminates ${heatValidation.heatDeficit} point heat deficit`,
        cost: heatSinksNeeded,
        difficulty: 'easy',
        priority: 'high'
      });
    }
    
    // Suggest heat sink upgrades
    const heatSinkType = this.extractComponentType(config.heatSinkType);
    if (heatSinkType === 'Single' || heatSinkType === 'Standard') {
      const currentDissipation = heatValidation.heatDissipation;
      const improvedDissipation = heatValidation.actualHeatSinks * 2; // Double heat sinks
      const improvement = improvedDissipation - currentDissipation;
      
      recommendations.push({
        type: 'upgrade_heat_sinks',
        description: 'Upgrade to double heat sinks',
        benefit: `Increases heat dissipation by ${improvement} points`,
        cost: 0, // Weight trade usually neutral
        difficulty: 'moderate',
        priority: 'medium'
      });
      
      potentialImprovements.push({
        category: 'heat_sinks',
        currentValue: currentDissipation,
        improvedValue: improvedDissipation,
        improvement,
        requirements: ['Tech upgrade to double heat sinks']
      });
    }
    
    // Suggest weapon heat reduction if applicable
    if (heatValidation.heatGeneration > heatValidation.heatDissipation) {
      const weaponHeat = this.calculateHeatGeneration(equipment);
      if (weaponHeat > 20) {
        recommendations.push({
          type: 'reduce_heat_generation',
          description: 'Consider replacing high-heat weapons with cooler alternatives',
          benefit: 'Reduces thermal stress and improves sustained firepower',
          cost: 0,
          difficulty: 'hard',
          priority: 'medium'
        });
      }
    }
    
    return {
      recommendations,
      potentialImprovements,
      alternativeConfigurations
    };
  }

  /**
   * Calculate heat sink efficiency score (0-100)
   */
  static calculateHeatSinkEfficiency(config: UnitConfiguration, equipment: any[]): number {
    const heatValidation = this.validateHeatManagement(config, equipment);
    const { heatGeneration, heatDissipation, actualHeatSinks } = heatValidation;
    
    // Base efficiency on heat balance
    let efficiency = 100;
    
    // Penalize heat deficits
    if (heatValidation.heatDeficit > 0) {
      const deficitPenalty = Math.min(50, heatValidation.heatDeficit * 5);
      efficiency -= deficitPenalty;
    }
    
    // Penalize insufficient heat sinks
    if (actualHeatSinks < this.MINIMUM_TOTAL_HEAT_SINKS) {
      const shortfallPenalty = (this.MINIMUM_TOTAL_HEAT_SINKS - actualHeatSinks) * 10;
      efficiency -= shortfallPenalty;
    }
    
    // Bonus for good heat efficiency
    if (heatValidation.heatEfficiency >= 120 && heatValidation.heatEfficiency <= 150) {
      efficiency += 10;
    }
    
    // Penalty for excessive heat capacity
    if (heatValidation.heatEfficiency > 200) {
      efficiency -= 5;
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
        name: 'Minimum Heat Sinks',
        description: 'Unit must have at least 10 heat sinks total',
        severity: 'critical',
        category: 'heat'
      },
      {
        name: 'Heat Balance',
        description: 'Heat generation should not exceed dissipation capacity',
        severity: 'major',
        category: 'heat'
      },
      {
        name: 'Heat Sink Compatibility',
        description: 'Heat sink types should match unit tech base',
        severity: 'minor',
        category: 'heat'
      },
      {
        name: 'Thermal Efficiency',
        description: 'Heat dissipation should provide adequate thermal margin',
        severity: 'minor',
        category: 'heat'
      }
    ];
  }

  // ===== PRIVATE HELPER METHODS =====

  private static extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') return component;
    return component?.type || 'Standard';
  }
}





