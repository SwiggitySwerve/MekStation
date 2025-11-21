/**
 * Equipment Allocation Manager
 * Handles all logic for equipment allocation, placement, auto-allocation, and slot finding
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { CriticalSection } from './CriticalSection'
import { EquipmentObject, EquipmentAllocation } from './CriticalSlot'
import { UnitConfiguration } from './UnitCriticalManagerTypes'
import { SystemComponentRules } from './SystemComponentRules'
import { UnitCriticalManager } from './UnitCriticalManager'

export class EquipmentAllocationManager {
  private sections: Map<string, CriticalSection>
  private unitManager: UnitCriticalManager
  private configuration: UnitConfiguration

  constructor(
    unitManager: UnitCriticalManager,
    sections: Map<string, CriticalSection>,
    configuration: UnitConfiguration
  ) {
    this.unitManager = unitManager
    this.sections = sections
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
    return EquipmentAllocationManager.hasComponentType(equipment) ? equipment.componentType : undefined
  }

  getAllEquipmentGroups(): Array<{ groupId: string, equipmentReference: EquipmentAllocation }> {
    const groups: Array<{ groupId: string, equipmentReference: EquipmentAllocation }> = []
    this.sections.forEach(section => {
      section.getAllEquipment().forEach(allocation => {
        groups.push({
          groupId: allocation.equipmentGroupId,
          equipmentReference: allocation
        })
      })
    })
    this.unitManager.unallocatedEquipment.forEach(allocation => {
      groups.push({
        groupId: allocation.equipmentGroupId,
        equipmentReference: allocation
      })
    })
    return groups
  }

  findEquipmentGroup(equipmentGroupId: string): { section: CriticalSection | null, allocation: EquipmentAllocation } | null {
    for (const section of Array.from(this.sections.values())) {
      const allocation = section.getAllEquipment().find((eq: EquipmentAllocation) => eq.equipmentGroupId === equipmentGroupId)
      if (allocation) {
        return { section, allocation }
      }
    }
    const unallocated = this.unitManager.unallocatedEquipment.find((eq: EquipmentAllocation) => eq.equipmentGroupId === equipmentGroupId)
    if (unallocated) {
      return { section: null, allocation: unallocated }
    }
    return null
  }

  getEquipmentByLocation(): Map<string, EquipmentAllocation[]> {
    const equipmentByLocation = new Map<string, EquipmentAllocation[]>()
    this.sections.forEach((section, location) => {
      const equipment = section.getAllEquipment()
      if (equipment.length > 0) {
        equipmentByLocation.set(location, equipment)
      }
    })
    if (this.unitManager.unallocatedEquipment.length > 0) {
      equipmentByLocation.set('Unallocated', [...this.unitManager.unallocatedEquipment])
    }
    return equipmentByLocation
  }

  getUnallocatedEquipment(): EquipmentAllocation[] {
    return [...this.unitManager.unallocatedEquipment]
  }

  addUnallocatedEquipment(equipment: EquipmentAllocation[]): void {
    this.unitManager.addUnallocatedEquipment(equipment)
  }

  removeUnallocatedEquipment(equipmentGroupId: string): EquipmentAllocation | null {
    return this.unitManager.removeUnallocatedEquipment(equipmentGroupId)
  }

  displaceEquipment(equipmentGroupId: string): boolean {
    const found = this.findEquipmentGroup(equipmentGroupId)
    if (!found || !found.section) return false
    const removedEquipment = found.section.removeEquipmentGroup(equipmentGroupId)
    if (removedEquipment) {
      this.addUnallocatedEquipment([removedEquipment])
      return true
    }
    return false
  }

  canPlaceEquipmentInLocation(equipment: EquipmentObject, location: string): boolean {
    if (equipment.allowedLocations) {
      return equipment.allowedLocations.includes(location)
    }
    if (equipment.locationRestrictions) {
      switch (equipment.locationRestrictions.type) {
        case 'engine_slots':
          return this.hasEngineSlots(location)
        case 'custom':
          return equipment.locationRestrictions.validator?.(this.unitManager, location) ?? false
        case 'static':
          return true
      }
    }
    return true
  }

  hasEngineSlots(location: string): boolean {
    const section = this.sections.get(location)
    if (!section) return false
    const engineAllocation = SystemComponentRules.getCompleteSystemAllocation(
      this.configuration.engineType,
      this.configuration.gyroType
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

  getLocationRestrictionError(equipment: EquipmentObject, location: string): string {
    if (equipment.allowedLocations) {
      return `${equipment.name} can only be placed in: ${equipment.allowedLocations.join(', ')}`
    }
    if (equipment.locationRestrictions?.type === 'engine_slots') {
      return `${equipment.name} can only be placed in locations with engine slots (depends on engine type)`
    }
    return `${equipment.name} cannot be placed in ${location}`
  }

  allocateEquipmentFromPool(equipmentGroupId: string, location: string, startSlot: number): boolean {
    const equipment = this.removeUnallocatedEquipment(equipmentGroupId)
    if (!equipment) {
      console.error('[EquipmentAllocationManager] FAILED: Could not remove equipment', equipmentGroupId)
      return false
    }
    if (!this.canPlaceEquipmentInLocation(equipment.equipmentData, location)) {
      console.warn('[EquipmentAllocationManager] Location restriction failed for', equipment.equipmentData.name, 'in', location)
      this.addUnallocatedEquipment([equipment])
      return false
    }
    const section = this.sections.get(location)
    if (!section) {
      console.error('[EquipmentAllocationManager] FAILED: Section not found:', location)
      this.addUnallocatedEquipment([equipment])
      return false
    }
    console.log('[EquipmentAllocationManager] Attempting to allocate', equipment.equipmentData.name, 'to', location, 'at slot', startSlot, 'with groupId', equipmentGroupId)
    const success = section.allocateEquipment(equipment.equipmentData, startSlot, equipmentGroupId)
    if (!success) {
      console.error('[EquipmentAllocationManager] FAILED: Section allocation failed for', equipment.equipmentData.name, 'in', location, 'at slot', startSlot)
      this.addUnallocatedEquipment([equipment])
    } else {
      console.log('[EquipmentAllocationManager] SUCCESS: Equipment', equipment.equipmentData.name, 'allocated to', location, 'slot', startSlot)
    }
    return success
  }

  /**
   * Sync unallocated equipment from UnitCriticalManager
   */
  // syncUnallocatedEquipment(unallocatedEquipment: EquipmentAllocation[]): void {
  //   this.unallocatedEquipment = [...unallocatedEquipment]
  // }

  /**
   * Auto-allocate all unallocated equipment using intelligent priority-based placement
   */
  autoAllocateEquipment(): {
    success: boolean
    message: string
    slotsModified: number
    placedEquipment: number
    failedEquipment: number
    failureReasons: string[]
  } {
    const allEquipment = this.unitManager.unallocatedEquipment
    if (allEquipment.length === 0) {
      return {
        success: true,
        message: 'No unallocated equipment to place',
        slotsModified: 0,
        placedEquipment: 0,
        failedEquipment: 0,
        failureReasons: []
      }
    }
    const specialStructure = allEquipment.filter(eq => 
      EquipmentAllocationManager.getComponentType(eq.equipmentData) === 'structure'
    )
    const specialArmor = allEquipment.filter(eq => 
      EquipmentAllocationManager.getComponentType(eq.equipmentData) === 'armor'
    )
    const normalEquipment = allEquipment.filter(eq => 
      !EquipmentAllocationManager.getComponentType(eq.equipmentData)
    )
    let placedCount = 0
    let failureReasons: string[] = []

    // Allocate structure criticals (Endo Steel, etc)
    for (const eq of specialStructure) {
      const result = this.allocateSpecialCriticals(eq, 'structure')
      placedCount += result.placed
      failureReasons = failureReasons.concat(result.failures)
    }
    // Allocate armor criticals (Ferro-Fibrous, etc)
    for (const eq of specialArmor) {
      const result = this.allocateSpecialCriticals(eq, 'armor')
      placedCount += result.placed
      failureReasons = failureReasons.concat(result.failures)
    }

    // Allocate normal equipment
    const sortedEquipment = this.sortEquipmentByPriority([...normalEquipment])
    for (const equipment of sortedEquipment) {
      const placementResult = this.findAndAllocateEquipment(equipment)
      if (placementResult.success) {
        placedCount++
      } else {
        failureReasons.push(`${equipment.equipmentData.name}: ${placementResult.reason}`)
      }
    }
    const failedCount = failureReasons.length
    return {
      success: true,
      message: placedCount > 0
        ? `Placed ${placedCount} equipment items` + (failedCount > 0 ? `, ${failedCount} items could not be placed` : '')
        : `Could not place any equipment items`,
      slotsModified: placedCount,
      placedEquipment: placedCount,
      failedEquipment: failedCount,
      failureReasons
    }
  }

  private sortEquipmentByPriority(equipment: EquipmentAllocation[]): EquipmentAllocation[] {
    return equipment.sort((a, b) => {
      const slotsA = a.equipmentData.requiredSlots || 1
      const slotsB = b.equipmentData.requiredSlots || 1
      if (slotsA !== slotsB) {
        return slotsB - slotsA
      }
      const priorityA = this.getEquipmentTypePriority(a.equipmentData)
      const priorityB = this.getEquipmentTypePriority(b.equipmentData)
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      return a.equipmentData.name.localeCompare(b.equipmentData.name)
    })
  }

  private getEquipmentTypePriority(equipment: EquipmentObject): number {
    if (this.isUnhittableEquipment(equipment)) {
      return 1
    }
    switch (equipment.type) {
      case 'weapon': return 2
      case 'ammo': return 3
      case 'heat_sink': return 4
      case 'equipment':
      default: return 5
    }
  }

  private isUnhittableEquipment(equipment: EquipmentObject): boolean {
    const componentType = EquipmentAllocationManager.getComponentType(equipment)
    const name = equipment.name.toLowerCase()
    if (componentType === 'structure' || componentType === 'armor') {
      return true
    }
    const unhittablePatterns = [
      'endo steel', 'endosteel', 'endo_steel',
      'ferro-fibrous', 'ferrofibrous', 'ferro_fibrous',
      'ferro fibrous', 'light ferro', 'heavy ferro',
      'stealth armor', 'reactive armor', 'reflective armor'
    ]
    return unhittablePatterns.some(pattern => name.includes(pattern))
  }

  private findAndAllocateEquipment(equipment: EquipmentAllocation): {
    success: boolean
    location?: string
    startSlot?: number
    reason?: string
  } {
    const equipmentData = equipment.equipmentData
    const requiredSlots = equipmentData.requiredSlots || 1
    const availablePlacements = this.findAvailablePlacements(equipmentData, requiredSlots)
    if (availablePlacements.length === 0) {
      return {
        success: false,
        reason: `No available ${requiredSlots}-slot space in allowed locations`
      }
    }
    const bestPlacement = this.selectBestPlacement(availablePlacements, equipmentData)
    const success = this.allocateEquipmentFromPool(
      equipment.equipmentGroupId,
      bestPlacement.location,
      bestPlacement.startSlot
    )
    if (success) {
      return {
        success: true,
        location: bestPlacement.location,
        startSlot: bestPlacement.startSlot
      }
    } else {
      return {
        success: false,
        reason: 'Allocation failed due to slot conflict'
      }
    }
  }

  private findAvailablePlacements(equipment: EquipmentObject, requiredSlots: number): Array<{
    location: string
    startSlot: number
    availableSlots: number
  }> {
    const placements: Array<{ location: string; startSlot: number; availableSlots: number }> = []
    const locationNames = this.getLocationPriorityOrder()
    console.log(`[EquipmentAllocationManager] Finding placements for ${equipment.name} (${requiredSlots} slots)`)
    for (const locationName of locationNames) {
      if (!this.canPlaceEquipmentInLocation(equipment, locationName)) {
        console.log(`[EquipmentAllocationManager] Cannot place ${equipment.name} in ${locationName} due to location restrictions`)
        continue
      }
      const section = this.sections.get(locationName)
      if (!section) {
        console.log(`[EquipmentAllocationManager] Section not found: ${locationName}`)
        continue
      }
      const consecutiveSlots = this.findConsecutiveEmptySlots(section, requiredSlots)
      console.log(`[EquipmentAllocationManager] Found ${consecutiveSlots.length} consecutive slot placements in ${locationName}`)
      consecutiveSlots.forEach(placement => {
        placements.push({
          location: locationName,
          startSlot: placement.startSlot,
          availableSlots: placement.consecutiveSlots
        })
      })
    }
    console.log(`[EquipmentAllocationManager] Total placements found for ${equipment.name}: ${placements.length}`)
    return placements
  }

  private getLocationPriorityOrder(): string[] {
    return [
      'Center Torso',
      'Left Torso',
      'Right Torso',
      'Left Arm',
      'Right Arm',
      'Left Leg',
      'Right Leg',
      'Head'
    ]
  }

  private findConsecutiveEmptySlots(section: CriticalSection, requiredSlots: number): Array<{
    startSlot: number
    consecutiveSlots: number
  }> {
    console.log(`[EquipmentAllocationManager] Finding ${requiredSlots} consecutive slots in ${section.location}`)
    const available = section.getAvailableSlots()
    console.log(`[EquipmentAllocationManager] Available slots in ${section.location}:`, available)
    const contiguousSlots = section.findContiguousAvailableSlots(requiredSlots)
    console.log(`[EquipmentAllocationManager] Contiguous slots found in ${section.location}:`, contiguousSlots)
    if (contiguousSlots) {
      return [{ startSlot: contiguousSlots[0], consecutiveSlots: requiredSlots }]
    }
    return []
  }

  private selectBestPlacement(
    placements: Array<{ location: string; startSlot: number; availableSlots: number }>,
    equipment: EquipmentObject
  ): { location: string; startSlot: number } {
    // For now, just pick the first available placement (could be enhanced)
    return { location: placements[0].location, startSlot: placements[0].startSlot }
  }

  /**
   * Allocate structure or armor special criticals (Endo Steel, Ferro-Fibrous, etc) one slot at a time
   */
  private allocateSpecialCriticals(eq: EquipmentAllocation, componentType: 'structure' | 'armor'): { placed: number, failures: string[] } {
    const failures: string[] = []
    let placed = 0
    const isClan = eq.equipmentData.name.includes('Clan')
    const slots = eq.equipmentData.requiredSlots
    // Patterns for IS/Clan structure and armor
    const structurePattern = isClan
      ? { 'Left Arm': 1, 'Right Arm': 1, 'Left Leg': 1, 'Right Leg': 1, 'Center Torso': 2, 'Left Torso': 1, 'Right Torso': 1 }
      : { 'Left Arm': 2, 'Right Arm': 2, 'Left Leg': 2, 'Right Leg': 2, 'Center Torso': 4, 'Left Torso': 1, 'Right Torso': 1 }
    const armorPattern = isClan
      ? { 'Left Arm': 1, 'Right Arm': 1, 'Left Leg': 1, 'Right Leg': 1, 'Center Torso': 2, 'Left Torso': 1, 'Right Torso': 1 }
      : { 'Left Arm': 2, 'Right Arm': 2, 'Left Leg': 2, 'Right Leg': 2, 'Center Torso': 4, 'Left Torso': 1, 'Right Torso': 1 }
    const pattern = componentType === 'structure' ? structurePattern : armorPattern
    let totalPlaced = 0
    let slotsRemaining = slots
    // Remove the original multi-slot allocation
    this.removeUnallocatedEquipment(eq.equipmentGroupId)
    for (const [location, count] of Object.entries(pattern)) {
      const section = this.sections.get(location)
      if (!section) {
        failures.push(`${eq.equipmentData.name}: Section ${location} not found`)
        continue
      }
      const available = section.getAvailableSlots()
      if (available.length < count) {
        failures.push(`${eq.equipmentData.name}: Not enough slots in ${location}`)
        continue
      }
      for (let i = 0; i < count && slotsRemaining > 0; i++) {
        // Create a single-slot allocation for each critical
        const singleSlotEq: EquipmentAllocation = {
          ...eq,
          equipmentData: { ...eq.equipmentData, requiredSlots: 1 },
          equipmentGroupId: `${eq.equipmentGroupId}_${location}_${i}`
        }
        const slot = available[i]
        const success = section.allocateEquipment(singleSlotEq.equipmentData, slot, singleSlotEq.equipmentGroupId)
        if (success) {
          placed++
          totalPlaced++
          slotsRemaining--
        } else {
          failures.push(`${eq.equipmentData.name}: Failed to allocate in ${location} slot ${slot}`)
        }
      }
    }
    return { placed: totalPlaced, failures }
  }
} 