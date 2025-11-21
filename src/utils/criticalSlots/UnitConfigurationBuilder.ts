/**
 * Unit Configuration Builder
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { 
  UnitConfiguration, 
  LegacyUnitConfiguration 
} from './UnitCriticalManagerTypes'
import { ComponentConfiguration } from '../../types/componentConfiguration'
import { EngineType } from './SystemComponentRules'
// Import heat sink calculations
const heatSinkCalculations = require('../heatSinkCalculations');
const { calculateInternalHeatSinks, calculateInternalHeatSinksForEngine } = heatSinkCalculations;

/**
 * Utility functions for unit configuration
 */
export class UnitConfigurationBuilder {
  /**
   * Create a complete UnitConfiguration from legacy or partial configuration
   */
  static buildConfiguration(input: Partial<UnitConfiguration> | LegacyUnitConfiguration): UnitConfiguration {
    console.log('[BUILDER_DEBUG] 🔨 buildConfiguration called with input:', {
      structureType: 'structureType' in input ? input.structureType : undefined,
      armorType: 'armorType' in input ? input.armorType : undefined,
      techBase: 'techBase' in input ? input.techBase : undefined,
      structureTypeType: 'structureType' in input ? typeof input.structureType : 'N/A',
      armorTypeType: 'armorType' in input ? typeof input.armorType : 'N/A'
    })
    
    // Handle undefined or null input
    if (!input) {
      return this.getDefaultConfiguration()
    }
    
    // Handle legacy configuration format
    if ('mass' in input && !('tonnage' in input)) {
      console.log('[BUILDER_DEBUG] 🔨 Converting legacy configuration')
      const config = this.fromLegacyConfiguration(input as LegacyUnitConfiguration)
      console.log('[BUILDER_DEBUG] 🔨 Legacy conversion result:', {
        structureType: config.structureType,
        armorType: config.armorType,
        techBase: config.techBase
      })
      return config
    }
    
    // Merge with defaults, preserving all provided values
    const config = { ...this.getDefaultConfiguration(), ...input } as UnitConfiguration
    
    console.log('[BUILDER_DEBUG] 🔨 After merging with defaults:', {
      structureType: config.structureType,
      armorType: config.armorType,
      techBase: config.techBase
    })
    
    // Handle string-to-object conversions for component types
    if (typeof config.structureType === 'string') {
      config.structureType = { type: config.structureType, techBase: config.techBase }
      console.log('[BUILDER_DEBUG] 🔨 Converted structureType string to object:', config.structureType)
    }
    
    if (typeof config.armorType === 'string') {
      config.armorType = { type: config.armorType, techBase: config.techBase }
      console.log('[BUILDER_DEBUG] 🔨 Converted armorType string to object:', config.armorType)
    }
    
    if (typeof config.gyroType === 'string') {
      config.gyroType = { type: config.gyroType, techBase: config.techBase }
      console.log('[BUILDER_DEBUG] 🔨 Converted gyroType string to object:', config.gyroType)
    }
    
    if (typeof config.heatSinkType === 'string') {
      config.heatSinkType = { type: config.heatSinkType, techBase: config.techBase }
      console.log('[BUILDER_DEBUG] 🔨 Converted heatSinkType string to object:', config.heatSinkType)
    }
    
    if (typeof config.jumpJetType === 'string') {
      config.jumpJetType = { type: config.jumpJetType, techBase: config.techBase }
      console.log('[BUILDER_DEBUG] 🔨 Converted jumpJetType string to object:', config.jumpJetType)
    }
    
    // Auto-calculate dependent values
    config.engineRating = config.tonnage * config.walkMP
    config.runMP = Math.floor(config.walkMP * 1.5)
    config.mass = config.tonnage // Alias for tonnage
    
    // Calculate internal heat sinks (engine rating / 25, rounded down)
    config.internalHeatSinks = Math.floor(config.engineRating / 25)
    
    // Calculate external heat sinks (total - internal, minimum 0)
    config.externalHeatSinks = Math.max(0, config.totalHeatSinks - config.internalHeatSinks)
    
    console.log('[BUILDER_DEBUG] 🔨 Final configuration:', {
      structureType: config.structureType,
      armorType: config.armorType,
      techBase: config.techBase
    })
    
    return config
  }
  
  /**
   * Convert legacy configuration to new format
   */
  private static fromLegacyConfiguration(legacy: LegacyUnitConfiguration): UnitConfiguration {
    const tonnage = legacy.mass
    const walkMP = 4 // Default reasonable walk speed
    
    return this.calculateDependentValues({
      // Default chassis/model for legacy units
      chassis: 'Unknown',
      model: 'Legacy',
      tonnage,
      unitType: legacy.unitType,
      techBase: 'Inner Sphere',
      walkMP,
      engineRating: tonnage * walkMP,
      runMP: Math.floor(walkMP * 1.5),
      engineType: legacy.engineType,
      gyroType: { type: legacy.gyroType.type, techBase: 'Inner Sphere' },
      structureType: { type: 'Standard', techBase: 'Inner Sphere' },
      armorType: { type: 'Standard', techBase: 'Inner Sphere' },
      // Default armor allocation (minimal)
      armorAllocation: {
        HD: { front: 0, rear: 0 },
        CT: { front: 0, rear: 0 },
        LT: { front: 0, rear: 0 },
        RT: { front: 0, rear: 0 },
        LA: { front: 0, rear: 0 },
        RA: { front: 0, rear: 0 },
        LL: { front: 0, rear: 0 },
        RL: { front: 0, rear: 0 }
      },
      armorTonnage: 0,
      jumpMP: 0,
      jumpJetType: { type: 'None', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      heatSinkType: { type: 'Single', techBase: 'Inner Sphere' },
      totalHeatSinks: 10,
      internalHeatSinks: this.calculateInternalHeatSinksForEngine(tonnage * walkMP, legacy.engineType),
      externalHeatSinks: 0,
      enhancements: [],
      mass: tonnage
    })
  }
  
  /**
   * Get default configuration values
   */
  private static getDefaultConfiguration(): UnitConfiguration {
    return {
      chassis: 'Custom',
      model: 'Default',
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard',
      gyroType: { type: 'Standard', techBase: 'Inner Sphere' },
      structureType: { type: 'Standard', techBase: 'Inner Sphere' },
      armorType: { type: 'Standard', techBase: 'Inner Sphere' },
      armorAllocation: {
        HD: { front: 0, rear: 0 },
        CT: { front: 0, rear: 0 },
        LT: { front: 0, rear: 0 },
        RT: { front: 0, rear: 0 },
        LA: { front: 0, rear: 0 },
        RA: { front: 0, rear: 0 },
        LL: { front: 0, rear: 0 },
        RL: { front: 0, rear: 0 }
      },
      armorTonnage: 0,
      jumpMP: 0,
      jumpJetType: { type: 'None', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      heatSinkType: { type: 'Single', techBase: 'Inner Sphere' },
      totalHeatSinks: 10,
      internalHeatSinks: 8, // 200 rating ÷ 25 = 8 heat sinks
      externalHeatSinks: 2, // 10 total - 8 internal = 2 external
      enhancements: [],
      mass: 50
    }
  }
  
  /**
   * Calculate dependent values based on primary configuration
   */
  private static calculateDependentValues(config: UnitConfiguration): UnitConfiguration {
    // Calculate engine rating if not provided
    if (!config.engineRating) {
      config.engineRating = config.tonnage * config.walkMP
    }
    
    // Calculate run MP if not provided
    if (!config.runMP) {
      config.runMP = Math.floor(config.walkMP * 1.5)
    }
    
    // Always recalculate internal heat sinks unless explicitly set in the input object
    if (!Object.prototype.hasOwnProperty.call(config, 'internalHeatSinks')) {
      config.internalHeatSinks = this.calculateInternalHeatSinksForEngine(config.engineRating, config.engineType)
    }
    // Only recalculate external heat sinks if not explicitly set in the input
    if (!Object.prototype.hasOwnProperty.call(config, 'externalHeatSinks')) {
      config.externalHeatSinks = Math.max(0, config.totalHeatSinks - config.internalHeatSinks)
    }
    // Set mass alias
    config.mass = config.tonnage
    
    return config
  }
  
  /**
   * Calculate internal heat sinks based on engine rating and type
   */
  private static calculateInternalHeatSinksForEngine(engineRating: number, engineType: EngineType): number {
    // Fallback implementation if import fails
    if (typeof calculateInternalHeatSinksForEngine === 'function') {
      return calculateInternalHeatSinksForEngine(engineRating, engineType);
    }
    
    // Direct implementation as fallback
    if (engineRating <= 0) return 0;
    
    // Non-fusion engines don't provide heat sinks
    if (engineType === 'ICE' || engineType === 'Fuel Cell') {
      return 0;
    }
    
    // Compact engines cannot integrate heat sinks
    if (engineType === 'Compact') {
      return 0;
    }
    
    // Official BattleTech rule: Engine Rating ÷ 25 (rounded down), NO MINIMUM for engine heat sinks
    return Math.floor(engineRating / 25);
  }
  
  /**
   * Calculate armor values based on configuration
   */
  private static calculateArmorValues(config: UnitConfiguration): {
    totalArmorPoints: number;
    armorTonnage: number;
    maxArmorPoints: number;
  } {
    // Calculate total allocated armor points
    const totalAllocated = Object.values(config.armorAllocation).reduce((sum, location) => {
      return sum + location.front + location.rear
    }, 0)
    
    // Calculate armor tonnage based on allocated points
    const armorTonnage = totalAllocated / 16 // Standard armor is 16 points per ton
    
    // Calculate maximum possible armor points
    const maxArmorPoints = Math.floor(config.tonnage * 2) // 2 points per ton maximum
    
    return {
      totalArmorPoints: totalAllocated,
      armorTonnage,
      maxArmorPoints
    }
  }
  
  /**
   * Validate engine rating against tonnage and walk MP
   */
  static validateEngineRating(tonnage: number, walkMP: number): { isValid: boolean, maxWalkMP: number, errors: string[] } {
    const errors: string[] = []
    const engineRating = tonnage * walkMP
    const maxEngineRating = 400
    
    // Check if engine rating exceeds maximum
    if (engineRating > maxEngineRating) {
      const maxWalkMP = Math.floor(maxEngineRating / tonnage)
      errors.push(`Engine rating ${engineRating} exceeds maximum of ${maxEngineRating}. Maximum walk MP for ${tonnage} tons is ${maxWalkMP}.`)
      return {
        isValid: false,
        maxWalkMP,
        errors
      }
    }
    
    // Check if walk MP is reasonable
    if (walkMP < 1) {
      errors.push('Walk MP must be at least 1.')
    }
    
    if (walkMP > 20) {
      errors.push('Walk MP cannot exceed 20.')
    }
    
    return {
      isValid: errors.length === 0,
      maxWalkMP: Math.floor(maxEngineRating / tonnage),
      errors
    }
  }

  /**
   * Check if the input is a complete configuration or partial update
   */
  private static isCompleteConfiguration(input: Partial<UnitConfiguration> | LegacyUnitConfiguration): boolean {
    // Check for required fields that indicate a complete configuration
    const requiredFields = ['chassis', 'model', 'tonnage', 'unitType', 'techBase', 'walkMP']
    return requiredFields.every(field => field in input)
  }
} 