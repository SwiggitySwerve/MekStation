/**
 * Unit Validation Orchestrator
 *
 * Executes validation rules against units with support for
 * filtering by category, unit type, and options.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { ValidationCategory } from '../../types/validation/rules/ValidationRuleInterfaces';
import {
  UnitCategory,
  IValidatableUnit,
  IUnitValidationContext,
  IUnitValidationOptions,
  IUnitValidationResult,
  IUnitValidationRuleResult,
  IUnitValidationOrchestrator,
  IUnitValidationRegistry,
  UnitValidationSeverity,
} from '../../types/validation/UnitValidationInterfaces';
import { getCategoryForUnitType } from '../../utils/validation/UnitCategoryMapper';
import { getUnitValidationRegistry } from './UnitValidationRegistry';

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: IUnitValidationOptions = {
  strictMode: true,
  includeWarnings: true,
  includeInfos: true,
  maxErrors: 100,
};

/**
 * Unit Validation Orchestrator implementation
 *
 * Orchestrates validation rule execution for units, handling:
 * - Rule selection based on unit type
 * - Priority-based execution order
 * - Result aggregation
 * - Options like maxErrors, skipRules
 */
export class UnitValidationOrchestrator implements IUnitValidationOrchestrator {
  private registry: IUnitValidationRegistry;

  constructor(registry?: IUnitValidationRegistry) {
    this.registry = registry ?? getUnitValidationRegistry();
  }

  /**
   * Validate a unit with full rule set
   */
  validate(
    unit: IValidatableUnit,
    options?: IUnitValidationOptions,
  ): IUnitValidationResult {
    const startTime = performance.now();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // Build validation context
    const context = this.buildContext(unit, mergedOptions);

    // Get applicable rules
    let rules = this.registry.getRulesForUnitType(unit.unitType);

    // Filter by skip rules
    if (mergedOptions.skipRules && mergedOptions.skipRules.length > 0) {
      const skipSet = new Set(mergedOptions.skipRules);
      rules = rules.filter((rule) => !skipSet.has(rule.id));
    }

    // Filter by validation categories if specified
    if (mergedOptions.categories && mergedOptions.categories.length > 0) {
      const categorySet = new Set(mergedOptions.categories);
      rules = rules.filter((rule) => categorySet.has(rule.category));
    }

    // Execute rules
    const results = this.executeRules(rules, context, mergedOptions);

    // Build aggregated result
    return this.buildResult(results, context, startTime);
  }

  /**
   * Validate using only rules from a specific validation category
   */
  validateCategory(
    unit: IValidatableUnit,
    category: ValidationCategory,
  ): IUnitValidationResult {
    return this.validate(unit, { categories: [category] });
  }

  /**
   * Validate using only rules from a specific unit category
   */
  validateUnitCategory(
    unit: IValidatableUnit,
    unitCategory: UnitCategory,
  ): IUnitValidationResult {
    return this.validate(unit, { unitCategories: [unitCategory] });
  }

  /**
   * Run a specific rule
   */
  validateRule(
    unit: IValidatableUnit,
    ruleId: string,
  ): IUnitValidationRuleResult | null {
    const rule = this.registry.getRule(ruleId);
    if (!rule) {
      return null;
    }

    const context = this.buildContext(unit, DEFAULT_OPTIONS);

    if (!rule.canValidate(context)) {
      return null;
    }

    return this.executeRule(rule, context);
  }

  /**
   * Get the registry
   */
  getRegistry(): IUnitValidationRegistry {
    return this.registry;
  }

  /**
   * Build validation context from unit and options
   */
  private buildContext(
    unit: IValidatableUnit,
    options: IUnitValidationOptions,
  ): IUnitValidationContext {
    const unitCategory =
      getCategoryForUnitType(unit.unitType) ?? UnitCategory.MECH;

    return {
      unit,
      unitType: unit.unitType,
      unitCategory,
      techBase: unit.techBase,
      campaignYear: options.campaignYear,
      rulesLevelFilter: options.rulesLevelFilter,
      options,
      cache: new Map(),
    };
  }

  /**
   * Execute rules and collect results
   */
  private executeRules(
    rules: readonly ReturnType<
      IUnitValidationRegistry['getRulesForUnitType']
    >[number][],
    context: IUnitValidationContext,
    options: IUnitValidationOptions,
  ): IUnitValidationRuleResult[] {
    const results: IUnitValidationRuleResult[] = [];
    let errorCount = 0;
    const maxErrors = options.maxErrors ?? 100;

    for (const rule of rules) {
      // Check if we've hit max errors
      if (errorCount >= maxErrors) {
        break;
      }

      // Check if rule can validate this context
      if (!rule.canValidate(context)) {
        continue;
      }

      // Execute rule
      const result = this.executeRule(rule, context);
      results.push(result);

      // Count errors (critical errors and regular errors)
      errorCount += result.errors.filter(
        (e) =>
          e.severity === UnitValidationSeverity.CRITICAL_ERROR ||
          e.severity === UnitValidationSeverity.ERROR,
      ).length;
    }

    return results;
  }

  /**
   * Execute a single rule with timing
   */
  private executeRule(
    rule: ReturnType<IUnitValidationRegistry['getRule']> & object,
    context: IUnitValidationContext,
  ): IUnitValidationRuleResult {
    const startTime = performance.now();

    try {
      const result = rule.validate(context);
      const executionTime = performance.now() - startTime;

      return {
        ...result,
        executionTime,
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;

      // Return error result on rule failure
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        errors: [
          {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: UnitValidationSeverity.ERROR,
            category: rule.category,
            message: `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        warnings: [],
        infos: [],
        executionTime,
      };
    }
  }

  /**
   * Build aggregated result from rule results
   */
  private buildResult(
    results: IUnitValidationRuleResult[],
    context: IUnitValidationContext,
    startTime: number,
  ): IUnitValidationResult {
    let criticalErrorCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let hasCriticalErrors = false;

    for (const result of results) {
      for (const error of result.errors) {
        if (error.severity === UnitValidationSeverity.CRITICAL_ERROR) {
          criticalErrorCount++;
          hasCriticalErrors = true;
        } else {
          errorCount++;
        }
      }
      warningCount += result.warnings.length;
      infoCount += result.infos.length;
    }

    const totalExecutionTime = performance.now() - startTime;
    const maxErrors = context.options.maxErrors ?? 100;
    const totalErrors = criticalErrorCount + errorCount;

    return {
      isValid: criticalErrorCount === 0 && errorCount === 0,
      hasCriticalErrors,
      results,
      criticalErrorCount,
      errorCount,
      warningCount,
      infoCount,
      totalExecutionTime,
      validatedAt: new Date().toISOString(),
      unitType: context.unitType,
      unitCategory: context.unitCategory,
      truncated: totalErrors >= maxErrors,
    };
  }
}

/**
 * Singleton instance of the orchestrator
 */
let orchestratorInstance: UnitValidationOrchestrator | null = null;

/**
 * Get the singleton orchestrator instance
 */
export function getUnitValidationOrchestrator(): UnitValidationOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new UnitValidationOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Reset the singleton orchestrator (for testing)
 */
export function resetUnitValidationOrchestrator(): void {
  orchestratorInstance = null;
}

/**
 * Convenience function to validate a unit
 */
export function validateUnit(
  unit: IValidatableUnit,
  options?: IUnitValidationOptions,
): IUnitValidationResult {
  return getUnitValidationOrchestrator().validate(unit, options);
}
