/**
 * VAL-UNIV-003: Valid Unit Type
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
import { isValidUnitType } from '@/utils/validation/UnitCategoryMapper';

import { addRuleDiagnostic, createRuleResult } from '../ruleResults';

const VALID_UNIT_TYPE_CONSTRUCTION_CATEGORY = ValidationCategory.CONSTRUCTION;

/**
 * VAL-UNIV-003: Valid Unit Type
 */
export const ValidUnitType: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-003',
  name: 'Valid Unit Type',
  description: 'Unit type must be valid UnitType enum value',
  category: VALID_UNIT_TYPE_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 3,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const validUnitTypeDiagnostics: IUnitValidationError[] = [];

    if (!isValidUnitType(unit.unitType)) {
      addRuleDiagnostic(
        validUnitTypeDiagnostics,
        this,
        UnitValidationSeverity.ERROR,
        'Unit type must be valid UnitType enum value',
        {
          field: 'unitType',
          actual: String(unit.unitType),
          suggestion: 'Select a valid unit type',
        },
      );
    }

    return createRuleResult(this, { errors: validUnitTypeDiagnostics });
  },
};
