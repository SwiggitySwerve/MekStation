/**
 * BattleTech Construction Calculator - Pure calculation service
 * Handles all weight, tonnage, and construction limit calculations
 * Following SOLID principles - Single Responsibility, pure functions
 */

import { UnitConfiguration, HeatSinkType, StructureType, ArmorType } from '../criticalSlots/UnitCriticalManager'
import { EngineType, GyroType } from '../criticalSlots/SystemComponentRules'
import { calculateGyroWeight } from '../../types/systemComponents';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { getInternalStructurePoints } from '../internalStructureTable';
import { ARMOR_SPECIFICATIONS } from '../armorCalculations';

export interface WeightValidationResult {
  isValid: boolean
  overweight: number
  warnings: string[]
}

export interface ArmorCalculationResult {
  availableArmorPoints: number
  allocatedArmorPoints: number
  unallocatedArmorPoints: number
  maxArmorPoints: number
  maxArmorTonnage: number
}

export interface IConstructionCalculator {
  // Core tonnage calculations
  getUsedTonnage(config: UnitConfiguration): number
  getRemainingTonnage(config: UnitConfiguration): number
  
  // Component weights
  getEngineWeight(engineType: EngineType, rating: number): number
  getGyroWeight(gyroType: GyroType, rating: number): number
  getHeatSinkTonnage(heatSinkType: HeatSinkType): number
  getJumpJetWeight(config: UnitConfiguration): number
  
  // Armor calculations
  getMaxArmorTonnage(config: UnitConfiguration): number
  getMaxArmorPoints(config: UnitConfiguration): number
  getArmorEfficiency(armorType: ArmorType): number
  getArmorCalculation(config: UnitConfiguration): ArmorCalculationResult
  
  // Validation
  validateWeight(config: UnitConfiguration): WeightValidationResult
  isOverweight(config: UnitConfiguration): boolean
  
  // Location-specific calculations
  getMaxArmorPointsForLocation(location: string, config: UnitConfiguration): number
  getInternalStructurePoints(tonnage: number): Record<string, number>
  
  // Heat calculations
  getHeatDissipation(config: UnitConfiguration): number
  getHeatGeneration(config: UnitConfiguration): number
}

export class BattleTechConstructionCalculator implements IConstructionCalculator {
  
  /**
   * Extract type string from ComponentConfiguration
   * @deprecated Use component.type directly instead
   */
  private extractComponentType(component: ComponentConfiguration): string {
    return component.type
  }
  
  /**
   * Get total tonnage used by all systems and equipment
   */
  getUsedTonnage(config: UnitConfiguration): number {
    // Structure weight (10% of unit tonnage for standard)
    const structureWeight = this.getStructureWeight(config)
    
    // Engine weight
    const engineWeight = this.getEngineWeight(config.engineType, config.engineRating)
    
    // Gyro weight
    const gyroWeight = this.getGyroWeight(this.extractComponentType(config.gyroType) as GyroType, config.engineRating)
    
    // Cockpit weight (always 3 tons for standard)
    const cockpitWeight = 3.0
    
    // Heat sink weight (external only, internal are part of engine)
    const heatSinkWeight = config.externalHeatSinks * this.getHeatSinkTonnage(this.extractComponentType(config.heatSinkType) as HeatSinkType)
    
    // Jump jet weight
    const jumpJetWeight = this.getJumpJetWeight(config)
    
    // Current armor weight
    const armorWeight = config.armorTonnage
    
    return structureWeight + engineWeight + gyroWeight + cockpitWeight + heatSinkWeight + jumpJetWeight + armorWeight
  }

  /**
   * Get remaining tonnage available for equipment/armor
   */
  getRemainingTonnage(config: UnitConfiguration): number {
    const usedTonnage = this.getUsedTonnage(config)
    return Math.max(0, config.tonnage - usedTonnage)
  }

  /**
   * Get engine weight based on type and rating
   */
  getEngineWeight(engineType: EngineType, rating: number): number {
    let multiplier = 1.0 // Standard engine
    
    switch (engineType) {
      case 'XL':
        multiplier = 0.5
        break
      case 'Light':
        multiplier = 0.75
        break
      case 'XXL':
        multiplier = 0.33
        break
      case 'Compact':
        multiplier = 1.5
        break
      case 'ICE':
      case 'Fuel Cell':
        multiplier = 2.0
        break
    }
    
    return (rating * multiplier) / 25
  }

  /**
   * Get gyro weight based on type and engine rating
   */
  getGyroWeight(gyroType: GyroType, rating: number): number {
    return calculateGyroWeight(rating, gyroType);
  }

  /**
   * Get heat sink tonnage per unit
   */
  getHeatSinkTonnage(heatSinkType: HeatSinkType): number {
    switch (heatSinkType) {
      case 'Double':
      case 'Double (Clan)':
        return 1.0
      case 'Compact':
        return 0.5
      case 'Laser':
        return 1.5
      default: // Single
        return 1.0
    }
  }

  /**
   * Get total jump jet weight
   */
  getJumpJetWeight(config: UnitConfiguration): number {
    const jumpMP = config.jumpMP || 0
    if (jumpMP === 0) return 0
    
    const tonnage = config.tonnage
    
    // Jump jet weight by tonnage class
    if (tonnage <= 55) {
      return jumpMP * 0.5
    } else if (tonnage <= 85) {
      return jumpMP * 1.0
    } else {
      return jumpMP * 2.0
    }
  }

  /**
   * Get structure weight based on type and tonnage
   */
  private getStructureWeight(config: UnitConfiguration): number {
    const baseTonnage = config.tonnage
    const structureType = this.extractComponentType(config.structureType)
    
    switch (structureType) {
      case 'Endo Steel':
      case 'Endo Steel (Clan)':
        return baseTonnage * 0.05 // 50% weight reduction
      case 'Composite':
        return baseTonnage * 0.05 // 50% weight reduction  
      case 'Reinforced':
        return baseTonnage * 0.2  // Double weight
      case 'Industrial':
        return baseTonnage * 0.1  // Standard weight
      default: // Standard
        return baseTonnage * 0.1  // 10% of unit tonnage
    }
  }

  /**
   * Get maximum armor tonnage allowed for this unit
   */
  getMaxArmorTonnage(config: UnitConfiguration): number {
    // BattleTech rule: Maximum armor tonnage for any unit
    // Cannot exceed remaining tonnage or physical armor limits
    const remainingTonnage = this.getRemainingTonnageForArmor(config)
    const physicalMaxTonnage = this.getPhysicalMaxArmorTonnage(config)
    
    // Return the smaller of the two limits
    const maxTonnage = Math.min(remainingTonnage, physicalMaxTonnage)
    
    // Round to nearest 0.5 ton
    return Math.ceil(maxTonnage * 2) / 2
  }

  /**
   * Get the physical maximum armor tonnage based on BattleTech construction rules
   */
  private getPhysicalMaxArmorTonnage(config: UnitConfiguration): number {
    // BattleTech rule: Maximum armor points based on internal structure
    const maxArmorPoints = this.getMaxArmorPoints(config)
    const armorEfficiency = this.getArmorEfficiency(this.extractComponentType(config.armorType) as ArmorType)
    
    // Convert max armor points to tonnage
    return maxArmorPoints / armorEfficiency
  }

  /**
   * Get maximum armor points allowed for this unit
   */
  getMaxArmorPoints(config: UnitConfiguration): number {
    // BattleTech rule: Head max (9) + sum of all other location max armor
    const internalStructure = this.getInternalStructurePoints(config.tonnage)
    
    // Max armor = Head max + (sum of other locations × 2)
    const headMax = 9
    const otherLocationsMax = (internalStructure.CT + internalStructure.LT + internalStructure.RT + 
                              internalStructure.LA + internalStructure.RA + internalStructure.LL + 
                              internalStructure.RL) * 2
    
    return headMax + otherLocationsMax
  }

  /**
   * Get internal structure points for each location using official BattleTech table
   */
  getInternalStructurePoints(tonnage: number): Record<string, number> {
    const structure = getInternalStructurePoints(tonnage)
    
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
  }

  /**
   * Get armor efficiency for current armor type
   */
  getArmorEfficiency(armorType: ArmorType): number {
    return ARMOR_SPECIFICATIONS[armorType]?.pointsPerTon || 16;
  }

  /**
   * Get maximum armor points for a specific location
   */
  getMaxArmorPointsForLocation(location: string, config: UnitConfiguration): number {
    const internalStructure = this.getInternalStructurePoints(config.tonnage)
    
    if (location === 'HD') {
      return 9 // Head max is always 9
    }
    
    const structurePoints = internalStructure[location] || 0
    return structurePoints * 2
  }

  /**
   * Get remaining tonnage that could be used for armor (excluding current armor)
   */
  private getRemainingTonnageForArmor(config: UnitConfiguration): number {
    // Calculate what tonnage would be without current armor allocation
    const usedWithoutArmor = this.getUsedTonnage(config) - config.armorTonnage
    const availableForArmor = config.tonnage - usedWithoutArmor
    
    // Return raw available tonnage (no circular dependency)
    return Math.max(0, availableForArmor)
  }

  /**
   * Get comprehensive armor calculation
   */
  getArmorCalculation(config: UnitConfiguration): ArmorCalculationResult {
    const efficiency = this.getArmorEfficiency(this.extractComponentType(config.armorType) as ArmorType)
    const availableArmorPoints = Math.floor(config.armorTonnage * efficiency)
    
    // Calculate allocated armor points from location assignments
    const allocatedArmorPoints = Object.values(config.armorAllocation).reduce((total, location) => {
      return total + (location.front || 0) + (location.rear || 0)
    }, 0)
    
    const unallocatedArmorPoints = Math.max(0, availableArmorPoints - allocatedArmorPoints)
    const maxArmorPoints = this.getMaxArmorPoints(config)
    const maxArmorTonnage = this.getMaxArmorTonnage(config)
    
    return {
      availableArmorPoints,
      allocatedArmorPoints,
      unallocatedArmorPoints,
      maxArmorPoints,
      maxArmorTonnage
    }
  }

  /**
   * Validate if current configuration exceeds any limits
   */
  validateWeight(config: UnitConfiguration): WeightValidationResult {
    const usedTonnage = this.getUsedTonnage(config)
    const maxTonnage = config.tonnage
    const overweight = Math.max(0, usedTonnage - maxTonnage)
    
    const warnings: string[] = []
    
    if (overweight > 0) {
      warnings.push(`Unit is ${overweight.toFixed(1)} tons overweight`)
    }
    
    // Check if close to limit
    const remaining = maxTonnage - usedTonnage
    if (remaining > 0 && remaining < 1) {
      warnings.push(`Only ${remaining.toFixed(1)} tons remaining`)
    }
    
    return {
      isValid: overweight === 0,
      overweight,
      warnings
    }
  }

  /**
   * Check if unit is overweight
   */
  isOverweight(config: UnitConfiguration): boolean {
    return this.getUsedTonnage(config) > config.tonnage
  }

  /**
   * Get total heat dissipation capacity
   */
  getHeatDissipation(config: UnitConfiguration): number {
    const efficiency = this.getHeatSinkEfficiency(this.extractComponentType(config.heatSinkType) as HeatSinkType)
    return config.totalHeatSinks * efficiency
  }

  /**
   * Get current heat generation from all equipment
   */
  getHeatGeneration(config: UnitConfiguration): number {
    // Currently no weapons/equipment generating heat in base configuration
    // This will be calculated from allocated weapons when equipment system is implemented
    return 0
  }

  /**
   * Get heat sink efficiency based on type
   */
  private getHeatSinkEfficiency(heatSinkType: HeatSinkType): number {
    switch (heatSinkType) {
      case 'Double':
      case 'Double (Clan)':
        return 2.0
      case 'Compact':
        return 1.0 // Compact heat sinks are 1:1 but take 0.5 tons
      case 'Laser':
        return 1.0 // Laser heat sinks are 1:1 but immune to critical hits
      default: // Single
        return 1.0
    }
  }
}
