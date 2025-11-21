/**
 * Special Components Manager
 * Handles structure, armor, and special component allocation and management
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { CriticalSection } from './CriticalSection'
import { EquipmentObject, EquipmentAllocation } from './CriticalSlot'
import { 
  UnitConfiguration, 
  SpecialEquipmentObject 
} from './UnitCriticalManagerTypes'
import { ComponentConfiguration } from '../../types/componentConfiguration'
import { getComponentDefinition } from '../../types/componentConfiguration';

export class SpecialComponentsManager {
  private sections: Map<string, CriticalSection>
  private unallocatedEquipment: EquipmentAllocation[]
  public configuration: UnitConfiguration
  private specialComponentsInitialized: boolean = false
  private static globalComponentCounter: number = 0

  constructor(
    sections: Map<string, CriticalSection>,
    unallocatedEquipment: EquipmentAllocation[],
    configuration: UnitConfiguration
  ) {
    this.sections = sections
    this.unallocatedEquipment = unallocatedEquipment
    this.configuration = configuration
  }

  /**
   * Type guard to safely access componentType property on equipment
   */
  private static hasComponentType(equipment: EquipmentObject): equipment is EquipmentObject & { componentType: string } {
    return 'componentType' in equipment && typeof (equipment as EquipmentObject & { componentType: unknown }).componentType === 'string'
  }

  /**
   * Safely get componentType from equipment
   */
  private static getComponentType(equipment: EquipmentObject): string | undefined {
    return SpecialComponentsManager.hasComponentType(equipment) ? equipment.componentType : undefined
  }

  /**
   * Get critical slots required for armor type
   */
  private getArmorCriticalSlots(armorType: ComponentConfiguration): number {
    console.log('[SPECIAL_DEBUG] getArmorCriticalSlots called with:', armorType)
    let slots = 0;
    // Existing logic
    switch (armorType.type) {
      case 'Ferro-Fibrous':
      case 'Ferro-Fibrous (Clan)':
        slots = 14; // or 7 for Clan, depending on rules
        break;
      case 'Light Ferro-Fibrous':
        slots = 7;
        break;
      case 'Heavy Ferro-Fibrous':
        slots = 21;
        break;
      case 'Stealth':
        slots = 10;
        break;
      default:
        slots = 0;
    }
    console.log('[SPECIAL_DEBUG] getArmorCriticalSlots returning:', slots)
    return slots;
  }

  /**
   * Get critical slots required for structure type
   */
  private getStructureCriticalSlots(structureType: ComponentConfiguration): number {
    console.log('[SPECIAL_DEBUG] getStructureCriticalSlots called with:', structureType)
    let slots = 0;
    // Existing logic
    switch (structureType.type) {
      case 'Endo Steel':
      case 'Endo Steel (Clan)':
        slots = 14; // or 7 for Clan, depending on rules
        break;
      case 'Composite':
        slots = 12;
        break;
      case 'Reinforced':
        slots = 20;
        break;
      default:
        slots = 0;
    }
    console.log('[SPECIAL_DEBUG] getStructureCriticalSlots returning:', slots)
    return slots;
  }

  /**
   * Initialize special components (structure and armor)
   */
  initializeSpecialComponents(): void {
    console.log('[SPECIAL_DEBUG] === INITIALIZING SPECIAL COMPONENTS ===')
    
    const structureType = this.getStructureTypeString()
    const armorType = this.getArmorTypeString()
    
    console.log('[SPECIAL_DEBUG] Structure type:', structureType)
    console.log('[SPECIAL_DEBUG] Armor type:', armorType)

    // Always clear all special components before adding
    console.log('[SPECIAL_DEBUG] Clearing existing special components...')
    this.clearSpecialComponentsByType('structure')
    this.clearSpecialComponentsByType('armor')

    // Add structure components for the required slot count
    const structureSlots = this.getStructureCriticalSlots(structureType)
    console.log('[SPECIAL_DEBUG] Structure slots required:', structureSlots)
    if (structureSlots > 0) {
      console.log('[SPECIAL_DEBUG] Adding structure components...')
      this.addSpecialComponents(structureType, 'structure', structureSlots)
    }

    // Add armor components for the required slot count
    const armorSlots = this.getArmorCriticalSlots(armorType)
    console.log('[SPECIAL_DEBUG] Armor slots required:', armorSlots)
    if (armorSlots > 0) {
      console.log('[SPECIAL_DEBUG] Adding armor components...')
      this.addSpecialComponents(armorType, 'armor', armorSlots)
    }
    
    console.log('[SPECIAL_DEBUG] Final unallocated equipment count:', this.unallocatedEquipment.length)
    console.log('[SPECIAL_DEBUG] === END INITIALIZING SPECIAL COMPONENTS ===')
  }

  /**
   * Handle special component configuration changes
   */
  handleSpecialComponentConfigurationChange(
    oldConfig: UnitConfiguration, 
    newConfig: UnitConfiguration
  ): void {
    console.log('[SPECIAL_DEBUG] handleSpecialComponentConfigurationChange called')
    const structureType = this.getStructureTypeStringFromConfig(newConfig)
    const armorType = this.getArmorTypeStringFromConfig(newConfig)
    const tonnage = newConfig.tonnage
    console.log('[SPECIAL_DEBUG] structureType:', structureType, 'armorType:', armorType, 'tonnage:', tonnage)
    const structureSlots = this.getStructureCriticalSlots(structureType)
    const armorSlots = this.getArmorCriticalSlots(armorType)
    console.log('[SPECIAL_DEBUG] Calculated structureSlots:', structureSlots, 'armorSlots:', armorSlots)
    if (structureSlots > 0) {
      this.addSpecialComponents(structureType, 'structure', structureSlots)
    }
    if (armorSlots > 0) {
      this.addSpecialComponents(armorType, 'armor', armorSlots)
    }
    console.log('[SPECIAL_DEBUG] After addSpecialComponents, unallocated pool:', JSON.stringify(this.unallocatedEquipment, null, 2))
  }

  /**
   * Update special components when type changes
   */
  private updateSpecialComponents(
    oldType: ComponentConfiguration,
    newType: ComponentConfiguration,
    componentType: 'structure' | 'armor'
  ): void {
    // Always clear all special components of this type before adding new ones
    this.clearSpecialComponentsByType(componentType);

    const newSlots = componentType === 'structure'
      ? this.getStructureCriticalSlots(newType as ComponentConfiguration)
      : this.getArmorCriticalSlots(newType as ComponentConfiguration)

    if (newSlots > 0) {
      this.addSpecialComponents(newType, componentType, newSlots)
    }
  }

  /**
   * Clear all special components of a specific type
   */
  private clearSpecialComponentsByType(componentType: 'structure' | 'armor'): void {
    const componentsToRemove: EquipmentAllocation[] = []

    // Find all special components of this type
    for (const allocation of this.unallocatedEquipment) {
      const specialEq = allocation.equipmentData as SpecialEquipmentObject
      if (specialEq.componentType === componentType) {
        componentsToRemove.push(allocation)
      }
    }

    // Remove from unallocated equipment
    for (const component of componentsToRemove) {
      const index = this.unallocatedEquipment.findIndex(
        eq => eq.equipmentGroupId === component.equipmentGroupId
      )
      if (index !== -1) {
        this.unallocatedEquipment.splice(index, 1)
      }
    }

    // Remove from allocated equipment in all sections
    for (const section of Array.from(this.sections.values())) {
      const slots = section.getAllSlots()
      for (const slot of slots) {
        if (slot.hasEquipment() && slot.content?.equipmentReference) {
          const equipment = slot.content.equipmentReference
          const specialEq = equipment.equipmentData as SpecialEquipmentObject
          if (specialEq.componentType === componentType) {
            slot.clearSlot()
          }
        }
      }
    }
  }

  /**
   * Transfer special components when slot count changes
   */
  private transferSpecialComponents(
    oldType: ComponentConfiguration,
    newType: ComponentConfiguration,
    componentType: 'structure' | 'armor',
    oldSlots: number,
    newSlots: number
  ): void {
    // Collect existing components
    const existingComponents = this.collectExistingSpecialComponents(oldType, componentType)
    
    // Remove old components
    this.removeSpecialComponents(oldType, componentType)
    
    // Add new components
    this.addSpecialComponents(newType, componentType, newSlots)
    
    // Update properties of new components to match old ones
    const newComponents = this.collectExistingSpecialComponents(newType, componentType)
    if (existingComponents.length > 0 && newComponents.length > 0) {
      // Transfer properties from old to new (e.g., location, slot assignments)
      for (let i = 0; i < Math.min(existingComponents.length, newComponents.length); i++) {
        const oldComponent = existingComponents[i]
        const newComponent = newComponents[i]
        
                 // Copy location and slot information if available
         if (oldComponent.location && oldComponent.startSlotIndex !== -1) {
           // Try to place new component in same location
           const section = this.sections.get(oldComponent.location)
           if (section) {
             const slot = section.getSlot(oldComponent.startSlotIndex)
             if (slot && slot.isEmpty()) {
               slot.allocateEquipment(newComponent, newComponent.equipmentGroupId)
               // Remove from unallocated
               const index = this.unallocatedEquipment.findIndex(
                 eq => eq.equipmentGroupId === newComponent.equipmentGroupId
               )
               if (index !== -1) {
                 this.unallocatedEquipment.splice(index, 1)
               }
             }
           }
         }
      }
    }
  }

  /**
   * Collect existing special components of a specific type
   */
  private collectExistingSpecialComponents(
    type: ComponentConfiguration,
    componentType: 'structure' | 'armor'
  ): EquipmentAllocation[] {
    const components: EquipmentAllocation[] = []

    // Check unallocated equipment
    for (const allocation of this.unallocatedEquipment) {
      const specialEq = allocation.equipmentData as SpecialEquipmentObject
      if (specialEq.componentType === componentType && 
          specialEq.name.toLowerCase().includes(type.type.toLowerCase().replace(/\s+/g, ''))) {
        components.push(allocation)
      }
    }

    // Check allocated equipment in all sections
    for (const section of Array.from(this.sections.values())) {
      const slots = section.getAllSlots()
      for (const slot of slots) {
        if (slot.hasEquipment() && slot.content?.equipmentReference) {
          const equipment = slot.content.equipmentReference
          const specialEq = equipment.equipmentData as SpecialEquipmentObject
          if (specialEq.componentType === componentType && 
              specialEq.name.toLowerCase().includes(type.type.toLowerCase().replace(/\s+/g, ''))) {
            components.push(equipment)
          }
        }
      }
    }

    return components
  }

  /**
   * Update component properties when type changes
   */
  private updateComponentProperties(
    oldType: ComponentConfiguration,
    newType: ComponentConfiguration,
    componentType: 'structure' | 'armor'
  ): void {
    const components = this.collectExistingSpecialComponents(oldType, componentType)
    
    for (const component of components) {
      const specialEq = component.equipmentData as SpecialEquipmentObject
      
             // Update the component name and properties
       specialEq.name = this.createSpecialComponentName(newType, componentType)
      
      // Update any other type-specific properties
      if (componentType === 'structure') {
        // Update structure-specific properties
        specialEq.weight = this.getStructureWeight(newType as ComponentConfiguration, this.configuration.tonnage)
      } else {
        // Update armor-specific properties
        specialEq.weight = this.getArmorWeight(newType as ComponentConfiguration, this.configuration.armorTonnage)
      }
    }
  }

  /**
   * Add special components of a specific type
   */
  private addSpecialComponents(type: ComponentConfiguration, componentType: 'structure' | 'armor', requiredSlots: number): void {
    console.log('[SPECIAL_DEBUG] addSpecialComponents called:', type, componentType, requiredSlots)
    
    const components = this.createSpecialComponentEquipment(type, componentType, requiredSlots)
    console.log(`[SPECIAL_DEBUG] Created ${components.length} component objects`)
    
    for (const componentData of components) {
      const allocation: EquipmentAllocation = {
        equipmentData: componentData,
        equipmentGroupId: `special_${componentType}_${SpecialComponentsManager.globalComponentCounter++}`,
        location: '',
        startSlotIndex: -1,
        endSlotIndex: -1,
        occupiedSlots: []
      }
      
      console.log(`[SPECIAL_DEBUG] Adding to unallocated: ${componentData.name} (${componentData.id})`)
      this.unallocatedEquipment.push(allocation)
    }
    
    console.log('[SPECIAL_DEBUG] addSpecialComponents finished, unallocated pool:', JSON.stringify(this.unallocatedEquipment, null, 2))
  }

  /**
   * Remove special components of a specific type
   */
  private removeSpecialComponents(type: ComponentConfiguration, componentType: 'structure' | 'armor'): void {
    this.clearSpecialComponentsByType(componentType)
  }

  /**
   * Create special component equipment objects
   */
  private createSpecialComponentEquipment(
    type: ComponentConfiguration,
    componentType: 'structure' | 'armor',
    requiredSlots: number
  ): SpecialEquipmentObject[] {
    const components: SpecialEquipmentObject[] = []
    
    for (let i = 0; i < requiredSlots; i++) {
      const componentId = this.getCanonicalComponentId(type, componentType)
      const componentName = this.createSpecialComponentName(type, componentType)
      const componentDescription = this.createSpecialComponentDescription(type, componentType)
      
      // Calculate weight based on component type and configuration
      let weight = 0
      if (componentType === 'structure') {
        weight = this.getStructureWeight(type, this.configuration.tonnage)
      } else {
        // For armor, we need to calculate based on total armor weight
        const maxArmorTonnage = this.configuration.tonnage * 0.2 // Assume 20% of tonnage for armor
        weight = this.getArmorWeight(type, maxArmorTonnage)
      }
      
      const component: SpecialEquipmentObject = {
        id: `${componentId}_${i + 1}`,
        name: componentName,
        type: 'equipment',
        requiredSlots: 1,
        weight: weight,
        techBase: type.techBase,
        componentType: componentType,
        allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg']
      }
      
      components.push(component)
    }
    
    return components
  }

  /**
   * Get canonical component ID for special components
   */
  private getCanonicalComponentId(type: ComponentConfiguration, componentType: 'structure' | 'armor'): string {
    if (componentType === 'structure') {
      switch (type.type) {
        case 'Endo Steel':
        case 'Endo Steel (Clan)':
          return 'endo_steel'
        case 'Composite':
          return 'composite'
        case 'Reinforced':
          return 'reinforced'
        default:
          return 'standard_structure'
      }
    } else {
      switch (type.type) {
        case 'Ferro-Fibrous':
        case 'Ferro-Fibrous (Clan)':
          return 'ferro_fibrous'
        case 'Light Ferro-Fibrous':
          return 'light_ferro_fibrous'
        case 'Heavy Ferro-Fibrous':
          return 'heavy_ferro_fibrous'
        case 'Stealth':
          return 'stealth_armor'
        case 'Reactive':
          return 'reactive_armor'
        case 'Reflective':
          return 'reflective_armor'
        case 'Hardened':
          return 'hardened_armor'
        default:
          return 'standard_armor'
      }
    }
  }

  /**
   * Create special component name
   */
  private createSpecialComponentName(type: ComponentConfiguration, componentType: 'structure' | 'armor'): string {
    if (componentType === 'structure') {
      return `${type.type} Structure`
    } else {
      return `${type.type} Armor`
    }
  }

  /**
   * Create special component description
   */
  private createSpecialComponentDescription(type: ComponentConfiguration, componentType: 'structure' | 'armor'): string {
    if (componentType === 'structure') {
      return `${type.type} internal structure component`
    } else {
      return `${type.type} armor component`
    }
  }

  /**
   * Get structure weight based on type and tonnage
   */
  private getStructureWeight(type: ComponentConfiguration, tonnage: number): number {
    switch (type.type) {
      case 'Endo Steel':
      case 'Endo Steel (Clan)':
        return Math.ceil(tonnage / 2) / 2 // Half weight, rounded up to nearest 0.5
      case 'Composite':
        return Math.ceil(tonnage * 0.5) / 2 // 50% weight, rounded up to nearest 0.5
      case 'Reinforced':
        return Math.ceil(tonnage * 1.5) / 2 // 150% weight, rounded up to nearest 0.5
      default:
        return Math.ceil(tonnage) / 2 // Standard weight, rounded up to nearest 0.5
    }
  }

  /**
   * Get armor weight based on type and armor tonnage
   */
  private getArmorWeight(type: ComponentConfiguration, armorTonnage: number): number {
    switch (type.type) {
      case 'Ferro-Fibrous':
      case 'Ferro-Fibrous (Clan)':
      case 'Light Ferro-Fibrous':
      case 'Heavy Ferro-Fibrous':
      case 'Stealth':
      case 'Reactive':
      case 'Reflective':
      case 'Hardened':
        return Math.ceil(armorTonnage * 1.2) / 2 // 20% more weight, rounded up to nearest 0.5
      default:
        return Math.ceil(armorTonnage) / 2 // Standard weight, rounded up to nearest 0.5
    }
  }

  /**
   * Get structure type as string from configuration
   */
  private getStructureTypeStringFromConfig(config: UnitConfiguration): ComponentConfiguration {
    if (config.legacyStructureType) {
      return config.legacyStructureType
    }
    
    const structureType = config.structureType?.type || 'Standard'
    const techBase = config.structureType?.techBase || 'Inner Sphere'
    
    if (structureType === 'Endo Steel') {
      return { type: techBase === 'Clan' ? 'Endo Steel (Clan)' : 'Endo Steel', techBase }
    }
    
    return { type: structureType, techBase }
  }

  /**
   * Get armor type as string from configuration
   */
  private getArmorTypeStringFromConfig(config: UnitConfiguration): ComponentConfiguration {
    if (config.legacyArmorType) {
      return config.legacyArmorType
    }
    
    const armorType = config.armorType?.type || 'Standard'
    const techBase = config.armorType?.techBase || 'Inner Sphere'
    
    if (armorType === 'Ferro-Fibrous') {
      return { type: techBase === 'Clan' ? 'Ferro-Fibrous (Clan)' : 'Ferro-Fibrous', techBase }
    }
    
    return { type: armorType, techBase }
  }

  /**
   * Get structure type as string from current configuration
   */
  private getStructureTypeString(): ComponentConfiguration {
    return this.getStructureTypeStringFromConfig(this.configuration)
  }

  /**
   * Get armor type as string from current configuration
   */
  private getArmorTypeString(): ComponentConfiguration {
    return this.getArmorTypeStringFromConfig(this.configuration)
  }

  /**
   * Check if equipment is a special component
   */
  isSpecialComponent(equipment: EquipmentObject): boolean {
    const specialEq = equipment as SpecialEquipmentObject
    const name = equipment.name.toLowerCase()
    
    // Check by componentType field (preferred method)
    if (specialEq.componentType === 'structure' || specialEq.componentType === 'armor') {
      return true
    }
    
    // Check by name patterns for special components
    const specialPatterns = [
      'endo steel', 'endosteel', 'endo_steel',
      'ferro-fibrous', 'ferrofibrous', 'ferro_fibrous',
      'ferro fibrous', 'light ferro', 'heavy ferro',
      'stealth armor', 'reactive armor', 'reflective armor',
      'hardened armor', 'composite', 'reinforced'
    ]
    
    return specialPatterns.some(pattern => name.includes(pattern))
  }

  /**
   * Update reference to unallocated equipment array
   * CRITICAL FIX: Simply update our reference to point to the same array
   * The UnitCriticalManager is responsible for managing the unallocated equipment
   * We should not copy components as this causes duplication
   */
  updateUnallocatedEquipmentReference(newUnallocatedEquipment: EquipmentAllocation[]): void {
    console.log('[SPECIAL_DEBUG] updateUnallocatedEquipmentReference called')
    console.log('[SPECIAL_DEBUG] Updating reference to new unallocated equipment array')
    
    // Simply update our reference to point to the same array
    // DO NOT copy components - this causes duplication
    this.unallocatedEquipment = newUnallocatedEquipment
    
    console.log('[SPECIAL_DEBUG] Reference updated. New array length:', this.unallocatedEquipment.length)
  }

  /**
   * Clear all special components
   */
  clearAllSpecialComponents(): void {
    this.clearSpecialComponentsByType('structure')
    this.clearSpecialComponentsByType('armor')
    this.specialComponentsInitialized = false
  }
} 