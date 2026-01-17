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
import { IValidatableUnit, IUnitValidationOptions, IUnitValidationResult } from '@/types/validation/UnitValidationInterfaces';
import { UnitValidationOrchestrator } from '@/services/validation/UnitValidationOrchestrator';
import { initializeUnitValidationRules } from '@/services/validation/initializeUnitValidation';
import {
  ENGINE_RATING_MIN,
  ENGINE_RATING_MAX,
  ENGINE_RATING_INCREMENT,
  HEAT_SINK_MINIMUM,
  STRUCTURE_WEIGHT_PERCENT,
  GYRO_WEIGHT_DIVISOR,
  COCKPIT_WEIGHT_STANDARD,
  HEAD_ARMOR_MAX,
  ARMOR_TO_STRUCTURE_RATIO,
  CRITICAL_SLOTS,
  CRITICAL_SLOTS_DEFAULT,
} from './constructionConstants';

/**
 * Validation service interface
 */
export interface IValidationService {
  validate(mech: IEditableMech): IValidationResult;
  validateUnit(unit: IValidatableUnit, options?: IUnitValidationOptions): IUnitValidationResult;
  validateWeight(mech: IEditableMech): IValidationError[];
  validateArmor(mech: IEditableMech): IValidationError[];
  validateCriticalSlots(mech: IEditableMech): IValidationError[];
  validateTechLevel(mech: IEditableMech): IValidationError[];
  canAddEquipment(mech: IEditableMech, equipmentId: string, location: string): boolean;
}

function getMaxArmorForLocation(tonnage: number, location: string): number {
  if (location === 'head') {
    return HEAD_ARMOR_MAX;
  }
  
  const structurePoints = getStructurePoints(tonnage, location);
  return structurePoints * ARMOR_TO_STRUCTURE_RATIO;
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

  validateWeight(mech: IEditableMech): IValidationError[] {
    const errors: IValidationError[] = [];
    
    const structureWeight = mech.tonnage * STRUCTURE_WEIGHT_PERCENT;
    const engineWeight = this.getEngineWeight(mech.engineRating, mech.engineType);
    const gyroWeight = Math.ceil(mech.engineRating / GYRO_WEIGHT_DIVISOR);
    const cockpitWeight = COCKPIT_WEIGHT_STANDARD;
    const armorWeight = this.calculateArmorWeight(mech.armorAllocation);
    const heatSinkWeight = Math.max(0, mech.heatSinkCount - HEAT_SINK_MINIMUM);
    
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
    const locationChecks: { location: string; displayName: string; actual: number; rear?: number }[] = [
      { location: 'head', displayName: 'Head', actual: armor.head },
      { location: 'centerTorso', displayName: 'Center Torso', actual: armor.centerTorso, rear: armor.centerTorsoRear },
      { location: 'leftTorso', displayName: 'Left Torso', actual: armor.leftTorso, rear: armor.leftTorsoRear },
      { location: 'rightTorso', displayName: 'Right Torso', actual: armor.rightTorso, rear: armor.rightTorsoRear },
      { location: 'leftArm', displayName: 'Left Arm', actual: armor.leftArm },
      { location: 'rightArm', displayName: 'Right Arm', actual: armor.rightArm },
      { location: 'leftLeg', displayName: 'Left Leg', actual: armor.leftLeg },
      { location: 'rightLeg', displayName: 'Right Leg', actual: armor.rightLeg },
    ];

    for (const check of locationChecks) {
      const maxArmor = getMaxArmorForLocation(mech.tonnage, check.location);
      
      // For torso locations, front + rear must not exceed max
      if (check.rear !== undefined) {
        const totalTorsoArmor = check.actual + check.rear;
        if (totalTorsoArmor > maxArmor) {
          errors.push({
            code: 'ARMOR_EXCEEDS_MAX',
            message: `${check.displayName} total armor (${totalTorsoArmor}) exceeds maximum of ${maxArmor}`,
            severity: ValidationSeverity.ERROR,
            field: check.location,
            details: { front: check.actual, rear: check.rear, total: totalTorsoArmor, max: maxArmor },
          });
        }
        // Warn if torso has zero front armor (rear-only is unusual)
        if (check.actual === 0 && check.rear === 0) {
          errors.push({
            code: 'NO_ARMOR',
            message: `${check.displayName} has no armor assigned`,
            severity: ValidationSeverity.WARNING,
            field: check.location,
            details: { location: check.displayName },
          });
        }
      } else {
        if (check.actual > maxArmor) {
          errors.push({
            code: 'ARMOR_EXCEEDS_MAX',
            message: `${check.displayName} armor (${check.actual}) exceeds maximum of ${maxArmor}`,
            severity: ValidationSeverity.ERROR,
            field: check.location,
            details: { actual: check.actual, max: maxArmor },
          });
        }
        // Warn if location has zero armor
        if (check.actual === 0) {
          errors.push({
            code: 'NO_ARMOR',
            message: `${check.displayName} has no armor assigned`,
            severity: ValidationSeverity.WARNING,
            field: check.location,
            details: { location: check.displayName },
          });
        }
      }
    }

    return errors;
  }

  validateCriticalSlots(mech: IEditableMech): IValidationError[] {
    const errors: IValidationError[] = [];
    
    const slotsUsed: Record<string, number> = {};
    for (const eq of mech.equipment) {
      slotsUsed[eq.location] = (slotsUsed[eq.location] || 0) + 1;
    }

    for (const [location, used] of Object.entries(slotsUsed)) {
      const max = CRITICAL_SLOTS[location as keyof typeof CRITICAL_SLOTS] || CRITICAL_SLOTS_DEFAULT;
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
      // Per spec VAL-ENUM-004: Tech base is binary (IS or Clan)
      // Equipment must match mech's component tech base, unless mech is in mixed mode
      // Note: Mixed mode is handled at the unit configuration level, not here
      const isCompatible = eqTechBase === mech.techBase;
      
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

  private validateEngine(mech: IEditableMech): IValidationError[] {
    const errors: IValidationError[] = [];

    if (mech.engineRating < ENGINE_RATING_MIN || mech.engineRating > ENGINE_RATING_MAX) {
      errors.push({
        code: 'INVALID_ENGINE_RATING',
        message: `Engine rating ${mech.engineRating} must be between ${ENGINE_RATING_MIN} and ${ENGINE_RATING_MAX}`,
        severity: ValidationSeverity.ERROR,
        field: 'engineRating',
      });
    }

    if (mech.engineRating % ENGINE_RATING_INCREMENT !== 0) {
      errors.push({
        code: 'INVALID_ENGINE_RATING',
        message: `Engine rating ${mech.engineRating} must be a multiple of ${ENGINE_RATING_INCREMENT}`,
        severity: ValidationSeverity.ERROR,
        field: 'engineRating',
      });
    }

    return errors;
  }

  private validateHeatSinks(mech: IEditableMech): IValidationError[] {
    const errors: IValidationError[] = [];

    if (mech.heatSinkCount < HEAT_SINK_MINIMUM) {
      errors.push({
        code: 'INSUFFICIENT_HEAT_SINKS',
        message: `Mech must have at least ${HEAT_SINK_MINIMUM} heat sinks (has ${mech.heatSinkCount})`,
        severity: ValidationSeverity.ERROR,
        field: 'heatSinkCount',
      });
    }

    return errors;
  }

  canAddEquipment(mech: IEditableMech, _equipmentId: string, location: string): boolean {
    const locationEquipment = mech.equipment.filter(e => e.location === location);
    const max = CRITICAL_SLOTS[location as keyof typeof CRITICAL_SLOTS] || CRITICAL_SLOTS_DEFAULT;
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

  /**
   * Unit validation orchestrator (lazy initialized)
   */
  private _orchestrator: UnitValidationOrchestrator | null = null;

  private getOrchestrator(): UnitValidationOrchestrator {
    if (!this._orchestrator) {
      // Ensure rules are initialized
      initializeUnitValidationRules();
      this._orchestrator = new UnitValidationOrchestrator();
    }
    return this._orchestrator;
  }

  /**
   * Validate any unit using the new Unit Validation Framework
   * 
   * This method provides a unified entry point for validating any unit type
   * (BattleMech, Vehicle, Aerospace, Infantry, etc.) using the hierarchical
   * validation rule system.
   * 
   * @param unit - The unit to validate (must implement IValidatableUnit)
   * @param options - Validation options (strictMode, skipRules, etc.)
   * @returns Validation result with errors, warnings, and infos
   */
  validateUnit(unit: IValidatableUnit, options?: IUnitValidationOptions): IUnitValidationResult {
    return this.getOrchestrator().validate(unit, options);
  }
}

// Singleton instance
export const validationService = new ValidationService();

