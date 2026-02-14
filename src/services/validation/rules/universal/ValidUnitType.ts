/**
 * VAL-UNIV-003: Valid Unit Type
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
} from '../../../../types/validation/UnitValidationInterfaces';
import { isValidUnitType } from '../../../../utils/validation/UnitCategoryMapper';

/**
 * VAL-UNIV-003: Valid Unit Type
 */
export const ValidUnitType: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-003',
  name: 'Valid Unit Type',
  description: 'Unit type must be valid UnitType enum value',
  category: ValidationCategory.CONSTRUCTION,
  priority: 3,
  applicableUnitTypes: 'ALL',

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors = [];

    if (!isValidUnitType(unit.unitType)) {
      errors.push(
        createUnitValidationError(
          this.id,
          this.name,
          UnitValidationSeverity.ERROR,
          this.category,
          'Unit type must be valid UnitType enum value',
          {
            field: 'unitType',
            actual: String(unit.unitType),
            suggestion: 'Select a valid unit type',
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
