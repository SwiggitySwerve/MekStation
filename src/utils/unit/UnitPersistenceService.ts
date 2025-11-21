/**
 * Unit Persistence Service - Universal unit loading by chassis+model or tab ID
 * Provides seamless access to units using BattleTech standard naming conventions
 * Integrates with MultiUnitProvider for backward compatibility
 */

import { UnitCriticalManager, UnitConfiguration, CompleteUnitState } from '../criticalSlots/UnitCriticalManager'
import { UnitStateManager } from '../criticalSlots/UnitStateManager'

// Storage prefixes
const TAB_DATA_PREFIX = 'battletech-unit-tab-'
const COMPLETE_STATE_PREFIX = 'battletech-complete-state-'
const UNIT_DATA_PREFIX = 'battletech-unit-'
const UNIT_INDEX_KEY = 'battletech-unit-index'

// Unit identification interfaces
export interface UnitIdentifier {
  // Option 1: Chassis + Model (primary)
  chassis?: string
  model?: string
  
  // Option 2: Combined unit ID  
  unitId?: string        // "annihilator-anh-1e"
  
  // Option 3: Legacy tab support
  tabId?: string         // "tab-1", "tab-2"
}

export interface UnitLoadResult {
  unitManager: UnitCriticalManager
  stateManager: UnitStateManager
  unitId: string
  source: 'chassis-model' | 'unit-id' | 'tab-id'
  hasCompleteState: boolean
}

export interface UnitSummary {
  unitId: string
  chassis: string
  model: string
  tonnage: number
  lastModified: string
  source: 'unit' | 'tab'
}

export interface UnitIndex {
  [unitId: string]: {
    chassis: string
    model: string
    tonnage: number
    lastModified: string
    storageKey: string  // Full storage key for loading
  }
}

/**
 * Enhanced tab data interface for complete state persistence
 */
interface EnhancedTabData {
  completeState?: CompleteUnitState  // New complete state format
  config?: UnitConfiguration         // Legacy configuration format
  modified: string
  version: string
}

/**
 * Generate normalized unit ID from chassis and model
 */
export function generateUnitId(chassis: string, model: string): string {
  const normalizedChassis = chassis.toLowerCase()
    .replace(/\s+/g, '-')           // Spaces to hyphens
    .replace(/[^a-z0-9-]/g, '')     // Remove special chars
  
  const normalizedModel = model.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  
  return `${normalizedChassis}-${normalizedModel}`
}

/**
 * Parse unit ID back to chassis and model (best effort)
 */
export function parseUnitId(unitId: string): { chassis: string, model: string } {
  // This is best effort - original formatting may be lost
  const parts = unitId.split('-')
  
  if (parts.length >= 2) {
    // Assume first part is chassis, rest is model
    const chassis = parts[0]
    const model = parts.slice(1).join('-')
    
    return {
      chassis: chassis.charAt(0).toUpperCase() + chassis.slice(1),
      model: model.toUpperCase()
    }
  }
  
  return {
    chassis: 'Unknown',
    model: unitId.toUpperCase()
  }
}

/**
 * Universal Unit Persistence Service
 */
export class UnitPersistenceService {
  
  /**
   * Load unit by any supported identifier
   */
  static loadUnit(identifier: UnitIdentifier): UnitLoadResult {
    console.log('[UnitPersistenceService] Loading unit with identifier:', identifier)
    
    let unitId: string
    let source: 'chassis-model' | 'unit-id' | 'tab-id'
    
    if (identifier.chassis && identifier.model) {
      unitId = generateUnitId(identifier.chassis, identifier.model)
      source = 'chassis-model'
      console.log(`[UnitPersistenceService] Generated unit ID from chassis+model: ${unitId}`)
    } else if (identifier.unitId) {
      unitId = identifier.unitId
      source = 'unit-id'
      console.log(`[UnitPersistenceService] Using provided unit ID: ${unitId}`)
    } else if (identifier.tabId) {
      return this.loadByTabId(identifier.tabId)
    } else {
      throw new Error('No valid identifier provided. Must specify chassis+model, unitId, or tabId.')
    }
    
    // Try to load by unit ID
    const result = this.loadByUnitId(unitId)
    if (result) {
      result.source = source
      return result
    }
    
    // If not found and we have chassis+model, create new unit
    if (identifier.chassis && identifier.model) {
      console.log(`[UnitPersistenceService] Unit not found, creating new unit for ${identifier.chassis} ${identifier.model}`)
      return this.createNewUnit(identifier.chassis, identifier.model, unitId)
    }
    
    throw new Error(`Unit not found: ${unitId}`)
  }
  
  /**
   * Load unit by normalized unit ID
   */
  private static loadByUnitId(unitId: string): UnitLoadResult | null {
    console.log(`[UnitPersistenceService] Attempting to load unit by ID: ${unitId}`)
    
    try {
      // Try complete state format first
      const completeStateKey = `${UNIT_DATA_PREFIX}${unitId}`
      const completeStateStr = localStorage.getItem(completeStateKey)
      
      if (completeStateStr) {
        const tabData: EnhancedTabData = JSON.parse(completeStateStr)
        
        if (tabData.completeState) {
          console.log(`[UnitPersistenceService] Found complete state for unit: ${unitId}`)
          return this.createUnitFromCompleteState(tabData.completeState, unitId, true)
        }
        
        if (tabData.config) {
          console.log(`[UnitPersistenceService] Found legacy config for unit: ${unitId}`)
          return this.createUnitFromConfig(tabData.config, unitId, false)
        }
      }
      
      // Try legacy tab format (for units migrated from tab system)
      const legacyKey = `${TAB_DATA_PREFIX}${unitId}`
      const legacyStr = localStorage.getItem(legacyKey)
      
      if (legacyStr) {
        const legacyData = JSON.parse(legacyStr)
        console.log(`[UnitPersistenceService] Found legacy tab data for unit: ${unitId}`)
        return this.createUnitFromConfig(legacyData.config || legacyData, unitId, false)
      }
      
      console.log(`[UnitPersistenceService] No data found for unit: ${unitId}`)
      return null
      
    } catch (error) {
      console.error(`[UnitPersistenceService] Error loading unit ${unitId}:`, error)
      return null
    }
  }
  
  /**
   * Load unit by tab ID (legacy support)
   */
  private static loadByTabId(tabId: string): UnitLoadResult {
    console.log(`[UnitPersistenceService] Loading unit by tab ID: ${tabId}`)
    
    try {
      // Try complete state format first
      const completeStateKey = `${COMPLETE_STATE_PREFIX}${tabId}`
      const completeStateStr = localStorage.getItem(completeStateKey)
      
      if (completeStateStr) {
        const tabData: EnhancedTabData = JSON.parse(completeStateStr)
        
        if (tabData.completeState) {
          console.log(`[UnitPersistenceService] Found complete state for tab: ${tabId}`)
          return this.createUnitFromCompleteState(tabData.completeState, tabId, true)
        }
      }
      
      // Try legacy tab format
      const legacyKey = `${TAB_DATA_PREFIX}${tabId}`
      const legacyStr = localStorage.getItem(legacyKey)
      
      if (legacyStr) {
        const legacyData = JSON.parse(legacyStr)
        console.log(`[UnitPersistenceService] Found legacy tab data: ${tabId}`)
        return this.createUnitFromConfig(legacyData.config || legacyData, tabId, false)
      }
      
      throw new Error(`Tab not found: ${tabId}`)
      
    } catch (error) {
      console.error(`[UnitPersistenceService] Error loading tab ${tabId}:`, error)
      throw error
    }
  }
  
  /**
   * Create unit from complete state
   */
  private static createUnitFromCompleteState(
    completeState: CompleteUnitState, 
    id: string, 
    hasCompleteState: boolean
  ): UnitLoadResult {
    const stateManager = new UnitStateManager(completeState.configuration)
    const unitManager = stateManager.getCurrentUnit()
    
    // Restore complete state if available
    if (hasCompleteState) {
      const success = unitManager.deserializeCompleteState(completeState)
      if (!success) {
        console.warn(`[UnitPersistenceService] Failed to restore complete state for ${id}, using config only`)
      }
    }
    
    return {
      unitManager,
      stateManager,
      unitId: id,
      source: 'tab-id', // Will be updated by caller
      hasCompleteState
    }
  }
  
  /**
   * Create unit from configuration only
   */
  private static createUnitFromConfig(
    config: UnitConfiguration, 
    id: string, 
    hasCompleteState: boolean
  ): UnitLoadResult {
    const stateManager = new UnitStateManager(config)
    const unitManager = stateManager.getCurrentUnit()
    
    return {
      unitManager,
      stateManager,
      unitId: id,
      source: 'tab-id', // Will be updated by caller
      hasCompleteState
    }
  }
  
  /**
   * Create new unit with chassis and model
   */
  private static createNewUnit(chassis: string, model: string, unitId: string): UnitLoadResult {
    console.log(`[UnitPersistenceService] Creating new unit: ${chassis} ${model}`)
    
    // Create default configuration with chassis and model
    const config: UnitConfiguration = {
      chassis,
      model,
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard',
      gyroType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 30, rear: 10 },
        LT: { front: 24, rear: 8 },
        RT: { front: 24, rear: 8 },
        LA: { front: 20, rear: 0 },
        RA: { front: 20, rear: 0 },
        LL: { front: 30, rear: 0 },
        RL: { front: 30, rear: 0 }
      },
      armorTonnage: 8.0,
      heatSinkType: 'Single',
      totalHeatSinks: 10,
      internalHeatSinks: 8,
      externalHeatSinks: 2,
      enhancements: [],
      jumpMP: 0,
      jumpJetType: 'Standard Jump Jet',
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50
    }
    
    const stateManager = new UnitStateManager(config)
    const unitManager = stateManager.getCurrentUnit()
    
    return {
      unitManager,
      stateManager,
      unitId,
      source: 'chassis-model',
      hasCompleteState: false
    }
  }
  
  /**
   * Save unit with chassis and model identifiers
   */
  static saveUnit(
    unitManager: UnitCriticalManager, 
    chassis: string, 
    model: string
  ): string {
    const unitId = generateUnitId(chassis, model)
    
    console.log(`[UnitPersistenceService] Saving unit: ${chassis} ${model} (ID: ${unitId})`)
    
    const completeState = unitManager.serializeCompleteState()
    
    // Update configuration with chassis/model
    completeState.configuration.chassis = chassis
    completeState.configuration.model = model
    
    const tabData: EnhancedTabData = {
      completeState,
      config: completeState.configuration, // Keep legacy config for compatibility
      modified: new Date().toISOString(),
      version: '2.0.0'
    }
    
    // Save to unit storage
    const storageKey = `${UNIT_DATA_PREFIX}${unitId}`
    localStorage.setItem(storageKey, JSON.stringify(tabData))
    
    // Update unit index
    this.updateUnitIndex(unitId, chassis, model, completeState.configuration.tonnage, storageKey)
    
    console.log(`[UnitPersistenceService] Saved unit with ID: ${unitId}`)
    return unitId
  }
  
  /**
   * Save unit by existing unit ID
   */
  static saveUnitById(unitManager: UnitCriticalManager, unitId: string): string {
    console.log(`[UnitPersistenceService] Saving unit by ID: ${unitId}`)
    
    const completeState = unitManager.serializeCompleteState()
    const config = completeState.configuration
    
    // Ensure chassis and model are set
    if (!config.chassis || !config.model) {
      const parsed = parseUnitId(unitId)
      config.chassis = config.chassis || parsed.chassis
      config.model = config.model || parsed.model
    }
    
    return this.saveUnit(unitManager, config.chassis, config.model)
  }
  
  /**
   * Update unit index for fast lookup
   */
  private static updateUnitIndex(
    unitId: string, 
    chassis: string, 
    model: string, 
    tonnage: number,
    storageKey: string
  ): void {
    try {
      const indexStr = localStorage.getItem(UNIT_INDEX_KEY)
      const index: UnitIndex = indexStr ? JSON.parse(indexStr) : {}
      
      index[unitId] = {
        chassis,
        model,
        tonnage,
        lastModified: new Date().toISOString(),
        storageKey
      }
      
      localStorage.setItem(UNIT_INDEX_KEY, JSON.stringify(index))
    } catch (error) {
      console.warn('[UnitPersistenceService] Failed to update unit index:', error)
    }
  }
  
  /**
   * List all available units
   */
  static listAvailableUnits(): UnitSummary[] {
    const units: UnitSummary[] = []
    
    try {
      // Load from unit index first
      const indexStr = localStorage.getItem(UNIT_INDEX_KEY)
      if (indexStr) {
        const index: UnitIndex = JSON.parse(indexStr)
        
        Object.entries(index).forEach(([unitId, data]) => {
          units.push({
            unitId,
            chassis: data.chassis,
            model: data.model,
            tonnage: data.tonnage,
            lastModified: data.lastModified,
            source: 'unit'
          })
        })
      }
      
      // Also scan for tab-based units (legacy)
      const tabMetadataStr = localStorage.getItem('battletech-tabs-metadata')
      if (tabMetadataStr) {
        const tabMetadata = JSON.parse(tabMetadataStr)
        
        tabMetadata.tabOrder?.forEach((tabId: string) => {
          const tabName = tabMetadata.tabNames?.[tabId] || 'Unknown'
          
          // Try to load config to get chassis/model
          try {
            const legacyKey = `${TAB_DATA_PREFIX}${tabId}`
            const legacyStr = localStorage.getItem(legacyKey)
            
            if (legacyStr) {
              const legacyData = JSON.parse(legacyStr)
              const config = legacyData.config || legacyData
              
              units.push({
                unitId: tabId,
                chassis: config.chassis || 'Legacy',
                model: config.model || tabName,
                tonnage: config.tonnage || 50,
                lastModified: legacyData.modified || new Date().toISOString(),
                source: 'tab'
              })
            }
          } catch (error) {
            console.warn(`[UnitPersistenceService] Error reading tab ${tabId}:`, error)
          }
        })
      }
      
    } catch (error) {
      console.error('[UnitPersistenceService] Error listing units:', error)
    }
    
    return units
  }
  
  /**
   * Check if unit exists
   */
  static exists(identifier: UnitIdentifier): boolean {
    try {
      if (identifier.chassis && identifier.model) {
        const unitId = generateUnitId(identifier.chassis, identifier.model)
        const storageKey = `${UNIT_DATA_PREFIX}${unitId}`
        return localStorage.getItem(storageKey) !== null
      }
      
      if (identifier.unitId) {
        const storageKey = `${UNIT_DATA_PREFIX}${identifier.unitId}`
        return localStorage.getItem(storageKey) !== null
      }
      
      if (identifier.tabId) {
        const completeStateKey = `${COMPLETE_STATE_PREFIX}${identifier.tabId}`
        const legacyKey = `${TAB_DATA_PREFIX}${identifier.tabId}`
        return localStorage.getItem(completeStateKey) !== null || 
               localStorage.getItem(legacyKey) !== null
      }
      
      return false
    } catch (error) {
      console.error('[UnitPersistenceService] Error checking unit existence:', error)
      return false
    }
  }
  
  /**
   * Delete unit by identifier
   */
  static deleteUnit(identifier: UnitIdentifier): boolean {
    try {
      let unitId: string | null = null
      
      if (identifier.chassis && identifier.model) {
        unitId = generateUnitId(identifier.chassis, identifier.model)
      } else if (identifier.unitId) {
        unitId = identifier.unitId
      } else if (identifier.tabId) {
        // For tab deletion, remove tab-specific keys
        localStorage.removeItem(`${COMPLETE_STATE_PREFIX}${identifier.tabId}`)
        localStorage.removeItem(`${TAB_DATA_PREFIX}${identifier.tabId}`)
        return true
      }
      
      if (unitId) {
        // Remove unit data
        localStorage.removeItem(`${UNIT_DATA_PREFIX}${unitId}`)
        
        // Remove from index
        const indexStr = localStorage.getItem(UNIT_INDEX_KEY)
        if (indexStr) {
          const index: UnitIndex = JSON.parse(indexStr)
          delete index[unitId]
          localStorage.setItem(UNIT_INDEX_KEY, JSON.stringify(index))
        }
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('[UnitPersistenceService] Error deleting unit:', error)
      return false
    }
  }
  
  /**
   * Migrate tab to unit ID system
   */
  static migrateTabToUnitId(tabId: string, chassis: string, model: string): string | null {
    try {
      console.log(`[UnitPersistenceService] Migrating tab ${tabId} to unit ID: ${chassis} ${model}`)
      
      // Load existing tab data
      const result = this.loadByTabId(tabId)
      if (!result) return null
      
      // Save as unit with chassis/model
      const unitId = this.saveUnit(result.unitManager, chassis, model)
      
      // Optionally clean up old tab data
      // (Leave this to user/admin decision)
      
      console.log(`[UnitPersistenceService] Successfully migrated tab ${tabId} to unit ${unitId}`)
      return unitId
      
    } catch (error) {
      console.error(`[UnitPersistenceService] Error migrating tab ${tabId}:`, error)
      return null
    }
  }
}

/**
 * Single Unit Provider for standalone usage
 * Wraps a single unit loaded by chassis+model or unit ID
 */
export interface SingleUnitProviderProps {
  unitId?: string
  chassis?: string
  model?: string
  children: React.ReactNode
  onUnitChange?: (unitManager: UnitCriticalManager) => void
}
