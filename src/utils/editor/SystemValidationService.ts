/**
 * System Validation Service - System component integration validation logic
 * 
 * Extracted from UnitValidationService as part of validation service completion.
 * Handles engine, heat sink, and system component integration validation.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for validation service patterns
 */

import { EditableUnit, ValidationError } from '../../types/editor'
import { EngineValidationService } from './EngineValidationService'

export interface SystemValidationContext {
  strictMode: boolean
  validateEngineIntegration: boolean
  validateHeatSinkRequirements: boolean
  checkSystemCompatibility: boolean
}

export interface SystemValidationResult {
  errors: ValidationError[]
  warnings: ValidationError[]
  isValid: boolean
}

export interface SystemComponentRequirements {
  minHeatSinks: number
  requiredComponents: string[]
  incompatibleComponents: string[]
  techBaseConstraints: string[]
}

export class SystemValidationService {
  private static readonly MIN_HEAT_SINKS = 10
  private static readonly REQUIRED_SYSTEM_COMPONENTS = [
    'engine',
    'gyro',
    'cockpit',
    'lifesupport',
    'sensors'
  ]
  
  private static readonly TECH_COMPATIBLE_COMPONENTS = {
    'Inner Sphere': ['Standard', 'Light', 'XL', 'Compact', 'XXL'],
    'Clan': ['Standard', 'XL', 'XXL', 'Clan XL', 'Clan XXL'],
    'Mixed (IS Chassis)': ['Standard', 'Light', 'XL', 'Compact', 'XXL', 'Clan XL'],
    'Mixed (Clan Chassis)': ['Standard', 'XL', 'XXL', 'Clan XL', 'Clan XXL']
  }

  /**
   * Validate system components configuration
   */
  static validateSystemComponents(
    unit: EditableUnit,
    context: Partial<SystemValidationContext> = {}
  ): SystemValidationResult {
    const ctx: SystemValidationContext = {
      strictMode: false,
      validateEngineIntegration: true,
      validateHeatSinkRequirements: true,
      checkSystemCompatibility: true,
      ...context
    }

    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!unit.systemComponents) {
      if (ctx.strictMode) {
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
      return { errors, warnings, isValid: errors.length === 0 }
    }

    const components = unit.systemComponents

    // Engine validation - delegated to EngineValidationService
    if (ctx.validateEngineIntegration) {
      const engineValidation = EngineValidationService.validateEngineIntegration(unit, {
        strictMode: ctx.strictMode,
        checkTechCompatibility: ctx.checkSystemCompatibility,
        validateMovementRanges: true
      })
      errors.push(...engineValidation.errors)
      warnings.push(...engineValidation.warnings)
    }

    // Heat sink validation
    if (ctx.validateHeatSinkRequirements) {
      const heatSinkValidation = this.validateHeatSinkSystem(components, unit, ctx)
      errors.push(...heatSinkValidation.errors)
      warnings.push(...heatSinkValidation.warnings)
    }

    // System component integration validation
    if (ctx.checkSystemCompatibility) {
      const integrationValidation = this.validateSystemIntegration(components, unit, ctx)
      errors.push(...integrationValidation.errors)
      warnings.push(...integrationValidation.warnings)
    }

    // Required components validation
    const requiredValidation = this.validateRequiredComponents(components, ctx)
    errors.push(...requiredValidation.errors)
    warnings.push(...requiredValidation.warnings)

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate heat sink system configuration
   */
  static validateHeatSinkSystem(
    components: any,
    unit: EditableUnit,
    context: SystemValidationContext
  ): SystemValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!components.heatSinks) {
      errors.push({
        id: 'missing-heat-sinks',
        category: 'error',
        message: 'Heat sink configuration is required',
        field: 'systemComponents.heatSinks',
      })
      return { errors, warnings, isValid: false }
    }

    const heatSinks = components.heatSinks

    // Minimum heat sink requirement
    if (!heatSinks.total || heatSinks.total < this.MIN_HEAT_SINKS) {
      errors.push({
        id: 'insufficient-heat-sinks',
        category: 'error',
        message: `Unit must have at least ${this.MIN_HEAT_SINKS} heat sinks`,
        field: 'systemComponents.heatSinks.total',
      })
    }

    // External heat sink validation
    if (heatSinks.externalRequired !== undefined && heatSinks.externalRequired < 0) {
      errors.push({
        id: 'negative-external-heat-sinks',
        category: 'error',
        message: 'External heat sink count cannot be negative',
        field: 'systemComponents.heatSinks.externalRequired',
      })
    }

    // Heat sink type validation
    if (heatSinks.type) {
      const techCompatibility = this.validateHeatSinkTechCompatibility(
        heatSinks.type,
        unit.tech_base,
        context
      )
      errors.push(...techCompatibility.errors)
      warnings.push(...techCompatibility.warnings)
    }

    // Engine heat sink capacity validation
    if (components.engine && heatSinks.engineIntegrated !== undefined) {
      const engineCapacityValidation = this.validateEngineHeatSinkCapacity(
        components.engine,
        heatSinks,
        context
      )
      errors.push(...engineCapacityValidation.errors)
      warnings.push(...engineCapacityValidation.warnings)
    }

    // Heat sink efficiency validation
    const efficiencyValidation = this.validateHeatSinkEfficiency(heatSinks, unit, context)
    warnings.push(...efficiencyValidation.warnings)

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate heat sink tech compatibility
   */
  static validateHeatSinkTechCompatibility(
    heatSinkType: string,
    unitTechBase: string,
    context: SystemValidationContext
  ): SystemValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (unitTechBase === 'Inner Sphere' && heatSinkType.includes('Clan')) {
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

    if (unitTechBase === 'Clan' && heatSinkType.includes('Inner Sphere')) {
      if (context.strictMode) {
        errors.push({
          id: 'heat-sink-tech-mismatch',
          category: 'error',
          message: 'Inner Sphere heat sinks incompatible with Clan tech base',
          field: 'systemComponents.heatSinks.type',
        })
      } else {
        warnings.push({
          id: 'heat-sink-tech-mismatch',
          category: 'warning',
          message: 'Mixed tech: Inner Sphere heat sinks on Clan chassis',
          field: 'systemComponents.heatSinks.type',
        })
      }
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate engine heat sink capacity
   */
  static validateEngineHeatSinkCapacity(
    engine: any,
    heatSinks: any,
    context: SystemValidationContext
  ): SystemValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!engine.rating) {
      return { errors, warnings, isValid: true }
    }

    // Calculate maximum engine heat sink capacity
    const maxEngineHeatSinks = Math.floor(engine.rating / 25)
    
    if (heatSinks.engineIntegrated > maxEngineHeatSinks) {
      errors.push({
        id: 'excess-engine-heat-sinks',
        category: 'error',
        message: `Engine can only accommodate ${maxEngineHeatSinks} heat sinks`,
        field: 'systemComponents.heatSinks.engineIntegrated',
      })
    }

    // Warn about unused engine capacity
    if (heatSinks.engineIntegrated < maxEngineHeatSinks && maxEngineHeatSinks >= this.MIN_HEAT_SINKS) {
      const unusedCapacity = maxEngineHeatSinks - heatSinks.engineIntegrated
      warnings.push({
        id: 'unused-engine-heat-sink-capacity',
        category: 'warning',
        message: `Engine has ${unusedCapacity} unused heat sink slots`,
        field: 'systemComponents.heatSinks.engineIntegrated',
      })
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate heat sink efficiency
   */
  static validateHeatSinkEfficiency(
    heatSinks: any,
    unit: EditableUnit,
    context: SystemValidationContext
  ): SystemValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Calculate heat sink efficiency based on type
    let efficiencyMultiplier = 1.0 // Standard heat sinks
    if (heatSinks.type && heatSinks.type.includes('Double')) {
      efficiencyMultiplier = 2.0
    }

    const totalDissipation = heatSinks.total * efficiencyMultiplier

    // Warn about excessive heat dissipation
    if (totalDissipation > 30 && !context.strictMode) {
      warnings.push({
        id: 'excessive-heat-dissipation',
        category: 'warning',
        message: 'Very high heat dissipation capacity - may be overkill',
        field: 'systemComponents.heatSinks.total',
      })
    }

    // Warn about low heat dissipation for heavy weapons
    if (totalDissipation < 20 && unit.mass && unit.mass > 50) {
      warnings.push({
        id: 'low-heat-dissipation',
        category: 'warning',
        message: 'Low heat dissipation for a heavy unit',
        field: 'systemComponents.heatSinks.total',
      })
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate system component integration
   */
  static validateSystemIntegration(
    components: any,
    unit: EditableUnit,
    context: SystemValidationContext
  ): SystemValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Gyro-engine integration
    if (components.engine && components.gyro) {
      const gyroValidation = this.validateGyroEngineCompatibility(
        components.gyro,
        components.engine,
        context
      )
      errors.push(...gyroValidation.errors)
      warnings.push(...gyroValidation.warnings)
    }

    // Cockpit system integration
    if (components.cockpit) {
      const cockpitValidation = this.validateCockpitIntegration(
        components.cockpit,
        unit,
        context
      )
      errors.push(...cockpitValidation.errors)
      warnings.push(...cockpitValidation.warnings)
    }

    // Life support integration
    if (components.lifesupport && components.cockpit) {
      const lifeSupportValidation = this.validateLifeSupportIntegration(
        components.lifesupport,
        components.cockpit,
        context
      )
      warnings.push(...lifeSupportValidation.warnings)
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate gyro-engine compatibility
   */
  static validateGyroEngineCompatibility(
    gyro: any,
    engine: any,
    context: SystemValidationContext
  ): SystemValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Standard gyro requires standard engine rating constraints
    if (gyro.type === 'Standard' && engine.rating > 400) {
      errors.push({
        id: 'gyro-engine-incompatibility',
        category: 'error',
        message: 'Standard gyro cannot handle engine ratings over 400',
        field: 'systemComponents.gyro.type',
      })
    }

    // Compact gyro has different constraints
    if (gyro.type === 'Compact' && engine.type && engine.type.includes('XL')) {
      warnings.push({
        id: 'compact-gyro-xl-engine',
        category: 'warning',
        message: 'Compact gyro with XL engine may be vulnerable to critical hits',
        field: 'systemComponents.gyro.type',
      })
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate cockpit integration
   */
  static validateCockpitIntegration(
    cockpit: any,
    unit: EditableUnit,
    context: SystemValidationContext
  ): SystemValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Industrial cockpit restrictions
    if (cockpit.type === 'Industrial' && unit.tech_base === 'Clan') {
      if (context.strictMode) {
        errors.push({
          id: 'industrial-cockpit-clan',
          category: 'error',
          message: 'Industrial cockpits are not compatible with Clan technology',
          field: 'systemComponents.cockpit.type',
        })
      } else {
        warnings.push({
          id: 'industrial-cockpit-clan',
          category: 'warning',
          message: 'Industrial cockpit unusual for Clan units',
          field: 'systemComponents.cockpit.type',
        })
      }
    }

    // Small cockpit weight restrictions
    if (cockpit.type === 'Small' && unit.mass && unit.mass > 55) {
      warnings.push({
        id: 'small-cockpit-heavy-mech',
        category: 'warning',
        message: 'Small cockpit unusual for mechs over 55 tons',
        field: 'systemComponents.cockpit.type',
      })
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate life support integration
   */
  static validateLifeSupportIntegration(
    lifesupport: any,
    cockpit: any,
    context: SystemValidationContext
  ): SystemValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Environmental sealing compatibility
    if (lifesupport.environmental && !cockpit.sealed) {
      warnings.push({
        id: 'environmental-lifesupport-unsealed-cockpit',
        category: 'warning',
        message: 'Environmental life support more effective with sealed cockpit',
        field: 'systemComponents.lifesupport.environmental',
      })
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate required system components
   */
  static validateRequiredComponents(
    components: any,
    context: SystemValidationContext
  ): SystemValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Check for required components
    this.REQUIRED_SYSTEM_COMPONENTS.forEach(componentType => {
      if (!components[componentType]) {
        if (context.strictMode) {
          errors.push({
            id: `missing-${componentType}`,
            category: 'error',
            message: `${componentType.charAt(0).toUpperCase() + componentType.slice(1)} component is required`,
            field: `systemComponents.${componentType}`,
          })
        } else {
          warnings.push({
            id: `missing-${componentType}`,
            category: 'warning',
            message: `${componentType.charAt(0).toUpperCase() + componentType.slice(1)} component should be configured`,
            field: `systemComponents.${componentType}`,
          })
        }
      }
    })

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Get system component requirements for a given unit
   */
  static getSystemComponentRequirements(unit: EditableUnit): SystemComponentRequirements {
    const requirements: SystemComponentRequirements = {
      minHeatSinks: this.MIN_HEAT_SINKS,
      requiredComponents: [...this.REQUIRED_SYSTEM_COMPONENTS],
      incompatibleComponents: [],
      techBaseConstraints: []
    }

    // Adjust requirements based on unit characteristics
    if (unit.mass && unit.mass < 20) {
      requirements.incompatibleComponents.push('Standard Gyro (too heavy)')
    }

    if (unit.tech_base === 'Clan') {
      requirements.techBaseConstraints.push('Clan technology compatible')
    } else if (unit.tech_base === 'Inner Sphere') {
      requirements.techBaseConstraints.push('Inner Sphere technology compatible')
    }

    return requirements
  }

  /**
   * Validate system component tech compatibility
   */
  static validateTechCompatibility(
    componentType: string,
    componentVariant: string,
    unitTechBase: string
  ): boolean {
    const compatibleComponents = this.TECH_COMPATIBLE_COMPONENTS[unitTechBase as keyof typeof this.TECH_COMPATIBLE_COMPONENTS]
    return compatibleComponents ? compatibleComponents.includes(componentVariant) : false
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
        category: 'System Requirements',
        rules: [
          { name: 'Heat Sink Minimum', description: `At least ${this.MIN_HEAT_SINKS} heat sinks required`, severity: 'error' },
          { name: 'Engine Configuration', description: 'Engine must be properly configured', severity: 'error' },
          { name: 'Gyro Compatibility', description: 'Gyro must be compatible with engine rating', severity: 'error' },
          { name: 'Required Components', description: 'All essential systems must be present', severity: 'warning' },
        ]
      },
      {
        category: 'Integration Compatibility',
        rules: [
          { name: 'Engine Heat Sink Capacity', description: 'Engine heat sink allocation must not exceed capacity', severity: 'error' },
          { name: 'Tech Base Consistency', description: 'System components should match unit tech base', severity: 'warning' },
          { name: 'Component Integration', description: 'System components should work together efficiently', severity: 'warning' },
        ]
      },
      {
        category: 'Performance Optimization',
        rules: [
          { name: 'Heat Efficiency', description: 'Heat dissipation should match weapon loadout', severity: 'warning' },
          { name: 'Weight Optimization', description: 'System components should be weight-efficient', severity: 'info' },
          { name: 'Critical Slot Usage', description: 'System components should use critical slots efficiently', severity: 'info' },
        ]
      }
    ]
  }
}
