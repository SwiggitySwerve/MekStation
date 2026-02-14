/**
 * VAL-UNIV-012: Rules Level Compliance
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '../../../../types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
  createPassingResult,
} from '../../../../types/validation/UnitValidationInterfaces';
import { rulesLevelExceedsFilter } from './helpers';

/**
 * VAL-UNIV-012: Rules Level Compliance
 */
export const RulesLevelCompliance: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-012',
  name: 'Rules Level Compliance',
  description: 'Unit rules level must not exceed filter',
  category: ValidationCategory.CONSTRUCTION,
  priority: 12,
  applicableUnitTypes: 'ALL',

  canValidate(context: IUnitValidationContext): boolean {
    // Only validate if rules level filter is specified
    return context.rulesLevelFilter !== undefined;
  },

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit, rulesLevelFilter } = context;
    const errors = [];

    if (rulesLevelFilter === undefined) {
      return createPassingResult(this.id, this.name);
    }

    if (rulesLevelExceedsFilter(unit.rulesLevel, rulesLevelFilter)) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          `Unit rules level ${unit.rulesLevel} exceeds allowed level ${rulesLevelFilter}`,
          {
            field: 'rulesLevel',
            expected: `<= ${rulesLevelFilter}`,
            actual: unit.rulesLevel,
            suggestion: 'Change rules level filter or select a different unit',
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
