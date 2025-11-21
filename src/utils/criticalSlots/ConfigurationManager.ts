/**
 * Configuration Manager
 * Handles unit configuration updates, validation, and construction rule enforcement
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { UnitConfiguration, LegacyUnitConfiguration } from './UnitCriticalManagerTypes'
import { UnitConfigurationBuilder } from './UnitConfigurationBuilder'
import { SystemComponentRules } from './SystemComponentRules'
import { getInternalStructurePoints } from '../internalStructureTable'
import { ComponentConfiguration } from '../../types/componentConfiguration'

export interface ConfigurationChangeResult {
  success: boolean
  oldConfiguration: UnitConfiguration
  newConfiguration: UnitConfiguration
  changes: {
    tonnageChanged: boolean
    engineChanged: boolean
    gyroChanged: boolean
    structureChanged: boolean
    armorChanged: boolean
    heatSinksChanged: boolean
    jumpJetsChanged: boolean
  }
  validation: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

export class ConfigurationManager {
  private configuration: UnitConfiguration
  private armorManagementManager: any

  constructor(initialConfiguration: UnitConfiguration | LegacyUnitConfiguration) {
    this.configuration = UnitConfigurationBuilder.buildConfiguration(initialConfiguration)
    // Initialize ArmorManagementManager for armor validation
    const { ArmorManagementManager } = require('./ArmorManagementManager')
    this.armorManagementManager = new ArmorManagementManager(this.configuration)
  }

  /**
   * Extract type string from ComponentConfiguration or return string as-is
   */
  private static extractComponentType(component: ComponentConfiguration | string | undefined): string {
    if (!component) {
      return 'Standard' // Default fallback
    }
    if (typeof component === 'string') {
      return component
    }
    return component.type || 'Standard' // Fallback if type is missing
  }

  /**
   * Update unit configuration and handle all related changes
   */
  updateConfiguration(newConfiguration: UnitConfiguration): ConfigurationChangeResult {
    const oldConfig = this.configuration
    
    console.log('[CONFIG_DEBUG] 🔧 ConfigurationManager.updateConfiguration called with:', {
      oldStructureType: oldConfig.structureType,
      newStructureType: newConfiguration.structureType,
      oldArmorType: oldConfig.armorType,
      newArmorType: newConfiguration.armorType,
      oldTechBase: oldConfig.techBase,
      newTechBase: newConfiguration.techBase
    })
    
    // Detect what changed
    const changes = this.detectConfigurationChanges(oldConfig, newConfiguration)
    
    console.log('[CONFIG_DEBUG] 🔧 Detected changes:', changes)
    
    // Force engine rating recalculation if tonnage or walkMP changed
    const shouldRecalculateEngineRating = 
      newConfiguration.tonnage !== oldConfig.tonnage || 
      newConfiguration.walkMP !== oldConfig.walkMP
    
    const configForBuilder = shouldRecalculateEngineRating 
      ? { ...newConfiguration, engineRating: undefined }
      : newConfiguration
    
    console.log('[CONFIG_DEBUG] 🔧 configForBuilder before buildConfiguration:', {
      structureType: configForBuilder.structureType,
      armorType: configForBuilder.armorType,
      techBase: configForBuilder.techBase,
      hasEngineRating: 'engineRating' in configForBuilder
    })
    
    let validatedConfig = UnitConfigurationBuilder.buildConfiguration(configForBuilder)
    
    console.log('[CONFIG_DEBUG] 🔧 validatedConfig after buildConfiguration:', {
      structureType: validatedConfig.structureType,
      armorType: validatedConfig.armorType,
      techBase: validatedConfig.techBase
    })
    
    // Enforce BattleTech construction rules
    validatedConfig = this.enforceConstructionRules(validatedConfig)
    
    // Validate the configuration
    const validation = this.validateConfiguration(validatedConfig)
    
    // Update internal configuration
    this.configuration = validatedConfig
    
    return {
      success: validation.isValid,
      oldConfiguration: oldConfig,
      newConfiguration: validatedConfig,
      changes,
      validation
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): UnitConfiguration {
    return { ...this.configuration }
  }

  /**
   * Reset to base configuration
   */
  resetToBaseConfiguration(): UnitConfiguration {
    const baseConfig = UnitConfigurationBuilder.buildConfiguration({
      tonnage: this.configuration.tonnage,
      unitType: this.configuration.unitType,
      techBase: this.configuration.techBase
    })
    
    this.configuration = baseConfig
    return baseConfig
  }

  /**
   * Enforce BattleTech construction rules
   */
  private enforceConstructionRules(config: UnitConfiguration): UnitConfiguration {
    const enforced = { ...config }
    
    // Update ArmorManagementManager with new configuration
    this.armorManagementManager.updateConfiguration(enforced)
    
    // Use ArmorManagementManager to enforce armor rules
    enforced.armorAllocation = this.armorManagementManager.enforceArmorRules(enforced.armorAllocation)
    
    // Enforce minimum TOTAL heat sinks (10 for BattleMechs) - different from engine heat sinks
    if (enforced.unitType === 'BattleMech' && enforced.totalHeatSinks < 10) {
      enforced.totalHeatSinks = 10
      enforced.internalHeatSinks = Math.min(10, enforced.internalHeatSinks)
      enforced.externalHeatSinks = Math.max(0, 10 - enforced.internalHeatSinks)
    }
    
    return enforced
  }

  /**
   * Detect what configuration properties changed
   */
  private detectConfigurationChanges(oldConfig: UnitConfiguration, newConfig: UnitConfiguration) {
    // Helper function to compare ComponentConfiguration objects or strings
    const compareComponent = (oldComp: any, newComp: any): boolean => {
      const oldType = ConfigurationManager.extractComponentType(oldComp)
      const newType = ConfigurationManager.extractComponentType(newComp)
      return oldType !== newType
    }
    
    return {
      tonnageChanged: oldConfig.tonnage !== newConfig.tonnage,
      engineChanged: oldConfig.engineType !== newConfig.engineType || oldConfig.engineRating !== newConfig.engineRating,
      gyroChanged: compareComponent(oldConfig.gyroType, newConfig.gyroType),
      structureChanged: compareComponent(oldConfig.structureType, newConfig.structureType),
      armorChanged: compareComponent(oldConfig.armorType, newConfig.armorType),
      heatSinksChanged: compareComponent(oldConfig.heatSinkType, newConfig.heatSinkType) || 
                       oldConfig.totalHeatSinks !== newConfig.totalHeatSinks,
      jumpJetsChanged: oldConfig.jumpMP !== newConfig.jumpMP || 
                      compareComponent(oldConfig.jumpJetType, newConfig.jumpJetType)
    }
  }

  /**
   * Validate configuration for construction rule compliance
   */
  private validateConfiguration(config: UnitConfiguration): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Validate tonnage
    if (config.tonnage < 20 || config.tonnage > 100) {
      errors.push(`Invalid tonnage: ${config.tonnage}. Must be between 20-100 tons.`)
    }
    
    // Validate engine rating
    const expectedEngineRating = config.tonnage * config.walkMP
    if (config.engineRating !== expectedEngineRating) {
      errors.push(`Engine rating ${config.engineRating} doesn't match tonnage × walk MP (${expectedEngineRating})`)
    }
    
    // Validate heat sinks
    if (config.unitType === 'BattleMech' && config.totalHeatSinks < 10) {
      errors.push('BattleMechs must have at least 10 heat sinks')
    }
    
    // Validate armor allocation
    const structurePoints = getInternalStructurePoints(config.tonnage)
    Object.entries(config.armorAllocation).forEach(([location, armor]) => {
      const maxArmor = location === 'HD' ? 9 : structurePoints[location as keyof typeof structurePoints] * 2
      if (armor.front > maxArmor) {
        errors.push(`${location} front armor (${armor.front}) exceeds maximum (${maxArmor})`)
      }
      if (armor.rear > maxArmor) {
        errors.push(`${location} rear armor (${armor.rear}) exceeds maximum (${maxArmor})`)
      }
    })
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Get maximum walk MP for current tonnage
   */
  getMaxWalkMP(): number {
    return Math.floor(500 / this.configuration.tonnage)
  }

  /**
   * Get engine type
   */
  getEngineType(): string {
    return ConfigurationManager.extractComponentType(this.configuration.engineType) || 'Standard'
  }

  /**
   * Get gyro type
   */
  getGyroType(): string {
    return ConfigurationManager.extractComponentType(this.configuration.gyroType) || 'Standard'
  }
} 