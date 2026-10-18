import { IValidationRuleDefinition } from '@/types/validation/rules/ValidationRuleInterfaces';

import {
  ArmorMaximumRule,
  ArmorLevelRule,
} from './StandardValidationRules.armor';
import {
  TotalSlotsRule,
  MinimumHeatSinksRule,
} from './StandardValidationRules.capacity';
import { EngineRatingRule } from './StandardValidationRules.engine';
import {
  EraAvailabilityRule,
  TechBaseCompatibilityRule,
} from './StandardValidationRules.techEra';
import {
  TotalWeightRule,
  WeightRoundingRule,
} from './StandardValidationRules.weight';

/**
 * Get all standard validation rules
 */
export function getStandardValidationRules(): IValidationRuleDefinition[] {
  return [
    // Weight
    TotalWeightRule,
    WeightRoundingRule,
    // Slots
    TotalSlotsRule,
    // Construction
    MinimumHeatSinksRule,
    ArmorMaximumRule,
    ArmorLevelRule,
    EngineRatingRule,
    // Tech Base
    TechBaseCompatibilityRule,
    // Era
    EraAvailabilityRule,
  ];
}

/**
 * Register all standard rules with a registry
 */
export function registerStandardRules(registry: {
  register: (rule: IValidationRuleDefinition) => void;
}): void {
  for (const rule of getStandardValidationRules()) {
    registry.register(rule);
  }
}
