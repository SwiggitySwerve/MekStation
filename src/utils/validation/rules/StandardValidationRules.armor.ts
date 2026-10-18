/**
 * Standard Validation Rules
 *
 * Implements the core validation rules for BattleMech construction.
 *
 * @spec openspec/specs/
 */
import { ARMOR_STATUS } from '@/constants/armorStatus';
import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  IValidationError,
  ValidationCategory,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';

import { fail, pass } from './validationHelpers';

/**
 * Armor maximum per location
 */
export const ArmorMaximumRule: IValidationRuleDefinition = {
  id: 'construction.armor_max',
  name: 'Maximum Armor',
  description: 'Validates that armor does not exceed location maximums',
  category: ValidationCategory.ARMOR,
  priority: 10,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const armorAllocation = unit.armorAllocation as
      | Record<string, number>
      | undefined;
    const structure = unit.structure as Record<string, unknown> | undefined;

    if (!armorAllocation || !structure) {
      return pass(this.id);
    }

    const structurePoints = structure.points as
      | Record<string, number>
      | undefined;
    if (!structurePoints) {
      return pass(this.id);
    }

    const errors: IValidationError[] = [];

    // Check each location
    for (const [location, armor] of Object.entries(armorAllocation)) {
      // Skip rear armor for now (handled with front)
      if (location.includes('Rear')) continue;

      // Get max armor (2x structure, head = 9)
      const isHead = location.toLowerCase().includes('head');
      const structureValue = structurePoints[location] ?? 0;
      const maxArmor = isHead ? 9 : structureValue * 2;

      if (armor > maxArmor) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `${location} armor (${armor}) exceeds maximum (${maxArmor})`,
          path: `armorAllocation.${location}`,
          expected: `<= ${maxArmor}`,
          actual: `${armor}`,
        });
      }
    }

    if (errors.length > 0) {
      return fail(this.id, errors);
    }

    return pass(this.id);
  },
};

/**
 * Armor level warnings - warns when armor is LOW, errors when CRITICAL
 */
export const ArmorLevelRule: IValidationRuleDefinition = {
  id: 'armor.level',
  name: 'Armor Level',
  description: 'Warns when armor is low (20-40%), errors when critical (<20%)',
  category: ValidationCategory.ARMOR,
  priority: 20,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const armorAllocation = unit.armorAllocation as
      | Record<string, number>
      | undefined;
    const structure = unit.structure as Record<string, unknown> | undefined;

    if (!armorAllocation || !structure) {
      return pass(this.id);
    }

    const structurePoints = structure.points as
      | Record<string, number>
      | undefined;
    if (!structurePoints) {
      return pass(this.id);
    }

    const errors: IValidationError[] = [];
    const warnings: IValidationError[] = [];

    for (const [location, armor] of Object.entries(armorAllocation)) {
      if (location.includes('Rear')) continue;

      const isHead = location.toLowerCase().includes('head');
      const structureValue = structurePoints[location] ?? 0;
      const maxArmor = isHead ? 9 : structureValue * 2;

      if (maxArmor === 0) continue;

      const ratio = armor / maxArmor;

      if (ratio < ARMOR_STATUS.LOW.min) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `${location} armor critically low (${Math.round(ratio * 100)}%)`,
          path: `armorAllocation.${location}`,
          suggestion: `Increase ${location} armor above ${Math.round(ARMOR_STATUS.LOW.min * 100)}%`,
        });
      } else if (ratio < ARMOR_STATUS.MODERATE.min) {
        warnings.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: `${location} armor is low (${Math.round(ratio * 100)}%)`,
          path: `armorAllocation.${location}`,
          suggestion: `Consider increasing ${location} armor above ${Math.round(ARMOR_STATUS.MODERATE.min * 100)}%`,
        });
      }
    }

    if (errors.length > 0) {
      return {
        ruleId: this.id,
        passed: false,
        errors,
        warnings,
        infos: [],
        executionTime: 0,
      };
    }

    if (warnings.length > 0) {
      return {
        ruleId: this.id,
        passed: true,
        errors: [],
        warnings,
        infos: [],
        executionTime: 0,
      };
    }

    return pass(this.id);
  },
};
