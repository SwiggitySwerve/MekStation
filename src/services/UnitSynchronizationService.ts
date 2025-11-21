/**
 * Unit Synchronization Service
 * 
 * Manages cross-unit synchronization, debounced persistence,
 * equipment transfers, and state consistency for multi-unit operations.
 * 
 * Phase 4: Component Modularization - Day 19
 * Extracted from MultiUnitProvider.tsx (839 lines → focused services)
 */

import { TabUnit, MultiUnitState } from './MultiUnitStateService'
import { MultiUnitStateService } from './MultiUnitStateService'
import { UnitCriticalManager } from '../utils/criticalSlots/UnitCriticalManager'
import { UnitConfiguration, CompleteUnitState } from '../utils/criticalSlots/UnitCriticalManagerTypes'
import { EngineType, GyroType } from '../types/systemComponents'
import { EquipmentAllocation } from '../utils/criticalSlots/CriticalSlot'
import { MultiTabDebouncedSaveManager } from '../utils/DebouncedSaveManager'

export interface SynchronizationEvent {
  type: 'configuration_change' | 'equipment_change' | 'state_change' | 'tab_change'
  tabId: string
  timestamp: Date
  data?: any
}

export interface EquipmentTransferRequest {
  sourceTabId: string
  targetTabId: string
  equipmentId: string
  sourceLocation?: string
  targetLocation?: string
  targetSlot?: number
}

export interface SynchronizationOptions {
  enableDebouncing: boolean
  debounceDuration: number
  enableCrossUnitValidation: boolean
  enableEquipmentSharing: boolean
  autoSaveChanges: boolean
}

/**
 * Extended interface for save manager with optional methods
 */
interface ExtendedSaveManager extends MultiTabDebouncedSaveManager {
  cancelPendingSave?: (tabId: string) => void;
  flushAllPendingSaves?: () => void;
  getPendingSaveCount?: () => number;
  hasPendingSave?: (tabId: string) => boolean;
  cancelAllPendingSaves?: () => void;
}

export class UnitSynchronizationService {
  private stateService: MultiUnitStateService
  private saveManager: ExtendedSaveManager
  private options: SynchronizationOptions
  private eventHistory: SynchronizationEvent[] = []
  private unitObservers: Map<string, () => void> = new Map()
  private listeners: Set<(event: SynchronizationEvent) => void> = new Set()

  constructor(
    stateService: MultiUnitStateService,
    saveManager: ExtendedSaveManager,
    options: Partial<SynchronizationOptions> = {}
  ) {
    this.stateService = stateService
    this.saveManager = saveManager
    this.options = {
      enableDebouncing: true,
      debounceDuration: 1000,
      enableCrossUnitValidation: true,
      enableEquipmentSharing: false,
      autoSaveChanges: true,
      ...options
    }
  }

  /**
   * Subscribe to synchronization events
   */
  subscribe(listener: (event: SynchronizationEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Emit synchronization event
   */
  private emitEvent(event: SynchronizationEvent): void {
    this.eventHistory.push(event)
    
    // Keep only last 100 events
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100)
    }

    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in synchronization listener:', error)
      }
    })
  }

  /**
   * Initialize unit synchronization for a tab
   */
  initializeTabSync(tab: TabUnit): void {
    if (!tab) {
      console.warn('[UnitSynchronizationService] Cannot initialize sync for null tab')
      return
    }

    try {
      // Set up unit observer for state changes
      const unsubscribe = tab.unitManager.subscribe(() => {
        this.handleUnitStateChange(tab)
      })

      // Store unsubscribe function for cleanup
      this.unitObservers.set(tab.id, unsubscribe)

      // Emit initialization event
      this.emitEvent({
        type: 'tab_change',
        tabId: tab.id,
        timestamp: new Date(),
        data: { action: 'initialized' }
      })
    } catch (error) {
      console.error('[UnitSynchronizationService] Failed to initialize tab sync:', error)
    }
  }

  /**
   * Clean up synchronization for a tab
   */
  cleanupTabSync(tabId: string): void {
    const unsubscribe = this.unitObservers.get(tabId)
    if (unsubscribe) {
      unsubscribe()
      this.unitObservers.delete(tabId)
    }

    // Cancel any pending saves for this tab (if method exists)
    try {
      if (this.saveManager.cancelPendingSave) {
        this.saveManager.cancelPendingSave(tabId)
      }
    } catch (error) {
      console.warn('Could not cancel pending save:', error)
    }

    this.emitEvent({
      type: 'tab_change',
      tabId,
      timestamp: new Date(),
      data: { action: 'cleanup' }
    })
  }

  /**
   * Handle unit state changes
   */
  private handleUnitStateChange(tab: TabUnit): void {
    console.log(`[UnitSynchronizationService] Unit state changed for tab ${tab.id}`)

    // Mark tab as modified
    tab.isModified = true
    tab.modified = new Date()

    // Save state based on options
    if (this.options.autoSaveChanges) {
      if (this.options.enableDebouncing) {
        this.saveCompleteStateDebounced(tab)
      } else {
        this.saveCompleteStateImmediately(tab)
      }
    }

    // Emit state change event
    this.emitEvent({
      type: 'state_change',
      tabId: tab.id,
      timestamp: new Date(),
      data: { modified: tab.modified }
    })
  }

  /**
   * Handle configuration updates with synchronization
   */
  updateConfiguration(tab: TabUnit, config: UnitConfiguration): void {
    if (!tab) {
      console.warn('[UnitSynchronizationService] Cannot update configuration for null tab')
      return
    }

    console.log(`[UnitSynchronizationService] Configuration update for tab ${tab.id}`)

    // Validate configuration if enabled
    if (this.options.enableCrossUnitValidation) {
      this.validateConfiguration(tab, config)
    }

    try {
      // Update the configuration
      tab.unitManager.updateConfiguration(config)
      tab.isModified = true
      tab.modified = new Date()

      // Save immediately for configuration changes (they're significant)
      this.saveCompleteStateImmediately(tab)
    } catch (error) {
      console.error(`[UnitSynchronizationService] Failed to update configuration for tab ${tab.id}:`, error)
      // Don't re-throw, just log and continue
      return
    }

    // Emit configuration change event
    this.emitEvent({
      type: 'configuration_change',
      tabId: tab.id,
      timestamp: new Date(),
      data: { 
        tonnage: config.tonnage,
        engineType: config.engineType,
        chassisName: `${config.chassis} ${config.model}`
      }
    })
  }

  /**
   * Handle equipment changes with synchronization
   */
  addEquipmentToUnit(tab: TabUnit, equipment: any): void {
    if (!tab) {
      console.warn('[UnitSynchronizationService] Cannot add equipment to null tab')
      return
    }

    console.log(`[UnitSynchronizationService] Adding equipment to tab ${tab.id}`)

    tab.stateManager.addUnallocatedEquipment(equipment)
    tab.isModified = true
    tab.modified = new Date()

    // Save with debouncing for equipment changes
    this.saveCompleteStateDebounced(tab)

    // Emit equipment change event
    this.emitEvent({
      type: 'equipment_change',
      tabId: tab.id,
      timestamp: new Date(),
      data: { 
        action: 'add',
        equipmentName: equipment.name || 'Unknown'
      }
    })
  }

  /**
   * Handle equipment removal with synchronization
   */
  removeEquipment(tab: TabUnit, equipmentGroupId: string): boolean {
    if (!tab) {
      console.warn('[UnitSynchronizationService] Cannot remove equipment from null tab')
      return false
    }

    console.log(`[UnitSynchronizationService] Removing equipment from tab ${tab.id}`)

    const result = tab.stateManager.removeEquipment(equipmentGroupId)
    
    if (result) {
      tab.isModified = true
      tab.modified = new Date()

      // Save with debouncing
      this.saveCompleteStateDebounced(tab)

      // Emit equipment change event
      this.emitEvent({
        type: 'equipment_change',
        tabId: tab.id,
        timestamp: new Date(),
        data: { 
          action: 'remove',
          equipmentId: equipmentGroupId
        }
      })
    }

    return result
  }

  /**
   * Handle equipment allocation with synchronization
   */
  assignEquipment(tab: TabUnit, selectedEquipmentId: string, location: string, slotIndex: number): boolean {
    console.log(`[UnitSynchronizationService] Assigning equipment in tab ${tab.id}`)

    // Get the current unallocated count before allocation
    const unallocatedCountBefore = tab.unitManager.getUnallocatedEquipment().length

    const success = tab.unitManager.allocateEquipmentFromPool(selectedEquipmentId, location, slotIndex)
    
    if (success) {
      // Verify the equipment was actually removed from unallocated pool
      const unallocatedCountAfter = tab.unitManager.getUnallocatedEquipment().length
      
      if (unallocatedCountAfter >= unallocatedCountBefore) {
        console.error(`[UnitSynchronizationService] PROBLEM: Equipment was not removed from unallocated pool! Before: ${unallocatedCountBefore}, After: ${unallocatedCountAfter}`)
      } else {
        console.log(`[UnitSynchronizationService] SUCCESS: Equipment properly removed from unallocated pool. Reduced from ${unallocatedCountBefore} to ${unallocatedCountAfter}`)
      }

      // Mark tab as modified
      tab.isModified = true
      tab.modified = new Date()

      // Save with debouncing
      this.saveCompleteStateDebounced(tab)

      // Emit equipment change event
      this.emitEvent({
        type: 'equipment_change',
        tabId: tab.id,
        timestamp: new Date(),
        data: { 
          action: 'assign',
          equipmentId: selectedEquipmentId,
          location,
          slotIndex
        }
      })
    }

    return success
  }

  /**
   * Transfer equipment between units
   */
  transferEquipment(request: EquipmentTransferRequest): boolean {
    if (!this.options.enableEquipmentSharing) {
      console.warn('Equipment sharing is disabled')
      return false
    }

    console.log(`[UnitSynchronizationService] Transferring equipment from ${request.sourceTabId} to ${request.targetTabId}`)

    // This would implement equipment transfer logic
    // For now, just log the request
    console.log('Equipment transfer request:', request)

    // Emit transfer event
    this.emitEvent({
      type: 'equipment_change',
      tabId: request.sourceTabId,
      timestamp: new Date(),
      data: { 
        action: 'transfer',
        targetTabId: request.targetTabId,
        equipmentId: request.equipmentId
      }
    })

    return true
  }

  /**
   * Validate configuration against other units
   */
  private validateConfiguration(tab: TabUnit, config: UnitConfiguration): void {
    // This would implement cross-unit validation logic
    // For example, checking for naming conflicts, tonnage limits, etc.
    console.log(`[UnitSynchronizationService] Validating configuration for tab ${tab.id}`)
  }

  /**
   * Save complete state with debouncing
   */
  private saveCompleteStateDebounced(tab: TabUnit): void {
    const saveHandler = (completeState: CompleteUnitState) => {
      this.stateService.saveCompleteState(tab.id, completeState)
    }

    const getStateCallback = () => {
      return tab.unitManager.serializeCompleteState()
    }

    this.saveManager.scheduleSaveForTab(tab.id, saveHandler, getStateCallback)
  }

  /**
   * Save complete state immediately
   */
  private saveCompleteStateImmediately(tab: TabUnit): void {
    const saveHandler = (completeState: CompleteUnitState) => {
      this.stateService.saveCompleteState(tab.id, completeState)
    }

    const getStateCallback = () => {
      return tab.unitManager.serializeCompleteState()
    }

    this.saveManager.saveTabImmediately(tab.id, saveHandler, getStateCallback)
  }

  /**
   * Force save all pending changes
   */
  forceSaveAll(): void {
    console.log('[UnitSynchronizationService] Force saving all pending changes')
    try {
      if (this.saveManager.flushAllPendingSaves) {
        this.saveManager.flushAllPendingSaves()
      }
    } catch (error) {
      console.warn('Could not flush pending saves:', error)
    }
  }

  /**
   * Get synchronization statistics
   */
  getSyncStats(): {
    totalEvents: number
    recentEvents: SynchronizationEvent[]
    activeObservers: number
    pendingSaves: number
  } {
    let pendingSaves = 0
    try {
      if (this.saveManager.getPendingSaveCount) {
        pendingSaves = this.saveManager.getPendingSaveCount()
      }
    } catch (error) {
      console.warn('Could not get pending save count:', error)
    }

    return {
      totalEvents: this.eventHistory.length,
      recentEvents: this.eventHistory.slice(-10),
      activeObservers: this.unitObservers.size,
      pendingSaves
    }
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = []
    console.log('[UnitSynchronizationService] Event history cleared')
  }

  /**
   * Update synchronization options
   */
  updateOptions(newOptions: Partial<SynchronizationOptions>): void {
    this.options = { ...this.options, ...newOptions }
    console.log('[UnitSynchronizationService] Options updated:', this.options)
  }

  /**
   * Get current synchronization options
   */
  getOptions(): SynchronizationOptions {
    return { ...this.options }
  }

  /**
   * Check if a tab has pending saves
   */
  hasPendingSaves(tabId: string): boolean {
    try {
      if (this.saveManager.hasPendingSave) {
        return this.saveManager.hasPendingSave(tabId)
      }
    } catch (error) {
      console.warn('Could not check pending saves:', error)
    }
    return false
  }

  /**
   * Cancel pending saves for a tab
   */
  cancelPendingSaves(tabId: string): void {
    try {
      if (this.saveManager.cancelPendingSave) {
        this.saveManager.cancelPendingSave(tabId)
        console.log(`[UnitSynchronizationService] Cancelled pending saves for tab ${tabId}`)
      }
    } catch (error) {
      console.warn('Could not cancel pending saves:', error)
    }
  }

  /**
   * Synchronize state between multiple tabs
   */
  synchronizeMultipleTabs(tabs: TabUnit[]): void {
    console.log(`[UnitSynchronizationService] Synchronizing ${tabs.length} tabs`)

    for (const tab of tabs) {
      // Ensure each tab has proper observers
      if (!this.unitObservers.has(tab.id)) {
        this.initializeTabSync(tab)
      }

      // Save any modified tabs
      if (tab.isModified) {
        this.saveCompleteStateDebounced(tab)
      }
    }

    // Emit synchronization event
    this.emitEvent({
      type: 'state_change',
      tabId: 'multiple',
      timestamp: new Date(),
      data: { 
        action: 'sync_multiple',
        tabCount: tabs.length
      }
    })
  }

  /**
   * Handle unit reset with synchronization
   */
  resetUnit(tab: TabUnit, config?: UnitConfiguration): void {
    console.log(`[UnitSynchronizationService] Resetting unit for tab ${tab.id}`)

    tab.stateManager.resetUnit(config)
    tab.isModified = true
    tab.modified = new Date()

    // Save immediately for reset operations
    this.saveCompleteStateImmediately(tab)

    // Emit reset event
    this.emitEvent({
      type: 'state_change',
      tabId: tab.id,
      timestamp: new Date(),
      data: { 
        action: 'reset',
        hasCustomConfig: !!config
      }
    })
  }

  /**
   * Handle engine changes with synchronization
   */
  changeEngine(tab: TabUnit, engineType: EngineType): void {
    console.log(`[UnitSynchronizationService] Engine change for tab ${tab.id}`)

    tab.stateManager.handleEngineChange(engineType)
    tab.isModified = true
    tab.modified = new Date()

    // Save immediately for engine changes (significant configuration change)
    this.saveCompleteStateImmediately(tab)

    // Emit configuration change event
    this.emitEvent({
      type: 'configuration_change',
      tabId: tab.id,
      timestamp: new Date(),
      data: { 
        action: 'engine_change',
        engineType
      }
    })
  }

  /**
   * Handle gyro changes with synchronization
   */
  changeGyro(tab: TabUnit, gyroType: GyroType): void {
    console.log(`[UnitSynchronizationService] Gyro change for tab ${tab.id}`)

    tab.stateManager.handleGyroChange(gyroType)
    tab.isModified = true
    tab.modified = new Date()

    // Save immediately for gyro changes (significant configuration change)
    this.saveCompleteStateImmediately(tab)

    // Emit configuration change event
    this.emitEvent({
      type: 'configuration_change',
      tabId: tab.id,
      timestamp: new Date(),
      data: { 
        action: 'gyro_change',
        gyroType
      }
    })
  }

  /**
   * Cleanup all synchronization resources
   */
  cleanup(): void {
    console.log('[UnitSynchronizationService] Cleaning up synchronization service')

    // Clean up all unit observers
    this.unitObservers.forEach((unsubscribe, tabId) => {
      unsubscribe()
    })
    this.unitObservers.clear()

    // Cancel all pending saves (if method exists)
    try {
      if (this.saveManager.cancelAllPendingSaves) {
        this.saveManager.cancelAllPendingSaves()
      }
    } catch (error) {
      console.warn('Could not cancel all pending saves:', error)
    }

    // Clear event history
    this.eventHistory = []

    // Clear listeners
    this.listeners.clear()
  }
}





