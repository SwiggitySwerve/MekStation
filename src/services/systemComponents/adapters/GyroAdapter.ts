/**
 * Gyro Adapter
 * 
 * Handles gyro-specific calculations and queries.
 * Gyro weight is based on engine rating, and slots are fixed per type.
 */

import { BaseAdapter } from './BaseAdapter'
import { UnitContext, GyroType } from '../calculations/UnitContext'
import { TechBase } from '../../../types/core/TechBase'

/**
 * Gyro variant with calculated properties
 */
export interface GyroVariant {
  id: string
  name: string
  type: GyroType
  techBase: TechBase
  rulesLevel: string
  introductionYear: number
  description?: string
  // Calculated properties
  weight: number
  slots: number
  special?: string[]
}

/**
 * Gyro definition (static properties)
 */
export interface GyroDefinition {
  id: string
  name: string
  type: GyroType
  techBase: TechBase
  rulesLevel: string
  introductionYear: number
  description?: string
  special?: string[]
}

/**
 * Gyro database (static definitions)
 */
const GYRO_DATABASE: GyroDefinition[] = [
  {
    id: 'standard_gyro',
    name: 'Standard Gyro',
    type: 'Standard',
    techBase: 'Inner Sphere',
    rulesLevel: 'Introductory',
    introductionYear: 2439,
    description: 'Standard gyro with 4 critical slots'
  },
  {
    id: 'compact_gyro',
    name: 'Compact Gyro',
    type: 'Compact',
    techBase: 'Inner Sphere',
    rulesLevel: 'Advanced',
    introductionYear: 3067,
    description: 'Compact gyro uses only 2 slots but is heavier',
    special: ['Reduced slots', 'Increased weight']
  },
  {
    id: 'xl_gyro',
    name: 'XL Gyro',
    type: 'XL',
    techBase: 'Inner Sphere',
    rulesLevel: 'Advanced',
    introductionYear: 3067,
    description: 'Extra-light gyro saves weight but uses 6 slots',
    special: ['Lightweight', 'More slots']
  },
  {
    id: 'heavy_duty_gyro',
    name: 'Heavy-Duty Gyro',
    type: 'Heavy-Duty',
    techBase: 'Inner Sphere',
    rulesLevel: 'Advanced',
    introductionYear: 3067,
    description: 'Heavy-duty gyro is more resistant to damage',
    special: ['Extra durability', 'Increased weight']
  }
]

export class GyroAdapter extends BaseAdapter {
  /**
   * Get all gyros compatible with the given context
   */
  getCompatibleGyros(context: UnitContext): GyroVariant[] {
    return GYRO_DATABASE
      .filter(gyro => this.isCompatible(gyro, context))
      .map(gyro => this.enrichWithCalculations(gyro, context))
  }

  /**
   * Get gyros by tech base
   */
  getGyrosByTechBase(techBase: TechBase, context: UnitContext): GyroVariant[] {
    return GYRO_DATABASE
      .filter(gyro => gyro.techBase === techBase || gyro.techBase === 'Inner Sphere')
      .map(gyro => this.enrichWithCalculations(gyro, context))
  }

  /**
   * Get a specific gyro by ID
   */
  getGyroById(id: string, context: UnitContext): GyroVariant | null {
    const definition = GYRO_DATABASE.find(g => g.id === id)
    if (!definition) return null
    return this.enrichWithCalculations(definition, context)
  }

  /**
   * Check if a gyro is compatible with the unit context
   */
  private isCompatible(gyro: GyroDefinition, context: UnitContext): boolean {
    // Year restrictions
    if (gyro.introductionYear > context.constructionYear) {
      return false
    }

    return true
  }

  /**
   * Enrich gyro definition with calculated properties
   */
  private enrichWithCalculations(
    gyro: GyroDefinition,
    context: UnitContext
  ): GyroVariant {
    // Update context with this gyro's type
    const gyroContext = {
      ...context,
      gyroType: gyro.type
    }

    const weight = this.calculateWeight(gyro.id, gyroContext)
    const slots = this.calculateSlots(gyro.id, gyroContext) as number

    return {
      ...gyro,
      weight,
      slots,
      special: gyro.special
    }
  }

  /**
   * Check if gyro type is compatible with engine type
   * (Some combinations may have restrictions)
   */
  isCompatibleWithEngine(gyroType: GyroType, engineType: string): boolean {
    // Most gyros are compatible with all engines
    // Add specific restrictions here if needed
    return true
  }
}






