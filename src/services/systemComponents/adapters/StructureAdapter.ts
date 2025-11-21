/**
 * Structure Adapter
 * 
 * Handles internal structure calculations and queries.
 * Structure weight is based on unit tonnage, with slots for advanced types.
 */

import { BaseAdapter } from './BaseAdapter'
import { UnitContext, StructureType } from '../calculations/UnitContext'
import { TechBase } from '../../../types/core/TechBase'

/**
 * Structure variant with calculated properties
 */
export interface StructureVariant {
  id: string
  name: string
  type: StructureType
  techBase: TechBase
  rulesLevel: string
  introductionYear: number
  description?: string
  // Calculated properties
  weight: number
  slots: number
  pointMultiplier: number
  special?: string[]
}

/**
 * Structure definition (static properties)
 */
export interface StructureDefinition {
  id: string
  name: string
  type: StructureType
  techBase: TechBase
  rulesLevel: string
  introductionYear: number
  description?: string
  pointMultiplier: number
  special?: string[]
}

/**
 * Structure database (static definitions)
 */
const STRUCTURE_DATABASE: StructureDefinition[] = [
  {
    id: 'standard_structure',
    name: 'Standard Structure',
    type: 'Standard',
    techBase: 'Inner Sphere',
    rulesLevel: 'Introductory',
    introductionYear: 2439,
    description: 'Standard internal structure',
    pointMultiplier: 1.0
  },
  {
    id: 'endo_steel_is',
    name: 'Endo Steel (IS)',
    type: 'Endo Steel', // Matches 'Endo Steel' in Rules
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    introductionYear: 2487,
    description: 'Endo Steel structure saves 50% weight but requires 14 critical slots',
    pointMultiplier: 1.0,
    special: ['50% weight savings', '14 critical slots']
  },
  {
    id: 'endo_steel_clan',
    name: 'Endo Steel (Clan)',
    type: 'Endo Steel (Clan)', // Matches 'Endo Steel (Clan)' in Rules
    techBase: 'Clan',
    rulesLevel: 'Standard',
    introductionYear: 2824,
    description: 'Clan Endo Steel saves 50% weight with only 7 critical slots',
    pointMultiplier: 1.0,
    special: ['50% weight savings', '7 critical slots']
  },
  {
    id: 'composite_structure',
    name: 'Composite Structure',
    type: 'Composite',
    techBase: 'Inner Sphere',
    rulesLevel: 'Experimental',
    introductionYear: 3075,
    description: 'Lightweight structure but reduces armor efficiency',
    pointMultiplier: 1.0,
    special: ['50% weight savings', 'Armor penalty']
  },
  {
    id: 'reinforced_structure',
    name: 'Reinforced Structure',
    type: 'Reinforced',
    techBase: 'Inner Sphere',
    rulesLevel: 'Advanced',
    introductionYear: 3057,
    description: 'Doubles internal structure points but weighs twice as much',
    pointMultiplier: 2.0,
    special: ['Double structure points', 'Double weight']
  },
  {
    id: 'industrial_structure',
    name: 'Industrial Structure',
    type: 'Standard', // Industrial uses Standard rules generally or needs new type
    techBase: 'Inner Sphere',
    rulesLevel: 'Introductory',
    introductionYear: 2350,
    description: 'Heavy industrial structure for IndustrialMechs',
    pointMultiplier: 1.0
  }
]

export class StructureAdapter extends BaseAdapter {
  /**
   * Get all structures compatible with the given context
   */
  getCompatibleStructures(context: UnitContext): StructureVariant[] {
    return STRUCTURE_DATABASE
      .filter(structure => this.isCompatible(structure, context))
      .map(structure => this.enrichWithCalculations(structure, context))
  }

  /**
   * Get structures by tech base
   */
  getStructuresByTechBase(techBase: TechBase, context: UnitContext): StructureVariant[] {
    return STRUCTURE_DATABASE
      .filter(structure => structure.techBase === techBase || structure.techBase === 'Inner Sphere')
      .map(structure => this.enrichWithCalculations(structure, context))
  }

  /**
   * Get a specific structure by ID
   */
  getStructureById(id: string, context: UnitContext): StructureVariant | null {
    const definition = STRUCTURE_DATABASE.find(s => s.id === id)
    if (!definition) return null
    return this.enrichWithCalculations(definition, context)
  }

  /**
   * Check if a structure is compatible with the unit context
   */
  private isCompatible(structure: StructureDefinition, context: UnitContext): boolean {
    // Tech Base Compatibility
    if (context.techBase !== 'Mixed' && context.techBase !== 'Both') {
        if (structure.techBase !== context.techBase && structure.techBase !== 'Both' && structure.techBase !== 'Inner Sphere') {
             // Allow IS structure on Clan mechs? No, usually Clan Mechs use Standard or Clan Endo.
             // But Standard IS is same as Standard Clan.
             if (structure.type === 'Standard') return true; 
             return false;
        }
    }

    // Year restrictions
    if (structure.introductionYear > context.constructionYear) {
      return false
    }

    // Industrial structure check (mapped to Standard but ID distinguishes it)
    if (structure.id === 'industrial_structure' && context.unitType !== 'IndustrialMech') {
      return false
    }

    return true
  }

  /**
   * Enrich structure definition with calculated properties
   */
  private enrichWithCalculations(
    structure: StructureDefinition,
    context: UnitContext
  ): StructureVariant {
    // Update context with this structure's type
    const structureContext = {
      ...context,
      structureType: structure.type
    }

    const weight = this.calculateWeight(structure.id, structureContext)
    const slots = this.calculateSlots(structure.id, structureContext) as number

    return {
      ...structure,
      weight,
      slots,
      pointMultiplier: structure.pointMultiplier,
      special: structure.special
    }
  }

  /**
   * Calculate total internal structure points for a unit
   */
  calculateTotalStructurePoints(tonnage: number, structureType: StructureType): number {
    const definition = STRUCTURE_DATABASE.find(s => s.type === structureType)
    if (!definition) {
      // Fallback for generic type lookup
      const genericDef = STRUCTURE_DATABASE.find(s => s.type === structureType);
      if (genericDef) return Math.floor(tonnage * 1.5) * genericDef.pointMultiplier;
      
      throw new Error(`Unknown structure type: ${structureType}`)
    }

    // Base structure points vary by location, but for total we use standard formula
    // This is a simplified calculation; actual implementation needs per-location values
    const basePoints = Math.floor(tonnage * 1.5) // Simplified
    return basePoints * definition.pointMultiplier
  }
}
