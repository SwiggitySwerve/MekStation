/**
 * VAL-UNIV-014: Weight Overflow Validation
 * ERROR: Total allocated weight exceeds maximum tonnage
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  IUnitValidationError,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';

import {
  addRuleDiagnostic,
  createRuleResult,
  createEmptyRuleResult,
} from '../ruleResults';

const WEIGHT_OVERFLOW_VALIDATION_WEIGHT_CATEGORY = ValidationCategory.WEIGHT;

/**
 * VAL-UNIV-014: Weight Overflow Validation
 */
export const WeightOverflowValidation: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-014',
  name: 'Weight Overflow Validation',
  description: 'Validate total weight does not exceed maximum tonnage',
  category: WEIGHT_OVERFLOW_VALIDATION_WEIGHT_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 14,

  canValidate(context: IUnitValidationContext): boolean {
    return (
      context.unit.allocatedWeight !== undefined &&
      context.unit.maxWeight !== undefined
    );
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (unit.allocatedWeight === undefined || unit.maxWeight === undefined) {
      return createEmptyRuleResult(this);
    }

    const allocated = unit.allocatedWeight;
    const max = unit.maxWeight;

    if (allocated > max) {
      const overage = (allocated - max).toFixed(1);
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.CRITICAL_ERROR,
        `Unit exceeds maximum tonnage by ${overage} tons (${allocated.toFixed(1)}/${max} tons)`,
        {
          field: 'weight',
          expected: `<= ${max} tons`,
          actual: `${allocated.toFixed(1)} tons`,
          suggestion:
            'Remove equipment or reduce armor/components to meet weight limit',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};
