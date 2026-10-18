import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  ValidationCategory,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';

import { fail, pass } from './validationHelpers';

// ============================================================================
// SLOT VALIDATION RULES
// ============================================================================

/**
 * Total critical slots must not exceed 78
 */
export const TotalSlotsRule: IValidationRuleDefinition = {
  id: 'slots.total',
  name: 'Total Critical Slots',
  description: 'Validates that total critical slots do not exceed 78',
  category: ValidationCategory.SLOTS,
  priority: 10,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const criticalSlots = unit.criticalSlots as
      | Array<Record<string, unknown>>
      | undefined;

    if (!criticalSlots) {
      return pass(this.id);
    }

    // Count used slots
    let usedSlots = 0;
    for (const location of criticalSlots) {
      const slots = location.slots as
        | Array<Record<string, unknown>>
        | undefined;
      if (slots) {
        usedSlots += slots.filter((s) => s.content !== null).length;
      }
    }

    const maxSlots = 78;
    if (usedSlots > maxSlots) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Used critical slots (${usedSlots}) exceed maximum (${maxSlots})`,
          path: 'criticalSlots',
          expected: `<= ${maxSlots}`,
          actual: `${usedSlots}`,
        },
      ]);
    }

    return pass(this.id);
  },
};

// ============================================================================
// CONSTRUCTION VALIDATION RULES
// ============================================================================

/**
 * Minimum 10 heat sinks required
 */
export const MinimumHeatSinksRule: IValidationRuleDefinition = {
  id: 'construction.min_heat_sinks',
  name: 'Minimum Heat Sinks',
  description: 'Validates that the unit has at least 10 heat sinks',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const heatSinks = unit.heatSinks as Record<string, unknown> | undefined;

    if (!heatSinks) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: 'Heat sink configuration is missing',
          path: 'heatSinks',
        },
      ]);
    }

    const total = heatSinks.total as number | undefined;
    if (total === undefined || total < 10) {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Minimum 10 heat sinks required (have ${total ?? 0})`,
          path: 'heatSinks.total',
          expected: '>= 10',
          actual: `${total ?? 0}`,
        },
      ]);
    }

    return pass(this.id);
  },
};
