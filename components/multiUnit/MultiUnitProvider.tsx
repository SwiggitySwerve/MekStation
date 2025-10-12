/**
 * Multi-Unit Provider - Manages multiple unit instances with independent tabs
 * Each tab maintains its own UnitCriticalManager and UnitStateManager
 * Enhanced with comprehensive persistence and debounced saving
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react'
import { UnitStateManager } from '../../utils/criticalSlots/UnitStateManager'
import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager'
import { UnitConfiguration, CompleteUnitState } from '../../utils/criticalSlots/UnitCriticalManagerTypes'
import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../../types/components'
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot'
import { MultiTabDebouncedSaveManager, SaveManagerBrowserHandlers } from '../../utils/DebouncedSaveManager'
import { componentUpdateAdapter } from '../../services/ComponentUpdateAdapter'

// Tab unit interface
export interface TabUnit {
  id: string
  name: string
  unitManager: UnitCriticalManager
  stateManager: UnitStateManager
  created: Date
  modified: Date
  isModified: boolean
}

// Multi-unit state interface
interface MultiUnitState {
  tabs: TabUnit[]
  activeTabId: string | null
  nextTabNumber: number
}

// Action types for proper state management
type MultiUnitAction = 
  | { type: 'CREATE_TAB'; payload: { id: string; name: string; unitManager: UnitCriticalManager; stateManager: UnitStateManager } }
  | { type: 'SET_ACTIVE_TAB'; payload: { tabId: string } }
  | { type: 'UPDATE_TAB_CONFIG'; payload: { tabId: string; config: UnitConfiguration } }
  | { type: 'CLOSE_TAB'; payload: { tabId: string } }
  | { type: 'RENAME_TAB'; payload: { tabId: string; newName: string } }
  | { type: 'DUPLICATE_TAB'; payload: { sourceTabId: string; newTabId: string; newName: string; unitManager: UnitCriticalManager; stateManager: UnitStateManager } }
  | { type: 'SET_NEXT_TAB_NUMBER'; payload: { nextNumber: number } }
  | { type: 'INITIALIZE_TABS'; payload: { tabs: TabUnit[]; activeTabId: string | null; nextTabNumber: number } }

// Context value interface
interface MultiUnitContextValue {
  // State
  tabs: TabUnit[]
  activeTab: TabUnit | null
  activeTabId: string | null
  
  // Tab management
  createTab: (name?: string, config?: UnitConfiguration) => string
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  renameTab: (tabId: string, newName: string) => void
  duplicateTab: (tabId: string) => string
  
  // Active tab unit operations (proxy to current tab's unit)
  unit: UnitCriticalManager | null
  engineType: EngineType | null
  gyroType: GyroType | null
  unallocatedEquipment: EquipmentAllocation[]
  validation: Record<string, unknown>
  summary: Record<string, unknown>
  isConfigLoaded: boolean
  selectedEquipmentId: string | null
  unitVersion: number // CRITICAL: Include unit version to force re-renders
  
  // Active tab action functions
  changeEngine: (engineType: EngineType) => void
  changeGyro: (gyroType: GyroType) => void
  changeStructure: (structureType: StructureType) => void
  changeArmor: (armorType: ArmorType) => void
  changeHeatSink: (heatSinkType: HeatSinkType) => void
  changeJumpJet: (jumpJetType: string) => void
  updateConfiguration: (config: UnitConfiguration) => void
  addTestEquipment: (equipment: EquipmentAllocation, location: string, startSlot?: number) => boolean
  addEquipmentToUnit: (equipment: EquipmentAllocation) => void
  removeEquipment: (equipmentGroupId: string) => boolean
  resetUnit: (config?: UnitConfiguration) => void
  selectEquipment: (equipmentGroupId: string | null) => void
  assignSelectedEquipment: (location: string, slotIndex: number) => boolean
  getDebugInfo: () => Record<string, unknown>
}

const MultiUnitContext = createContext<MultiUnitContextValue | null>(null)

// Standard BattleTech default configuration for new units
const createDefaultConfiguration = (): UnitConfiguration => ({
  // Standard BattleTech defaults - 50-ton mech with standard components
  chassis: 'Standard',
  model: '50-ton BattleMech',
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
    CT: { front: 20, rear: 6 },
    LT: { front: 16, rear: 5 },
    RT: { front: 16, rear: 5 },
    LA: { front: 16, rear: 0 },
    RA: { front: 16, rear: 0 },
    LL: { front: 20, rear: 0 },
    RL: { front: 20, rear: 0 }
  },
  armorTonnage: 8.0,
  externalHeatSinks: 2,
  heatSinkType: createComponentConfiguration('heatSink', 'Single')!,
  totalHeatSinks: 10,
  internalHeatSinks: 8,
  jumpMP: 0,
  jumpJetType: createComponentConfiguration('jumpJet', 'Standard Jump Jet')!,
  jumpJetCounts: {},
  hasPartialWing: false,
  enhancements: [],
  mass: 50
})

// Storage keys
const TABS_METADATA_KEY = 'battletech-tabs-metadata'
const TAB_DATA_PREFIX = 'battletech-unit-tab-'
const LEGACY_CONFIG_KEY = 'battletech-unit-configuration'

// Enhanced storage keys for complete state
const COMPLETE_STATE_PREFIX = 'battletech-complete-state-'

interface TabsMetadata {
  activeTabId: string | null
  nextTabNumber: number
  tabOrder: string[]
  tabNames: Record<string, string>
  version?: string  // For future migration support
}

// Enhanced tab data interface
interface EnhancedTabData {
  completeState?: CompleteUnitState  // New complete state format
  config?: UnitConfiguration         // Legacy configuration format
  modified: string
  version: string
}

// CRITICAL: Implement reducer function for proper state management
function multiUnitReducer(state: MultiUnitState, action: MultiUnitAction): MultiUnitState {
  switch (action.type) {
    case 'CREATE_TAB': {
      const newTab: TabUnit = {
        id: action.payload.id,
        name: action.payload.name,
        unitManager: action.payload.unitManager,
        stateManager: action.payload.stateManager,
        created: new Date(),
        modified: new Date(),
        isModified: false
      }
      
      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: action.payload.id,
        nextTabNumber: state.nextTabNumber + 1
      }
    }
    
    case 'SET_ACTIVE_TAB': {
      return {
        ...state,
        activeTabId: action.payload.tabId
      }
    }
    
    case 'UPDATE_TAB_CONFIG': {
      const updatedTabs = state.tabs.map(tab => {
        if (tab.id === action.payload.tabId) {
          return {
            ...tab,
            unitManager: tab.unitManager,
            isModified: true,
            modified: new Date()
          }
        }
        return tab
      })
      
      return {
        ...state,
        tabs: updatedTabs
      }
    }
    
    case 'CLOSE_TAB': {
      const remainingTabs = state.tabs.filter(tab => tab.id !== action.payload.tabId)
      let newActiveTabId = state.activeTabId
      
      // If we're closing the active tab, switch to another tab
      if (state.activeTabId === action.payload.tabId) {
        newActiveTabId = remainingTabs.length > 0 ? remainingTabs[0].id : null
      }
      
      return {
        ...state,
        tabs: remainingTabs,
        activeTabId: newActiveTabId
      }
    }
    
    case 'RENAME_TAB': {
      const updatedTabs = state.tabs.map(tab => {
        if (tab.id === action.payload.tabId) {
          return {
            ...tab,
            name: action.payload.newName,
            modified: new Date()
          }
        }
        return tab
      })
      
      return {
        ...state,
        tabs: updatedTabs
      }
    }
    
    case 'DUPLICATE_TAB': {
      const newTab: TabUnit = {
        id: action.payload.newTabId,
        name: action.payload.newName,
        unitManager: action.payload.unitManager,
        stateManager: action.payload.stateManager,
        created: new Date(),
        modified: new Date(),
        isModified: false
      }
      
      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: action.payload.newTabId,
        nextTabNumber: state.nextTabNumber + 1
      }
    }
    
    case 'SET_NEXT_TAB_NUMBER': {
      return {
        ...state,
        nextTabNumber: action.payload.nextNumber
      }
    }
    
    case 'INITIALIZE_TABS': {
      return {
        ...state,
        tabs: action.payload.tabs,
        activeTabId: action.payload.activeTabId,
        nextTabNumber: action.payload.nextTabNumber
      }
    }
    
    default:
      return state
  }
}

interface MultiUnitProviderProps {
  children: React.ReactNode
}

export function MultiUnitProvider({ children }: MultiUnitProviderProps) {
  // CRITICAL: Implement proper reducer pattern for complex state management
  const [state, dispatch] = useReducer(multiUnitReducer, {
    tabs: [],
    activeTabId: null,
    nextTabNumber: 1
  })
  
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // CRITICAL FIX: Add unit version to force context value changes
  const [unitVersion, setUnitVersion] = useState(0)
  
  // PROPER ARCHITECTURE: No manual state versioning needed
  // React will naturally re-render when unit reference changes
  
  // Debounced save manager with 1-second delay
  const [saveManager] = useState(() => new MultiTabDebouncedSaveManager(1000))
  
  // Initialize browser event handlers for save flushing
  useEffect(() => {
    if (isClient) {
      const browserHandlers = SaveManagerBrowserHandlers.getInstance()
      browserHandlers.attachSaveManager(saveManager)
      
      return () => {
        browserHandlers.detachSaveManager()
      }
    }
  }, [isClient, saveManager])
  
  // Initialize on client-side
  useEffect(() => {
    setIsClient(true)
    initializeTabs()
  }, [])
  
  // Initialize tabs from storage or create default
  const initializeTabs = useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      // Check for existing tabs
      const metadataStr = localStorage.getItem(TABS_METADATA_KEY)
      
      if (metadataStr) {
        // Load existing tabs
        const metadata: TabsMetadata = JSON.parse(metadataStr)
        const tabs: TabUnit[] = []
        
        for (const tabId of metadata.tabOrder) {
          const { config } = loadTabData(tabId)
          const tab = createTabFromDataEnhanced(tabId, metadata.tabNames[tabId] || 'New Mech', config)
          tabs.push(tab)
        }
        
        // Update state with loaded tabs
        dispatch({
          type: 'INITIALIZE_TABS',
          payload: {
            tabs,
            activeTabId: metadata.activeTabId,
            nextTabNumber: metadata.nextTabNumber
          }
        })
        
        console.log(`[MultiUnitProvider] Loaded ${tabs.length} existing tabs from storage`)
      } else {
        // No existing tabs, create a new one with standard configuration
        console.log('[MultiUnitProvider] No existing tabs found, creating new tab with standard configuration')
        
        const standardConfig = createDefaultConfiguration()
        const newTab = createTabFromDataEnhanced('tab-1', 'Standard BattleMech', standardConfig)
        
        // Set as the only tab
        const metadata: TabsMetadata = {
          tabOrder: [newTab.id],
          tabNames: { [newTab.id]: 'Standard BattleMech' },
          activeTabId: newTab.id,
          nextTabNumber: 2
        }
        
        // Save to storage
        localStorage.setItem(TABS_METADATA_KEY, JSON.stringify(metadata))
        saveTabData(newTab.id, standardConfig)
        
        // Update state
        dispatch({
          type: 'INITIALIZE_TABS',
          payload: {
            tabs: [newTab],
            activeTabId: newTab.id,
            nextTabNumber: 2
          }
        })
        
        console.log('[MultiUnitProvider] Initialized with new standard BattleMech configuration')
      }
    } catch (error) {
      console.error('[MultiUnitProvider] Error initializing tabs:', error)
      // Fallback: create minimal tab
      const fallbackTab = createTabFromDataEnhanced('tab-1', 'Fallback Mech', createDefaultConfiguration())
      dispatch({
        type: 'INITIALIZE_TABS',
        payload: {
          tabs: [fallbackTab],
          activeTabId: fallbackTab.id,
          nextTabNumber: 2
        }
      })
    }
    
    setIsInitialized(true)
  }, [])
  
  // Force update mechanism for tab state changes
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  // Create tab from configuration data
  const createTabFromData = (id: string, name: string, config: UnitConfiguration): TabUnit => {
    const stateManager = new UnitStateManager(config)
    const unitManager = stateManager.getCurrentUnit()
    
    // Subscribe to unit state changes and trigger saves
    const unsubscribe = unitManager.subscribe(() => {
      console.log(`[MultiUnitProvider] Unit state changed for tab ${id}, forcing re-render and saving state`)
      forceUpdate()
      
      // CRITICAL FIX: Save state whenever unit changes
      saveCompleteState(id, unitManager)
    })
    
    // Store unsubscribe function on the unit manager for cleanup
    ;(unitManager as any)._unsubscribe = unsubscribe
    
    return {
      id,
      name,
      unitManager,
      stateManager,
      created: new Date(),
      modified: new Date(),
      isModified: false
    }
  }
  
  // Save tabs metadata to localStorage
  const saveTabsMetadata = (metadata: TabsMetadata) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(TABS_METADATA_KEY, JSON.stringify(metadata))
    } catch (error) {
      console.warn('Failed to save tabs metadata:', error)
    }
  }
  
  // Enhanced save methods with complete state serialization and debounced saving
  
  /**
   * Save individual tab data with complete state (legacy config for compatibility)
   */
  const saveTabData = (tabId: string, config: UnitConfiguration) => {
    if (typeof window === 'undefined') return
    try {
      const tabData: EnhancedTabData = {
        config, // Legacy format for backward compatibility
        modified: new Date().toISOString(),
        version: '1.0.0'
      }
      localStorage.setItem(`${TAB_DATA_PREFIX}${tabId}`, JSON.stringify(tabData))
    } catch (error) {
      console.warn('Failed to save tab data:', error)
    }
  }

  /**
   * Save complete unit state directly to localStorage
   */
  const saveCompleteState = (tabId: string, unitManager: UnitCriticalManager) => {
    if (typeof window === 'undefined') return
    
    try {
      console.log(`[MultiUnitProvider] Starting to save complete state for tab ${tabId}`)
      const completeState = unitManager.serializeCompleteState()
      console.log(`[MultiUnitProvider] Serialized state for tab ${tabId}:`, completeState)
      
      const tabData: EnhancedTabData = {
        completeState,
        config: completeState.configuration, // Keep legacy config for compatibility
        modified: new Date().toISOString(),
        version: '2.0.0' // New version with complete state
      }
      
      const key = `${COMPLETE_STATE_PREFIX}${tabId}`
      const dataString = JSON.stringify(tabData)
      localStorage.setItem(key, dataString)
      
      // Verify the save worked
      const savedData = localStorage.getItem(key)
      if (savedData) {
        console.log(`[MultiUnitProvider] Successfully saved complete state for tab ${tabId}`)
        console.log(`[MultiUnitProvider] Saved data size: ${savedData.length} characters`)
      } else {
        console.error(`[MultiUnitProvider] Failed to save complete state for tab ${tabId} - data not found in localStorage`)
      }
    } catch (error) {
      console.error('Failed to save complete state:', error)
    }
  }

  /**
   * Save complete state immediately (for critical operations)
   */
  const saveCompleteStateImmediately = (tabId: string, unitManager: UnitCriticalManager) => {
    if (typeof window === 'undefined') return
    
    try {
      const completeState = unitManager.serializeCompleteState()
      const tabData: EnhancedTabData = {
        completeState,
        config: completeState.configuration,
        modified: new Date().toISOString(),
        version: '2.0.0'
      }
      localStorage.setItem(`${COMPLETE_STATE_PREFIX}${tabId}`, JSON.stringify(tabData))
      console.log(`[MultiUnitProvider] Saved complete state immediately for tab ${tabId}`)
    } catch (error) {
      console.error('Failed to save complete state immediately:', error)
    }
  }

  /**
   * Load tab data with complete state support and legacy migration
   */
  const loadTabData = (tabId: string): { config: UnitConfiguration, hasCompleteState: boolean } => {
    if (typeof window === 'undefined') {
      return { config: createDefaultConfiguration(), hasCompleteState: false }
    }

    console.log(`[MultiUnitProvider] Loading tab data for ${tabId}`)

    try {
      // Try to load complete state first
      const completeStateKey = `${COMPLETE_STATE_PREFIX}${tabId}`
      const completeStateStr = localStorage.getItem(completeStateKey)
      console.log(`[MultiUnitProvider] Complete state key: ${completeStateKey}`)
      console.log(`[MultiUnitProvider] Complete state found: ${!!completeStateStr}`)
      
      if (completeStateStr) {
        try {
          const tabData: EnhancedTabData = JSON.parse(completeStateStr)
          console.log(`[MultiUnitProvider] Parsed tab data for ${tabId}:`, tabData)
          
          if (tabData.completeState && tabData.completeState.configuration) {
            console.log(`[MultiUnitProvider] Loaded complete state for tab ${tabId}`)
            console.log(`[MultiUnitProvider] Configuration from complete state:`, tabData.completeState.configuration)
            return { 
              config: tabData.completeState.configuration, 
              hasCompleteState: true
            }
          } else {
            console.warn(`[MultiUnitProvider] Complete state for tab ${tabId} is missing configuration, falling back to legacy`)
          }
        } catch (parseError) {
          console.error(`[MultiUnitProvider] Failed to parse complete state for tab ${tabId}:`, parseError)
          // Remove corrupted data
          localStorage.removeItem(completeStateKey)
        }
      }

      // Fallback to legacy configuration format
      const legacyKey = `${TAB_DATA_PREFIX}${tabId}`
      const legacyDataStr = localStorage.getItem(legacyKey)
      console.log(`[MultiUnitProvider] Legacy key: ${legacyKey}`)
      console.log(`[MultiUnitProvider] Legacy data found: ${!!legacyDataStr}`)
      
      if (legacyDataStr) {
        try {
          const legacyData = JSON.parse(legacyDataStr)
          if (legacyData.config) {
            console.log(`[MultiUnitProvider] Loaded legacy config for tab ${tabId}`)
            console.log(`[MultiUnitProvider] Legacy configuration:`, legacyData.config)
            return { 
              config: legacyData.config, 
              hasCompleteState: false
            }
          } else {
            console.warn(`[MultiUnitProvider] Legacy data for tab ${tabId} is missing config`)
          }
        } catch (parseError) {
          console.error(`[MultiUnitProvider] Failed to parse legacy data for tab ${tabId}:`, parseError)
          // Remove corrupted data
          localStorage.removeItem(legacyKey)
        }
      }

    } catch (error) {
      console.error(`[MultiUnitProvider] Failed to load tab data for ${tabId}:`, error)
    }

    console.log(`[MultiUnitProvider] No saved state found for tab ${tabId}, using default configuration`)
    const defaultConfig = createDefaultConfiguration()
    console.log(`[MultiUnitProvider] Default configuration:`, defaultConfig)
    return { config: defaultConfig, hasCompleteState: false }
  }

  /**
   * Create tab from data with complete state restoration
   */
  const createTabFromDataEnhanced = (id: string, name: string, config: UnitConfiguration): TabUnit => {
    // CRITICAL FIX: Always load the actual saved data instead of using the passed config
    const { config: savedConfig, hasCompleteState } = loadTabData(id)
    
    // Use the saved configuration if available, otherwise fall back to the passed config
    const actualConfig = savedConfig || config
    console.log(`[MULTI_UNIT_DEBUG] 🏭 Creating tab ${id} with config:`, {
      structureType: actualConfig.structureType,
      armorType: actualConfig.armorType,
      techBase: actualConfig.techBase
    })
    
    const stateManager = new UnitStateManager(actualConfig)
    const unitManager = stateManager.getCurrentUnit()
    
    // Check if we have complete state to restore
    if (hasCompleteState) {
      try {
        const completeStateStr = localStorage.getItem(`${COMPLETE_STATE_PREFIX}${id}`)
        if (completeStateStr) {
          const tabData: EnhancedTabData = JSON.parse(completeStateStr)
          if (tabData.completeState) {
            console.log(`[MultiUnitProvider] Restoring complete state for tab ${id}`)
            const success = unitManager.deserializeCompleteState(tabData.completeState)
            if (success) {
              console.log(`[MultiUnitProvider] Successfully restored complete state for tab ${id}`)
              console.log(`[MultiUnitProvider] Restored configuration:`, unitManager.getConfiguration())
            } else {
              console.warn(`[MultiUnitProvider] Failed to restore complete state for tab ${id}, using config only`)
            }
          }
        }
      } catch (error) {
        console.error(`[MultiUnitProvider] Error restoring complete state for tab ${id}:`, error)
      }
    } else {
      console.log(`[MultiUnitProvider] No complete state found for tab ${id}, using configuration only`)
    }

    // CRITICAL FIX: Subscribe to unit state changes and trigger saves
    const unsubscribe = unitManager.subscribe(() => {
      console.log(`[MultiUnitProvider] Unit state changed for tab ${id}, forcing re-render and saving state`)
      forceUpdate()
      
      // Save state whenever unit changes
      saveCompleteState(id, unitManager)
    })
    
    // Store unsubscribe function on the unit manager for cleanup
    ;(unitManager as any)._unsubscribe = unsubscribe

    return {
      id,
      name,
      unitManager,
      stateManager,
      created: new Date(),
      modified: new Date(),
      isModified: false
    }
  }
  
  // Create new tab
  const createTab = useCallback((name?: string, config?: UnitConfiguration): string => {
    const tabId = `tab-${state.nextTabNumber}`
    const tabName = name || `New Mech ${state.nextTabNumber === 1 ? '' : state.nextTabNumber}`.trim()
    const tabConfig = config || createDefaultConfiguration()
    
    const newTab = createTabFromDataEnhanced(tabId, tabName, tabConfig)
    
    const newTabs = [...state.tabs, newTab]
    
    dispatch({
      type: 'CREATE_TAB',
      payload: {
        id: tabId,
        name: tabName,
        unitManager: newTab.unitManager,
        stateManager: newTab.stateManager
      }
    })
    
    dispatch({
      type: 'SET_ACTIVE_TAB',
      payload: { tabId }
    })
    
    dispatch({
      type: 'SET_NEXT_TAB_NUMBER',
      payload: { nextNumber: state.nextTabNumber + 1 }
    })
    
    // Save to localStorage
    const metadata: TabsMetadata = {
      activeTabId: tabId,
      nextTabNumber: state.nextTabNumber + 1,
      tabOrder: newTabs.map(t => t.id),
      tabNames: Object.fromEntries(newTabs.map(t => [t.id, t.name]))
    }
    
    saveTabsMetadata(metadata)
    saveTabData(tabId, tabConfig)
    
    return tabId
  }, [state])
  
  // Close tab
  const closeTab = useCallback((tabId: string) => {
    if (state.tabs.length <= 1) {
      // Don't close the last tab, just reset it
      const tab = state.tabs[0]
      if (tab) {
        const defaultConfig = createDefaultConfiguration()
        tab.unitManager.updateConfiguration(defaultConfig)
        tab.name = 'New Mech'
        tab.isModified = false
        tab.modified = new Date()
        
        dispatch({
          type: 'UPDATE_TAB_CONFIG',
          payload: { 
            tabId: tab.id, 
            config: defaultConfig 
          }
        })
        
        saveTabData(tab.id, defaultConfig)
      }
      return
    }
    
    const newTabs = state.tabs.filter(t => t.id !== tabId)
    let newActiveTabId = state.activeTabId
    
    // If closing active tab, switch to first remaining tab
    if (tabId === state.activeTabId) {
      newActiveTabId = newTabs[0]?.id || null
    }
    
    dispatch({
      type: 'CLOSE_TAB',
      payload: { tabId }
    })
    
    if (newActiveTabId !== state.activeTabId) {
      dispatch({
        type: 'SET_ACTIVE_TAB',
        payload: { tabId: newActiveTabId || '' }
      })
    }
    
    // Update localStorage
    const metadata: TabsMetadata = {
      activeTabId: newActiveTabId,
      nextTabNumber: state.nextTabNumber,
      tabOrder: newTabs.map(t => t.id),
      tabNames: Object.fromEntries(newTabs.map(t => [t.id, t.name]))
    }
    
    saveTabsMetadata(metadata)
    
    // Remove tab data from localStorage
    try {
      localStorage.removeItem(`${TAB_DATA_PREFIX}${tabId}`)
    } catch (error) {
      console.warn('Failed to remove tab data:', error)
    }
  }, [state])
  
  // Set active tab
  const setActiveTab = useCallback((tabId: string) => {
    if (state.activeTabId === tabId) return
    
    dispatch({
      type: 'SET_ACTIVE_TAB',
      payload: { tabId }
    })
    
    // Update metadata
    const metadata: TabsMetadata = {
      activeTabId: tabId,
      nextTabNumber: state.nextTabNumber,
      tabOrder: state.tabs.map(t => t.id),
      tabNames: Object.fromEntries(state.tabs.map(t => [t.id, t.name]))
    }
    
    saveTabsMetadata(metadata)
  }, [state])
  
  // Rename tab
  const renameTab = useCallback((tabId: string, newName: string) => {
    dispatch({
      type: 'RENAME_TAB',
      payload: { tabId, newName }
    })
    
    // Update metadata
    const metadata: TabsMetadata = {
      activeTabId: state.activeTabId,
      nextTabNumber: state.nextTabNumber,
      tabOrder: state.tabs.map(t => t.id),
      tabNames: Object.fromEntries(state.tabs.map(t => [t.id, t.name]))
    }
    
    saveTabsMetadata(metadata)
  }, [state])
  
  // Duplicate tab
  const duplicateTab = useCallback((tabId: string): string => {
    const sourceTab = state.tabs.find(t => t.id === tabId)
    if (!sourceTab) return ''
    
    const sourceConfig = sourceTab.unitManager.getConfiguration()
    const newTabName = `${sourceTab.name} Copy`
    
    return createTab(newTabName, sourceConfig)
  }, [state, createTab])
  
  // Get active tab
  const activeTab = state.tabs.find(t => t.id === state.activeTabId) || null
  
  // CRITICAL FIX: Subscribe to active tab's unit state changes
  useEffect(() => {
    console.log('[MultiUnitProvider] Subscription useEffect triggered:', {
      hasActiveTab: !!activeTab,
      hasUnitManager: !!activeTab?.unitManager,
      activeTabId: activeTab?.id
    })
    
    if (!activeTab?.unitManager) {
      console.log('[MultiUnitProvider] No active tab or unit manager, skipping subscription')
      return
    }
    
    console.log('[MultiUnitProvider] Setting up subscription to active tab unit changes')
    
    // Subscribe to unit state changes
    const unsubscribe = activeTab.unitManager.subscribe(() => {
      console.log('[MultiUnitProvider] Unit state changed, forcing re-render')
      setUnitVersion(v => v + 1) // Increment unit version to force context value change
      forceUpdate()
    })
    
    // Cleanup subscription when active tab changes
    return () => {
      console.log('[MultiUnitProvider] Cleaning up unit subscription')
      unsubscribe()
    }
  }, [activeTab?.unitManager]) // Re-subscribe when active tab's unit manager changes

  // CRITICAL FIX: Save initial state when component mounts
  useEffect(() => {
    if (activeTab && isInitialized) {
      console.log('[MultiUnitProvider] Component initialized, saving initial state for active tab')
      saveCompleteStateImmediately(activeTab.id, activeTab.unitManager)
    }
  }, [isInitialized, activeTab])
  
  // Proxy functions for active tab's unit operations
  const updateActiveTabConfiguration = useCallback((config: UnitConfiguration) => {
    if (!activeTab) return
    
    console.log('🔧 [MULTI_UNIT_DEBUG] 🔄 updateActiveTabConfiguration called with config:', {
      structureType: config.structureType,
      armorType: config.armorType,
      techBase: config.techBase
    })
    console.log('🔧 [MULTI_UNIT_DEBUG] 🔄 activeTab.unitManager:', activeTab.unitManager)
    
    activeTab.unitManager.updateConfiguration(config)
    activeTab.isModified = true
    activeTab.modified = new Date()
    
    // Update state to trigger re-render
    dispatch({
      type: 'UPDATE_TAB_CONFIG',
      payload: { 
        tabId: activeTab.id, 
        config: activeTab.unitManager.getConfiguration() 
      }
    })
    
    // CRITICAL FIX: Save complete state instead of just basic config
    // Configuration changes can include special components that need complete serialization
    saveCompleteStateImmediately(activeTab.id, activeTab.unitManager)
    
    // FALLBACK: Force re-render immediately to ensure UI updates
    console.log('🔧 [MULTI_UNIT_DEBUG] Forcing immediate re-render after configuration update')
    setUnitVersion(v => v + 1) // Increment unit version to force context value change
    forceUpdate()
    
    console.log('🔧 [MULTI_UNIT_DEBUG] Configuration update complete with full state persistence')
  }, [activeTab])
  
  // Debug function to check localStorage contents
  const debugLocalStorage = () => {
    if (typeof window === 'undefined') return {}
    
    const debug: Record<string, unknown> = {}
    const keys = Object.keys(localStorage)
    
    keys.forEach(key => {
      if (key.startsWith('tabs_metadata') || key.startsWith('complete_state_') || key.startsWith('tab_data_')) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            debug[key] = JSON.parse(value)
          }
        } catch (error) {
          debug[key] = `Error parsing: ${error}`
        }
      }
    })
    
    console.log('[MultiUnitProvider] localStorage debug:', debug)
    return debug
  }

  // Context value
  const contextValue: MultiUnitContextValue = {
    // State
    tabs: state.tabs,
    activeTab,
    activeTabId: state.activeTabId,
    
    // Tab management
    createTab,
    closeTab,
    setActiveTab,
    renameTab,
    duplicateTab,
    
    // Active tab unit data (proxy to active tab's unit)
    // PROPER ARCHITECTURE: Fresh data from unit each render
    unit: activeTab?.unitManager || null,
    engineType: activeTab?.unitManager.getEngineType() || null,
    gyroType: (activeTab?.unitManager.getGyroType() as any) || null, // Removed GyroType import, so it's any for now
    unallocatedEquipment: activeTab?.unitManager.getUnallocatedEquipment() || [],
    validation: activeTab?.stateManager.getUnitSummary().validation || null,
    summary: activeTab?.stateManager.getUnitSummary().summary || null,
    isConfigLoaded: isInitialized,
    selectedEquipmentId,
    unitVersion, // CRITICAL: Include unit version to force re-renders
    
    // Active tab action functions with enhanced persistence
    changeEngine: (engineType: EngineType) => {
      if (!activeTab) return
      activeTab.stateManager.handleEngineChange(engineType)
      activeTab.isModified = true
      activeTab.modified = new Date()
      dispatch({
        type: 'UPDATE_TAB_CONFIG',
        payload: { 
          tabId: activeTab.id, 
          config: activeTab.unitManager.getConfiguration() 
        }
      })
      
      // Save complete state with debouncing (configuration changes are significant)
      saveCompleteStateImmediately(activeTab.id, activeTab.unitManager)
    },
    changeGyro: (gyroType: GyroType) => {
      if (!activeTab) return
      activeTab.stateManager.handleGyroChange(gyroType)
      activeTab.isModified = true
      activeTab.modified = new Date()
      dispatch({
        type: 'UPDATE_TAB_CONFIG',
        payload: { 
          tabId: activeTab.id, 
          config: activeTab.unitManager.getConfiguration() 
        }
      })
      
      // Save complete state with debouncing (configuration changes are significant)
      saveCompleteStateImmediately(activeTab.id, activeTab.unitManager)
    },
    changeStructure: (structureType: ComponentConfiguration | string) => {
      console.log('[MultiUnitProvider] changeStructure called with:', structureType)
      
      if (!activeTab) {
        console.warn('[MultiUnitProvider] No active tab available for structure change')
        return
      }
      
      const currentConfig = activeTab.unitManager.getConfiguration()
      const result = componentUpdateAdapter.updateStructure(structureType, currentConfig)
      
      if (result.success) {
        console.log('[MultiUnitProvider] Structure update successful, applying new configuration')
        activeTab.unitManager.updateConfiguration(result.newConfiguration)
        activeTab.isModified = true
        activeTab.modified = new Date()
        dispatch({
          type: 'UPDATE_TAB_CONFIG',
          payload: { 
            tabId: activeTab.id, 
            config: activeTab.unitManager.getConfiguration() 
          }
        })
        saveCompleteStateImmediately(activeTab.id, activeTab.unitManager)
      } else {
        console.error('[MultiUnitProvider] Structure update failed:', result.errors)
        // TODO: Show error to user
      }
    },
    changeArmor: (armorType: ComponentConfiguration | string) => {
      console.log('[MultiUnitProvider] changeArmor called with:', armorType)
      
      if (!activeTab) {
        console.warn('[MultiUnitProvider] No active tab available for armor change')
        return
      }
      
      const currentConfig = activeTab.unitManager.getConfiguration()
      const result = componentUpdateAdapter.updateArmor(armorType, currentConfig)
      
      if (result.success) {
        console.log('[MultiUnitProvider] Armor update successful, applying new configuration')
        activeTab.unitManager.updateConfiguration(result.newConfiguration)
        activeTab.isModified = true
        activeTab.modified = new Date()
        dispatch({
          type: 'UPDATE_TAB_CONFIG',
          payload: { 
            tabId: activeTab.id, 
            config: activeTab.unitManager.getConfiguration() 
          }
        })
        saveCompleteStateImmediately(activeTab.id, activeTab.unitManager)
      } else {
        console.error('[MultiUnitProvider] Armor update failed:', result.errors)
        // TODO: Show error to user
      }
    },
    changeHeatSink: (heatSinkType: ComponentConfiguration | string) => {
      console.log('[MultiUnitProvider] changeHeatSink called with:', heatSinkType)
      
      if (!activeTab) {
        console.warn('[MultiUnitProvider] No active tab available for heat sink change')
        return
      }
      
      const currentConfig = activeTab.unitManager.getConfiguration()
      const result = componentUpdateAdapter.updateHeatSink(heatSinkType, currentConfig)
      
      if (result.success) {
        console.log('[MultiUnitProvider] Heat sink update successful, applying new configuration')
        activeTab.unitManager.updateConfiguration(result.newConfiguration)
        activeTab.isModified = true
        activeTab.modified = new Date()
        dispatch({
          type: 'UPDATE_TAB_CONFIG',
          payload: { 
            tabId: activeTab.id, 
            config: activeTab.unitManager.getConfiguration() 
          }
        })
        saveCompleteStateImmediately(activeTab.id, activeTab.unitManager)
      } else {
        console.error('[MultiUnitProvider] Heat sink update failed:', result.errors)
        // TODO: Show error to user
      }
    },
    changeJumpJet: (jumpJetType: ComponentConfiguration | string) => {
      console.log('[MultiUnitProvider] changeJumpJet called with:', jumpJetType)
      
      if (!activeTab) {
        console.warn('[MultiUnitProvider] No active tab available for jump jet change')
        return
      }
      
      const currentConfig = activeTab.unitManager.getConfiguration()
      const result = componentUpdateAdapter.updateJumpJet(jumpJetType, currentConfig)
      
      if (result.success) {
        console.log('[MultiUnitProvider] Jump jet update successful, applying new configuration')
        activeTab.unitManager.updateConfiguration(result.newConfiguration)
        activeTab.isModified = true
        activeTab.modified = new Date()
        dispatch({
          type: 'UPDATE_TAB_CONFIG',
          payload: { 
            tabId: activeTab.id, 
            config: activeTab.unitManager.getConfiguration() 
          }
        })
        saveCompleteStateImmediately(activeTab.id, activeTab.unitManager)
      } else {
        console.error('[MultiUnitProvider] Jump jet update failed:', result.errors)
        // TODO: Show error to user
      }
    },
    updateConfiguration: updateActiveTabConfiguration,
    addTestEquipment: (equipment: EquipmentAllocation, location: string, startSlot?: number) => {
      if (!activeTab) return false
      const result = activeTab.stateManager.addTestEquipment(equipment, location, startSlot)
      
      if (result) {
        activeTab.isModified = true
        activeTab.modified = new Date()
        dispatch({
          type: 'UPDATE_TAB_CONFIG',
          payload: { 
            tabId: activeTab.id, 
            config: activeTab.unitManager.getConfiguration() 
          }
        })
        
        // Save complete state with debouncing
        saveCompleteState(activeTab.id, activeTab.unitManager)
      }
      
      return result
    },
    addEquipmentToUnit: (equipment: EquipmentAllocation) => {
      if (!activeTab) return
      activeTab.stateManager.addUnallocatedEquipment(equipment)
      activeTab.isModified = true
      activeTab.modified = new Date()
      dispatch({
        type: 'UPDATE_TAB_CONFIG',
        payload: { 
          tabId: activeTab.id, 
          config: activeTab.unitManager.getConfiguration() 
        }
      })
      
      // Save complete state with debouncing
      saveCompleteState(activeTab.id, activeTab.unitManager)
    },
    removeEquipment: (equipmentGroupId: string) => {
      if (!activeTab) return false
      const result = activeTab.stateManager.removeEquipment(equipmentGroupId)
      
      if (result) {
        activeTab.isModified = true
        activeTab.modified = new Date()
        dispatch({
          type: 'UPDATE_TAB_CONFIG',
          payload: { 
            tabId: activeTab.id, 
            config: activeTab.unitManager.getConfiguration() 
          }
        })
        
        // Save complete state with debouncing
        saveCompleteState(activeTab.id, activeTab.unitManager)
      }
      
      return result
    },
    resetUnit: (config?: UnitConfiguration) => {
      if (!activeTab) return
      activeTab.stateManager.resetUnit(config)
      activeTab.isModified = true
      activeTab.modified = new Date()
      dispatch({
        type: 'UPDATE_TAB_CONFIG',
        payload: { 
          tabId: activeTab.id, 
          config: activeTab.unitManager.getConfiguration() 
        }
      })
      
      // Save complete state immediately (reset is a significant operation)
      saveCompleteStateImmediately(activeTab.id, activeTab.unitManager)
    },
    selectEquipment: (equipmentGroupId: string | null) => {
      setSelectedEquipmentId(equipmentGroupId)
      // Note: Equipment selection doesn't modify unit state, so no save needed
    },
    assignSelectedEquipment: (location: string, slotIndex: number) => {
      if (!selectedEquipmentId || !activeTab) return false
      
      console.log(`[MultiUnitProvider] Attempting to assign equipment ${selectedEquipmentId} to ${location} slot ${slotIndex}`)
      
      // Get the current unallocated count before allocation
      const unallocatedCountBefore = activeTab.unitManager.getUnallocatedEquipment().length
      console.log(`[MultiUnitProvider] Unallocated equipment count before allocation: ${unallocatedCountBefore}`)
      
      const success = activeTab.unitManager.allocateEquipmentFromPool(selectedEquipmentId, location, slotIndex)
      
      if (success) {
        console.log(`[MultiUnitProvider] Equipment allocation successful`)
        
        // Verify the equipment was actually removed from unallocated pool
        const unallocatedCountAfter = activeTab.unitManager.getUnallocatedEquipment().length
        console.log(`[MultiUnitProvider] Unallocated equipment count after allocation: ${unallocatedCountAfter}`)
        
        if (unallocatedCountAfter >= unallocatedCountBefore) {
          console.error(`[MultiUnitProvider] PROBLEM: Equipment was not removed from unallocated pool! Before: ${unallocatedCountBefore}, After: ${unallocatedCountAfter}`)
        } else {
          console.log(`[MultiUnitProvider] SUCCESS: Equipment properly removed from unallocated pool. Reduced from ${unallocatedCountBefore} to ${unallocatedCountAfter}`)
        }
        
        // Clear selection
        setSelectedEquipmentId(null)
        
        // Mark tab as modified
        activeTab.isModified = true
        activeTab.modified = new Date()
        
        // PROPER ARCHITECTURE: Use unit observer pattern to trigger re-renders
        console.log(`[MultiUnitProvider] Equipment allocation completed, unit will notify observers`)
        // The unit's observer pattern will automatically trigger forceUpdate() via the subscription
        
        // Force comprehensive state update
        dispatch({
          type: 'UPDATE_TAB_CONFIG',
          payload: { 
            tabId: activeTab.id, 
            config: activeTab.unitManager.getConfiguration() 
          }
        })
        
        // Log final state for debugging
        const finalUnallocated = activeTab.unitManager.getUnallocatedEquipment()
        console.log(`[MultiUnitProvider] Final unallocated equipment:`, finalUnallocated.map(eq => eq.equipmentData.name))
        
        // Save complete state with debouncing
        saveCompleteState(activeTab.id, activeTab.unitManager)
        
        return true
      }
      
      return false
    },
    getDebugInfo: () => {
      return {
        localStorage: debugLocalStorage(),
        activeTab: activeTab ? {
          id: activeTab.id,
          name: activeTab.name,
          config: activeTab.unitManager.getConfiguration(),
          isModified: activeTab.isModified,
          modified: activeTab.modified
        } : null,
        tabs: state.tabs.map(tab => ({
          id: tab.id,
          name: tab.name,
          isModified: tab.isModified
        }))
      }
    }
  }
  
  // Don't render until initialized
  if (!isClient || !isInitialized) {
    console.log('[MultiUnitProvider] Still initializing...', { isClient, isInitialized })
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }
  
  console.log('[MultiUnitProvider] Rendering provider with initialized state:', { 
    isClient, 
    isInitialized, 
    tabsCount: state.tabs.length, 
    activeTabId: state.activeTabId 
  })
  
  return (
    <MultiUnitContext.Provider value={contextValue}>
      {children}
    </MultiUnitContext.Provider>
  )
}

// Custom hook for consuming the context
export function useMultiUnit(): MultiUnitContextValue {
  const context = useContext(MultiUnitContext)
  if (!context) {
    throw new Error('useMultiUnit must be used within MultiUnitProvider')
  }
  return context
}

// Legacy compatibility hook - proxies to active tab's unit
export function useUnit() {
  const multiUnit = useMultiUnit()
  
  if (!multiUnit.unit) {
    throw new Error('No active unit available')
  }
  
  return {
    unit: multiUnit.unit,
    engineType: multiUnit.engineType!,
    gyroType: multiUnit.gyroType!,
    unallocatedEquipment: multiUnit.unallocatedEquipment,
    validation: multiUnit.validation,
    summary: multiUnit.summary,
    isConfigLoaded: multiUnit.isConfigLoaded,
    selectedEquipmentId: multiUnit.selectedEquipmentId,
    unitVersion: multiUnit.unitVersion, // CRITICAL: Include unit version
    changeEngine: multiUnit.changeEngine,
    changeGyro: multiUnit.changeGyro,
    updateConfiguration: multiUnit.updateConfiguration,
    addTestEquipment: multiUnit.addTestEquipment,
    addEquipmentToUnit: multiUnit.addEquipmentToUnit,
    removeEquipment: multiUnit.removeEquipment,
    resetUnit: multiUnit.resetUnit,
    selectEquipment: multiUnit.selectEquipment,
    assignSelectedEquipment: multiUnit.assignSelectedEquipment,
    getDebugInfo: multiUnit.getDebugInfo
  }
}
