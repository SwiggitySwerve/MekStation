/**
 * System Components Hook
 * 
 * Drop-in replacement for useComponentDatabase using new SystemComponentsGateway.
 * Provides identical API for seamless migration.
 */

import { useMemo, useCallback } from 'react'
import { SystemComponentsGateway, UnitContext } from '../../services/systemComponents/SystemComponentsGateway'
import { TechBase } from '../../types/core/TechBase'

// Re-export types for compatibility
export interface ComponentFilters {
  techBase: TechBase
  unitType: 'BattleMech' | 'IndustrialMech' | 'ProtoMech' | 'BattleArmor' | 'Vehicle'
  rulesLevel?: string
  introductionYear?: number
}

/**
 * Hook for accessing system components with calculated properties
 */
export const useSystemComponents = () => {
  /**
   * Get engines matching filters
   */
  const getEngines = useCallback((filters: ComponentFilters) => {
    const engines = SystemComponentsGateway.getEngines({
      techBase: filters.techBase,
      unitTonnage: 50, // Default, will be recalculated with actual context
      desiredRating: 200, // Default
      rulesLevel: filters.rulesLevel ? [filters.rulesLevel] : undefined,
      availableByYear: filters.introductionYear
    })

    return engines.map(engine => ({
      id: engine.id,
      name: engine.name,
      type: 'engine' as const,
      techBase: engine.techBase,
      introductionYear: engine.introductionYear,
      rulesLevel: engine.rulesLevel,
      cost: 0, // TODO: Add cost to gateway
      battleValue: 0, // TODO: Add BV to gateway
      availability: [engine.techBase],
      rating: engine.rating,
      weight: engine.weight,
      criticalSlots: {
        centerTorso: Array.from({ length: engine.slots['Center Torso'] || 0 }, (_, i) => i),
        leftTorso: Array.from({ length: engine.slots['Left Torso'] || 0 }, (_, i) => i),
        rightTorso: Array.from({ length: engine.slots['Right Torso'] || 0 }, (_, i) => i)
      },
      heatDissipation: engine.internalHeatSinks,
      fuelType: engine.type.includes('ICE') ? 'ICE' : 'Fusion',
      features: [engine.type]
    }))
  }, [])

  /**
   * Get gyros matching filters
   */
  const getGyros = useCallback((filters: ComponentFilters) => {
    const gyros = SystemComponentsGateway.getGyros({
      techBase: filters.techBase,
      engineRating: 200, // Default
      rulesLevel: filters.rulesLevel ? [filters.rulesLevel] : undefined,
      availableByYear: filters.introductionYear
    })

    return gyros.map(gyro => ({
      id: gyro.id,
      name: gyro.name,
      type: 'gyro' as const,
      techBase: gyro.techBase,
      introductionYear: gyro.introductionYear,
      rulesLevel: gyro.rulesLevel,
      cost: 0,
      battleValue: 0,
      availability: [gyro.techBase],
      weight: gyro.weight,
      criticalSlots: Array.from({ length: gyro.slots }, (_, i) => i),
      gyroType: gyro.type,
      features: gyro.special || []
    }))
  }, [])

  /**
   * Get structures matching filters
   */
  const getStructures = useCallback((filters: ComponentFilters) => {
    const structures = SystemComponentsGateway.getStructures({
      techBase: filters.techBase,
      unitType: filters.unitType,
      unitTonnage: 50, // Default
      rulesLevel: filters.rulesLevel ? [filters.rulesLevel] : undefined,
      availableByYear: filters.introductionYear
    })

    return structures.map(structure => ({
      id: structure.id,
      name: structure.name,
      type: 'structure' as const,
      techBase: structure.techBase,
      introductionYear: structure.introductionYear,
      rulesLevel: structure.rulesLevel,
      cost: 0,
      battleValue: 0,
      availability: [structure.techBase],
      weight: structure.weight,
      criticalSlots: structure.slots,
      structureType: structure.type,
      pointMultiplier: structure.pointMultiplier,
      features: structure.special || []
    }))
  }, [])

  /**
   * Get armors matching filters (placeholder until ArmorAdapter implemented)
   */
  const getArmors = useCallback((filters: ComponentFilters) => {
    // TODO: Implement when ArmorAdapter is ready
    return []
  }, [])

  /**
   * Get heat sinks matching filters (placeholder until HeatSinkAdapter implemented)
   */
  const getHeatSinks = useCallback((filters: ComponentFilters) => {
    // TODO: Implement when HeatSinkAdapter is ready
    return []
  }, [])

  /**
   * Get jump jets matching filters (placeholder until JumpJetAdapter implemented)
   */
  const getJumpJets = useCallback((filters: ComponentFilters) => {
    // TODO: Implement when JumpJetAdapter is ready
    return []
  }, [])

  /**
   * Get all components for a category (compatibility wrapper)
   */
  const getComponents = useCallback((
    category: 'engine' | 'gyro' | 'structure' | 'armor' | 'heatSink' | 'jumpJet',
    filters: ComponentFilters
  ) => {
    switch (category) {
      case 'engine':
        return getEngines(filters)
      case 'gyro':
        return getGyros(filters)
      case 'structure':
        return getStructures(filters)
      case 'armor':
        return getArmors(filters)
      case 'heatSink':
        return getHeatSinks(filters)
      case 'jumpJet':
        return getJumpJets(filters)
      default:
        return []
    }
  }, [getEngines, getGyros, getStructures, getArmors, getHeatSinks, getJumpJets])

  /**
   * Get component by ID
   */
  const getComponentById = useCallback((id: string) => {
    // Try to find in each category with default context
    const context = SystemComponentsGateway.createContext()
    
    const engine = SystemComponentsGateway.getEngineById(id, context)
    if (engine) {
      return {
        id: engine.id,
        name: engine.name,
        type: 'engine' as const,
        techBase: engine.techBase,
        weight: engine.weight
      }
    }

    const gyro = SystemComponentsGateway.getGyroById(id, context)
    if (gyro) {
      return {
        id: gyro.id,
        name: gyro.name,
        type: 'gyro' as const,
        techBase: gyro.techBase,
        weight: gyro.weight
      }
    }

    const structure = SystemComponentsGateway.getStructureById(id, context)
    if (structure) {
      return {
        id: structure.id,
        name: structure.name,
        type: 'structure' as const,
        techBase: structure.techBase,
        weight: structure.weight
      }
    }

    return null
  }, [])

  /**
   * Calculate total critical slots for a configuration
   */
  const calculateTotalSlots = useCallback((configuration: {
    engine?: string
    gyro?: string
    structure?: string
    armor?: string
    heatSinks?: number
    jumpJets?: number
    enhancements?: string[]
  }) => {
    let totalSlots = 0
    const context = SystemComponentsGateway.createContext()

    // Engine slots
    if (configuration.engine) {
      const engine = SystemComponentsGateway.getEngineById(configuration.engine, context)
      if (engine && engine.slots) {
        totalSlots += (engine.slots['Center Torso'] || 0)
        totalSlots += (engine.slots['Left Torso'] || 0)
        totalSlots += (engine.slots['Right Torso'] || 0)
      }
    }

    // Gyro slots
    if (configuration.gyro) {
      const gyro = SystemComponentsGateway.getGyroById(configuration.gyro, context)
      if (gyro) {
        totalSlots += gyro.slots
      }
    }

    // Structure slots
    if (configuration.structure) {
      const structure = SystemComponentsGateway.getStructureById(configuration.structure, context)
      if (structure) {
        totalSlots += structure.slots
      }
    }

    // Heat sinks (1 slot each if not internal)
    if (configuration.heatSinks) {
      totalSlots += configuration.heatSinks
    }

    // Jump jets (1 slot each)
    if (configuration.jumpJets) {
      totalSlots += configuration.jumpJets
    }

    return totalSlots
  }, [])

  /**
   * Validate component selections
   */
  const validateSelections = useCallback((selections: {
    engine?: string
    gyro?: string
    structure?: string
    armor?: string
    heatSink?: string
    jumpJet?: string
    enhancements?: string[]
  }) => {
    const errors: string[] = []
    const warnings: string[] = []
    const context = SystemComponentsGateway.createContext()

    // Validate engine
    if (selections.engine) {
      const result = SystemComponentsGateway.validateEngineForUnit(selections.engine, context)
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    }

    // Validate gyro compatibility with engine
    if (selections.engine && selections.gyro) {
      const result = SystemComponentsGateway.validateGyroWithEngine(
        selections.gyro,
        selections.engine,
        context
      )
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }, [])

  /**
   * Get component recommendations (placeholder for future enhancement)
   */
  const getComponentRecommendations = useCallback((
    unitType: ComponentFilters['unitType'],
    techBase: TechBase,
    tonnage: number,
    walkMP: number
  ) => {
    // TODO: Implement recommendation engine
    return {
      engine: null,
      gyro: null,
      structure: null,
      armor: null,
      heatSink: null
    }
  }, [])

  return {
    getComponents,
    getEngines,
    getGyros,
    getStructures,
    getArmors,
    getHeatSinks,
    getJumpJets,
    getComponentById,
    calculateTotalSlots,
    validateSelections,
    getComponentRecommendations
  }
}

