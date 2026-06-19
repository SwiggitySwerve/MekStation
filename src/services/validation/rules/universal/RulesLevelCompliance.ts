/**
 * VAL-UNIV-012: Rules Level Compliance
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  UnitValidationSeverity,
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';

import {
  createEmptyRuleResult,
  addRuleDiagnostic,
  createRuleResult,
} from '../ruleResults';
import { rulesLevelExceedsFilter } from './helpers';

const RULES_LEVEL_COMPLIANCE_CONSTRUCTION_CATEGORY =
  ValidationCategory.CONSTRUCTION;

/**
 * VAL-UNIV-012: Rules Level Compliance
 */
export const RulesLevelCompliance: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-012',
  name: 'Rules Level Compliance',
  description: 'Unit rules level must not exceed filter',
  category: RULES_LEVEL_COMPLIANCE_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 12,

  canValidate(context: IUnitValidationContext): boolean {
    // Only validate if rules level filter is specified
    return context.rulesLevelFilter !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit, rulesLevelFilter } = context;
    const errors: IUnitValidationError[] = [];

    if (rulesLevelFilter === undefined) {
      return createEmptyRuleResult(this);
    }

    if (rulesLevelExceedsFilter(unit.rulesLevel, rulesLevelFilter)) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.ERROR,
        `Unit rules level ${unit.rulesLevel} exceeds allowed level ${rulesLevelFilter}`,
        {
          field: 'rulesLevel',
          expected: `<= ${rulesLevelFilter}`,
          actual: unit.rulesLevel,
          suggestion: 'Change rules level filter or select a different unit',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};
