/**
 * Configuration-Specific Validation Rules
 *
 * Aggregator module that collects all configuration-specific validation rules.
 * Individual rules are now organized in separate files by configuration type.
 *
 * @spec openspec/specs/quad-mech-support/spec.md
 */

import { IValidationRuleDefinition } from '../../../types/validation/rules/ValidationRuleInterfaces';

// Re-export all rule modules for consumers who need individual rules
export * from './validationHelpers';
export * from './QuadValidationRules';
export * from './LAMValidationRules';
export * from './TripodValidationRules';
export * from './QuadVeeValidationRules';
export * from './OmniMechValidationRules';
export * from './BipedValidationRules';
export * from './GenericValidationRules';

import { BipedValidationRules } from './BipedValidationRules';
import { GenericValidationRules } from './GenericValidationRules';
import { LAMValidationRules } from './LAMValidationRules';
import { OmniMechValidationRules } from './OmniMechValidationRules';
// Import rule arrays from each module
import { QuadValidationRules } from './QuadValidationRules';
import { QuadVeeValidationRules } from './QuadVeeValidationRules';
import { TripodValidationRules } from './TripodValidationRules';

/**
 * Get all configuration-specific validation rules
 */
export function getConfigurationValidationRules(): IValidationRuleDefinition[] {
  return [
    ...QuadValidationRules,
    ...BipedValidationRules,
    ...LAMValidationRules,
    ...TripodValidationRules,
    ...QuadVeeValidationRules,
    ...OmniMechValidationRules,
    ...GenericValidationRules,
  ];
}

/**
 * Register all configuration rules with a registry
 */
export function registerConfigurationRules(registry: {
  register: (rule: IValidationRuleDefinition) => void;
}): void {
  for (const rule of getConfigurationValidationRules()) {
    registry.register(rule);
  }
}
