/**
 * Validation Rule Registry
 *
 * Manages registration and retrieval of validation rules.
 *
 * @spec openspec/specs/validation-rules-master/spec.md
 */

import {
  IValidationRule,
  IValidationRuleDefinition,
  IValidationRuleRegistry,
  IValidationContext,
  IValidationRuleResult,
  ValidationCategory,
} from '@/types/validation/rules/ValidationRuleInterfaces';

/**
 * Default rule priority
 */
const DEFAULT_PRIORITY = 100;

/**
 * Create a validation rule from definition
 */
function createRule(definition: IValidationRuleDefinition): IValidationRule {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    priority: definition.priority ?? DEFAULT_PRIORITY,
    isEnabled: true,

    validate(context: IValidationContext): IValidationRuleResult {
      return definition.validate(context);
    },

    canValidate(context: IValidationContext): boolean {
      if (definition.canValidate) {
        return definition.canValidate(context);
      }
      return true;
    },
  };
}

/**
 * Create a validation rule registry
 */
export function createValidationRuleRegistry(): IValidationRuleRegistry {
  const rules = new Map<string, IValidationRule>();
  const enabledState = new Map<string, boolean>();

  return {
    register(definition: IValidationRuleDefinition): void {
      if (rules.has(definition.id)) {
        throw new Error(
          `Rule with ID '${definition.id}' is already registered`,
        );
      }
      rules.set(definition.id, createRule(definition));
      enabledState.set(definition.id, true);
    },

    unregister(ruleId: string): void {
      rules.delete(ruleId);
      enabledState.delete(ruleId);
    },

    getRule(ruleId: string): IValidationRule | undefined {
      const rule = rules.get(ruleId);
      if (rule) {
        return {
          ...rule,
          isEnabled: enabledState.get(ruleId) ?? true,
        };
      }
      return undefined;
    },

    getAllRules(): readonly IValidationRule[] {
      return Array.from(rules.values())
        .map((rule) => ({
          ...rule,
          isEnabled: enabledState.get(rule.id) ?? true,
        }))
        .sort((a, b) => a.priority - b.priority);
    },

    getRulesByCategory(
      category: ValidationCategory,
    ): readonly IValidationRule[] {
      return this.getAllRules().filter((rule) => rule.category === category);
    },

    enableRule(ruleId: string): void {
      if (rules.has(ruleId)) {
        enabledState.set(ruleId, true);
      }
    },

    disableRule(ruleId: string): void {
      if (rules.has(ruleId)) {
        enabledState.set(ruleId, false);
      }
    },

    clear(): void {
      rules.clear();
      enabledState.clear();
    },
  };
}

/**
 * Global default registry instance
 */
let defaultRegistry: IValidationRuleRegistry | null = null;

/**
 * Get the default validation rule registry
 */
export function getDefaultValidationRuleRegistry(): IValidationRuleRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createValidationRuleRegistry();
  }
  return defaultRegistry;
}

/**
 * Reset the default registry (useful for testing)
 */
export function resetDefaultValidationRuleRegistry(): void {
  defaultRegistry = null;
}
