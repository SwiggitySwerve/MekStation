/**
 * System Component Rules - Engine and Gyro slot allocation rules
 * Handles the complex logic for placing system components in critical slots
 */

import { ComponentConfiguration } from '../../types/componentConfiguration'
import { GyroType, StructureType, ArmorType, HeatSinkType } from '../../types/components'

// Re-export types for convenience
export type { GyroType, StructureType, ArmorType, HeatSinkType }

// Define EngineType locally since it's used throughout this file
export type EngineType = 'Standard' | 'XL' | 'Light' | 'XXL' | 'Compact' | 'ICE' | 'Fuel Cell'

export interface SystemAllocation {
  centerTorso: number[]
  leftTorso: number[]
  rightTorso: number[]
}

export interface SystemComponentChange {
  engineType: EngineType
  gyroType: GyroType
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class SystemComponentRules {
  /**
   * Get gyro slot allocation based on gyro type
   */
  static getGyroAllocation(gyroType: GyroType | ComponentConfiguration): SystemAllocation {
    const allocation: SystemAllocation = {
      centerTorso: [],
      leftTorso: [],
      rightTorso: []
    }

    // Handle both string and ComponentConfiguration types
    const gyroTypeString = typeof gyroType === 'string' ? gyroType : gyroType.type;

    switch (gyroTypeString) {
      case 'Standard':
        allocation.centerTorso = [3, 4, 5, 6] // Slots 4-7
        break
      case 'XL':
        allocation.centerTorso = [3, 4, 5, 6, 7, 8] // Slots 4-9
        break
      case 'Compact':
        allocation.centerTorso = [3, 4] // Slots 4-5
        break
      case 'Heavy-Duty':
        allocation.centerTorso = [3, 4, 5, 6] // Slots 4-7 (4 slots, same as Standard)
        break
    }

    return allocation
  }

  /**
   * Get engine slot allocation based on engine type (official BattleTech rules)
   * CRITICAL FIX: Engine placement is gyro-aware - engine slots come after gyro ends
   */
  static getEngineAllocation(engineType: EngineType, gyroType: GyroType | ComponentConfiguration): SystemAllocation {
    const allocation: SystemAllocation = {
      centerTorso: [],
      leftTorso: [],
      rightTorso: []
    }

    // Get gyro allocation to determine where engine's second slot group should start
    const gyroAllocation = this.getGyroAllocation(gyroType)
    const gyroEndSlot = gyroAllocation.centerTorso.length > 0 
      ? Math.max(...gyroAllocation.centerTorso) 
      : 2 // If no gyro slots, start after slot 3 (index 2)

    switch (engineType) {
      case 'Standard':
      case 'ICE':
      case 'Fuel Cell':
        // Standard engines: 6 slots total (3 before gyro + 3 after gyro)
        allocation.centerTorso = [0, 1, 2] // Always slots 1-3 first
        
        // Add 3 more slots after gyro ends
        for (let i = 1; i <= 3; i++) {
          const slot = gyroEndSlot + i
          if (slot < 12) { // Don't exceed CT slot limit
            allocation.centerTorso.push(slot)
          }
        }
        break
        
      case 'XL':
        // XL engines: 12 slots total (6 CT + 3 each side)
        allocation.centerTorso = [0, 1, 2] // Always slots 1-3 first
        
        // Add 3 more CT slots after gyro ends
        for (let i = 1; i <= 3; i++) {
          const slot = gyroEndSlot + i
          if (slot < 12) { // Don't exceed CT slot limit
            allocation.centerTorso.push(slot)
          }
        }
        
        // Side torso slots for XL engine
        allocation.leftTorso = [0, 1, 2]  // Slots 1-3
        allocation.rightTorso = [0, 1, 2] // Slots 1-3
        break
        
      case 'Light':
        // Light engines: 10 slots total (6 CT + 2 each side)
        allocation.centerTorso = [0, 1, 2] // Always slots 1-3 first
        
        // Add 3 more CT slots after gyro ends
        for (let i = 1; i <= 3; i++) {
          const slot = gyroEndSlot + i
          if (slot < 12) { // Don't exceed CT slot limit
            allocation.centerTorso.push(slot)
          }
        }
        
        // Two side torso slots for Light engine
        allocation.leftTorso = [0, 1]   // Slots 1-2
        allocation.rightTorso = [0, 1]  // Slots 1-2
        break
        
      case 'XXL':
        // XXL engines: 18 slots total (6 CT + 6 each side)
        allocation.centerTorso = [0, 1, 2] // Always slots 1-3 first
        
        // Add 3 more CT slots after gyro ends (for total of 6 CT slots)
        for (let i = 1; i <= 3; i++) {
          const slot = gyroEndSlot + i
          if (slot < 12) { // Don't exceed CT slot limit
            allocation.centerTorso.push(slot)
          }
        }
        
        // Side torso slots for XXL engine (6 each side)
        allocation.leftTorso = [0, 1, 2, 3, 4, 5]  // Slots 1-6
        allocation.rightTorso = [0, 1, 2, 3, 4, 5] // Slots 1-6
        break
        
      case 'Compact':
        // Compact engines: 3 slots in Center Torso (only the first 3 slots)
        allocation.centerTorso = [0, 1, 2] // Slots 1-3, no slots after gyro
        break
    }

    return allocation
  }

  /**
   * Get complete system component allocation for both engine and gyro
   */
  static getCompleteSystemAllocation(engineType: EngineType, gyroType: GyroType | ComponentConfiguration): {
    engine: SystemAllocation
    gyro: SystemAllocation
    combined: SystemAllocation
  } {
    const engineAllocation = this.getEngineAllocation(engineType, gyroType)
    const gyroAllocation = this.getGyroAllocation(gyroType)

    // Combine allocations for conflict detection
    const combined: SystemAllocation = {
      centerTorso: [...engineAllocation.centerTorso, ...gyroAllocation.centerTorso],
      leftTorso: [...engineAllocation.leftTorso],
      rightTorso: [...engineAllocation.rightTorso]
    }

    return {
      engine: engineAllocation,
      gyro: gyroAllocation,
      combined
    }
  }

  /**
   * Validate system component compatibility
   */
  static validateSystemComponents(engineType: EngineType, gyroType: GyroType | ComponentConfiguration): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      const allocation = this.getCompleteSystemAllocation(engineType, gyroType)
      
      // Check for slot overflow in center torso
      if (allocation.combined.centerTorso.length > 0) {
        const maxCenterTorsoSlot = Math.max(...allocation.combined.centerTorso)
        if (maxCenterTorsoSlot >= 12) {
          result.isValid = false
          const gyroTypeString = typeof gyroType === 'string' ? gyroType : gyroType.type;
          result.errors.push(
            `${engineType} engine with ${gyroTypeString} gyro requires slot ${maxCenterTorsoSlot + 1}, but Center Torso only has 12 slots`
          )
        }
      }

      // Check that engines get their full complement of slots
      const expectedEngineSlots = this.getExpectedEngineSlots(engineType)
      const actualEngineSlots = allocation.engine.centerTorso.length + 
                               allocation.engine.leftTorso.length + 
                               allocation.engine.rightTorso.length
      
      if (actualEngineSlots < expectedEngineSlots) {
        result.isValid = false
        const gyroTypeString = typeof gyroType === 'string' ? gyroType : gyroType.type;
        result.errors.push(
          `${engineType} engine requires ${expectedEngineSlots} slots but only ${actualEngineSlots} slots available with ${gyroTypeString} gyro`
        )
      }

      // Check for incompatible combinations
      const gyroTypeString = typeof gyroType === 'string' ? gyroType : gyroType.type;
      if (engineType === 'XXL' && gyroTypeString === 'XL') {
        result.warnings.push('XXL Engine with XL Gyro combination may be unstable')
      }

      // Check for slot overlaps (shouldn't happen with correct logic)
      const centerTorsoSlots = allocation.combined.centerTorso
      const uniqueSlots = new Set(centerTorsoSlots)
      if (uniqueSlots.size !== centerTorsoSlots.length) {
        result.isValid = false
        result.errors.push('System component slot overlap detected')
      }

    } catch (error: any) {
      result.isValid = false
      result.errors.push(`System validation error: ${error?.message || 'Unknown error'}`)
    }

    return result
  }

  /**
   * Get expected number of critical slots for each engine type
   */
  private static getExpectedEngineSlots(engineType: EngineType): number {
    switch (engineType) {
      case 'Standard':
      case 'ICE':
      case 'Fuel Cell':
        return 6
      case 'XL':
        return 12
      case 'Light':
        return 10
      case 'XXL':
        return 18
      case 'Compact':
        return 3
      default:
        return 6
    }
  }

  /**
   * Get available equipment slots after system components are placed
   */
  static getAvailableEquipmentSlots(engineType: EngineType, gyroType: GyroType | ComponentConfiguration): {
    [location: string]: number[]
  } {
    const allocation = this.getCompleteSystemAllocation(engineType, gyroType)
    
    // Total slots per location
    const locationSlots = {
      'Head': 6,
      'Center Torso': 12,
      'Left Torso': 12,
      'Right Torso': 12,
      'Left Arm': 12,
      'Right Arm': 12,
      'Left Leg': 6,
      'Right Leg': 6
    }

    // Fixed system slots (actuators, life support, etc.)
    const fixedSlots = {
      'Head': [0, 1, 2, 4, 5], // Life support, sensors, cockpit
      'Left Arm': [0, 1, 2, 3], // Shoulder, upper arm, lower arm, hand
      'Right Arm': [0, 1, 2, 3],
      'Left Leg': [0, 1, 2, 3], // Hip, upper leg, lower leg, foot
      'Right Leg': [0, 1, 2, 3],
      'Left Torso': [],
      'Right Torso': [],
      'Center Torso': []
    }

    const availableSlots: { [location: string]: number[] } = {}

    Object.entries(locationSlots).forEach(([location, totalSlots]) => {
      const systemSlots = allocation.combined[location as keyof SystemAllocation] || []
      const fixed = fixedSlots[location as keyof typeof fixedSlots] || []
      const occupiedSlots = new Set([...systemSlots, ...fixed])
      
      availableSlots[location] = []
      for (let i = 0; i < totalSlots; i++) {
        if (!occupiedSlots.has(i)) {
          availableSlots[location].push(i)
        }
      }
    })

    return availableSlots
  }

  /**
   * Calculate maximum equipment size that can fit in each location
   */
  static getMaxEquipmentSizes(engineType: EngineType, gyroType: GyroType | ComponentConfiguration): {
    [location: string]: number
  } {
    const availableSlots = this.getAvailableEquipmentSlots(engineType, gyroType)
    const maxSizes: { [location: string]: number } = {}

    Object.entries(availableSlots).forEach(([location, slots]) => {
      // Find largest contiguous block
      if (slots.length === 0) {
        maxSizes[location] = 0
        return
      }

      slots.sort((a, b) => a - b)
      let maxContiguous = 1
      let currentContiguous = 1

      for (let i = 1; i < slots.length; i++) {
        if (slots[i] === slots[i - 1] + 1) {
          currentContiguous++
        } else {
          maxContiguous = Math.max(maxContiguous, currentContiguous)
          currentContiguous = 1
        }
      }

      maxSizes[location] = Math.max(maxContiguous, currentContiguous)
    })

    return maxSizes
  }

  /**
   * Check if specific equipment can fit in location with given system configuration
   */
  static canEquipmentFit(
    equipmentSlots: number,
    location: string,
    engineType: EngineType,
    gyroType: ComponentConfiguration
  ): boolean {
    const maxSizes = this.getMaxEquipmentSizes(engineType, gyroType)
    return (maxSizes[location] || 0) >= equipmentSlots
  }

  /**
   * Get displacement impact for system component change
   */
  static getDisplacementImpact(
    oldEngineType: EngineType,
    oldGyroType: ComponentConfiguration,
    newEngineType: EngineType,
    newGyroType: ComponentConfiguration
  ): {
    affectedLocations: string[]
    conflictSlots: { [location: string]: number[] }
    severity: 'low' | 'medium' | 'high'
  } {
    const oldAllocation = this.getCompleteSystemAllocation(oldEngineType, oldGyroType)
    const newAllocation = this.getCompleteSystemAllocation(newEngineType, newGyroType)
    
    const affectedLocations: string[] = []
    const conflictSlots: { [location: string]: number[] } = {}

    // Check each location for changes
    const locations: (keyof SystemAllocation)[] = ['centerTorso', 'leftTorso', 'rightTorso']
    locations.forEach((location: keyof SystemAllocation) => {
      const oldSlots = new Set(oldAllocation.combined[location])
      const newSlots = new Set(newAllocation.combined[location])
      
      // Find slots that changed from available to system-occupied
      const newlyOccupied = Array.from(newSlots).filter(slot => !oldSlots.has(slot))
      
      if (newlyOccupied.length > 0) {
        const locationName = location === 'centerTorso' ? 'Center Torso' :
                           location === 'leftTorso' ? 'Left Torso' : 'Right Torso'
        affectedLocations.push(locationName)
        conflictSlots[locationName] = newlyOccupied
      }
    })

    // Determine severity
    const totalConflictSlots = Object.values(conflictSlots).flat().length
    const severity = totalConflictSlots === 0 ? 'low' : 
                    totalConflictSlots <= 6 ? 'medium' : 'high'

    return {
      affectedLocations,
      conflictSlots,
      severity
    }
  }

  /**
   * Get human-readable description of system component requirements
   */
  static getSystemDescription(engineType: EngineType, gyroType: GyroType | ComponentConfiguration): string {
    const allocation = this.getCompleteSystemAllocation(engineType, gyroType)
    const descriptions: string[] = []

    // Engine description
    const engineSlots = allocation.engine
    if (engineSlots.centerTorso.length > 3) {
      descriptions.push(
        `${engineType} Engine: CT slots ${engineSlots.centerTorso.map(s => s + 1).join(', ')}`
      )
    } else {
      descriptions.push(`${engineType} Engine: CT slots 1-3`)
    }

    if (engineSlots.leftTorso.length > 0) {
      descriptions.push(`  + LT slots ${engineSlots.leftTorso.map(s => s + 1).join(', ')}`)
    }
    if (engineSlots.rightTorso.length > 0) {
      descriptions.push(`  + RT slots ${engineSlots.rightTorso.map(s => s + 1).join(', ')}`)
    }

    // Gyro description
    const gyroTypeString = typeof gyroType === 'string' ? gyroType : gyroType.type;
    descriptions.push(
      `${gyroTypeString} Gyro: CT slots ${allocation.gyro.centerTorso.map(s => s + 1).join(', ')}`
    )

    return descriptions.join('\n')
  }
}
