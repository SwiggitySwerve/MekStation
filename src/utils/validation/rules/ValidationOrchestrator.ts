/**
 * Validation Orchestrator
 *
 * Coordinates execution of validation rules.
 *
 * @spec openspec/specs/validation-rules-master/spec.md
 */

import {
  IValidationOrchestrator,
  IValidationRuleRegistry,
  IValidationContext,
  IValidationOptions,
  IValidationResult,
  IValidationRuleResult,
  ValidationCategory,
  ValidationSeverity,
} from '../../../types/validation/rules/ValidationRuleInterfaces';
import { createValidationRuleRegistry } from './ValidationRuleRegistry';

/**
 * Create an empty validation rule result
 */
function createEmptyRuleResult(ruleId: string): IValidationRuleResult {
  return {
    ruleId,
    passed: true,
    errors: [],
    warnings: [],
    infos: [],
    executionTime: 0,
  };
}

/**
 * Aggregate multiple rule results into a single validation result
 */
function aggregateResults(results: IValidationRuleResult[]): IValidationResult {
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  let totalExecutionTime = 0;
  let isValid = true;

  for (const result of results) {
    errorCount += result.errors.length;
    warningCount += result.warnings.length;
    infoCount += result.infos.length;
    totalExecutionTime += result.executionTime;

    if (!result.passed) {
      isValid = false;
    }
  }

  return {
    isValid,
    results,
    errorCount,
    warningCount,
    infoCount,
    totalExecutionTime,
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Create a validation orchestrator
 */
export function createValidationOrchestrator(
  registry?: IValidationRuleRegistry,
): IValidationOrchestrator {
  const ruleRegistry = registry ?? createValidationRuleRegistry();

  return {
    validate(
      unit: unknown,
      options: IValidationOptions = {},
    ): IValidationResult {
      const context: IValidationContext = {
        unit,
        options,
        cache: new Map(),
      };

      const rules = ruleRegistry.getAllRules().filter((rule) => {
        // Check if rule is enabled
        if (!rule.isEnabled) return false;

        // Check if rule is in skip list
        if (options.skipRules?.includes(rule.id)) return false;

        // Check if rule category is in filter
        if (options.categories && !options.categories.includes(rule.category)) {
          return false;
        }

        // Check if rule can validate this context
        return rule.canValidate(context);
      });

      const results: IValidationRuleResult[] = [];
      let totalErrors = 0;

      for (const rule of rules) {
        // Stop if max errors reached
        if (options.maxErrors && totalErrors >= options.maxErrors) {
          break;
        }

        const startTime = performance.now();

        try {
          const result = rule.validate(context);
          const executionTime = performance.now() - startTime;

          results.push({
            ...result,
            executionTime,
          });

          totalErrors += result.errors.length;
        } catch (error) {
          // Rule execution failed - treat as error
          results.push({
            ruleId: rule.id,
            passed: false,
            errors: [
              {
                ruleId: rule.id,
                ruleName: rule.name,
                severity: ValidationSeverity.ERROR,
                category: rule.category,
                message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            warnings: [],
            infos: [],
            executionTime: performance.now() - startTime,
          });
          totalErrors++;
        }
      }

      return aggregateResults(results);
    },

    validateCategory(
      unit: unknown,
      category: ValidationCategory,
    ): IValidationResult {
      return this.validate(unit, { categories: [category] });
    },

    validateRule(unit: unknown, ruleId: string): IValidationRuleResult | null {
      const rule = ruleRegistry.getRule(ruleId);
      if (!rule) {
        return null;
      }

      const context: IValidationContext = {
        unit,
        options: {},
        cache: new Map(),
      };

      if (!rule.canValidate(context)) {
        return createEmptyRuleResult(ruleId);
      }

      const startTime = performance.now();

      try {
        const result = rule.validate(context);
        return {
          ...result,
          executionTime: performance.now() - startTime,
        };
      } catch (error) {
        return {
          ruleId: rule.id,
          passed: false,
          errors: [
            {
              ruleId: rule.id,
              ruleName: rule.name,
              severity: ValidationSeverity.ERROR,
              category: rule.category,
              message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          warnings: [],
          infos: [],
          executionTime: performance.now() - startTime,
        };
      }
    },

    getRegistry(): IValidationRuleRegistry {
      return ruleRegistry;
    },
  };
}
