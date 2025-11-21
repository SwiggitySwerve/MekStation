/**
 * BattleTech Component Factory - Specialized component creation service
 * Handles creation of Endo Steel, Ferro-Fibrous, Jump Jets, and other special components
 * Following SOLID principles - Single Responsibility, Factory Pattern
 */

import { EquipmentObject } from '../criticalSlots/CriticalSlot'
import { StructureType, ArmorType } from '../criticalSlots/UnitCriticalManager'
import { JumpJetType } from '../jumpJetCalculations'

export interface SpecialEquipmentObject extends EquipmentObject {
  componentType?: 'structure' | 'armor'
}

export interface IComponentFactory {
  createStructureComponents(type: StructureType, count: number): SpecialEquipmentObject[]
  createArmorComponents(type: ArmorType, count: number): SpecialEquipmentObject[]
  createJumpJetComponents(type: JumpJetType, count: number, tonnage: number, techBase: string): EquipmentObject[]
  isSpecialComponent(equipment: EquipmentObject): boolean
  getStructureCriticalSlots(type: StructureType): number
  getArmorCriticalSlots(type: ArmorType, techBase: string): number
  createComponentsForConfiguration(config: {
    structureType: StructureType
    armorType: ArmorType
    jumpJetType: JumpJetType
    jumpMP: number
    tonnage: number
    techBase: string
  }): {
    structureComponents: SpecialEquipmentObject[]
    armorComponents: SpecialEquipmentObject[]
    jumpJetComponents: EquipmentObject[]
  }
}

export class BattleTechComponentFactory implements IComponentFactory {
  private static globalComponentCounter: number = 0

  /**
   * Create structure component pieces (Endo Steel, etc.)
   */
  createStructureComponents(type: StructureType, count: number): SpecialEquipmentObject[] {
    console.log(`[ComponentFactory] Creating ${count} structure components for ${type}`)
    
    return Array.from({ length: count }, (_, index) => {
      BattleTechComponentFactory.globalComponentCounter++
      
      return {
        id: `${type.toLowerCase().replace(/\s+/g, '_')}_piece_${index + 1}_${BattleTechComponentFactory.globalComponentCounter}`,
        name: type,
        type: 'equipment' as const,
        requiredSlots: 1,
        weight: 0,
        techBase: type.includes('Clan') ? 'Clan' : 'Inner Sphere',
        componentType: 'structure',
        isGrouped: false
      }
    })
  }

  /**
   * Create armor component pieces (Ferro-Fibrous, etc.)
   */
  createArmorComponents(type: ArmorType, count: number): SpecialEquipmentObject[] {
    console.log(`[ComponentFactory] Creating ${count} armor components for ${type}`)
    
    return Array.from({ length: count }, (_, index) => {
      BattleTechComponentFactory.globalComponentCounter++
      
      return {
        id: `${type.toLowerCase().replace(/\s+/g, '_')}_piece_${index + 1}_${BattleTechComponentFactory.globalComponentCounter}`,
        name: type,
        type: 'equipment' as const,
        requiredSlots: 1,
        weight: 0,
        techBase: type.includes('Clan') ? 'Clan' : 'Inner Sphere',
        componentType: 'armor',
        isGrouped: false
      }
    })
  }

  /**
   * Create jump jet components
   */
  createJumpJetComponents(type: JumpJetType, count: number, tonnage: number, techBase: string): EquipmentObject[] {
    console.log(`[ComponentFactory] Creating ${count} jump jet components for ${type}`)
    
    // Import jump jet calculations
    const { calculateJumpJetWeight, calculateJumpJetCriticalSlots, JUMP_JET_VARIANTS } = require('../jumpJetCalculations')
    
    const variant = JUMP_JET_VARIANTS[type]
    if (!variant) {
      console.warn(`[ComponentFactory] Unknown jump jet type: ${type}`)
      return []
    }
    
    // Define location restrictions for jump jets
    const jumpJetLocations = ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']
    
    return Array.from({ length: count }, (_, index) => {
      BattleTechComponentFactory.globalComponentCounter++
      
      return {
        id: `${type.toLowerCase().replace(/\s+/g, '_')}_${index + 1}_${BattleTechComponentFactory.globalComponentCounter}`,
        name: variant.name,
        type: 'equipment' as const,
        requiredSlots: calculateJumpJetCriticalSlots(type, tonnage),
        weight: calculateJumpJetWeight(type, tonnage),
        techBase: variant.techBase === 'Both' ? techBase : variant.techBase,
        heat: variant.heatGeneration,
        allowedLocations: jumpJetLocations
      }
    })
  }

  /**
   * Comprehensive detection of special components
   */
  isSpecialComponent(equipment: EquipmentObject): boolean {
    const specialEq = equipment as SpecialEquipmentObject
    const name = equipment.name.toLowerCase()
    const id = equipment.id.toLowerCase()
    
    // Check by componentType field (preferred method)
    if (specialEq.componentType === 'structure' || specialEq.componentType === 'armor') {
      return true
    }
    
    // Check by name patterns for structure types
    const structureTypes = [
      'endo steel', 'endosteel', 'endo_steel',
      'composite', 'reinforced', 'industrial'
    ]
    
    // Check by name patterns for armor types  
    const armorTypes = [
      'ferro-fibrous', 'ferrofibrous', 'ferro_fibrous',
      'light ferro', 'heavy ferro', 'stealth', 'reactive', 'reflective', 'hardened'
    ]
    
    // Check by name patterns for jump jets
    const jumpJetTypes = [
      'jump', 'umu', 'booster', 'wing'
    ]
    
    // Check if name matches any special component pattern
    const isStructure = structureTypes.some(type => name.includes(type))
    const isArmor = armorTypes.some(type => name.includes(type))
    const isJumpJet = jumpJetTypes.some(type => name.includes(type))
    
    // Check if ID matches special component pattern
    const hasSpecialId = id.includes('piece') || id.includes('endo') || id.includes('ferro') || id.includes('jump')
    
    return isStructure || isArmor || isJumpJet || hasSpecialId
  }

  /**
   * Get critical slot requirements for structure type
   */
  getStructureCriticalSlots(structureType: StructureType): number {
    const structureSlotMap: Record<StructureType, number> = {
      'Standard': 0,
      'Endo Steel': 14,
      'Endo Steel (Clan)': 7,
      'Composite': 0,
      'Reinforced': 0,
      'Industrial': 0
    }
    return structureSlotMap[structureType] || 0
  }

  /**
   * Get critical slot requirements for armor type
   */
  getArmorCriticalSlots(armorType: ArmorType, techBase: string): number {
    try {
      const { getArmorSlots } = require('../armorCalculations')
      // Type-safe function call with proper parameter handling
      const validTechBases = ['Inner Sphere', 'Clan', 'Both']
      const safeTechBase = validTechBases.includes(techBase) ? techBase : 'Inner Sphere'
      return getArmorSlots(armorType, safeTechBase) || 0
    } catch (error) {
      // Fallback for armor types not in the armor calculations
      const armorSlotMap: Record<ArmorType, number> = {
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
      return armorSlotMap[armorType] || 0
    }
  }

  /**
   * Create components for a complete unit configuration
   */
  createComponentsForConfiguration(config: {
    structureType: StructureType
    armorType: ArmorType
    jumpJetType: JumpJetType
    jumpMP: number
    tonnage: number
    techBase: string
  }): {
    structureComponents: SpecialEquipmentObject[]
    armorComponents: SpecialEquipmentObject[]
    jumpJetComponents: EquipmentObject[]
  } {
    console.log('[ComponentFactory] Creating components for complete configuration:', config)
    
    const structureSlots = this.getStructureCriticalSlots(config.structureType)
    const armorSlots = this.getArmorCriticalSlots(config.armorType, config.techBase)
    
    const structureComponents = structureSlots > 0 
      ? this.createStructureComponents(config.structureType, structureSlots) 
      : []
      
    const armorComponents = armorSlots > 0 
      ? this.createArmorComponents(config.armorType, armorSlots) 
      : []
      
    const jumpJetComponents = config.jumpMP > 0 
      ? this.createJumpJetComponents(config.jumpJetType, config.jumpMP, config.tonnage, config.techBase) 
      : []
    
    console.log(`[ComponentFactory] Created: ${structureComponents.length} structure, ${armorComponents.length} armor, ${jumpJetComponents.length} jump jets`)
    
    return {
      structureComponents,
      armorComponents,
      jumpJetComponents
    }
  }

  /**
   * Get component count requirements for a configuration
   */
  getComponentRequirements(config: {
    structureType: StructureType
    armorType: ArmorType
    jumpMP: number
    techBase: string
  }): {
    structureSlots: number
    armorSlots: number
    jumpJetSlots: number
    totalSlots: number
  } {
    const structureSlots = this.getStructureCriticalSlots(config.structureType)
    const armorSlots = this.getArmorCriticalSlots(config.armorType, config.techBase)
    const jumpJetSlots = config.jumpMP
    
    return {
      structureSlots,
      armorSlots,
      jumpJetSlots,
      totalSlots: structureSlots + armorSlots + jumpJetSlots
    }
  }

  /**
   * Filter components by type from equipment list
   */
  filterComponentsByType(equipment: EquipmentObject[], componentType: 'structure' | 'armor'): SpecialEquipmentObject[] {
    return equipment.filter(eq => {
      const specialEq = eq as SpecialEquipmentObject
      return specialEq.componentType === componentType
    }) as SpecialEquipmentObject[]
  }

  /**
   * Get global component counter for debugging
   */
  static getGlobalCounter(): number {
    return BattleTechComponentFactory.globalComponentCounter
  }

  /**
   * Reset global counter (for testing)
   */
  static resetGlobalCounter(): void {
    BattleTechComponentFactory.globalComponentCounter = 0
  }
}
