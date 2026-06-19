import {
  IValidationContext,
  IValidationRuleDefinition,
  IValidationRuleResult,
  IValidationError,
  ValidationSeverity,
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

export function unitRecord(
  context: IValidationContext,
): Record<string, unknown> {
  return context.unit as Record<string, unknown>;
}

export function hasConfiguration(
  context: IValidationContext,
  configuration: string,
): boolean {
  return (
    (unitRecord(context).configuration as string | undefined)?.toLowerCase() ===
    configuration
  );
}

export function forConfiguration(
  configuration: string,
): (context: IValidationContext) => boolean {
  return (context) => hasConfiguration(context, configuration);
}

export function lacksConfiguration(
  context: IValidationContext,
  configuration: string,
): boolean {
  return (
    (unitRecord(context).configuration as string | undefined)?.toLowerCase() !==
    configuration
  );
}

export function withoutConfiguration(
  configuration: string,
): (context: IValidationContext) => boolean {
  return (context) => lacksConfiguration(context, configuration);
}

export function failIfErrors(
  ruleId: string,
  errors: IValidationError[],
): IValidationRuleResult {
  return errors.length > 0 ? fail(ruleId, errors) : pass(ruleId);
}

export function warnIfWarnings(
  ruleId: string,
  warnings: IValidationError[],
): IValidationRuleResult {
  return warnings.length > 0 ? warn(ruleId, warnings) : pass(ruleId);
}

export function countUsedCriticalSlots(
  criticalSlots: Record<string, Array<unknown>>,
): number {
  return Object.values(criticalSlots).reduce((usedSlots, slots) => {
    if (!Array.isArray(slots)) {
      return usedSlots;
    }

    return (
      usedSlots + slots.filter((s) => s !== null && s !== '-Empty-').length
    );
  }, 0);
}

export function missingLocationsForSlotText(
  criticalSlots: Record<string, Array<string | null>>,
  locations: string[],
  text: string,
): string[] {
  return locations.filter((loc) => {
    const slots = criticalSlots[loc];
    return !slots?.some((s) => s && s.toLowerCase().includes(text));
  });
}

type RuleErrorFields = Omit<
  IValidationError,
  'ruleId' | 'ruleName' | 'severity' | 'category'
> & {
  severity?: IValidationError['severity'];
  category?: IValidationError['category'];
};

export function ruleError(
  rule: Pick<IValidationRuleDefinition, 'id' | 'name' | 'category'>,
  fields: RuleErrorFields,
): IValidationError {
  const {
    severity = ValidationSeverity.ERROR,
    category = rule.category,
    ...details
  } = fields;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    severity,
    category,
    ...details,
  };
}
