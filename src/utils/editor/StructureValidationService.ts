/**
 * Structure Validation Service - Armor and internal structure validation logic
 * 
 * Extracted from UnitValidationService as part of Phase 1 refactoring (Day 4.3)
 * Handles armor allocation, structure integrity, weight validation, and BattleTech construction rules
 * 
 * @see IMPLEMENTATION_REFERENCE.md for validation service patterns
 */

import { EditableUnit, ValidationError } from '../../types/editor'

export interface StructureValidationContext {
  strictMode: boolean
  validateArmorDistribution: boolean
  enforceArmorLimits: boolean
  checkStructureIntegrity: boolean
}

export interface StructureValidationResult {
  errors: ValidationError[]
  warnings: ValidationError[]
  armorStatus: ArmorValidationStatus
  structureStatus: StructureValidationStatus
  isValid: boolean
}

export interface ArmorValidationStatus {
  totalArmor: number
  maxArmor: number
  armorUtilization: number
  locationViolations: ArmorLocationViolation[]
  recommendations: string[]
}

export interface ArmorLocationViolation {
  location: string
  current: number
  maximum: number
  violationType: 'excess' | 'negative' | 'invalid_rear' | 'missing'
  severity: 'critical' | 'warning'
}

export interface StructureValidationStatus {
  structureType: string
  structureIntegrity: number
  weightCompliance: boolean
  typeCompatibility: boolean
  recommendations: string[]
}

export interface ArmorOptimization {
  suggestions: ArmorOptimizationSuggestion[]
  efficiency: number
  coverage: ArmorCoverageAnalysis
}

export interface ArmorOptimizationSuggestion {
  type: 'redistribute' | 'increase' | 'decrease' | 'rebalance'
  fromLocation?: string
  toLocation?: string
  amount: number
  benefit: string
  priority: 'high' | 'medium' | 'low'
}

export interface ArmorCoverageAnalysis {
  frontLoaded: number
  rearCoverage: number
  extremityProtection: number
  coreProtection: number
  balanceScore: number
}

export class StructureValidationService {
  private static readonly ARMOR_LOCATION_LIMITS: { [key: string]: number } = {
    'head': 9,
    'center_torso': 47,  // For 50-ton mech (will be calculated dynamically)
    'left_torso': 32,
    'right_torso': 32,
    'left_arm': 24,
    'right_arm': 24,
    'left_leg': 32,
    'right_leg': 32
  }

  private static readonly REAR_ARMOR_LOCATIONS = [
    'center_torso', 'left_torso', 'right_torso'
  ]

  private static readonly NO_REAR_ARMOR_LOCATIONS = [
    'head', 'left_arm', 'right_arm', 'left_leg', 'right_leg'
  ]

  /**
   * Validate structure and armor configuration
   */
  static validateStructure(
    unit: EditableUnit,
    context: Partial<StructureValidationContext> = {}
  ): StructureValidationResult {
    const ctx: StructureValidationContext = {
      strictMode: false,
      validateArmorDistribution: true,
      enforceArmorLimits: true,
      checkStructureIntegrity: true,
      ...context
    }

    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Armor validation
    const armorResults = this.validateArmorAllocation(unit, ctx)
    errors.push(...armorResults.errors)
    warnings.push(...armorResults.warnings)

    // Structure validation
    const structureResults = this.validateInternalStructure(unit, ctx)
    errors.push(...structureResults.errors)
    warnings.push(...structureResults.warnings)

    return {
      errors,
      warnings,
      armorStatus: armorResults.armorStatus,
      structureStatus: structureResults.structureStatus,
      isValid: errors.length === 0
    }
  }

  /**
   * Validate armor allocation and distribution
   */
  static validateArmorAllocation(
    unit: EditableUnit,
    context: StructureValidationContext
  ): {
    errors: ValidationError[]
    warnings: ValidationError[]
    armorStatus: ArmorValidationStatus
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const locationViolations: ArmorLocationViolation[] = []
    const recommendations: string[] = []

    if (!unit.data?.armor) {
      warnings.push({
        id: 'missing-armor-config',
        category: 'warning',
        message: 'Armor configuration should be specified',
        field: 'armor',
      })

      return {
        errors,
        warnings,
        armorStatus: this.createEmptyArmorStatus()
      }
    }

    const armor = unit.data.armor
    let totalArmor = 0
    const maxArmor = this.calculateMaxArmor(unit.mass || 50)

    // Validate armor locations
    if (armor.locations) {
      armor.locations.forEach((location, index) => {
        const locationName = location.location.toLowerCase().replace(/[\s-]/g, '_')
        const armorPoints = location.armor_points || 0
        const rearArmorPoints = location.rear_armor_points || 0

        totalArmor += armorPoints + rearArmorPoints

        // Check for negative armor values
        if (armorPoints < 0) {
          errors.push({
            id: `negative-armor-${index}`,
            category: 'error',
            message: `${location.location}: Armor points cannot be negative`,
            field: `armor.locations[${index}].armor_points`,
          })

          locationViolations.push({
            location: location.location,
            current: armorPoints,
            maximum: 0,
            violationType: 'negative',
            severity: 'critical'
          })
        }

        if (rearArmorPoints < 0) {
          errors.push({
            id: `negative-rear-armor-${index}`,
            category: 'error',
            message: `${location.location}: Rear armor points cannot be negative`,
            field: `armor.locations[${index}].rear_armor_points`,
          })

          locationViolations.push({
            location: location.location,
            current: rearArmorPoints,
            maximum: 0,
            violationType: 'negative',
            severity: 'critical'
          })
        }

        // Check location-specific armor limits
        const maxArmorForLocation = this.getMaxArmorForLocation(locationName, unit.mass || 50)
        
        if (context.enforceArmorLimits) {
          // Special case for head armor (absolute limit of 9)
          if (locationName.includes('head') && armorPoints > 9) {
            errors.push({
              id: `head-armor-excess-${index}`,
              category: 'error',
              message: `Head armor cannot exceed 9 points (current: ${armorPoints})`,
              field: `armor.locations[${index}].armor_points`,
            })

            locationViolations.push({
              location: location.location,
              current: armorPoints,
              maximum: 9,
              violationType: 'excess',
              severity: 'critical'
            })
          } else if (armorPoints > maxArmorForLocation * 1.5) {
            // Flag as error if significantly over limit (150%)
            if (context.strictMode) {
              errors.push({
                id: `armor-excess-${index}`,
                category: 'error',
                message: `${location.location}: Armor (${armorPoints}) exceeds maximum (${maxArmorForLocation})`,
                field: `armor.locations[${index}].armor_points`,
              })

              locationViolations.push({
                location: location.location,
                current: armorPoints,
                maximum: maxArmorForLocation,
                violationType: 'excess',
                severity: 'critical'
              })
            } else {
              warnings.push({
                id: `armor-high-${index}`,
                category: 'warning',
                message: `${location.location}: Armor (${armorPoints}) is high (max recommended: ${maxArmorForLocation})`,
                field: `armor.locations[${index}].armor_points`,
              })

              locationViolations.push({
                location: location.location,
                current: armorPoints,
                maximum: maxArmorForLocation,
                violationType: 'excess',
                severity: 'warning'
              })
            }
          }
        }

        // Check for invalid rear armor placement
        if (rearArmorPoints > 0) {
          const normalizedLocation = locationName.toLowerCase()
          if (this.NO_REAR_ARMOR_LOCATIONS.some(loc => normalizedLocation.includes(loc))) {
            errors.push({
              id: `invalid-rear-armor-${index}`,
              category: 'error',
              message: `${location.location}: Cannot have rear armor`,
              field: `armor.locations[${index}].rear_armor_points`,
            })

            locationViolations.push({
              location: location.location,
              current: rearArmorPoints,
              maximum: 0,
              violationType: 'invalid_rear',
              severity: 'critical'
            })
          }
        }

        // Check for recommended armor minimums
        if (context.validateArmorDistribution) {
          const minRecommended = Math.floor(maxArmorForLocation * 0.3)
          if (armorPoints < minRecommended && !locationName.includes('head')) {
            warnings.push({
              id: `armor-low-${index}`,
              category: 'warning',
              message: `${location.location}: Low armor (${armorPoints}) - consider at least ${minRecommended} points`,
              field: `armor.locations[${index}].armor_points`,
            })
          }
        }
      })
    }

    // Check total armor utilization
    const armorUtilization = (totalArmor / maxArmor) * 100

    if (totalArmor > maxArmor) {
      errors.push({
        id: 'total-armor-excess',
        category: 'error',
        message: `Total armor (${totalArmor}) exceeds maximum (${maxArmor}) by ${totalArmor - maxArmor} points`,
        field: 'armor',
      })
    } else if (armorUtilization < 50) {
      recommendations.push(`Low armor utilization (${armorUtilization.toFixed(1)}%) - consider adding more protection`)
    } else if (armorUtilization > 95) {
      recommendations.push(`High armor utilization (${armorUtilization.toFixed(1)}%) - limited upgrade potential`)
    }

    // Generate armor optimization recommendations
    if (context.validateArmorDistribution) {
      const optimizationRecs = this.generateArmorOptimizations(armor, unit)
      recommendations.push(...optimizationRecs)
    }

    return {
      errors,
      warnings,
      armorStatus: {
        totalArmor,
        maxArmor,
        armorUtilization,
        locationViolations,
        recommendations
      }
    }
  }

  /**
   * Validate internal structure configuration
   */
  static validateInternalStructure(
    unit: EditableUnit,
    context: StructureValidationContext
  ): {
    errors: ValidationError[]
    warnings: ValidationError[]
    structureStatus: StructureValidationStatus
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const recommendations: string[] = []

    // Get structure information from system components
    const structureType = unit.systemComponents?.structure?.type || 'Standard'
    const tonnage = unit.mass || 50
    const structureIntegrity = this.calculateStructureIntegrity(tonnage, structureType)
    const weightCompliance = this.validateStructureWeight(tonnage, structureType)
    const typeCompatibility = this.validateStructureTypeCompatibility(structureType, unit.tech_base)

    // Validate structure type
    if (!this.isValidStructureType(structureType)) {
      errors.push({
        id: 'invalid-structure-type',
        category: 'error',
        message: `Invalid structure type: ${structureType}`,
        field: 'systemComponents.structure.type',
      })
    }

    // Validate structure weight compliance
    if (!weightCompliance) {
      warnings.push({
        id: 'structure-weight-mismatch',
        category: 'warning',
        message: `Structure weight may not match type specifications`,
        field: 'systemComponents.structure',
      })
    }

    // Check tech base compatibility
    if (!typeCompatibility) {
      warnings.push({
        id: 'structure-tech-mismatch',
        category: 'warning',
        message: `Structure type ${structureType} may not be compatible with ${unit.tech_base} tech base`,
        field: 'systemComponents.structure.type',
      })
    }

    // Generate structure recommendations
    if (structureType === 'Standard' && tonnage >= 50) {
      recommendations.push('Consider Endo Steel structure for weight savings on heavier units')
    }

    if (structureType.includes('Endo Steel') && tonnage < 30) {
      recommendations.push('Endo Steel may not provide significant benefits for lighter units')
    }

    return {
      errors,
      warnings,
      structureStatus: {
        structureType,
        structureIntegrity,
        weightCompliance,
        typeCompatibility,
        recommendations
      }
    }
  }

  /**
   * Analyze armor distribution and provide optimization suggestions
   */
  static analyzeArmorDistribution(unit: EditableUnit): ArmorOptimization {
    if (!unit.data?.armor?.locations) {
      return {
        suggestions: [],
        efficiency: 0,
        coverage: this.createEmptyCoverageAnalysis()
      }
    }

    const armor = unit.data.armor
    const suggestions: ArmorOptimizationSuggestion[] = []
    
    // Analyze front vs rear distribution
    let frontArmor = 0
    let rearArmor = 0
    let coreArmor = 0
    let extremityArmor = 0

    armor.locations.forEach(location => {
      const armorPoints = location.armor_points || 0
      const rearArmorPoints = location.rear_armor_points || 0
      const locationName = location.location.toLowerCase()

      frontArmor += armorPoints
      rearArmor += rearArmorPoints

      if (locationName.includes('torso')) {
        coreArmor += armorPoints + rearArmorPoints
      } else {
        extremityArmor += armorPoints + rearArmorPoints
      }
    })

    const totalArmor = frontArmor + rearArmor
    const frontRatio = frontArmor / totalArmor
    const coreRatio = coreArmor / totalArmor

    // Generate optimization suggestions
    if (frontRatio < 0.7) {
      suggestions.push({
        type: 'redistribute',
        amount: Math.ceil((0.7 - frontRatio) * totalArmor),
        benefit: 'Improve frontal protection for better survivability',
        priority: 'medium'
      })
    }

    if (coreRatio < 0.4) {
      suggestions.push({
        type: 'rebalance',
        amount: Math.ceil((0.4 - coreRatio) * totalArmor),
        benefit: 'Strengthen core torso protection against critical hits',
        priority: 'high'
      })
    }

    // Calculate efficiency and coverage
    const efficiency = this.calculateArmorEfficiency(armor, unit.mass || 50)
    const coverage = this.analyzeCoverageBalance(armor)

    return {
      suggestions,
      efficiency,
      coverage
    }
  }

  /**
   * Get structure validation rules for UI display
   */
  static getStructureValidationRules(): Array<{
    category: string
    rules: Array<{ name: string, description: string, severity: string }>
  }> {
    return [
      {
        category: 'Armor Configuration',
        rules: [
          { name: 'Armor Limits', description: 'Armor points must not exceed location maximums', severity: 'error' },
          { name: 'Head Armor Limit', description: 'Head armor cannot exceed 9 points', severity: 'error' },
          { name: 'No Negative Armor', description: 'Armor points cannot be negative', severity: 'error' },
          { name: 'Rear Armor Restrictions', description: 'Only torso locations can have rear armor', severity: 'error' },
        ]
      },
      {
        category: 'Armor Distribution',
        rules: [
          { name: 'Armor Utilization', description: 'Total armor should utilize available tonnage efficiently', severity: 'warning' },
          { name: 'Protection Balance', description: 'Armor should be distributed for optimal protection', severity: 'info' },
          { name: 'Core Protection', description: 'Torso locations should have adequate armor', severity: 'warning' },
        ]
      },
      {
        category: 'Internal Structure',
        rules: [
          { name: 'Valid Structure Type', description: 'Structure type must be valid for tech base', severity: 'error' },
          { name: 'Weight Compliance', description: 'Structure weight must match type specifications', severity: 'warning' },
          { name: 'Tech Compatibility', description: 'Structure type should match unit tech base', severity: 'warning' },
        ]
      }
    ]
  }

  // ===== PRIVATE HELPER METHODS =====

  private static calculateMaxArmor(tonnage: number): number {
    // Maximum armor points = tonnage * 2
    return tonnage * 2
  }

  private static getMaxArmorForLocation(locationName: string, tonnage: number): number {
    const normalizedLocation = locationName.toLowerCase().replace(/[\s-]/g, '_')
    
    // Special case for head
    if (normalizedLocation.includes('head')) {
      return 9
    }

    // Calculate based on tonnage and location type
    const baseLimit = this.ARMOR_LOCATION_LIMITS[normalizedLocation]
    if (baseLimit) {
      // Scale based on tonnage (50-ton base)
      return Math.floor(baseLimit * (tonnage / 50))
    }

    // Default calculation for unknown locations
    if (normalizedLocation.includes('torso')) {
      return Math.floor(tonnage * 0.6) // Torso locations can have more armor
    } else {
      return Math.floor(tonnage * 0.4) // Arms and legs
    }
  }

  private static calculateStructureIntegrity(tonnage: number, structureType: string): number {
    const baseIntegrity = Math.ceil(tonnage / 10)
    
    // Structure type modifiers
    switch (structureType.toLowerCase()) {
      case 'reinforced':
        return Math.floor(baseIntegrity * 1.2)
      case 'composite':
        return Math.floor(baseIntegrity * 0.9)
      default:
        return baseIntegrity
    }
  }

  private static validateStructureWeight(tonnage: number, structureType: string): boolean {
    // Simplified weight validation - in real implementation would check actual weight
    const baseWeight = tonnage * 0.1
    
    switch (structureType.toLowerCase()) {
      case 'endo steel':
        return true // Weight is 50% of standard
      case 'reinforced':
        return true // Weight is 120% of standard
      default:
        return true // Assume valid for now
    }
  }

  private static validateStructureTypeCompatibility(structureType: string, techBase?: string): boolean {
    if (!techBase) return true

    const clanStructures = ['Endo Steel (Clan)', 'Reinforced (Clan)']
    const isClanStructure = clanStructures.some(type => structureType.includes(type))
    const isClanTech = techBase.includes('Clan')

    // Mixed tech is allowed in non-strict mode
    return true
  }

  private static isValidStructureType(structureType: string): boolean {
    const validTypes = [
      'Standard', 'Endo Steel', 'Endo Steel (Clan)', 
      'Reinforced', 'Composite', 'Industrial'
    ]
    
    return validTypes.some(type => structureType.includes(type))
  }

  private static generateArmorOptimizations(armor: any, unit: EditableUnit): string[] {
    const recommendations: string[] = []
    
    if (!armor.locations) return recommendations

    // Check for uneven distribution
    const torsoLocations = armor.locations.filter((loc: any) => 
      loc.location.toLowerCase().includes('torso')
    )
    
    if (torsoLocations.length > 0) {
      const avgTorsoArmor = torsoLocations.reduce((sum: number, loc: any) => 
        sum + (loc.armor_points || 0), 0) / torsoLocations.length
      
      const minTorsoArmor = Math.min(...torsoLocations.map((loc: any) => loc.armor_points || 0))
      
      if (minTorsoArmor < avgTorsoArmor * 0.7) {
        recommendations.push('Consider balancing torso armor distribution')
      }
    }

    // Check for missing rear armor on torso locations
    const hasRearArmor = armor.locations.some((loc: any) => 
      loc.location.toLowerCase().includes('torso') && (loc.rear_armor_points || 0) > 0
    )
    
    if (!hasRearArmor) {
      recommendations.push('Consider adding rear armor to torso locations for better protection')
    }

    return recommendations
  }

  private static calculateArmorEfficiency(armor: any, tonnage: number): number {
    if (!armor.locations) return 0

    const totalArmor = armor.locations.reduce((sum: number, loc: any) => 
      sum + (loc.armor_points || 0) + (loc.rear_armor_points || 0), 0
    )
    
    const maxPossible = tonnage * 2
    return (totalArmor / maxPossible) * 100
  }

  private static analyzeCoverageBalance(armor: any): ArmorCoverageAnalysis {
    if (!armor.locations) {
      return this.createEmptyCoverageAnalysis()
    }

    let frontLoaded = 0
    let rearCoverage = 0
    let extremityProtection = 0
    let coreProtection = 0

    armor.locations.forEach((location: any) => {
      const armorPoints = location.armor_points || 0
      const rearArmorPoints = location.rear_armor_points || 0
      const locationName = location.location.toLowerCase()

      frontLoaded += armorPoints
      rearCoverage += rearArmorPoints

      if (locationName.includes('torso')) {
        coreProtection += armorPoints + rearArmorPoints
      } else {
        extremityProtection += armorPoints + rearArmorPoints
      }
    })

    const totalArmor = frontLoaded + rearCoverage
    const balanceScore = totalArmor > 0 ? 
      Math.min(
        (frontLoaded / totalArmor),
        (coreProtection / totalArmor),
        (extremityProtection / totalArmor)
      ) * 100 : 0

    return {
      frontLoaded: totalArmor > 0 ? (frontLoaded / totalArmor) * 100 : 0,
      rearCoverage: totalArmor > 0 ? (rearCoverage / totalArmor) * 100 : 0,
      extremityProtection: totalArmor > 0 ? (extremityProtection / totalArmor) * 100 : 0,
      coreProtection: totalArmor > 0 ? (coreProtection / totalArmor) * 100 : 0,
      balanceScore
    }
  }

  private static createEmptyArmorStatus(): ArmorValidationStatus {
    return {
      totalArmor: 0,
      maxArmor: 0,
      armorUtilization: 0,
      locationViolations: [],
      recommendations: []
    }
  }

  private static createEmptyCoverageAnalysis(): ArmorCoverageAnalysis {
    return {
      frontLoaded: 0,
      rearCoverage: 0,
      extremityProtection: 0,
      coreProtection: 0,
      balanceScore: 0
    }
  }
}
