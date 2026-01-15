/**
 * Unit Validation Registry
 *
 * Hierarchical registry for unit validation rules. Manages universal rules,
 * category rules, and unit-type-specific rules with inheritance support.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { UnitType } from '../../types/unit/BattleMechInterfaces';
import {
  UnitCategory,
  IUnitValidationRule,
  IUnitValidationRuleDefinition,
  IUnitValidationRegistry,
  IUnitValidationContext,
  IUnitValidationRuleResult,
} from '../../types/validation/UnitValidationInterfaces';
import { ValidationCategory } from '../../types/validation/rules/ValidationRuleInterfaces';
import { getCategoryForUnitType } from '../../utils/validation/UnitCategoryMapper';

/**
 * Default priority for rules without explicit priority
 */
const DEFAULT_PRIORITY = 100;

/**
 * Internal rule wrapper that implements IUnitValidationRule
 */
class UnitValidationRule implements IUnitValidationRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ValidationCategory;
  readonly priority: number;
  readonly applicableUnitTypes: readonly UnitType[] | 'ALL';
  readonly overrides?: string;
  readonly extends?: string;
  isEnabled: boolean;

  private readonly validateFn: (context: IUnitValidationContext) => IUnitValidationRuleResult;
  private readonly canValidateFn?: (context: IUnitValidationContext) => boolean;

  constructor(definition: IUnitValidationRuleDefinition) {
    this.id = definition.id;
    this.name = definition.name;
    this.description = definition.description;
    this.category = definition.category;
    this.priority = definition.priority ?? DEFAULT_PRIORITY;
    this.applicableUnitTypes = definition.applicableUnitTypes ?? 'ALL';
    this.overrides = definition.overrides;
    this.extends = definition.extends;
    this.isEnabled = true;
    this.validateFn = definition.validate;
    this.canValidateFn = definition.canValidate;
  }

  validate(context: IUnitValidationContext): IUnitValidationRuleResult {
    return this.validateFn(context);
  }

  canValidate(context: IUnitValidationContext): boolean {
    // Check if rule is enabled
    if (!this.isEnabled) {
      return false;
    }

    // Check if rule applies to this unit type
    if (this.applicableUnitTypes !== 'ALL') {
      if (!this.applicableUnitTypes.includes(context.unitType)) {
        return false;
      }
    }

    // Run custom canValidate if provided
    if (this.canValidateFn) {
      return this.canValidateFn(context);
    }

    return true;
  }
}

/**
 * Unit Validation Registry implementation
 *
 * Manages rules at three levels:
 * 1. Universal rules (apply to ALL unit types)
 * 2. Category rules (apply to unit categories like MECH, VEHICLE)
 * 3. Unit-type rules (apply to specific unit types like BATTLEMECH)
 */
export class UnitValidationRegistry implements IUnitValidationRegistry {
  /** Universal rules that apply to all unit types */
  private universalRules: Map<string, IUnitValidationRule> = new Map();

  /** Category-specific rules */
  private categoryRules: Map<UnitCategory, Map<string, IUnitValidationRule>> = new Map();

  /** Unit-type-specific rules */
  private unitTypeRules: Map<UnitType, Map<string, IUnitValidationRule>> = new Map();

  /** All rules by ID for quick lookup */
  private allRulesById: Map<string, IUnitValidationRule> = new Map();

  /** Cached resolved rule sets per unit type */
  private resolvedRulesCache: Map<UnitType, readonly IUnitValidationRule[]> = new Map();

  constructor() {
    // Initialize category rule maps
    for (const category of Object.values(UnitCategory)) {
      this.categoryRules.set(category, new Map());
    }

    // Initialize unit type rule maps
    for (const unitType of Object.values(UnitType)) {
      this.unitTypeRules.set(unitType, new Map());
    }
  }

  /**
   * Register a universal rule (applies to all unit types)
   */
  registerUniversalRule(definition: IUnitValidationRuleDefinition): void {
    const rule = new UnitValidationRule({
      ...definition,
      applicableUnitTypes: 'ALL',
    });

    this.universalRules.set(rule.id, rule);
    this.allRulesById.set(rule.id, rule);
    this.clearCache();
  }

  /**
   * Register a category rule (applies to unit category)
   */
  registerCategoryRule(category: UnitCategory, definition: IUnitValidationRuleDefinition): void {
    const rule = new UnitValidationRule(definition);

    const categoryMap = this.categoryRules.get(category);
    if (categoryMap) {
      categoryMap.set(rule.id, rule);
    }
    this.allRulesById.set(rule.id, rule);
    this.clearCache();
  }

  /**
   * Register a unit-type-specific rule
   */
  registerUnitTypeRule(unitType: UnitType, definition: IUnitValidationRuleDefinition): void {
    const rule = new UnitValidationRule({
      ...definition,
      applicableUnitTypes: [unitType],
    });

    const unitTypeMap = this.unitTypeRules.get(unitType);
    if (unitTypeMap) {
      unitTypeMap.set(rule.id, rule);
    }
    this.allRulesById.set(rule.id, rule);
    this.clearCache();
  }

  /**
   * Unregister a rule by ID
   */
  unregister(ruleId: string): void {
    // Remove from universal rules
    this.universalRules.delete(ruleId);

    // Remove from category rules
    Array.from(this.categoryRules.values()).forEach((categoryMap) => {
      categoryMap.delete(ruleId);
    });

    // Remove from unit type rules
    Array.from(this.unitTypeRules.values()).forEach((unitTypeMap) => {
      unitTypeMap.delete(ruleId);
    });

    // Remove from lookup
    this.allRulesById.delete(ruleId);
    this.clearCache();
  }

  /**
   * Get all rules applicable to a unit type (resolved with inheritance)
   */
  getRulesForUnitType(unitType: UnitType): readonly IUnitValidationRule[] {
    // Check cache
    const cached = this.resolvedRulesCache.get(unitType);
    if (cached) {
      return cached;
    }

    // Collect rules from all levels
    const rules: IUnitValidationRule[] = [];

    // 1. Add universal rules
    rules.push(...Array.from(this.universalRules.values()));

    // 2. Add category rules
    const category = getCategoryForUnitType(unitType);
    if (category) {
      const categoryMap = this.categoryRules.get(category);
      if (categoryMap) {
        rules.push(...Array.from(categoryMap.values()));
      }
    }

    // 3. Add unit-type-specific rules
    const unitTypeMap = this.unitTypeRules.get(unitType);
    if (unitTypeMap) {
      rules.push(...Array.from(unitTypeMap.values()));
    }

    // 4. Resolve inheritance (overrides and extends)
    const resolved = this.resolveInheritance(rules);

    // 5. Sort by priority
    resolved.sort((a, b) => a.priority - b.priority);

    // Cache and return
    this.resolvedRulesCache.set(unitType, resolved);
    return resolved;
  }

  /**
   * Get a specific rule by ID
   */
  getRule(ruleId: string): IUnitValidationRule | undefined {
    return this.allRulesById.get(ruleId);
  }

  /**
   * Get all universal rules
   */
  getUniversalRules(): readonly IUnitValidationRule[] {
    return Array.from(this.universalRules.values());
  }

  /**
   * Get category rules for a category
   */
  getCategoryRules(category: UnitCategory): readonly IUnitValidationRule[] {
    const categoryMap = this.categoryRules.get(category);
    return categoryMap ? Array.from(categoryMap.values()) : [];
  }

  /**
   * Get unit-type-specific rules
   */
  getUnitTypeRules(unitType: UnitType): readonly IUnitValidationRule[] {
    const unitTypeMap = this.unitTypeRules.get(unitType);
    return unitTypeMap ? Array.from(unitTypeMap.values()) : [];
  }

  /**
   * Enable a rule
   */
  enableRule(ruleId: string): void {
    const rule = this.allRulesById.get(ruleId);
    if (rule && 'isEnabled' in rule) {
      (rule as UnitValidationRule).isEnabled = true;
      this.clearCache();
    }
  }

  /**
   * Disable a rule
   */
  disableRule(ruleId: string): void {
    const rule = this.allRulesById.get(ruleId);
    if (rule && 'isEnabled' in rule) {
      (rule as UnitValidationRule).isEnabled = false;
      this.clearCache();
    }
  }

  /**
   * Clear all rules
   */
  clear(): void {
    this.universalRules.clear();
    Array.from(this.categoryRules.values()).forEach((categoryMap) => {
      categoryMap.clear();
    });
    Array.from(this.unitTypeRules.values()).forEach((unitTypeMap) => {
      unitTypeMap.clear();
    });
    this.allRulesById.clear();
    this.clearCache();
  }

  /**
   * Clear cached rule sets
   */
  clearCache(): void {
    this.resolvedRulesCache.clear();
  }

  /**
   * Resolve inheritance (overrides and extends)
   *
   * Rules can:
   * - Override: Completely replace a parent rule
   * - Extend: Run after a parent rule
   */
  private resolveInheritance(rules: IUnitValidationRule[]): IUnitValidationRule[] {
    const ruleMap = new Map<string, IUnitValidationRule>();
    const extendedRules: IUnitValidationRule[] = [];

    // First pass: collect all rules and handle overrides
    for (const rule of rules) {
      if (rule.overrides) {
        // This rule overrides another - remove the parent
        ruleMap.delete(rule.overrides);
      }

      if (rule.extends) {
        // This rule extends another - keep both, mark for chaining
        extendedRules.push(rule);
      } else {
        // Standard rule - add to map (may override previous)
        ruleMap.set(rule.id, rule);
      }
    }

    // Second pass: add extending rules
    for (const extRule of extendedRules) {
      // Check if the parent rule exists
      const parentRule = ruleMap.get(extRule.extends!);
      if (parentRule) {
        // Create a wrapper that runs both rules
        const chainedRule = this.createChainedRule(parentRule, extRule);
        ruleMap.set(parentRule.id, chainedRule);
      } else {
        // Parent not found, just add the extending rule
        ruleMap.set(extRule.id, extRule);
      }
    }

    return Array.from(ruleMap.values());
  }

  /**
   * Create a chained rule that runs parent then child
   */
  private createChainedRule(
    parent: IUnitValidationRule,
    child: IUnitValidationRule
  ): IUnitValidationRule {
    return {
      ...parent,
      validate: (context: IUnitValidationContext): IUnitValidationRuleResult => {
        const parentResult = parent.validate(context);
        const childResult = child.validate(context);

        // Combine results
        return {
          ruleId: parent.id,
          ruleName: parent.name,
          passed: parentResult.passed && childResult.passed,
          errors: [...parentResult.errors, ...childResult.errors],
          warnings: [...parentResult.warnings, ...childResult.warnings],
          infos: [...parentResult.infos, ...childResult.infos],
          executionTime: parentResult.executionTime + childResult.executionTime,
        };
      },
      canValidate: (context: IUnitValidationContext): boolean => {
        return parent.canValidate(context) || child.canValidate(context);
      },
    };
  }
}

/**
 * Singleton instance of the registry
 */
let registryInstance: UnitValidationRegistry | null = null;

/**
 * Get the singleton registry instance
 */
export function getUnitValidationRegistry(): UnitValidationRegistry {
  if (!registryInstance) {
    registryInstance = new UnitValidationRegistry();
  }
  return registryInstance;
}

/**
 * Reset the singleton registry (for testing)
 */
export function resetUnitValidationRegistry(): void {
  registryInstance = null;
}
