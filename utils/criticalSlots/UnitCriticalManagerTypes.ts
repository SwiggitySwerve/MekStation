/**
 * Types and Interfaces for Unit Critical Manager
 * Extracted from UnitCriticalManager.ts for better organization
 */

import { EquipmentObject, EquipmentAllocation } from './CriticalSlot'
import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../../types/components'
import { JumpJetType } from '../jumpJetCalculations'
import { 
  ComponentConfiguration, 
  TechBase, 
  ComponentCategory, 
  createComponentConfiguration,
  migrateStringToComponentConfiguration,
  getComponentTypeNames
} from '../../types/componentConfiguration'

export interface UnitValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sectionResults: Array<{
    location: string
    result: any
  }>
}

// Extended equipment interface for special components
export interface SpecialEquipmentObject extends EquipmentObject {
  componentType?: 'structure' | 'armor'
  instanceId?: string // Unique identifier for this specific instance of the component
}

// ===== ENHANCED STATE SERIALIZATION INTERFACES =====

/**
 * Complete unit state for persistence - includes everything needed to restore unit exactly
 */
export interface CompleteUnitState {
  version: string                                // Version for future compatibility
  configuration: UnitConfiguration               // Basic unit configuration
  criticalSlotAllocations: SerializedSlotAllocations  // Equipment in specific slots
  unallocatedEquipment: SerializedEquipment[]    // Equipment not yet placed
  timestamp: number                              // When state was saved
}

/**
 * Serialized equipment data for persistence
 */
export interface SerializedEquipment {
  equipmentData: EquipmentObject
  equipmentGroupId: string
  location: string                               // Empty string if unallocated
  startSlotIndex: number                         // -1 if unallocated
  endSlotIndex: number                           // -1 if unallocated
  occupiedSlots: number[]                        // Empty array if unallocated
}

/**
 * Critical slot allocations organized by location
 */
export interface SerializedSlotAllocations {
  [location: string]: {
    [slotIndex: number]: SerializedEquipment
  }
}

/**
 * Validation result for state deserialization
 */
export interface StateValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  canRecover: boolean                            // Can we recover from errors automatically?
}

export interface ArmorAllocation {
  HD: { front: number; rear: number };
  CT: { front: number; rear: number };
  LT: { front: number; rear: number };
  RT: { front: number; rear: number };
  LA: { front: number; rear: number };
  RA: { front: number; rear: number };
  LL: { front: number; rear: number };
  RL: { front: number; rear: number };
}

export interface UnitConfiguration {
  // Primary identification
  chassis: string                    // "Annihilator", "Atlas", etc.
  model: string                      // "ANH-1E", "AS7-D", etc.
  
  // Core mech properties
  tonnage: number                    // 20-100 tons in 5-ton increments
  unitType: 'BattleMech' | 'IndustrialMech'
  techBase: 'Inner Sphere' | 'Clan'  // Determines available tech options
  
  // Movement and engine
  walkMP: number                     // 1-20+ movement points
  engineRating: number               // Auto-calculated from tonnage × walkMP, max 400
  runMP: number                      // Auto-calculated (walkMP × 1.5, rounded down)
  engineType: EngineType
  
  // Jump jets
  jumpMP: number                     // Jump movement points
  jumpJetType: string                 // Type of jump jets
  jumpJetCounts: Partial<Record<JumpJetType, number>>  // Count of each jump jet type
  hasPartialWing: boolean            // Whether unit has partial wing
  
  // System components - now using simple string types
  gyroType: GyroType
  structureType: StructureType
  armorType: ArmorType
  
  // Armor allocation - Single Source of Truth approach
  armorAllocation: ArmorAllocation   // User input - what's actually allocated to locations
  armorTonnage: number              // User input - tonnage invested in armor
  // NOTE: All other armor values (available, allocated, remaining) are computed on-demand
  
  // Heat management
  heatSinkType: HeatSinkType
  totalHeatSinks: number             // User configurable, minimum 10 total for the mech
  internalHeatSinks: number          // Auto-calculated from engine rating
  externalHeatSinks: number          // Auto-calculated (total - internal)
  
  // Enhancement systems
  enhancements: ComponentConfiguration[] // Movement enhancement systems (MASC, TSM, Supercharger, etc.)
  
  // Legacy compatibility
  mass: number                       // Alias for tonnage
  
  // Legacy type compatibility - deprecated, will be migrated to ComponentConfiguration
  legacyStructureType?: ComponentConfiguration
  legacyArmorType?: ComponentConfiguration
  legacyHeatSinkType?: ComponentConfiguration
  legacyJumpJetType?: JumpJetType
}

/**
 * Legacy configuration interface for backwards compatibility
 */
export interface LegacyUnitConfiguration {
  engineType: EngineType
  gyroType: ComponentConfiguration
  mass: number
  unitType: 'BattleMech' | 'IndustrialMech'
} 