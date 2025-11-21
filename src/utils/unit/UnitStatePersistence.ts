/**
 * Unit State Persistence - Serialization and state management service
 * Handles complete unit state save/load with validation and recovery
 * Following SOLID principles - Single Responsibility for state persistence
 */

import { UnitConfiguration, CompleteUnitState, SerializedSlotAllocations, SerializedEquipment, StateValidationResult } from '../criticalSlots/UnitCriticalManager'
import { EquipmentAllocation } from '../criticalSlots/CriticalSlot'
import { CriticalSection } from '../criticalSlots/CriticalSection'

export interface UnitState {
  configuration: UnitConfiguration
  allocatedEquipment: Map<string, EquipmentAllocation[]>
  unallocatedEquipment: EquipmentAllocation[]
}

export interface IUnitStatePersistence {
  // Core serialization
  serialize(state: UnitState): CompleteUnitState
  deserialize(serializedState: CompleteUnitState): UnitState
  
  // Validation
  validate(state: CompleteUnitState): StateValidationResult
  
  // Legacy support
  upgradeFromLegacy(legacy: any): CompleteUnitState
  isLegacyConfigurationOnly(data: any): boolean
  
  // Utilities
  createMinimalStateFromConfiguration(config: UnitConfiguration): CompleteUnitState
}

export class UnitStatePersistence implements IUnitStatePersistence {
  
  /**
   * Serialize the complete unit state for persistence
   */
  serialize(state: UnitState): CompleteUnitState {
    console.log('[UnitStatePersistence] Serializing complete unit state')
    
    const criticalSlotAllocations: SerializedSlotAllocations = {}
    const timestamp = Date.now()
    
    // Serialize allocated equipment from all sections
    state.allocatedEquipment.forEach((equipment, location) => {
      if (equipment.length > 0) {
        criticalSlotAllocations[location] = {}
        
        equipment.forEach(allocation => {
          // Store equipment in each occupied slot
          allocation.occupiedSlots.forEach(slotIndex => {
            criticalSlotAllocations[location][slotIndex] = this.serializeEquipment(allocation)
          })
        })
      }
    })
    
    // Serialize unallocated equipment
    const unallocatedEquipment = state.unallocatedEquipment.map(allocation => 
      this.serializeEquipment(allocation)
    )
    
    const serializedState: CompleteUnitState = {
      version: '1.0.0',
      configuration: { ...state.configuration },
      criticalSlotAllocations,
      unallocatedEquipment,
      timestamp
    }
    
    console.log('[UnitStatePersistence] Serialized state:', {
      allocatedSections: Object.keys(criticalSlotAllocations).length,
      unallocatedCount: unallocatedEquipment.length,
      configVersion: serializedState.version
    })
    
    return serializedState
  }

  /**
   * Deserialize and restore complete unit state
   */
  deserialize(serializedState: CompleteUnitState): UnitState {
    console.log('[UnitStatePersistence] Deserializing complete unit state')
    
    // Validate state before applying
    const validation = this.validate(serializedState)
    if (!validation.isValid && !validation.canRecover) {
      console.error('[UnitStatePersistence] Cannot deserialize invalid state:', validation.errors)
      throw new Error(`Invalid state: ${validation.errors.join(', ')}`)
    }
    
    if (validation.warnings.length > 0) {
      console.warn('[UnitStatePersistence] State deserialization warnings:', validation.warnings)
    }
    
    try {
      // Build configuration from serialized data
      const { UnitConfigurationBuilder } = require('../criticalSlots/UnitCriticalManager')
      const configuration = UnitConfigurationBuilder.buildConfiguration(serializedState.configuration)
      
      // Restore allocated equipment
      const allocatedEquipment = this.restoreAllocatedEquipment(serializedState.criticalSlotAllocations)
      
      // Restore unallocated equipment
      const unallocatedEquipment = this.restoreUnallocatedEquipment(serializedState.unallocatedEquipment)
      
      const unitState: UnitState = {
        configuration,
        allocatedEquipment,
        unallocatedEquipment
      }
      
      console.log('[UnitStatePersistence] State deserialization complete')
      return unitState
      
    } catch (error) {
      console.error('[UnitStatePersistence] Failed to deserialize state:', error)
      throw new Error(`Deserialization failed: ${error}`)
    }
  }

  /**
   * Validate serialized state before deserialization
   */
  validate(state: CompleteUnitState): StateValidationResult {
    const result: StateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      canRecover: true
    }
    
    // Check version compatibility
    if (!state.version) {
      result.warnings.push('Missing state version, assuming v1.0.0')
    } else if (state.version !== '1.0.0') {
      result.warnings.push(`State version ${state.version} may not be fully compatible`)
    }
    
    // Validate configuration
    if (!state.configuration) {
      result.errors.push('Missing unit configuration')
      result.isValid = false
      result.canRecover = false
      return result
    }
    
    // Validate required configuration fields
    const requiredFields = ['tonnage', 'engineType', 'gyroType', 'structureType', 'armorType']
    for (const field of requiredFields) {
      if (!(field in state.configuration)) {
        result.errors.push(`Missing required configuration field: ${field}`)
        result.isValid = false
      }
    }
    
    // Validate equipment data
    if (state.unallocatedEquipment) {
      state.unallocatedEquipment.forEach((equipment, index) => {
        if (!equipment.equipmentData || !equipment.equipmentGroupId) {
          result.errors.push(`Invalid unallocated equipment at index ${index}`)
          result.isValid = false
        }
      })
    }
    
    // Validate critical slot allocations
    if (state.criticalSlotAllocations) {
      Object.entries(state.criticalSlotAllocations).forEach(([location, slots]) => {
        // Note: We can't validate against sections here since we don't have access to them
        // This validation is more about data integrity
        Object.entries(slots).forEach(([slotStr, equipment]) => {
          const slotIndex = parseInt(slotStr)
          if (isNaN(slotIndex) || slotIndex < 0) {
            result.warnings.push(`Invalid slot index ${slotStr} in ${location}`)
          }
          
          if (!equipment.equipmentData || !equipment.equipmentGroupId) {
            result.errors.push(`Invalid equipment in ${location} slot ${slotIndex}`)
            result.isValid = false
          }
        })
      })
    }
    
    return result
  }

  /**
   * Check if a state is from an older version that only has configuration
   */
  isLegacyConfigurationOnly(data: any): boolean {
    return data && 
           typeof data === 'object' && 
           'tonnage' in data && 
           !('version' in data) && 
           !('criticalSlotAllocations' in data)
  }

  /**
   * Convert legacy configuration-only data to complete state
   */
  upgradeFromLegacy(legacyConfig: UnitConfiguration): CompleteUnitState {
    console.log('[UnitStatePersistence] Upgrading legacy configuration to complete state')
    return this.createMinimalStateFromConfiguration(legacyConfig)
  }

  /**
   * Create a minimal state for backward compatibility
   */
  createMinimalStateFromConfiguration(configuration: UnitConfiguration): CompleteUnitState {
    return {
      version: '1.0.0',
      configuration,
      criticalSlotAllocations: {},
      unallocatedEquipment: [],
      timestamp: Date.now()
    }
  }

  /**
   * Serialize individual equipment allocation
   */
  private serializeEquipment(allocation: EquipmentAllocation): SerializedEquipment {
    return {
      equipmentData: { ...allocation.equipmentData },
      equipmentGroupId: allocation.equipmentGroupId,
      location: allocation.location || '',
      startSlotIndex: allocation.startSlotIndex ?? -1,
      endSlotIndex: allocation.endSlotIndex ?? -1,
      occupiedSlots: [...(allocation.occupiedSlots || [])]
    }
  }

  /**
   * Restore allocated equipment from serialized data
   */
  private restoreAllocatedEquipment(allocations: SerializedSlotAllocations): Map<string, EquipmentAllocation[]> {
    console.log('[UnitStatePersistence] Restoring allocated equipment')
    
    const allocatedEquipment = new Map<string, EquipmentAllocation[]>()
    const processedGroups = new Set<string>()
    
    Object.entries(allocations).forEach(([location, slots]) => {
      const locationEquipment: EquipmentAllocation[] = []
      
      Object.entries(slots).forEach(([slotStr, serializedEquipment]) => {
        // Skip if we've already processed this equipment group
        if (processedGroups.has(serializedEquipment.equipmentGroupId)) {
          return
        }
        
        try {
          // Convert serialized equipment back to allocation
          const allocation: EquipmentAllocation = {
            equipmentData: serializedEquipment.equipmentData,
            equipmentGroupId: serializedEquipment.equipmentGroupId,
            location: serializedEquipment.location,
            startSlotIndex: serializedEquipment.startSlotIndex,
            endSlotIndex: serializedEquipment.endSlotIndex,
            occupiedSlots: serializedEquipment.occupiedSlots
          }
          
          locationEquipment.push(allocation)
          processedGroups.add(serializedEquipment.equipmentGroupId)
          
          console.log(`[UnitStatePersistence] Restored ${serializedEquipment.equipmentData.name} to ${location}`)
        } catch (error) {
          console.error(`[UnitStatePersistence] Error restoring equipment ${serializedEquipment.equipmentData.name}:`, error)
        }
      })
      
      if (locationEquipment.length > 0) {
        allocatedEquipment.set(location, locationEquipment)
      }
    })
    
    return allocatedEquipment
  }

  /**
   * Restore unallocated equipment from serialized data
   */
  private restoreUnallocatedEquipment(unallocatedEquipment: SerializedEquipment[]): EquipmentAllocation[] {
    console.log('[UnitStatePersistence] Restoring unallocated equipment')
    
    const restored: EquipmentAllocation[] = []
    
    unallocatedEquipment.forEach(serializedEquipment => {
      try {
        const allocation: EquipmentAllocation = {
          equipmentData: serializedEquipment.equipmentData,
          equipmentGroupId: serializedEquipment.equipmentGroupId,
          location: '',
          startSlotIndex: -1,
          endSlotIndex: -1,
          occupiedSlots: []
        }
        
        restored.push(allocation)
      } catch (error) {
        console.error(`[UnitStatePersistence] Error restoring unallocated equipment:`, error)
      }
    })
    
    console.log(`[UnitStatePersistence] Restored ${restored.length} unallocated equipment pieces`)
    return restored
  }

  /**
   * Perform state migration between versions
   */
  migrateState(state: CompleteUnitState, fromVersion: string, toVersion: string): CompleteUnitState {
    console.log(`[UnitStatePersistence] Migrating state from ${fromVersion} to ${toVersion}`)
    
    // Currently only one version, but framework for future migrations
    if (fromVersion === toVersion) {
      return state
    }
    
    // Future migration logic would go here
    console.warn(`[UnitStatePersistence] No migration path from ${fromVersion} to ${toVersion}`)
    return state
  }

  /**
   * Create a state snapshot with metadata
   */
  createSnapshot(state: UnitState, metadata?: { name?: string, description?: string }): CompleteUnitState {
    const snapshot = this.serialize(state)
    
    // Add metadata if provided
    if (metadata) {
      // Type-safe metadata attachment using intersection type
      const snapshotWithMetadata = snapshot as CompleteUnitState & {
        metadata?: {
          name: string;
          description: string;
          createdAt: string;
        }
      };
      
      snapshotWithMetadata.metadata = {
        name: metadata.name || 'Unnamed Snapshot',
        description: metadata.description || '',
        createdAt: new Date().toISOString()
      };
      
      return snapshotWithMetadata;
    }
    
    return snapshot
  }

  /**
   * Compare two states for differences
   */
  compareStates(state1: CompleteUnitState, state2: CompleteUnitState): {
    configurationChanged: boolean
    equipmentChanged: boolean
    differences: string[]
  } {
    const differences: string[] = []
    
    // Compare configurations
    const configurationChanged = JSON.stringify(state1.configuration) !== JSON.stringify(state2.configuration)
    if (configurationChanged) {
      differences.push('Unit configuration changed')
    }
    
    // Compare equipment
    const equipment1 = JSON.stringify(state1.criticalSlotAllocations) + JSON.stringify(state1.unallocatedEquipment)
    const equipment2 = JSON.stringify(state2.criticalSlotAllocations) + JSON.stringify(state2.unallocatedEquipment)
    const equipmentChanged = equipment1 !== equipment2
    if (equipmentChanged) {
      differences.push('Equipment allocation changed')
    }
    
    return {
      configurationChanged,
      equipmentChanged,
      differences
    }
  }
}
