/**
 * Formula Evaluator
 *
 * Generic formula evaluation engine for variable equipment calculations.
 * Supports arithmetic operations and MIN/MAX combinators.
 *
 * @spec openspec/specs/equipment-services/spec.md
 */

import {
  IFormula,
  type FormulaType,
} from '@/types/equipment/VariableEquipment';

import { ValidationError } from '../common/errors';

/**
 * Context for formula evaluation
 */
export type FormulaContext = Record<string, number>;

/**
 * Formula evaluator interface
 */
export interface IFormulaEvaluator {
  evaluate(formula: IFormula, context: FormulaContext): number;
  validateContext(formula: IFormula, context: FormulaContext): string[];
  getRequiredFields(formula: IFormula): string[];
}

type FormulaEvaluatorMethod = (
  formula: IFormula,
  context: FormulaContext,
) => number;

const FIELD_REQUIRED_FORMULA_TYPES = new Set<FormulaType>([
  'CEIL_DIVIDE',
  'FLOOR_DIVIDE',
  'ROUND_DIVIDE',
  'MULTIPLY',
  'MULTIPLY_ROUND',
  'EQUALS_FIELD',
]);

const SUB_FORMULA_REQUIRED_TYPES = new Set<FormulaType>(['MIN', 'MAX']);

/**
 * Formula Evaluator implementation
 */
export class FormulaEvaluator implements IFormulaEvaluator {
  private readonly formulaEvaluators: Readonly<
    Record<FormulaType, FormulaEvaluatorMethod>
  > = {
    FIXED: this.evaluateFixed.bind(this),
    CEIL_DIVIDE: this.evaluateCeilDivide.bind(this),
    FLOOR_DIVIDE: this.evaluateFloorDivide.bind(this),
    ROUND_DIVIDE: this.evaluateRoundDivide.bind(this),
    MULTIPLY: this.evaluateMultiply.bind(this),
    MULTIPLY_ROUND: this.evaluateMultiplyRound.bind(this),
    EQUALS_WEIGHT: this.evaluateEqualsWeight.bind(this),
    EQUALS_FIELD: this.evaluateEqualsField.bind(this),
    MIN: this.evaluateMin.bind(this),
    MAX: this.evaluateMax.bind(this),
    PLUS: this.evaluatePlus.bind(this),
  };

  /**
   * Evaluate a formula with the given context
   */
  evaluate(formula: IFormula, context: FormulaContext): number {
    const evaluator = this.formulaEvaluators[formula.type];
    if (!evaluator) {
      throw new ValidationError(
        `Unknown formula type: ${(formula as IFormula).type}`,
        [`Formula type '${(formula as IFormula).type}' is not supported`],
      );
    }
    return evaluator(formula, context);
  }

  /**
   * Validate that all required context fields are present
   */
  validateContext(formula: IFormula, context: FormulaContext): string[] {
    const required = this.getRequiredFields(formula);
    const missing = required.filter((field) => context[field] === undefined);
    return missing;
  }

  /**
   * Get all field names required by a formula
   */
  getRequiredFields(formula: IFormula): string[] {
    const fields: string[] = [];

    if (FIELD_REQUIRED_FORMULA_TYPES.has(formula.type) && formula.field) {
      fields.push(formula.field);
    }
    if (formula.type === 'EQUALS_WEIGHT') {
      fields.push('weight');
    }
    if (SUB_FORMULA_REQUIRED_TYPES.has(formula.type) && formula.formulas) {
      for (const subFormula of formula.formulas) {
        fields.push(...this.getRequiredFields(subFormula));
      }
    }
    if (formula.type === 'PLUS' && formula.base) {
      fields.push(...this.getRequiredFields(formula.base));
    }

    // Remove duplicates
    return Array.from(new Set(fields));
  }

  // ============================================================================
  // INDIVIDUAL FORMULA EVALUATORS
  // ============================================================================

  private evaluateFixed(formula: IFormula, _context: FormulaContext): number {
    if (formula.value === undefined) {
      throw new ValidationError('FIXED formula missing value', [
        'value is required',
      ]);
    }
    return formula.value;
  }

  private evaluateCeilDivide(
    formula: IFormula,
    context: FormulaContext,
  ): number {
    const fieldValue = this.getFieldValue(formula.field!, context);
    if (formula.divisor === undefined || formula.divisor === 0) {
      throw new ValidationError('CEIL_DIVIDE formula missing or zero divisor', [
        'divisor is required',
      ]);
    }
    return Math.ceil(fieldValue / formula.divisor);
  }

  private evaluateFloorDivide(
    formula: IFormula,
    context: FormulaContext,
  ): number {
    const fieldValue = this.getFieldValue(formula.field!, context);
    if (formula.divisor === undefined || formula.divisor === 0) {
      throw new ValidationError(
        'FLOOR_DIVIDE formula missing or zero divisor',
        ['divisor is required'],
      );
    }
    return Math.floor(fieldValue / formula.divisor);
  }

  private evaluateRoundDivide(
    formula: IFormula,
    context: FormulaContext,
  ): number {
    const fieldValue = this.getFieldValue(formula.field!, context);
    if (formula.divisor === undefined || formula.divisor === 0) {
      throw new ValidationError(
        'ROUND_DIVIDE formula missing or zero divisor',
        ['divisor is required'],
      );
    }
    return Math.round(fieldValue / formula.divisor);
  }

  private evaluateMultiply(formula: IFormula, context: FormulaContext): number {
    const fieldValue = this.getFieldValue(formula.field!, context);
    if (formula.multiplier === undefined) {
      throw new ValidationError('MULTIPLY formula missing multiplier', [
        'multiplier is required',
      ]);
    }
    return fieldValue * formula.multiplier;
  }

  private evaluateMultiplyRound(
    formula: IFormula,
    context: FormulaContext,
  ): number {
    const fieldValue = this.getFieldValue(formula.field!, context);
    if (formula.multiplier === undefined) {
      throw new ValidationError('MULTIPLY_ROUND formula missing multiplier', [
        'multiplier is required',
      ]);
    }
    if (formula.roundTo === undefined || formula.roundTo <= 0) {
      throw new ValidationError(
        'MULTIPLY_ROUND formula missing or invalid roundTo',
        ['roundTo must be positive'],
      );
    }

    const rawValue = fieldValue * formula.multiplier;
    // Round up to nearest roundTo value
    return Math.ceil(rawValue / formula.roundTo) * formula.roundTo;
  }

  private evaluateEqualsWeight(
    _formula: IFormula,
    context: FormulaContext,
  ): number {
    if (context.weight === undefined) {
      throw new ValidationError(
        'EQUALS_WEIGHT requires weight to be calculated first',
        ['weight must be in context before evaluating EQUALS_WEIGHT'],
      );
    }
    return context.weight;
  }

  private evaluateEqualsField(
    formula: IFormula,
    context: FormulaContext,
  ): number {
    return this.getFieldValue(formula.field!, context);
  }

  private evaluateMin(formula: IFormula, context: FormulaContext): number {
    if (!formula.formulas || formula.formulas.length === 0) {
      return 0; // Empty MIN returns 0
    }

    const values = formula.formulas.map((f) => this.evaluate(f, context));
    return Math.min(...values);
  }

  private evaluateMax(formula: IFormula, context: FormulaContext): number {
    if (!formula.formulas || formula.formulas.length === 0) {
      return 0; // Empty MAX returns 0
    }

    const values = formula.formulas.map((f) => this.evaluate(f, context));
    return Math.max(...values);
  }

  private evaluatePlus(formula: IFormula, context: FormulaContext): number {
    if (!formula.base) {
      throw new ValidationError('PLUS formula missing base', [
        'base formula is required',
      ]);
    }
    if (formula.bonus === undefined) {
      throw new ValidationError('PLUS formula missing bonus', [
        'bonus value is required',
      ]);
    }

    const baseValue = this.evaluate(formula.base, context);
    return baseValue + formula.bonus;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getFieldValue(field: string, context: FormulaContext): number {
    if (context[field] === undefined) {
      throw new ValidationError(`Missing required context field: ${field}`, [
        `Context must include '${field}'`,
      ]);
    }
    return context[field];
  }
}

// Singleton instance
export const formulaEvaluator = new FormulaEvaluator();
