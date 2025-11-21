/**
 * Customizer Reset Service
 * 
 * Handles resetting the customizer to default state while preserving:
 * - All required system components (engine, gyro, cockpit, actuators)
 * - Unit configuration (tonnage, tech base, movement)
 * - System component types and specifications
 * 
 * Removes:
 * - All user-added equipment
 * - All allocated equipment
 * - All unallocated equipment
 * - Custom armor allocations (resets to default)
 */

import { UnitConfiguration } from '../criticalSlots/UnitCriticalManager';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { EquipmentAllocation } from '../criticalSlots/CriticalSlot';
import { CriticalSection } from '../criticalSlots/CriticalSection';
import { SystemComponents } from '../../types/systemComponents';

export interface ResetOptions {
  /** Whether to reset armor allocation to default */
  resetArmorAllocation?: boolean;
  /** Whether to reset heat sink count to minimum */
  resetHeatSinks?: boolean;
  /** Whether to reset jump jets */
  resetJumpJets?: boolean;
  /** Whether to preserve any specific equipment (by ID) */
  preserveEquipment?: string[];
}

export interface ResetResult {
  success: boolean;
  removedEquipment: EquipmentAllocation[];
  resetSections: string[];
  errors: string[];
  warnings: string[];
}

export class CustomizerResetService {
  
  /**
   * Reset unit to default configuration
   */
  static resetUnit(
    unit: any,
    options: ResetOptions = {}
  ): ResetResult {
    const result: ResetResult = {
      success: true,
      removedEquipment: [],
      resetSections: [],
      errors: [],
      warnings: []
    };

    try {
      console.log('[CustomizerResetService] Starting unit reset with options:', options);

      // Step 1: Collect all equipment to be removed
      const equipmentToRemove = this.collectEquipmentToRemove(unit, options.preserveEquipment || []);
      result.removedEquipment = equipmentToRemove;

      // Step 2: Clear all sections
      const sections = unit.getAllSections?.() || [];
      sections.forEach((section: CriticalSection) => {
        this.clearSectionEquipment(section, options.preserveEquipment || []);
        result.resetSections.push(section.location);
      });

      // Step 3: Clear unallocated equipment
      this.clearUnallocatedEquipment(unit, options.preserveEquipment || []);

      // Step 4: Reset configuration if needed
      this.resetConfiguration(unit, options);

      // Step 5: Reinitialize system components
      this.reinitializeSystemComponents(unit);

      // Step 6: Validate reset state
      const validation = this.validateResetState(unit);
      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);

      console.log('[CustomizerResetService] Reset completed successfully');
      console.log(`[CustomizerResetService] Removed ${result.removedEquipment.length} equipment pieces`);
      console.log(`[CustomizerResetService] Reset ${result.resetSections.length} sections`);

    } catch (error) {
      console.error('[CustomizerResetService] Reset failed:', error);
      result.success = false;
      result.errors.push(`Reset failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Collect all equipment that should be removed
   */
  private static collectEquipmentToRemove(unit: any, preserveEquipment: string[]): EquipmentAllocation[] {
    const equipmentToRemove: EquipmentAllocation[] = [];

    // Collect from all sections
    const sections = unit.getAllSections?.() || [];
    sections.forEach((section: CriticalSection) => {
      const sectionEquipment = section.getAllEquipment?.() || [];
      sectionEquipment.forEach((allocation: EquipmentAllocation) => {
        if (!this.isSystemComponent(allocation) && !preserveEquipment.includes(allocation.equipmentGroupId)) {
          equipmentToRemove.push(allocation);
        }
      });
    });

    // Collect from unallocated equipment
    const unallocatedEquipment = unit.unallocatedEquipment || [];
    unallocatedEquipment.forEach((allocation: EquipmentAllocation) => {
      if (!preserveEquipment.includes(allocation.equipmentGroupId)) {
        equipmentToRemove.push(allocation);
      }
    });

    return equipmentToRemove;
  }

  /**
   * Clear equipment from a section while preserving system components
   */
  private static clearSectionEquipment(section: CriticalSection, preserveEquipment: string[]): void {
    const equipment = section.getAllEquipment?.() || [];
    
    equipment.forEach((allocation: EquipmentAllocation) => {
      // Don't remove system components or preserved equipment
      if (!this.isSystemComponent(allocation) && !preserveEquipment.includes(allocation.equipmentGroupId)) {
        section.removeEquipmentGroup?.(allocation.equipmentGroupId);
      }
    });
  }

  /**
   * Clear unallocated equipment
   */
  private static clearUnallocatedEquipment(unit: any, preserveEquipment: string[]): void {
    if (!unit.unallocatedEquipment) return;

    const unallocatedEquipment = [...unit.unallocatedEquipment];
    unallocatedEquipment.forEach((allocation: EquipmentAllocation) => {
      if (!preserveEquipment.includes(allocation.equipmentGroupId)) {
        // Remove from unallocated pool
        const index = unit.unallocatedEquipment.findIndex((eq: EquipmentAllocation) => 
          eq.equipmentGroupId === allocation.equipmentGroupId
        );
        if (index !== -1) {
          unit.unallocatedEquipment.splice(index, 1);
        }
      }
    });
  }

  /**
   * Reset configuration to defaults
   */
  private static resetConfiguration(unit: any, options: ResetOptions): void {
    const config = unit.getConfiguration?.() || {};

    // Reset armor allocation to default if requested
    if (options.resetArmorAllocation && config.armorAllocation) {
      config.armorAllocation = this.getDefaultArmorAllocation(config.tonnage);
    }

    // Reset heat sink count to minimum if requested
    if (options.resetHeatSinks && config.totalHeatSinks) {
      const engineRating = config.engineRating || config.tonnage * 4;
      const internalHeatSinks = Math.floor(engineRating / 25);
      config.totalHeatSinks = Math.max(10, internalHeatSinks);
    }

    // Reset jump jets if requested
    if (options.resetJumpJets) {
      config.jumpMP = 0;
      config.jumpJetType = { type: 'None', techBase: config.techBase as 'Inner Sphere' | 'Clan' };
    }

    // Update the unit configuration
    if (unit.updateConfiguration) {
      unit.updateConfiguration(config);
    }
  }

  /**
   * Reinitialize system components to ensure they're properly placed
   */
  private static reinitializeSystemComponents(unit: any): void {
    // This ensures all system components are properly placed in critical slots
    if (unit.reinitializeSystemComponents) {
      unit.reinitializeSystemComponents();
    }
  }

  /**
   * Validate the reset state
   */
  private static validateResetState(unit: any): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check that system components are still present
    const sections = unit.getAllSections?.() || [];
    const hasEngine = sections.some((section: CriticalSection) => 
      section.getAllEquipment?.().some((eq: EquipmentAllocation) => 
        eq.equipmentData.name.includes('Engine')
      )
    );

    const hasGyro = sections.some((section: CriticalSection) => 
      section.getAllEquipment?.().some((eq: EquipmentAllocation) => 
        eq.equipmentData.name.includes('Gyro')
      )
    );

    const hasCockpit = sections.some((section: CriticalSection) => 
      section.getAllEquipment?.().some((eq: EquipmentAllocation) => 
        eq.equipmentData.name.includes('Cockpit')
      )
    );

    if (!hasEngine) {
      errors.push('Engine system component missing after reset');
    }
    if (!hasGyro) {
      errors.push('Gyro system component missing after reset');
    }
    if (!hasCockpit) {
      errors.push('Cockpit system component missing after reset');
    }

    // Check for any remaining user equipment
    const remainingEquipment = this.countUserEquipment(unit);
    if (remainingEquipment > 0) {
      warnings.push(`${remainingEquipment} user equipment pieces remain after reset`);
    }

    return { errors, warnings };
  }

  /**
   * Check if equipment is a system component
   */
  private static isSystemComponent(allocation: EquipmentAllocation): boolean {
    const systemComponentNames = [
      'Engine', 'Gyro', 'Cockpit', 'Life Support', 'Sensors',
      'Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator',
      'Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator'
    ];

    return systemComponentNames.some(name => 
      allocation.equipmentData.name.includes(name)
    );
  }

  /**
   * Count remaining user equipment
   */
  private static countUserEquipment(unit: any): number {
    let count = 0;

    // Count from sections
    const sections = unit.getAllSections?.() || [];
    sections.forEach((section: CriticalSection) => {
      const equipment = section.getAllEquipment?.() || [];
      equipment.forEach((allocation: EquipmentAllocation) => {
        if (!this.isSystemComponent(allocation)) {
          count++;
        }
      });
    });

    // Count from unallocated
    count += (unit.unallocatedEquipment?.length || 0);

    return count;
  }

  /**
   * Get default armor allocation based on tonnage
   */
  private static getDefaultArmorAllocation(tonnage: number): any {
    // Simple default armor allocation
    const maxArmor = Math.floor(tonnage * 2);
    const frontArmor = Math.floor(maxArmor * 0.6);
    const rearArmor = Math.floor(maxArmor * 0.4);

    return {
      HD: { front: Math.min(9, frontArmor), rear: 0 },
      CT: { front: Math.floor(frontArmor * 0.3), rear: Math.floor(rearArmor * 0.3) },
      LT: { front: Math.floor(frontArmor * 0.25), rear: Math.floor(rearArmor * 0.25) },
      RT: { front: Math.floor(frontArmor * 0.25), rear: Math.floor(rearArmor * 0.25) },
      LA: { front: Math.floor(frontArmor * 0.1), rear: 0 },
      RA: { front: Math.floor(frontArmor * 0.1), rear: 0 },
      LL: { front: Math.floor(frontArmor * 0.1), rear: 0 },
      RL: { front: Math.floor(frontArmor * 0.1), rear: 0 }
    };
  }
} 