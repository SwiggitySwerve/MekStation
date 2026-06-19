/**
 * VAL-UNIV-001: Entity ID Required
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';

import { createRuleResult, addRuleDiagnostic } from '../ruleResults';

const ENTITY_ID_REQUIRED_CONSTRUCTION_CATEGORY =
  ValidationCategory.CONSTRUCTION;

/**
 * VAL-UNIV-001: Entity ID Required
 */
export const EntityIdRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-001',
  name: 'Entity ID Required',
  description: 'All units must have non-empty id',
  category: ENTITY_ID_REQUIRED_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 1,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const entityIdRequiredDiagnostics: IUnitValidationError[] = [];

    if (!unit.id || unit.id.trim() === '') {
      addRuleDiagnostic(
        entityIdRequiredDiagnostics,
        this,
        UnitValidationSeverity.ERROR,
        'Entity must have non-empty id',
        { field: 'id', suggestion: 'Provide a valid id for the entity' },
      );
    }

    return createRuleResult(this, { errors: entityIdRequiredDiagnostics });
  },
};
