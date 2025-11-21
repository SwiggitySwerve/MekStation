/**
 * Component Database Architecture
 * Unified system for all construction components (engines, gyros, structure, armor, etc.)
 * Provides consistent interfaces for slot calculations, tonnage, and restrictions
 * Uses existing types from systemComponents.ts for consistency
 */

import { 
  EngineType, 
  GyroType, 
  StructureType, 
  ArmorType, 
  HeatSinkType 
} from '../../types/systemComponents'
import { PlacementType } from './ComponentPlacement'

export type TechBase = 'Inner Sphere' | 'Clan'
export type UnitType = 'BattleMech' | 'IndustrialMech' | 'ProtoMech' | 'BattleArmor'
export type ComponentCategory = 'engine' | 'gyro' | 'structure' | 'armor' | 'myomer' | 'heatSink' | 'jumpJet' | 'enhancement'

export interface ComponentVariant {
  id: string
  name: string
  techBase: TechBase
  introductionYear: number
  rulesLevel: 'Introductory' | 'Standard' | 'Advanced' | 'Experimental'
  cost: number
  battleValue: number
  availability: string[]
  notes?: string
}

export interface EngineVariant extends ComponentVariant {
  type: 'engine'
  rating: number // Engine rating (e.g., 200, 300)
  weight: number // Calculated weight based on rating and type
  criticalSlots: {
    centerTorso: number[]
    leftTorso: number[]
    rightTorso: number[]
  }
  heatDissipation: number // Base heat dissipation
  fuelType: 'Fusion' | 'ICE' | 'Fuel Cell'
  features: string[] // XL, Light, Compact, etc.
}

export interface GyroVariant extends ComponentVariant {
  type: 'gyro'
  weight: number // Calculated based on engine rating
  criticalSlots: {
    centerTorso: number[]
  }
  features: string[] // XL, Compact, Heavy-Duty, etc.
}

export interface StructureVariant extends ComponentVariant {
  type: 'structure'
  weight: number // Usually 0, weight is part of base structure
  criticalSlots: {
    centerTorso: number[]
    leftTorso: number[]
    rightTorso: number[]
    leftArm: number[]
    rightArm: number[]
    leftLeg: number[]
    rightLeg: number[]
  }
  features: string[] // Endo Steel, Composite, Reinforced, etc.
  internalStructurePoints: number // Multiplier for IS points
  placementType?: PlacementType // For dynamic components like Endo Steel
  totalSlots?: number // Total slots for dynamic placement
}

export interface ArmorVariant extends ComponentVariant {
  type: 'armor'
  weight: number // Usually 0, weight is allocated separately
  criticalSlots: {
    centerTorso: number[]
    leftTorso: number[]
    rightTorso: number[]
    leftArm: number[]
    rightArm: number[]
    leftLeg: number[]
    rightLeg: number[]
  }
  features: string[] // Ferro-Fibrous, Stealth, Reactive, etc.
  armorPointsPerTon: number // How many armor points per ton
  maxArmorPoints: number // Maximum armor points allowed
  placementType?: PlacementType // For dynamic components like Ferro-Fibrous
  totalSlots?: number // Total slots for dynamic placement
}

export interface HeatSinkVariant extends ComponentVariant {
  type: 'heatSink'
  weight: number // Usually 1 ton
  criticalSlots: number // Usually 1 slot
  heatDissipation: number // Heat dissipation per sink
  features: string[] // Single, Double, etc.
  allowedLocations: string[] // Where they can be placed
}

export interface JumpJetVariant extends ComponentVariant {
  type: 'jumpJet'
  weight: number // Variable based on unit tonnage
  criticalSlots: number // Usually 1 slot
  jumpMP: number // Jump movement points provided
  features: string[] // Standard, Improved, etc.
  allowedLocations: string[] // Where they can be placed
}

export interface EnhancementVariant extends ComponentVariant {
  type: 'enhancement'
  weight: number
  criticalSlots: number
  features: string[] // MASC, TSM, Supercharger, etc.
  allowedLocations: string[]
  effects: {
    movement?: number // MP bonus
    heat?: number // Heat generation
    damage?: number // Damage bonus
  }
}

export type ComponentVariantUnion = 
  | EngineVariant 
  | GyroVariant 
  | StructureVariant 
  | ArmorVariant 
  | HeatSinkVariant 
  | JumpJetVariant 
  | EnhancementVariant

export interface ComponentDatabase {
  // Core query methods
  getComponents(
    category: ComponentCategory,
    filters: {
      techBase?: TechBase
      unitType?: UnitType
      rulesLevel?: string
      introductionYear?: number
    }
  ): ComponentVariantUnion[]
  
  getComponentById(id: string): ComponentVariantUnion | null
  
  // Specialized query methods
  getEngines(filters: { techBase?: TechBase; rulesLevel?: string }): EngineVariant[]
  getGyros(filters: { techBase?: TechBase; rulesLevel?: string }): GyroVariant[]
  getStructures(filters: { techBase?: TechBase; rulesLevel?: string }): StructureVariant[]
  getArmors(filters: { techBase?: TechBase; rulesLevel?: string }): ArmorVariant[]
  getHeatSinks(filters: { techBase?: TechBase; rulesLevel?: string }): HeatSinkVariant[]
  getJumpJets(filters: { techBase?: TechBase; rulesLevel?: string }): JumpJetVariant[]
  getEnhancements(filters: { techBase?: TechBase; rulesLevel?: string }): EnhancementVariant[]
  
  // Calculation methods
  calculateEngineWeight(engineType: string, rating: number): number
  calculateGyroWeight(gyroType: string, engineRating: number): number
  calculateHeatSinkWeight(heatSinkType: string, count: number): number
  calculateJumpJetWeight(jumpJetType: string, unitTonnage: number, count: number): number
  
  // Slot calculation methods
  getEngineCriticalSlots(engineType: string, gyroType: string): {
    centerTorso: number[]
    leftTorso: number[]
    rightTorso: number[]
  }
  getGyroCriticalSlots(gyroType: string): { centerTorso: number[] }
  getStructureCriticalSlots(structureType: string): {
    centerTorso: number[]
    leftTorso: number[]
    rightTorso: number[]
    leftArm: number[]
    rightArm: number[]
    leftLeg: number[]
    rightLeg: number[]
  }
  getArmorCriticalSlots(armorType: string): {
    centerTorso: number[]
    leftTorso: number[]
    rightTorso: number[]
    leftArm: number[]
    rightArm: number[]
    leftLeg: number[]
    rightLeg: number[]
  }
  
  // Validation methods
  validateComponentCompatibility(
    component1: ComponentVariantUnion,
    component2: ComponentVariantUnion
  ): { compatible: boolean; errors: string[] }
  
  validateUnitConfiguration(components: {
    engine?: EngineVariant
    gyro?: GyroVariant
    structure?: StructureVariant
    armor?: ArmorVariant
    heatSinks?: HeatSinkVariant[]
    jumpJets?: JumpJetVariant[]
    enhancements?: EnhancementVariant[]
  }): { valid: boolean; errors: string[]; warnings: string[] }
}

// Singleton service for component selection
export interface ComponentSelectionService {
  // Get available components based on filters
  getAvailableComponents(
    category: ComponentCategory,
    filters: {
      techBase: TechBase
      unitType: UnitType
      rulesLevel?: string
      introductionYear?: number
    }
  ): ComponentVariantUnion[]
  
  // Get component recommendations
  getComponentRecommendations(
    unitType: UnitType,
    techBase: TechBase,
    tonnage: number,
    walkMP: number
  ): {
    engines: EngineVariant[]
    gyros: GyroVariant[]
    structures: StructureVariant[]
    armors: ArmorVariant[]
    heatSinks: HeatSinkVariant[]
    jumpJets: JumpJetVariant[]
    enhancements: EnhancementVariant[]
  }
  
  // Validate component selections
  validateSelections(selections: {
    engine?: string
    gyro?: string
    structure?: string
    armor?: string
    heatSink?: string
    jumpJet?: string
    enhancements?: string[]
  }): { valid: boolean; errors: string[]; warnings: string[] }
  
  // Get component details
  getComponentDetails(componentId: string): ComponentVariantUnion | null
  
  // Calculate total slots for a configuration
  calculateTotalSlots(configuration: {
    engine?: string
    gyro?: string
    structure?: string
    armor?: string
    heatSinks?: number
    jumpJets?: number
    enhancements?: string[]
  }): {
    total: number
    breakdown: {
      engine: number
      gyro: number
      structure: number
      armor: number
      heatSinks: number
      jumpJets: number
      enhancements: number
    }
  }
} 