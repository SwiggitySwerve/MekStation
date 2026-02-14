import {
  IValidationRuleResult,
  IValidationError,
} from '@/types/validation/rules/ValidationRuleInterfaces';

export function pass(ruleId: string): IValidationRuleResult {
  return {
    ruleId,
    passed: true,
    errors: [],
    warnings: [],
    infos: [],
    executionTime: 0,
  };
}

export function fail(
  ruleId: string,
  errors: IValidationError[],
): IValidationRuleResult {
  return {
    ruleId,
    passed: false,
    errors,
    warnings: [],
    infos: [],
    executionTime: 0,
  };
}

export function warn(
  ruleId: string,
  warnings: IValidationError[],
): IValidationRuleResult {
  return {
    ruleId,
    passed: true,
    errors: [],
    warnings,
    infos: [],
    executionTime: 0,
  };
}
