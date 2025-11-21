/**
 * Unit Validation Service - Centralized validation logic for unit editor
 * Handles unit validation rules, error categorization, and field-specific validation
 * Follows SOLID principles for maintainable and extensible validation logic
 */

import { EditableUnit, ValidationError } from '../../types/editor'
import { UnitCalculationService } from './UnitCalculationService'
import { EngineValidationService } from './EngineValidationService'
import { WeaponValidationService } from './WeaponValidationService'
import { StructureValidationService } from './StructureValidationService'
import { FieldValidationService, FieldValidationResult } from './FieldValidationService'

export interface ValidationContext {
  strictMode: boolean
  validateOptionalFields: boolean
  checkTechCompatibility: boolean
  validateConstructionRules: boolean
}

export interface CategorizedValidationErrors {
  critical: ValidationError[]
  warnings: ValidationError[]
  info: ValidationError[]
  total: number
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  categorized: CategorizedValidationErrors
  summary: string
}


export class UnitValidationService {
  private static defaultContext: ValidationContext = {
    strictMode: false,
    validateOptionalFields: true,
    checkTechCompatibility: true,
    validateConstructionRules: true
  }

  /**
   * Validate entire unit with comprehensive rule checking
   */
  static validateUnit(
    unit: EditableUnit,
    context: Partial<ValidationContext> = {}
  ): ValidationResult {
    const ctx = { ...this.defaultContext, ...context }
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Basic information validation
    const basicResults = this.validateBasicInfo(unit, ctx)
    errors.push(...basicResults.errors)
    warnings.push(...basicResults.warnings)

    // System components validation
    if (ctx.validateConstructionRules && unit.systemComponents) {
      const systemResults = this.validateSystemComponents(unit, ctx)
      errors.push(...systemResults.errors)
      warnings.push(...systemResults.warnings)
    }

    // Weight and tonnage validation
    if (ctx.validateConstructionRules) {
      const weightResults = this.validateWeightLimits(unit, ctx)
      errors.push(...weightResults.errors)
      warnings.push(...weightResults.warnings)
    }

    // Heat balance validation
    const heatResults = this.validateHeatBalance(unit, ctx)
    errors.push(...heatResults.errors)
    warnings.push(...heatResults.warnings)

    // Critical slot validation
    if (ctx.validateConstructionRules) {
      const criticalResults = this.validateCriticalSlots(unit, ctx)
      errors.push(...criticalResults.errors)
      warnings.push(...criticalResults.warnings)
    }

    // Tech compatibility validation
    if (ctx.checkTechCompatibility) {
      const techResults = this.validateTechCompatibility(unit, ctx)
      errors.push(...techResults.errors)
      warnings.push(...techResults.warnings)
    }

    // Armor validation
    if (ctx.validateConstructionRules) {
      const armorResults = this.validateArmorAllocation(unit, ctx)
      errors.push(...armorResults.errors)
      warnings.push(...armorResults.warnings)
    }

    const categorized = this.categorizeValidationErrors([...errors, ...warnings])
    const isValid = errors.length === 0
    const summary = this.generateValidationSummary(categorized, isValid)

    return {
      isValid,
      errors,
      warnings,
      categorized,
      summary
    }
  }

  /**
   * Validate basic unit information
   */
  static validateBasicInfo(
    unit: EditableUnit,
    context: ValidationContext
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Required fields validation
    if (!unit.chassis || unit.chassis.trim() === '') {
      errors.push({
        id: 'missing-chassis',
        category: 'error',
        message: 'Chassis name is required',
        field: 'chassis',
      })
    }

    if (!unit.model || unit.model.trim() === '') {
      errors.push({
        id: 'missing-model',
        category: 'error',
        message: 'Model designation is required',
        field: 'model',
      })
    }

    // Mass validation
    if (!unit.mass || unit.mass <= 0) {
      errors.push({
        id: 'invalid-mass',
        category: 'error',
        message: 'Unit mass must be greater than 0',
        field: 'mass',
      })
    } else {
      // Check if mass follows BattleTech tonnage increments (5-ton steps)
      if (unit.mass % 5 !== 0) {
        if (context.strictMode) {
          errors.push({
            id: 'invalid-tonnage-increment',
            category: 'error',
            message: 'Unit mass must be in 5-ton increments (20, 25, 30, etc.)',
            field: 'mass',
          })
        } else {
          warnings.push({
            id: 'non-standard-tonnage',
            category: 'warning',
            message: 'Unit mass should typically be in 5-ton increments',
            field: 'mass',
          })
        }
      }

      // Check tonnage ranges
      if (unit.mass < 20) {
        warnings.push({
          id: 'light-tonnage',
          category: 'warning',
          message: 'Unit mass below 20 tons is very light for a BattleMech',
          field: 'mass',
        })
      } else if (unit.mass > 100) {
        if (context.strictMode) {
          errors.push({
            id: 'excessive-tonnage',
            category: 'error',
            message: 'Unit mass exceeds standard BattleMech limit of 100 tons',
            field: 'mass',
          })
        } else {
          warnings.push({
            id: 'heavy-tonnage',
            category: 'warning',
            message: 'Unit mass above 100 tons is unusual for standard BattleMechs',
            field: 'mass',
          })
        }
      }
    }

    // Tech base validation
    if (!unit.tech_base) {
      errors.push({
        id: 'missing-tech-base',
        category: 'error',
        message: 'Tech base must be specified',
        field: 'tech_base',
      })
    }

    // Era validation
    if (context.validateOptionalFields) {
      if (!unit.era) {
        warnings.push({
          id: 'missing-era',
          category: 'warning',
          message: 'Era should be specified for historical accuracy',
          field: 'era',
        })
      }
    }

    return { errors, warnings }
  }

  /**
   * Validate system components configuration
   */
  static validateSystemComponents(
    unit: EditableUnit,
    context: ValidationContext
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!unit.systemComponents) {
      if (context.strictMode) {
        errors.push({
          id: 'missing-system-components',
          category: 'error',
          message: 'System components configuration is required',
          field: 'systemComponents',
        })
      } else {
        warnings.push({
          id: 'missing-system-components',
          category: 'warning',
          message: 'System components should be configured for accurate calculations',
          field: 'systemComponents',
        })
      }
      return { errors, warnings }
    }

    const components = unit.systemComponents

    // Engine validation - delegated to EngineValidationService
    const engineValidation = EngineValidationService.validateEngineIntegration(unit, context)
    errors.push(...engineValidation.errors)
    warnings.push(...engineValidation.warnings)

    // Heat sink validation
    if (!components.heatSinks) {
      errors.push({
        id: 'missing-heat-sinks',
        category: 'error',
        message: 'Heat sink configuration is required',
        field: 'systemComponents.heatSinks',
      })
    } else {
      if (components.heatSinks.total < 10) {
        errors.push({
          id: 'insufficient-heat-sinks',
          category: 'error',
          message: 'Unit must have at least 10 heat sinks',
          field: 'systemComponents.heatSinks.total',
        })
      }

      if (components.heatSinks.externalRequired < 0) {
        errors.push({
          id: 'negative-external-heat-sinks',
          category: 'error',
          message: 'External heat sink count cannot be negative',
          field: 'systemComponents.heatSinks.externalRequired',
        })
      }
    }

    return { errors, warnings }
  }

  /**
   * Validate weight limits and tonnage
   */
  static validateWeightLimits(
    unit: EditableUnit,
    context: ValidationContext
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    try {
      const weightBreakdown = UnitCalculationService.calculateWeightBreakdown(unit)
      
      if (weightBreakdown.isOverweight) {
        const overweight = weightBreakdown.total - (unit.mass || 0)
        errors.push({
          id: 'unit-overweight',
          category: 'error',
          message: `Unit is ${overweight.toFixed(1)} tons overweight`,
          field: 'weight',
        })
      }

      // Warning for high weight utilization
      if (weightBreakdown.utilizationPercentage > 95 && weightBreakdown.utilizationPercentage <= 100) {
        warnings.push({
          id: 'high-weight-utilization',
          category: 'warning',
          message: `Weight utilization is ${weightBreakdown.utilizationPercentage}% - limited upgrade potential`,
          field: 'weight',
        })
      }

      // Warning for very low weight utilization
      if (weightBreakdown.utilizationPercentage < 75) {
        warnings.push({
          id: 'low-weight-utilization',
          category: 'warning',
          message: `Weight utilization is only ${weightBreakdown.utilizationPercentage}% - consider adding more equipment`,
          field: 'weight',
        })
      }

    } catch (error) {
      errors.push({
        id: 'weight-calculation-error',
        category: 'error',
        message: 'Error calculating unit weight - check configuration',
        field: 'weight',
      })
    }

    return { errors, warnings }
  }

  /**
   * Validate heat balance
   */
  static validateHeatBalance(
    unit: EditableUnit,
    context: ValidationContext
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    try {
      const heatBalance = UnitCalculationService.calculateHeatBalance(unit)
      
      if (heatBalance.isOverheating) {
        const heatDeficit = Math.abs(heatBalance.balance)
        errors.push({
          id: 'unit-overheating',
          category: 'error',
          message: `Unit generates ${heatDeficit} more heat than it can dissipate`,
          field: 'heat',
        })
      }

      // Warning for low heat efficiency
      if (heatBalance.heatEfficiency < 120 && heatBalance.generation > 0) {
        warnings.push({
          id: 'low-heat-efficiency',
          category: 'warning',
          message: `Heat efficiency is ${heatBalance.heatEfficiency}% - consider adding more heat sinks`,
          field: 'heat',
        })
      }

      // Warning for excessive heat capacity
      if (heatBalance.balance > 20 && heatBalance.generation > 0) {
        warnings.push({
          id: 'excessive-heat-capacity',
          category: 'warning',
          message: 'Excessive heat dissipation capacity - consider reducing heat sinks for weight savings',
          field: 'heat',
        })
      }

    } catch (error) {
      errors.push({
        id: 'heat-calculation-error',
        category: 'error',
        message: 'Error calculating heat balance - check configuration',
        field: 'heat',
      })
    }

    return { errors, warnings }
  }

  /**
   * Validate critical slot allocation
   */
  static validateCriticalSlots(
    unit: EditableUnit,
    context: ValidationContext
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    try {
      const criticalBreakdown = UnitCalculationService.calculateCriticalSlotBreakdown(unit)
      
      if (criticalBreakdown.used > criticalBreakdown.total) {
        const overflow = criticalBreakdown.used - criticalBreakdown.total
        errors.push({
          id: 'critical-slot-overflow',
          category: 'error',
          message: `Critical slots exceed available space by ${overflow} slots`,
          field: 'criticals',
        })
      }

      // Warning for low critical slot availability
      if (criticalBreakdown.free < 5 && criticalBreakdown.free >= 0) {
        warnings.push({
          id: 'low-critical-slots',
          category: 'warning',
          message: `Only ${criticalBreakdown.free} critical slots remaining`,
          field: 'criticals',
        })
      }

      // Warning for high critical slot utilization
      if (criticalBreakdown.utilizationPercentage > 90) {
        warnings.push({
          id: 'high-critical-utilization',
          category: 'warning',
          message: `Critical slot utilization is ${criticalBreakdown.utilizationPercentage}% - limited expansion potential`,
          field: 'criticals',
        })
      }

    } catch (error) {
      errors.push({
        id: 'critical-calculation-error',
        category: 'error',
        message: 'Error calculating critical slot usage - check configuration',
        field: 'criticals',
      })
    }

    return { errors, warnings }
  }

  /**
   * Validate tech compatibility
   */
  static validateTechCompatibility(
    unit: EditableUnit,
    context: ValidationContext
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    const unitTechBase = unit.tech_base

    // Check system components tech compatibility
    if (unit.systemComponents) {
      const components = unit.systemComponents

      // Engine tech base validation
      if (components.engine) {
        if (unitTechBase === 'Inner Sphere' && components.engine.type.includes('Clan')) {
          if (context.strictMode) {
            errors.push({
              id: 'engine-tech-mismatch',
              category: 'error',
              message: 'Clan engine incompatible with Inner Sphere tech base',
              field: 'systemComponents.engine.type',
            })
          } else {
            warnings.push({
              id: 'engine-tech-mismatch',
              category: 'warning',
              message: 'Mixed tech: Clan engine on Inner Sphere chassis',
              field: 'systemComponents.engine.type',
            })
          }
        }
      }

      // Heat sink tech base validation
      if (components.heatSinks) {
        if (unitTechBase === 'Inner Sphere' && components.heatSinks.type.includes('Clan')) {
          if (context.strictMode) {
            errors.push({
              id: 'heat-sink-tech-mismatch',
              category: 'error',
              message: 'Clan heat sinks incompatible with Inner Sphere tech base',
              field: 'systemComponents.heatSinks.type',
            })
          } else {
            warnings.push({
              id: 'heat-sink-tech-mismatch',
              category: 'warning',
              message: 'Mixed tech: Clan heat sinks on Inner Sphere chassis',
              field: 'systemComponents.heatSinks.type',
            })
          }
        }
      }
    }

    // Equipment tech compatibility - delegated to WeaponValidationService
    if (context.checkTechCompatibility && unit.data?.weapons_and_equipment) {
      const weaponValidation = WeaponValidationService.validateWeapons(unit, {
        strictMode: context.strictMode,
        checkTechCompatibility: true,
        validateAmmoBalance: false,
        enforceEraRestrictions: false
      })
      errors.push(...weaponValidation.errors)
      warnings.push(...weaponValidation.warnings)
    }

    return { errors, warnings }
  }

  /**
   * Validate armor allocation - delegated to StructureValidationService
   */
  static validateArmorAllocation(
    unit: EditableUnit,
    context: ValidationContext
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const structureValidation = StructureValidationService.validateStructure(unit, {
      strictMode: context.strictMode,
      validateArmorDistribution: true,
      enforceArmorLimits: true,
      checkStructureIntegrity: false // Only armor validation needed here
    })

    return {
      errors: structureValidation.errors,
      warnings: structureValidation.warnings
    }
  }

  /**
   * Categorize validation errors by severity
   */
  static categorizeValidationErrors(allErrors: ValidationError[]): CategorizedValidationErrors {
    const critical = allErrors.filter(error => error.category === 'error')
    const warnings = allErrors.filter(error => error.category === 'warning')
    const info = allErrors.filter(error => error.category === 'info')

    return {
      critical,
      warnings,
      info,
      total: allErrors.length
    }
  }

  /**
   * Generate validation summary message
   */
  static generateValidationSummary(categorized: CategorizedValidationErrors, isValid: boolean): string {
    if (isValid && categorized.total === 0) {
      return 'Unit configuration is valid with no issues detected.'
    }

    const parts: string[] = []

    if (categorized.critical.length > 0) {
      parts.push(`${categorized.critical.length} critical error${categorized.critical.length !== 1 ? 's' : ''}`)
    }

    if (categorized.warnings.length > 0) {
      parts.push(`${categorized.warnings.length} warning${categorized.warnings.length !== 1 ? 's' : ''}`)
    }

    if (categorized.info.length > 0) {
      parts.push(`${categorized.info.length} info message${categorized.info.length !== 1 ? 's' : ''}`)
    }

    const summary = parts.join(', ')
    return `Unit has ${summary} that ${isValid ? 'should' : 'must'} be addressed.`
  }

  /**
   * Validate specific field - delegated to FieldValidationService
   */
  static validateField(
    unit: EditableUnit,
    fieldName: string,
    value: any,
    context: Partial<ValidationContext> = {}
  ): FieldValidationResult {
    const ctx = { ...this.defaultContext, ...context }

    switch (fieldName) {
      case 'chassis':
        return FieldValidationService.validateChassisField(value, ctx)
      case 'model':
        return FieldValidationService.validateModelField(value, ctx)
      case 'mass':
        return FieldValidationService.validateMassField(value, ctx)
      case 'tech_base':
        return FieldValidationService.validateTechBaseField(value, ctx)
      case 'era':
        return FieldValidationService.validateEraField(value, ctx)
      case 'walkSpeed':
        return FieldValidationService.validateWalkSpeedField(value, ctx)
      case 'engineRating':
        // Engine rating validation requires mass and walk speed for cross-validation
        // For now, delegate to basic validation since walkSpeed isn't easily accessible
        const mass = unit.mass || 0
        const walkSpeed = 0 // TODO: Extract walk speed from unit configuration
        return FieldValidationService.validateEngineRatingField(value, mass, walkSpeed, ctx)
      default:
        return { isValid: true }
    }
  }

  /**
   * Validate multiple fields with cross-field validation - delegated to FieldValidationService
   */
  static validateFieldsCrossReference(
    fields: Record<string, any>,
    context: Partial<ValidationContext> = {}
  ): { isValid: boolean; errors: ValidationError[]; suggestions: string[] } {
    const ctx = { ...this.defaultContext, ...context }
    return FieldValidationService.validateFieldsCrossReference(fields, ctx)
  }

  /**
   * Get field validation rules for UI display - delegated to FieldValidationService
   */
  static getFieldValidationRules(): Record<string, Array<{
    name: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }>> {
    return FieldValidationService.getFieldValidationRules()
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
        category: 'Basic Information',
        rules: [
          { name: 'Chassis Required', description: 'Chassis name must be specified', severity: 'error' },
          { name: 'Model Required', description: 'Model designation must be specified', severity: 'error' },
          { name: 'Valid Mass', description: 'Unit mass must be greater than 0', severity: 'error' },
          { name: 'Tonnage Increments', description: 'Mass should be in 5-ton increments', severity: 'warning' },
        ]
      },
      {
        category: 'Construction Rules',
        rules: [
          { name: 'Weight Limit', description: 'Total weight cannot exceed unit tonnage', severity: 'error' },
          { name: 'Heat Balance', description: 'Heat generation should not exceed dissipation', severity: 'error' },
          { name: 'Critical Slots', description: 'Equipment must fit in available critical slots', severity: 'error' },
          { name: 'Minimum Heat Sinks', description: 'Unit must have at least 10 total heat sinks', severity: 'error' }, // This is minimum TOTAL heat sinks for the mech
        ]
      },
      {
        category: 'Tech Compatibility',
        rules: [
          { name: 'Tech Base Consistency', description: 'Equipment should match unit tech base', severity: 'warning' },
          { name: 'Era Restrictions', description: 'Equipment should be available in specified era', severity: 'info' },
        ]
      }
    ]
  }
}
