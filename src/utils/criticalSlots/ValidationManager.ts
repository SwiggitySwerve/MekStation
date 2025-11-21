/**
 * Validation Manager
 * Handles unit validation, state serialization, and validation results
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { CriticalSection } from './CriticalSection'
import { EquipmentAllocation } from './CriticalSlot'
import { 
  UnitConfiguration, 
  UnitValidationResult, 
  CompleteUnitState, 
  SerializedEquipment, 
  SerializedSlotAllocations,
  StateValidationResult 
} from './UnitCriticalManagerTypes'
// Define CriticalSlotBreakdown locally since it's not exported from CriticalSlotCalculator
interface CriticalSlotBreakdown {
  totalSlots: number
  usedSlots: number
  availableSlots: number
  systemSlots: number
  equipmentSlots: number
}

export class ValidationManager {
  private sections: Map<string, CriticalSection>
  private unallocatedEquipment: EquipmentAllocation[]
  private configuration: UnitConfiguration

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
   * Validate the complete unit state
   */
  validate(): UnitValidationResult {
    const result: UnitValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      sectionResults: []
    }

    // Validate critical slot allocation
    this.validateCriticalSlots(result)

    // Validate weight limits
    this.validateWeightLimits(result)

    // Validate heat management
    this.validateHeatManagement(result)

    // Validate equipment placement
    this.validateEquipmentPlacement(result)

    return result
  }

  /**
   * Validate critical slot allocation
   */
  private validateCriticalSlots(result: UnitValidationResult): void {
    // Check for over-capacity slots
    this.sections.forEach(section => {
      const slots = section.getAllSlots()
      slots.forEach(slot => {
        if (slot.hasEquipment() && slot.content?.equipmentReference) {
          const equipment = slot.content.equipmentReference
          if (equipment.occupiedSlots.length > equipment.equipmentData.requiredSlots) {
            result.isValid = false
            result.errors.push(
              `${equipment.equipmentData.name} in ${section.location} exceeds required slots`
            )
          }
        }
      })
    })
  }

  /**
   * Validate weight limits
   */
  private validateWeightLimits(result: UnitValidationResult): void {
    // This would integrate with WeightBalanceManager
    // For now, placeholder validation
    const totalWeight = this.calculateTotalWeight()
    if (totalWeight > this.configuration.tonnage) {
      result.isValid = false
      result.errors.push(
        `Unit is ${(totalWeight - this.configuration.tonnage).toFixed(2)} tons overweight`
      )
    }
  }

  /**
   * Validate heat management
   */
  private validateHeatManagement(result: UnitValidationResult): void {
    // This would integrate with HeatManagementManager
    // For now, placeholder validation
    const totalHeat = this.calculateTotalHeat()
    const heatDissipation = this.calculateHeatDissipation()
    
    if (totalHeat > heatDissipation) {
      result.warnings.push(
        `Heat generation (${totalHeat}) exceeds dissipation (${heatDissipation})`
      )
    }
  }

  /**
   * Validate equipment placement
   */
  private validateEquipmentPlacement(result: UnitValidationResult): void {
    // Check for equipment in invalid locations
    this.sections.forEach(section => {
      const equipment = section.getAllEquipment()
      equipment.forEach(eq => {
        if (eq.equipmentData.allowedLocations && 
            !eq.equipmentData.allowedLocations.includes(section.location)) {
          result.isValid = false
          result.errors.push(
            `${eq.equipmentData.name} cannot be placed in ${section.location}`
          )
        }
      })
    })
  }

  /**
   * Serialize complete unit state
   */
  serializeCompleteState(): CompleteUnitState {
    const serializedEquipment: SerializedEquipment[] = []
    const serializedAllocations: SerializedSlotAllocations = {}

    // Serialize unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      serializedEquipment.push(this.serializeEquipment(allocation))
    })

    // Serialize allocated equipment
    this.sections.forEach((section, location) => {
      const allocations: { [slotIndex: number]: SerializedEquipment } = {}
      section.getAllEquipment().forEach(allocation => {
        allocation.occupiedSlots.forEach(slotIndex => {
          allocations[slotIndex] = this.serializeEquipment(allocation)
        })
      })
      if (Object.keys(allocations).length > 0) {
        serializedAllocations[location] = allocations
      }
    })

    return {
      version: '1.0',
      configuration: this.configuration,
      criticalSlotAllocations: serializedAllocations,
      unallocatedEquipment: serializedEquipment,
      timestamp: Date.now()
    }
  }

  /**
   * Serialize individual equipment allocation
   */
  private serializeEquipment(allocation: EquipmentAllocation): SerializedEquipment {
    return {
      equipmentGroupId: allocation.equipmentGroupId,
      equipmentData: allocation.equipmentData,
      location: allocation.location,
      occupiedSlots: [...allocation.occupiedSlots],
      startSlotIndex: allocation.startSlotIndex,
      endSlotIndex: allocation.endSlotIndex
    }
  }

  /**
   * Validate serialized state
   */
  validateSerializedState(state: CompleteUnitState): StateValidationResult {
    const result: StateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      canRecover: true
    }

    // Validate configuration
    if (!state.configuration) {
      result.isValid = false
      result.errors.push('Missing configuration in serialized state')
    }

    // Validate equipment data
    if (state.unallocatedEquipment) {
      state.unallocatedEquipment.forEach((eq: SerializedEquipment, index: number) => {
        if (!eq.equipmentGroupId) {
          result.isValid = false
          result.errors.push(`Unallocated equipment ${index} missing group ID`)
        }
        if (!eq.equipmentData) {
          result.isValid = false
          result.errors.push(`Unallocated equipment ${index} missing equipment data`)
        }
      })
    }

    // Validate allocated equipment
    if (state.criticalSlotAllocations) {
      Object.entries(state.criticalSlotAllocations).forEach(([location, allocations]) => {
        Object.entries(allocations).forEach(([slotIndex, eq]) => {
          if (!eq.equipmentGroupId) {
            result.isValid = false
            result.errors.push(`Allocated equipment in ${location} slot ${slotIndex} missing group ID`)
          }
          if (!eq.equipmentData) {
            result.isValid = false
            result.errors.push(`Allocated equipment in ${location} slot ${slotIndex} missing equipment data`)
          }
        })
      })
    }

    return result
  }

  /**
   * Get critical slot breakdown
   */
  getCriticalSlotBreakdown(): CriticalSlotBreakdown {
    let totalSlots = 0
    let usedSlots = 0
    let systemSlots = 0
    let equipmentSlots = 0

    this.sections.forEach(section => {
      const slots = section.getAllSlots()
      totalSlots += slots.length
      
      slots.forEach(slot => {
        if (slot.isSystemSlot()) {
          systemSlots++
          usedSlots++
        } else if (slot.hasEquipment()) {
          equipmentSlots++
          usedSlots++
        }
      })
    })

    return {
      totalSlots,
      usedSlots,
      availableSlots: totalSlots - usedSlots,
      systemSlots,
      equipmentSlots
    }
  }

  /**
   * Get user equipment slot status
   */
  getUserEquipmentSlotStatus(): {
    totalUserSlots: number
    usedUserSlots: number
    availableUserSlots: number
  } {
    let totalUserSlots = 0
    let usedUserSlots = 0

    this.sections.forEach(section => {
      const slots = section.getAllSlots()
      totalUserSlots += slots.length
      
      slots.forEach(slot => {
        if (slot.isSystemSlot()) {
          // System slots are not available for user equipment
          totalUserSlots--
        } else if (slot.hasEquipment()) {
          usedUserSlots++
        }
      })
    })

    return {
      totalUserSlots,
      usedUserSlots,
      availableUserSlots: totalUserSlots - usedUserSlots
    }
  }

  /**
   * Get unit summary
   */
  getSummary(): {
    totalSections: number
    totalSlots: number
    occupiedSlots: number
    availableSlots: number
    totalEquipment: number
    unallocatedEquipment: number
    systemSlots: number
    totalWeight: number
    heatGenerated: number
    heatDissipated: number
  } {
    const breakdown = this.getCriticalSlotBreakdown()
    const totalWeight = this.calculateTotalWeight()
    const heatGenerated = this.calculateTotalHeat()
    const heatDissipated = this.calculateHeatDissipation()

    return {
      totalSections: this.sections.size,
      totalSlots: breakdown.totalSlots,
      occupiedSlots: breakdown.usedSlots,
      availableSlots: breakdown.availableSlots,
      totalEquipment: breakdown.equipmentSlots + this.unallocatedEquipment.length,
      unallocatedEquipment: this.unallocatedEquipment.length,
      systemSlots: breakdown.systemSlots,
      totalWeight,
      heatGenerated,
      heatDissipated
    }
  }

  /**
   * Calculate total weight (placeholder - would integrate with WeightBalanceManager)
   */
  private calculateTotalWeight(): number {
    let totalWeight = 0
    this.unallocatedEquipment.forEach(equipment => {
      totalWeight += equipment.equipmentData.weight || 0
    })
    return totalWeight
  }

  /**
   * Calculate total heat (placeholder - would integrate with HeatManagementManager)
   */
  private calculateTotalHeat(): number {
    let totalHeat = 0
    this.unallocatedEquipment.forEach(equipment => {
      if (equipment.equipmentData.heat) {
        totalHeat += equipment.equipmentData.heat
      }
    })
    return totalHeat
  }

  /**
   * Calculate heat dissipation (placeholder - would integrate with HeatManagementManager)
   */
  private calculateHeatDissipation(): number {
    // Placeholder calculation
    return 10
  }

  /**
   * Update references
   */
  updateReferences(
    sections: Map<string, CriticalSection>,
    unallocatedEquipment: EquipmentAllocation[],
    configuration: UnitConfiguration
  ): void {
    this.sections = sections
    this.unallocatedEquipment = unallocatedEquipment
    this.configuration = configuration
  }
} 