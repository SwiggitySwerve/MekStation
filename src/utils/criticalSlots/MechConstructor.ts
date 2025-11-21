/**
 * Mech Constructor - System component change orchestration
 * Handles background construction pattern for system component changes
 */

import { UnitCriticalManager, UnitConfiguration } from './UnitCriticalManager'
import { EquipmentAllocation } from './CriticalSlot'
import { EngineType, GyroType, SystemComponentRules, SystemComponentChange } from './SystemComponentRules'

export interface ConstructionResult {
  newUnit: UnitCriticalManager
  displacedEquipment: EquipmentAllocation[]
  migratedEquipment: EquipmentAllocation[]
  unallocatedEquipment: EquipmentAllocation[]
  summary: {
    totalDisplaced: number
    totalMigrated: number
    totalUnallocated: number
  }
}

export interface ConstructionOptions {
  attemptMigration: boolean
  preserveLocationPreference: boolean
}

export class MechConstructor {
  /**
   * Handle engine type change
   */
  static changeEngine(
    currentUnit: UnitCriticalManager, 
    newEngineType: EngineType,
    options: ConstructionOptions = { attemptMigration: false, preserveLocationPreference: false }
  ): ConstructionResult {
    const currentConfig = currentUnit.getConfiguration()
    const newConfig: UnitConfiguration = {
      ...currentConfig,
      engineType: newEngineType
    }

    return this.handleSystemComponentChange(currentUnit, newConfig, options)
  }

  /**
   * Handle gyro type change
   */
  static changeGyro(
    currentUnit: UnitCriticalManager,
    newGyroType: GyroType,
    options: ConstructionOptions = { attemptMigration: false, preserveLocationPreference: false }
  ): ConstructionResult {
    const currentConfig = currentUnit.getConfiguration()
    const newConfig: UnitConfiguration = {
      ...currentConfig,
      gyroType: newGyroType
    }

    return this.handleSystemComponentChange(currentUnit, newConfig, options)
  }

  /**
   * Handle combined engine and gyro change
   */
  static changeEngineAndGyro(
    currentUnit: UnitCriticalManager,
    newEngineType: EngineType,
    newGyroType: GyroType,
    options: ConstructionOptions = { attemptMigration: false, preserveLocationPreference: false }
  ): ConstructionResult {
    const currentConfig = currentUnit.getConfiguration()
    const newConfig: UnitConfiguration = {
      ...currentConfig,
      engineType: newEngineType,
      gyroType: newGyroType
    }

    return this.handleSystemComponentChange(currentUnit, newConfig, options)
  }

  /**
   * Main system component change orchestration
   */
  private static handleSystemComponentChange(
    currentUnit: UnitCriticalManager,
    newConfig: UnitConfiguration,
    options: ConstructionOptions
  ): ConstructionResult {
    // Step 1: Create clean background unit with new system components
    const backgroundUnit = this.createBackgroundUnit(newConfig)

    // Step 2: Copy over all equipment, then identify conflicts
    if (options.attemptMigration) {
      // Migration mode: extract all equipment for re-placement
      const equipmentToMigrate = this.extractMigratableEquipment(currentUnit, newConfig, true)
      const migrationResult = this.migrateEquipment(equipmentToMigrate, backgroundUnit, options)
      backgroundUnit.addUnallocatedEquipment(migrationResult.displaced)
      
      const summary = {
        totalDisplaced: equipmentToMigrate.length,
        totalMigrated: migrationResult.migrated.length,
        totalUnallocated: migrationResult.displaced.length
      }

      return {
        newUnit: backgroundUnit,
        displacedEquipment: equipmentToMigrate,
        migratedEquipment: migrationResult.migrated,
        unallocatedEquipment: migrationResult.displaced,
        summary
      }
    } else {
      // Displacement-only mode: preserve non-conflicting equipment
      const result = this.handleConflictOnlyDisplacement(currentUnit, backgroundUnit, newConfig)
      
      return result
    }
  }

  /**
   * Handle displacement-only mode: preserve non-conflicting equipment
   */
  private static handleConflictOnlyDisplacement(
    currentUnit: UnitCriticalManager,
    backgroundUnit: UnitCriticalManager,
    newConfig: UnitConfiguration
  ): ConstructionResult {
    const displacedEquipment: EquipmentAllocation[] = []
    
    // Copy over all equipment from current unit, handling conflicts
    currentUnit.getAllSections().forEach(currentSection => {
      const sectionName = currentSection.getLocation()
      const backgroundSection = backgroundUnit.getSection(sectionName)
      
      if (backgroundSection) {
        const sectionEquipment = currentSection.getAllEquipment()
        
        sectionEquipment.forEach(equipment => {
          // Check if this equipment conflicts with new system slots
          const conflictsWithSystem = this.doesEquipmentConflictWithSystem(
            equipment, currentUnit, newConfig
          )
          
          if (conflictsWithSystem) {
            // Equipment conflicts - add to displaced list
            displacedEquipment.push(equipment)
          } else {
            // Equipment doesn't conflict - copy to background unit in same position
            const success = backgroundSection.allocateEquipment(
              equipment.equipmentData,
              equipment.startSlotIndex,
              equipment.equipmentGroupId
            )
            
            if (!success) {
              // Fallback - if exact placement fails, add to displaced
              displacedEquipment.push(equipment)
            }
          }
        })
      }
    })
    
    // Copy over existing unallocated equipment
    const existingUnallocated = currentUnit.getUnallocatedEquipment()
    displacedEquipment.push(...existingUnallocated)
    
    // Add all displaced equipment to background unit's unallocated pool
    backgroundUnit.addUnallocatedEquipment(displacedEquipment)
    
    const summary = {
      totalDisplaced: displacedEquipment.length,
      totalMigrated: 0,
      totalUnallocated: displacedEquipment.length
    }

    return {
      newUnit: backgroundUnit,
      displacedEquipment,
      migratedEquipment: [],
      unallocatedEquipment: displacedEquipment,
      summary
    }
  }

  /**
   * Check if equipment conflicts with new system component slots
   */
  private static doesEquipmentConflictWithSystem(
    equipment: EquipmentAllocation,
    currentUnit: UnitCriticalManager,
    newConfig: UnitConfiguration
  ): boolean {
    const currentConfig = currentUnit.getConfiguration()
    const displacementImpact = SystemComponentRules.getDisplacementImpact(
      currentConfig.engineType,
      currentConfig.gyroType,
      newConfig.engineType,
      newConfig.gyroType
    )
    
    // Check if equipment's location is affected
    if (!displacementImpact.affectedLocations.includes(equipment.location)) {
      return false
    }
    
    // Check if equipment's slots overlap with conflict slots
    const conflictSlots = displacementImpact.conflictSlots[equipment.location] || []
    const equipmentSlots = equipment.occupiedSlots
    
    // If any of the equipment's slots are in the conflict list, it conflicts
    return equipmentSlots.some(slot => conflictSlots.includes(slot))
  }

  /**
   * Create clean background unit with new system components
   */
  private static createBackgroundUnit(config: UnitConfiguration): UnitCriticalManager {
    // Create new unit with updated configuration
    // This automatically allocates engine and gyro slots correctly
    return new UnitCriticalManager(config)
  }

  /**
   * Extract equipment from current unit - either all equipment or only conflicting equipment
   */
  private static extractMigratableEquipment(
    currentUnit: UnitCriticalManager, 
    newConfig: UnitConfiguration, 
    attemptMigration: boolean
  ): EquipmentAllocation[] {
    if (attemptMigration) {
      // Migration mode: extract all equipment
      const allEquipment: EquipmentAllocation[] = []

      currentUnit.getAllSections().forEach(section => {
        const sectionEquipment = section.getAllEquipment()
        allEquipment.push(...sectionEquipment)
      })

      allEquipment.push(...currentUnit.getUnallocatedEquipment())
      return allEquipment
    } else {
      // Displacement-only mode: extract only conflicting equipment
      return this.extractConflictingEquipment(currentUnit, newConfig)
    }
  }

  /**
   * Extract only equipment that conflicts with new system component slots
   */
  private static extractConflictingEquipment(
    currentUnit: UnitCriticalManager,
    newConfig: UnitConfiguration
  ): EquipmentAllocation[] {
    const currentConfig = currentUnit.getConfiguration()
    const displacementImpact = SystemComponentRules.getDisplacementImpact(
      currentConfig.engineType,
      currentConfig.gyroType,
      newConfig.engineType,
      newConfig.gyroType
    )

    const conflictingEquipment: EquipmentAllocation[] = []

    // Check each affected location for conflicting equipment
    displacementImpact.affectedLocations.forEach(location => {
      const section = currentUnit.getSection(location)
      if (section) {
        const conflictSlots = displacementImpact.conflictSlots[location] || []
        const conflicts = section.findConflictingEquipment(conflictSlots)
        conflictingEquipment.push(...conflicts)
      }
    })

    // Always include existing unallocated equipment
    conflictingEquipment.push(...currentUnit.getUnallocatedEquipment())

    return conflictingEquipment
  }

  /**
   * Attempt to migrate equipment to new unit
   */
  private static migrateEquipment(
    equipment: EquipmentAllocation[],
    targetUnit: UnitCriticalManager,
    options: ConstructionOptions
  ): { migrated: EquipmentAllocation[], displaced: EquipmentAllocation[] } {
    const migrated: EquipmentAllocation[] = []
    const displaced: EquipmentAllocation[] = []

    // Sort equipment by priority (prefer original location, smaller equipment first)
    const sortedEquipment = this.sortEquipmentByMigrationPriority(equipment, options)

    sortedEquipment.forEach(eq => {
      const migrationSuccess = this.attemptEquipmentMigration(eq, targetUnit, options)
      
      if (migrationSuccess) {
        migrated.push(eq)
      } else {
        displaced.push(eq)
      }
    })

    return { migrated, displaced }
  }

  /**
   * Sort equipment by migration priority
   */
  private static sortEquipmentByMigrationPriority(
    equipment: EquipmentAllocation[],
    options: ConstructionOptions
  ): EquipmentAllocation[] {
    return [...equipment].sort((a, b) => {
      // Priority 1: Location preference (if enabled)
      if (options.preserveLocationPreference && a.location !== b.location) {
        // Prefer equipment with valid original locations
        if (a.location && !b.location) return -1
        if (!a.location && b.location) return 1
      }

      // Priority 2: Equipment size (smaller equipment first, more likely to fit)
      const sizeA = a.equipmentData.requiredSlots
      const sizeB = b.equipmentData.requiredSlots
      if (sizeA !== sizeB) {
        return sizeA - sizeB
      }

      // Priority 3: Equipment type (weapons before ammo, etc.)
      const typeOrder = {
        'weapon': 1,
        'equipment': 2,
        'heat_sink': 3,
        'ammo': 4
      }
      const orderA = typeOrder[a.equipmentData.type] || 5
      const orderB = typeOrder[b.equipmentData.type] || 5
      
      return orderA - orderB
    })
  }

  /**
   * Attempt to migrate single equipment item
   */
  private static attemptEquipmentMigration(
    equipment: EquipmentAllocation,
    targetUnit: UnitCriticalManager,
    options: ConstructionOptions
  ): boolean {
    const requiredSlots = equipment.equipmentData.requiredSlots

    // Strategy 1: Try original location first (if preserving location preference)
    if (options.preserveLocationPreference && equipment.location) {
      const originalSection = targetUnit.getSection(equipment.location)
      if (originalSection?.canAccommodateEquipment(requiredSlots)) {
        const availableSlots = originalSection.findContiguousAvailableSlots(requiredSlots)
        if (availableSlots) {
          return originalSection.allocateEquipment(
            equipment.equipmentData, 
            availableSlots[0], 
            equipment.equipmentGroupId
          )
        }
      }
    }

    // Strategy 2: Try any location that can accommodate the equipment
    const suitableLocations = this.findSuitableLocations(equipment, targetUnit)
    
    for (const location of suitableLocations) {
      const section = targetUnit.getSection(location)
      if (section?.canAccommodateEquipment(requiredSlots)) {
        const availableSlots = section.findContiguousAvailableSlots(requiredSlots)
        if (availableSlots) {
          return section.allocateEquipment(
            equipment.equipmentData,
            availableSlots[0],
            equipment.equipmentGroupId
          )
        }
      }
    }

    return false
  }

  /**
   * Find suitable locations for equipment based on size and type
   */
  private static findSuitableLocations(
    equipment: EquipmentAllocation,
    targetUnit: UnitCriticalManager
  ): string[] {
    const requiredSlots = equipment.equipmentData.requiredSlots
    const suitableLocations: string[] = []

    // Get current engine/gyro configuration to determine available slots
    const engineType = targetUnit.getEngineType()
    const gyroType = targetUnit.getGyroType()
    const maxSizes = SystemComponentRules.getMaxEquipmentSizes(engineType, gyroType)

    // Check each location's capacity
    Object.entries(maxSizes).forEach(([location, maxSlots]) => {
      if (maxSlots >= requiredSlots) {
        suitableLocations.push(location)
      }
    })

    // Sort by preference: torsos first, then arms, then legs, head last
    const locationOrder = {
      'Center Torso': 1,
      'Left Torso': 2,
      'Right Torso': 3,
      'Left Arm': 4,
      'Right Arm': 5,
      'Left Leg': 6,
      'Right Leg': 7,
      'Head': 8
    }

    return suitableLocations.sort((a, b) => {
      const orderA = locationOrder[a as keyof typeof locationOrder] || 9
      const orderB = locationOrder[b as keyof typeof locationOrder] || 9
      return orderA - orderB
    })
  }

  /**
   * Validate system component change before execution
   */
  static validateSystemChange(
    currentUnit: UnitCriticalManager,
    change: SystemComponentChange
  ): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    impact: {
      affectedLocations: string[]
      displacedEquipmentCount: number
      severity: 'low' | 'medium' | 'high'
    }
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      impact: {
        affectedLocations: [] as string[],
        displacedEquipmentCount: 0,
        severity: 'low' as 'low' | 'medium' | 'high'
      }
    }

    try {
      // Validate system component compatibility
      const systemValidation = SystemComponentRules.validateSystemComponents(
        change.engineType,
        change.gyroType
      )

      if (!systemValidation.isValid) {
        result.isValid = false
        result.errors.push(...systemValidation.errors)
      }
      result.warnings.push(...systemValidation.warnings)

      // Calculate displacement impact
      const currentConfig = currentUnit.getConfiguration()
      const displacementImpact = SystemComponentRules.getDisplacementImpact(
        currentConfig.engineType,
        currentConfig.gyroType,
        change.engineType,
        change.gyroType
      )

      result.impact.affectedLocations = displacementImpact.affectedLocations
      result.impact.severity = displacementImpact.severity

      // Count equipment that would be displaced
      let displacedCount = 0
      displacementImpact.affectedLocations.forEach(location => {
        const section = currentUnit.getSection(location)
        if (section) {
          const conflictSlots = displacementImpact.conflictSlots[location] || []
          const conflicts = section.findConflictingEquipment(conflictSlots)
          displacedCount += conflicts.length
        }
      })

      result.impact.displacedEquipmentCount = displacedCount

      // Add warnings for significant displacement
      if (displacedCount > 0) {
        result.warnings.push(`${displacedCount} equipment item(s) will be displaced`)
      }

      if (displacedCount > 5) {
        result.warnings.push('High number of equipment displacements - consider alternative configuration')
      }

    } catch (error: any) {
      result.isValid = false
      result.errors.push(`Validation error: ${error?.message || 'Unknown error'}`)
    }

    return result
  }

  /**
   * Get system change description for user feedback
   */
  static getSystemChangeDescription(
    oldEngineType: EngineType,
    oldGyroType: GyroType,
    newEngineType: EngineType,
    newGyroType: GyroType
  ): string {
    const changes: string[] = []

    if (oldEngineType !== newEngineType) {
      changes.push(`Engine: ${oldEngineType} → ${newEngineType}`)
    }

    if (oldGyroType !== newGyroType) {
      changes.push(`Gyro: ${oldGyroType} → ${newGyroType}`)
    }

    if (changes.length === 0) {
      return 'No system component changes'
    }

    const description = changes.join('\n')
    const systemDesc = SystemComponentRules.getSystemDescription(newEngineType, newGyroType)
    
    return `${description}\n\nNew Configuration:\n${systemDesc}`
  }
}
