/**
 * Component Validation Manager
 * Handles validation of engine, gyro, cockpit, and other core components
 * Extracted from ConstructionRulesValidator.ts for better organization
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'
import { ComponentConfiguration } from '../../types/componentConfiguration'
import { calculateGyroWeight } from '../../types/systemComponents';
import { GyroType } from '../../types/systemComponents';

export interface EngineValidation {
  isValid: boolean
  engineType: string
  engineRating: number
  engineWeight: number
  walkMP: number
  maxRating: number
  minRating: number
  violations: EngineViolation[]
  recommendations: string[]
}

export interface EngineViolation {
  type: 'invalid_rating' | 'weight_mismatch' | 'type_incompatible' | 'movement_calculation_error'
  message: string
  severity: 'critical' | 'major' | 'minor'
  suggestedFix: string
}

export interface GyroValidation {
  isValid: boolean
  gyroType: string
  gyroWeight: number
  engineCompatible: boolean
  violations: GyroViolation[]
  recommendations: string[]
}

export interface GyroViolation {
  type: 'invalid_type' | 'weight_mismatch' | 'engine_incompatible'
  message: string
  severity: 'critical' | 'major' | 'minor'
  suggestedFix: string
}

export interface CockpitValidation {
  isValid: boolean
  cockpitType: string
  cockpitWeight: number
  violations: CockpitViolation[]
  recommendations: string[]
}

export interface CockpitViolation {
  type: 'invalid_type' | 'weight_mismatch' | 'era_incompatible'
  message: string
  severity: 'critical' | 'major' | 'minor'
  suggestedFix: string
}

export interface StructureValidation {
  isValid: boolean
  structureType: string
  structureWeight: number
  internalStructure: number
  violations: StructureViolation[]
  recommendations: string[]
}

export interface StructureViolation {
  type: 'invalid_type' | 'weight_mismatch' | 'tonnage_incompatible'
  message: string
  severity: 'critical' | 'major' | 'minor'
  suggestedFix: string
}

export interface ArmorValidation {
  isValid: boolean
  totalArmor: number
  maxArmor: number
  armorType: string
  armorWeight: number
  locationLimits: { [location: string]: ArmorLocationValidation }
  violations: ArmorViolation[]
  recommendations: string[]
}

export interface ArmorLocationValidation {
  location: string
  armor: number
  maxArmor: number
  isValid: boolean
  violations: string[]
}

export interface ArmorViolation {
  type: 'exceeds_maximum' | 'invalid_type' | 'weight_mismatch' | 'location_violation'
  location?: string
  message: string
  severity: 'critical' | 'major' | 'minor'
  suggestedFix: string
}

export class ComponentValidationManager {
  /**
   * Validate engine rules and calculations
   */
  validateEngineRules(config: UnitConfiguration): EngineValidation {
    const violations: EngineViolation[] = []
    const recommendations: string[] = []
    
    const engineRating = config.engineRating || 0
    const tonnage = config.tonnage || 100
    const engineType = this.extractComponentType(config.engineType)
    
    // Calculate expected values
    const expectedRating = tonnage * (config.walkMP || 0)
    const walkMP = Math.floor(engineRating / tonnage)
    const maxRating = 400
    const minRating = 10
    
    // Check engine rating limits
    if (engineRating > maxRating) {
      violations.push({
        type: 'invalid_rating',
        message: `Engine rating ${engineRating} exceeds maximum of ${maxRating}`,
        severity: 'critical',
        suggestedFix: `Reduce engine rating to ${maxRating} or less`
      })
    }
    
    if (engineRating < minRating) {
      violations.push({
        type: 'invalid_rating',
        message: `Engine rating ${engineRating} is below minimum of ${minRating}`,
        severity: 'critical',
        suggestedFix: `Increase engine rating to at least ${minRating}`
      })
    }
    
    // Check if engine rating matches movement
    if (Math.abs(engineRating - expectedRating) > 1) {
      violations.push({
        type: 'movement_calculation_error',
        message: `Engine rating ${engineRating} does not match expected ${expectedRating} for ${config.walkMP} walk MP`,
        severity: 'major',
        suggestedFix: 'Adjust engine rating to match movement or vice versa'
      })
    }
    
    // Calculate engine weight
    const engineWeight = this.calculateEngineWeight(engineRating, engineType)
    
    // Check for valid engine type
    if (!this.isValidEngineType(engineType)) {
      violations.push({
        type: 'type_incompatible',
        message: `Invalid engine type: ${engineType}`,
        severity: 'critical',
        suggestedFix: 'Use valid engine type (Standard, XL, Light, etc.)'
      })
    }
    
    // Generate recommendations
    if (walkMP < 3) {
      recommendations.push('Very low mobility - consider increasing engine rating')
    }
    
    if (engineRating > 300) {
      recommendations.push('Large engine detected - consider weight-saving alternatives')
    }
    
    return {
      isValid: violations.length === 0,
      engineType,
      engineRating,
      engineWeight,
      walkMP,
      maxRating,
      minRating,
      violations,
      recommendations
    }
  }
  
  /**
   * Validate gyro rules and compatibility
   */
  validateGyroRules(config: UnitConfiguration): GyroValidation {
    const violations: GyroViolation[] = []
    const recommendations: string[] = []
    
    const engineRating = config.engineRating || 0
    const gyroType = this.extractComponentType(config.gyroType)
    
    // Calculate gyro weight
    const gyroWeight = this.calculateGyroWeight(engineRating, gyroType)
    
    // Check engine compatibility
    const engineCompatible = this.isGyroEngineCompatible(gyroType, this.extractComponentType(config.engineType))
    
    if (!engineCompatible) {
      violations.push({
        type: 'engine_incompatible',
        message: `${gyroType} is not compatible with ${this.extractComponentType(config.engineType)} engine`,
        severity: 'critical',
        suggestedFix: 'Use compatible gyro type for engine'
      })
    }
    
    // Check for valid gyro type
    if (!this.isValidGyroType(gyroType)) {
      violations.push({
        type: 'invalid_type',
        message: `Invalid gyro type: ${gyroType}`,
        severity: 'critical',
        suggestedFix: 'Use valid gyro type (Standard, XL, Compact, etc.)'
      })
    }
    
    // Check weight calculations
    const expectedWeight = this.calculateGyroWeight(engineRating, gyroType)
    if (Math.abs(gyroWeight - expectedWeight) > 0.1) {
      violations.push({
        type: 'weight_mismatch',
        message: `Gyro weight calculation error: expected ${expectedWeight}, got ${gyroWeight}`,
        severity: 'major',
        suggestedFix: 'Recalculate gyro weight based on engine rating and type'
      })
    }
    
    return {
      isValid: violations.length === 0,
      gyroType,
      gyroWeight,
      engineCompatible,
      violations,
      recommendations
    }
  }
  
  /**
   * Validate cockpit rules and restrictions
   */
  validateCockpitRules(config: UnitConfiguration): CockpitValidation {
    const violations: CockpitViolation[] = []
    const recommendations: string[] = []
    
    const cockpitType = this.extractComponentType(config.structureType) // Assuming cockpit type is stored in structureType for now
    const cockpitWeight = this.calculateCockpitWeight(cockpitType)
    
    // Check for valid cockpit type
    if (!this.isValidCockpitType(cockpitType)) {
      violations.push({
        type: 'invalid_type',
        message: `Invalid cockpit type: ${cockpitType}`,
        severity: 'critical',
        suggestedFix: 'Use valid cockpit type (Standard, Small, Command Console, etc.)'
      })
    }
    
    // Check weight calculations
    const expectedWeight = this.calculateCockpitWeight(cockpitType)
    if (Math.abs(cockpitWeight - expectedWeight) > 0.1) {
      violations.push({
        type: 'weight_mismatch',
        message: `Cockpit weight calculation error: expected ${expectedWeight}, got ${cockpitWeight}`,
        severity: 'major',
        suggestedFix: 'Recalculate cockpit weight based on type'
      })
    }
    
    return {
      isValid: violations.length === 0,
      cockpitType,
      cockpitWeight,
      violations,
      recommendations
    }
  }
  
  /**
   * Validate structure rules and compatibility
   */
  validateStructureRules(config: UnitConfiguration): StructureValidation {
    const violations: StructureViolation[] = []
    const recommendations: string[] = []
    
    const tonnage = config.tonnage || 100
    const structureType = this.extractComponentType(config.structureType)
    
    // Calculate structure weight and internal structure points
    const structureWeight = this.calculateStructureWeight(tonnage, structureType)
    const internalStructure = this.calculateInternalStructure(tonnage)
    
    // Check for valid structure type
    if (!this.isValidStructureType(structureType)) {
      violations.push({
        type: 'invalid_type',
        message: `Invalid structure type: ${structureType}`,
        severity: 'critical',
        suggestedFix: 'Use valid structure type (Standard, Endo Steel, Composite, etc.)'
      })
    }
    
    // Check weight calculations
    const expectedWeight = this.calculateStructureWeight(tonnage, structureType)
    if (Math.abs(structureWeight - expectedWeight) > 0.1) {
      violations.push({
        type: 'weight_mismatch',
        message: `Structure weight calculation error: expected ${expectedWeight}, got ${structureWeight}`,
        severity: 'major',
        suggestedFix: 'Recalculate structure weight based on tonnage and type'
      })
    }
    
    // Check tonnage compatibility
    if (structureType === 'Endo Steel' && tonnage < 20) {
      violations.push({
        type: 'tonnage_incompatible',
        message: 'Endo Steel structure requires minimum 20 tons',
        severity: 'critical',
        suggestedFix: 'Use standard structure for units under 20 tons'
      })
    }
    
    return {
      isValid: violations.length === 0,
      structureType,
      structureWeight,
      internalStructure,
      violations,
      recommendations
    }
  }
  
  /**
   * Validate armor rules and allocation
   */
  validateArmorRules(config: UnitConfiguration): ArmorValidation {
    const violations: ArmorViolation[] = []
    const recommendations: string[] = []
    
    const tonnage = config.tonnage || 100
    const armorType = this.extractComponentType(config.armorType)
    
    // Calculate maximum armor
    const maxArmor = this.calculateMaxArmor(tonnage)
    const totalArmor = this.calculateTotalArmorFromAllocation(config.armorAllocation)
    const armorWeight = this.calculateArmorWeight(totalArmor, armorType)
    
    // Check armor type validity
    if (!this.isValidArmorType(armorType)) {
      violations.push({
        type: 'invalid_type',
        message: `Invalid armor type: ${armorType}`,
        severity: 'critical',
        suggestedFix: 'Use valid armor type (Standard, Ferro-Fibrous, etc.)'
      })
    }
    
    // Check total armor limits
    if (totalArmor > maxArmor) {
      violations.push({
        type: 'exceeds_maximum',
        message: `Total armor ${totalArmor} exceeds maximum ${maxArmor}`,
        severity: 'critical',
        suggestedFix: `Reduce total armor to ${maxArmor} or less`
      })
    }
    
    // Check location-specific limits
    const locationLimits: { [location: string]: ArmorLocationValidation } = {}
    const locations = ['HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL']
    
    locations.forEach(location => {
      const locationArmor = this.getLocationArmor(config.armorAllocation, location)
      const maxLocationArmor = this.getMaxLocationArmor(location, tonnage)
      
      locationLimits[location] = {
        location,
        armor: locationArmor,
        maxArmor: maxLocationArmor,
        isValid: locationArmor <= maxLocationArmor,
        violations: []
      }
      
      if (locationArmor > maxLocationArmor) {
        locationLimits[location].violations.push(`Exceeds maximum ${maxLocationArmor}`)
        violations.push({
          type: 'location_violation',
          location,
          message: `${location} armor ${locationArmor} exceeds maximum ${maxLocationArmor}`,
          severity: 'critical',
          suggestedFix: `Reduce ${location} armor to ${maxLocationArmor} or less`
        })
      }
    })
    
    return {
      isValid: violations.length === 0,
      totalArmor,
      maxArmor,
      armorType,
      armorWeight,
      locationLimits,
      violations,
      recommendations
    }
  }
  
  /**
   * Calculate engine weight based on rating and type
   */
  private calculateEngineWeight(engineRating: number, engineType: string): number {
    let baseWeight = engineRating / 75
    
    // Adjust for engine type
    switch (engineType) {
      case 'XL Engine':
        baseWeight *= 0.5
        break
      case 'Light Engine':
        baseWeight *= 0.75
        break
      case 'Compact Engine':
        baseWeight *= 1.5
        break
      case 'Standard Engine':
      default:
        // No adjustment
        break
    }
    
    return Math.ceil(baseWeight * 10) / 10 // Round to nearest 0.1
  }
  
  /**
   * Calculate gyro weight based on engine rating and type
   */
  private calculateGyroWeight(engineRating: number, gyroType: string): number {
    // Validate gyro type and provide safe fallback
    const validGyroTypes: GyroType[] = ['Standard', 'Compact', 'Heavy-Duty', 'XL'];
    const safeGyroType = validGyroTypes.includes(gyroType as GyroType) 
      ? gyroType as GyroType 
      : 'Standard';
    
    return calculateGyroWeight(engineRating, safeGyroType);
  }
  
  /**
   * Calculate cockpit weight based on type
   */
  private calculateCockpitWeight(cockpitType: string): number {
    switch (cockpitType) {
      case 'Small Cockpit':
        return 2.0
      case 'Torso-Mounted Cockpit':
        return 4.0
      case 'Command Console':
        return 6.0
      case 'Standard Cockpit':
      default:
        return 3.0
    }
  }
  
  /**
   * Calculate structure weight based on tonnage and type
   */
  private calculateStructureWeight(tonnage: number, structureType: string): number {
    let baseWeight = tonnage * 0.1
    
    // Adjust for structure type
    switch (structureType) {
      case 'Endo Steel':
        baseWeight *= 0.5
        break
      case 'Composite':
        baseWeight *= 0.5
        break
      case 'Reinforced':
        baseWeight *= 1.5
        break
      case 'Standard':
      default:
        // No adjustment
        break
    }
    
    return Math.ceil(baseWeight * 10) / 10 // Round to nearest 0.1
  }
  
  /**
   * Calculate internal structure points
   */
  private calculateInternalStructure(tonnage: number): number {
    return Math.ceil(tonnage / 10)
  }
  
  /**
   * Calculate maximum armor points
   */
  private calculateMaxArmor(tonnage: number): number {
    return tonnage * 2
  }
  
  /**
   * Calculate armor weight based on total armor and type
   */
  private calculateArmorWeight(totalArmor: number, armorType: string): number {
    let baseWeight = totalArmor / 16
    
    // Adjust for armor type
    switch (armorType) {
      case 'Ferro-Fibrous':
        baseWeight *= 0.84
        break
      case 'Light Ferro-Fibrous':
        baseWeight *= 0.94
        break
      case 'Heavy Ferro-Fibrous':
        baseWeight *= 1.12
        break
      case 'Standard':
      default:
        // No adjustment
        break
    }
    
    return Math.ceil(baseWeight * 10) / 10 // Round to nearest 0.1
  }
  
  /**
   * Calculate total armor from allocation
   */
  private calculateTotalArmorFromAllocation(armorAllocation: any): number {
    if (!armorAllocation) return 0
    
    let total = 0
    Object.values(armorAllocation).forEach((location: any) => {
      if (location && typeof location === 'object') {
        total += (location.front || 0) + (location.rear || 0)
      }
    })
    
    return total
  }
  
  /**
   * Get armor for specific location
   */
  private getLocationArmor(armorAllocation: any, location: string): number {
    if (!armorAllocation || !armorAllocation[location]) return 0
    
    const locationData = armorAllocation[location]
    return (locationData.front || 0) + (locationData.rear || 0)
  }
  
  /**
   * Get maximum armor for specific location
   */
  private getMaxLocationArmor(location: string, tonnage: number): number {
    switch (location) {
      case 'HD':
        return 9
      case 'CT':
        return Math.ceil(tonnage * 0.3)
      case 'LT':
      case 'RT':
        return Math.ceil(tonnage * 0.25)
      case 'LA':
      case 'RA':
        return Math.ceil(tonnage * 0.2)
      case 'LL':
      case 'RL':
        return Math.ceil(tonnage * 0.25)
      default:
        return Math.ceil(tonnage * 0.2)
    }
  }
  
  /**
   * Check if engine type is valid
   */
  private isValidEngineType(engineType: string): boolean {
    const validTypes = [
      'Standard Engine',
      'XL Engine',
      'Light Engine',
      'Compact Engine',
      'Fusion Engine',
      'Fission Engine'
    ]
    return validTypes.includes(engineType)
  }
  
  /**
   * Check if gyro type is valid
   */
  private isValidGyroType(gyroType: string): boolean {
    const validTypes = [
      'Standard Gyro',
      'XL Gyro',
      'Compact Gyro'
    ]
    return validTypes.includes(gyroType)
  }
  
  /**
   * Check if cockpit type is valid
   */
  private isValidCockpitType(cockpitType: string): boolean {
    const validTypes = [
      'Standard Cockpit',
      'Small Cockpit',
      'Torso-Mounted Cockpit',
      'Command Console'
    ]
    return validTypes.includes(cockpitType)
  }
  
  /**
   * Check if structure type is valid
   */
  private isValidStructureType(structureType: string): boolean {
    const validTypes = [
      'Standard',
      'Endo Steel',
      'Composite',
      'Reinforced',
      'Industrial'
    ]
    return validTypes.includes(structureType)
  }
  
  /**
   * Check if armor type is valid
   */
  private isValidArmorType(armorType: string): boolean {
    const validTypes = [
      'Standard',
      'Ferro-Fibrous',
      'Light Ferro-Fibrous',
      'Heavy Ferro-Fibrous',
      'Stealth',
      'Reactive',
      'Reflective',
      'Hardened'
    ]
    return validTypes.includes(armorType)
  }
  
  /**
   * Check gyro-engine compatibility
   */
  private isGyroEngineCompatible(gyroType: string, engineType?: string): boolean {
    // Most gyros are compatible with most engines
    // Add specific compatibility rules here if needed
    return true
  }
  
  /**
   * Extract component type from ComponentConfiguration or string (migration support)
   */
  private extractComponentType(component: ComponentConfiguration | string): string {
    return typeof component === 'string' ? component : component.type
  }
} 




