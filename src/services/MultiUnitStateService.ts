/**
 * Multi-Unit State Service
 * 
 * Manages multi-unit tab state, persistence, and initialization.
 * Handles localStorage operations, tab management, and state recovery.
 * 
 * Phase 4: Component Modularization - Day 19
 * Extracted from MultiUnitProvider.tsx (839 lines → focused services)
 */

import { UnitStateManager } from '../utils/criticalSlots/UnitStateManager'
import { UnitCriticalManager } from '../utils/criticalSlots/UnitCriticalManager'
import { UnitConfiguration, CompleteUnitState } from '../utils/criticalSlots/UnitCriticalManagerTypes'
import { ComponentConfiguration, createComponentConfiguration } from '../types/componentConfiguration'

export interface TabUnit {
  id: string
  name: string
  unitManager: UnitCriticalManager
  stateManager: UnitStateManager
  created: Date
  modified: Date
  isModified: boolean
}

export interface MultiUnitState {
  tabs: TabUnit[]
  activeTabId: string | null
  nextTabNumber: number
}

interface TabsMetadata {
  activeTabId: string | null
  nextTabNumber: number
  tabOrder: string[]
  tabNames: Record<string, string>
  version?: string
}

interface EnhancedTabData {
  completeState?: CompleteUnitState
  config?: UnitConfiguration
  modified: string
  version: string
}

export class MultiUnitStateService {
  // Storage keys
  private static readonly TABS_METADATA_KEY = 'battletech-tabs-metadata'
  private static readonly TAB_DATA_PREFIX = 'battletech-unit-tab-'
  private static readonly LEGACY_CONFIG_KEY = 'battletech-unit-configuration'
  private static readonly COMPLETE_STATE_PREFIX = 'battletech-complete-state-'

  // Event listeners for state changes
  private listeners: Set<() => void> = new Set()

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener())
  }

  /**
   * Create default unit configuration
   */
  createDefaultConfiguration(): UnitConfiguration {
    return {
      chassis: 'Custom',
      model: 'New Design',
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard',
      gyroType: createComponentConfiguration('gyro', 'Standard')! as any,
      structureType: createComponentConfiguration('structure', 'Standard')! as any,
      armorType: createComponentConfiguration('armor', 'Standard')! as any,
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
      heatSinkType: createComponentConfiguration('heatSink', 'Single')! as any,
      totalHeatSinks: 10,
      internalHeatSinks: 8,
      externalHeatSinks: 2,
      enhancements: [],
      jumpMP: 0,
      jumpJetType: createComponentConfiguration('jumpJet', 'Standard Jump Jet')! as any,
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50
    }
  }

  /**
   * Initialize tabs from storage or create default
   */
  async initializeTabs(): Promise<MultiUnitState> {
    if (typeof window === 'undefined') {
      // Server-side: return default state
      const defaultTab = this.createTabFromData('tab-1', 'New Mech', this.createDefaultConfiguration())
      return {
        tabs: [defaultTab],
        activeTabId: defaultTab.id,
        nextTabNumber: 2
      }
    }

    try {
      // Check for existing tabs
      const metadataStr = localStorage.getItem(MultiUnitStateService.TABS_METADATA_KEY)
      
      if (metadataStr) {
        const metadata: TabsMetadata = JSON.parse(metadataStr)
        const tabs: TabUnit[] = []
        
        for (const tabId of metadata.tabOrder) {
          const { config } = this.loadTabData(tabId)
          const tab = this.createTabFromDataEnhanced(tabId, metadata.tabNames[tabId] || 'New Mech', config)
          tabs.push(tab)
        }
        
        if (tabs.length > 0) {
          return {
            tabs,
            activeTabId: metadata.activeTabId || tabs[0].id,
            nextTabNumber: metadata.nextTabNumber
          }
        }
      }
      
      // Check for legacy single unit config
      const legacyConfigStr = localStorage.getItem(MultiUnitStateService.LEGACY_CONFIG_KEY)
      let initialConfig = this.createDefaultConfiguration()
      let tabName = 'New Mech'
      
      if (legacyConfigStr) {
        try {
          const legacyConfig = JSON.parse(legacyConfigStr)
          initialConfig = { ...initialConfig, ...legacyConfig }
          tabName = `${initialConfig.tonnage}t Mech`
          
          // Remove legacy config after migration
          localStorage.removeItem(MultiUnitStateService.LEGACY_CONFIG_KEY)
        } catch (error) {
          console.warn('Failed to migrate legacy configuration:', error)
        }
      }
      
      // Create first tab
      const firstTab = this.createTabFromData('tab-1', tabName, initialConfig)
      const initialState = {
        tabs: [firstTab],
        activeTabId: firstTab.id,
        nextTabNumber: 2
      }
      
      // Save initial state
      this.saveTabsMetadata({
        activeTabId: firstTab.id,
        nextTabNumber: 2,
        tabOrder: [firstTab.id],
        tabNames: { [firstTab.id]: tabName }
      })
      
      this.saveTabData(firstTab.id, initialConfig)
      
      return initialState
      
    } catch (error) {
      console.error('Failed to initialize tabs:', error)
      
      // Fallback: create default tab
      const defaultTab = this.createTabFromData('tab-1', 'New Mech', this.createDefaultConfiguration())
      return {
        tabs: [defaultTab],
        activeTabId: defaultTab.id,
        nextTabNumber: 2
      }
    }
  }

  /**
   * Create tab from configuration data
   */
  createTabFromData(id: string, name: string, config: UnitConfiguration): TabUnit {
    const stateManager = new UnitStateManager(config)
    const unitManager = stateManager.getCurrentUnit()
    
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

  /**
   * Create tab from data with complete state restoration
   */
  createTabFromDataEnhanced(id: string, name: string, config: UnitConfiguration): TabUnit {
    const stateManager = new UnitStateManager(config)
    const unitManager = stateManager.getCurrentUnit()
    
    // Check if we have complete state to restore
    const { hasCompleteState } = this.loadTabData(id)
    if (hasCompleteState) {
      try {
        const completeStateStr = localStorage.getItem(`${MultiUnitStateService.COMPLETE_STATE_PREFIX}${id}`)
        if (completeStateStr) {
          const tabData: EnhancedTabData = JSON.parse(completeStateStr)
          if (tabData.completeState) {
            console.log(`[MultiUnitStateService] Restoring complete state for tab ${id}`)
            const success = unitManager.deserializeCompleteState(tabData.completeState)
            if (success) {
              console.log(`[MultiUnitStateService] Successfully restored complete state for tab ${id}`)
            } else {
              console.warn(`[MultiUnitStateService] Failed to restore complete state for tab ${id}, using config only`)
            }
          }
        }
      } catch (error) {
        console.error(`[MultiUnitStateService] Error restoring complete state for tab ${id}:`, error)
      }
    }

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

  /**
   * Create new tab
   */
  createTab(currentState: MultiUnitState, name?: string, config?: UnitConfiguration): { newState: MultiUnitState, tabId: string } {
    const tabId = `tab-${currentState.nextTabNumber}`
    const tabName = name || `New Mech ${currentState.nextTabNumber === 1 ? '' : currentState.nextTabNumber}`.trim()
    const tabConfig = config || this.createDefaultConfiguration()
    
    const newTab = this.createTabFromData(tabId, tabName, tabConfig)
    
    const newTabs = [...currentState.tabs, newTab]
    const newState = {
      tabs: newTabs,
      activeTabId: tabId,
      nextTabNumber: currentState.nextTabNumber + 1
    }
    
    // Save to localStorage
    const metadata: TabsMetadata = {
      activeTabId: tabId,
      nextTabNumber: newState.nextTabNumber,
      tabOrder: newTabs.map(t => t.id),
      tabNames: Object.fromEntries(newTabs.map(t => [t.id, t.name]))
    }
    
    this.saveTabsMetadata(metadata)
    this.saveTabData(tabId, tabConfig)
    
    this.notifyListeners()
    
    return { newState, tabId }
  }

  /**
   * Close tab
   */
  closeTab(currentState: MultiUnitState, tabId: string): MultiUnitState {
    if (currentState.tabs.length <= 1) {
      // Don't close the last tab, just reset it
      const tab = currentState.tabs[0]
      if (tab) {
        const defaultConfig = this.createDefaultConfiguration()
        tab.unitManager.updateConfiguration(defaultConfig)
        tab.name = 'New Mech'
        tab.isModified = false
        tab.modified = new Date()
        
        const resetState = {
          ...currentState,
          tabs: [{ ...tab }]
        }
        
        this.saveTabData(tab.id, defaultConfig)
        this.notifyListeners()
        
        return resetState
      }
    }
    
    const newTabs = currentState.tabs.filter(t => t.id !== tabId)
    let newActiveTabId = currentState.activeTabId
    
    // If closing active tab, switch to first remaining tab
    if (tabId === currentState.activeTabId) {
      newActiveTabId = newTabs[0]?.id || null
    }
    
    const newState = {
      tabs: newTabs,
      activeTabId: newActiveTabId,
      nextTabNumber: currentState.nextTabNumber
    }
    
    // Update localStorage
    const metadata: TabsMetadata = {
      activeTabId: newActiveTabId,
      nextTabNumber: currentState.nextTabNumber,
      tabOrder: newTabs.map(t => t.id),
      tabNames: Object.fromEntries(newTabs.map(t => [t.id, t.name]))
    }
    
    this.saveTabsMetadata(metadata)
    
    // Remove tab data from localStorage
    try {
      localStorage.removeItem(`${MultiUnitStateService.TAB_DATA_PREFIX}${tabId}`)
      localStorage.removeItem(`${MultiUnitStateService.COMPLETE_STATE_PREFIX}${tabId}`)
    } catch (error) {
      console.warn('Failed to remove tab data:', error)
    }
    
    this.notifyListeners()
    
    return newState
  }

  /**
   * Set active tab
   */
  setActiveTab(currentState: MultiUnitState, tabId: string): MultiUnitState {
    if (currentState.activeTabId === tabId) return currentState
    
    const newState = {
      ...currentState,
      activeTabId: tabId
    }
    
    // Update metadata
    const metadata: TabsMetadata = {
      activeTabId: tabId,
      nextTabNumber: currentState.nextTabNumber,
      tabOrder: currentState.tabs.map(t => t.id),
      tabNames: Object.fromEntries(currentState.tabs.map(t => [t.id, t.name]))
    }
    
    this.saveTabsMetadata(metadata)
    this.notifyListeners()
    
    return newState
  }

  /**
   * Rename tab
   */
  renameTab(currentState: MultiUnitState, tabId: string, newName: string): MultiUnitState {
    const newTabs = currentState.tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, name: newName, modified: new Date(), isModified: true }
        : tab
    )
    
    const newState = {
      ...currentState,
      tabs: newTabs
    }
    
    // Update metadata
    const metadata: TabsMetadata = {
      activeTabId: currentState.activeTabId,
      nextTabNumber: currentState.nextTabNumber,
      tabOrder: newTabs.map(t => t.id),
      tabNames: Object.fromEntries(newTabs.map(t => [t.id, t.name]))
    }
    
    this.saveTabsMetadata(metadata)
    this.notifyListeners()
    
    return newState
  }

  /**
   * Duplicate tab
   */
  duplicateTab(currentState: MultiUnitState, tabId: string): { newState: MultiUnitState, newTabId: string } {
    const sourceTab = currentState.tabs.find(t => t.id === tabId)
    if (!sourceTab) return { newState: currentState, newTabId: '' }
    
    const sourceConfig = sourceTab.unitManager.getConfiguration()
    const newTabName = `${sourceTab.name} Copy`
    
    const result = this.createTab(currentState, newTabName, sourceConfig)
    return { newState: result.newState, newTabId: result.tabId }
  }

  /**
   * Save tabs metadata to localStorage
   */
  private saveTabsMetadata(metadata: TabsMetadata): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(MultiUnitStateService.TABS_METADATA_KEY, JSON.stringify(metadata))
    } catch (error) {
      console.warn('Failed to save tabs metadata:', error)
    }
  }

  /**
   * Save individual tab data with legacy config format
   */
  saveTabData(tabId: string, config: UnitConfiguration): void {
    if (typeof window === 'undefined') return
    try {
      const tabData: EnhancedTabData = {
        config,
        modified: new Date().toISOString(),
        version: '1.0.0'
      }
      localStorage.setItem(`${MultiUnitStateService.TAB_DATA_PREFIX}${tabId}`, JSON.stringify(tabData))
    } catch (error) {
      console.warn('Failed to save tab data:', error)
    }
  }

  /**
   * Save complete unit state to localStorage
   */
  saveCompleteState(tabId: string, completeState: CompleteUnitState): void {
    if (typeof window === 'undefined') return
    try {
      const tabData: EnhancedTabData = {
        completeState,
        config: completeState.configuration,
        modified: new Date().toISOString(),
        version: '2.0.0'
      }
      localStorage.setItem(`${MultiUnitStateService.COMPLETE_STATE_PREFIX}${tabId}`, JSON.stringify(tabData))
      console.log(`[MultiUnitStateService] Saved complete state for tab ${tabId}`)
    } catch (error) {
      console.error('Failed to save complete state:', error)
    }
  }

  /**
   * Load tab data with complete state support and legacy migration
   */
  loadTabData(tabId: string): { config: UnitConfiguration, hasCompleteState: boolean } {
    if (typeof window === 'undefined') {
      return { config: this.createDefaultConfiguration(), hasCompleteState: false }
    }

    try {
      // Try to load complete state first
      const completeStateStr = localStorage.getItem(`${MultiUnitStateService.COMPLETE_STATE_PREFIX}${tabId}`)
      if (completeStateStr) {
        const tabData: EnhancedTabData = JSON.parse(completeStateStr)
        if (tabData.completeState) {
          console.log(`[MultiUnitStateService] Loaded complete state for tab ${tabId}`)
          return { 
            config: tabData.completeState.configuration, 
            hasCompleteState: true
          }
        }
      }

      // Fallback to legacy configuration format
      const legacyDataStr = localStorage.getItem(`${MultiUnitStateService.TAB_DATA_PREFIX}${tabId}`)
      if (legacyDataStr) {
        const legacyData = JSON.parse(legacyDataStr)
        console.log(`[MultiUnitStateService] Loaded legacy config for tab ${tabId}`)
        return { 
          config: legacyData.config || this.createDefaultConfiguration(), 
          hasCompleteState: false
        }
      }

    } catch (error) {
      console.error(`Failed to load tab data for ${tabId}:`, error)
    }

    return { config: this.createDefaultConfiguration(), hasCompleteState: false }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): { totalTabs: number, storageUsed: number, hasLegacyData: boolean } {
    if (typeof window === 'undefined') {
      return { totalTabs: 0, storageUsed: 0, hasLegacyData: false }
    }

    let storageUsed = 0
    let totalTabs = 0
    let hasLegacyData = false

    try {
      // Count storage usage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('battletech-')) {
          const value = localStorage.getItem(key)
          if (value) {
            storageUsed += key.length + value.length
            if (key.startsWith(MultiUnitStateService.TAB_DATA_PREFIX) || 
                key.startsWith(MultiUnitStateService.COMPLETE_STATE_PREFIX)) {
              totalTabs++
            }
            if (key === MultiUnitStateService.LEGACY_CONFIG_KEY) {
              hasLegacyData = true
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to calculate storage stats:', error)
    }

    return { totalTabs: totalTabs / 2, storageUsed, hasLegacyData } // Divide by 2 because each tab has 2 entries
  }

  /**
   * Clear all stored data
   */
  clearAllData(): void {
    if (typeof window === 'undefined') return

    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('battletech-')) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key))
      console.log(`[MultiUnitStateService] Cleared ${keysToRemove.length} storage items`)
      
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to clear storage data:', error)
    }
  }
}





