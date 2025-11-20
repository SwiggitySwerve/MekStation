/**
 * Critical Slot - Individual slot management with self-validation
 * Part of the layered critical slot architecture
 */

export interface SlotContent {
  type: 'system' | 'equipment' | 'empty'
  equipmentGroupId?: string
  equipmentReference?: EquipmentAllocation
  isSystemReserved: boolean
  systemComponentType?: 'engine' | 'gyro' | 'actuator' | 'life_support' | 'sensors' | 'cockpit'
  systemComponentName?: string
}

export interface LocationRestrictions {
  type: 'static' | 'engine_slots' | 'custom'
  validator?: (unit: any, location: string) => boolean
}

export interface EquipmentObject {
  id: string
  name: string
  requiredSlots: number
  weight: number
  type: 'weapon' | 'ammo' | 'ammunition' | 'equipment' | 'heat_sink' | 'jump_jet'
  techBase: 'Inner Sphere' | 'Clan' | 'Both'
  heat?: number // Heat generated (positive) or dissipated (negative for heat sinks)
  damage?: number | string // Weapon damage
  tonnage?: number // Alias for weight, used in some contexts
  explosive?: boolean // Whether equipment is explosive (e.g., ammo)
  
  // Location restrictions
  allowedLocations?: string[] // Static restrictions - simple whitelist
  locationRestrictions?: LocationRestrictions // Dynamic restrictions - complex validation
}

export interface EquipmentAllocation {
  equipmentGroupId: string
  equipmentData: EquipmentObject
  location: string
  occupiedSlots: number[]
  startSlotIndex: number
  endSlotIndex: number
}

export interface SlotValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class CriticalSlot {
  public readonly slotIndex: number
  public readonly location: string
  public content: SlotContent | null

  constructor(slotIndex: number, location: string) {
    this.slotIndex = slotIndex
    this.location = location
    this.content = null
  }

  /**
   * Validate current slot state
   */
  validate(): SlotValidationResult {
    const result: SlotValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Check for orphaned equipment references
    if (this.content?.equipmentGroupId && !this.content.equipmentReference) {
      result.isValid = false
      result.errors.push(`Slot ${this.slotIndex + 1} has equipment group ID but no equipment reference`)
    }

    // Check for missing group ID with equipment
    if (this.content?.equipmentReference && !this.content.equipmentGroupId) {
      result.isValid = false
      result.errors.push(`Slot ${this.slotIndex + 1} has equipment reference but no group ID`)
    }

    return result
  }

  /**
   * Check if slot can accept equipment
   */
  canAcceptEquipment(equipment: EquipmentObject): boolean {
    // Slot must be empty or not system reserved
    if (this.content !== null) {
      // If occupied, check if it's system reserved
      return false
    }

    // Empty slot can accept equipment
    return true
  }

  /**
   * Check if slot is empty
   */
  isEmpty(): boolean {
    return this.content === null
  }

  /**
   * Check if slot contains system component
   */
  isSystemSlot(): boolean {
    return this.content?.type === 'system' || this.content?.isSystemReserved === true
  }

  /**
   * Check if slot contains equipment
   */
  hasEquipment(): boolean {
    return this.content?.type === 'equipment' && this.content.equipmentReference !== undefined
  }

  /**
   * Allocate equipment to this slot (part of multi-slot group)
   */
  allocateEquipment(equipmentReference: EquipmentAllocation, equipmentGroupId: string): void {
    if (!this.isEmpty()) {
      throw new Error(`Cannot allocate equipment to occupied slot ${this.slotIndex + 1}`)
    }

    this.content = {
      type: 'equipment',
      equipmentGroupId,
      equipmentReference,
      isSystemReserved: false
    }
  }

  /**
   * Reserve slot for system component
   */
  reserveForSystem(
    componentType: 'engine' | 'gyro' | 'actuator' | 'life_support' | 'sensors' | 'cockpit',
    componentName?: string
  ): void {
    this.content = {
      type: 'system',
      isSystemReserved: true,
      systemComponentType: componentType,
      systemComponentName: componentName
    }
  }

  /**
   * Clear slot and return equipment if present
   */
  clearSlot(): EquipmentAllocation | null {
    const equipment = this.content?.equipmentReference || null
    this.content = null
    return equipment
  }

  /**
   * Get reverse lookup information for equipment
   */
  getReverseLookup(): { location: string; slotIndex: number } | null {
    if (this.hasEquipment()) {
      return {
        location: this.location,
        slotIndex: this.slotIndex
      }
    }
    return null
  }

  /**
   * Get display name for slot content
   */
  getDisplayName(): string {
    if (!this.content) return '-Empty-'
    
    if (this.content.type === 'system') {
      // Use the specific component name if available
      if (this.content.systemComponentName) {
        return this.content.systemComponentName
      }
      
      // Fallback to generic names based on component type
      if (this.content.systemComponentType) {
        switch (this.content.systemComponentType) {
          case 'engine': return 'Engine'
          case 'gyro': return 'Gyro'
          case 'actuator': return 'Actuator'
          case 'life_support': return 'Life Support'
          case 'sensors': return 'Sensors'
          case 'cockpit': return 'Cockpit'
          default: return 'System'
        }
      }
    }
    
    if (this.content.type === 'equipment' && this.content.equipmentReference) {
      return this.content.equipmentReference.equipmentData.name
    }
    
    return '-Empty-'
  }

  /**
   * Get CSS class for slot styling
   */
  getSlotColorClass(): string {
    if (!this.content) return 'bg-gray-600'
    
    if (this.content.type === 'system') {
      switch (this.content.systemComponentType) {
        case 'engine': return 'bg-red-600'
        case 'gyro': return 'bg-purple-600'
        case 'actuator': return 'bg-blue-600'
        case 'life_support':
        case 'sensors':
        case 'cockpit': return 'bg-yellow-600'
        default: return 'bg-blue-600'
      }
    }
    
    if (this.content.type === 'equipment') {
      return 'bg-green-600'
    }
    
    return 'bg-gray-600'
  }
}
