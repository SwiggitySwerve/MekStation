/**
 * Superheavy Mech Validation Rules
 *
 * Validates construction constraints specific to superheavy BattleMechs (>100 tons).
 *
 * @spec openspec/specs/superheavy-mech-system/spec.md
 */

import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  ValidationCategory,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';

import { pass, fail } from './validationHelpers';

/**
 * Check if a unit is a superheavy mech based on tonnage from context.
 */
function isSuperheavyFromContext(context: IValidationContext): boolean {
  const unit = context.unit as Record<string, unknown>;
  const tonnage = unit.tonnage as number | undefined;
  return tonnage !== undefined && tonnage > 100;
}

/**
 * Superheavy Cockpit Required
 * Mechs with tonnage > 100 must have SUPERHEAVY cockpit type.
 */
export const SuperheavyCockpitRule: IValidationRuleDefinition = {
  id: 'configuration.superheavy.cockpit',
  name: 'Superheavy Cockpit Required',
  description: 'Validates that superheavy mechs have SUPERHEAVY cockpit type',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    return isSuperheavyFromContext(context);
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const cockpit = unit.cockpit as Record<string, unknown> | undefined;
    const cockpitType = (cockpit?.type as string) ?? '';

    if (cockpitType.toUpperCase() !== 'SUPERHEAVY') {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Superheavy mechs (>100 tons) require a Superheavy cockpit (current: ${cockpitType || 'unknown'})`,
          path: 'cockpit.type',
          suggestion:
            'Change cockpit type to SUPERHEAVY or reduce tonnage to 100 or below',
        },
      ]);
    }

    return pass(this.id);
  },
};

/**
 * Superheavy Gyro Required
 * Mechs with tonnage > 100 must have SUPERHEAVY gyro type.
 */
export const SuperheavyGyroRule: IValidationRuleDefinition = {
  id: 'configuration.superheavy.gyro',
  name: 'Superheavy Gyro Required',
  description: 'Validates that superheavy mechs have SUPERHEAVY gyro type',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    return isSuperheavyFromContext(context);
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const gyro = unit.gyro as Record<string, unknown> | undefined;
    const gyroType = (gyro?.type as string) ?? '';

    if (gyroType.toUpperCase() !== 'SUPERHEAVY') {
      return fail(this.id, [
        {
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Superheavy mechs (>100 tons) require a Superheavy gyro (current: ${gyroType || 'unknown'})`,
          path: 'gyro.type',
          suggestion:
            'Change gyro type to SUPERHEAVY or reduce tonnage to 100 or below',
        },
      ]);
    }

    return pass(this.id);
  },
};

/**
 * Superheavy Tonnage Gap
 * Validates that tonnage is not in the invalid 101-104 range.
 */
export const SuperheavyTonnageGapRule: IValidationRuleDefinition = {
  id: 'configuration.superheavy.tonnage_gap',
  name: 'Superheavy Tonnage Gap',
  description: 'Validates that tonnage is not in the invalid 101-104 range',
  category: ValidationCategory.CONSTRUCTION,
  priority: 10,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const tonnage = unit.tonnage as number | undefined;
    return tonnage !== undefined && tonnage > 100 && tonnage < 105;
  },

  validate(_context: IValidationContext): IValidationRuleResult {
    return fail(this.id, [
      {
        ruleId: this.id,
        ruleName: this.name,
        severity: ValidationSeverity.ERROR,
        category: this.category,
        message:
          'Tonnage 101-104 is invalid. Superheavy mechs start at 105 tons',
        path: 'tonnage',
        suggestion: 'Set tonnage to 100 (standard) or 105+ (superheavy)',
      },
    ]);
  },
};
