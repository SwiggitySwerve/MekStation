/**
 * Calculation Expression System
 * 
 * Type-safe DSL for defining contextual calculations that reference
 * unit properties at runtime.
 */

import { UnitContext } from './UnitContext'

/**
 * Base expression types
 */
export type Expression = 
  | ConstantExpression
  | FieldReferenceExpression
  | ArithmeticExpression
  | ConditionalExpression
  | LookupExpression
  | MathExpression

/**
 * Constant value expression
 */
export interface ConstantExpression {
  type: 'constant'
  value: number
}

/**
 * Field reference expression - references a field in UnitContext
 */
export interface FieldReferenceExpression {
  type: 'field'
  field: keyof UnitContext
}

/**
 * Arithmetic operation expression
 */
export interface ArithmeticExpression {
  type: 'arithmetic'
  operator: 'add' | 'subtract' | 'multiply' | 'divide' | 'modulo'
  left: Expression
  right: Expression
}

/**
 * Conditional expression (if/then/else)
 */
export interface ConditionalExpression {
  type: 'conditional'
  condition: Condition
  ifTrue: Expression
  ifFalse: Expression
}

/**
 * Lookup expression - looks up a value in a table
 */
export interface LookupExpression {
  type: 'lookup'
  table: string  // References a registered lookup table
  key: Expression
}

/**
 * Math function expression
 */
export interface MathExpression {
  type: 'math'
  function: MathFunction
  argument: Expression
}

/**
 * Math functions
 */
export type MathFunction = 'ceil' | 'floor' | 'round' | 'abs' | 'min' | 'max'

/**
 * Condition types for conditional expressions
 */
export type Condition =
  | EqualsCondition
  | GreaterThanCondition
  | LessThanCondition
  | GreaterThanOrEqualCondition
  | LessThanOrEqualCondition
  | InCondition
  | AndCondition
  | OrCondition
  | NotCondition

export interface EqualsCondition {
  type: 'equals'
  left: Expression
  right: Expression
}

export interface GreaterThanCondition {
  type: 'greaterThan'
  left: Expression
  right: Expression
}

export interface LessThanCondition {
  type: 'lessThan'
  left: Expression
  right: Expression
}

export interface GreaterThanOrEqualCondition {
  type: 'greaterThanOrEqual'
  left: Expression
  right: Expression
}

export interface LessThanOrEqualCondition {
  type: 'lessThanOrEqual'
  left: Expression
  right: Expression
}

export interface InCondition {
  type: 'in'
  value: Expression
  set: (string | number)[]
}

export interface AndCondition {
  type: 'and'
  conditions: Condition[]
}

export interface OrCondition {
  type: 'or'
  conditions: Condition[]
}

export interface NotCondition {
  type: 'not'
  condition: Condition
}

/**
 * Helper functions to create expressions
 */
export const expr = {
  constant: (value: number): ConstantExpression => ({
    type: 'constant',
    value
  }),

  field: (field: keyof UnitContext): FieldReferenceExpression => ({
    type: 'field',
    field
  }),

  add: (left: Expression, right: Expression): ArithmeticExpression => ({
    type: 'arithmetic',
    operator: 'add',
    left,
    right
  }),

  subtract: (left: Expression, right: Expression): ArithmeticExpression => ({
    type: 'arithmetic',
    operator: 'subtract',
    left,
    right
  }),

  multiply: (left: Expression, right: Expression): ArithmeticExpression => ({
    type: 'arithmetic',
    operator: 'multiply',
    left,
    right
  }),

  divide: (left: Expression, right: Expression): ArithmeticExpression => ({
    type: 'arithmetic',
    operator: 'divide',
    left,
    right
  }),

  modulo: (left: Expression, right: Expression): ArithmeticExpression => ({
    type: 'arithmetic',
    operator: 'modulo',
    left,
    right
  }),

  conditional: (condition: Condition, ifTrue: Expression, ifFalse: Expression): ConditionalExpression => ({
    type: 'conditional',
    condition,
    ifTrue,
    ifFalse
  }),

  lookup: (table: string, key: Expression): LookupExpression => ({
    type: 'lookup',
    table,
    key
  }),

  ceil: (argument: Expression): MathExpression => ({
    type: 'math',
    function: 'ceil',
    argument
  }),

  floor: (argument: Expression): MathExpression => ({
    type: 'math',
    function: 'floor',
    argument
  }),

  round: (argument: Expression): MathExpression => ({
    type: 'math',
    function: 'round',
    argument
  }),

  abs: (argument: Expression): MathExpression => ({
    type: 'math',
    function: 'abs',
    argument
  })
}

/**
 * Helper functions to create conditions
 */
export const cond = {
  equals: (left: Expression, right: Expression): EqualsCondition => ({
    type: 'equals',
    left,
    right
  }),

  greaterThan: (left: Expression, right: Expression): GreaterThanCondition => ({
    type: 'greaterThan',
    left,
    right
  }),

  lessThan: (left: Expression, right: Expression): LessThanCondition => ({
    type: 'lessThan',
    left,
    right
  }),

  greaterThanOrEqual: (left: Expression, right: Expression): GreaterThanOrEqualCondition => ({
    type: 'greaterThanOrEqual',
    left,
    right
  }),

  lessThanOrEqual: (left: Expression, right: Expression): LessThanOrEqualCondition => ({
    type: 'lessThanOrEqual',
    left,
    right
  }),

  in: (value: Expression, set: (string | number)[]): InCondition => ({
    type: 'in',
    value,
    set
  }),

  and: (...conditions: Condition[]): AndCondition => ({
    type: 'and',
    conditions
  }),

  or: (...conditions: Condition[]): OrCondition => ({
    type: 'or',
    conditions
  }),

  not: (condition: Condition): NotCondition => ({
    type: 'not',
    condition
  })
}






