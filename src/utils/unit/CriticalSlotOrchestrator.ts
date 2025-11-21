/**
 * Critical Slot Orchestrator - Equipment management across all critical sections
 * Handles allocation, movement, and tracking of equipment across the entire unit
 * Following SOLID principles - Single Responsibility for slot coordination
 */

import { CriticalSection } from '../criticalSlots/CriticalSection'
import { EquipmentObject, EquipmentAllocation } from '../criticalSlots/CriticalSlot'
import { UnitConfiguration } from '../criticalSlots/UnitCriticalManager'

export interface EquipmentLocation {
  section: CriticalSection | null
  allocation: EquipmentAllocation
}

export interface ISlotOrchestrator {
  // Equipment management
  allocateEquipment(groupId: string, location: string, slot: number): boolean
  removeEquipment(groupId: string): EquipmentAllocation | null
  moveEquipment(groupId: string, newLocation: string, newSlot: number): boolean
  
  // Equipment lookup
  findEquipmentGroup(groupId: string): EquipmentLocation | null
  getAllEquipment(): Map<string, EquipmentAllocation[]>
  getEquipmentByLocation(): Map<string, EquipmentAllocation[]>
  
  // Unallocated pool management
  getUnallocatedEquipment(): EquipmentAllocation[]
  addToUnallocatedPool(equipment: EquipmentAllocation[]): void
  removeFromUnallocatedPool(groupId: string): EquipmentAllocation | null
  clearUnallocatedPool(): void
  clearAllEquipment(): void
  
  // Section access
  getSection(location: string): CriticalSection | null
  getAllSections(): CriticalSection[]
  
  // Location restrictions
  canPlaceEquipmentInLocation(equipment: EquipmentObject, location: string, config: UnitConfiguration): boolean
  getLocationRestrictionError(equipment: EquipmentObject, location: string): string
  
  // Summary information
  getSummary(): {
    totalSections: number
    totalSlots: number
    occupiedSlots: number
    availableSlots: number
    totalEquipment: number
    unallocatedEquipment: number
  }
}

export class CriticalSlotOrchestrator implements ISlotOrchestrator {
  private sections: Map<string, CriticalSection>
  private unallocatedEquipment: EquipmentAllocation[]

  constructor(sections: Map<string, CriticalSection>) {
    this.sections = new Map(sections)
    this.unallocatedEquipment = []
  }

  /**
   * Allocate equipment from unallocated pool to specific location and slot
   */
  allocateEquipment(groupId: string, location: string, slot: number): boolean {
    console.log(`[SlotOrchestrator] Allocating equipment ${groupId} to ${location} slot ${slot}`)
    
    // Find and remove equipment from unallocated pool
    const equipment = this.removeFromUnallocatedPool(groupId)
    if (!equipment) {
      console.error(`[SlotOrchestrator] Equipment ${groupId} not found in unallocated pool`)
      return false
    }
    
    console.log(`[SlotOrchestrator] Found equipment in unallocated pool:`, {
      name: equipment.equipmentData.name,
      groupId: equipment.equipmentGroupId
    })
    
    // Get target section
    const section = this.getSection(location)
    if (!section) {
      console.error(`[SlotOrchestrator] Section ${location} not found`)
      // Restore to unallocated if section not found
      this.addToUnallocatedPool([equipment])
      return false
    }
    
    // Attempt allocation
    const success = section.allocateEquipment(equipment.equipmentData, slot, groupId)
    
    if (!success) {
      console.error(`[SlotOrchestrator] Failed to allocate equipment to ${location} slot ${slot}`)
      // Restore to unallocated if allocation failed
      this.addToUnallocatedPool([equipment])
    } else {
      console.log(`[SlotOrchestrator] Successfully allocated ${equipment.equipmentData.name} to ${location} slot ${slot}`)
    }
    
    return success
  }

  /**
   * Remove equipment by group ID and return it
   */
  removeEquipment(groupId: string): EquipmentAllocation | null {
    console.log(`[SlotOrchestrator] Removing equipment ${groupId}`)
    
    // First try allocated equipment
    const sectionsArray = Array.from(this.sections.entries())
    for (const [location, section] of sectionsArray) {
      const removed = section.removeEquipmentGroup(groupId)
      if (removed) {
        console.log(`[SlotOrchestrator] Removed equipment from ${section.getLocation()}`)
        return removed
      }
    }
    
    // Then try unallocated equipment
    const removed = this.removeFromUnallocatedPool(groupId)
    if (removed) {
      console.log(`[SlotOrchestrator] Removed equipment from unallocated pool`)
      return removed
    }
    
    console.warn(`[SlotOrchestrator] Equipment ${groupId} not found`)
    return null
  }

  /**
   * Move equipment to new location and slot
   */
  moveEquipment(groupId: string, newLocation: string, newSlot: number): boolean {
    console.log(`[SlotOrchestrator] Moving equipment ${groupId} to ${newLocation} slot ${newSlot}`)
    
    // Remove equipment from current location
    const equipment = this.removeEquipment(groupId)
    if (!equipment) {
      console.error(`[SlotOrchestrator] Cannot move equipment ${groupId} - not found`)
      return false
    }
    
    // Get target section
    const section = this.getSection(newLocation)
    if (!section) {
      console.error(`[SlotOrchestrator] Target section ${newLocation} not found`)
      // Restore to unallocated if section not found
      this.addToUnallocatedPool([equipment])
      return false
    }
    
    // Attempt allocation to new location
    const success = section.allocateEquipment(equipment.equipmentData, newSlot, groupId)
    
    if (!success) {
      console.error(`[SlotOrchestrator] Failed to move equipment to ${newLocation} slot ${newSlot}`)
      // Restore to unallocated if allocation failed
      this.addToUnallocatedPool([equipment])
    } else {
      console.log(`[SlotOrchestrator] Successfully moved ${equipment.equipmentData.name} to ${newLocation} slot ${newSlot}`)
    }
    
    return success
  }

  /**
   * Find equipment group by ID across all sections
   */
  findEquipmentGroup(groupId: string): EquipmentLocation | null {
    // Search allocated equipment
    const sectionsArray = Array.from(this.sections.values())
    for (const section of sectionsArray) {
      const allocation = section.getAllEquipment().find((eq: EquipmentAllocation) => eq.equipmentGroupId === groupId)
      if (allocation) {
        return { section, allocation }
      }
    }
    
    // Search unallocated equipment
    const unallocated = this.unallocatedEquipment.find((eq: EquipmentAllocation) => eq.equipmentGroupId === groupId)
    if (unallocated) {
      return { section: null, allocation: unallocated }
    }
    
    return null
  }

  /**
   * Get all equipment organized by equipment ID
   */
  getAllEquipment(): Map<string, EquipmentAllocation[]> {
    const allEquipment = new Map<string, EquipmentAllocation[]>()
    
    // Collect from all sections
    this.sections.forEach(section => {
      section.getAllEquipment().forEach(allocation => {
        const equipmentId = allocation.equipmentData.id
        if (!allEquipment.has(equipmentId)) {
          allEquipment.set(equipmentId, [])
        }
        allEquipment.get(equipmentId)!.push(allocation)
      })
    })
    
    // Add unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      const equipmentId = allocation.equipmentData.id
      if (!allEquipment.has(equipmentId)) {
        allEquipment.set(equipmentId, [])
      }
      allEquipment.get(equipmentId)!.push(allocation)
    })
    
    return allEquipment
  }

  /**
   * Get equipment organized by location
   */
  getEquipmentByLocation(): Map<string, EquipmentAllocation[]> {
    const equipmentByLocation = new Map<string, EquipmentAllocation[]>()
    
    this.sections.forEach((section, location) => {
      const equipment = section.getAllEquipment()
      if (equipment.length > 0) {
        equipmentByLocation.set(location, equipment)
      }
    })
    
    // Add unallocated as special location
    if (this.unallocatedEquipment.length > 0) {
      equipmentByLocation.set('Unallocated', [...this.unallocatedEquipment])
    }
    
    return equipmentByLocation
  }

  /**
   * Get unallocated equipment
   */
  getUnallocatedEquipment(): EquipmentAllocation[] {
    return [...this.unallocatedEquipment]
  }

  /**
   * Add equipment to unallocated pool
   */
  addToUnallocatedPool(equipment: EquipmentAllocation[]): void {
    equipment.forEach(eq => {
      // Clear location info since it's unallocated
      eq.location = ''
      eq.occupiedSlots = []
      eq.startSlotIndex = -1
      eq.endSlotIndex = -1
    })
    
    this.unallocatedEquipment.push(...equipment)
    console.log(`[SlotOrchestrator] Added ${equipment.length} equipment to unallocated pool. Total: ${this.unallocatedEquipment.length}`)
  }

  /**
   * Remove equipment from unallocated pool
   */
  removeFromUnallocatedPool(groupId: string): EquipmentAllocation | null {
    console.log(`[SlotOrchestrator] Removing ${groupId} from unallocated pool`)
    console.log(`[SlotOrchestrator] Current unallocated equipment:`, this.unallocatedEquipment.map(eq => ({
      name: eq.equipmentData.name,
      groupId: eq.equipmentGroupId
    })))
    
    const index = this.unallocatedEquipment.findIndex(eq => eq.equipmentGroupId === groupId)
    console.log(`[SlotOrchestrator] Found equipment at index: ${index}`)
    
    if (index >= 0) {
      const removed = this.unallocatedEquipment[index]
      
      // Create new array to ensure React detects the change
      this.unallocatedEquipment = this.unallocatedEquipment.filter(eq => eq.equipmentGroupId !== groupId)
      
      console.log(`[SlotOrchestrator] Successfully removed equipment:`, {
        name: removed.equipmentData.name,
        groupId: removed.equipmentGroupId
      })
      console.log(`[SlotOrchestrator] Remaining unallocated count: ${this.unallocatedEquipment.length}`)
      
      return removed
    }
    
    console.error(`[SlotOrchestrator] Equipment ${groupId} not found in unallocated pool`)
    console.error(`[SlotOrchestrator] Available group IDs:`, this.unallocatedEquipment.map(eq => eq.equipmentGroupId))
    return null
  }

  /**
   * Clear all unallocated equipment
   */
  clearUnallocatedPool(): void {
    const count = this.unallocatedEquipment.length
    this.unallocatedEquipment = []
    console.log(`[SlotOrchestrator] Cleared ${count} equipment from unallocated pool`)
  }

  /**
   * Get specific section by location name
   */
  getSection(location: string): CriticalSection | null {
    return this.sections.get(location) || null
  }

  /**
   * Get all sections
   */
  getAllSections(): CriticalSection[] {
    return Array.from(this.sections.values())
  }

  /**
   * Check if equipment can be placed in specified location
   */
  canPlaceEquipmentInLocation(equipment: EquipmentObject, location: string, config: UnitConfiguration): boolean {
    // Check static location restrictions
    if (equipment.allowedLocations) {
      return equipment.allowedLocations.includes(location)
    }
    
    // Check dynamic location restrictions
    if (equipment.locationRestrictions) {
      switch (equipment.locationRestrictions.type) {
        case 'engine_slots':
          return this.hasEngineSlots(location, config)
        case 'custom':
          return equipment.locationRestrictions.validator?.(this, location) ?? false
        case 'static':
          // Should use allowedLocations instead, but handle gracefully
          return true
      }
    }
    
    // Default: allow anywhere (for backwards compatibility)
    return true
  }

  /**
   * Get validation error message for equipment location restriction
   */
  getLocationRestrictionError(equipment: EquipmentObject, location: string): string {
    if (equipment.allowedLocations) {
      return `${equipment.name} can only be placed in: ${equipment.allowedLocations.join(', ')}`
    }
    
    if (equipment.locationRestrictions?.type === 'engine_slots') {
      return `${equipment.name} can only be placed in locations with engine slots (depends on engine type)`
    }
    
    return `${equipment.name} cannot be placed in ${location}`
  }

  /**
   * Check if a location has engine slots based on configuration
   */
  private hasEngineSlots(location: string, config: UnitConfiguration): boolean {
    const { SystemComponentRules } = require('../criticalSlots/SystemComponentRules')
    
    // Check if this location has engine slots based on current engine configuration
    const engineAllocation = SystemComponentRules.getCompleteSystemAllocation(
      config.engineType,
      config.gyroType
    )
    
    switch (location) {
      case 'Center Torso':
        return engineAllocation.engine.centerTorso.length > 0
      case 'Left Torso':
        return engineAllocation.engine.leftTorso.length > 0
      case 'Right Torso':
        return engineAllocation.engine.rightTorso.length > 0
      default:
        return false
    }
  }

  /**
   * Displace equipment to unallocated pool
   */
  displaceEquipment(groupId: string): boolean {
    const equipment = this.removeEquipment(groupId)
    if (equipment) {
      this.addToUnallocatedPool([equipment])
      return true
    }
    return false
  }

  /**
   * Clear all equipment from sections and unallocated pool
   */
  clearAllEquipment(): void {
    console.log('[SlotOrchestrator] Clearing all equipment')
    
    const beforeUnallocated = this.unallocatedEquipment.length
    
    // Get complete inventory before clearing
    let totalEquipmentCount = 0
    this.sections.forEach(section => {
      totalEquipmentCount += section.getAllEquipment().length
    })
    totalEquipmentCount += this.unallocatedEquipment.length
    
    console.log(`[SlotOrchestrator] Before clearing - Allocated: ${totalEquipmentCount - beforeUnallocated}, Unallocated: ${beforeUnallocated}, Total: ${totalEquipmentCount}`)
    
    // Clear unallocated equipment
    this.clearUnallocatedPool()
    
    // Clear equipment from all sections
    this.sections.forEach((section, location) => {
      const beforeSection = section.getAllEquipment().length
      
      // Get all equipment and remove each one
      const allEquipment = [...section.getAllEquipment()] // Copy array to avoid modification during iteration
      allEquipment.forEach(equipment => {
        section.removeEquipmentGroup(equipment.equipmentGroupId)
      })
      
      const afterSection = section.getAllEquipment().length
      console.log(`[SlotOrchestrator] ${location} - Removed ${beforeSection - afterSection} equipment pieces`)
    })
    
    // Verify complete clearing
    let remainingEquipmentCount = 0
    this.sections.forEach(section => {
      remainingEquipmentCount += section.getAllEquipment().length
    })
    remainingEquipmentCount += this.unallocatedEquipment.length
    
    console.log(`[SlotOrchestrator] After clearing - Total remaining equipment: ${remainingEquipmentCount}`)
    
    if (remainingEquipmentCount > 0) {
      console.error('[SlotOrchestrator] WARNING - Equipment still remains after clearing!')
      this.sections.forEach((section, location) => {
        const remaining = section.getAllEquipment()
        if (remaining.length > 0) {
          console.error(`  ${location}: ${remaining.length} pieces:`, remaining.map(eq => eq.equipmentData.name))
        }
      })
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalSections: number
    totalSlots: number
    occupiedSlots: number
    availableSlots: number
    totalEquipment: number
    unallocatedEquipment: number
  } {
    let totalSlots = 0
    let occupiedSlots = 0
    let totalEquipment = 0
    
    this.sections.forEach(section => {
      totalSlots += section.getTotalSlots()
      const equipment = section.getAllEquipment()
      totalEquipment += equipment.length
      
      // Count occupied slots
      equipment.forEach(eq => {
        occupiedSlots += eq.occupiedSlots.length
      })
    })
    
    return {
      totalSections: this.sections.size,
      totalSlots,
      occupiedSlots,
      availableSlots: totalSlots - occupiedSlots,
      totalEquipment,
      unallocatedEquipment: this.unallocatedEquipment.length
    }
  }
}
