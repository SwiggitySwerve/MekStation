/**
 * VAL-UNIV-002: Entity Name Required
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

const ENTITY_NAME_REQUIRED_CONSTRUCTION_CATEGORY =
  ValidationCategory.CONSTRUCTION;

/**
 * VAL-UNIV-002: Entity Name Required
 */
export const EntityNameRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-UNIV-002',
  name: 'Entity Name Required',
  description: 'All units must have non-empty name',
  category: ENTITY_NAME_REQUIRED_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: 'ALL',
  priority: 2,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const entityNameRequiredDiagnostics: IUnitValidationError[] = [];

    if (!unit.name || unit.name.trim() === '') {
      addRuleDiagnostic(
        entityNameRequiredDiagnostics,
        this,
        UnitValidationSeverity.ERROR,
        'Entity must have non-empty name',
        { field: 'name', suggestion: 'Provide a valid name for the entity' },
      );
    }

    return createRuleResult(this, { errors: entityNameRequiredDiagnostics });
  },
};
