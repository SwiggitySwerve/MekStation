import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationContext,
  IValidationError,
  ValidationCategory,
  ValidationSeverity,
} from '@/types/validation/rules/ValidationRuleInterfaces';

import { pass, fail } from './validationHelpers';

export const BipedNoQuadLegsRule: IValidationRuleDefinition = {
  id: 'configuration.biped.no_quad_legs',
  name: 'Biped No Quad Legs',
  description: 'Validates that biped mechs do not use quad leg locations',
  category: ValidationCategory.CONSTRUCTION,
  priority: 5,

  canValidate(context: IValidationContext): boolean {
    const unit = context.unit as Record<string, unknown>;
    const config = unit.configuration as string | undefined;
    return config?.toLowerCase() !== 'quad';
  },

  validate(context: IValidationContext): IValidationRuleResult {
    const unit = context.unit as Record<string, unknown>;
    const equipment = unit.equipment as
      | Array<Record<string, unknown>>
      | undefined;

    if (!equipment) {
      return pass(this.id);
    }

    const quadLegLocations = [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];
    const errors: IValidationError[] = [];

    for (const item of equipment) {
      const location = item.location as string | undefined;
      if (location && quadLegLocations.includes(location as MechLocation)) {
        errors.push({
          ruleId: this.id,
          ruleName: this.name,
          severity: ValidationSeverity.ERROR,
          category: this.category,
          message: `Biped mechs cannot use quad leg location ${location}`,
          path: `equipment.${item.name}`,
          suggestion: 'Use standard leg or arm locations',
        });
      }
    }

    if (errors.length > 0) {
      return fail(this.id, errors);
    }

    return pass(this.id);
  },
};

export const BipedValidationRules = [BipedNoQuadLegsRule];
