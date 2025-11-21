/**
 * System Components Service
 * 
 * Core business logic for system component management.
 * Coordinates between adapters and provides high-level operations.
 */

import { CalculationEngine } from './calculations/CalculationEngine'
import { registerAllLookupTables } from './calculations/LookupTables'
import { UnitContext } from './calculations/UnitContext'
import { EngineAdapter, EngineVariant } from './adapters/EngineAdapter'
import { GyroAdapter, GyroVariant } from './adapters/GyroAdapter'
import { StructureAdapter, StructureVariant } from './adapters/StructureAdapter'
import { TechBase } from '../../types/core/TechBase'

/**
 * Component query criteria
 */
export interface ComponentQueryCriteria {
  techBase: TechBase
  availableByYear?: number
  ignoreYearRestrictions?: boolean
  rulesLevel?: string[]
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class SystemComponentsService {
  private calculationEngine: CalculationEngine
  private engineAdapter: EngineAdapter
  private gyroAdapter: GyroAdapter
  private structureAdapter: StructureAdapter

  constructor() {
    // Initialize calculation engine
    this.calculationEngine = new CalculationEngine()
    registerAllLookupTables(this.calculationEngine)

    // Initialize adapters
    this.engineAdapter = new EngineAdapter(this.calculationEngine)
    this.gyroAdapter = new GyroAdapter(this.calculationEngine)
    this.structureAdapter = new StructureAdapter(this.calculationEngine)
  }

  // ===== ENGINE OPERATIONS =====

  /**
   * Get engines matching criteria
   */
  getEngines(criteria: ComponentQueryCriteria, context: UnitContext): EngineVariant[] {
    // Apply criteria to context
    const queryContext = {
      ...context,
      techBase: criteria.techBase,
      constructionYear: criteria.availableByYear || context.constructionYear
    }

    let engines = this.engineAdapter.getCompatibleEngines(queryContext)

    // Apply rules level filter
    if (criteria.rulesLevel && criteria.rulesLevel.length > 0) {
      engines = engines.filter(e => criteria.rulesLevel!.includes(e.rulesLevel))
    }

    return engines
  }

  /**
   * Get a specific engine by ID
   */
  getEngineById(id: string, context: UnitContext): EngineVariant | null {
    return this.engineAdapter.getEngineById(id, context)
  }

  /**
   * Calculate engine weight for given rating and tonnage
   */
  calculateEngineWeight(engineId: string, rating: number, tonnage: number): number {
    const context: UnitContext = {
      tonnage,
      engineRating: rating,
      techBase: 'Inner Sphere',
      unitType: 'BattleMech',
      rulesLevel: 'Standard',
      engineType: 'Standard',
      walkMP: Math.floor(rating / tonnage),
      runMP: Math.floor((rating / tonnage) * 1.5),
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

    const engine = this.engineAdapter.getEngineById(engineId, context)
    return engine ? engine.weight : 0
  }

  // ===== GYRO OPERATIONS =====

  /**
   * Get gyros matching criteria
   */
  getGyros(criteria: ComponentQueryCriteria, context: UnitContext): GyroVariant[] {
    const queryContext = {
      ...context,
      techBase: criteria.techBase,
      constructionYear: criteria.availableByYear || context.constructionYear
    }

    let gyros = this.gyroAdapter.getCompatibleGyros(queryContext)

    if (criteria.rulesLevel && criteria.rulesLevel.length > 0) {
      gyros = gyros.filter(g => criteria.rulesLevel!.includes(g.rulesLevel))
    }

    return gyros
  }

  /**
   * Get a specific gyro by ID
   */
  getGyroById(id: string, context: UnitContext): GyroVariant | null {
    return this.gyroAdapter.getGyroById(id, context)
  }

  /**
   * Calculate gyro weight for given engine rating
   */
  calculateGyroWeight(gyroId: string, engineRating: number): number {
    const context: UnitContext = {
      tonnage: 50,
      engineRating,
      techBase: 'Inner Sphere',
      unitType: 'BattleMech',
      rulesLevel: 'Standard',
      engineType: 'Standard',
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

    const gyro = this.gyroAdapter.getGyroById(gyroId, context)
    return gyro ? gyro.weight : 0
  }

  // ===== STRUCTURE OPERATIONS =====

  /**
   * Get structures matching criteria
   */
  getStructures(criteria: ComponentQueryCriteria, context: UnitContext): StructureVariant[] {
    const queryContext = {
      ...context,
      techBase: criteria.techBase,
      constructionYear: criteria.availableByYear || context.constructionYear
    }

    let structures = this.structureAdapter.getCompatibleStructures(queryContext)

    if (criteria.rulesLevel && criteria.rulesLevel.length > 0) {
      structures = structures.filter(s => criteria.rulesLevel!.includes(s.rulesLevel))
    }

    return structures
  }

  /**
   * Get a specific structure by ID
   */
  getStructureById(id: string, context: UnitContext): StructureVariant | null {
    return this.structureAdapter.getStructureById(id, context)
  }

  /**
   * Calculate structure weight for given tonnage
   */
  calculateStructureWeight(structureId: string, tonnage: number): number {
    const context: UnitContext = {
      tonnage,
      engineRating: 200,
      techBase: 'Inner Sphere',
      unitType: 'BattleMech',
      rulesLevel: 'Standard',
      engineType: 'Standard',
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

    const structure = this.structureAdapter.getStructureById(structureId, context)
    return structure ? structure.weight : 0
  }

  // ===== VALIDATION =====

  /**
   * Validate engine for unit configuration
   */
  validateEngineForUnit(engineId: string, context: UnitContext): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    const engine = this.engineAdapter.getEngineById(engineId, context)
    if (!engine) {
      errors.push(`Engine not found: ${engineId}`)
      return { valid: false, errors, warnings }
    }

    // Validate tech base
    if (engine.techBase !== context.techBase && engine.techBase !== 'Inner Sphere') {
      errors.push(`Engine tech base ${engine.techBase} incompatible with unit tech base ${context.techBase}`)
    }

    // Validate era
    if (engine.introductionYear > context.constructionYear) {
      errors.push(`Engine not available in ${context.constructionYear} (introduced ${engine.introductionYear})`)
    }

    // Validate weight
    if (engine.weight > context.tonnage) {
      errors.push(`Engine weight ${engine.weight} exceeds unit tonnage ${context.tonnage}`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate gyro compatibility with engine
   */
  validateGyroWithEngine(gyroId: string, engineId: string, context: UnitContext): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    const gyro = this.gyroAdapter.getGyroById(gyroId, context)
    const engine = this.engineAdapter.getEngineById(engineId, context)

    if (!gyro) {
      errors.push(`Gyro not found: ${gyroId}`)
    }
    if (!engine) {
      errors.push(`Engine not found: ${engineId}`)
    }

    if (gyro && engine) {
      // Check if gyro is compatible with engine type
      if (!this.gyroAdapter.isCompatibleWithEngine(gyro.type, engine.type)) {
        errors.push(`Gyro ${gyro.name} incompatible with ${engine.name}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}






