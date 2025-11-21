/**
 * Equipment Action Manager
 * Handles adding, removing, and moving equipment
 * Extracted from EquipmentAllocationService.ts
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';
import { 
  AddEquipmentResult, 
  RemoveEquipmentResult, 
  MoveEquipmentResult, 
  PlacementPreferences,
  EquipmentPlacement,
  EquipmentImpact
} from './types/AllocationTypes';
import { PlacementManager } from './PlacementManager';

export class EquipmentActionManager {
  private readonly placementManager = new PlacementManager();

  /**
   * Add equipment to unit
   */
  addEquipment(equipment: EquipmentAllocation, config: UnitConfiguration, preferences: PlacementPreferences): AddEquipmentResult {
    const alternatives = this.placementManager.suggestAlternativePlacements(equipment, config);
    const impact = this.calculateEquipmentImpact(equipment);
    
    if (alternatives.length > 0) {
      const bestPlacement = alternatives[0];
      const placement: EquipmentPlacement = {
        equipmentId: `${equipment.equipmentData?.name}_${Date.now()}`,
        equipment,
        location: bestPlacement.location,
        slots: bestPlacement.slots,
        isFixed: false,
        isValid: true,
        constraints: {
          allowedLocations: ['leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], // Simplified
          forbiddenLocations: [],
          requiresCASE: equipment.equipmentData?.explosive || false,
          requiresArtemis: false,
          minTonnageLocation: 0,
          maxTonnageLocation: 100,
          heatGeneration: equipment.equipmentData?.heat || 0,
          specialRules: []
        },
        conflicts: []
      };
      
      return {
        success: true,
        placement,
        alternatives,
        warnings: [],
        impact
      };
    }
    
    return {
      success: false,
      alternatives,
      warnings: ['No suitable location found'],
      impact
    };
  }
  
  /**
   * Remove equipment from unit
   */
  removeEquipment(equipmentId: string, config: UnitConfiguration): RemoveEquipmentResult {
    // Simplified implementation
    const freedSlots = { location: 'centerTorso', slots: [1, 2, 3] };
    const impact = { weight: -5, heat: -10, firepower: -15, balance: 0, efficiency: 5 };
    
    return {
      success: true,
      freedSlots,
      impact,
      suggestions: ['Consider replacing with alternative equipment']
    };
  }
  
  /**
   * Move equipment to new location
   */
  moveEquipment(equipmentId: string, fromLocation: string, toLocation: string, config: UnitConfiguration): MoveEquipmentResult {
    // Simplified implementation
    const impact = { weight: 0, heat: 0, firepower: 0, balance: 5, efficiency: 3 };
    
    return {
      success: true,
      warnings: [],
      impact
    };
  }
  
  // ===== HELPER METHODS =====

  private calculateEquipmentImpact(equipment: EquipmentAllocation): EquipmentImpact {
    const equipmentData = equipment.equipmentData || {};
    
    return {
      weight: equipmentData.tonnage || 0,
      heat: equipmentData.heat || 0,
      // @ts-ignore - damage check
      firepower: equipmentData.damage || 0,
      balance: 0, // Simplified
      efficiency: 5 // Simplified
    };
  }
} 

