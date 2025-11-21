/**
 * Component Update Service
 * 
 * Responsible for handling all component type changes in a clean, testable way.
 * This service encapsulates the business logic for updating individual components
 * without side effects, making it easy to test and reason about.
 */

import { ComponentConfiguration } from '../types/componentConfiguration'
import { UnitConfiguration } from '../utils/criticalSlots/UnitCriticalManagerTypes'
import { EngineType } from '../utils/criticalSlots/SystemComponentRules'

export interface ComponentUpdateResult {
  success: boolean
  newConfiguration: UnitConfiguration
  changes: {
    structureChanged: boolean
    armorChanged: boolean
    engineChanged: boolean
    gyroChanged: boolean
    heatSinkChanged: boolean
    jumpJetChanged: boolean
  }
  errors: string[]
  warnings: string[]
}

export interface ComponentUpdateRequest {
  componentType: 'structure' | 'armor' | 'engine' | 'gyro' | 'heatSink' | 'jumpJet'
  newValue: ComponentConfiguration | string
  currentConfiguration: UnitConfiguration
}

export class ComponentUpdateService {
  /**
   * Update a single component type while preserving all other configuration
   */
  static updateComponent(request: ComponentUpdateRequest): ComponentUpdateResult {
    const { componentType, newValue, currentConfiguration } = request
    
    console.log(`[ComponentUpdateService] Updating ${componentType}:`, {
      currentValue: this.getComponentValue(currentConfiguration, componentType),
      newValue,
      componentType
    })
    
    // Create new configuration with only the specified component updated
    const newConfiguration = { ...currentConfiguration }
    
    // Update the specific component
    switch (componentType) {
      case 'structure':
        newConfiguration.structureType = this.normalizeComponentValue(newValue, currentConfiguration.techBase) as any
        break
      case 'armor':
        newConfiguration.armorType = this.normalizeComponentValue(newValue, currentConfiguration.techBase) as any
        break
      case 'engine':
        newConfiguration.engineType = (typeof newValue === 'string' ? newValue : newValue.type) as EngineType
        break
      case 'gyro':
        newConfiguration.gyroType = this.normalizeComponentValue(newValue, currentConfiguration.techBase) as any
        break
      case 'heatSink':
        newConfiguration.heatSinkType = this.normalizeComponentValue(newValue, currentConfiguration.techBase) as any
        break
      case 'jumpJet':
        newConfiguration.jumpJetType = this.normalizeComponentValue(newValue, currentConfiguration.techBase) as any
        break
      default:
        return {
          success: false,
          newConfiguration: currentConfiguration,
          changes: this.getEmptyChanges(),
          errors: [`Unknown component type: ${componentType}`],
          warnings: []
        }
    }
    
    // Detect what changed
    const changes = this.detectChanges(currentConfiguration, newConfiguration)
    
    // Validate the new configuration
    const validation = this.validateConfiguration(newConfiguration)
    
    console.log(`[ComponentUpdateService] Update result:`, {
      success: validation.isValid,
      changes,
      errors: validation.errors,
      warnings: validation.warnings
    })
    
    return {
      success: validation.isValid,
      newConfiguration,
      changes,
      errors: validation.errors,
      warnings: validation.warnings
    }
  }
  
  /**
   * Get the current value of a component from configuration
   */
  private static getComponentValue(config: UnitConfiguration, componentType: string): any {
    switch (componentType) {
      case 'structure': return config.structureType
      case 'armor': return config.armorType
      case 'engine': return config.engineType
      case 'gyro': return config.gyroType
      case 'heatSink': return config.heatSinkType
      case 'jumpJet': return config.jumpJetType
      default: return undefined
    }
  }
  
  /**
   * Normalize component value to ComponentConfiguration format
   */
  private static normalizeComponentValue(value: ComponentConfiguration | string, techBase: string): ComponentConfiguration {
    if (typeof value === 'string') {
      return { type: value, techBase: techBase as 'Inner Sphere' | 'Clan' }
    }
    return value
  }
  
  /**
   * Detect what components changed between configurations
   */
  private static detectChanges(oldConfig: UnitConfiguration, newConfig: UnitConfiguration) {
    return {
      structureChanged: this.hasComponentChanged(oldConfig.structureType, newConfig.structureType),
      armorChanged: this.hasComponentChanged(oldConfig.armorType, newConfig.armorType),
      engineChanged: oldConfig.engineType !== newConfig.engineType,
      gyroChanged: this.hasComponentChanged(oldConfig.gyroType, newConfig.gyroType),
      heatSinkChanged: this.hasComponentChanged(oldConfig.heatSinkType, newConfig.heatSinkType),
      jumpJetChanged: this.hasComponentChanged(oldConfig.jumpJetType, newConfig.jumpJetType)
    }
  }
  
  /**
   * Check if a component has changed
   */
  private static hasComponentChanged(oldValue: any, newValue: any): boolean {
    if (typeof oldValue === 'string' && typeof newValue === 'string') {
      return oldValue !== newValue
    }
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      return oldValue.type !== newValue.type || oldValue.techBase !== newValue.techBase
    }
    return oldValue !== newValue
  }
  
  /**
   * Validate configuration for basic rules
   */
  private static validateConfiguration(config: UnitConfiguration): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Basic validation rules
    if (config.tonnage < 20 || config.tonnage > 100) {
      errors.push(`Invalid tonnage: ${config.tonnage}. Must be between 20-100 tons.`)
    }
    
    if (config.walkMP < 1 || config.walkMP > 20) {
      errors.push(`Invalid walk MP: ${config.walkMP}. Must be between 1-20.`)
    }
    
    if (config.totalHeatSinks < 10) {
      errors.push(`Invalid heat sinks: ${config.totalHeatSinks}. Must be at least 10.`)
    }
    
    // Component-specific validation
    if (config.structureType && (typeof config.structureType === 'object' ? (config.structureType as any).type === 'Endo Steel' : config.structureType === 'Endo Steel') && config.techBase === 'Clan') {
      warnings.push('Clan Endo Steel detected - will be converted to Endo Steel (Clan)')
    }
    
    if (config.armorType && (typeof config.armorType === 'object' ? (config.armorType as any).type === 'Ferro-Fibrous' : config.armorType === 'Ferro-Fibrous') && config.techBase === 'Clan') {
      warnings.push('Clan Ferro-Fibrous detected - will be converted to Ferro-Fibrous (Clan)')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Get empty changes object
   */
  private static getEmptyChanges() {
    return {
      structureChanged: false,
      armorChanged: false,
      engineChanged: false,
      gyroChanged: false,
      heatSinkChanged: false,
      jumpJetChanged: false
    }
  }
} 




