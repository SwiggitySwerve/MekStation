/**
 * Basic Info Validation Service - Basic unit information validation logic
 * 
 * Extracted from UnitValidationService as part of validation service completion.
 * Handles chassis, model, mass, tech base, and era validation with BattleTech rules.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for validation service patterns
 */

import { EditableUnit, ValidationError } from '../../types/editor'

export interface BasicInfoValidationContext {
  strictMode: boolean
  validateOptionalFields: boolean
  enforceStandardTonnage: boolean
}

export interface BasicInfoValidationResult {
  errors: ValidationError[]
  warnings: ValidationError[]
  isValid: boolean
}

export interface FieldValidationResult {
  isValid: boolean
  error?: ValidationError
  suggestions?: string[]
}

export class BasicInfoValidationService {
  private static readonly VALID_TECH_BASES = [
    'Inner Sphere', 
    'Clan', 
    'Mixed (IS Chassis)', 
    'Mixed (Clan Chassis)'
  ]

  private static readonly STANDARD_TONNAGES = [
    20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100
  ]

  private static readonly LIGHT_MECH_THRESHOLD = 20
  private static readonly HEAVY_MECH_THRESHOLD = 100
  private static readonly MAX_CHASSIS_LENGTH = 50
  private static readonly MAX_MODEL_LENGTH = 30

  /**
   * Validate basic unit information
   */
  static validateBasicInfo(
    unit: EditableUnit,
    context: Partial<BasicInfoValidationContext> = {}
  ): BasicInfoValidationResult {
    const ctx: BasicInfoValidationContext = {
      strictMode: false,
      validateOptionalFields: true,
      enforceStandardTonnage: false,
      ...context
    }

    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Chassis validation
    const chassisResult = this.validateChassisField(unit.chassis, ctx)
    if (!chassisResult.isValid && chassisResult.error) {
      errors.push(chassisResult.error)
    }

    // Model validation
    const modelResult = this.validateModelField(unit.model, ctx)
    if (!modelResult.isValid && modelResult.error) {
      errors.push(modelResult.error)
    }

    // Mass validation
    const massResult = this.validateMassField(unit.mass, ctx)
    if (massResult.error) {
      if (massResult.error.category === 'error') {
        errors.push(massResult.error)
      } else {
        warnings.push(massResult.error)
      }
    }

    // Additional mass-related warnings
    const massWarnings = this.validateMassRanges(unit.mass, ctx)
    warnings.push(...massWarnings)

    // Tech base validation
    const techBaseResult = this.validateTechBaseField(unit.tech_base, ctx)
    if (!techBaseResult.isValid && techBaseResult.error) {
      errors.push(techBaseResult.error)
    }

    // Era validation (optional)
    if (ctx.validateOptionalFields) {
      const eraWarnings = this.validateEraField(unit.era, ctx)
      warnings.push(...eraWarnings)
    }

    // Unit type validation (optional) - check if property exists
    if (ctx.validateOptionalFields) {
      // Type-safe access to optional unit_type property
      const unitWithType = unit as EditableUnit & { unit_type?: string }
      if (unitWithType.unit_type) {
        const typeWarnings = this.validateUnitType(unitWithType.unit_type, ctx)
        warnings.push(...typeWarnings)
      }
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate chassis field
   */
  static validateChassisField(
    value: string | undefined,
    context: BasicInfoValidationContext
  ): FieldValidationResult {
    if (!value || value.trim() === '') {
      return {
        isValid: false,
        error: {
          id: 'missing-chassis',
          category: 'error',
          message: 'Chassis name is required',
          field: 'chassis',
        }
      }
    }

    // Check length constraints
    if (value.length > this.MAX_CHASSIS_LENGTH) {
      return {
        isValid: false,
        error: {
          id: 'chassis-too-long',
          category: 'error',
          message: `Chassis name should not exceed ${this.MAX_CHASSIS_LENGTH} characters`,
          field: 'chassis',
        }
      }
    }

    // Check for invalid characters in strict mode
    if (context.strictMode) {
      const invalidChars = /[^a-zA-Z0-9\s\-_]/
      if (invalidChars.test(value)) {
        return {
          isValid: false,
          error: {
            id: 'chassis-invalid-characters',
            category: 'error',
            message: 'Chassis name contains invalid characters',
            field: 'chassis',
          },
          suggestions: ['Use only letters, numbers, spaces, hyphens, and underscores']
        }
      }
    }

    // Check for reasonable naming conventions
    if (value.length < 2) {
      return {
        isValid: false,
        error: {
          id: 'chassis-too-short',
          category: 'error',
          message: 'Chassis name should be at least 2 characters',
          field: 'chassis',
        }
      }
    }

    return { isValid: true }
  }

  /**
   * Validate model field
   */
  static validateModelField(
    value: string | undefined,
    context: BasicInfoValidationContext
  ): FieldValidationResult {
    if (!value || value.trim() === '') {
      return {
        isValid: false,
        error: {
          id: 'missing-model',
          category: 'error',
          message: 'Model designation is required',
          field: 'model',
        }
      }
    }

    // Check length constraints
    if (value.length > this.MAX_MODEL_LENGTH) {
      return {
        isValid: false,
        error: {
          id: 'model-too-long',
          category: 'error',
          message: `Model designation should not exceed ${this.MAX_MODEL_LENGTH} characters`,
          field: 'model',
        }
      }
    }

    // Check for invalid characters in strict mode
    if (context.strictMode) {
      const invalidChars = /[^a-zA-Z0-9\s\-_]/
      if (invalidChars.test(value)) {
        return {
          isValid: false,
          error: {
            id: 'model-invalid-characters',
            category: 'error',
            message: 'Model designation contains invalid characters',
            field: 'model',
          },
          suggestions: ['Use only letters, numbers, spaces, hyphens, and underscores']
        }
      }
    }

    return { isValid: true }
  }

  /**
   * Validate mass field
   */
  static validateMassField(
    value: number | undefined,
    context: BasicInfoValidationContext
  ): FieldValidationResult {
    if (!value || value <= 0) {
      return {
        isValid: false,
        error: {
          id: 'invalid-mass',
          category: 'error',
          message: 'Unit mass must be greater than 0',
          field: 'mass',
        }
      }
    }

    // Check for reasonable mass limits
    if (value > 200) {
      return {
        isValid: false,
        error: {
          id: 'mass-too-high',
          category: 'error',
          message: 'Unit mass exceeds reasonable limits (200 tons)',
          field: 'mass',
        }
      }
    }

    // Check tonnage increments
    if (value % 5 !== 0) {
      const severity = context.strictMode || context.enforceStandardTonnage ? 'error' : 'warning'
      return {
        isValid: severity !== 'error',
        error: {
          id: 'invalid-tonnage-increment',
          category: severity,
          message: 'Unit mass should be in 5-ton increments',
          field: 'mass',
        },
        suggestions: this.getSuggestedTonnages(value)
      }
    }

    // Check if mass is a standard BattleMech tonnage
    if (context.enforceStandardTonnage && !this.STANDARD_TONNAGES.includes(value)) {
      return {
        isValid: false,
        error: {
          id: 'non-standard-tonnage',
          category: 'error',
          message: 'Unit mass must be a standard BattleMech tonnage',
          field: 'mass',
        },
        suggestions: this.getSuggestedTonnages(value)
      }
    }

    return { isValid: true }
  }

  /**
   * Validate mass ranges and provide warnings
   */
  static validateMassRanges(
    value: number | undefined,
    context: BasicInfoValidationContext
  ): ValidationError[] {
    const warnings: ValidationError[] = []

    if (!value || value <= 0) {
      return warnings
    }

    // Light mech warning
    if (value < this.LIGHT_MECH_THRESHOLD) {
      warnings.push({
        id: 'light-tonnage',
        category: 'warning',
        message: `Unit mass below ${this.LIGHT_MECH_THRESHOLD} tons is very light for a BattleMech`,
        field: 'mass',
      })
    }

    // Heavy mech warning
    if (value > this.HEAVY_MECH_THRESHOLD) {
      if (context.strictMode) {
        // Already handled in validateMassField as error
      } else {
        warnings.push({
          id: 'heavy-tonnage',
          category: 'warning',
          message: `Unit mass above ${this.HEAVY_MECH_THRESHOLD} tons is unusual for standard BattleMechs`,
          field: 'mass',
        })
      }
    }

    return warnings
  }

  /**
   * Validate tech base field
   */
  static validateTechBaseField(
    value: string | undefined,
    context: BasicInfoValidationContext
  ): FieldValidationResult {
    if (!value || value.trim() === '') {
      return {
        isValid: false,
        error: {
          id: 'missing-tech-base',
          category: 'error',
          message: 'Tech base must be specified',
          field: 'tech_base',
        }
      }
    }

    if (!this.VALID_TECH_BASES.includes(value)) {
      return {
        isValid: false,
        error: {
          id: 'invalid-tech-base',
          category: 'error',
          message: 'Invalid tech base selection',
          field: 'tech_base',
        },
        suggestions: this.VALID_TECH_BASES
      }
    }

    return { isValid: true }
  }

  /**
   * Validate era field (optional)
   */
  static validateEraField(
    value: string | undefined,
    context: BasicInfoValidationContext
  ): ValidationError[] {
    const warnings: ValidationError[] = []

    if (!value || value.trim() === '') {
      warnings.push({
        id: 'missing-era',
        category: 'warning',
        message: 'Era should be specified for historical accuracy',
        field: 'era',
      })
    }

    return warnings
  }

  /**
   * Validate unit type (optional)
   */
  static validateUnitType(
    value: string | undefined,
    context: BasicInfoValidationContext
  ): ValidationError[] {
    const warnings: ValidationError[] = []

    if (!value || value.trim() === '') {
      warnings.push({
        id: 'missing-unit-type',
        category: 'warning',
        message: 'Unit type should be specified for clarity',
        field: 'unit_type',
      })
    }

    return warnings
  }

  /**
   * Get suggested tonnages near the given value
   */
  static getSuggestedTonnages(value: number): string[] {
    if (!value) return this.STANDARD_TONNAGES.slice(0, 5).map(t => `${t} tons`)

    // Find closest standard tonnages
    const lower = Math.floor(value / 5) * 5
    const upper = Math.ceil(value / 5) * 5

    const suggestions = []
    if (lower > 0 && lower <= 100) suggestions.push(`${lower} tons`)
    if (upper > lower && upper <= 100) suggestions.push(`${upper} tons`)

    // Add a few more nearby options
    if (lower - 5 > 0) suggestions.unshift(`${lower - 5} tons`)
    if (upper + 5 <= 100) suggestions.push(`${upper + 5} tons`)

    return suggestions.slice(0, 4) // Limit to 4 suggestions
  }

  /**
   * Validate specific field by name
   */
  static validateField(
    unit: EditableUnit,
    fieldName: string,
    value: any,
    context: Partial<BasicInfoValidationContext> = {}
  ): FieldValidationResult {
    const ctx: BasicInfoValidationContext = {
      strictMode: false,
      validateOptionalFields: true,
      enforceStandardTonnage: false,
      ...context
    }

    switch (fieldName) {
      case 'chassis':
        return this.validateChassisField(value, ctx)
      case 'model':
        return this.validateModelField(value, ctx)
      case 'mass':
        return this.validateMassField(value, ctx)
      case 'tech_base':
        return this.validateTechBaseField(value, ctx)
      default:
        return { isValid: true }
    }
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
        category: 'Required Information',
        rules: [
          { name: 'Chassis Name', description: 'Chassis name must be specified', severity: 'error' },
          { name: 'Model Designation', description: 'Model designation must be specified', severity: 'error' },
          { name: 'Unit Mass', description: 'Unit mass must be greater than 0', severity: 'error' },
          { name: 'Tech Base', description: 'Tech base must be specified', severity: 'error' },
        ]
      },
      {
        category: 'Naming Conventions',
        rules: [
          { name: 'Chassis Length', description: `Chassis name should not exceed ${this.MAX_CHASSIS_LENGTH} characters`, severity: 'error' },
          { name: 'Model Length', description: `Model designation should not exceed ${this.MAX_MODEL_LENGTH} characters`, severity: 'error' },
          { name: 'Valid Characters', description: 'Names should use standard characters only', severity: 'warning' },
        ]
      },
      {
        category: 'BattleTech Standards',
        rules: [
          { name: 'Standard Tonnage', description: 'Mass should be in 5-ton increments', severity: 'warning' },
          { name: 'Tonnage Range', description: 'Standard BattleMechs are 20-100 tons', severity: 'warning' },
          { name: 'Tech Base Options', description: 'Valid tech bases: Inner Sphere, Clan, Mixed', severity: 'error' },
          { name: 'Era Specification', description: 'Era should be specified for historical accuracy', severity: 'info' },
        ]
      }
    ]
  }

  /**
   * Get standard tonnage options for UI
   */
  static getStandardTonnages(): number[] {
    return [...this.STANDARD_TONNAGES]
  }

  /**
   * Get valid tech base options for UI
   */
  static getValidTechBases(): string[] {
    return [...this.VALID_TECH_BASES]
  }

  /**
   * Check if a tonnage is standard
   */
  static isStandardTonnage(value: number): boolean {
    return this.STANDARD_TONNAGES.includes(value)
  }

  /**
   * Check if a tech base is valid
   */
  static isValidTechBase(value: string): boolean {
    return this.VALID_TECH_BASES.includes(value)
  }
}
