import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  ValidationCategory,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';

import { fail, pass, warn } from './validationHelpers';

// ============================================================================
// WEIGHT VALIDATION RULES
// ============================================================================

/**
 * Total weight must not exceed tonnage
 */
export const TotalWeightRule: IValidationRuleDefinition = {
  id: 'weight.total',
  name: 'Total Weight',
  description: 'Validates that total weight does not exceed unit tonnage',
  category: ValidationCategory.WEIGHT,
  priority: 10,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const tonnage = unit.tonnage as number | undefined;
    const totalWeight = unit.totalWeight as number | undefined;

    if (tonnage === undefined || totalWeight === undefined) {
      return pass(this.id);
    }

    if (totalWeight > tonnage) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Total weight (${totalWeight}t) exceeds tonnage (${tonnage}t)`,
          path: 'totalWeight',
          expected: `<= ${tonnage}`,
          actual: `${totalWeight}`,
          suggestion: `Remove ${(totalWeight - tonnage).toFixed(1)} tons of equipment`,
        },
      ]);
    }

    // Warn if very close to limit
    const remaining = tonnage - totalWeight;
    if (remaining > 0 && remaining < 0.5) {
      return warn(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: `Only ${remaining.toFixed(2)} tons remaining`,
          path: 'totalWeight',
        },
      ]);
    }

    return pass(this.id);
  },
};

/**
 * Weight must be properly rounded to 0.5 tons
 */
export const WeightRoundingRule: IValidationRuleDefinition = {
  id: 'weight.rounding',
  name: 'Weight Rounding',
  description: 'Validates that weights are properly rounded to 0.5 tons',
  category: ValidationCategory.WEIGHT,
  priority: 20,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const totalWeight = unit.totalWeight as number | undefined;

    if (totalWeight === undefined) {
      return pass(this.id);
    }

    // Check if properly rounded to 0.5
    const rounded = Math.round(totalWeight * 2) / 2;
    if (Math.abs(totalWeight - rounded) > 0.001) {
      return warn(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.WARNING,
          category: this.category,
          message: `Weight ${totalWeight} is not properly rounded to 0.5 tons`,
          path: 'totalWeight',
          expected: `${rounded}`,
          actual: `${totalWeight}`,
        },
      ]);
    }

    return pass(this.id);
  },
};
