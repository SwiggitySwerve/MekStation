/**
 * Unit Validation Framework Interfaces
 *
 * Defines the hierarchical validation framework for all MekStation unit types.
 * Provides universal validation rules applicable to every unit, category-specific
 * rules for related unit groups, and unit-type-specific rules.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { UnitType } from '../unit/BattleMechInterfaces';
import { TechBase, RulesLevel, Era } from '../enums';
import {
  ValidationCategory,
  IValidationOptions,
} from './rules/ValidationRuleInterfaces';

/**
 * Unit category grouping related unit types
 */
export enum UnitCategory {
  /** BattleMech, OmniMech, IndustrialMech, ProtoMech */
  MECH = 'Mech',
  /** Vehicle, VTOL, SupportVehicle */
  VEHICLE = 'Vehicle',
  /** Aerospace, ConventionalFighter, SmallCraft, DropShip, JumpShip, WarShip, SpaceStation */
  AEROSPACE = 'Aerospace',
  /** Infantry, BattleArmor */
  PERSONNEL = 'Personnel',
}

/**
 * Extended validation severity with CRITICAL_ERROR for build-breaking issues
 */
export enum UnitValidationSeverity {
  /** Build-breaking issue - prevents save/export */
  CRITICAL_ERROR = 'Critical Error',
  /** Invalid configuration that violates construction rules */
  ERROR = 'Error',
  /** Legal but unusual configuration */
  WARNING = 'Warning',
  /** Informational message */
  INFO = 'Info',
}

/**
 * Rule inheritance mode
 */
export enum RuleInheritanceMode {
  /** Rule applies as-is from parent level */
  INHERIT = 'inherit',
  /** Rule completely replaces parent rule with same ID */
  OVERRIDE = 'override',
  /** Rule runs after parent rule, can add/modify results */
  EXTEND = 'extend',
}

/**
 * Base unit interface for validation
 * Represents the minimal fields all units must have for validation
 */
export interface IValidatableUnit {
  readonly id: string;
  readonly name: string;
  readonly unitType: UnitType;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly introductionYear: number;
  readonly era: Era;
  readonly extinctionYear?: number;
  readonly weight: number;
  readonly cost: number;
  readonly battleValue: number;

  // Mech-specific optional fields
  readonly engineType?: string;
  readonly gyroType?: string;
  readonly cockpitType?: string;
  readonly internalStructureType?: string;
  readonly heatSinkCount?: number;
  readonly heatSinkType?: string;
  readonly totalArmorPoints?: number;
  readonly maxArmorPoints?: number;
}

/**
 * Extended validation context for unit validation
 */
export interface IUnitValidationContext {
  /** The unit being validated */
  readonly unit: IValidatableUnit;
  /** Cached unit type for quick access */
  readonly unitType: UnitType;
  /** Cached unit category */
  readonly unitCategory: UnitCategory;
  /** Unit's tech base */
  readonly techBase: TechBase;
  /** Campaign year for era validation (optional) */
  readonly campaignYear?: number;
  /** Maximum allowed rules level (optional) */
  readonly rulesLevelFilter?: RulesLevel;
  /** Validation options */
  readonly options: IUnitValidationOptions;
  /** Shared cache for rule data */
  readonly cache: Map<string, unknown>;
}

/**
 * Extended validation options for unit validation
 */
export interface IUnitValidationOptions extends IValidationOptions {
  /** Campaign year for era availability checks */
  readonly campaignYear?: number;
  /** Maximum rules level allowed */
  readonly rulesLevelFilter?: RulesLevel;
  /** Skip specific rule IDs */
  readonly skipRules?: string[];
  /** Maximum errors before stopping */
  readonly maxErrors?: number;
  /** Include only specific categories */
  readonly categories?: ValidationCategory[];
  /** Include only specific unit categories */
  readonly unitCategories?: UnitCategory[];
}

/**
 * Unit validation rule definition
 */
export interface IUnitValidationRule {
  /** Unique rule identifier (e.g., "VAL-UNIV-001") */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Description of what the rule validates */
  readonly description: string;
  /** Validation category */
  readonly category: ValidationCategory;
  /** Execution priority (lower = earlier) */
  readonly priority: number;
  /** Which unit types this rule applies to, or 'ALL' for universal */
  readonly applicableUnitTypes: readonly UnitType[] | 'ALL';
  /** ID of rule this overrides (if any) */
  readonly overrides?: string;
  /** ID of rule this extends (if any) */
  readonly extends?: string;
  /** Whether the rule is currently enabled */
  readonly isEnabled: boolean;

  /** Execute the validation */
  validate(context: IUnitValidationContext): IUnitValidationRuleResult;

  /** Check if this rule can validate the given context */
  canValidate(context: IUnitValidationContext): boolean;
}

/**
 * Result from a single unit validation rule
 */
export interface IUnitValidationRuleResult {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly passed: boolean;
  readonly errors: readonly IUnitValidationError[];
  readonly warnings: readonly IUnitValidationError[];
  readonly infos: readonly IUnitValidationError[];
  readonly executionTime: number;
}

/**
 * Unit validation error with enhanced details
 */
export interface IUnitValidationError {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly severity: UnitValidationSeverity;
  readonly category: ValidationCategory;
  readonly message: string;
  /** Field path that caused the error */
  readonly field?: string;
  /** Expected value */
  readonly expected?: string;
  /** Actual value */
  readonly actual?: string;
  /** Suggested fix */
  readonly suggestion?: string;
  /** Additional details */
  readonly details?: Record<string, unknown>;
}

/**
 * Aggregated result from unit validation
 */
export interface IUnitValidationResult {
  readonly isValid: boolean;
  readonly hasCriticalErrors: boolean;
  readonly results: readonly IUnitValidationRuleResult[];
  readonly criticalErrorCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly totalExecutionTime: number;
  readonly validatedAt: string;
  readonly unitType: UnitType;
  readonly unitCategory: UnitCategory;
  /** Indicates if results were truncated due to maxErrors */
  readonly truncated: boolean;
}

/**
 * Rule definition for registration (simplified for rule authors)
 */
export interface IUnitValidationRuleDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ValidationCategory;
  readonly priority?: number;
  readonly applicableUnitTypes?: readonly UnitType[] | 'ALL';
  readonly overrides?: string;
  readonly extends?: string;
  readonly validate: (context: IUnitValidationContext) => IUnitValidationRuleResult;
  readonly canValidate?: (context: IUnitValidationContext) => boolean;
}

/**
 * Unit validation registry interface
 */
export interface IUnitValidationRegistry {
  /** Register a universal rule (applies to all unit types) */
  registerUniversalRule(rule: IUnitValidationRuleDefinition): void;

  /** Register a category rule (applies to unit category) */
  registerCategoryRule(category: UnitCategory, rule: IUnitValidationRuleDefinition): void;

  /** Register a unit-type-specific rule */
  registerUnitTypeRule(unitType: UnitType, rule: IUnitValidationRuleDefinition): void;

  /** Unregister a rule by ID */
  unregister(ruleId: string): void;

  /** Get all rules applicable to a unit type (resolved with inheritance) */
  getRulesForUnitType(unitType: UnitType): readonly IUnitValidationRule[];

  /** Get a specific rule by ID */
  getRule(ruleId: string): IUnitValidationRule | undefined;

  /** Get all universal rules */
  getUniversalRules(): readonly IUnitValidationRule[];

  /** Get category rules for a category */
  getCategoryRules(category: UnitCategory): readonly IUnitValidationRule[];

  /** Get unit-type-specific rules */
  getUnitTypeRules(unitType: UnitType): readonly IUnitValidationRule[];

  /** Enable a rule */
  enableRule(ruleId: string): void;

  /** Disable a rule */
  disableRule(ruleId: string): void;

  /** Clear all rules */
  clear(): void;

  /** Clear cached rule sets */
  clearCache(): void;
}

/**
 * Unit validation orchestrator interface
 */
export interface IUnitValidationOrchestrator {
  /** Validate a unit with full rule set */
  validate(unit: IValidatableUnit, options?: IUnitValidationOptions): IUnitValidationResult;

  /** Validate using only rules from a specific category */
  validateCategory(unit: IValidatableUnit, category: ValidationCategory): IUnitValidationResult;

  /** Validate using only rules from a specific unit category */
  validateUnitCategory(unit: IValidatableUnit, unitCategory: UnitCategory): IUnitValidationResult;

  /** Run a specific rule */
  validateRule(unit: IValidatableUnit, ruleId: string): IUnitValidationRuleResult | null;

  /** Get the registry */
  getRegistry(): IUnitValidationRegistry;
}

/**
 * Helper to create a validation error
 */
export function createUnitValidationError(
  ruleId: string,
  ruleName: string,
  severity: UnitValidationSeverity,
  category: ValidationCategory,
  message: string,
  options?: {
    field?: string;
    expected?: string;
    actual?: string;
    suggestion?: string;
    details?: Record<string, unknown>;
  }
): IUnitValidationError {
  return {
    ruleId,
    ruleName,
    severity,
    category,
    message,
    field: options?.field,
    expected: options?.expected,
    actual: options?.actual,
    suggestion: options?.suggestion,
    details: options?.details,
  };
}

/**
 * Helper to create a validation rule result
 */
export function createUnitValidationRuleResult(
  ruleId: string,
  ruleName: string,
  errors: IUnitValidationError[],
  warnings: IUnitValidationError[],
  infos: IUnitValidationError[],
  executionTime: number
): IUnitValidationRuleResult {
  return {
    ruleId,
    ruleName,
    passed: errors.length === 0,
    errors,
    warnings,
    infos,
    executionTime,
  };
}

/**
 * Helper to create a passing rule result
 */
export function createPassingResult(
  ruleId: string,
  ruleName: string,
  executionTime: number = 0
): IUnitValidationRuleResult {
  return createUnitValidationRuleResult(ruleId, ruleName, [], [], [], executionTime);
}
