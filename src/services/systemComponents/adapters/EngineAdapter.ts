/**
 * Engine Adapter
 * 
 * Handles engine-specific calculations and queries.
 * Engines have complex slot distributions and dynamic weight based on rating and tonnage.
 */

import { BaseAdapter } from './BaseAdapter'
import { UnitContext, EngineType } from '../calculations/UnitContext'
import { TechBase } from '../../../types/core/TechBase'
import { SlotLayout } from '../calculations/types'

/**
 * Engine variant with calculated properties
 */
export interface EngineVariant {
  id: string
  name: string
  type: EngineType
  techBase: TechBase
  rulesLevel: string
  introductionYear: number
  description?: string
  // Calculated properties
  rating: number
  weight: number
  slots: SlotLayout
  internalHeatSinks: number
  walkMP: number
  runMP: number
}

/**
 * Engine definition (static properties)
 */
export interface EngineDefinition {
  id: string
  name: string
  type: EngineType
  techBase: TechBase
  rulesLevel: string
  introductionYear: number
  description?: string
}

/**
 * Engine database (static definitions)
 */
const ENGINE_DATABASE: EngineDefinition[] = [
  {
    id: 'standard_fusion',
    name: 'Standard Fusion Engine',
    type: 'Standard',
    techBase: 'Inner Sphere',
    rulesLevel: 'Introductory',
    introductionYear: 2439,
    description: 'Standard fusion engine with 6 center torso slots'
  },
  {
    id: 'xl_fusion_is',
    name: 'XL Fusion Engine (IS)',
    type: 'XL (IS)',
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    introductionYear: 2579,
    description: 'Extra-light engine saves weight but requires side torso slots'
  },
  {
    id: 'xl_fusion_clan',
    name: 'XL Fusion Engine (Clan)',
    type: 'XL (Clan)',
    techBase: 'Clan',
    rulesLevel: 'Standard',
    introductionYear: 2824,
    description: 'Clan XL engine with fewer side torso slots than IS version'
  },
  {
    id: 'light_fusion',
    name: 'Light Fusion Engine',
    type: 'Light',
    techBase: 'Inner Sphere',
    rulesLevel: 'Advanced',
    introductionYear: 3055,
    description: 'Lighter than standard but heavier than XL'
  },
  {
    id: 'xxl_fusion',
    name: 'XXL Fusion Engine',
    type: 'XXL',
    techBase: 'Inner Sphere',
    rulesLevel: 'Experimental',
    introductionYear: 3130,
    description: 'Ultra-light engine requiring massive slot allocation'
  },
  {
    id: 'compact_fusion',
    name: 'Compact Fusion Engine',
    type: 'Compact',
    techBase: 'Inner Sphere',
    rulesLevel: 'Advanced',
    introductionYear: 3068,
    description: 'Heavier but requires fewer slots'
  },
  {
    id: 'ice_engine',
    name: 'ICE Engine',
    type: 'ICE',
    techBase: 'Inner Sphere',
    rulesLevel: 'Introductory',
    introductionYear: 1950,
    description: 'Internal combustion engine for industrial mechs'
  },
  {
    id: 'fuel_cell_engine',
    name: 'Fuel Cell Engine',
    type: 'Fuel Cell',
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    introductionYear: 3050,
    description: 'Fuel-based engine with no heat sinks'
  }
]

export class EngineAdapter extends BaseAdapter {
  /**
   * Get all engines compatible with the given context
   */
  getCompatibleEngines(context: UnitContext): EngineVariant[] {
    return ENGINE_DATABASE
      .filter(engine => this.isCompatible(engine, context))
      .map(engine => this.enrichWithCalculations(engine, context))
  }

  /**
   * Get engines by tech base
   */
  getEnginesByTechBase(techBase: TechBase, context: UnitContext): EngineVariant[] {
    return ENGINE_DATABASE
      .filter(engine => engine.techBase === techBase)
      .map(engine => this.enrichWithCalculations(engine, context))
  }

  /**
   * Get a specific engine by ID
   */
  getEngineById(id: string, context: UnitContext): EngineVariant | null {
    const definition = ENGINE_DATABASE.find(e => e.id === id)
    if (!definition) return null
    return this.enrichWithCalculations(definition, context)
  }

  /**
   * Check if an engine is compatible with the unit context
   */
  private isCompatible(engine: EngineDefinition, context: UnitContext): boolean {
    // Tech base must match
    if (engine.techBase !== context.techBase && engine.techBase !== 'Inner Sphere') {
      return false
    }

    // Year restrictions
    if (engine.introductionYear > context.constructionYear) {
      return false
    }

    return true
  }

  /**
   * Enrich engine definition with calculated properties
   */
  private enrichWithCalculations(
    engine: EngineDefinition,
    context: UnitContext
  ): EngineVariant {
    // Update context with this engine's type
    const engineContext = {
      ...context,
      engineType: engine.type
    }

    const weight = this.calculateWeight(engine.id, engineContext)
    const slots = this.calculateSlots(engine.id, engineContext) as SlotLayout
    const derived = this.calculateDerived(engine.id, engineContext)

    return {
      ...engine,
      rating: context.engineRating,
      weight,
      slots,
      internalHeatSinks: derived.internalHeatSinks || 0,
      walkMP: derived.walkMP || Math.floor(context.engineRating / context.tonnage),
      runMP: derived.runMP || Math.floor(derived.walkMP * 1.5)
    }
  }

  /**
   * Calculate valid engine ratings for a given tonnage and desired walk MP
   */
  calculateValidRatings(tonnage: number, walkMP: number): number[] {
    const rating = tonnage * walkMP
    return [rating]
  }

  /**
   * Get engine slot distribution
   */
  getSlotDistribution(engineType: EngineType): SlotLayout {
    const engineDef = ENGINE_DATABASE.find(e => e.type === engineType)
    if (!engineDef) {
      throw new Error(`Unknown engine type: ${engineType}`)
    }

    // Use default context just to get slot layout
    const defaultContext: UnitContext = {
      tonnage: 50,
      engineRating: 200,
      engineType,
      techBase: 'Inner Sphere',
      unitType: 'BattleMech',
      rulesLevel: 'Standard',
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
      gyroType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      armorPoints: 0,
      heatSinkType: 'Single',
      heatSinkCount: 10,
      constructionYear: 3025,
      custom: {}
    }

    return this.calculateSlots(engineDef.id, defaultContext) as SlotLayout
  }
}






