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
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
} from '@/types/validation/UnitValidationInterfaces';

/**
 * VAL-UNIV-014: Weight Overflow Validation
 */
export const WeightOverflowValidation: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-014',
  name: 'Weight Overflow Validation',
  description: 'Validate total weight does not exceed maximum tonnage',
  category: ValidationCategory.WEIGHT,
  priority: 14,
  applicableUnitTypes: 'ALL',

  canValidate(context: IUnitValidationContext): boolean {
    return (
      context.unit.allocatedWeight !== undefined &&
      context.unit.maxWeight !== undefined
    );
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: ReturnType<typeof createUnitValidationError>[] = [];

    if (unit.allocatedWeight === undefined || unit.maxWeight === undefined) {
      return createUnitValidationRuleResult(this.id, this.name, [], [], [], 0);
    }

    const allocated = unit.allocatedWeight;
    const max = unit.maxWeight;

    if (allocated > max) {
      const overage = (allocated - max).toFixed(1);
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.CRITICAL_ERROR,
          this.category,
          `Unit exceeds maximum tonnage by ${overage} tons (${allocated.toFixed(1)}/${max} tons)`,
          {
            field: 'weight',
            expected: `<= ${max} tons`,
            actual: `${allocated.toFixed(1)} tons`,
            suggestion:
              'Remove equipment or reduce armor/components to meet weight limit',
          },
        ),
      );
    }

    return createUnitValidationRuleResult(
      this.id,
      this.name,
      errors,
      [],
      [],
      0,
    );
  },
};
