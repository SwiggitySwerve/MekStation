/**
 * Validation Rule Interfaces
 *
 * Defines the core validation rule system interfaces.
 *
 * @spec openspec/specs/validation-rules-master/spec.md
 */

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'Error',
  WARNING = 'Warning',
  INFO = 'Info',
}

/**
 * Validation rule category
 */
export enum ValidationCategory {
  WEIGHT = 'Weight',
  SLOTS = 'Slots',
  TECH_BASE = 'Tech Base',
  ERA = 'Era',
  CONSTRUCTION = 'Construction',
  EQUIPMENT = 'Equipment',
  MOVEMENT = 'Movement',
  ARMOR = 'Armor',
  HEAT = 'Heat',
}

/**
 * Validation error with details
 */
export interface IValidationError {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly severity: ValidationSeverity;
  readonly category: ValidationCategory;
  readonly message: string;
  readonly path?: string;
  readonly expected?: string;
  readonly actual?: string;
  readonly suggestion?: string;
}

/**
 * Validation result from a single rule
 */
export interface IValidationRuleResult {
  readonly ruleId: string;
  readonly passed: boolean;
  readonly errors: readonly IValidationError[];
  readonly warnings: readonly IValidationError[];
  readonly infos: readonly IValidationError[];
  readonly executionTime: number;
}

/**
 * Aggregated validation result from all rules
 */
export interface IValidationResult {
  readonly isValid: boolean;
  readonly results: readonly IValidationRuleResult[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly totalExecutionTime: number;
  readonly validatedAt: string;
}

/**
 * Validation context passed to rules
 */
export interface IValidationContext {
  readonly unit: unknown;
  readonly options: IValidationOptions;
  readonly cache: Map<string, unknown>;
}

/**
 * Validation options
 */
export interface IValidationOptions {
  readonly strictMode?: boolean;
  readonly includeWarnings?: boolean;
  readonly includeInfos?: boolean;
  readonly categories?: ValidationCategory[];
  readonly skipRules?: string[];
  readonly maxErrors?: number;
}

/**
 * Validation rule interface
 */
export interface IValidationRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ValidationCategory;
  readonly priority: number;
  readonly isEnabled: boolean;

  validate(context: IValidationContext): IValidationRuleResult;
  canValidate(context: IValidationContext): boolean;
}

/**
 * Validation rule definition for registration
 */
export interface IValidationRuleDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ValidationCategory;
  readonly priority?: number;
  readonly validate: (context: IValidationContext) => IValidationRuleResult;
  readonly canValidate?: (context: IValidationContext) => boolean;
}

/**
 * Validation rule registry interface
 */
export interface IValidationRuleRegistry {
  register(rule: IValidationRuleDefinition): void;
  unregister(ruleId: string): void;
  getRule(ruleId: string): IValidationRule | undefined;
  getAllRules(): readonly IValidationRule[];
  getRulesByCategory(category: ValidationCategory): readonly IValidationRule[];
  enableRule(ruleId: string): void;
  disableRule(ruleId: string): void;
  clear(): void;
}

/**
 * Validation orchestrator interface
 */
export interface IValidationOrchestrator {
  validate(unit: unknown, options?: IValidationOptions): IValidationResult;
  validateCategory(
    unit: unknown,
    category: ValidationCategory,
  ): IValidationResult;
  validateRule(unit: unknown, ruleId: string): IValidationRuleResult | null;
  getRegistry(): IValidationRuleRegistry;
}
