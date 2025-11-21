/**
 * Calculation Engine
 * 
 * Evaluates expressions against a UnitContext to produce calculated values.
 * Supports arithmetic, conditionals, lookups, and math functions.
 */

import {
  Expression,
  Condition,
  ArithmeticExpression,
  ConditionalExpression,
  LookupExpression,
  MathExpression
} from './CalculationExpression'
import { UnitContext } from './UnitContext'

export class CalculationEngine {
  private lookupTables: Map<string, Record<string, number>>

  constructor() {
    this.lookupTables = new Map()
  }

  /**
   * Register a lookup table for use in expressions
   */
  registerTable(name: string, table: Record<string, number>): void {
    this.lookupTables.set(name, table)
  }

  /**
   * Get a registered lookup table
   */
  getTable(name: string): Record<string, number> | undefined {
    return this.lookupTables.get(name)
  }

  /**
   * Evaluate an expression against a unit context
   */
  evaluate(expression: Expression, context: UnitContext): number {
    switch (expression.type) {
      case 'constant':
        return expression.value

      case 'field':
        return this.getFieldValue(expression.field, context)

      case 'arithmetic':
        return this.evaluateArithmetic(expression, context)

      case 'conditional':
        return this.evaluateConditional(expression, context)

      case 'lookup':
        return this.evaluateLookup(expression, context)

      case 'math':
        return this.evaluateMath(expression, context)

      default:
        throw new Error(`Unknown expression type: ${(expression as any).type}`)
    }
  }

  /**
   * Evaluate an arithmetic expression
   */
  private evaluateArithmetic(expr: ArithmeticExpression, ctx: UnitContext): number {
    const left = this.evaluate(expr.left, ctx)
    const right = this.evaluate(expr.right, ctx)

    switch (expr.operator) {
      case 'add':
        return left + right
      case 'subtract':
        return left - right
      case 'multiply':
        return left * right
      case 'divide':
        if (right === 0) {
          throw new Error('Division by zero')
        }
        return left / right
      case 'modulo':
        return left % right
      default:
        throw new Error(`Unknown operator: ${expr.operator}`)
    }
  }

  /**
   * Evaluate a conditional expression
   */
  private evaluateConditional(expr: ConditionalExpression, ctx: UnitContext): number {
    const conditionMet = this.evaluateCondition(expr.condition, ctx)
    return this.evaluate(conditionMet ? expr.ifTrue : expr.ifFalse, ctx)
  }

  /**
   * Evaluate a condition
   */
  evaluateCondition(condition: Condition, ctx: UnitContext): boolean {
    switch (condition.type) {
      case 'equals': {
        const left = this.evaluate(condition.left, ctx)
        const right = this.evaluate(condition.right, ctx)
        return left === right
      }

      case 'greaterThan': {
        const left = this.evaluate(condition.left, ctx)
        const right = this.evaluate(condition.right, ctx)
        return left > right
      }

      case 'lessThan': {
        const left = this.evaluate(condition.left, ctx)
        const right = this.evaluate(condition.right, ctx)
        return left < right
      }

      case 'greaterThanOrEqual': {
        const left = this.evaluate(condition.left, ctx)
        const right = this.evaluate(condition.right, ctx)
        return left >= right
      }

      case 'lessThanOrEqual': {
        const left = this.evaluate(condition.left, ctx)
        const right = this.evaluate(condition.right, ctx)
        return left <= right
      }

      case 'in': {
        const value = this.evaluate(condition.value, ctx)
        return condition.set.includes(value)
      }

      case 'and':
        return condition.conditions.every(c => this.evaluateCondition(c, ctx))

      case 'or':
        return condition.conditions.some(c => this.evaluateCondition(c, ctx))

      case 'not':
        return !this.evaluateCondition(condition.condition, ctx)

      default:
        throw new Error(`Unknown condition type: ${(condition as any).type}`)
    }
  }

  /**
   * Evaluate a lookup expression
   */
  private evaluateLookup(expr: LookupExpression, ctx: UnitContext): number {
    const table = this.lookupTables.get(expr.table)
    if (!table) {
      throw new Error(`Lookup table not found: ${expr.table}`)
    }

    // For field references, use the raw string value, not the evaluated number
    let keyStr: string
    if (expr.key.type === 'field') {
      const fieldValue = ctx[expr.key.field]
      keyStr = String(fieldValue)
    } else {
      const key = this.evaluate(expr.key, ctx)
      keyStr = String(key)
    }

    const value = table[keyStr]

    if (value === undefined) {
      throw new Error(`Key "${keyStr}" not found in table "${expr.table}"`)
    }

    return value
  }

  /**
   * Evaluate a math expression
   */
  private evaluateMath(expr: MathExpression, ctx: UnitContext): number {
    const value = this.evaluate(expr.argument, ctx)

    switch (expr.function) {
      case 'ceil':
        return Math.ceil(value)
      case 'floor':
        return Math.floor(value)
      case 'round':
        return Math.round(value)
      case 'abs':
        return Math.abs(value)
      case 'min':
        return Math.min(value)
      case 'max':
        return Math.max(value)
      default:
        throw new Error(`Unknown math function: ${expr.function}`)
    }
  }

  /**
   * Get the value of a field from the unit context
   */
  private getFieldValue(field: keyof UnitContext, context: UnitContext): number {
    const value = context[field]

    // Handle numeric fields
    if (typeof value === 'number') {
      return value
    }

    // Handle string fields that might be used in lookups
    if (typeof value === 'string') {
      // Convert string to a numeric hash for lookup purposes
      // This allows using string fields as lookup keys
      return this.stringToNumeric(value)
    }

    throw new Error(`Field "${String(field)}" is not numeric and cannot be used in calculations`)
  }

  /**
   * Convert a string to a numeric value for lookup purposes
   * (Used when string fields are referenced in expressions)
   */
  private stringToNumeric(str: string): number {
    // Simple hash function for strings
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }
}






