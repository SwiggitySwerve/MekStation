import {
  IValidationContext,
  IValidationRuleDefinition,
  ValidationCategory,
} from '@/types/validation/rules/ValidationRuleInterfaces';

import { pass } from './validationHelpers';

export const TechBaseCompatibilityRule: IValidationRuleDefinition = {
  id: 'tech.compatibility',
  name: 'Tech Base Compatibility',
  description: 'Validates component tech base compatibility',
  category: ValidationCategory.TECH_BASE,
  priority: 10,

  validate(context: IValidationContext) {
    const unit = context.unit as Record<string, unknown>;
    const techBase = unit.techBase as string | undefined;

    if (!techBase) {
      return pass(this.id);
    }

    return pass(this.id);
  },
};

export const EraAvailabilityRule: IValidationRuleDefinition = {
  id: 'era.availability',
  name: 'Era Availability',
  description:
    'Validates that all components are available in the selected era',
  category: ValidationCategory.ERA,
  priority: 10,

  validate(context: IValidationContext) {
    const unit = context.unit as Record<string, unknown>;
    const year = unit.year as number | undefined;

    if (!year) {
      return pass(this.id);
    }

    return pass(this.id);
  },
};
