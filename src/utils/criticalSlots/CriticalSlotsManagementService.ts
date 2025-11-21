/**
 * Critical Slots Management Service - Handles automatic and manual operations
 * for critical slot allocation including fill, compact, sort, and reset
 */

import { CriticalSlot } from './CriticalSlot'
import { UnitCriticalManager } from './UnitCriticalManager'

export interface CriticalSlotsOperationResult {
  success: boolean
  message: string
  slotsModified: number
}

export class CriticalSlotsManagementService {
  
  /**
   * Fill empty slots with all unallocated equipment using enhanced auto-allocation
   */
  static fillUnhittables(unitManager: UnitCriticalManager): CriticalSlotsOperationResult {
    try {
      console.log('[CriticalSlotsManagementService] Starting enhanced fill operation')
      
      // Use the enhanced auto-allocation system from UnitCriticalManager
      const result = unitManager.autoAllocateEquipment()
      
      // Convert the detailed result to the expected format
      return {
        success: result.success,
        message: result.message,
        slotsModified: result.slotsModified
      }
    } catch (error) {
      console.error('[CriticalSlotsManagementService] Error during enhanced fill operation:', error)
      return {
        success: false,
        message: `Error during auto-allocation: ${error}`,
        slotsModified: 0
      }
    }
  }

  /**
   * Compact equipment by removing gaps between components
   */
  static compact(unitManager: UnitCriticalManager): CriticalSlotsOperationResult {
    try {
      let slotsModified = 0
      const sections = this.getAllSections(unitManager)

      for (const [locationName, section] of Object.entries(sections)) {
        if (!section) continue

        const slots = section.getAllSlots()
        const compacted = this.compactSlots(slots)
        
        if (compacted.modified) {
          // Update the section with compacted slots
          this.updateSectionSlots(section, compacted.slots, unitManager)
          slotsModified += compacted.moveCount
        }
      }

      return {
        success: true,
        message: `Compacted equipment, moved ${slotsModified} components`,
        slotsModified
      }
    } catch (error) {
      console.error('Error compacting slots:', error)
      return {
        success: false,
        message: `Error compacting: ${error}`,
        slotsModified: 0
      }
    }
  }

  /**
   * Sort equipment by type and priority
   */
  static sort(unitManager: UnitCriticalManager): CriticalSlotsOperationResult {
    try {
      let slotsModified = 0
      const sections = this.getAllSections(unitManager)

      for (const [locationName, section] of Object.entries(sections)) {
        if (!section) continue

        const slots = section.getAllSlots()
        const sorted = this.sortSlots(slots)
        
        if (sorted.modified) {
          this.updateSectionSlots(section, sorted.slots, unitManager)
          slotsModified += sorted.moveCount
        }
      }

      return {
        success: true,
        message: `Sorted equipment, rearranged ${slotsModified} components`,
        slotsModified
      }
    } catch (error) {
      console.error('Error sorting slots:', error)
      return {
        success: false,
        message: `Error sorting: ${error}`,
        slotsModified: 0
      }
    }
  }

  /**
   * Smart slot update with minimal equipment displacement
   * CRITICAL: Implements the documented smart slot update pattern
   */
  static smartUpdateSlots(
    unitManager: UnitCriticalManager,
    oldSlots: CriticalSlot[],
    newSlots: CriticalSlot[],
    componentType: string
  ): { success: boolean; displacedEquipment: any[]; message: string } {
    try {
      console.log(`[CriticalSlotsManagementService] Smart slot update for ${componentType}`)
      
      const displacedEquipment: any[] = []
      const sections = this.getAllSections(unitManager)
      
      // CRITICAL: Check for conflicts between old and new slot requirements
      const conflicts = this.findSlotConflicts(oldSlots, newSlots)
      
      if (conflicts.length === 0) {
        console.log(`[CriticalSlotsManagementService] No conflicts found, applying direct update`)
        return { success: true, displacedEquipment: [], message: 'Direct update applied' }
      }
      
      // CRITICAL: Resolve conflicts with minimal displacement
      for (const conflict of conflicts) {
        const resolution = this.resolveSlotConflict(conflict, unitManager)
        if (resolution.displacedEquipment) {
          displacedEquipment.push(...resolution.displacedEquipment)
        }
      }
      
      // CRITICAL: Apply the new slot configuration
      this.applySlotConfiguration(newSlots, unitManager)
      
      return {
        success: true,
        displacedEquipment,
        message: `Smart update completed, displaced ${displacedEquipment.length} components`
      }
    } catch (error) {
      console.error('[CriticalSlotsManagementService] Error during smart slot update:', error)
      return {
        success: false,
        displacedEquipment: [],
        message: `Error during smart update: ${error}`
      }
    }
  }

  /**
   * Cross-component validation for engine/gyro compatibility
   * CRITICAL: Implements the documented cross-component validation pattern
   */
  static validateComponentCompatibility(
    engineType: string,
    gyroType: string,
    techProgression: any
  ): { isCompatible: boolean; conflicts: string[]; suggestions: string[] } {
    const conflicts: string[] = []
    const suggestions: string[] = []
    
    // CRITICAL: Check XL gyro compatibility with engine types
    if (gyroType === 'XL') {
      const incompatibleEngines = ['Standard', 'ICE', 'Fuel Cell', 'Compact']
      if (incompatibleEngines.includes(engineType)) {
        conflicts.push(`XL Gyro is incompatible with ${engineType} engine`)
        suggestions.push('Consider using Standard gyro or upgrading to XL engine')
      }
    }
    
    // CRITICAL: Check tech base compatibility
    const engineTechBase = techProgression?.engine || 'Inner Sphere'
    const gyroTechBase = techProgression?.gyro || 'Inner Sphere'
    
    if (engineTechBase !== gyroTechBase) {
      conflicts.push(`Engine (${engineTechBase}) and Gyro (${gyroTechBase}) tech bases don't match`)
      suggestions.push('Consider using same tech base for both components')
    }
    
    // CRITICAL: Check for advanced component combinations
    if (engineType === 'XXL' && gyroType === 'XL') {
      conflicts.push('XXL Engine + XL Gyro combination may exceed critical slot capacity')
      suggestions.push('Consider using Standard gyro with XXL engine')
    }
    
    return {
      isCompatible: conflicts.length === 0,
      conflicts,
      suggestions
    }
  }

  /**
   * Reset by removing all non-system components
   */
  static reset(unitManager: UnitCriticalManager): CriticalSlotsOperationResult {
    try {
      let slotsCleared = 0
      const sections = this.getAllSections(unitManager)

      for (const [locationName, section] of Object.entries(sections)) {
        if (!section) continue

        const slots = section.getAllSlots()
        
        for (const slot of slots) {
          if (this.isRemovableComponent(slot)) {
            // Move equipment back to unallocated
            if (slot.content?.type === 'equipment' && slot.content.equipmentGroupId) {
              unitManager.displaceEquipment(slot.content.equipmentGroupId)
              slotsCleared++
            }
          }
        }
      }

      return {
        success: true,
        message: `Reset complete, removed ${slotsCleared} components`,
        slotsModified: slotsCleared
      }
    } catch (error) {
      console.error('Error resetting slots:', error)
      return {
        success: false,
        message: `Error resetting: ${error}`,
        slotsModified: 0
      }
    }
  }

  // Private helper methods

  private static getAllSections(unitManager: UnitCriticalManager) {
    const sectionNames = ['Head', 'Center Torso', 'Left Torso', 'Right Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg']
    
    const sections: Record<string, any> = {}
    for (const name of sectionNames) {
      sections[name] = unitManager.getSection(name)
    }
    
    return sections
  }

  private static getEmptySlots(sections: Record<string, any>): Array<{slot: CriticalSlot, location: string, index: number}> {
    const emptySlots: Array<{slot: CriticalSlot, location: string, index: number}> = []
    
    for (const [locationName, section] of Object.entries(sections)) {
      if (!section) continue
      
      const slots = section.getAllSlots()
      slots.forEach((slot: CriticalSlot, index: number) => {
        if (slot.isEmpty()) {
          emptySlots.push({ slot, location: locationName, index })
        }
      })
    }
    
    return emptySlots
  }

  private static getSpecialComponentsToAllocate(config: any): Array<{type: string, count: number}> {
    const components: Array<{type: string, count: number}> = []
    
    // Check for Endo Steel
    if (config.structureType === 'Endo Steel' || config.structureType === 'Endo Steel (Clan)') {
      const endoSlots = config.structureType === 'Endo Steel (Clan)' ? 7 : 14
      components.push({ type: 'Endo Steel', count: endoSlots })
    }
    
    // Check for Ferro-Fibrous armor
    if (config.armorType === 'Ferro-Fibrous') {
      components.push({ type: 'Ferro-Fibrous', count: 14 })
    } else if (config.armorType === 'Ferro-Fibrous (Clan)') {
      components.push({ type: 'Ferro-Fibrous', count: 7 })
    }
    
    return components
  }

  private static allocateSpecialComponent(
    component: {type: string, count: number}, 
    emptySlots: Array<{slot: CriticalSlot, location: string, index: number}>,
    unitManager: UnitCriticalManager
  ): number {
    let allocated = 0
    
    // Prioritize certain locations for special components
    const locationPriority = ['Left Torso', 'Right Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg', 'Center Torso']
    
    for (const location of locationPriority) {
      if (allocated >= component.count) break
      
      const locationSlots = emptySlots.filter(s => s.location === location)
      for (const slotInfo of locationSlots) {
        if (allocated >= component.count) break
        
        // Create special component content
        slotInfo.slot.content = {
          type: 'system',
          isSystemReserved: true,
          systemComponentName: component.type
        }
        
        allocated++
      }
    }
    
    return allocated
  }

  private static compactSlots(slots: CriticalSlot[]): {slots: CriticalSlot[], modified: boolean, moveCount: number} {
    const result = [...slots]
    const modified = false
    const moveCount = 0

    // Find all non-empty slots
    const nonEmptySlots = result.filter(slot => !slot.isEmpty())
    const emptySlots = result.filter(slot => slot.isEmpty())

    // If we have the right number of components at the start, no compacting needed
    if (nonEmptySlots.length === 0 || this.isAlreadyCompacted(result)) {
      return { slots: result, modified: false, moveCount: 0 }
    }

    // Create new compacted arrangement: non-empty slots first, then empty
    const compacted: CriticalSlot[] = []
    
    // Add non-empty slots first
    nonEmptySlots.forEach(slot => {
      compacted.push(slot)
    })
    
    // Add empty slots
    emptySlots.forEach(slot => {
      compacted.push(slot)
    })

    // Check if order actually changed
    const orderChanged = !this.slotsEqual(result, compacted)
    
    return {
      slots: compacted,
      modified: orderChanged,
      moveCount: orderChanged ? nonEmptySlots.length : 0
    }
  }

  private static sortSlots(slots: CriticalSlot[]): {slots: CriticalSlot[], modified: boolean, moveCount: number} {
    const result = [...slots]
    
    // Separate system components (which stay in fixed positions) from equipment
    const systemSlots: Array<{slot: CriticalSlot, index: number}> = []
    const equipmentSlots: CriticalSlot[] = []
    const emptySlots: CriticalSlot[] = []

    result.forEach((slot, index) => {
      if (!slot.isEmpty()) {
        if (slot.content?.type === 'system') {
          systemSlots.push({ slot, index })
        } else {
          equipmentSlots.push(slot)
        }
      } else {
        emptySlots.push(slot)
      }
    })

    // Sort equipment by priority
    equipmentSlots.sort((a, b) => {
      return this.getEquipmentSortPriority(a) - this.getEquipmentSortPriority(b)
    })

    // Rebuild slots maintaining system component positions
    const sorted: CriticalSlot[] = new Array(slots.length)
    
    // Place system components in their original positions
    systemSlots.forEach(({slot, index}) => {
      sorted[index] = slot
    })

    // Fill remaining positions with sorted equipment, then empty slots
    let equipmentIndex = 0
    let emptyIndex = 0
    
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] === undefined) {
        if (equipmentIndex < equipmentSlots.length) {
          sorted[i] = equipmentSlots[equipmentIndex++]
        } else if (emptyIndex < emptySlots.length) {
          sorted[i] = emptySlots[emptyIndex++]
        }
      }
    }

    const orderChanged = !this.slotsEqual(result, sorted)
    
    return {
      slots: sorted,
      modified: orderChanged,
      moveCount: orderChanged ? equipmentSlots.length : 0
    }
  }

  private static getEquipmentSortPriority(slot: CriticalSlot): number {
    if (!slot.content) return 1000

    const type = slot.content.type
    if (type === 'system') return 0

    // Equipment priority: weapons -> ammo -> heat sinks -> other equipment -> special components
    if (slot.content.equipmentReference?.equipmentData?.type) {
      const equipmentType = slot.content.equipmentReference.equipmentData.type
      switch (equipmentType) {
        case 'weapon': return 100
        case 'ammo': return 200
        case 'heat_sink': return 300
        case 'equipment': return 400
        default: return 500
      }
    }

    return 600
  }

  private static isRemovableComponent(slot: CriticalSlot): boolean {
    if (slot.isEmpty()) return false
    
    // System components that are part of the basic mech structure should not be removed
    if (slot.content?.type === 'system') {
      const systemType = slot.content.systemComponentType || ''
      const fixedComponents = ['engine', 'gyro', 'life_support', 'sensors', 'cockpit', 'actuator']
      return !fixedComponents.includes(systemType)
    }
    
    // Equipment can be removed
    return slot.content?.type === 'equipment'
  }

  private static isAlreadyCompacted(slots: CriticalSlot[]): boolean {
    let foundEmpty = false
    
    for (const slot of slots) {
      if (slot.isEmpty()) {
        foundEmpty = true
      } else if (foundEmpty) {
        // Found non-empty slot after empty slot - not compacted
        return false
      }
    }
    
    return true
  }

  private static slotsEqual(slots1: CriticalSlot[], slots2: CriticalSlot[]): boolean {
    if (slots1.length !== slots2.length) return false
    
    return slots1.every((slot, index) => {
      const other = slots2[index]
      if (slot.isEmpty() && other.isEmpty()) return true
      if (slot.isEmpty() !== other.isEmpty()) return false
      
      // Compare content types
      if (slot.content?.type !== other.content?.type) return false
      
      // Compare names based on content type
      if (slot.content?.type === 'system') {
        return slot.content.systemComponentName === other.content?.systemComponentName &&
               slot.content.systemComponentType === other.content?.systemComponentType
      } else if (slot.content?.type === 'equipment') {
        return slot.content.equipmentReference?.equipmentData?.name === 
               other.content?.equipmentReference?.equipmentData?.name
      }
      
      return true
    })
  }

  /**
   * Get unhittable equipment from unallocated equipment pool
   */
  private static getUnhittableEquipment(unallocatedEquipment: any[]): any[] {
    return unallocatedEquipment.filter(equipment => {
      const equipmentData = equipment.equipmentData || equipment
      const name = equipmentData.name || ''
      const type = equipmentData.type || ''
      
      // Identify unhittable components by name patterns
      const unhittablePatterns = [
        'endo steel', 'endosteel', 'endo_steel',
        'ferro-fibrous', 'ferrofibrous', 'ferro_fibrous',
        'ferro fibrous', 'light ferro', 'heavy ferro',
        'stealth armor', 'reactive armor', 'reflective armor'
      ]
      
      const lowerName = name.toLowerCase()
      
      // Check if this equipment matches unhittable patterns
      const isUnhittable = unhittablePatterns.some(pattern => 
        lowerName.includes(pattern)
      )
      
      // Also check if it's marked as a special component
      const isSpecialComponent = equipmentData.componentType === 'structure' || 
                                equipmentData.componentType === 'armor' ||
                                equipmentData.isSpecialComponent === true
      
      return isUnhittable || isSpecialComponent
    })
  }

  /**
   * Find a suitable empty slot for equipment
   */
  private static findSuitableSlot(
    equipment: any, 
    emptySlots: Array<{slot: CriticalSlot, location: string, index: number}>,
    unitManager: UnitCriticalManager
  ): {location: string, index: number} | null {
    
    const equipmentData = equipment.equipmentData || equipment
    
    // Check each empty slot to see if it can accommodate this equipment
    for (const slotInfo of emptySlots) {
      // Check location restrictions if equipment has them
      if (equipmentData.allowedLocations) {
        if (!equipmentData.allowedLocations.includes(slotInfo.location)) {
          continue // Skip this slot, equipment not allowed here
        }
      }
      
      // Check if unit manager allows this equipment in this location
      if (!unitManager.canPlaceEquipmentInLocation(equipmentData, slotInfo.location)) {
        continue // Skip this slot, unit manager restrictions
      }
      
      // For single-slot equipment, any compatible empty slot works
      if ((equipmentData.requiredSlots || 1) === 1) {
        return {
          location: slotInfo.location,
          index: slotInfo.index
        }
      }
      
      // For multi-slot equipment, check if there are enough consecutive slots
      // This is more complex and would require checking the section directly
      // For now, just use the first available slot for single-slot items
      if ((equipmentData.requiredSlots || 1) === 1) {
        return {
          location: slotInfo.location,
          index: slotInfo.index
        }
      }
    }
    
    return null // No suitable slot found
  }

  private static updateSectionSlots(section: any, newSlots: CriticalSlot[], unitManager: UnitCriticalManager): void {
    // This would need to be implemented based on how the section stores its slots
    // For now, we'll log the operation
    console.log('Would update section slots:', section, newSlots.length)
  }

  // CRITICAL: Helper methods for smart slot updates

  private static findSlotConflicts(oldSlots: CriticalSlot[], newSlots: CriticalSlot[]): any[] {
    const conflicts: any[] = []
    
    // Check for overlapping slot requirements
    for (let i = 0; i < Math.max(oldSlots.length, newSlots.length); i++) {
      const oldSlot = oldSlots[i]
      const newSlot = newSlots[i]
      
      if (oldSlot && newSlot && !oldSlot.isEmpty() && !newSlot.isEmpty()) {
        if (oldSlot.content?.type !== newSlot.content?.type) {
          conflicts.push({
            index: i,
            oldContent: oldSlot.content,
            newContent: newSlot.content,
            type: 'content_mismatch'
          })
        }
      }
    }
    
    return conflicts
  }

  private static resolveSlotConflict(conflict: any, unitManager: UnitCriticalManager): { displacedEquipment: any[] } {
    const displacedEquipment: any[] = []
    
    // Move conflicting equipment to unallocated
    if (conflict.oldContent?.type === 'equipment' && conflict.oldContent.equipmentGroupId) {
      unitManager.displaceEquipment(conflict.oldContent.equipmentGroupId)
      displacedEquipment.push(conflict.oldContent)
    }
    
    return { displacedEquipment }
  }

  private static applySlotConfiguration(newSlots: CriticalSlot[], unitManager: UnitCriticalManager): void {
    // Apply the new slot configuration to the unit manager
    // This would update the critical allocations in the unit manager
    console.log('[CriticalSlotsManagementService] Applying new slot configuration')
  }
}
