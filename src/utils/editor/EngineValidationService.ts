/**
 * Engine Validation Service - Engine-specific validation logic
 * 
 * Extracted from UnitValidationService as part of Phase 1 refactoring (Day 4.1)
 * Handles engine rating, tonnage, movement, and tech compatibility validation
 * 
 * @see IMPLEMENTATION_REFERENCE.md for validation service patterns
 */

import { EditableUnit, ValidationError } from '../../types/editor'

export interface EngineValidationContext {
  strictMode: boolean
  checkTechCompatibility: boolean
  validateMovementRanges: boolean
}

export interface EngineValidationResult {
  errors: ValidationError[]
  warnings: ValidationError[]
  engineRating: number
  walkMP: number
  runMP: number
  jumpMP: number
  isValid: boolean
}

export interface EnginePerformanceMetrics {
  walkSpeed: number
  runSpeed: number
  jumpCapability: number
  heatEfficiency: number
  weightEfficiency: number
  powerToWeightRatio: number
}

export class EngineValidationService {
  private static readonly ENGINE_RATING_MIN = 10
  private static readonly ENGINE_RATING_MAX = 400
  private static readonly MINIMUM_WALK_MP = 1
  private static readonly MAXIMUM_WALK_MP = 8

  /**
   * Validate engine configuration and performance
   */
  static validateEngine(
    unit: EditableUnit,
    context: Partial<EngineValidationContext> = {}
  ): EngineValidationResult {
    const ctx: EngineValidationContext = {
      strictMode: false,
      checkTechCompatibility: true,
      validateMovementRanges: true,
      ...context
    }

    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!unit.systemComponents?.engine) {
      errors.push({
        id: 'missing-engine',
        category: 'error',
        message: 'Engine configuration is required',
        field: 'systemComponents.engine',
      })

      return {
        errors,
        warnings,
        engineRating: 0,
        walkMP: 0,
        runMP: 0,
        jumpMP: 0,
        isValid: false
      }
    }

    const engine = unit.systemComponents.engine
    const unitMass = unit.mass || 50

    // Basic engine rating validation
    const ratingValidation = this.validateEngineRating(engine.rating, ctx)
    errors.push(...ratingValidation.errors)
    warnings.push(...ratingValidation.warnings)

    // Movement validation
    const movementValidation = this.validateMovementCapability(engine.rating, unitMass, ctx)
    errors.push(...movementValidation.errors)
    warnings.push(...movementValidation.warnings)

    // Engine type validation
    const typeValidation = this.validateEngineType(engine.type, unit.tech_base, ctx)
    errors.push(...typeValidation.errors)
    warnings.push(...typeValidation.warnings)

    // Performance analysis
    const performance = this.analyzeEnginePerformance(engine.rating, unitMass, engine.type)
    const performanceValidation = this.validatePerformanceMetrics(performance, ctx)
    warnings.push(...performanceValidation.warnings)

    const walkMP = Math.floor(engine.rating / unitMass)
    const runMP = Math.floor(walkMP * 1.5)
    const jumpMP = 0 // Jump jets handled separately as equipment

    return {
      errors,
      warnings,
      engineRating: engine.rating,
      walkMP,
      runMP,
      jumpMP,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate engine rating bounds and constraints
   */
  static validateEngineRating(
    rating: number,
    context: EngineValidationContext
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Basic range validation
    if (rating <= 0) {
      errors.push({
        id: 'invalid-engine-rating',
        category: 'error',
        message: 'Engine rating must be greater than 0',
        field: 'systemComponents.engine.rating',
      })
      return { errors, warnings }
    }

    if (rating < this.ENGINE_RATING_MIN) {
      if (context.strictMode) {
        errors.push({
          id: 'engine-rating-too-low',
          category: 'error',
          message: `Engine rating must be at least ${this.ENGINE_RATING_MIN}`,
          field: 'systemComponents.engine.rating',
        })
      } else {
        warnings.push({
          id: 'engine-rating-very-low',
          category: 'warning',
          message: `Engine rating ${rating} is very low for practical use`,
          field: 'systemComponents.engine.rating',
        })
      }
    }

    if (rating > this.ENGINE_RATING_MAX) {
      errors.push({
        id: 'excessive-engine-rating',
        category: 'error',
        message: `Engine rating cannot exceed ${this.ENGINE_RATING_MAX}`,
        field: 'systemComponents.engine.rating',
      })
    }

    // Standard rating increments validation
    if (rating % 5 !== 0 && rating < 100) {
      warnings.push({
        id: 'non-standard-engine-rating',
        category: 'warning',
        message: 'Engine ratings below 100 typically use 5-point increments',
        field: 'systemComponents.engine.rating',
      })
    }

    if (rating >= 100 && rating % 25 !== 0) {
      warnings.push({
        id: 'non-standard-high-engine-rating',
        category: 'warning',
        message: 'Engine ratings 100+ typically use 25-point increments',
        field: 'systemComponents.engine.rating',
      })
    }

    return { errors, warnings }
  }

  /**
   * Validate movement capability and performance
   */
  static validateMovementCapability(
    engineRating: number,
    unitMass: number,
    context: EngineValidationContext
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (unitMass <= 0) {
      errors.push({
        id: 'invalid-unit-mass-for-movement',
        category: 'error',
        message: 'Unit mass must be greater than 0 for movement calculations',
        field: 'mass',
      })
      return { errors, warnings }
    }

    const walkMP = Math.floor(engineRating / unitMass)
    const runMP = Math.floor(walkMP * 1.5)

    // Minimum movement validation
    if (walkMP < this.MINIMUM_WALK_MP) {
      errors.push({
        id: 'insufficient-engine-rating',
        category: 'error',
        message: `Engine rating too low - unit must have at least ${this.MINIMUM_WALK_MP} walk MP (current: ${walkMP})`,
        field: 'systemComponents.engine.rating',
      })
    }

    // Maximum practical movement validation
    if (context.validateMovementRanges && walkMP > this.MAXIMUM_WALK_MP) {
      if (context.strictMode) {
        errors.push({
          id: 'excessive-movement-capability',
          category: 'error',
          message: `Walk MP ${walkMP} exceeds practical maximum of ${this.MAXIMUM_WALK_MP}`,
          field: 'systemComponents.engine.rating',
        })
      } else {
        warnings.push({
          id: 'very-high-movement',
          category: 'warning',
          message: `Walk MP ${walkMP} is exceptionally high - consider weight optimization`,
          field: 'systemComponents.engine.rating',
        })
      }
    }

    // Movement efficiency warnings
    if (walkMP === 1) {
      warnings.push({
        id: 'minimal-movement',
        category: 'warning',
        message: 'Unit has minimal movement capability - consider engine upgrade',
        field: 'systemComponents.engine.rating',
      })
    }

    if (context.validateMovementRanges && walkMP >= 6) {
      warnings.push({
        id: 'high-movement-capability',
        category: 'warning',
        message: 'High movement capability detected - excellent mobility',
        field: 'systemComponents.engine.rating',
      })
    }

    return { errors, warnings }
  }

  /**
   * Validate engine type and tech compatibility
   */
  static validateEngineType(
    engineType: string,
    unitTechBase: string | undefined,
    context: EngineValidationContext
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!engineType) {
      errors.push({
        id: 'missing-engine-type',
        category: 'error',
        message: 'Engine type must be specified',
        field: 'systemComponents.engine.type',
      })
      return { errors, warnings }
    }

    // Valid engine types
    const validEngineTypes = [
      'Standard', 'XL Engine', 'Light Engine', 'Compact Engine',
      'XXL Engine', 'Clan XL Engine', 'Clan XXL Engine'
    ]

    if (!validEngineTypes.includes(engineType)) {
      errors.push({
        id: 'invalid-engine-type',
        category: 'error',
        message: `Invalid engine type: ${engineType}`,
        field: 'systemComponents.engine.type',
      })
      return { errors, warnings }
    }

    // Tech compatibility validation
    if (context.checkTechCompatibility && unitTechBase) {
      if (unitTechBase === 'Inner Sphere' && engineType.includes('Clan')) {
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

      if (unitTechBase === 'Clan' && !engineType.includes('Clan') && engineType !== 'Standard') {
        warnings.push({
          id: 'suboptimal-engine-choice',
          category: 'warning',
          message: 'Consider Clan engine variants for better efficiency',
          field: 'systemComponents.engine.type',
        })
      }
    }

    // Engine type specific warnings
    if (engineType === 'XXL Engine' || engineType === 'Clan XXL Engine') {
      warnings.push({
        id: 'fragile-engine-type',
        category: 'warning',
        message: 'XXL engines are very fragile - consider survivability implications',
        field: 'systemComponents.engine.type',
      })
    }

    if (engineType === 'Compact Engine') {
      warnings.push({
        id: 'inefficient-engine-type',
        category: 'warning',
        message: 'Compact engines are weight-inefficient - consider alternatives',
        field: 'systemComponents.engine.type',
      })
    }

    return { errors, warnings }
  }

  /**
   * Analyze engine performance metrics
   */
  static analyzeEnginePerformance(
    engineRating: number,
    unitMass: number,
    engineType: string
  ): EnginePerformanceMetrics {
    const walkSpeed = Math.floor(engineRating / unitMass)
    const runSpeed = Math.floor(walkSpeed * 1.5)
    
    // Engine weight calculation based on type
    const engineWeight = this.calculateEngineWeight(engineRating, engineType)
    const weightEfficiency = engineRating / engineWeight
    const powerToWeightRatio = engineRating / unitMass
    
    // Heat efficiency based on engine type
    let heatEfficiency = 1.0
    if (engineType.includes('XXL')) {
      heatEfficiency = 0.8 // XXL engines run much hotter
    } else if (engineType.includes('XL')) {
      heatEfficiency = 0.9 // XL engines run slightly hotter
    } else if (engineType === 'Compact Engine') {
      heatEfficiency = 1.1 // Compact engines run cooler
    }

    return {
      walkSpeed,
      runSpeed,
      jumpCapability: 0, // Set by jump jets separately
      heatEfficiency,
      weightEfficiency,
      powerToWeightRatio
    }
  }

  /**
   * Validate performance metrics and provide optimization suggestions
   */
  static validatePerformanceMetrics(
    performance: EnginePerformanceMetrics,
    context: EngineValidationContext
  ): { warnings: ValidationError[] } {
    const warnings: ValidationError[] = []

    // Weight efficiency analysis
    if (performance.weightEfficiency < 5) {
      warnings.push({
        id: 'poor-engine-weight-efficiency',
        category: 'warning',
        message: 'Engine weight efficiency is poor - consider engine type optimization',
        field: 'systemComponents.engine.type',
      })
    }

    // Power-to-weight ratio analysis
    if (performance.powerToWeightRatio > 6) {
      warnings.push({
        id: 'excellent-power-to-weight',
        category: 'warning',
        message: 'Excellent power-to-weight ratio - superior mobility platform',
        field: 'systemComponents.engine.rating',
      })
    } else if (performance.powerToWeightRatio < 2) {
      warnings.push({
        id: 'poor-power-to-weight',
        category: 'warning',
        message: 'Low power-to-weight ratio - limited mobility',
        field: 'systemComponents.engine.rating',
      })
    }

    // Heat efficiency warnings
    if (performance.heatEfficiency < 0.9) {
      warnings.push({
        id: 'engine-heat-concerns',
        category: 'warning',
        message: 'Engine type may increase heat generation - monitor thermal management',
        field: 'systemComponents.engine.type',
      })
    }

    return { warnings }
  }

  /**
   * Calculate engine weight based on rating and type
   */
  static calculateEngineWeight(engineRating: number, engineType: string): number {
    // Base weight calculation (simplified)
    const baseWeight = Math.ceil(engineRating / 25)
    
    // Type-specific modifiers
    switch (engineType) {
      case 'XL Engine':
      case 'Clan XL Engine':
        return baseWeight * 0.5
      case 'Light Engine':
        return baseWeight * 0.75
      case 'Compact Engine':
        return baseWeight * 1.5
      case 'XXL Engine':
      case 'Clan XXL Engine':
        return baseWeight * 0.33
      default: // Standard
        return baseWeight
    }
  }

  /**
   * Get optimal engine rating range for unit mass
   */
  static getOptimalEngineRatingRange(unitMass: number): { min: number, max: number, recommended: number } {
    const minRating = unitMass * this.MINIMUM_WALK_MP
    const maxPracticalRating = unitMass * 6 // 6 MP is very good
    const recommendedRating = unitMass * 4 // 4 MP is solid performance
    
    return {
      min: Math.max(minRating, this.ENGINE_RATING_MIN),
      max: Math.min(maxPracticalRating, this.ENGINE_RATING_MAX),
      recommended: Math.min(recommendedRating, this.ENGINE_RATING_MAX)
    }
  }

  /**
   * Suggest engine optimizations
   */
  static suggestEngineOptimizations(
    unit: EditableUnit,
    targetWalkMP?: number
  ): Array<{ type: string, rating: number, benefits: string[], tradeoffs: string[] }> {
    if (!unit.systemComponents?.engine || !unit.mass) {
      return []
    }

    const currentRating = unit.systemComponents.engine.rating
    const unitMass = unit.mass
    const target = targetWalkMP || Math.floor(currentRating / unitMass)
    const targetRating = unitMass * target

    const suggestions: Array<{ type: string, rating: number, benefits: string[], tradeoffs: string[] }> = []

    // Standard engine option
    suggestions.push({
      type: 'Standard',
      rating: targetRating,
      benefits: ['Maximum durability', 'Lower heat generation', 'Widely available'],
      tradeoffs: ['Heaviest option', 'Larger critical slot requirement']
    })

    // XL engine option
    suggestions.push({
      type: unit.tech_base === 'Clan' ? 'Clan XL Engine' : 'XL Engine',
      rating: targetRating,
      benefits: ['50% weight savings', 'More space for equipment'],
      tradeoffs: ['Vulnerable to side torso hits', 'Higher cost']
    })

    // Light engine option (if available)
    if (unit.tech_base === 'Inner Sphere') {
      suggestions.push({
        type: 'Light Engine',
        rating: targetRating,
        benefits: ['25% weight savings', 'Better survivability than XL'],
        tradeoffs: ['Still vulnerable', 'More critical slots than standard']
      })
    }

    return suggestions
  }

  /**
   * Validate engine against unit configuration
   */
  static validateEngineIntegration(
    unit: EditableUnit,
    context: Partial<EngineValidationContext> = {}
  ): { errors: ValidationError[], warnings: ValidationError[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!unit.systemComponents?.engine) {
      return { errors, warnings }
    }

    const engine = unit.systemComponents.engine
    const engineValidation = this.validateEngine(unit, context)

    // Engine integration validated - jump jets handled separately as equipment

    return {
      errors: [...errors, ...engineValidation.errors],
      warnings: [...warnings, ...engineValidation.warnings]
    }
  }

  /**
   * Get engine validation rules for UI display
   */
  static getEngineValidationRules(): Array<{
    category: string
    rules: Array<{ name: string, description: string, severity: string }>
  }> {
    return [
      {
        category: 'Engine Rating',
        rules: [
          { name: 'Minimum Rating', description: `Engine rating must be at least ${this.ENGINE_RATING_MIN}`, severity: 'error' },
          { name: 'Maximum Rating', description: `Engine rating cannot exceed ${this.ENGINE_RATING_MAX}`, severity: 'error' },
          { name: 'Standard Increments', description: 'Engine ratings should use standard increments', severity: 'warning' },
        ]
      },
      {
        category: 'Movement Capability',
        rules: [
          { name: 'Minimum Movement', description: `Unit must have at least ${this.MINIMUM_WALK_MP} walk MP`, severity: 'error' },
          { name: 'Practical Maximum', description: `Walk MP above ${this.MAXIMUM_WALK_MP} is impractical`, severity: 'warning' },
          { name: 'Movement Efficiency', description: 'Balance mobility with other requirements', severity: 'info' },
        ]
      },
      {
        category: 'Tech Compatibility',
        rules: [
          { name: 'Tech Base Match', description: 'Engine type should match unit tech base', severity: 'warning' },
          { name: 'Engine Survivability', description: 'Consider engine vulnerability vs weight savings', severity: 'info' },
        ]
      }
    ]
  }
}
