/**
 * Critical Section - Location-based section management with slot tracking
 * Manages all slots for a specific mech location (Head, Torso, Arm, Leg)
 */

import { CriticalSlot, EquipmentObject, EquipmentAllocation, SlotValidationResult } from './CriticalSlot'
import { v4 as uuidv4 } from 'uuid'

export interface SectionValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  slotResults: SlotValidationResult[]
}

export interface LocationSlotConfiguration {
  location: string
  totalSlots: number
  fixedSlots: Map<number, FixedSystemComponent>
  availableSlotIndices: number[]
  systemReservedSlots: number[]
}

export interface FixedSystemComponent {
  name: string
  slotIndex: number
  isRemovable: boolean
  componentType: 'actuator' | 'life_support' | 'sensors' | 'cockpit'
}

export class CriticalSection {
  public readonly location: string
  private slots: CriticalSlot[]
  private equipmentRegistry: Map<string, EquipmentAllocation>
  private systemSlotReservations: Map<string, number[]>
  private configuration: LocationSlotConfiguration

  constructor(location: string, configuration: LocationSlotConfiguration) {
    this.location = location
    this.configuration = configuration
    this.slots = []
    this.equipmentRegistry = new Map()
    this.systemSlotReservations = new Map()

    // Initialize slots
    for (let i = 0; i < configuration.totalSlots; i++) {
      this.slots.push(new CriticalSlot(i, location))
    }

    // Set up fixed system components
    this.initializeFixedComponents()
  }

  /**
   * Initialize fixed system components (actuators, life support, etc.)
   */
  private initializeFixedComponents(): void {
    this.configuration.fixedSlots.forEach((component, slotIndex) => {
      const slot = this.slots[slotIndex]
      slot.reserveForSystem(component.componentType, component.name)
    })
  }

  /**
   * Get all slots in this section
   */
  getAllSlots(): CriticalSlot[] {
    return [...this.slots]
  }

  /**
   * Get specific slot by index
   */
  getSlot(slotIndex: number): CriticalSlot {
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      throw new Error(`Invalid slot index ${slotIndex} for location ${this.location}`)
    }
    return this.slots[slotIndex]
  }

  /**
   * Get all equipment allocated in this section
   */
  getAllEquipment(): EquipmentAllocation[] {
    return Array.from(this.equipmentRegistry.values())
  }

  /**
   * Get equipment at specific slot
   */
  getEquipmentAtSlot(slotIndex: number): EquipmentAllocation | null {
    const slot = this.getSlot(slotIndex)
    if (slot.content?.equipmentGroupId) {
      return this.equipmentRegistry.get(slot.content.equipmentGroupId) || null
    }
    return null
  }

  /**
   * Get available slot indices (not occupied by fixed components or equipment)
   */
  getAvailableSlots(): number[] {
    return this.slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.isEmpty())
      .map(({ index }) => index)
  }

  /**
   * Find contiguous available slots of specified count
   */
  findContiguousAvailableSlots(requiredSlots: number): number[] | null {
    const available = this.getAvailableSlots().sort((a, b) => a - b)
    
    for (let start = 0; start <= available.length - requiredSlots; start++) {
      const candidateSlots = []
      const currentSlot = available[start]
      
      // Check if we have enough contiguous slots
      for (let i = 0; i < requiredSlots; i++) {
        if (available.includes(currentSlot + i)) {
          candidateSlots.push(currentSlot + i)
        } else {
          break
        }
      }
      
      if (candidateSlots.length === requiredSlots) {
        return candidateSlots
      }
    }
    
    return null
  }

  /**
   * Check if section can accommodate equipment of specified slot count
   */
  canAccommodateEquipment(requiredSlots: number): boolean {
    return this.findContiguousAvailableSlots(requiredSlots) !== null
  }

  /**
   * Get maximum contiguous slots available
   */
  getMaxContiguousSlots(): number {
    const available = this.getAvailableSlots().sort((a, b) => a - b)
    let maxContiguous = 0
    let currentContiguous = 0
    
    for (let i = 0; i < available.length; i++) {
      if (i === 0 || available[i] === available[i - 1] + 1) {
        currentContiguous++
      } else {
        maxContiguous = Math.max(maxContiguous, currentContiguous)
        currentContiguous = 1
      }
    }
    
    return Math.max(maxContiguous, currentContiguous)
  }

  /**
   * Find equipment that conflicts with specified slots
   */
  findConflictingEquipment(reservedSlots: number[]): EquipmentAllocation[] {
    const conflictingEquipment = new Map<string, EquipmentAllocation>()
    
    reservedSlots.forEach(slotIndex => {
      const equipment = this.getEquipmentAtSlot(slotIndex)
      if (equipment) {
        conflictingEquipment.set(equipment.equipmentGroupId, equipment)
      }
    })
    
    return Array.from(conflictingEquipment.values())
  }

  /**
   * Reserve slots for system components (engine, gyro)
   */
  reserveSystemSlots(componentType: 'engine' | 'gyro' | 'actuator' | 'life_support' | 'sensors' | 'cockpit', slots: number[]): EquipmentAllocation[] {
    // First, identify and remove conflicting equipment
    const displacedEquipment = this.clearConflictingEquipment(slots)
    
    // Then reserve the slots
    slots.forEach(slotIndex => {
      const slot = this.getSlot(slotIndex)
      slot.reserveForSystem(componentType)
    })
    
    // Track the reservation
    this.systemSlotReservations.set(componentType, slots)
    
    return displacedEquipment
  }

  /**
   * Clear system reservations for specified component type
   */
  clearSystemReservations(componentType: string): EquipmentAllocation[] {
    const reservedSlots = this.systemSlotReservations.get(componentType)
    if (!reservedSlots) return []
    
    // Find and collect any equipment that will be displaced by clearing these slots
    const displacedEquipment = this.findConflictingEquipment(reservedSlots)
    
    // Remove the conflicting equipment
    const actuallyDisplaced: EquipmentAllocation[] = []
    displacedEquipment.forEach(equipment => {
      const removed = this.removeEquipmentGroup(equipment.equipmentGroupId)
      if (removed) {
        actuallyDisplaced.push(removed)
      }
    })
    
    // Clear the reserved slots
    reservedSlots.forEach(slotIndex => {
      const slot = this.getSlot(slotIndex)
      slot.clearSlot()
    })
    
    // Remove the reservation tracking
    this.systemSlotReservations.delete(componentType)
    
    return actuallyDisplaced
  }

  /**
   * Clear equipment that conflicts with specified slots
   */
  clearConflictingEquipment(reservedSlots: number[]): EquipmentAllocation[] {
    const conflictingEquipment = this.findConflictingEquipment(reservedSlots)
    const displacedEquipment: EquipmentAllocation[] = []
    
    conflictingEquipment.forEach(equipment => {
      const removed = this.removeEquipmentGroup(equipment.equipmentGroupId)
      if (removed) {
        displacedEquipment.push(removed)
      }
    })
    
    return displacedEquipment
  }

  /**
   * Allocate equipment to specific starting slot
   */
  allocateEquipment(
    equipment: EquipmentObject, 
    startSlot: number,
    equipmentGroupId: string = uuidv4()
  ): boolean {
    const requiredSlots = equipment.requiredSlots
    const endSlot = startSlot + requiredSlots - 1
    
    // Validate slot range
    if (endSlot >= this.slots.length) {
      console.error(`[CriticalSection] Allocation failed: endSlot ${endSlot} >= section length ${this.slots.length}`)
      return false
    }
    
    // Check if all required slots are available
    for (let i = startSlot; i <= endSlot; i++) {
      if (!this.slots[i].isEmpty()) {
        console.error(`[CriticalSection] Allocation failed: slot ${i} in ${this.location} is not empty. Slot content:`, this.slots[i])
        return false
      }
    }
    
    // Create allocation record
    const occupiedSlots = Array.from({ length: requiredSlots }, (_, i) => startSlot + i)
    const allocation: EquipmentAllocation = {
      equipmentGroupId,
      equipmentData: equipment,
      location: this.location,
      occupiedSlots,
      startSlotIndex: startSlot,
      endSlotIndex: endSlot
    }
    
    // Allocate to slots
    occupiedSlots.forEach(slotIndex => {
      this.slots[slotIndex].allocateEquipment(allocation, equipmentGroupId)
    })
    
    // Register equipment
    this.equipmentRegistry.set(equipmentGroupId, allocation)
    
    return true
  }

  /**
   * Remove specific equipment group atomically
   */
  removeEquipmentGroup(equipmentGroupId: string): EquipmentAllocation | null {
    const equipment = this.equipmentRegistry.get(equipmentGroupId)
    if (!equipment) return null
    
    // Clear all slots occupied by this equipment
    equipment.occupiedSlots.forEach(slotIndex => {
      this.slots[slotIndex].clearSlot()
    })
    
    // Remove from registry
    this.equipmentRegistry.delete(equipmentGroupId)
    
    return equipment
  }

  /**
   * Check if equipment can be moved to new position within this section
   */
  canMoveEquipmentToSlots(equipmentGroupId: string, newStartSlot: number): boolean {
    const equipment = this.equipmentRegistry.get(equipmentGroupId)
    if (!equipment) return false
    
    const requiredSlots = equipment.equipmentData.requiredSlots
    const newSlots = Array.from({ length: requiredSlots }, (_, i) => newStartSlot + i)
    
    // Check bounds
    if (newSlots[newSlots.length - 1] >= this.slots.length) return false
    
    // Temporarily clear equipment's current slots
    const originalSlots = equipment.occupiedSlots
    originalSlots.forEach(slotIndex => {
      this.slots[slotIndex].clearSlot()
    })
    
    // Check if new position is available
    const canMove = newSlots.every(slot => this.slots[slot].isEmpty())
    
    // Restore equipment to original position
    originalSlots.forEach(slotIndex => {
      this.slots[slotIndex].allocateEquipment(equipment, equipmentGroupId)
    })
    
    return canMove
  }

  /**
   * Move equipment to new position within this section
   */
  moveEquipmentToSlots(equipmentGroupId: string, newStartSlot: number): boolean {
    if (!this.canMoveEquipmentToSlots(equipmentGroupId, newStartSlot)) {
      return false
    }
    
    const equipment = this.removeEquipmentGroup(equipmentGroupId)
    if (!equipment) return false
    
    return this.allocateEquipment(equipment.equipmentData, newStartSlot, equipmentGroupId)
  }

  /**
   * Validate entire section
   */
  validate(): SectionValidationResult {
    const result: SectionValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      slotResults: []
    }
    
    // Validate each slot
    this.slots.forEach(slot => {
      const slotResult = slot.validate()
      result.slotResults.push(slotResult)
      
      if (!slotResult.isValid) {
        result.isValid = false
        result.errors.push(...slotResult.errors)
      }
      
      result.warnings.push(...slotResult.warnings)
    })
    
    // Check for equipment registry consistency
    this.equipmentRegistry.forEach((allocation, groupId) => {
      allocation.occupiedSlots.forEach(slotIndex => {
        const slot = this.slots[slotIndex]
        if (slot.content?.equipmentGroupId !== groupId) {
          result.isValid = false
          result.errors.push(
            `Equipment registry mismatch for group ${groupId} at slot ${slotIndex + 1}`
          )
        }
      })
    })
    
    return result
  }

  /**
   * Get location name
   */
  getLocation(): string {
    return this.location
  }

  /**
   * Get total slot count
   */
  getTotalSlots(): number {
    return this.slots.length
  }

  /**
   * Get section configuration
   */
  getConfiguration(): LocationSlotConfiguration {
    return { ...this.configuration }
  }
}
