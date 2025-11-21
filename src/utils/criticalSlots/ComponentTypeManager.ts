/**
 * Component Type Manager
 * Handles component type extraction, validation, and utility functions
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { 
  ComponentConfiguration, 
  TechBase, 
  ComponentCategory, 
  createComponentConfiguration,
  migrateStringToComponentConfiguration,
  getComponentTypeNames
} from '../../types/componentConfiguration'
import { JumpJetType } from '../jumpJetCalculations'
import { EngineType } from './SystemComponentRules'

export class ComponentTypeManager {
  /**
   * Extract type string from ComponentConfiguration
   * @deprecated Use component.type directly instead
   */
  static extractComponentType(component: ComponentConfiguration): string {
    return component.type
  }

  /**
   * Extract tech base from ComponentConfiguration
   * @deprecated Use component.techBase directly instead
   */
  static extractTechBase(component: ComponentConfiguration): TechBase {
    return component.techBase
  }

  /**
   * Get engine type as string
   */
  static getEngineTypeString(engineType: EngineType): string {
    return engineType
  }

  /**
   * Get gyro type as string
   */
  static getGyroTypeString(gyroType: ComponentConfiguration): string {
    return gyroType.type
  }

  /**
   * Get structure type as string
   */
  static getStructureTypeString(structureType: ComponentConfiguration): string {
    return structureType.type
  }

  /**
   * Get armor type as string
   */
  static getArmorTypeString(armorType: ComponentConfiguration): string {
    return armorType.type
  }

  /**
   * Get heat sink type as string
   */
  static getHeatSinkTypeString(heatSinkType: ComponentConfiguration): string {
    return heatSinkType.type
  }

  /**
   * Get jump jet type as string
   */
  static getJumpJetTypeString(jumpJetType: ComponentConfiguration): string {
    return jumpJetType.type
  }

  /**
   * Create component configuration from string (legacy support)
   */
  static createFromString(
    category: ComponentCategory,
    type: string
  ): ComponentConfiguration | null {
    return createComponentConfiguration(category, type)
  }

  /**
   * Migrate legacy string component to new format
   */
  static migrateLegacyComponent(
    category: ComponentCategory,
    legacyComponent: string, 
    fallbackTechBase: TechBase = 'Inner Sphere'
  ): ComponentConfiguration {
    return migrateStringToComponentConfiguration(category, legacyComponent, fallbackTechBase)
  }

  /**
   * Validate component configuration
   */
  static validateComponentConfiguration(
    category: ComponentCategory,
    config: ComponentConfiguration
  ): boolean {
    const availableTypes = getComponentTypeNames(category, config.techBase)
    return availableTypes.includes(config.type)
  }

  /**
   * Get available component types for category and tech base
   */
  static getAvailableTypes(category: ComponentCategory, techBase: TechBase): string[] {
    return getComponentTypeNames(category, techBase)
  }
} 