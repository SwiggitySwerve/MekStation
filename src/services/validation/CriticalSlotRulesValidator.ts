/**
 * CriticalSlotRulesValidator - BattleTech critical slot validation rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles critical slot usage, overflow, and placement validation.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';
import { ValidationCalculations } from './ValidationCalculations';

export interface CriticalSlotValidation {
  isValid: boolean;
  totalSlotsUsed: number;
  totalSlotsAvailable: number;
  locationUtilization: { [location: string]: SlotUtilization };
  violations: CriticalSlotViolation[];
  recommendations: string[];
}

export interface SlotUtilization {
  used: number;
  available: number;
  utilization: number;
  overflow: boolean;
}

export interface CriticalSlotViolation {
  location: string;
  type: 'overflow' | 'invalid_placement' | 'special_component_violation';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export class CriticalSlotRulesValidator {
  
  /**
   * Validate critical slots for a unit configuration
   */
  static validateCriticalSlots(config: UnitConfiguration, equipment: EquipmentAllocation[]): CriticalSlotValidation {
    const violations: CriticalSlotViolation[] = [];
    const recommendations: string[] = [];
    
    const totalSlotsAvailable = 78; // Standard bipedal mech
    const totalSlotsUsed = ValidationCalculations.calculateTotalSlotsUsed(config, equipment);
    const locationUtilization: { [location: string]: SlotUtilization } = {};
    
    const locations = ['head', 'centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    const slotCounts = [6, 12, 12, 12, 12, 12, 6, 6];
    
    locations.forEach((location, index) => {
      // Determine used slots for this location
      // This logic requires mapping equipment to locations.
      // Assuming equipment has location field or is allocated.
      // ConstructionRulesValidator had simplified used=0.
      // We try to improve it slightly if possible, or keep simplified if data is missing.
      
      const slotsInLocation = equipment.filter(e => e.location === location)
                                       .reduce((sum, e) => sum + (e.equipmentData?.criticals || 1), 0);

      const used = slotsInLocation;
      const available = slotCounts[index];
      
      locationUtilization[location] = {
        used,
        available,
        utilization: available > 0 ? (used / available) * 100 : 0,
        overflow: used > available
      };
      
      if (used > available) {
        violations.push({
          location,
          type: 'overflow',
          message: `Location ${location} has ${used} slots used but only ${available} available`,
          severity: 'critical',
          suggestedFix: 'Move equipment to other locations'
        });
      }
    });
    
    return {
      isValid: violations.length === 0,
      totalSlotsUsed,
      totalSlotsAvailable,
      locationUtilization,
      violations,
      recommendations
    };
  }
}

export default CriticalSlotRulesValidator;

