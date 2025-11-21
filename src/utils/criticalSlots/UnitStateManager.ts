/**
 * UnitStateManager
 * Handles state management, notifications, and observer pattern functionality.
 * Extracted from UnitCriticalManager for modularity and SOLID compliance.
 */

import { UnitCriticalManager, UnitConfiguration } from './UnitCriticalManager';
import { createComponentConfiguration } from '../../types/componentConfiguration';

export interface StateChangeListener {
  (): void;
}

export interface StateChangeEvent {
  type: string;
  data?: any;
  timestamp: number;
}

export interface UnitSummary {
  totalSections: number;
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
  totalEquipment: number;
  unallocatedEquipment: number;
  systemSlots: number;
  totalWeight: number;
  heatGenerated: number;
  heatDissipated: number;
}

export interface UserEquipmentSlotStatus {
  totalUserSlots: number;      // Slots available for user equipment
  usedUserSlots: number;       // Slots occupied by user equipment
  availableUserSlots: number;  // Remaining slots for user equipment
}

import { CriticalSection } from './CriticalSection';
import { EquipmentAllocation } from './CriticalSlot';

export class UnitStateManager {
  private listeners: StateChangeListener[] = [];
  private sections: Map<string, CriticalSection>;
  private unallocatedEquipment: EquipmentAllocation[];
  private unitCriticalManager: UnitCriticalManager;
  private changeHistory: StateChangeEvent[] = [];

  constructor(configurationOrSections?: UnitConfiguration | Map<string, CriticalSection>, unallocatedEquipment?: EquipmentAllocation[], unitManager?: UnitCriticalManager) {
    // Support both constructor signatures for backward compatibility
    if (configurationOrSections instanceof Map) {
      // Legacy constructor: (sections, unallocatedEquipment, unitManager)
      this.sections = configurationOrSections;
      this.unallocatedEquipment = unallocatedEquipment || [];
      // Use provided unit manager or create a default one (only if no manager provided)
      if (unitManager) {
        this.unitCriticalManager = unitManager;
      } else {
        this.unitCriticalManager = new UnitCriticalManager(this.createDefaultConfiguration());
      }
    } else {
      // New constructor: (configuration?)
      const config = configurationOrSections || this.createDefaultConfiguration();
      this.unitCriticalManager = new UnitCriticalManager(config);
      this.sections = new Map();
      this.unallocatedEquipment = [];
      
      // Track initialization
      this.addChangeEvent({
        type: 'unit_updated',
        data: { action: 'initialized', configuration: config },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get the current unit critical manager instance
   */
  getCurrentUnit(): UnitCriticalManager {
    return this.unitCriticalManager;
  }

  /**
   * Create default configuration
   */
  private createDefaultConfiguration(): UnitConfiguration {
    return {
      chassis: 'Standard',
      model: '50-ton BattleMech',
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard',
      gyroType: createComponentConfiguration('gyro', 'Standard')!,
      structureType: createComponentConfiguration('structure', 'Standard')!,
      armorType: createComponentConfiguration('armor', 'Standard')!,
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 20, rear: 6 },
        LT: { front: 16, rear: 5 },
        RT: { front: 16, rear: 5 },
        LA: { front: 16, rear: 0 },
        RA: { front: 16, rear: 0 },
        LL: { front: 20, rear: 0 },
        RL: { front: 20, rear: 0 }
      },
      armorTonnage: 8.0,
      heatSinkType: createComponentConfiguration('heatSink', 'Single')!,
      totalHeatSinks: 10,
      internalHeatSinks: 8,
      externalHeatSinks: 2,
      enhancements: [],
      jumpMP: 0,
      jumpJetType: createComponentConfiguration('jumpJet', 'Standard Jump Jet')!,
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50
    };
  }

  /**
   * Add change event to history
   */
  private addChangeEvent(event: StateChangeEvent): void {
    this.changeHistory.push(event);
    // Keep only last 100 events to prevent memory issues
    if (this.changeHistory.length > 100) {
      this.changeHistory.shift();
    }
  }

  /**
   * Get change history
   */
  getChangeHistory(): StateChangeEvent[] {
    return [...this.changeHistory];
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: StateChangeListener): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners about state changes
   */
  notifyStateChange(): void {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in state subscriber callback:', error);
      }
    });
  }

  /**
   * Get summary statistics
   */
  getSummary(): UnitSummary {
    let totalSlots = 0;
    let occupiedSlots = 0;
    let systemSlots = 0;
    
    // Count mandatory fixed components that are always present
    const mandatorySlots = this.getMandatoryComponentSlots();
    
    this.sections.forEach(section => {
      totalSlots += section.getTotalSlots();
      section.getAllSlots().forEach((slot) => {
        if (!slot.isEmpty()) {
          occupiedSlots++;
          if (slot.isSystemSlot()) {
            systemSlots++;
          }
        }
      });
    });
    
    // Add mandatory component slots to occupied count
    occupiedSlots += mandatorySlots;
    systemSlots += mandatorySlots;
    
    return {
      totalSections: this.sections.size,
      totalSlots,
      occupiedSlots,
      availableSlots: totalSlots - occupiedSlots,
      totalEquipment: this.getAllocatedEquipmentCount(),
      unallocatedEquipment: this.getUnallocatedEquipmentCount(),
      systemSlots,
      totalWeight: 0, // Will be calculated by UnitCalculationManager
      heatGenerated: 0, // Will be calculated by HeatManagementManager
      heatDissipated: 0 // Will be calculated by HeatManagementManager
    };
  }

  /**
   * Get slot status specifically for user equipment (excludes system components)
   */
  getUserEquipmentSlotStatus(): UserEquipmentSlotStatus {
    // Calculate system component slot usage
    const systemReservedSlots = this.calculateSystemReservedSlots();
    
    // Calculate available slots for user equipment
    const totalCriticalSlots = 78; // Standard BattleMech total
    const totalUserSlots = totalCriticalSlots - systemReservedSlots;
    
    // Count user equipment slots (exclude system components)
    let usedUserSlots = 0;
    this.sections.forEach(section => {
      section.getAllEquipment().forEach((allocation: EquipmentAllocation) => {
        // Only count user equipment, not system components
        if (!this.isSystemComponent(allocation.equipmentData)) {
          usedUserSlots += allocation.occupiedSlots.length;
        }
      });
    });
    
    // Calculate remaining slots available for user equipment
    const availableUserSlots = Math.max(0, totalUserSlots - usedUserSlots);
    
    return {
      totalUserSlots,
      usedUserSlots,
      availableUserSlots
    };
  }

  /**
   * Get mandatory component critical slots that are always present
   */
  private getMandatoryComponentSlots(): number {
    // Fixed components that are always present:
    // - Cockpit: 1 slot (Head)
    // - Life Support: 2 slots (Head) 
    // - Sensors: 2 slots (Head)
    // - Actuators: 4 slots per arm (shoulder, upper, lower, hand) + 4 slots per leg (hip, upper, lower, foot)
    
    const cockpitSlots = 1;
    const lifeSupportSlots = 2;
    const sensorSlots = 2;
    const armActuatorSlots = 4 * 2; // 4 slots per arm × 2 arms
    const legActuatorSlots = 4 * 2; // 4 slots per leg × 2 legs
    
    return cockpitSlots + lifeSupportSlots + sensorSlots + armActuatorSlots + legActuatorSlots;
  }

  /**
   * Calculate system reserved slots
   */
  private calculateSystemReservedSlots(): number {
    // This would need to be calculated based on the actual system components
    // For now, return a reasonable estimate
    return 20; // Engine + Gyro + Fixed components
  }

  /**
   * Check if equipment is a system component (engine, gyro, actuators, etc.)
   */
  private isSystemComponent(equipment: { name?: string }): boolean {
    const name = equipment.name.toLowerCase();
    
    // System component patterns
    const systemPatterns = [
      'engine', 'gyro', 'actuator', 'cockpit', 'life support', 'sensors',
      'shoulder', 'upper arm', 'lower arm', 'hand', 'hip', 'upper leg', 'lower leg', 'foot'
    ];
    
    return systemPatterns.some(pattern => name.includes(pattern));
  }

  /**
   * Get allocated equipment count
   */
  private getAllocatedEquipmentCount(): number {
    let count = 0;
    this.sections.forEach(section => {
      count += section.getAllEquipment().length;
    });
    return count;
  }

  /**
   * Get unallocated equipment count
   */
  private getUnallocatedEquipmentCount(): number {
    return this.unallocatedEquipment.length;
  }

  /**
   * Update internal references when sections or unallocated equipment change
   */
  updateReferences(sections: Map<string, CriticalSection>, unallocatedEquipment: EquipmentAllocation[]): void {
    this.sections = sections;
    this.unallocatedEquipment = unallocatedEquipment;
  }

  // ===== ADDITIONAL METHODS FOR TEST COMPATIBILITY =====

  /**
   * Add unallocated equipment (delegated to unit manager)
   */
  addUnallocatedEquipment(equipment: EquipmentAllocation | EquipmentAllocation[]): void {
    // Convert single equipment to array format if needed
    const equipmentArray = Array.isArray(equipment) ? equipment : [equipment];
    
    // Create proper equipment allocations with unique IDs
    const allocations = equipmentArray.map(eq => ({
      equipmentGroupId: `equipment-${++UnitStateManager.equipmentCounter}`,
      equipmentData: eq,
      location: '',
      occupiedSlots: [],
      startSlotIndex: -1,
      endSlotIndex: -1
    }));

    this.unitCriticalManager.addUnallocatedEquipment(allocations);
    this.addChangeEvent({
      type: 'equipment_change',
      data: { action: 'added_unallocated', count: allocations.length },
      timestamp: Date.now()
    });
    this.notifyStateChange();
  }

  /**
   * Remove equipment (delegated to unit manager)
   */
  removeEquipment(equipmentGroupId: string): boolean {
    // Try removing from unallocated first
    const removedUnallocated = this.unitCriticalManager.removeUnallocatedEquipment(equipmentGroupId);
    if (removedUnallocated) {
      this.addChangeEvent({
        type: 'equipment_change',
        data: { action: 'removed_from_unallocated', equipmentGroupId },
        timestamp: Date.now()
      });
      this.notifyStateChange();
      return true;
    }

    // Try displacing from allocated slots
    const displaced = this.unitCriticalManager.displaceEquipment(equipmentGroupId);
    if (displaced) {
      this.addChangeEvent({
        type: 'equipment_change',
        data: { action: 'displaced_to_unallocated', equipmentGroupId },
        timestamp: Date.now()
      });
      this.notifyStateChange();
      return true;
    }

    return false;
  }

  /**
   * Add test equipment to specific location
   */
  addTestEquipment(equipment: { requiredSlots?: number; name?: string }, location: string, startSlot?: number): boolean {
    const section = this.unitCriticalManager.getSection(location);
    if (!section) return false;

    let slotIndex = startSlot;
    if (slotIndex === undefined) {
      const availableSlots = section.findContiguousAvailableSlots(equipment.requiredSlots || 1);
      if (!availableSlots || availableSlots.length === 0) return false;
      slotIndex = availableSlots[0];
    }

    const success = section.allocateEquipment(equipment, slotIndex);
    if (success) {
      this.addChangeEvent({
        type: 'equipment_change',
        data: { action: 'added', location, slotIndex, equipment: equipment.name },
        timestamp: Date.now()
      });
      this.notifyStateChange();
    }

    return success;
  }

  /**
   * Handle engine changes (delegated)
   */
  handleEngineChange(newEngineType: string, options?: { attemptMigration?: boolean; preserveLocationPreference?: boolean }): { summary: { totalDisplaced: number }; newUnit?: UnitCriticalManager } {
    const currentEngineType = this.unitCriticalManager.getEngineType();
    if (currentEngineType === newEngineType) {
      return { summary: { totalDisplaced: 0 } };
    }

    // Use MechConstructor if available
    try {
      const { MechConstructor } = require('./MechConstructor');
      const result = MechConstructor.changeEngine(
        this.unitCriticalManager,
        newEngineType,
        options || { attemptMigration: false, preserveLocationPreference: false }
      );

      this.addChangeEvent({
        type: 'system_change',
        data: { component: 'engine', from: currentEngineType, to: newEngineType },
        timestamp: Date.now()
      });
      this.notifyStateChange();

      return result;
    } catch (error) {
      console.warn('MechConstructor not available, using basic engine change');
      return { newUnit: this.unitCriticalManager, summary: { totalDisplaced: 0 } };
    }
  }

  /**
   * Handle gyro changes (delegated)
   */
  handleGyroChange(newGyroType: string, options?: { attemptMigration?: boolean; preserveLocationPreference?: boolean }): { summary: { totalDisplaced: number }; newUnit?: UnitCriticalManager } {
    const currentGyroType = this.unitCriticalManager.getGyroType();
    if (currentGyroType === newGyroType) {
      return { summary: { totalDisplaced: 0 } };
    }

    try {
      const { MechConstructor } = require('./MechConstructor');
      const result = MechConstructor.changeGyro(
        this.unitCriticalManager,
        newGyroType,
        options || { attemptMigration: false, preserveLocationPreference: false }
      );

      this.addChangeEvent({
        type: 'system_change',
        data: { component: 'gyro', from: currentGyroType, to: newGyroType },
        timestamp: Date.now()
      });
      this.notifyStateChange();

      return result;
    } catch (error) {
      console.warn('MechConstructor not available, using basic gyro change');
      return { newUnit: this.unitCriticalManager, summary: { totalDisplaced: 0 } };
    }
  }

  /**
   * Handle engine and gyro changes together
   */
  handleEngineAndGyroChange(newEngineType: string, newGyroType: string, options?: { attemptMigration?: boolean; preserveLocationPreference?: boolean }): { summary: { totalDisplaced: number }; newUnit?: UnitCriticalManager } {
    try {
      const { MechConstructor } = require('./MechConstructor');
      const result = MechConstructor.changeEngineAndGyro(
        this.unitCriticalManager,
        newEngineType,
        newGyroType,
        options || { attemptMigration: false, preserveLocationPreference: false }
      );

      this.addChangeEvent({
        type: 'system_change',
        data: { component: 'engine_and_gyro', engineType: newEngineType, gyroType: newGyroType },
        timestamp: Date.now()
      });
      this.notifyStateChange();

      return result;
    } catch (error) {
      console.warn('MechConstructor not available, using basic changes');
      return { newUnit: this.unitCriticalManager, summary: { totalDisplaced: 0 } };
    }
  }

  /**
   * Handle configuration updates
   */
  handleConfigurationUpdate(newConfig: UnitConfiguration): void {
    const oldConfig = this.unitCriticalManager.getConfiguration();
    this.unitCriticalManager.updateConfiguration(newConfig);

    // Check if this is a significant change
    const hasSignificantChanges = (
      oldConfig.engineType !== newConfig.engineType ||
      JSON.stringify(oldConfig.gyroType) !== JSON.stringify(newConfig.gyroType) ||
      oldConfig.tonnage !== newConfig.tonnage
    );

    this.addChangeEvent({
      type: 'unit_updated',
      data: { action: 'configuration_update', hasSignificantChanges },
      timestamp: Date.now()
    });
    this.notifyStateChange();
  }

  /**
   * Get configuration (delegated)
   */
  getConfiguration(): UnitConfiguration {
    return this.unitCriticalManager.getConfiguration();
  }

  /**
   * Get comprehensive unit summary
   */
  getUnitSummary(): { configuration: UnitConfiguration; summary: UnitSummary; validation: unknown; unallocatedEquipment: EquipmentAllocation[]; equipmentByLocation: unknown } {
    return {
      configuration: this.unitCriticalManager.getConfiguration(),
      summary: this.unitCriticalManager.getSummary(),
      validation: this.unitCriticalManager.validate(),
      unallocatedEquipment: this.unitCriticalManager.getUnallocatedEquipment(),
      equipmentByLocation: this.unitCriticalManager.getEquipmentByLocation()
    };
  }

  /**
   * Reset unit to clean state
   */
  resetUnit(config?: UnitConfiguration): void {
    // Reset to base configuration (this clears equipment)
    this.unitCriticalManager.resetToBaseConfiguration();
    
    // Update configuration if provided
    if (config) {
      this.unitCriticalManager.updateConfiguration(config);
    }

    this.addChangeEvent({
      type: 'unit_updated',
      data: { action: 'reset' },
      timestamp: Date.now()
    });
    this.notifyStateChange();
  }

  // ===== ADDITIONAL TEST COMPATIBILITY METHODS =====

  /**
   * Get validation status
   */
  getValidation(): unknown {
    return this.unitCriticalManager.validate();
  }

  /**
   * Get engine type
   */
  getEngineType(): string {
    return this.unitCriticalManager.getEngineType();
  }

  /**
   * Get gyro type
   */
  getGyroType(): string {
    return this.unitCriticalManager.getGyroType();
  }

  /**
   * Get recent changes from history
   */
  getRecentChanges(count: number = 10): StateChangeEvent[] {
    return this.changeHistory.slice(-count);
  }

  /**
   * Get debug information about current state
   */
  getDebugInfo(): { unallocatedCount: number; changeHistoryLength: number; sectionsCount: number; equipmentByLocation: unknown; configuration: UnitConfiguration; lastChange: StateChangeEvent | null } {
    return {
      unallocatedCount: this.unallocatedEquipment.length,
      changeHistoryLength: this.changeHistory.length,
      sectionsCount: this.sections.size,
      equipmentByLocation: this.unitCriticalManager.getEquipmentByLocation(),
      configuration: this.unitCriticalManager.getConfiguration(),
      lastChange: this.changeHistory[this.changeHistory.length - 1] || null
    };
  }

  // Static counter for unique equipment IDs
  private static equipmentCounter = 0;
}
