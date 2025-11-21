/**
 * Component Calculations
 * 
 * Defines all component calculations using the expression system.
 * Each calculation can reference unit context fields and use lookup tables.
 */

import { Expression, expr, cond } from './CalculationExpression'

/**
 * Calculation specification
 */
export interface CalculationSpec {
  expression: Expression
  roundTo?: number  // Round result to nearest value (e.g., 0.5 for half-ton)
  min?: number      // Minimum value
  max?: number      // Maximum value
}

/**
 * All component calculations
 */
export const COMPONENT_CALCULATIONS: Record<string, CalculationSpec> = {
  // ===== ENGINE CALCULATIONS =====
  
  /**
   * Engine weight: (rating * tonnage / 1000) * multiplier(engineType)
   * Rounded to nearest 0.5 ton
   */
  ENGINE_WEIGHT: {
    expression: expr.multiply(
      expr.divide(
        expr.multiply(
          expr.field('engineRating'),
          expr.field('tonnage')
        ),
        expr.constant(1000)
      ),
      expr.lookup('ENGINE_WEIGHT_MULTIPLIERS', expr.field('engineType'))
    ),
    roundTo: 0.5,
    min: 0.5
  },

  /**
   * Engine slots in center torso
   */
  ENGINE_SLOTS_CT: {
    expression: expr.lookup('ENGINE_SLOTS_CT', expr.field('engineType'))
  },

  /**
   * Engine slots in left torso
   */
  ENGINE_SLOTS_LT: {
    expression: expr.lookup('ENGINE_SLOTS_LT', expr.field('engineType'))
  },

  /**
   * Engine slots in right torso
   */
  ENGINE_SLOTS_RT: {
    expression: expr.lookup('ENGINE_SLOTS_RT', expr.field('engineType'))
  },

  /**
   * Internal heat sinks provided by engine
   * Non-fusion engines (ICE, Fuel Cell) provide 0
   * Fusion engines: floor(rating / 25)
   */
  ENGINE_INTERNAL_HEATSINKS: {
    expression: expr.conditional(
      cond.or(
        cond.equals(expr.field('engineType'), expr.constant(0)), // Placeholder for string comparison
        cond.equals(expr.field('engineType'), expr.constant(1))  // Would need better string handling
      ),
      expr.constant(0),
      expr.floor(
        expr.divide(
          expr.field('engineRating'),
          expr.constant(25)
        )
      )
    ),
    min: 0
  },

  // ===== GYRO CALCULATIONS =====

  /**
   * Gyro weight: ceil(engineRating / 100) * multiplier(gyroType)
   */
  GYRO_WEIGHT: {
    expression: expr.multiply(
      expr.ceil(
        expr.divide(
          expr.field('engineRating'),
          expr.constant(100)
        )
      ),
      expr.lookup('GYRO_WEIGHT_MULTIPLIERS', expr.field('gyroType'))
    ),
    min: 0.5
  },

  /**
   * Gyro critical slots
   */
  GYRO_SLOTS: {
    expression: expr.lookup('GYRO_SLOT_REQUIREMENTS', expr.field('gyroType'))
  },

  // ===== STRUCTURE CALCULATIONS =====

  /**
   * Structure weight: (tonnage * 0.1) * multiplier(structureType)
   */
  STRUCTURE_WEIGHT: {
    expression: expr.multiply(
      expr.multiply(
        expr.field('tonnage'),
        expr.constant(0.1)
      ),
      expr.lookup('STRUCTURE_WEIGHT_MULTIPLIERS', expr.field('structureType'))
    ),
    roundTo: 0.5,
    min: 0.5
  },

  /**
   * Structure critical slots
   */
  STRUCTURE_SLOTS: {
    expression: expr.lookup('STRUCTURE_SLOT_REQUIREMENTS', expr.field('structureType'))
  },

  // ===== ARMOR CALCULATIONS =====

  /**
   * Armor weight: armorPoints / pointsPerTon(armorType)
   */
  ARMOR_WEIGHT: {
    expression: expr.divide(
      expr.field('armorPoints'),
      expr.lookup('ARMOR_POINTS_PER_TON', expr.field('armorType'))
    ),
    roundTo: 0.5
  },

  /**
   * Armor critical slots
   */
  ARMOR_SLOTS: {
    expression: expr.lookup('ARMOR_SLOT_REQUIREMENTS', expr.field('armorType'))
  },

  // ===== HEAT SINK CALCULATIONS =====

  /**
   * Heat sink weight (always 1 ton)
   */
  HEATSINK_WEIGHT: {
    expression: expr.constant(1.0)
  },

  /**
   * Heat sink critical slots
   */
  HEATSINK_SLOTS: {
    expression: expr.lookup('HEATSINK_SLOT_REQUIREMENTS', expr.field('heatSinkType'))
  },

  /**
   * Heat sink dissipation
   */
  HEATSINK_DISSIPATION: {
    expression: expr.lookup('HEATSINK_DISSIPATION', expr.field('heatSinkType'))
  },

  // ===== JUMP JET CALCULATIONS =====

  /**
   * Jump jet weight per jet (tonnage-based)
   * 20-55 tons: 0.5 ton/jet
   * 56-85 tons: 1.0 ton/jet
   * 86+ tons: 2.0 tons/jet
   */
  JUMPJET_WEIGHT_PER_JET: {
    expression: expr.conditional(
      cond.lessThanOrEqual(expr.field('tonnage'), expr.constant(55)),
      expr.constant(0.5),
      expr.conditional(
        cond.lessThanOrEqual(expr.field('tonnage'), expr.constant(85)),
        expr.constant(1.0),
        expr.constant(2.0)
      )
    )
  },

  /**
   * Jump jet critical slots (always 1 per jet)
   */
  JUMPJET_SLOTS: {
    expression: expr.constant(1)
  },

  // ===== MOVEMENT CALCULATIONS =====

  /**
   * Walk MP: engineRating / tonnage
   */
  WALK_MP: {
    expression: expr.floor(
      expr.divide(
        expr.field('engineRating'),
        expr.field('tonnage')
      )
    ),
    min: 0
  },

  /**
   * Run MP: walkMP * 1.5 (rounded down)
   */
  RUN_MP: {
    expression: expr.floor(
      expr.multiply(
        expr.field('walkMP'),
        expr.constant(1.5)
      )
    ),
    min: 0
  },

  /**
   * Total jump jet weight: weight per jet * jump MP
   */
  TOTAL_JUMPJET_WEIGHT: {
    expression: expr.multiply(
      expr.conditional(
        cond.lessThanOrEqual(expr.field('tonnage'), expr.constant(55)),
        expr.constant(0.5),
        expr.conditional(
          cond.lessThanOrEqual(expr.field('tonnage'), expr.constant(85)),
          expr.constant(1.0),
          expr.constant(2.0)
        )
      ),
      expr.field('jumpMP')
    ),
    roundTo: 0.5
  }
}

/**
 * Helper to get a calculation by name
 */
export function getCalculation(name: string): CalculationSpec | undefined {
  return COMPONENT_CALCULATIONS[name]
}

/**
 * Helper to check if a calculation exists
 */
export function hasCalculation(name: string): boolean {
  return name in COMPONENT_CALCULATIONS
}






