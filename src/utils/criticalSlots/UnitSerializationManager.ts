/**
 * UnitSerializationManager
 * Handles serialization and deserialization of unit state and equipment.
 * Extracted from UnitCriticalManager for modularity and SOLID compliance.
 */

import { CompleteUnitState, SerializedEquipment, SerializedSlotAllocations, StateValidationResult } from './UnitCriticalManagerTypes';
import { EquipmentAllocation } from './CriticalSlot';
import { UnitConfiguration } from './UnitCriticalManagerTypes';

export class UnitSerializationManager {
  /**
   * Serialize a complete unit state
   */
  serializeCompleteState(manager: any): CompleteUnitState {
    // manager: UnitCriticalManager
    console.log('[UnitSerializationManager] Serializing complete unit state');
    
    const serializedEquipment: SerializedEquipment[] = [];
    const serializedAllocations: SerializedSlotAllocations = {};

    // Serialize unallocated equipment
    manager.unallocatedEquipment.forEach((allocation: EquipmentAllocation) => {
      serializedEquipment.push(this.serializeEquipment(allocation));
    });

    // Serialize allocated equipment
    manager.sections.forEach((section: any, location: string) => {
      const allocations: { [slotIndex: number]: SerializedEquipment } = {};
      section.getAllEquipment().forEach((allocation: EquipmentAllocation) => {
        allocation.occupiedSlots.forEach((slotIndex: number) => {
          allocations[slotIndex] = this.serializeEquipment(allocation);
        });
      });
      if (Object.keys(allocations).length > 0) {
        serializedAllocations[location] = allocations;
      }
    });

    const completeState: CompleteUnitState = {
      version: '1.0.0',
      configuration: { ...manager.configuration },
      criticalSlotAllocations: serializedAllocations,
      unallocatedEquipment: serializedEquipment,
      timestamp: Date.now()
    };

    console.log('[UnitSerializationManager] Serialized state:', {
      allocatedSections: Object.keys(serializedAllocations).length,
      unallocatedCount: serializedEquipment.length,
      configVersion: completeState.version
    });

    return completeState;
  }

  /**
   * Serialize a single equipment allocation
   */
  serializeEquipment(allocation: EquipmentAllocation): SerializedEquipment {
    return {
      equipmentGroupId: allocation.equipmentGroupId,
      equipmentData: allocation.equipmentData,
      location: allocation.location,
      startSlotIndex: allocation.startSlotIndex,
      endSlotIndex: allocation.endSlotIndex,
      occupiedSlots: [...allocation.occupiedSlots]
    };
  }

  /**
   * Deserialize a complete unit state
   */
  deserializeCompleteState(manager: any, state: CompleteUnitState): boolean {
    // manager: UnitCriticalManager
    console.log('[UnitSerializationManager] Deserializing complete unit state');
    
    try {
      // Validate state before applying
      const validation = this.validateSerializedState(state);
      if (!validation.isValid && !validation.canRecover) {
        console.error('[UnitSerializationManager] Cannot deserialize invalid state:', validation.errors);
        return false;
      }
      
      if (validation.warnings.length > 0) {
        console.warn('[UnitSerializationManager] State deserialization warnings:', validation.warnings);
      }
      
      // Update configuration
      manager.configuration = { ...state.configuration };
      
      // Clear all existing equipment
      manager.clearAllEquipment();
      
      // Rebuild system components with new configuration (skip special components during restoration)
      manager.rebuildSystemComponents(true);
      
      // Restore allocated equipment
      this.restoreAllocatedEquipment(manager, state.criticalSlotAllocations);
      
      // Restore unallocated equipment
      this.restoreUnallocatedEquipment(manager, state.unallocatedEquipment);
      
      console.log('[UnitSerializationManager] State deserialization complete');
      return true;
      
    } catch (error) {
      console.error('[UnitSerializationManager] Failed to deserialize state:', error);
      return false;
    }
  }

  /**
   * Validate a serialized state
   */
  validateSerializedState(state: CompleteUnitState): StateValidationResult {
    const result: StateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      canRecover: true
    };

    // Validate configuration
    if (!state.configuration) {
      result.isValid = false;
      result.errors.push('Missing configuration in serialized state');
    }

    // Validate equipment data
    if (state.unallocatedEquipment) {
      state.unallocatedEquipment.forEach((eq: SerializedEquipment, index: number) => {
        if (!eq.equipmentGroupId) {
          result.isValid = false;
          result.errors.push(`Unallocated equipment ${index} missing group ID`);
        }
        if (!eq.equipmentData) {
          result.isValid = false;
          result.errors.push(`Unallocated equipment ${index} missing equipment data`);
        }
      });
    }

    // Validate allocated equipment
    if (state.criticalSlotAllocations) {
      Object.entries(state.criticalSlotAllocations).forEach(([location, allocations]) => {
        Object.entries(allocations).forEach(([slotIndex, eq]) => {
          if (!eq.equipmentGroupId) {
            result.isValid = false;
            result.errors.push(`Allocated equipment in ${location} slot ${slotIndex} missing group ID`);
          }
          if (!eq.equipmentData) {
            result.isValid = false;
            result.errors.push(`Allocated equipment in ${location} slot ${slotIndex} missing equipment data`);
          }
        });
      });
    }

    return result;
  }

  /**
   * Restore allocated equipment from serialized slot allocations
   */
  restoreAllocatedEquipment(manager: any, allocations: SerializedSlotAllocations): void {
    console.log('[UnitSerializationManager] Restoring allocated equipment');
    
    Object.entries(allocations).forEach(([location, slotAllocations]) => {
      const section = manager.getSection(location);
      if (!section) {
        console.warn(`[UnitSerializationManager] Section ${location} not found, skipping allocated equipment`);
        return;
      }
      
      Object.entries(slotAllocations).forEach(([slotIndexStr, serializedEquipment]) => {
        const slotIndex = parseInt(slotIndexStr);
        const allocation = this.deserializeEquipment(serializedEquipment);
        
        if (allocation) {
          const success = section.allocateEquipment(
            allocation.equipmentData,
            slotIndex,
            allocation.equipmentGroupId
          );
          
          if (!success) {
            console.warn(`[UnitSerializationManager] Failed to allocate ${allocation.equipmentData.name} to ${location} slot ${slotIndex}`);
          }
        }
      });
    });
  }

  /**
   * Restore unallocated equipment from serialized equipment array
   */
  restoreUnallocatedEquipment(manager: any, unallocatedEquipment: SerializedEquipment[]): void {
    console.log('[UnitSerializationManager] Restoring unallocated equipment');
    
    unallocatedEquipment.forEach((serializedEquipment) => {
      this.addToUnallocatedFromSerialized(manager, serializedEquipment);
    });
  }

  /**
   * Add to unallocated from serialized equipment
   */
  addToUnallocatedFromSerialized(manager: any, serializedEquipment: SerializedEquipment): void {
    const allocation = this.deserializeEquipment(serializedEquipment);
    if (allocation) {
      manager.addUnallocatedEquipment([allocation]);
    }
  }

  /**
   * Deserialize equipment from serialized format
   */
  private deserializeEquipment(serializedEquipment: SerializedEquipment): EquipmentAllocation | null {
    try {
      return {
        equipmentGroupId: serializedEquipment.equipmentGroupId,
        equipmentData: serializedEquipment.equipmentData,
        location: serializedEquipment.location,
        occupiedSlots: [...serializedEquipment.occupiedSlots],
        startSlotIndex: serializedEquipment.startSlotIndex,
        endSlotIndex: serializedEquipment.endSlotIndex
      };
    } catch (error) {
      console.error('[UnitSerializationManager] Failed to deserialize equipment:', error);
      return null;
    }
  }
} 