/**
 * Variable Equipment Formula Types
 *
 * Data-driven formula definitions for equipment with variable properties
 * that depend on mech configuration.
 *
 * Supports arithmetic operations and MIN/MAX/PLUS combinators.
 *
 * @spec openspec/specs/equipment-services/spec.md
 */

/**
 * Formula operation types
 */
export type FormulaType =
  | 'FIXED' // Constant value
  | 'CEIL_DIVIDE' // ceil(field / divisor)
  | 'FLOOR_DIVIDE' // floor(field / divisor)
  | 'ROUND_DIVIDE' // round(field / divisor) - nearest integer
  | 'MULTIPLY' // field × multiplier
  | 'MULTIPLY_ROUND' // field × multiplier, rounded to precision
  | 'EQUALS_WEIGHT' // = calculated weight (for slots that equal weight)
  | 'EQUALS_FIELD' // = context field directly
  | 'MIN' // minimum of sub-formulas
  | 'MAX' // maximum of sub-formulas
  | 'PLUS'; // base formula + bonus (for physical weapon damage)

/**
 * Formula definition
 *
 * Each formula type uses specific fields:
 * - FIXED: value
 * - CEIL_DIVIDE, FLOOR_DIVIDE: field, divisor
 * - MULTIPLY: field, multiplier
 * - MULTIPLY_ROUND: field, multiplier, roundTo
 * - EQUALS_WEIGHT: (no additional fields)
 * - EQUALS_FIELD: field
 * - MIN, MAX: formulas (array of sub-formulas)
 */
export interface IFormula {
  readonly type: FormulaType;

  /** Context field name to read value from */
  readonly field?: string;

  /** Constant value for FIXED type */
  readonly value?: number;

  /** Divisor for CEIL_DIVIDE, FLOOR_DIVIDE */
  readonly divisor?: number;

  /** Multiplier for MULTIPLY variants */
  readonly multiplier?: number;

  /** Rounding precision (0.5, 1, etc.) for MULTIPLY_ROUND */
  readonly roundTo?: number;

  /** Sub-formulas for MIN/MAX combinators */
  readonly formulas?: readonly IFormula[];

  /** Base formula for PLUS combinator */
  readonly base?: IFormula;

  /** Bonus value for PLUS combinator */
  readonly bonus?: number;
}

/**
 * Complete variable equipment formula set
 */
export interface IVariableFormulas {
  /** Formula to calculate weight in tons */
  readonly weight: IFormula;

  /** Formula to calculate critical slots */
  readonly criticalSlots: IFormula;

  /** Formula to calculate C-Bill cost */
  readonly cost: IFormula;

  /** Optional formula to calculate damage (for physical weapons) */
  readonly damage?: IFormula;

  /** Context fields required for calculation */
  readonly requiredContext: readonly string[];
}

/**
 * Stored custom formula record (for IndexedDB)
 */
export interface IStoredFormula {
  readonly equipmentId: string;
  readonly formulas: IVariableFormulas;
  readonly createdAt: number;
  readonly modifiedAt: number;
}

// ============================================================================
// HELPER FUNCTIONS FOR CREATING FORMULAS
// ============================================================================

/**
 * Create a FIXED value formula
 */
export function fixed(value: number): IFormula {
  return { type: 'FIXED', value };
}

/**
 * Create a CEIL_DIVIDE formula: ceil(field / divisor)
 */
export function ceilDivide(field: string, divisor: number): IFormula {
  return { type: 'CEIL_DIVIDE', field, divisor };
}

/**
 * Create a FLOOR_DIVIDE formula: floor(field / divisor)
 */
export function floorDivide(field: string, divisor: number): IFormula {
  return { type: 'FLOOR_DIVIDE', field, divisor };
}

/**
 * Create a ROUND_DIVIDE formula: round(field / divisor) - nearest integer
 */
export function roundDivide(field: string, divisor: number): IFormula {
  return { type: 'ROUND_DIVIDE', field, divisor };
}

/**
 * Create a MULTIPLY formula: field × multiplier
 */
export function multiply(field: string, multiplier: number): IFormula {
  return { type: 'MULTIPLY', field, multiplier };
}

/**
 * Create a MULTIPLY_ROUND formula: field × multiplier, rounded to precision
 */
export function multiplyRound(
  field: string,
  multiplier: number,
  roundTo: number,
): IFormula {
  return { type: 'MULTIPLY_ROUND', field, multiplier, roundTo };
}

/**
 * Create an EQUALS_WEIGHT formula (slots = calculated weight)
 */
export function equalsWeight(): IFormula {
  return { type: 'EQUALS_WEIGHT' };
}

/**
 * Create an EQUALS_FIELD formula: = context field
 */
export function equalsField(field: string): IFormula {
  return { type: 'EQUALS_FIELD', field };
}

/**
 * Create a MIN formula: minimum of sub-formulas
 */
export function min(...formulas: IFormula[]): IFormula {
  return { type: 'MIN', formulas };
}

/**
 * Create a MAX formula: maximum of sub-formulas
 */
export function max(...formulas: IFormula[]): IFormula {
  return { type: 'MAX', formulas };
}

/**
 * Create a PLUS formula: base formula + bonus
 * Useful for physical weapon damage: floor(tonnage/10) + 1
 */
export function plus(base: IFormula, bonus: number): IFormula {
  return { type: 'PLUS', base, bonus };
}

// ============================================================================
// VALIDATION
// ============================================================================

type FormulaValidator = (formula: IFormula) => string[];

function validateFixedFormula(formula: IFormula): string[] {
  return formula.value === undefined ? ['FIXED formula requires value'] : [];
}

function validateDivideFormula(formula: IFormula): string[] {
  const errors: string[] = [];
  if (!formula.field) {
    errors.push(`${formula.type} formula requires field`);
  }
  if (formula.divisor === undefined || formula.divisor <= 0) {
    errors.push(`${formula.type} formula requires positive divisor`);
  }
  return errors;
}

function validateMultiplyFormula(formula: IFormula): string[] {
  const errors: string[] = [];
  if (!formula.field) {
    errors.push('MULTIPLY formula requires field');
  }
  if (formula.multiplier === undefined) {
    errors.push('MULTIPLY formula requires multiplier');
  }
  return errors;
}

function validateMultiplyRoundFormula(formula: IFormula): string[] {
  const errors: string[] = [];
  if (!formula.field) {
    errors.push('MULTIPLY_ROUND formula requires field');
  }
  if (formula.multiplier === undefined) {
    errors.push('MULTIPLY_ROUND formula requires multiplier');
  }
  if (formula.roundTo === undefined || formula.roundTo <= 0) {
    errors.push('MULTIPLY_ROUND formula requires positive roundTo');
  }
  return errors;
}

function validateEqualsFieldFormula(formula: IFormula): string[] {
  return formula.field ? [] : ['EQUALS_FIELD formula requires field'];
}

function validateCombinatorFormula(formula: IFormula): string[] {
  if (!formula.formulas || formula.formulas.length === 0) {
    return [`${formula.type} formula requires at least one sub-formula`];
  }
  return formula.formulas.flatMap(validateFormula);
}

function validatePlusFormula(formula: IFormula): string[] {
  const errors = formula.base
    ? validateFormula(formula.base)
    : ['PLUS formula requires base formula'];
  if (formula.bonus === undefined) {
    errors.push('PLUS formula requires bonus value');
  }
  return errors;
}

const FORMULA_VALIDATORS: Readonly<Record<FormulaType, FormulaValidator>> = {
  FIXED: validateFixedFormula,
  CEIL_DIVIDE: validateDivideFormula,
  FLOOR_DIVIDE: validateDivideFormula,
  ROUND_DIVIDE: validateDivideFormula,
  MULTIPLY: validateMultiplyFormula,
  MULTIPLY_ROUND: validateMultiplyRoundFormula,
  EQUALS_WEIGHT: () => [],
  EQUALS_FIELD: validateEqualsFieldFormula,
  MIN: validateCombinatorFormula,
  MAX: validateCombinatorFormula,
  PLUS: validatePlusFormula,
};

/**
 * Validate a formula definition
 */
export function validateFormula(formula: IFormula): string[] {
  const validator = FORMULA_VALIDATORS[formula.type as FormulaType];
  return validator
    ? validator(formula)
    : [`Unknown formula type: ${(formula as IFormula).type}`];
}

/**
 * Validate a complete variable formulas definition
 */
export function validateVariableFormulas(
  formulas: IVariableFormulas,
): string[] {
  const errors: string[] = [];

  errors.push(...validateFormula(formulas.weight).map((e) => `weight: ${e}`));
  errors.push(
    ...validateFormula(formulas.criticalSlots).map(
      (e) => `criticalSlots: ${e}`,
    ),
  );
  errors.push(...validateFormula(formulas.cost).map((e) => `cost: ${e}`));

  // Damage formula is optional (only for physical weapons)
  if (formulas.damage) {
    errors.push(...validateFormula(formulas.damage).map((e) => `damage: ${e}`));
  }

  if (!formulas.requiredContext || !Array.isArray(formulas.requiredContext)) {
    errors.push('requiredContext must be an array');
  }

  return errors;
}
