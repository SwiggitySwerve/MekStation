/**
 * Weight Balance Validation Service - Physical constraint validation logic
 * 
 * Extracted from UnitValidationService as part of validation service completion.
 * Handles weight limits, heat balance, and critical slot allocation validation.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for validation service patterns
 */

import { EditableUnit, ValidationError } from '../../types/editor'
import { UnitCalculationService } from './UnitCalculationService'

export interface WeightBalanceValidationContext {
  strictMode: boolean
  validateWeightLimits: boolean
  validateHeatBalance: boolean
  validateCriticalSlots: boolean
  performanceThresholds: {
    weightUtilizationHigh: number
    weightUtilizationLow: number
    heatEfficiencyLow: number
    excessiveHeatCapacity: number
    criticalUtilizationHigh: number
    lowCriticalSlots: number
  }
}

export interface WeightBalanceValidationResult {
  errors: ValidationError[]
  warnings: ValidationError[]
  isValid: boolean
  metrics?: {
    weightBreakdown?: any
    heatBalance?: any
    criticalBreakdown?: any
  }
}

export interface PerformanceMetrics {
  weightEfficiency: number
  heatEfficiency: number
  criticalEfficiency: number
  overallScore: number
}

export class WeightBalanceValidationService {
  private static readonly DEFAULT_THRESHOLDS = {
    weightUtilizationHigh: 95,
    weightUtilizationLow: 75,
    heatEfficiencyLow: 120,
    excessiveHeatCapacity: 20,
    criticalUtilizationHigh: 90,
    lowCriticalSlots: 5
  }

  /**
   * Validate weight balance and physical constraints
   */
  static validateWeightBalance(
    unit: EditableUnit,
    context: Partial<WeightBalanceValidationContext> = {}
  ): WeightBalanceValidationResult {
    const ctx: WeightBalanceValidationContext = {
      strictMode: false,
      validateWeightLimits: true,
      validateHeatBalance: true,
      validateCriticalSlots: true,
      performanceThresholds: this.DEFAULT_THRESHOLDS,
      ...context
    }

    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const metrics: any = {}

    // Weight validation
    if (ctx.validateWeightLimits) {
      const weightValidation = this.validateWeightLimits(unit, ctx)
      errors.push(...weightValidation.errors)
      warnings.push(...weightValidation.warnings)
      if (weightValidation.weightBreakdown) {
        metrics.weightBreakdown = weightValidation.weightBreakdown
      }
    }

    // Heat balance validation
    if (ctx.validateHeatBalance) {
      const heatValidation = this.validateHeatBalance(unit, ctx)
      errors.push(...heatValidation.errors)
      warnings.push(...heatValidation.warnings)
      if (heatValidation.heatBalance) {
        metrics.heatBalance = heatValidation.heatBalance
      }
    }

    // Critical slot validation
    if (ctx.validateCriticalSlots) {
      const criticalValidation = this.validateCriticalSlots(unit, ctx)
      errors.push(...criticalValidation.errors)
      warnings.push(...criticalValidation.warnings)
      if (criticalValidation.criticalBreakdown) {
        metrics.criticalBreakdown = criticalValidation.criticalBreakdown
      }
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0,
      metrics
    }
  }

  /**
   * Validate weight limits and tonnage
   */
  static validateWeightLimits(
    unit: EditableUnit,
    context: WeightBalanceValidationContext
  ): WeightBalanceValidationResult & { weightBreakdown?: any } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let weightBreakdown: any = null

    if (!unit.mass || unit.mass <= 0) {
      errors.push({
        id: 'invalid-unit-mass',
        category: 'error',
        message: 'Unit mass must be specified and greater than 0',
        field: 'mass',
      })
      return { errors, warnings, isValid: false }
    }

    try {
      weightBreakdown = UnitCalculationService.calculateWeightBreakdown(unit)
      
      // Critical: Unit is overweight
      if (weightBreakdown.isOverweight) {
        const overweight = weightBreakdown.total - unit.mass
        errors.push({
          id: 'unit-overweight',
          category: 'error',
          message: `Unit is ${overweight.toFixed(1)} tons overweight (${weightBreakdown.total.toFixed(1)}/${unit.mass} tons)`,
          field: 'weight',
        })
      }

      // Warning: High weight utilization (low upgrade potential)
      if (weightBreakdown.utilizationPercentage > context.performanceThresholds.weightUtilizationHigh && 
          weightBreakdown.utilizationPercentage <= 100) {
        warnings.push({
          id: 'high-weight-utilization',
          category: 'warning',
          message: `Weight utilization is ${weightBreakdown.utilizationPercentage.toFixed(1)}% - limited upgrade potential`,
          field: 'weight',
        })
      }

      // Warning: Very low weight utilization (inefficient design)
      if (weightBreakdown.utilizationPercentage < context.performanceThresholds.weightUtilizationLow) {
        warnings.push({
          id: 'low-weight-utilization',
          category: 'warning',
          message: `Weight utilization is only ${weightBreakdown.utilizationPercentage.toFixed(1)}% - consider adding more equipment`,
          field: 'weight',
        })
      }

      // Additional weight efficiency analysis
      const weightEfficiency = this.analyzeWeightEfficiency(weightBreakdown, unit)
      if (weightEfficiency.suggestions.length > 0) {
        weightEfficiency.suggestions.forEach(suggestion => {
          warnings.push({
            id: suggestion.id,
            category: 'warning',
            message: suggestion.message,
            field: 'weight',
          })
        })
      }

    } catch (error) {
      errors.push({
        id: 'weight-calculation-error',
        category: 'error',
        message: 'Error calculating unit weight - check system component configuration',
        field: 'weight',
      })
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0,
      weightBreakdown
    }
  }

  /**
   * Validate heat balance
   */
  static validateHeatBalance(
    unit: EditableUnit,
    context: WeightBalanceValidationContext
  ): WeightBalanceValidationResult & { heatBalance?: any } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let heatBalance: any = null

    try {
      heatBalance = UnitCalculationService.calculateHeatBalance(unit)
      
      // Critical: Unit overheating
      if (heatBalance.isOverheating) {
        const heatDeficit = Math.abs(heatBalance.balance)
        errors.push({
          id: 'unit-overheating',
          category: 'error',
          message: `Unit generates ${heatDeficit.toFixed(1)} more heat than it can dissipate (${heatBalance.generation.toFixed(1)} gen / ${heatBalance.dissipation.toFixed(1)} dis)`,
          field: 'heat',
        })
      }

      // Warning: Low heat efficiency (approaching overheating)
      if (heatBalance.heatEfficiency < context.performanceThresholds.heatEfficiencyLow && 
          heatBalance.generation > 0 && !heatBalance.isOverheating) {
        warnings.push({
          id: 'low-heat-efficiency',
          category: 'warning',
          message: `Heat efficiency is ${heatBalance.heatEfficiency.toFixed(1)}% - consider adding more heat sinks`,
          field: 'heat',
        })
      }

      // Warning: Excessive heat capacity (wasted tonnage)
      if (heatBalance.balance > context.performanceThresholds.excessiveHeatCapacity && 
          heatBalance.generation > 0) {
        warnings.push({
          id: 'excessive-heat-capacity',
          category: 'warning',
          message: `Excessive heat dissipation capacity (+${heatBalance.balance.toFixed(1)}) - consider reducing heat sinks for weight savings`,
          field: 'heat',
        })
      }

      // No weapons equipped
      if (heatBalance.generation === 0) {
        warnings.push({
          id: 'no-heat-generation',
          category: 'warning',
          message: 'No heat-generating weapons detected - unit may be unarmed',
          field: 'heat',
        })
      }

      // Heat sink analysis
      const heatAnalysis = this.analyzeHeatEfficiency(heatBalance, unit)
      if (heatAnalysis.suggestions.length > 0) {
        heatAnalysis.suggestions.forEach(suggestion => {
          warnings.push({
            id: suggestion.id,
            category: 'warning',
            message: suggestion.message,
            field: 'heat',
          })
        })
      }

    } catch (error) {
      errors.push({
        id: 'heat-calculation-error',
        category: 'error',
        message: 'Error calculating heat balance - check weapon and heat sink configuration',
        field: 'heat',
      })
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0,
      heatBalance
    }
  }

  /**
   * Validate critical slot allocation
   */
  static validateCriticalSlots(
    unit: EditableUnit,
    context: WeightBalanceValidationContext
  ): WeightBalanceValidationResult & { criticalBreakdown?: any } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let criticalBreakdown: any = null

    try {
      criticalBreakdown = UnitCalculationService.calculateCriticalSlotBreakdown(unit)
      
      // Critical: Critical slot overflow
      if (criticalBreakdown.used > criticalBreakdown.total) {
        const overflow = criticalBreakdown.used - criticalBreakdown.total
        errors.push({
          id: 'critical-slot-overflow',
          category: 'error',
          message: `Critical slots exceed available space by ${overflow} slots (${criticalBreakdown.used}/${criticalBreakdown.total})`,
          field: 'criticals',
        })
      }

      // Warning: Low critical slot availability
      if (criticalBreakdown.free < context.performanceThresholds.lowCriticalSlots && 
          criticalBreakdown.free >= 0) {
        warnings.push({
          id: 'low-critical-slots',
          category: 'warning',
          message: `Only ${criticalBreakdown.free} critical slots remaining - limited expansion potential`,
          field: 'criticals',
        })
      }

      // Warning: High critical slot utilization
      if (criticalBreakdown.utilizationPercentage > context.performanceThresholds.criticalUtilizationHigh) {
        warnings.push({
          id: 'high-critical-utilization',
          category: 'warning',
          message: `Critical slot utilization is ${criticalBreakdown.utilizationPercentage.toFixed(1)}% - consider more compact equipment`,
          field: 'criticals',
        })
      }

      // Location-specific analysis
      const locationAnalysis = this.analyzeCriticalSlotDistribution(criticalBreakdown, context)
      if (locationAnalysis.warnings.length > 0) {
        warnings.push(...locationAnalysis.warnings)
      }

      // Equipment efficiency analysis
      const efficiencyAnalysis = this.analyzeCriticalSlotEfficiency(criticalBreakdown, unit)
      if (efficiencyAnalysis.suggestions.length > 0) {
        efficiencyAnalysis.suggestions.forEach(suggestion => {
          warnings.push({
            id: suggestion.id,
            category: 'warning',
            message: suggestion.message,
            field: 'criticals',
          })
        })
      }

    } catch (error) {
      errors.push({
        id: 'critical-calculation-error',
        category: 'error',
        message: 'Error calculating critical slot usage - check equipment configuration',
        field: 'criticals',
      })
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0,
      criticalBreakdown
    }
  }

  /**
   * Analyze weight efficiency and provide suggestions
   */
  static analyzeWeightEfficiency(
    weightBreakdown: any,
    unit: EditableUnit
  ): { score: number, suggestions: Array<{ id: string, message: string }> } {
    const suggestions: Array<{ id: string, message: string }> = []
    let score = 100

    // Analyze component weight distribution
    if (weightBreakdown.components) {
      const totalWeight = weightBreakdown.total
      
      // Check if armor is underutilized
      const armorWeight = weightBreakdown.components.armor || 0
      const armorPercentage = (armorWeight / totalWeight) * 100
      if (armorPercentage < 20 && unit.mass && unit.mass >= 50) {
        suggestions.push({
          id: 'low-armor-weight',
          message: `Armor accounts for only ${armorPercentage.toFixed(1)}% of weight - consider increasing protection`
        })
        score -= 10
      }

      // Check if weapons are overweight
      const weaponWeight = weightBreakdown.components.weapons || 0
      const weaponPercentage = (weaponWeight / totalWeight) * 100
      if (weaponPercentage > 40) {
        suggestions.push({
          id: 'heavy-weapon-load',
          message: `Weapons account for ${weaponPercentage.toFixed(1)}% of weight - may impact mobility`
        })
        score -= 5
      }

      // Check for inefficient engine weight
      const engineWeight = weightBreakdown.components.engine || 0
      const enginePercentage = (engineWeight / totalWeight) * 100
      if (enginePercentage > 25 && unit.mass && unit.mass <= 50) {
        suggestions.push({
          id: 'heavy-engine-load',
          message: `Engine accounts for ${enginePercentage.toFixed(1)}% of weight - consider lighter engine type`
        })
        score -= 5
      }
    }

    return { score, suggestions }
  }

  /**
   * Analyze heat efficiency and provide suggestions
   */
  static analyzeHeatEfficiency(
    heatBalance: any,
    unit: EditableUnit
  ): { score: number, suggestions: Array<{ id: string, message: string }> } {
    const suggestions: Array<{ id: string, message: string }> = []
    let score = 100

    if (heatBalance.generation > 0) {
      // Analyze heat sink efficiency
      const heatSinkWeight = heatBalance.heatSinkWeight || 0
      const dissipation = heatBalance.dissipation
      const efficiency = dissipation / heatSinkWeight

      if (efficiency < 2 && heatSinkWeight > 0) {
        suggestions.push({
          id: 'inefficient-heat-sinks',
          message: 'Consider upgrading to double heat sinks for better efficiency'
        })
        score -= 15
      }

      // Analyze weapon heat efficiency
      const generation = heatBalance.generation
      const weaponCount = heatBalance.weaponCount || 1
      const avgHeatPerWeapon = generation / weaponCount

      if (avgHeatPerWeapon > 8) {
        suggestions.push({
          id: 'high-heat-weapons',
          message: 'High-heat weapon loadout may limit sustained combat effectiveness'
        })
        score -= 10
      }

      // Check alpha strike capability
      if (heatBalance.balance < 0 && Math.abs(heatBalance.balance) < 10) {
        suggestions.push({
          id: 'limited-alpha-strike',
          message: 'Limited alpha strike capability - consider heat management'
        })
        score -= 5
      }
    }

    return { score, suggestions }
  }

  /**
   * Analyze critical slot distribution across locations
   */
  static analyzeCriticalSlotDistribution(
    criticalBreakdown: any,
    context: WeightBalanceValidationContext
  ): { warnings: ValidationError[] } {
    const warnings: ValidationError[] = []

    if (criticalBreakdown.byLocation) {
      Object.entries(criticalBreakdown.byLocation).forEach(([location, data]: [string, any]) => {
        const utilization = (data.used / data.total) * 100

        // Check for critically full locations
        if (utilization >= 100) {
          warnings.push({
            id: `${location}-critical-full`,
            category: 'warning',
            message: `${location} critical slots are completely full - no expansion possible`,
            field: 'criticals',
          })
        } else if (utilization > 90) {
          warnings.push({
            id: `${location}-critical-high`,
            category: 'warning',
            message: `${location} critical slots are ${utilization.toFixed(1)}% full - limited space remaining`,
            field: 'criticals',
          })
        }

        // Check for empty critical locations (may indicate poor distribution)
        if (utilization === 0 && location !== 'head') {
          warnings.push({
            id: `${location}-critical-empty`,
            category: 'warning',
            message: `${location} has no equipment installed - consider redistributing components`,
            field: 'criticals',
          })
        }
      })
    }

    return { warnings }
  }

  /**
   * Analyze critical slot efficiency
   */
  static analyzeCriticalSlotEfficiency(
    criticalBreakdown: any,
    unit: EditableUnit
  ): { score: number, suggestions: Array<{ id: string, message: string }> } {
    const suggestions: Array<{ id: string, message: string }> = []
    let score = 100

    if (criticalBreakdown.byType) {
      const total = criticalBreakdown.used
      
      // Analyze weapon slot efficiency
      const weaponSlots = criticalBreakdown.byType.weapons || 0
      const weaponPercentage = (weaponSlots / total) * 100
      
      if (weaponPercentage > 60) {
        suggestions.push({
          id: 'weapon-slot-heavy',
          message: `Weapons use ${weaponPercentage.toFixed(1)}% of critical slots - consider more compact weapons`
        })
        score -= 10
      }

      // Analyze equipment density
      const equipmentDensity = total / (unit.mass || 50)
      if (equipmentDensity > 1.5) {
        suggestions.push({
          id: 'high-equipment-density',
          message: 'High equipment density - unit may be vulnerable to critical hits'
        })
        score -= 5
      } else if (equipmentDensity < 0.8) {
        suggestions.push({
          id: 'low-equipment-density',
          message: 'Low equipment density - consider adding more systems'
        })
        score -= 5
      }
    }

    return { score, suggestions }
  }

  /**
   * Calculate overall performance metrics
   */
  static calculatePerformanceMetrics(
    unit: EditableUnit,
    context: Partial<WeightBalanceValidationContext> = {}
  ): PerformanceMetrics {
    try {
      const weightBreakdown = UnitCalculationService.calculateWeightBreakdown(unit)
      const heatBalance = UnitCalculationService.calculateHeatBalance(unit)
      const criticalBreakdown = UnitCalculationService.calculateCriticalSlotBreakdown(unit)

      const weightEfficiency = this.analyzeWeightEfficiency(weightBreakdown, unit).score
      const heatEfficiency = this.analyzeHeatEfficiency(heatBalance, unit).score
      const criticalEfficiency = this.analyzeCriticalSlotEfficiency(criticalBreakdown, unit).score

      const overallScore = (weightEfficiency + heatEfficiency + criticalEfficiency) / 3

      return {
        weightEfficiency,
        heatEfficiency,
        criticalEfficiency,
        overallScore
      }
    } catch (error) {
      return {
        weightEfficiency: 0,
        heatEfficiency: 0,
        criticalEfficiency: 0,
        overallScore: 0
      }
    }
  }

  /**
   * Get optimization suggestions for weight/balance
   */
  static getOptimizationSuggestions(
    unit: EditableUnit,
    context: Partial<WeightBalanceValidationContext> = {}
  ): Array<{ category: string, priority: string, message: string, action: string }> {
    const suggestions: Array<{ category: string, priority: string, message: string, action: string }> = []
    const validation = this.validateWeightBalance(unit, context)

    // High priority suggestions from errors
    validation.errors.forEach(error => {
      suggestions.push({
        category: 'Critical',
        priority: 'High',
        message: error.message,
        action: this.getActionForError(error.id)
      })
    })

    // Medium priority suggestions from warnings
    validation.warnings.forEach(warning => {
      if (warning.id.includes('overweight') || warning.id.includes('overheating')) {
        suggestions.push({
          category: 'Balance',
          priority: 'High',
          message: warning.message,
          action: this.getActionForWarning(warning.id)
        })
      } else {
        suggestions.push({
          category: 'Optimization',
          priority: 'Medium',
          message: warning.message,
          action: this.getActionForWarning(warning.id)
        })
      }
    })

    return suggestions.slice(0, 10) // Limit to top 10 suggestions
  }

  /**
   * Get action recommendations for errors
   */
  private static getActionForError(errorId: string): string {
    const actions: { [key: string]: string } = {
      'unit-overweight': 'Remove equipment or upgrade to lighter variants',
      'unit-overheating': 'Add heat sinks or reduce heat-generating weapons',
      'critical-slot-overflow': 'Remove equipment or use more compact variants',
      'weight-calculation-error': 'Check system component configuration',
      'heat-calculation-error': 'Verify weapon and heat sink setup',
      'critical-calculation-error': 'Review equipment placement'
    }
    return actions[errorId] || 'Review configuration'
  }

  /**
   * Get action recommendations for warnings
   */
  private static getActionForWarning(warningId: string): string {
    const actions: { [key: string]: string } = {
      'high-weight-utilization': 'Consider lighter components for upgrade flexibility',
      'low-weight-utilization': 'Add more armor, weapons, or equipment',
      'low-heat-efficiency': 'Add heat sinks or consider heat-neutral weapons',
      'excessive-heat-capacity': 'Reduce heat sinks and reallocate weight',
      'high-critical-utilization': 'Use more compact equipment variants',
      'low-critical-slots': 'Plan equipment upgrades carefully'
    }
    return actions[warningId] || 'Consider optimization'
  }

  /**
   * Get validation rules for UI display
   */
  static getValidationRules(): Array<{
    category: string
    rules: Array<{ name: string, description: string, severity: string }>
  }> {
    return [
      {
        category: 'Weight Constraints',
        rules: [
          { name: 'Weight Limit', description: 'Total weight cannot exceed unit tonnage', severity: 'error' },
          { name: 'Weight Efficiency', description: 'Weight should be efficiently utilized', severity: 'warning' },
          { name: 'Component Balance', description: 'Weight should be balanced across systems', severity: 'info' },
        ]
      },
      {
        category: 'Heat Management',
        rules: [
          { name: 'Heat Balance', description: 'Heat generation should not exceed dissipation', severity: 'error' },
          { name: 'Heat Efficiency', description: 'Heat sinks should be efficiently utilized', severity: 'warning' },
          { name: 'Alpha Strike', description: 'Unit should have sustainable alpha strike capability', severity: 'info' },
        ]
      },
      {
        category: 'Critical Slots',
        rules: [
          { name: 'Slot Capacity', description: 'Equipment must fit in available critical slots', severity: 'error' },
          { name: 'Slot Distribution', description: 'Equipment should be distributed across locations', severity: 'warning' },
          { name: 'Slot Efficiency', description: 'Critical slots should be used efficiently', severity: 'info' },
        ]
      }
    ]
  }
}
