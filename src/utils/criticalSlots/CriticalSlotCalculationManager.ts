/**
 * Critical Slot Calculation Manager
 * Handles critical slot calculations, requirements, and analysis
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { UnitConfiguration, HeatSinkType } from './UnitCriticalManagerTypes'
import { ComponentTypeManager } from './ComponentTypeManager'
import { ARMOR_SLOT_REQUIREMENTS, getArmorSlots } from '../armorCalculations'
import { getInternalStructurePoints } from '../internalStructureTable'
import { CriticalSlotBreakdown } from '../editor/UnitCalculationService'
import { ComponentConfiguration } from '../../types/componentConfiguration'
import { GyroType } from './SystemComponentRules'
import { JumpJetType } from '../jumpJetCalculations'

export interface SlotRequirementAnalysis {
  totalRequired: number
  totalAvailable: number
  deficit: number
  byLocation: Record<string, {
    required: number
    available: number
    deficit: number
  }>
  byComponentType: {
    system: number
    structure: number
    armor: number
    equipment: number
  }
  isOverCapacity: boolean
}

export class CriticalSlotCalculationManager {
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
   * Get critical slot requirements for armor type
   */
  static getArmorCriticalSlots(armorType: any, techBase: 'Inner Sphere' | 'Clan'): number {
    try {
      return getArmorSlots(armorType, techBase) || 0
    } catch (error) {
      // Fallback for armor types not in the armor calculations
      const armorTypeString = ComponentTypeManager.getArmorTypeString(armorType)
      const armorSlotMap: Record<string, number> = {
        'Standard': 0,
        'Ferro-Fibrous': 14,
        'Ferro-Fibrous (Clan)': 7,
        'Light Ferro-Fibrous': 7,
        'Heavy Ferro-Fibrous': 21,
        'Stealth': 12,
        'Reactive': 14,
        'Reflective': 10,
        'Hardened': 0  // Key fix - Hardened armor takes 0 slots
      }
      return armorSlotMap[armorTypeString] || 0
    }
  }

  /**
   * Get critical slot requirements for structure type
   */
  static getStructureCriticalSlots(structureType: any): number {
    const structureTypeString = ComponentTypeManager.getStructureTypeString(structureType)
    const structureSlotMap: Record<string, number> = {
      'Standard': 0,
      'Endo Steel': 14,
      'Endo Steel (Clan)': 7,
      'Composite': 0,
      'Reinforced': 0,
      'Industrial': 0
    }
    return structureSlotMap[structureTypeString] || 0
  }

  /**
   * Get total critical slots for a unit
   */
  static getTotalCriticalSlots(): number {
    return 78 // Standard BattleMech total
  }

  /**
   * Calculate critical slot breakdown for a unit
   */
  static getCriticalSlotBreakdown(config: UnitConfiguration): CriticalSlotBreakdown {
    const structureSlots = CriticalSlotCalculationManager.getStructureCriticalSlots(config.structureType)
    const armorSlots = CriticalSlotCalculationManager.getArmorCriticalSlots(config.armorType, config.techBase)
    
    // Calculate system component slots (engine, gyro, etc.)
    const systemSlots = CriticalSlotCalculationManager.calculateSystemComponentSlots(config)
    
    const total = CriticalSlotCalculationManager.getTotalCriticalSlots()
    const used = structureSlots + armorSlots + systemSlots
    
    return {
      structure: structureSlots,
      engine: 0, // Will be calculated separately
      gyro: 0, // Will be calculated separately
      cockpit: 0, // Will be calculated separately
      actuators: 0, // Will be calculated separately
      equipment: 0, // Will be calculated when equipment is added
      used,
      total,
      free: total - used,
      utilizationPercentage: (used / total) * 100,
      totals: {
        capacity: total,
        used,
        remaining: total - used,
        equipmentBurden: (used / total) * 100,
        overCapacity: Math.max(0, used - total)
      }
    }
  }

  /**
   * Calculate system component slots
   */
  static calculateSystemComponentSlots(config: UnitConfiguration): number {
    let totalSlots = 0
    
    // Engine slots (varies by engine type)
    const engineType = ComponentTypeManager.getEngineTypeString(config.engineType)
    if (engineType === 'XL') {
      totalSlots += 6 // XL engines take 6 slots
    } else if (engineType === 'XXL') {
      totalSlots += 12 // XXL engines take 12 slots
    } else if (engineType === 'Compact') {
      totalSlots += 2 // Compact engines take 2 slots
    }
    
    // Gyro slots (varies by gyro type)
    const gyroType = ComponentTypeManager.getGyroTypeString(
      CriticalSlotCalculationManager.extractComponentType(config.gyroType) as GyroType
    )
    if (gyroType === 'XL') {
      totalSlots += 6 // XL gyros take 6 slots
    } else if (gyroType === 'Compact') {
      totalSlots += 2 // Compact gyros take 2 slots
    } else {
      totalSlots += 4 // Standard gyros take 4 slots
    }
    
    // Heat sink slots (external heat sinks)
    if (config.externalHeatSinks > 0) {
      const heatSinkType = ComponentTypeManager.getHeatSinkTypeString(
        CriticalSlotCalculationManager.extractComponentType(config.heatSinkType) as HeatSinkType
      )
      const slotsPerHeatSink = heatSinkType.includes('Double') ? 2 : 1
      totalSlots += config.externalHeatSinks * slotsPerHeatSink
    }
    
    // Jump jet slots
    if (config.jumpMP > 0) {
      const jumpJetType = ComponentTypeManager.getJumpJetTypeString(
        CriticalSlotCalculationManager.extractComponentType(config.jumpJetType) as JumpJetType
      )
      const slotsPerJumpJet = jumpJetType.includes('Improved') ? 2 : 1
      totalSlots += config.jumpMP * slotsPerJumpJet
    }
    
    return totalSlots
  }

  /**
   * Calculate total used critical slots
   */
  static getTotalUsedCriticalSlots(config: UnitConfiguration, equipmentSlots: number = 0): number {
    const breakdown = CriticalSlotCalculationManager.getCriticalSlotBreakdown(config)
    return breakdown.used + equipmentSlots
  }

  /**
   * Calculate remaining critical slots
   */
  static getRemainingCriticalSlots(config: UnitConfiguration, equipmentSlots: number = 0): number {
    const totalUsed = CriticalSlotCalculationManager.getTotalUsedCriticalSlots(config, equipmentSlots)
    return Math.max(0, CriticalSlotCalculationManager.getTotalCriticalSlots() - totalUsed)
  }

  /**
   * Calculate equipment burden (percentage of slots used)
   */
  static getEquipmentBurden(config: UnitConfiguration, equipmentSlots: number = 0): number {
    const totalUsed = CriticalSlotCalculationManager.getTotalUsedCriticalSlots(config, equipmentSlots)
    return (totalUsed / CriticalSlotCalculationManager.getTotalCriticalSlots()) * 100
  }

  /**
   * Calculate over-capacity slots
   */
  static getOverCapacitySlots(config: UnitConfiguration, equipmentSlots: number = 0): number {
    const totalUsed = CriticalSlotCalculationManager.getTotalUsedCriticalSlots(config, equipmentSlots)
    return Math.max(0, totalUsed - CriticalSlotCalculationManager.getTotalCriticalSlots())
  }

  /**
   * Analyze slot requirements vs availability
   */
  static analyzeSlotRequirements(
    config: UnitConfiguration, 
    equipmentSlots: number = 0
  ): SlotRequirementAnalysis {
    const totalRequired = CriticalSlotCalculationManager.getTotalUsedCriticalSlots(config, equipmentSlots)
    const totalAvailable = CriticalSlotCalculationManager.getTotalCriticalSlots()
    const deficit = Math.max(0, totalRequired - totalAvailable)
    
    // Calculate by location (simplified - would need more detailed analysis)
    const structurePoints = getInternalStructurePoints(config.tonnage)
    const byLocation: Record<string, { required: number; available: number; deficit: number }> = {}
    
    Object.entries(structurePoints).forEach(([location, structurePoints]) => {
      const available = location === 'HD' ? 6 : 12 // Simplified slot count
      const required = 0 // Would need to calculate based on actual equipment placement
      byLocation[location] = {
        required,
        available,
        deficit: Math.max(0, required - available)
      }
    })
    
    // Calculate by component type
    const systemSlots = CriticalSlotCalculationManager.calculateSystemComponentSlots(config)
    const structureSlots = CriticalSlotCalculationManager.getStructureCriticalSlots(config.structureType)
    const armorSlots = CriticalSlotCalculationManager.getArmorCriticalSlots(config.armorType, config.techBase)
    
    return {
      totalRequired,
      totalAvailable,
      deficit,
      byLocation,
      byComponentType: {
        system: systemSlots,
        structure: structureSlots,
        armor: armorSlots,
        equipment: equipmentSlots
      },
      isOverCapacity: deficit > 0
    }
  }

  /**
   * Check if unit has sufficient critical slots
   */
  static hasSufficientSlots(config: UnitConfiguration, equipmentSlots: number = 0): boolean {
    const analysis = CriticalSlotCalculationManager.analyzeSlotRequirements(config, equipmentSlots)
    return !analysis.isOverCapacity
  }

  /**
   * Get slot efficiency percentage
   */
  static getSlotEfficiency(config: UnitConfiguration, equipmentSlots: number = 0): number {
    const totalUsed = CriticalSlotCalculationManager.getTotalUsedCriticalSlots(config, equipmentSlots)
    const totalAvailable = CriticalSlotCalculationManager.getTotalCriticalSlots()
    return (totalUsed / totalAvailable) * 100
  }
} 