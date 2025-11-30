/**
 * Formula Evaluator
 * 
 * Generic formula evaluation engine for variable equipment calculations.
 * Supports arithmetic operations and MIN/MAX combinators.
 * 
 * @spec openspec/specs/equipment-services/spec.md
 */

import { IFormula } from '@/types/equipment/VariableEquipment';
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

/**
 * Formula Evaluator implementation
 */
export class FormulaEvaluator implements IFormulaEvaluator {
  
  /**
   * Evaluate a formula with the given context
   */
  evaluate(formula: IFormula, context: FormulaContext): number {
    switch (formula.type) {
      case 'FIXED':
        return this.evaluateFixed(formula);

      case 'CEIL_DIVIDE':
        return this.evaluateCeilDivide(formula, context);

      case 'FLOOR_DIVIDE':
        return this.evaluateFloorDivide(formula, context);

      case 'MULTIPLY':
        return this.evaluateMultiply(formula, context);

      case 'MULTIPLY_ROUND':
        return this.evaluateMultiplyRound(formula, context);

      case 'EQUALS_WEIGHT':
        return this.evaluateEqualsWeight(context);

      case 'EQUALS_FIELD':
        return this.evaluateEqualsField(formula, context);

      case 'MIN':
        return this.evaluateMin(formula, context);

      case 'MAX':
        return this.evaluateMax(formula, context);

      default:
        throw new ValidationError(
          `Unknown formula type: ${(formula as IFormula).type}`,
          [`Formula type '${(formula as IFormula).type}' is not supported`]
        );
    }
  }

  /**
   * Validate that all required context fields are present
   */
  validateContext(formula: IFormula, context: FormulaContext): string[] {
    const required = this.getRequiredFields(formula);
    const missing = required.filter(field => context[field] === undefined);
    return missing;
  }

  /**
   * Get all field names required by a formula
   */
  getRequiredFields(formula: IFormula): string[] {
    const fields: string[] = [];

    switch (formula.type) {
      case 'FIXED':
        // No fields required
        break;

      case 'CEIL_DIVIDE':
      case 'FLOOR_DIVIDE':
      case 'MULTIPLY':
      case 'MULTIPLY_ROUND':
      case 'EQUALS_FIELD':
        if (formula.field) {
          fields.push(formula.field);
        }
        break;

      case 'EQUALS_WEIGHT':
        fields.push('weight');
        break;

      case 'MIN':
      case 'MAX':
        if (formula.formulas) {
          for (const subFormula of formula.formulas) {
            fields.push(...this.getRequiredFields(subFormula));
          }
        }
        break;
    }

    // Remove duplicates
    return Array.from(new Set(fields));
  }

  // ============================================================================
  // INDIVIDUAL FORMULA EVALUATORS
  // ============================================================================

  private evaluateFixed(formula: IFormula): number {
    if (formula.value === undefined) {
      throw new ValidationError('FIXED formula missing value', ['value is required']);
    }
    return formula.value;
  }

  private evaluateCeilDivide(formula: IFormula, context: FormulaContext): number {
    const fieldValue = this.getFieldValue(formula.field!, context);
    if (formula.divisor === undefined || formula.divisor === 0) {
      throw new ValidationError('CEIL_DIVIDE formula missing or zero divisor', ['divisor is required']);
    }
    return Math.ceil(fieldValue / formula.divisor);
  }

  private evaluateFloorDivide(formula: IFormula, context: FormulaContext): number {
    const fieldValue = this.getFieldValue(formula.field!, context);
    if (formula.divisor === undefined || formula.divisor === 0) {
      throw new ValidationError('FLOOR_DIVIDE formula missing or zero divisor', ['divisor is required']);
    }
    return Math.floor(fieldValue / formula.divisor);
  }

  private evaluateMultiply(formula: IFormula, context: FormulaContext): number {
    const fieldValue = this.getFieldValue(formula.field!, context);
    if (formula.multiplier === undefined) {
      throw new ValidationError('MULTIPLY formula missing multiplier', ['multiplier is required']);
    }
    return fieldValue * formula.multiplier;
  }

  private evaluateMultiplyRound(formula: IFormula, context: FormulaContext): number {
    const fieldValue = this.getFieldValue(formula.field!, context);
    if (formula.multiplier === undefined) {
      throw new ValidationError('MULTIPLY_ROUND formula missing multiplier', ['multiplier is required']);
    }
    if (formula.roundTo === undefined || formula.roundTo <= 0) {
      throw new ValidationError('MULTIPLY_ROUND formula missing or invalid roundTo', ['roundTo must be positive']);
    }
    
    const rawValue = fieldValue * formula.multiplier;
    // Round up to nearest roundTo value
    return Math.ceil(rawValue / formula.roundTo) * formula.roundTo;
  }

  private evaluateEqualsWeight(context: FormulaContext): number {
    if (context.weight === undefined) {
      throw new ValidationError(
        'EQUALS_WEIGHT requires weight to be calculated first',
        ['weight must be in context before evaluating EQUALS_WEIGHT']
      );
    }
    return context.weight;
  }

  private evaluateEqualsField(formula: IFormula, context: FormulaContext): number {
    return this.getFieldValue(formula.field!, context);
  }

  private evaluateMin(formula: IFormula, context: FormulaContext): number {
    if (!formula.formulas || formula.formulas.length === 0) {
      return 0; // Empty MIN returns 0
    }
    
    const values = formula.formulas.map(f => this.evaluate(f, context));
    return Math.min(...values);
  }

  private evaluateMax(formula: IFormula, context: FormulaContext): number {
    if (!formula.formulas || formula.formulas.length === 0) {
      return 0; // Empty MAX returns 0
    }
    
    const values = formula.formulas.map(f => this.evaluate(f, context));
    return Math.max(...values);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getFieldValue(field: string, context: FormulaContext): number {
    if (context[field] === undefined) {
      throw new ValidationError(
        `Missing required context field: ${field}`,
        [`Context must include '${field}'`]
      );
    }
    return context[field];
  }
}

// Singleton instance
export const formulaEvaluator = new FormulaEvaluator();

