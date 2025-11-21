/**
 * Base Adapter
 * 
 * Provides common functionality for all component adapters.
 * Handles calculation evaluation, rounding, and common operations.
 */

import { CalculationEngine } from '../calculations/CalculationEngine'
import { UnitContext } from '../calculations/UnitContext'
import {
  COMPONENT_CALCULATIONS,
  CalculationSpec,
  getCalculation
} from '../calculations/ComponentCalculations'
import {
  ComponentCalculationSpec,
  getComponentCalculationSpec
} from '../calculations/CalculationRegistry'
import { SlotLayout } from '../calculations/types'

export abstract class BaseAdapter {
  constructor(protected calculationEngine: CalculationEngine) {}

  /**
   * Calculate weight for a component
   */
  protected calculateWeight(componentId: string, context: UnitContext): number {
    const spec = getComponentCalculationSpec(componentId)
    if (!spec || !spec.weight) {
      throw new Error(`No weight calculation found for component: ${componentId}`)
    }

    const calcSpec = getCalculation(spec.weight)
    if (!calcSpec) {
      throw new Error(`Calculation not found: ${spec.weight}`)
    }

    let result = this.calculationEngine.evaluate(calcSpec.expression, context)

    // Apply rounding if specified
    if (calcSpec.roundTo) {
      result = Math.ceil(result / calcSpec.roundTo) * calcSpec.roundTo
    }

    // Apply minimum value if specified
    if (calcSpec.min !== undefined && result < calcSpec.min) {
      result = calcSpec.min
    }

    // Apply maximum value if specified
    if (calcSpec.max !== undefined && result > calcSpec.max) {
      result = calcSpec.max
    }

    return result
  }

  /**
   * Calculate slots for a component
   */
  protected calculateSlots(componentId: string, context: UnitContext): SlotLayout | number {
    const spec = getComponentCalculationSpec(componentId)
    if (!spec || !spec.slots) {
      throw new Error(`No slot calculation found for component: ${componentId}`)
    }

    // Handle single slot value
    if (typeof spec.slots === 'string') {
      const calcSpec = getCalculation(spec.slots)
      if (!calcSpec) {
        throw new Error(`Calculation not found: ${spec.slots}`)
      }
      return Math.floor(this.calculationEngine.evaluate(calcSpec.expression, context))
    }

    // Handle per-location slots
    const layout: SlotLayout = {}
    for (const [location, calculationName] of Object.entries(spec.slots)) {
      const calcSpec = getCalculation(calculationName)
      if (!calcSpec) {
        throw new Error(`Calculation not found: ${calculationName}`)
      }
      layout[location as keyof SlotLayout] = Math.floor(
        this.calculationEngine.evaluate(calcSpec.expression, context)
      )
    }

    return layout
  }

  /**
   * Calculate derived properties for a component
   */
  protected calculateDerived(
    componentId: string,
    context: UnitContext
  ): Record<string, number> {
    const spec = getComponentCalculationSpec(componentId)
    if (!spec || !spec.derived) {
      return {}
    }

    const derived: Record<string, number> = {}
    for (const [propertyName, calculationName] of Object.entries(spec.derived)) {
      const calcSpec = getCalculation(calculationName)
      if (calcSpec) {
        derived[propertyName] = this.calculationEngine.evaluate(
          calcSpec.expression,
          context
        )
      }
    }

    return derived
  }

  /**
   * Check if a component ID has calculations registered
   */
  protected hasCalculations(componentId: string): boolean {
    return getComponentCalculationSpec(componentId) !== undefined
  }

  /**
   * Get all calculations for a component
   */
  protected getComponentSpec(componentId: string): ComponentCalculationSpec | undefined {
    return getComponentCalculationSpec(componentId)
  }
}






