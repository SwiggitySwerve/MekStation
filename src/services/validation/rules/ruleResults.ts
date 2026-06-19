import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationError,
  IUnitValidationRuleDefinition,
  IUnitValidationRuleResult,
  IValidationErrorDetails,
  UnitValidationSeverity,
  createUnitValidationError,
  createUnitValidationRuleResult,
} from '@/types/validation/UnitValidationInterfaces';

type RuleIdentity = Pick<IUnitValidationRuleDefinition, 'id' | 'name'>;
type RuleWithCategory = RuleIdentity & { category: ValidationCategory };

interface IRuleResultDiagnostics {
  readonly errors?: readonly IUnitValidationError[];
  readonly warnings?: readonly IUnitValidationError[];
  readonly infos?: readonly IUnitValidationError[];
  readonly executionTime?: number;
}

interface IRuleErrorOptions {
  readonly field?: string;
  readonly expected?: string;
  readonly actual?: string;
  readonly suggestion?: string;
  readonly details?: IValidationErrorDetails;
}

export function createRuleResult(
  rule: RuleIdentity,
  diagnostics: IRuleResultDiagnostics = {},
): IUnitValidationRuleResult {
  return createUnitValidationRuleResult(
    rule.id,
    rule.name,
    [...(diagnostics.errors ?? [])],
    [...(diagnostics.warnings ?? [])],
    [...(diagnostics.infos ?? [])],
    diagnostics.executionTime ?? 0,
  );
}

export function createEmptyRuleResult(
  rule: RuleIdentity,
): IUnitValidationRuleResult {
  return createRuleResult(rule);
}

export function createRuleError(
  rule: RuleWithCategory,
  severity: UnitValidationSeverity,
  message: string,
  options?: IRuleErrorOptions,
): IUnitValidationError {
  return createUnitValidationError(
    rule.id,
    rule.name,
    severity,
    rule.category,
    message,
    options,
  );
}

export function addRuleDiagnostic(
  diagnostics: IUnitValidationError[],
  rule: RuleWithCategory,
  severity: UnitValidationSeverity,
  message: string,
  options?: IRuleErrorOptions,
): void {
  diagnostics.push(createRuleError(rule, severity, message, options));
}
