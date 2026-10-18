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
 * Engine rating must be valid
 */
export const EngineRatingRule: IValidationRuleDefinition = {
  id: 'construction.engine_rating',
  name: 'Engine Rating',
  description:
    'Validates engine rating is within valid range and multiple of 5',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const engine = unit.engine as Record<string, unknown> | undefined;

    if (!engine) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: 'Engine configuration is missing',
          path: 'engine',
        },
      ]);
    }

    const rating = engine.rating as number | undefined;
    const errors: IValidationError[] = [];

    if (rating === undefined) {
      errors.push({
        ruleId: this.id,
        ruleName: this.name,
        severity: ValidationSeverity.ERROR,
        category: this.category,
        message: 'Engine rating is missing',
        path: 'engine.rating',
      });
    } else {
      if (rating < 10 || rating > 500) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Engine rating (${rating}) must be between 10 and 500`,
          path: 'engine.rating',
          expected: '10-500',
          actual: `${rating}`,
        });
      }

      if (rating % 5 !== 0) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Engine rating (${rating}) must be a multiple of 5`,
          path: 'engine.rating',
          expected: 'Multiple of 5',
          actual: `${rating}`,
        });
      }
    }

    if (errors.length > 0) {
      return fail(this.id, errors);
    }

    return pass(this.id);
  },
};
