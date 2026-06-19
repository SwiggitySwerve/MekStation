import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleResult,
  UnitValidationSeverity,
  IUnitValidationRuleDefinition,
  IUnitValidationContext,
  IUnitValidationError,
} from '@/types/validation/UnitValidationInterfaces';

import { createRuleResult, addRuleDiagnostic } from '../ruleResults';
import {
  AEROSPACE_UNIT_TYPES,
  THRUST_REQUIRED_TYPES,
  isAerospaceUnit,
} from './AerospaceCategoryRuleTypes';

const AEROSPACE_CATEGORY_CORE_RULES_CONSTRUCTION_CATEGORY =
  ValidationCategory.CONSTRUCTION;
const AEROSPACE_CATEGORY_CORE_RULES_MOVEMENT_CATEGORY =
  ValidationCategory.MOVEMENT;

export const AeroEngineRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-001',
  name: 'Engine Required',
  description: 'All Aerospace category units must have an engine',
  category: AEROSPACE_CATEGORY_CORE_RULES_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,
  priority: 40,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isAerospaceUnit(unit) && !unit.engine) {
      addRuleDiagnostic(
        errors,
        this,
        UnitValidationSeverity.CRITICAL_ERROR,
        'Engine required',
        {
          field: 'engine',
          suggestion: 'Select an engine for the aerospace unit',
        },
      );
    }

    return createRuleResult(this, { errors });
  },
};

export const AeroThrustRatingValid: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-002',
  name: 'Thrust Rating Valid',
  description: 'Aerospace fighters must have valid thrust rating',
  category: AEROSPACE_CATEGORY_CORE_RULES_MOVEMENT_CATEGORY,
  applicableUnitTypes: THRUST_REQUIRED_TYPES,
  priority: 41,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (
      isAerospaceUnit(unit) &&
      THRUST_REQUIRED_TYPES.includes(unit.unitType)
    ) {
      if (
        unit.thrust === undefined ||
        !Number.isInteger(unit.thrust) ||
        unit.thrust <= 0
      ) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.CRITICAL_ERROR,
          'Thrust rating must be positive integer',
          {
            field: 'thrust',
            expected: '> 0 (integer)',
            actual: String(unit.thrust),
            suggestion: 'Set a valid positive integer thrust rating',
          },
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};

export const AeroStructuralIntegrityRequired: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-003',
  name: 'Structural Integrity Required',
  description: 'Aerospace units must have positive structural integrity',
  category: AEROSPACE_CATEGORY_CORE_RULES_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,
  priority: 42,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isAerospaceUnit(unit)) {
      if (
        unit.structuralIntegrity === undefined ||
        unit.structuralIntegrity <= 0
      ) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
          'Structural integrity must be positive',
          {
            field: 'structuralIntegrity',
            expected: '> 0',
            actual: String(unit.structuralIntegrity),
            suggestion: 'Set a valid positive structural integrity value',
          },
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};

export const AeroFuelCapacityValid: IUnitValidationRuleDefinition = {
  id: 'VAL-AERO-004',
  name: 'Fuel Capacity Valid',
  description: 'Aerospace units must have non-negative fuel capacity',
  category: AEROSPACE_CATEGORY_CORE_RULES_CONSTRUCTION_CATEGORY,
  applicableUnitTypes: AEROSPACE_UNIT_TYPES,
  priority: 43,

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    const { unit } = context;
    const errors: IUnitValidationError[] = [];

    if (isAerospaceUnit(unit)) {
      if (unit.fuelCapacity !== undefined && unit.fuelCapacity < 0) {
        addRuleDiagnostic(
          errors,
          this,
          UnitValidationSeverity.ERROR,
          'Fuel capacity must be non-negative',
          {
            field: 'fuelCapacity',
            expected: '>= 0',
            actual: String(unit.fuelCapacity),
            suggestion: 'Set a valid non-negative fuel capacity',
          },
        );
      }
    }

    return createRuleResult(this, { errors });
  },
};
