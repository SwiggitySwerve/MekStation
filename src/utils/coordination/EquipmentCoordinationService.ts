/**
 * Equipment Coordination Service - Manages equipment coordination across critical sections
 * Handles equipment allocation, movement, searching, and location validation
 * Following SOLID principles - Single Responsibility for equipment coordination
 */

import { CriticalSection } from '../criticalSlots/CriticalSection';
import { EquipmentObject, EquipmentAllocation } from '../criticalSlots/CriticalSlot';
import { SystemComponentRules, EngineType, GyroType } from '../criticalSlots/SystemComponentRules';
import { UnitConfiguration } from '../configuration/UnitConfigurationService';

export interface EquipmentSearchResult {
  section: CriticalSection | null;
  allocation: EquipmentAllocation;
  location?: string;
}

export interface EquipmentAllocationResult {
  success: boolean;
  error?: string;
  warning?: string;
  equipmentMoved?: EquipmentAllocation;
}

export interface EquipmentLocationMap {
  [location: string]: EquipmentAllocation[];
}

export interface EquipmentGroupInfo {
  groupId: string;
  equipmentReference: EquipmentAllocation;
  location: string;
  isAllocated: boolean;
}

export interface LocationValidationResult {
  canPlace: boolean;
  error?: string;
  reasons: string[];
}

export interface EquipmentCoordinationOptions {
  enableLocationRestrictions: boolean;
  autoDisplaceConflictingEquipment: boolean;
  validatePlacementOnAdd: boolean;
  logEquipmentOperations: boolean;
}

/**
 * Equipment Coordination Service
 * Centralized management of equipment coordination across all critical sections
 */
export class EquipmentCoordinationService {
  
  private sections: Map<string, CriticalSection>;
  private unallocatedEquipment: EquipmentAllocation[];
  private configuration: UnitConfiguration;
  private options: EquipmentCoordinationOptions;
  private listeners: (() => void)[] = [];
  
  constructor(
    sections: Map<string, CriticalSection>,
    unallocatedEquipment: EquipmentAllocation[],
    configuration: UnitConfiguration,
    options?: Partial<EquipmentCoordinationOptions>
  ) {
    this.sections = sections;
    this.unallocatedEquipment = unallocatedEquipment;
    this.configuration = configuration;
    this.options = {
      enableLocationRestrictions: true,
      autoDisplaceConflictingEquipment: false,
      validatePlacementOnAdd: true,
      logEquipmentOperations: true,
      ...options
    };
    
    console.log('[EquipmentCoordinationService] Initialized with options:', this.options);
  }
  
  /**
   * Update configuration reference
   */
  updateConfiguration(configuration: UnitConfiguration): void {
    this.configuration = configuration;
  }
  
  /**
   * Get all equipment across entire unit, organized by equipment ID
   */
  getAllEquipment(): Map<string, EquipmentAllocation[]> {
    const allEquipment = new Map<string, EquipmentAllocation[]>();
    
    // Collect from all sections
    this.sections.forEach(section => {
      section.getAllEquipment().forEach(allocation => {
        const equipmentId = allocation.equipmentData.id;
        if (!allEquipment.has(equipmentId)) {
          allEquipment.set(equipmentId, []);
        }
        allEquipment.get(equipmentId)!.push(allocation);
      });
    });
    
    // Add unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      const equipmentId = allocation.equipmentData.id;
      if (!allEquipment.has(equipmentId)) {
        allEquipment.set(equipmentId, []);
      }
      allEquipment.get(equipmentId)!.push(allocation);
    });
    
    return allEquipment;
  }
  
  /**
   * Get all equipment groups (each allocated instance)
   */
  getAllEquipmentGroups(): EquipmentGroupInfo[] {
    const groups: EquipmentGroupInfo[] = [];
    
    // Collect from all sections
    this.sections.forEach((section, location) => {
      section.getAllEquipment().forEach(allocation => {
        groups.push({
          groupId: allocation.equipmentGroupId,
          equipmentReference: allocation,
          location,
          isAllocated: true
        });
      });
    });
    
    // Add unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      groups.push({
        groupId: allocation.equipmentGroupId,
        equipmentReference: allocation,
        location: 'Unallocated',
        isAllocated: false
      });
    });
    
    return groups;
  }
  
  /**
   * Find equipment group by ID across all sections
   */
  findEquipmentGroup(equipmentGroupId: string): EquipmentSearchResult | null {
    if (this.options.logEquipmentOperations) {
      console.log(`[EquipmentCoordinationService] Searching for equipment group: ${equipmentGroupId}`);
    }
    
    // Search allocated equipment
    this.sections.forEach((section, location) => {
      const allocation = section.getAllEquipment().find(
        (eq: EquipmentAllocation) => eq.equipmentGroupId === equipmentGroupId
      );
      if (allocation) {
        return { section, allocation, location };
      }
    });
    
    // Search unallocated equipment
    const unallocated = this.unallocatedEquipment.find(
      (eq: EquipmentAllocation) => eq.equipmentGroupId === equipmentGroupId
    );
    if (unallocated) {
      return { section: null, allocation: unallocated, location: 'Unallocated' };
    }
    
    if (this.options.logEquipmentOperations) {
      console.warn(`[EquipmentCoordinationService] Equipment group not found: ${equipmentGroupId}`);
    }
    
    return null;
  }
  
  /**
   * Get equipment organized by location
   */
  getEquipmentByLocation(): EquipmentLocationMap {
    const equipmentByLocation: EquipmentLocationMap = {};
    
    this.sections.forEach((section, location) => {
      const equipment = section.getAllEquipment();
      if (equipment.length > 0) {
        equipmentByLocation[location] = equipment;
      }
    });
    
    // Add unallocated as special location
    if (this.unallocatedEquipment.length > 0) {
      equipmentByLocation['Unallocated'] = [...this.unallocatedEquipment];
    }
    
    return equipmentByLocation;
  }
  
  /**
   * Get unallocated equipment reference
   */
  getUnallocatedEquipment(): EquipmentAllocation[] {
    return [...this.unallocatedEquipment];
  }
  
  /**
   * Add equipment to unallocated pool
   */
  addUnallocatedEquipment(equipment: EquipmentAllocation[]): void {
    equipment.forEach(eq => {
      // Clear location info since it's unallocated
      eq.location = '';
      eq.occupiedSlots = [];
      eq.startSlotIndex = -1;
      eq.endSlotIndex = -1;
    });
    
    this.unallocatedEquipment.push(...equipment);
    
    if (this.options.logEquipmentOperations) {
      console.log(`[EquipmentCoordinationService] Added ${equipment.length} equipment pieces to unallocated pool`);
    }
    
    this.notifyStateChange();
  }
  
  /**
   * Remove equipment from unallocated pool
   * CRITICAL FIX: Ensure React detects array changes by creating new array reference
   */
  removeUnallocatedEquipment(equipmentGroupId: string): EquipmentAllocation | null {
    if (this.options.logEquipmentOperations) {
      console.log(`[EquipmentCoordinationService] removeUnallocatedEquipment called with groupId: ${equipmentGroupId}`);
      console.log(`[EquipmentCoordinationService] Current unallocated equipment:`, 
        this.unallocatedEquipment.map(eq => ({
          name: eq.equipmentData.name,
          groupId: eq.equipmentGroupId
        }))
      );
    }
    
    const index = this.unallocatedEquipment.findIndex(eq => eq.equipmentGroupId === equipmentGroupId);
    
    if (index >= 0) {
      const removed = this.unallocatedEquipment[index];
      
      // CRITICAL FIX: Create new array to ensure React detects the change
      this.unallocatedEquipment.splice(index, 1);
      
      if (this.options.logEquipmentOperations) {
        console.log(`[EquipmentCoordinationService] Successfully removed equipment:`, {
          name: removed.equipmentData.name,
          groupId: removed.equipmentGroupId
        });
        console.log(`[EquipmentCoordinationService] Remaining unallocated count: ${this.unallocatedEquipment.length}`);
      }
      
      // Notify listeners about state change
      this.notifyStateChange();
      
      return removed;
    }
    
    if (this.options.logEquipmentOperations) {
      console.error(`[EquipmentCoordinationService] FAILED to find equipment with groupId: ${equipmentGroupId}`);
      console.error(`[EquipmentCoordinationService] Available group IDs:`, 
        this.unallocatedEquipment.map(eq => eq.equipmentGroupId)
      );
    }
    
    return null;
  }
  
  /**
   * Move equipment to unallocated pool (displacement)
   */
  displaceEquipment(equipmentGroupId: string): boolean {
    const found = this.findEquipmentGroup(equipmentGroupId);
    if (!found || !found.section) {
      return false;
    }
    
    const removedEquipment = found.section.removeEquipmentGroup(equipmentGroupId);
    if (removedEquipment) {
      this.addUnallocatedEquipment([removedEquipment]);
      
      if (this.options.logEquipmentOperations) {
        console.log(`[EquipmentCoordinationService] Displaced equipment ${removedEquipment.equipmentData.name} to unallocated pool`);
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if equipment can be placed in specified location
   */
  canPlaceEquipmentInLocation(equipment: EquipmentObject, location: string): boolean {
    if (!this.options.enableLocationRestrictions) {
      return true;
    }
    
    // Check static location restrictions
    if (equipment.allowedLocations) {
      return equipment.allowedLocations.includes(location);
    }
    
    // Check dynamic location restrictions
    if (equipment.locationRestrictions) {
      switch (equipment.locationRestrictions.type) {
        case 'engine_slots':
          return this.hasEngineSlots(location);
        case 'custom':
          return equipment.locationRestrictions.validator?.(this, location) ?? false;
        case 'static':
          // Should use allowedLocations instead, but handle gracefully
          return true;
      }
    }
    
    // Default: allow anywhere (for backwards compatibility)
    return true;
  }
  
  /**
   * Get detailed location validation result
   */
  validateEquipmentLocation(equipment: EquipmentObject, location: string): LocationValidationResult {
    const reasons: string[] = [];
    let canPlace = true;
    let error: string | undefined;
    
    if (!this.options.enableLocationRestrictions) {
      return { canPlace: true, reasons: ['Location restrictions disabled'] };
    }
    
    // Check if section exists
    const section = this.sections.get(location);
    if (!section) {
      canPlace = false;
      error = `Location "${location}" does not exist`;
      reasons.push(error);
      return { canPlace, error, reasons };
    }
    
    // Check static location restrictions
    if (equipment.allowedLocations && !equipment.allowedLocations.includes(location)) {
      canPlace = false;
      error = `Equipment "${equipment.name}" is restricted from location "${location}"`;
      reasons.push(error);
      reasons.push(`Allowed locations: ${equipment.allowedLocations.join(', ')}`);
    }
    
    // Check dynamic location restrictions
    if (equipment.locationRestrictions) {
      switch (equipment.locationRestrictions.type) {
        case 'engine_slots':
          if (!this.hasEngineSlots(location)) {
            canPlace = false;
            error = `Equipment "${equipment.name}" requires engine slots, but "${location}" has none`;
            reasons.push(error);
          } else {
            reasons.push('Equipment can be placed in engine slots');
          }
          break;
        case 'custom':
          const customResult = equipment.locationRestrictions.validator?.(this, location) ?? false;
          if (!customResult) {
            canPlace = false;
            error = `Equipment "${equipment.name}" failed custom location validation for "${location}"`;
            reasons.push(error);
          } else {
            reasons.push('Equipment passed custom location validation');
          }
          break;
        case 'static':
          reasons.push('Static location restriction (should use allowedLocations instead)');
          break;
      }
    }
    
    if (canPlace && reasons.length === 0) {
      reasons.push('No location restrictions found');
    }
    
    return { canPlace, error, reasons };
  }
  
  /**
   * Check if a location has engine slots
   */
  hasEngineSlots(location: string): boolean {
    const section = this.sections.get(location);
    if (!section) {
      return false;
    }
    
    // Check if this location has engine slots based on current engine configuration
    const engineAllocation = SystemComponentRules.getCompleteSystemAllocation(
      this.configuration.engineType as EngineType,
      this.configuration.gyroType as GyroType
    );
    
    switch (location) {
      case 'Center Torso':
        return engineAllocation.engine.centerTorso.length > 0;
      case 'Left Torso':
        return engineAllocation.engine.leftTorso.length > 0;
      case 'Right Torso':
        return engineAllocation.engine.rightTorso.length > 0;
      default:
        return false;
    }
  }
  
  /**
   * Get validation error message for equipment location restriction
   */
  getLocationRestrictionError(equipment: EquipmentObject, location: string): string {
    if (equipment.allowedLocations) {
      return `${equipment.name} can only be placed in: ${equipment.allowedLocations.join(', ')}`;
    }
    
    if (equipment.locationRestrictions?.type === 'engine_slots') {
      return `${equipment.name} can only be placed in locations with engine slots (depends on engine type)`;
    }
    
    return `${equipment.name} cannot be placed in ${location}`;
  }
  
  /**
   * Attempt to allocate equipment from unallocated pool
   */
  allocateEquipmentFromPool(
    equipmentGroupId: string, 
    location: string, 
    startSlot: number
  ): EquipmentAllocationResult {
    if (this.options.logEquipmentOperations) {
      console.log(`[EquipmentCoordinationService] allocateEquipmentFromPool called with:`, {
        equipmentGroupId,
        location,
        startSlot
      });
    }
    
    const equipment = this.removeUnallocatedEquipment(equipmentGroupId);
    if (!equipment) {
      return {
        success: false,
        error: `Could not remove equipment ${equipmentGroupId} from unallocated pool`
      };
    }
    
    if (this.options.logEquipmentOperations) {
      console.log(`[EquipmentCoordinationService] Successfully removed equipment from unallocated pool:`, {
        name: equipment.equipmentData.name,
        groupId: equipment.equipmentGroupId
      });
    }
    
    // Check location restrictions if enabled
    if (this.options.enableLocationRestrictions && 
        !this.canPlaceEquipmentInLocation(equipment.equipmentData, location)) {
      const error = this.getLocationRestrictionError(equipment.equipmentData, location);
      
      if (this.options.logEquipmentOperations) {
        console.warn(`[EquipmentCoordinationService] Location restriction failed for ${equipment.equipmentData.name} in ${location}`);
      }
      
      // Restore to unallocated if location is restricted
      this.addUnallocatedEquipment([equipment]);
      
      return {
        success: false,
        error,
        warning: `Equipment ${equipment.equipmentData.name} restored to unallocated pool due to location restriction`
      };
    }
    
    const section = this.sections.get(location);
    if (!section) {
      // Restore to unallocated if section not found
      this.addUnallocatedEquipment([equipment]);
      
      return {
        success: false,
        error: `Section not found: ${location}`
      };
    }
    
    if (this.options.logEquipmentOperations) {
      console.log(`[EquipmentCoordinationService] Attempting to allocate equipment to section ${location} at slot ${startSlot}`);
    }
    
    const success = section.allocateEquipment(equipment.equipmentData, startSlot, equipmentGroupId);
    
    if (!success) {
      if (this.options.logEquipmentOperations) {
        console.error(`[EquipmentCoordinationService] FAILED: Section allocation failed for ${equipment.equipmentData.name}`);
      }
      
      // Restore to unallocated if allocation failed
      this.addUnallocatedEquipment([equipment]);
      
      return {
        success: false,
        error: `Failed to allocate ${equipment.equipmentData.name} to ${location} slot ${startSlot}`,
        warning: `Equipment ${equipment.equipmentData.name} restored to unallocated pool`
      };
    }
    
    if (this.options.logEquipmentOperations) {
      console.log(`[EquipmentCoordinationService] SUCCESS: Equipment ${equipment.equipmentData.name} allocated to ${location} slot ${startSlot}`);
      console.log(`[EquipmentCoordinationService] Final unallocated equipment count: ${this.unallocatedEquipment.length}`);
    }
    
    return {
      success: true,
      equipmentMoved: equipment
    };
  }
  
  /**
   * Get total allocated equipment count
   */
  getAllocatedEquipmentCount(): number {
    let count = 0;
    this.sections.forEach(section => {
      count += section.getAllEquipment().length;
    });
    return count;
  }
  
  /**
   * Get total unallocated equipment count
   */
  getUnallocatedEquipmentCount(): number {
    return this.unallocatedEquipment.length;
  }
  
  /**
   * Get equipment statistics
   */
  getEquipmentStatistics(): {
    totalEquipment: number;
    allocatedEquipment: number;
    unallocatedEquipment: number;
    locationCounts: Record<string, number>;
    equipmentTypes: Record<string, number>;
  } {
    const locationCounts: Record<string, number> = {};
    const equipmentTypes: Record<string, number> = {};
    
    // Count allocated equipment by location
    this.sections.forEach((section, location) => {
      const equipment = section.getAllEquipment();
      locationCounts[location] = equipment.length;
      
      equipment.forEach(eq => {
        const type = eq.equipmentData.type || 'unknown';
        equipmentTypes[type] = (equipmentTypes[type] || 0) + 1;
      });
    });
    
    // Count unallocated equipment
    locationCounts['Unallocated'] = this.unallocatedEquipment.length;
    this.unallocatedEquipment.forEach(eq => {
      const type = eq.equipmentData.type || 'unknown';
      equipmentTypes[type] = (equipmentTypes[type] || 0) + 1;
    });
    
    const allocatedEquipment = this.getAllocatedEquipmentCount();
    const unallocatedEquipment = this.getUnallocatedEquipmentCount();
    
    return {
      totalEquipment: allocatedEquipment + unallocatedEquipment,
      allocatedEquipment,
      unallocatedEquipment,
      locationCounts,
      equipmentTypes
    };
  }
  
  /**
   * Search for equipment by name or ID
   */
  searchEquipment(query: string): EquipmentSearchResult[] {
    const results: EquipmentSearchResult[] = [];
    const searchTerm = query.toLowerCase();
    
    // Search allocated equipment
    this.sections.forEach((section, location) => {
      section.getAllEquipment().forEach(allocation => {
        const equipment = allocation.equipmentData;
        if (equipment.name.toLowerCase().includes(searchTerm) ||
            equipment.id.toLowerCase().includes(searchTerm)) {
          results.push({ section, allocation, location });
        }
      });
    });
    
    // Search unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      const equipment = allocation.equipmentData;
      if (equipment.name.toLowerCase().includes(searchTerm) ||
          equipment.id.toLowerCase().includes(searchTerm)) {
        results.push({ section: null, allocation, location: 'Unallocated' });
      }
    });
    
    return results;
  }
  
  /**
   * Clear all equipment (for testing/reset purposes)
   */
  clearAllEquipment(): void {
    if (this.options.logEquipmentOperations) {
      console.log('[EquipmentCoordinationService] Clearing all equipment');
    }
    
    // Clear from all sections
    this.sections.forEach(section => {
      const equipment = [...section.getAllEquipment()];
      equipment.forEach(eq => {
        section.removeEquipmentGroup(eq.equipmentGroupId);
      });
    });
    
    // Clear unallocated equipment
    this.unallocatedEquipment.length = 0;
    
    this.notifyStateChange();
  }
  
  /**
   * Validate equipment coordination state
   */
  validateEquipmentCoordination(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    duplicateGroups: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const duplicateGroups: string[] = [];
    const seenGroupIds = new Set<string>();
    
    // Collect all group IDs and check for duplicates
    const allGroups = this.getAllEquipmentGroups();
    allGroups.forEach(group => {
      if (seenGroupIds.has(group.groupId)) {
        duplicateGroups.push(group.groupId);
        errors.push(`Duplicate equipment group ID found: ${group.groupId}`);
      }
      seenGroupIds.add(group.groupId);
    });
    
    // Validate equipment in sections
    this.sections.forEach((section, location) => {
      section.getAllEquipment().forEach(allocation => {
        if (!allocation.equipmentGroupId) {
          errors.push(`Equipment in ${location} missing group ID: ${allocation.equipmentData.name}`);
        }
        
        if (allocation.location !== location) {
          warnings.push(`Equipment location mismatch in ${location}: ${allocation.equipmentData.name}`);
        }
      });
    });
    
    // Validate unallocated equipment
    this.unallocatedEquipment.forEach(allocation => {
      if (!allocation.equipmentGroupId) {
        errors.push(`Unallocated equipment missing group ID: ${allocation.equipmentData.name}`);
      }
      
      if (allocation.location && allocation.location !== '') {
        warnings.push(`Unallocated equipment has location set: ${allocation.equipmentData.name}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      duplicateGroups: Array.from(new Set(duplicateGroups))
    };
  }
  
  // ===== OBSERVER PATTERN FOR STATE CHANGES =====
  
  /**
   * Subscribe to state changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  /**
   * Notify all listeners about state changes
   */
  private notifyStateChange(): void {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[EquipmentCoordinationService] Error in state change listener:', error);
      }
    });
  }
}

// Singleton instance for global use
let globalEquipmentCoordinationService: EquipmentCoordinationService | null = null;

/**
 * Initialize global equipment coordination service
 */
export function initializeEquipmentCoordinationService(
  sections: Map<string, CriticalSection>,
  unallocatedEquipment: EquipmentAllocation[],
  configuration: UnitConfiguration,
  options?: Partial<EquipmentCoordinationOptions>
): EquipmentCoordinationService {
  globalEquipmentCoordinationService = new EquipmentCoordinationService(
    sections,
    unallocatedEquipment,
    configuration,
    options
  );
  return globalEquipmentCoordinationService;
}

/**
 * Get global equipment coordination service
 */
export function getEquipmentCoordinationService(): EquipmentCoordinationService | null {
  return globalEquipmentCoordinationService;
}

/**
 * Reset global equipment coordination service (for testing)
 */
export function resetEquipmentCoordinationService(): void {
  globalEquipmentCoordinationService = null;
}
