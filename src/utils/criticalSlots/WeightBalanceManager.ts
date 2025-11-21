/**
 * Weight Balance Manager
 * Handles all weight calculations, balance validation, and tonnage management
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { EquipmentAllocation } from './CriticalSlot'
import { UnitConfiguration } from './UnitCriticalManagerTypes'
import { EngineType, GyroType } from './SystemComponentRules'
import { JumpJetType } from '../jumpJetCalculations'
import { HeatSinkType, StructureType, ArmorType } from './UnitCriticalManagerTypes'
import { calculateGyroWeight } from '../../types/systemComponents'
import { ComponentConfiguration } from '../../types/componentConfiguration'

export class WeightBalanceManager {
  private configuration: UnitConfiguration
  private unallocatedEquipment: EquipmentAllocation[]

  constructor(
    configuration: UnitConfiguration,
    unallocatedEquipment: EquipmentAllocation[]
  ) {
    this.configuration = configuration
    this.unallocatedEquipment = unallocatedEquipment
  }

  /**
   * Extract type string from ComponentConfiguration or return string as-is
   */
  private static extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') {
      return component
    }
    return component.type
  }

  /**
   * Get maximum armor tonnage based on unit configuration
   */
  getMaxArmorTonnage(): number {
    const maxArmorPoints = this.getMaxArmorPoints()
    const armorType = this.getArmorTypeString()
    
    // Calculate armor weight based on type and points
    switch (armorType) {
      case 'Standard':
        return maxArmorPoints / 16
      case 'Ferro-Fibrous':
        return maxArmorPoints / 20
      case 'Ferro-Fibrous (Clan)':
        return maxArmorPoints / 20
      case 'Light Ferro-Fibrous':
        return maxArmorPoints / 18
      case 'Heavy Ferro-Fibrous':
        return maxArmorPoints / 24
      case 'Stealth':
        return maxArmorPoints / 16
      case 'Reactive':
        return maxArmorPoints / 16
      case 'Reflective':
        return maxArmorPoints / 16
      case 'Hardened':
        return maxArmorPoints / 16
      default:
        return maxArmorPoints / 16
    }
  }

  /**
   * Get physical maximum armor tonnage (before rounding)
   */
  getPhysicalMaxArmorTonnage(): number {
    const maxArmorPoints = this.getMaxArmorPoints()
    const armorType = this.getArmorTypeString()
    
    // Calculate armor weight based on type and points
    switch (armorType) {
      case 'Standard':
        return maxArmorPoints / 16
      case 'Ferro-Fibrous':
        return maxArmorPoints / 20
      case 'Ferro-Fibrous (Clan)':
        return maxArmorPoints / 20
      case 'Light Ferro-Fibrous':
        return maxArmorPoints / 18
      case 'Heavy Ferro-Fibrous':
        return maxArmorPoints / 24
      case 'Stealth':
        return maxArmorPoints / 16
      case 'Reactive':
        return maxArmorPoints / 16
      case 'Reflective':
        return maxArmorPoints / 16
      case 'Hardened':
        return maxArmorPoints / 16
      default:
        return maxArmorPoints / 16
    }
  }

  /**
   * Get maximum armor points based on unit configuration using official BattleTech rules
   */
  getMaxArmorPoints(): number {
    const tonnage = this.configuration.tonnage
    
    // Use the official BattleTech internal structure calculation
    const { getMaxArmorPoints } = require('../internalStructureTable')
    
    try {
      return getMaxArmorPoints(tonnage)
    } catch (error) {
      // Fallback for invalid tonnages or missing table data
      console.warn(`[WeightBalanceManager] Could not get max armor points for ${tonnage} tons, using fallback calculation`)
      
      // Fallback calculation for non-standard tonnages
      const baseInternalStructurePoints = Math.max(3, Math.min(8, Math.floor(tonnage / 10)))
      const headMaxArmor = 9
      const otherLocationMaxArmor = baseInternalStructurePoints * 2
      return headMaxArmor + (7 * otherLocationMaxArmor)
    }
  }

  /**
   * Get internal structure points for each location using official BattleTech rules
   */
  getInternalStructurePoints(): Record<string, number> {
    const tonnage = this.configuration.tonnage
    
    // Use the official BattleTech internal structure table
    const { getInternalStructurePoints } = require('../internalStructureTable')
    
    try {
      const structure = getInternalStructurePoints(tonnage)
      
      // Convert to the expected format with abbreviation keys
      return {
        HD: structure.HD,
        CT: structure.CT,
        LT: structure.LT,
        RT: structure.RT,
        LA: structure.LA,
        RA: structure.RA,
        LL: structure.LL,
        RL: structure.RL
      }
    } catch (error) {
      // Fallback for invalid tonnages or missing table data
      console.warn(`[WeightBalanceManager] Could not get internal structure for ${tonnage} tons, using fallback calculation`)
      
      // Fallback calculation for non-standard tonnages
      const basePoints = Math.max(3, Math.min(8, Math.floor(tonnage / 10)))
      return {
        HD: 3, // Head is always 3 internal structure points
        CT: basePoints,
        LT: basePoints,
        RT: basePoints,
        LA: basePoints,
        RA: basePoints,
        LL: basePoints,
        RL: basePoints
      }
    }
  }

  /**
   * Get armor efficiency percentage
   */
  getArmorEfficiency(): number {
    const maxArmorPoints = this.getMaxArmorPoints()
    const allocatedArmorPoints = this.getAllocatedArmorPoints()
    return maxArmorPoints > 0 ? (allocatedArmorPoints / maxArmorPoints) * 100 : 0
  }

  /**
   * Get maximum armor points for a specific location
   */
  getMaxArmorPointsForLocation(location: string): number {
    const internalStructurePoints = this.getInternalStructurePoints()[location] || 0
    return internalStructurePoints * 2
  }

  /**
   * Get maximum walk MP based on engine rating
   */
  getMaxWalkMP(): number {
    const engineRating = this.configuration.engineRating
    const tonnage = this.configuration.tonnage
    return engineRating / tonnage
  }

  /**
   * Get remaining tonnage available
   */
  getRemainingTonnage(): number {
    const usedTonnage = this.getUsedTonnage()
    return this.configuration.tonnage - usedTonnage
  }

  /**
   * Get total used tonnage
   */
  getUsedTonnage(): number {
    let totalWeight = 0

    // Engine weight
    totalWeight += this.getEngineWeight()

    // Gyro weight
    totalWeight += this.getGyroWeight()

    // Heat sink weight
    totalWeight += this.getHeatSinkTonnage()

    // Jump jet weight
    totalWeight += this.getJumpJetWeight()

    // Structure weight
    const structureType = this.getStructureTypeString()
    totalWeight += this.getStructureWeight(structureType, this.configuration.tonnage)

    // Armor weight
    const allocatedArmorPoints = this.getAllocatedArmorPoints()
    const armorType = this.getArmorTypeString()
    totalWeight += this.getArmorWeight(armorType, allocatedArmorPoints)

    // Equipment weight
    this.unallocatedEquipment.forEach(equipment => {
      totalWeight += equipment.equipmentData.weight || 0
    })

    return totalWeight
  }

  /**
   * Get engine weight
   */
  getEngineWeight(): number {
    const engineRating = this.configuration.engineRating
    const engineType = this.getEngineTypeString()
    
    // Calculate base engine weight
    const baseWeight = engineRating / 75

    // Apply engine type modifiers
    switch (engineType) {
      case 'Standard':
        return baseWeight
      case 'XL':
        return baseWeight * 0.5
      case 'Light':
        return baseWeight * 0.75
      case 'Compact':
        return baseWeight * 1.5
      case 'XXL':
        return baseWeight * 0.25
      default:
        return baseWeight
    }
  }

  /**
   * Get gyro weight
   */
  getGyroWeight(): number {
    const engineRating = this.configuration.engineRating
    const gyroType = this.getGyroTypeString()
    
    return calculateGyroWeight(engineRating, gyroType as GyroType);
  }

  /**
   * Get heat sink tonnage
   */
  getHeatSinkTonnage(): number {
    const heatSinkType = this.getHeatSinkTypeString()
    const externalHeatSinks = this.configuration.externalHeatSinks
    
    // Calculate heat sink weight
    switch (heatSinkType) {
      case 'Single':
        return externalHeatSinks * 1
      case 'Double':
        return externalHeatSinks * 1
      case 'Compact':
        return externalHeatSinks * 1.5
      default:
        return externalHeatSinks * 1
    }
  }

  /**
   * Get jump jet weight
   */
  getJumpJetWeight(): number {
    const jumpJetType = this.getJumpJetTypeString()
    const jumpMP = this.configuration.jumpMP
    const tonnage = this.configuration.tonnage
    
    // Calculate jump jet weight
    switch (jumpJetType) {
      case 'Standard Jump Jet':
        return (jumpMP * tonnage) / 100
      case 'Improved Jump Jet':
        return (jumpMP * tonnage) / 200
      case 'Partial Wing':
        return (jumpMP * tonnage) / 200
      default:
        return (jumpMP * tonnage) / 100
    }
  }

  /**
   * Get remaining tonnage available for armor
   */
  getRemainingTonnageForArmor(): number {
    const usedTonnage = this.getUsedTonnage()
    const maxArmorTonnage = this.getMaxArmorTonnage()
    const remainingTonnage = this.configuration.tonnage - usedTonnage
    
    return Math.min(remainingTonnage, maxArmorTonnage)
  }

  /**
   * Get available armor points
   */
  getAvailableArmorPoints(): number {
    const maxArmorPoints = this.getMaxArmorPoints()
    const allocatedArmorPoints = this.getAllocatedArmorPoints()
    return maxArmorPoints - allocatedArmorPoints
  }

  /**
   * Get allocated armor points
   */
  getAllocatedArmorPoints(): number {
    // This would need to be calculated from the actual armor allocation
    // For now, return a placeholder
    return 0
  }

  /**
   * Get unallocated armor points
   */
  getUnallocatedArmorPoints(): number {
    const maxArmorPoints = this.getMaxArmorPoints()
    const allocatedArmorPoints = this.getAllocatedArmorPoints()
    return Math.max(0, maxArmorPoints - allocatedArmorPoints)
  }

  /**
   * Get remaining armor points
   */
  getRemainingArmorPoints(): number {
    return this.getUnallocatedArmorPoints()
  }

  /**
   * Check if unit is overweight
   */
  isOverweight(): boolean {
    return this.getUsedTonnage() > this.configuration.tonnage
  }

  /**
   * Get weight validation results
   */
  getWeightValidation(): { isValid: boolean, overweight: number, warnings: string[] } {
    const usedTonnage = this.getUsedTonnage()
    const maxTonnage = this.configuration.tonnage
    const overweight = Math.max(0, usedTonnage - maxTonnage)
    const warnings: string[] = []

    if (overweight > 0) {
      warnings.push(`Unit is ${overweight.toFixed(2)} tons overweight`)
    }

    if (usedTonnage > maxTonnage * 0.95) {
      warnings.push('Unit is approaching weight limit')
    }

    return {
      isValid: overweight <= 0,
      overweight,
      warnings
    }
  }

  /**
   * Get structure weight
   */
  private getStructureWeight(structureType: string, tonnage: number): number {
    switch (structureType) {
      case 'Standard':
        return tonnage * 0.1
      case 'Endo Steel':
        return tonnage * 0.05
      case 'Endo Steel (Clan)':
        return tonnage * 0.05
      case 'Composite':
        return tonnage * 0.15
      case 'Reinforced':
        return tonnage * 0.2
      case 'Industrial':
        return tonnage * 0.1
      default:
        return tonnage * 0.1
    }
  }

  /**
   * Get armor weight
   */
  private getArmorWeight(armorType: string, armorPoints: number): number {
    switch (armorType) {
      case 'Standard':
        return armorPoints / 16
      case 'Ferro-Fibrous':
        return armorPoints / 20
      case 'Ferro-Fibrous (Clan)':
        return armorPoints / 20
      case 'Light Ferro-Fibrous':
        return armorPoints / 18
      case 'Heavy Ferro-Fibrous':
        return armorPoints / 24
      case 'Stealth':
        return armorPoints / 16
      case 'Reactive':
        return armorPoints / 16
      case 'Reflective':
        return armorPoints / 16
      case 'Hardened':
        return armorPoints / 16
      default:
        return armorPoints / 16
    }
  }

  /**
   * Helper methods to extract component types
   */
  private getStructureTypeString(): StructureType {
    return WeightBalanceManager.extractComponentType(this.configuration.structureType) as StructureType
  }

  private getArmorTypeString(): ArmorType {
    return WeightBalanceManager.extractComponentType(this.configuration.armorType) as ArmorType
  }

  private getEngineTypeString(): EngineType {
    return WeightBalanceManager.extractComponentType(this.configuration.engineType) as EngineType
  }

  private getGyroTypeString(): GyroType {
    return WeightBalanceManager.extractComponentType(this.configuration.gyroType) as GyroType
  }

  private getHeatSinkTypeString(): HeatSinkType {
    return WeightBalanceManager.extractComponentType(this.configuration.heatSinkType) as HeatSinkType
  }

  private getJumpJetTypeString(): JumpJetType {
    return WeightBalanceManager.extractComponentType(this.configuration.jumpJetType) as JumpJetType
  }

  /**
   * Update configuration reference
   */
  updateConfiguration(configuration: UnitConfiguration): void {
    this.configuration = configuration
  }

  /**
   * Update unallocated equipment reference
   */
  updateUnallocatedEquipment(unallocatedEquipment: EquipmentAllocation[]): void {
    this.unallocatedEquipment = unallocatedEquipment
  }
} 