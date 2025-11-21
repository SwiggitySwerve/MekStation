/**
 * Calculation System Types
 * 
 * Exports all types used in the calculation system
 */

// Re-export from individual modules
export type {
  UnitContext,
  UnitType,
  RulesLevel,
  EngineType,
  GyroType,
  StructureType,
  ArmorType,
  HeatSinkType
} from './UnitContext'

export { createDefaultUnitContext, validateUnitContext } from './UnitContext'

export type {
  Expression,
  ConstantExpression,
  FieldReferenceExpression,
  ArithmeticExpression,
  ConditionalExpression,
  LookupExpression,
  MathExpression,
  Condition,
  MathFunction
} from './CalculationExpression'

export { expr, cond } from './CalculationExpression'

export type { CalculationSpec } from './ComponentCalculations'
export { COMPONENT_CALCULATIONS, getCalculation, hasCalculation } from './ComponentCalculations'

export type { ComponentCalculationSpec } from './CalculationRegistry'
export {
  CALCULATION_REGISTRY,
  getComponentCalculationSpec,
  hasComponentCalculationSpec,
  getAllRegisteredComponentIds
} from './CalculationRegistry'

export { CalculationEngine } from './CalculationEngine'
export { registerAllLookupTables } from './LookupTables'

/**
 * Calculation result with metadata
 */
export interface CalculationResult {
  value: number
  rounded?: number
  min?: number
  max?: number
  calculationName: string
}

/**
 * Slot layout by location
 */
export interface SlotLayout {
  'Center Torso'?: number
  'Left Torso'?: number
  'Right Torso'?: number
  'Left Arm'?: number
  'Right Arm'?: number
  'Left Leg'?: number
  'Right Leg'?: number
  'Head'?: number
  total?: number
}

/**
 * Component with calculated properties
 */
export interface CalculatedComponent {
  id: string
  name: string
  weight: number
  slots: SlotLayout | number
  derived?: Record<string, number>
}






