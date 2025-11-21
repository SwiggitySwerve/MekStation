/**
 * Section Management Manager
 * Handles critical section management and operations
 */

import { CriticalSection, LocationSlotConfiguration } from './CriticalSection'
import { UnitConfiguration } from './UnitCriticalManagerTypes'

// Standard mech location configurations
const MECH_LOCATION_CONFIGS: LocationSlotConfiguration[] = [
  {
    location: 'Head',
    totalSlots: 6,
    fixedSlots: new Map([
      [0, { name: 'Life Support', slotIndex: 0, isRemovable: false, componentType: 'life_support' }],
      [1, { name: 'Sensors', slotIndex: 1, isRemovable: false, componentType: 'sensors' }],
      [2, { name: 'Standard Cockpit', slotIndex: 2, isRemovable: false, componentType: 'cockpit' }],
      [4, { name: 'Sensors', slotIndex: 4, isRemovable: false, componentType: 'sensors' }],
      [5, { name: 'Life Support', slotIndex: 5, isRemovable: false, componentType: 'life_support' }]
    ]),
    availableSlotIndices: [3], // Only slot 4 (index 3) available
    systemReservedSlots: []
  },
  {
    location: 'Center Torso',
    totalSlots: 12,
    fixedSlots: new Map(),
    availableSlotIndices: [], // Will be calculated based on engine/gyro
    systemReservedSlots: []
  },
  {
    location: 'Left Torso',
    totalSlots: 12,
    fixedSlots: new Map(),
    availableSlotIndices: [], // Will be calculated based on engine
    systemReservedSlots: []
  },
  {
    location: 'Right Torso',
    totalSlots: 12,
    fixedSlots: new Map(),
    availableSlotIndices: [], // Will be calculated based on engine
    systemReservedSlots: []
  },
  {
    location: 'Left Arm',
    totalSlots: 12,
    fixedSlots: new Map([
      [0, { name: 'Shoulder', slotIndex: 0, isRemovable: false, componentType: 'actuator' }],
      [1, { name: 'Upper Arm Actuator', slotIndex: 1, isRemovable: false, componentType: 'actuator' }],
      [2, { name: 'Lower Arm Actuator', slotIndex: 2, isRemovable: true, componentType: 'actuator' }],
      [3, { name: 'Hand Actuator', slotIndex: 3, isRemovable: true, componentType: 'actuator' }]
    ]),
    availableSlotIndices: [4, 5, 6, 7, 8, 9, 10, 11], // Slots 5-12 available
    systemReservedSlots: []
  },
  {
    location: 'Right Arm',
    totalSlots: 12,
    fixedSlots: new Map([
      [0, { name: 'Shoulder', slotIndex: 0, isRemovable: false, componentType: 'actuator' }],
      [1, { name: 'Upper Arm Actuator', slotIndex: 1, isRemovable: false, componentType: 'actuator' }],
      [2, { name: 'Lower Arm Actuator', slotIndex: 2, isRemovable: true, componentType: 'actuator' }],
      [3, { name: 'Hand Actuator', slotIndex: 3, isRemovable: true, componentType: 'actuator' }]
    ]),
    availableSlotIndices: [4, 5, 6, 7, 8, 9, 10, 11], // Slots 5-12 available
    systemReservedSlots: []
  },
  {
    location: 'Left Leg',
    totalSlots: 6,
    fixedSlots: new Map([
      [0, { name: 'Hip', slotIndex: 0, isRemovable: false, componentType: 'actuator' }],
      [1, { name: 'Upper Leg Actuator', slotIndex: 1, isRemovable: false, componentType: 'actuator' }],
      [2, { name: 'Lower Leg Actuator', slotIndex: 2, isRemovable: false, componentType: 'actuator' }],
      [3, { name: 'Foot Actuator', slotIndex: 3, isRemovable: false, componentType: 'actuator' }]
    ]),
    availableSlotIndices: [4, 5], // Only slots 5-6 available
    systemReservedSlots: []
  },
  {
    location: 'Right Leg',
    totalSlots: 6,
    fixedSlots: new Map([
      [0, { name: 'Hip', slotIndex: 0, isRemovable: false, componentType: 'actuator' }],
      [1, { name: 'Upper Leg Actuator', slotIndex: 1, isRemovable: false, componentType: 'actuator' }],
      [2, { name: 'Lower Leg Actuator', slotIndex: 2, isRemovable: false, componentType: 'actuator' }],
      [3, { name: 'Foot Actuator', slotIndex: 3, isRemovable: false, componentType: 'actuator' }]
    ]),
    availableSlotIndices: [4, 5], // Only slots 5-6 available
    systemReservedSlots: []
  }
]

export class SectionManagementManager {
  private sections: Map<string, CriticalSection>
  private configuration: UnitConfiguration

  constructor(configuration: UnitConfiguration) {
    this.configuration = configuration
    this.sections = new Map()
    this.initializeSections()
  }

  /**
   * Update the configuration
   */
  updateConfiguration(configuration: UnitConfiguration): void {
    this.configuration = configuration
    this.rebuildSections()
  }

  /**
   * Initialize critical sections
   */
  private initializeSections(): void {
    this.sections.clear()
    
    MECH_LOCATION_CONFIGS.forEach(config => {
      const section = new CriticalSection(config.location, config)
      this.sections.set(config.location, section)
    })
  }

  /**
   * Rebuild sections after configuration change
   */
  private rebuildSections(): void {
    this.initializeSections()
    this.allocateSystemComponents()
  }

  /**
   * Allocate system components to sections
   */
  private allocateSystemComponents(): void {
    // This would be handled by SystemComponentsManager
    // Placeholder for now
  }

  /**
   * Get a specific section by location
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
   * Get all section locations
   */
  getAllSectionLocations(): string[] {
    return Array.from(this.sections.keys())
  }

  /**
   * Check if a section exists
   */
  hasSection(location: string): boolean {
    return this.sections.has(location)
  }

  /**
   * Get total critical slots across all sections
   */
  getTotalCriticalSlots(): number {
    return Array.from(this.sections.values()).reduce((total, section) => {
      return total + section.getTotalSlots()
    }, 0)
  }

  /**
   * Get total used critical slots across all sections
   */
  getTotalUsedCriticalSlots(): number {
    return Array.from(this.sections.values()).reduce((total, section) => {
      const usedSlots = section.getAllSlots().filter(slot => !slot.isEmpty()).length
      return total + usedSlots
    }, 0)
  }

  /**
   * Get remaining critical slots across all sections
   */
  getRemainingCriticalSlots(): number {
    return this.getTotalCriticalSlots() - this.getTotalUsedCriticalSlots()
  }

  /**
   * Get critical slot breakdown by location
   */
  getCriticalSlotBreakdown(): Record<string, { total: number, used: number, available: number }> {
    const breakdown: Record<string, { total: number, used: number, available: number }> = {}
    
    this.sections.forEach((section, location) => {
      const total = section.getTotalSlots()
      const used = section.getAllSlots().filter(slot => !slot.isEmpty()).length
      const available = section.getAvailableSlots().length
      
      breakdown[location] = { total, used, available }
    })
    
    return breakdown
  }

  /**
   * Check if a location has engine slots
   */
  hasEngineSlots(location: string): boolean {
    const section = this.getSection(location)
    if (!section) return false
    
    // Check if the section has engine-related fixed slots
    // Note: Engine slots are typically reserved dynamically, not as fixed components
    // This method would need to check for dynamically reserved engine slots
    return false
  }

  /**
   * Get available slots for a location
   */
  getAvailableSlotsForLocation(location: string): number[] {
    const section = this.getSection(location)
    if (!section) return []
    
    return section.getAvailableSlots()
  }

  /**
   * Get used slots for a location
   */
  getUsedSlotsForLocation(location: string): number[] {
    const section = this.getSection(location)
    if (!section) return []
    
    return section.getAllSlots()
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => !slot.isEmpty())
      .map(({ index }) => index)
  }

  /**
   * Get fixed slots for a location
   */
  getFixedSlotsForLocation(location: string): Map<number, any> {
    const section = this.getSection(location)
    if (!section) return new Map()
    
    return section.getConfiguration().fixedSlots
  }

  /**
   * Clear all sections
   */
  clearAllSections(): void {
    this.sections.clear()
  }

  /**
   * Reset sections to default state
   */
  resetSections(): void {
    this.initializeSections()
  }
} 