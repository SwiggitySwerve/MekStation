/**
 * Validation Service
 * 
 * Validates mech builds against BattleTech construction rules.
 * 
 * @spec openspec/specs/construction-services/spec.md
 */

import { IValidationResult, IValidationError, ValidationSeverity, validResult, invalidResult } from '../common/types';
import { IEditableMech } from './MechBuilderService';
import { calculateEngineWeight } from '@/utils/construction/engineCalculations';
import { EngineType } from '@/types/construction/EngineType';
import { getStructurePoints } from '@/types/construction/InternalStructureType';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBase } from '@/types/enums/TechBase';

/**
 * Validation service interface
 */
export interface IValidationService {
  validate(mech: IEditableMech): IValidationResult;
  validateWeight(mech: IEditableMech): IValidationError[];
  validateArmor(mech: IEditableMech): IValidationError[];
  validateCriticalSlots(mech: IEditableMech): IValidationError[];
  validateTechLevel(mech: IEditableMech): IValidationError[];
  canAddEquipment(mech: IEditableMech, equipmentId: string, location: string): boolean;
}

/**
 * Calculate maximum armor for a location
 * Per TechManual: max armor = 2 × structure points (head = 9 maximum)
 */
function getMaxArmorForLocation(tonnage: number, location: string): number {
  if (location === 'head') {
    return 9; // Head always has max 9 armor regardless of structure
  }
  
  const structurePoints = getStructurePoints(tonnage, location);
  return structurePoints * 2;
}

/**
 * Validation Service implementation
 */
export class ValidationService implements IValidationService {

  /**
   * Validate entire mech build
   */
  validate(mech: IEditableMech): IValidationResult {
    const allErrors: IValidationError[] = [
      ...this.validateWeight(mech),
      ...this.validateArmor(mech),
      ...this.validateCriticalSlots(mech),
      ...this.validateTechLevel(mech),
      ...this.validateEngine(mech),
      ...this.validateHeatSinks(mech),
    ];

    if (allErrors.length === 0) {
      return validResult();
    }

    return invalidResult(allErrors);
  }

  /**
   * Validate weight budget
   */
  validateWeight(mech: IEditableMech): IValidationError[] {
    const errors: IValidationError[] = [];
    
    // Calculate total weight (simplified)
    const structureWeight = mech.tonnage * 0.1; // 10% for standard
    const engineWeight = this.getEngineWeight(mech.engineRating, mech.engineType);
    const gyroWeight = Math.ceil(mech.engineRating / 100);
    const cockpitWeight = 3;
    const armorWeight = this.calculateArmorWeight(mech.armorAllocation);
    const heatSinkWeight = Math.max(0, mech.heatSinkCount - 10); // First 10 are free
    
    const totalWeight = structureWeight + engineWeight + gyroWeight + cockpitWeight + armorWeight + heatSinkWeight;
    
    if (totalWeight > mech.tonnage) {
      const overage = (totalWeight - mech.tonnage).toFixed(1);
      errors.push({
        code: 'OVERWEIGHT',
        message: `Mech exceeds maximum tonnage by ${overage} tons`,
        severity: ValidationSeverity.ERROR,
        details: { totalWeight, maxWeight: mech.tonnage },
      });
    }

    return errors;
  }

  /**
   * Validate armor limits
   * Per TechManual: max armor = 2 × structure points (head = 9 maximum)
   */
  validateArmor(mech: IEditableMech): IValidationError[] {
    const errors: IValidationError[] = [];
    const armor = mech.armorAllocation;

    // Check each location against its maximum
    const locationChecks: { location: string; actual: number; rear?: number }[] = [
      { location: 'head', actual: armor.head },
      { location: 'centerTorso', actual: armor.centerTorso, rear: armor.centerTorsoRear },
      { location: 'leftTorso', actual: armor.leftTorso, rear: armor.leftTorsoRear },
      { location: 'rightTorso', actual: armor.rightTorso, rear: armor.rightTorsoRear },
      { location: 'leftArm', actual: armor.leftArm },
      { location: 'rightArm', actual: armor.rightArm },
      { location: 'leftLeg', actual: armor.leftLeg },
      { location: 'rightLeg', actual: armor.rightLeg },
    ];

    for (const check of locationChecks) {
      const maxArmor = getMaxArmorForLocation(mech.tonnage, check.location);
      
      // For torso locations, front + rear must not exceed max
      if (check.rear !== undefined) {
        const totalTorsoArmor = check.actual + check.rear;
        if (totalTorsoArmor > maxArmor) {
          errors.push({
            code: 'ARMOR_EXCEEDS_MAX',
            message: `${check.location} total armor (${totalTorsoArmor}) exceeds maximum of ${maxArmor}`,
            severity: ValidationSeverity.ERROR,
            field: check.location,
            details: { front: check.actual, rear: check.rear, total: totalTorsoArmor, max: maxArmor },
          });
        }
      } else {
        if (check.actual > maxArmor) {
          errors.push({
            code: 'ARMOR_EXCEEDS_MAX',
            message: `${check.location} armor (${check.actual}) exceeds maximum of ${maxArmor}`,
            severity: ValidationSeverity.ERROR,
            field: check.location,
            details: { actual: check.actual, max: maxArmor },
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate critical slots
   */
  validateCriticalSlots(mech: IEditableMech): IValidationError[] {
    const errors: IValidationError[] = [];
    
    // Count slots per location
    const slotsUsed: Record<string, number> = {};
    for (const eq of mech.equipment) {
      slotsUsed[eq.location] = (slotsUsed[eq.location] || 0) + 1;
    }

    // Check against max (simplified - actual max varies)
    const maxSlots: Record<string, number> = {
      head: 6,
      centerTorso: 12,
      leftTorso: 12,
      rightTorso: 12,
      leftArm: 12,
      rightArm: 12,
      leftLeg: 6,
      rightLeg: 6,
    };

    for (const [location, used] of Object.entries(slotsUsed)) {
      const max = maxSlots[location] || 12;
      if (used > max) {
        errors.push({
          code: 'SLOTS_EXCEEDED',
          message: `${location} exceeds maximum of ${max} critical slots`,
          severity: ValidationSeverity.ERROR,
          field: location,
          details: { used, max },
        });
      }
    }

    return errors;
  }

  /**
   * Validate tech level compatibility
   * Checks that all equipment is compatible with the mech's tech base
   */
  validateTechLevel(mech: IEditableMech): IValidationError[] {
    const errors: IValidationError[] = [];
    const registry = getEquipmentRegistry();
    
    for (const slot of mech.equipment) {
      const result = registry.lookup(slot.equipmentId);
      if (!result.found || !result.equipment) {
        continue; // Skip unknown equipment
      }
      
      const equipment = result.equipment;
      if (!('techBase' in equipment)) {
        continue; // Skip equipment without tech base info
      }
      
      const eqTechBase = (equipment as { techBase: TechBase }).techBase;
      
      // Check compatibility
      // MIXED tech base is always compatible
      // INNER_SPHERE equipment is compatible with IS or MIXED mechs
      // CLAN equipment is compatible with CLAN or MIXED mechs
      const isCompatible = 
        eqTechBase === TechBase.MIXED ||
        mech.techBase === TechBase.MIXED ||
        eqTechBase === mech.techBase;
      
      if (!isCompatible) {
        errors.push({
          code: 'TECH_BASE_INCOMPATIBLE',
          message: `${slot.equipmentId} (${eqTechBase}) is not compatible with ${mech.techBase} tech base`,
          severity: ValidationSeverity.ERROR,
          field: 'equipment',
          details: { 
            equipment: slot.equipmentId, 
            equipmentTechBase: eqTechBase, 
            mechTechBase: mech.techBase 
          },
        });
      }
    }
    
    return errors;
  }

  /**
   * Validate engine configuration
   */
  private validateEngine(mech: IEditableMech): IValidationError[] {
    const errors: IValidationError[] = [];

    if (mech.engineRating < 10 || mech.engineRating > 400) {
      errors.push({
        code: 'INVALID_ENGINE_RATING',
        message: `Engine rating ${mech.engineRating} must be between 10 and 400`,
        severity: ValidationSeverity.ERROR,
        field: 'engineRating',
      });
    }

    if (mech.engineRating % 5 !== 0) {
      errors.push({
        code: 'INVALID_ENGINE_RATING',
        message: `Engine rating ${mech.engineRating} must be a multiple of 5`,
        severity: ValidationSeverity.ERROR,
        field: 'engineRating',
      });
    }

    return errors;
  }

  /**
   * Validate heat sink count
   */
  private validateHeatSinks(mech: IEditableMech): IValidationError[] {
    const errors: IValidationError[] = [];

    if (mech.heatSinkCount < 10) {
      errors.push({
        code: 'INSUFFICIENT_HEAT_SINKS',
        message: `Mech must have at least 10 heat sinks (has ${mech.heatSinkCount})`,
        severity: ValidationSeverity.ERROR,
        field: 'heatSinkCount',
      });
    }

    return errors;
  }

  /**
   * Check if equipment can be added to a location
   */
  canAddEquipment(mech: IEditableMech, equipmentId: string, location: string): boolean {
    // Simplified check - just verify slots available
    const locationEquipment = mech.equipment.filter(e => e.location === location);
    const maxSlots: Record<string, number> = {
      head: 6,
      centerTorso: 12,
      leftTorso: 12,
      rightTorso: 12,
      leftArm: 12,
      rightArm: 12,
      leftLeg: 6,
      rightLeg: 6,
    };
    
    const max = maxSlots[location] || 12;
    return locationEquipment.length < max;
  }

  // ============================================================================
  // HELPER CALCULATIONS
  // ============================================================================

  /**
   * Map engine type string to EngineType enum
   */
  private mapEngineType(type: string): EngineType {
    const typeUpper = type.toUpperCase();
    if (typeUpper.includes('XL') && typeUpper.includes('CLAN')) {
      return EngineType.XL_CLAN;
    }
    if (typeUpper.includes('XL')) {
      return EngineType.XL_IS;
    }
    if (typeUpper.includes('LIGHT')) {
      return EngineType.LIGHT;
    }
    if (typeUpper.includes('XXL')) {
      return EngineType.XXL;
    }
    if (typeUpper.includes('COMPACT')) {
      return EngineType.COMPACT;
    }
    if (typeUpper.includes('ICE') || typeUpper.includes('COMBUSTION')) {
      return EngineType.ICE;
    }
    if (typeUpper.includes('FUEL')) {
      return EngineType.FUEL_CELL;
    }
    if (typeUpper.includes('FISSION')) {
      return EngineType.FISSION;
    }
    return EngineType.STANDARD;
  }

  /**
   * Calculate engine weight using proper TechManual formula
   */
  private getEngineWeight(rating: number, type: string): number {
    const engineType = this.mapEngineType(type);
    return calculateEngineWeight(rating, engineType);
  }

  private calculateArmorWeight(armor: IEditableMech['armorAllocation']): number {
    const totalPoints = 
      armor.head +
      armor.centerTorso + armor.centerTorsoRear +
      armor.leftTorso + armor.leftTorsoRear +
      armor.rightTorso + armor.rightTorsoRear +
      armor.leftArm + armor.rightArm +
      armor.leftLeg + armor.rightLeg;
    
    // Standard armor: 16 points per ton
    return Math.ceil(totalPoints / 16 * 2) / 2; // Round to 0.5 tons
  }
}

// Singleton instance
export const validationService = new ValidationService();

