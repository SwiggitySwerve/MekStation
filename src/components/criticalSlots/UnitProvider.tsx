/**
 * Unit Provider - React Context provider for critical slots system
 * Manages the state manager and provides context to components
 */

import React, { createContext, useContext, useMemo, useReducer, useEffect, useRef, useCallback, useState } from 'react'
import { UnitStateManager } from '../../utils/criticalSlots/UnitStateManager'
import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager'
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'
import { EngineType, GyroType } from '../../types/systemComponents'
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot'

interface UnitContextValue {
  unit: UnitCriticalManager
  engineType: EngineType
  gyroType: GyroType
  unallocatedEquipment: EquipmentAllocation[]
  validation: Record<string, unknown>
  summary: Record<string, unknown>
  // Loading state
  isConfigLoaded: boolean
  // Selection state
  selectedEquipmentId: string | null
  // Action functions
  changeEngine: (engineType: EngineType) => void
  changeGyro: (gyroType: GyroType) => void
  updateConfiguration: (config: UnitConfiguration) => void
  addTestEquipment: (equipment: EquipmentAllocation, location: string, startSlot?: number) => boolean
  addEquipmentToUnit: (equipment: EquipmentAllocation) => void
  removeEquipment: (equipmentGroupId: string) => boolean
  resetUnit: (config?: UnitConfiguration) => void
  // Selection functions
  selectEquipment: (equipmentGroupId: string | null) => void
  assignSelectedEquipment: (location: string, slotIndex: number) => boolean
  // Debug functions
  getDebugInfo: () => any
}

const UnitContext = createContext<UnitContextValue | null>(null)

interface UnitProviderProps {
  children: React.ReactNode
  initialConfiguration?: UnitConfiguration
}

export function UnitProvider({ children, initialConfiguration }: UnitProviderProps) {
  // Force update mechanism with loop protection
  const [updateCount, forceUpdate] = useReducer(x => x + 1, 0)
  
  // Selection state
  const [selectedEquipmentId, setSelectedEquipmentId] = React.useState<string | null>(null)
  
  // Loop detection state
  const loopDetection = useRef({
    lastUpdateTime: 0,
    recentUpdates: 0,
    isThrottled: false
  })
  
  // State for hydration-safe configuration loading
  const [isClient, setIsClient] = useState(false)
  const [isConfigLoaded, setIsConfigLoaded] = useState(false)
  const [persistedConfig, setPersistedConfig] = useState<UnitConfiguration | undefined>(initialConfiguration)
  
  // Load persisted configuration from localStorage (client-side only)
  const loadPersistedConfiguration = (): UnitConfiguration | undefined => {
    try {
      const saved = localStorage.getItem('battletech-unit-configuration')
      if (saved) {
        const parsed = JSON.parse(saved)
        console.log('Loaded persisted configuration:', parsed)
        return parsed
      }
    } catch (error) {
      console.warn('Failed to load persisted configuration:', error)
    }
    
    return initialConfiguration
  }
  
  // Save configuration to localStorage
  const saveConfiguration = (config: UnitConfiguration) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem('battletech-unit-configuration', JSON.stringify(config))
      console.log('Saved configuration to localStorage:', config)
    } catch (error) {
      console.warn('Failed to save configuration:', error)
    }
  }
  
  // Load from localStorage after hydration to prevent mismatch
  useEffect(() => {
    setIsClient(true)
    const loaded = loadPersistedConfiguration()
    if (loaded) {
      setPersistedConfig(loaded)
    }
    // Mark config as loaded regardless of whether we found saved data
    setIsConfigLoaded(true)
  }, [])
  
  // Create state manager once, never recreate
  const stateManager = useMemo(() => {
    console.log('Creating new UnitStateManager...')
    return new UnitStateManager(persistedConfig)
  }, []) // Empty dependency array - only create once
  
  // Update state manager when persisted config loads
  useEffect(() => {
    if (isClient && persistedConfig && persistedConfig !== initialConfiguration) {
      console.log('Updating state manager with persisted configuration...')
      stateManager.handleConfigurationUpdate(persistedConfig)
    }
  }, [isClient, persistedConfig, stateManager])
  
  // Protected force update with loop detection
  const safeForceUpdate = useCallback(() => {
    const now = Date.now()
    const timeSinceLastUpdate = now - loopDetection.current.lastUpdateTime
    
    // Reset counter if enough time has passed (1 second)
    if (timeSinceLastUpdate > 1000) {
      loopDetection.current.recentUpdates = 0
      loopDetection.current.isThrottled = false
    }
    
    // Increment update counter
    loopDetection.current.recentUpdates++
    loopDetection.current.lastUpdateTime = now
    
    // Throttle if too many updates (>10 per second)
    if (loopDetection.current.recentUpdates > 10) {
      if (!loopDetection.current.isThrottled) {
        console.warn(`UnitProvider: Throttling updates due to potential loop (${loopDetection.current.recentUpdates} updates in ${timeSinceLastUpdate}ms)`)
        loopDetection.current.isThrottled = true
      }
      
      // Only allow updates every 100ms when throttled
      if (timeSinceLastUpdate < 100) {
        return
      }
    }
    
    console.log('State manager notified, forcing re-render...')
    forceUpdate()
  }, [])
  
  // Subscribe to state manager changes with loop protection
  useEffect(() => {
    console.log('Setting up state manager subscription...')
    const unsubscribe = stateManager.subscribe(safeForceUpdate)
    
    return () => {
      console.log('Cleaning up state manager subscription...')
      unsubscribe()
    }
  }, [stateManager, safeForceUpdate])
  
  // Compute context value fresh on each render after state changes
  const unit = stateManager.getCurrentUnit()
  const summary = stateManager.getUnitSummary()
  
  const contextValue = useMemo(() => {
    console.log('Computing new context value...')
    
    return {
      unit,
      engineType: unit.getEngineType(),
      gyroType: unit.getGyroType() as GyroType,
      unallocatedEquipment: unit.getUnallocatedEquipment(),
      validation: (summary.validation || {}) as Record<string, unknown>,
      summary: (summary.summary || {}) as unknown as Record<string, unknown>,
      // Loading state
      isConfigLoaded,
      // Selection state
      selectedEquipmentId,
      // Action functions
      changeEngine: (engineType: EngineType) => {
        console.log(`Context: Changing engine to ${engineType}`)
        stateManager.handleEngineChange(engineType)
      },
      changeGyro: (gyroType: GyroType) => {
        console.log(`Context: Changing gyro to ${gyroType}`)
        stateManager.handleGyroChange(gyroType)
      },
      updateConfiguration: (config: UnitConfiguration) => {
        console.log(`Context: Updating configuration`, config)
        stateManager.handleConfigurationUpdate(config)
        // Save configuration to localStorage after update
        saveConfiguration(config)
      },
      addTestEquipment: (equipment: EquipmentAllocation, location: string, startSlot?: number) => {
        console.log(`Context: Adding equipment ${equipment.equipmentData?.name || 'Unknown'} to ${location}`)
        const testEquipment = {
          name: equipment.equipmentData?.name || 'Unknown',
          requiredSlots: equipment.occupiedSlots?.length || 1
        }
        return stateManager.addTestEquipment(testEquipment, location, startSlot)
      },
      addEquipmentToUnit: (equipment: EquipmentAllocation) => {
        console.log(`Context: Adding equipment ${equipment.equipmentData?.name || 'Unknown'} to unit as unallocated`)
        stateManager.addUnallocatedEquipment(equipment)
      },
      removeEquipment: (equipmentGroupId: string) => {
        console.log(`Context: Removing equipment ${equipmentGroupId}`)
        return stateManager.removeEquipment(equipmentGroupId)
      },
      resetUnit: (config?: UnitConfiguration) => {
        console.log('Context: Resetting unit')
        stateManager.resetUnit(config)
      },
      // Selection functions
      selectEquipment: (equipmentGroupId: string | null) => {
        console.log(`Context: Selecting equipment ${equipmentGroupId}`)
        setSelectedEquipmentId(equipmentGroupId)
      },
      assignSelectedEquipment: (location: string, slotIndex: number): boolean => {
        if (!selectedEquipmentId) {
          console.log('Context: No equipment selected for assignment')
          return false
        }
        
        console.log(`Context: Assigning equipment ${selectedEquipmentId} to ${location} slot ${slotIndex + 1}`)
        const success = stateManager.getCurrentUnit().allocateEquipmentFromPool(selectedEquipmentId, location, slotIndex)
        
        if (success) {
          setSelectedEquipmentId(null) // Clear selection after successful assignment
          forceUpdate() // Force re-render
        }
        
        return success
      },
      getDebugInfo: () => stateManager.getDebugInfo()
    }
  }, [stateManager, unit, summary, selectedEquipmentId, isConfigLoaded]) // Include all dependencies
  
  return (
    <UnitContext.Provider value={contextValue}>
      {children}
    </UnitContext.Provider>
  )
}

// Custom hook for consuming the context
export function useUnit(): UnitContextValue {
  const context = useContext(UnitContext)
  if (!context) {
    throw new Error('useUnit must be used within UnitProvider')
  }
  return context
}
