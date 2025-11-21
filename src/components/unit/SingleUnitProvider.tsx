/**
 * Single Unit Provider - Standalone unit provider for individual unit pages
 * Uses chassis+model or unit ID to load a specific unit without tab management
 * Provides same interface as useUnit() hook for compatibility
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { UnitPersistenceService, UnitIdentifier, UnitLoadResult, generateUnitId } from '../../utils/unit/UnitPersistenceService'
import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager'
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'
import { UnitStateManager } from '../../utils/criticalSlots/UnitStateManager'
import { EngineType, GyroType } from '../../types/systemComponents'
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot'
import { MultiTabDebouncedSaveManager } from '../../utils/DebouncedSaveManager'

// Context interface - compatible with useUnit() hook
interface SingleUnitContextValue {
  // Unit data
  unit: UnitCriticalManager | null
  engineType: EngineType | null
  gyroType: GyroType | null
  unallocatedEquipment: EquipmentAllocation[]
  validation: Record<string, unknown>
  summary: Record<string, unknown>
  isConfigLoaded: boolean
  selectedEquipmentId: string | null
  
  // Unit metadata
  unitId: string | null
  chassis: string | null
  model: string | null
  
  // Unit operations
  changeEngine: (engineType: EngineType) => void
  changeGyro: (gyroType: GyroType) => void
  updateConfiguration: (config: UnitConfiguration) => void
  addTestEquipment: (equipment: EquipmentAllocation, location: string, startSlot?: number) => boolean
  addEquipmentToUnit: (equipment: EquipmentAllocation) => void
  removeEquipment: (equipmentGroupId: string) => boolean
  resetUnit: (config?: UnitConfiguration) => void
  selectEquipment: (equipmentGroupId: string | null) => void
  assignSelectedEquipment: (location: string, slotIndex: number) => boolean
  getDebugInfo: () => Record<string, unknown>
  
  // Save operations
  saveUnit: () => void
  autoSave: boolean
  setAutoSave: (enabled: boolean) => void
}

const SingleUnitContext = createContext<SingleUnitContextValue | null>(null)

export interface SingleUnitProviderProps {
  // Unit identification (one of these must be provided)
  unitId?: string      // Direct unit ID: "annihilator-anh-1e"
  chassis?: string     // Chassis + model combination
  model?: string
  tabId?: string       // Legacy tab ID support
  
  // Configuration
  autoSave?: boolean   // Enable automatic saving (default: true)
  saveDelay?: number   // Save delay in milliseconds (default: 1000)
  
  // Callbacks
  onUnitLoad?: (result: UnitLoadResult) => void
  onUnitChange?: (unitManager: UnitCriticalManager) => void
  onSave?: (unitId: string) => void
  onError?: (error: Error) => void
  
  children: React.ReactNode
}

export function SingleUnitProvider({
  unitId,
  chassis,
  model,
  tabId,
  autoSave = true,
  saveDelay = 1000,
  onUnitLoad,
  onUnitChange,
  onSave,
  onError,
  children
}: SingleUnitProviderProps) {
  const [unit, setUnit] = useState<UnitCriticalManager | null>(null)
  const [stateManager, setStateManager] = useState<UnitStateManager | null>(null)
  const [loadedUnitId, setLoadedUnitId] = useState<string | null>(null)
  const [loadedChassis, setLoadedChassis] = useState<string | null>(null)
  const [loadedModel, setLoadedModel] = useState<string | null>(null)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfigLoaded, setIsConfigLoaded] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(autoSave)
  
  // Debounced save manager
  const [saveManager] = useState(() => new MultiTabDebouncedSaveManager(saveDelay))
  
  // Force update mechanism for unit state changes
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  
  // Load unit on mount or when identifiers change
  useEffect(() => {
    loadUnit()
  }, [unitId, chassis, model, tabId])
  
  // Setup auto-save if enabled
  useEffect(() => {
    if (autoSaveEnabled && unit && loadedUnitId) {
      const interval = setInterval(() => {
        saveUnit()
      }, saveDelay * 2) // Save every 2x the debounce delay
      
      return () => clearInterval(interval)
    }
  }, [autoSaveEnabled, unit, loadedUnitId, saveDelay])
  
  const loadUnit = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Build identifier from props
      const identifier: UnitIdentifier = {}
      
      if (unitId) {
        identifier.unitId = unitId
      } else if (chassis && model) {
        identifier.chassis = chassis
        identifier.model = model
      } else if (tabId) {
        identifier.tabId = tabId
      } else {
        throw new Error('Must provide unitId, chassis+model, or tabId')
      }
      
      console.log('[SingleUnitProvider] Loading unit with identifier:', identifier)
      
      // Load unit using persistence service
      const result = UnitPersistenceService.loadUnit(identifier)
      
      console.log('[SingleUnitProvider] Unit loaded successfully:', {
        unitId: result.unitId,
        source: result.source,
        hasCompleteState: result.hasCompleteState
      })
      
      // Set up unit state
      setUnit(result.unitManager)
      setStateManager(result.stateManager)
      setLoadedUnitId(result.unitId)
      
      // Extract chassis and model from configuration
      const config = result.unitManager.getConfiguration()
      setLoadedChassis(config.chassis)
      setLoadedModel(config.model)
      
      // Subscribe to unit changes for re-rendering
      const unsubscribe = result.unitManager.subscribe(() => {
        console.log('[SingleUnitProvider] Unit state changed, forcing re-render')
        forceUpdate()
        
        // Call change callback
        if (onUnitChange) {
          onUnitChange(result.unitManager)
        }
      })
      
      // Store unsubscribe function for cleanup
      ;(result.unitManager as any)._singleUnitUnsubscribe = unsubscribe
      
      setIsConfigLoaded(true)
      setIsLoading(false)
      
      // Call load callback
      if (onUnitLoad) {
        onUnitLoad(result)
      }
      
    } catch (error) {
      console.error('[SingleUnitProvider] Error loading unit:', error)
      setIsLoading(false)
      
      if (onError) {
        onError(error as Error)
      }
    }
  }, [unitId, chassis, model, tabId, onUnitLoad, onUnitChange, onError])
  
  // Save unit function
  const saveUnit = useCallback(() => {
    if (!unit || !loadedChassis || !loadedModel) {
      console.warn('[SingleUnitProvider] Cannot save: missing unit or chassis/model')
      return
    }
    
    try {
      console.log('[SingleUnitProvider] Saving unit:', loadedChassis, loadedModel)
      
      const savedUnitId = UnitPersistenceService.saveUnit(unit, loadedChassis, loadedModel)
      
      console.log('[SingleUnitProvider] Unit saved with ID:', savedUnitId)
      
      // Update loaded unit ID if it changed
      if (savedUnitId !== loadedUnitId) {
        setLoadedUnitId(savedUnitId)
      }
      
      if (onSave) {
        onSave(savedUnitId)
      }
      
    } catch (error) {
      console.error('[SingleUnitProvider] Error saving unit:', error)
      
      if (onError) {
        onError(error as Error)
      }
    }
  }, [unit, loadedChassis, loadedModel, loadedUnitId, onSave, onError])
  
  // Context value with unit operations
  const contextValue: SingleUnitContextValue = {
    // Unit data (fresh from unit each render)
    unit,
    engineType: unit?.getEngineType() || null,
    gyroType: (unit?.getGyroType() as GyroType) || null,
    unallocatedEquipment: unit?.getUnallocatedEquipment() || [],
    validation: stateManager?.getUnitSummary().validation || null,
    summary: stateManager?.getUnitSummary().summary || null,
    isConfigLoaded,
    selectedEquipmentId,
    
    // Unit metadata
    unitId: loadedUnitId,
    chassis: loadedChassis,
    model: loadedModel,
    
    // Unit operations
    changeEngine: (engineType: EngineType) => {
      if (!stateManager) return
      stateManager.handleEngineChange(engineType)
      forceUpdate()
      
      if (autoSaveEnabled) {
        setTimeout(saveUnit, saveDelay)
      }
    },
    
    changeGyro: (gyroType: GyroType) => {
      if (!stateManager) return
      stateManager.handleGyroChange(gyroType)
      forceUpdate()
      
      if (autoSaveEnabled) {
        setTimeout(saveUnit, saveDelay)
      }
    },
    
    updateConfiguration: (config: UnitConfiguration) => {
      if (!unit) return
      
      console.log('[SingleUnitProvider] Updating configuration:', config)
      
      unit.updateConfiguration(config)
      
      // Update chassis/model if they changed
      if (config.chassis && config.model) {
        setLoadedChassis(config.chassis)
        setLoadedModel(config.model)
      }
      
      forceUpdate()
      
      if (autoSaveEnabled) {
        setTimeout(saveUnit, saveDelay)
      }
    },
    
    addTestEquipment: (equipment: EquipmentAllocation, location: string, startSlot?: number) => {
      if (!stateManager) return false
      
      const result = stateManager.addTestEquipment(equipment, location, startSlot)
      
      if (result) {
        forceUpdate()
        
        if (autoSaveEnabled) {
          setTimeout(saveUnit, saveDelay)
        }
      }
      
      return result
    },
    
    addEquipmentToUnit: (equipment: EquipmentAllocation) => {
      if (!stateManager) return
      
      stateManager.addUnallocatedEquipment(equipment)
      forceUpdate()
      
      if (autoSaveEnabled) {
        setTimeout(saveUnit, saveDelay)
      }
    },
    
    removeEquipment: (equipmentGroupId: string) => {
      if (!stateManager) return false
      
      const result = stateManager.removeEquipment(equipmentGroupId)
      
      if (result) {
        forceUpdate()
        
        if (autoSaveEnabled) {
          setTimeout(saveUnit, saveDelay)
        }
      }
      
      return result
    },
    
    resetUnit: (config?: UnitConfiguration) => {
      if (!stateManager) return
      
      stateManager.resetUnit(config)
      forceUpdate()
      
      if (autoSaveEnabled) {
        setTimeout(saveUnit, saveDelay)
      }
    },
    
    selectEquipment: (equipmentGroupId: string | null) => {
      setSelectedEquipmentId(equipmentGroupId)
    },
    
    assignSelectedEquipment: (location: string, slotIndex: number) => {
      if (!selectedEquipmentId || !unit) return false
      
      console.log(`[SingleUnitProvider] Assigning equipment ${selectedEquipmentId} to ${location} slot ${slotIndex}`)
      
      const success = unit.allocateEquipmentFromPool(selectedEquipmentId, location, slotIndex)
      
      if (success) {
        setSelectedEquipmentId(null)
        forceUpdate()
        
        if (autoSaveEnabled) {
          setTimeout(saveUnit, saveDelay)
        }
      }
      
      return success
    },
    
    getDebugInfo: () => {
      return stateManager?.getDebugInfo() || null
    },
    
    // Save operations
    saveUnit,
    autoSave: autoSaveEnabled,
    setAutoSave: setAutoSaveEnabled
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading unit...</div>
      </div>
    )
  }
  
  // Show error state if unit failed to load
  if (!unit) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-red-400">Failed to load unit</div>
      </div>
    )
  }
  
  return (
    <SingleUnitContext.Provider value={contextValue}>
      {children}
    </SingleUnitContext.Provider>
  )
}

/**
 * Hook to access single unit context
 */
export function useSingleUnit(): SingleUnitContextValue {
  const context = useContext(SingleUnitContext)
  if (!context) {
    throw new Error('useSingleUnit must be used within SingleUnitProvider')
  }
  return context
}

/**
 * Legacy compatibility hook - same interface as useUnit() from MultiUnitProvider
 */
export function useUnit() {
  const singleUnit = useSingleUnit()
  
  if (!singleUnit.unit) {
    throw new Error('No unit available')
  }
  
  return {
    unit: singleUnit.unit,
    engineType: singleUnit.engineType!,
    gyroType: singleUnit.gyroType!,
    unallocatedEquipment: singleUnit.unallocatedEquipment,
    validation: singleUnit.validation,
    summary: singleUnit.summary,
    isConfigLoaded: singleUnit.isConfigLoaded,
    selectedEquipmentId: singleUnit.selectedEquipmentId,
    changeEngine: singleUnit.changeEngine,
    changeGyro: singleUnit.changeGyro,
    updateConfiguration: singleUnit.updateConfiguration,
    addTestEquipment: singleUnit.addTestEquipment,
    addEquipmentToUnit: singleUnit.addEquipmentToUnit,
    removeEquipment: singleUnit.removeEquipment,
    resetUnit: singleUnit.resetUnit,
    selectEquipment: singleUnit.selectEquipment,
    assignSelectedEquipment: singleUnit.assignSelectedEquipment,
    getDebugInfo: singleUnit.getDebugInfo
  }
}
