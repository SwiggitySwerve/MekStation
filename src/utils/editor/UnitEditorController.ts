/**
 * Unit Editor Controller - Core state management and orchestration for unit editor
 * Handles editor state, unit lifecycle, auto-save, and coordination between services
 * Follows SOLID principles as the main controller coordinating other services
 */

import { EditableUnit, UnitEditorState, EditorTab, ValidationError } from '../../types/editor'
import { UnitCalculationService, PerformanceMetrics } from './UnitCalculationService'
import { UnitValidationService, ValidationResult, ValidationContext } from './UnitValidationService'
import { TabManagerService, TabManagerState, TabManagerOptions } from './TabManagerService'
import { NextRouter } from 'next/router'

export interface EditorAction {
  type: string
  payload: any
  timestamp: Date
  userId?: string
}

export interface AutoSaveOptions {
  enabled: boolean
  interval: number // milliseconds
  maxRetries: number
  onSaveSuccess?: (unit: EditableUnit) => void
  onSaveError?: (error: Error, unit: EditableUnit) => void
}

export interface EditorControllerOptions {
  autoSave: AutoSaveOptions
  tabManager: TabManagerOptions
  validation: ValidationContext
  persistence: {
    enableLocalStorage: boolean
    storageKey: string
    enableHistory: boolean
    maxHistoryEntries: number
  }
  performance: {
    enableMetrics: boolean
    updateThrottleMs: number
  }
}

export interface EditorControllerState {
  editor: UnitEditorState
  tabManager: TabManagerState
  performance: PerformanceMetrics | null
  validation: ValidationResult
  actionHistory: EditorAction[]
  lastSaved: Date | null
  isAutoSaving: boolean
  saveRetries: number
}

export interface UnitUpdateResult {
  success: boolean
  updatedUnit: EditableUnit
  validationResult: ValidationResult
  performanceMetrics: PerformanceMetrics | null
  warnings: string[]
}

export interface StateRecovery {
  hasRecoverableState: boolean
  recoveredUnit?: EditableUnit
  recoveryTimestamp?: Date
  recoverySource: 'localStorage' | 'sessionStorage' | 'memory' | 'none'
}

export class UnitEditorController {
  private static defaultOptions: EditorControllerOptions = {
    autoSave: {
      enabled: true,
      interval: 30000, // 30 seconds
      maxRetries: 3
    },
    tabManager: {
      enableUrlSync: true,
      enableTabHistory: true,
      enableValidation: true,
      enableKeyboardShortcuts: true,
      maxHistorySize: 10
    },
    validation: {
      strictMode: false,
      validateOptionalFields: true,
      checkTechCompatibility: true,
      validateConstructionRules: true
    },
    persistence: {
      enableLocalStorage: true,
      storageKey: 'battletech_editor_state',
      enableHistory: true,
      maxHistoryEntries: 50
    },
    performance: {
      enableMetrics: true,
      updateThrottleMs: 100
    }
  }

  private autoSaveTimer: NodeJS.Timeout | null = null
  private updateThrottleTimer: NodeJS.Timeout | null = null
  private lastUpdateTimestamp: number = 0

  /**
   * Initialize editor controller with unit and options
   */
  static initializeController(
    unit: EditableUnit,
    router: NextRouter,
    options: Partial<EditorControllerOptions> = {}
  ): EditorControllerState {
    const opts = { ...this.defaultOptions, ...options }

    // Initialize unit with system components if needed
    const initializedUnit = this.initializeUnit(unit)

    // Create initial editor state
    const editorState: UnitEditorState = {
      unit: initializedUnit,
      activeTab: 'structure',
      validationErrors: [],
      isDirty: false,
      autoSave: opts.autoSave.enabled,
      isLoading: false
    }

    // Initialize tab manager
    const tabManagerState = TabManagerService.initializeTabManager(
      router,
      initializedUnit,
      opts.tabManager
    )

    // Initial validation
    const validationResult = UnitValidationService.validateUnit(initializedUnit, opts.validation)

    // Initial performance metrics
    const performanceMetrics = opts.performance.enableMetrics
      ? UnitCalculationService.calculatePerformanceMetrics(initializedUnit)
      : null

    // Update editor state with validation results
    editorState.activeTab = tabManagerState.activeTab
    editorState.validationErrors = [...validationResult.errors, ...validationResult.warnings]

    return {
      editor: editorState,
      tabManager: tabManagerState,
      performance: performanceMetrics,
      validation: validationResult,
      actionHistory: [],
      lastSaved: null,
      isAutoSaving: false,
      saveRetries: 0
    }
  }

  /**
   * Initialize unit with proper system components and critical allocations
   */
  static initializeUnit(inputUnit: EditableUnit): EditableUnit {
    const unit = { ...inputUnit }

    // Ensure unit has editor metadata
    if (!unit.editorMetadata) {
      unit.editorMetadata = {
        lastModified: new Date(),
        isDirty: false,
        version: '1.0.0',
        isCustom: false
      }
    }

    // Initialize system components if missing
    if (!unit.systemComponents) {
      unit.systemComponents = this.generateDefaultSystemComponents(unit)
    }

    // Initialize critical allocations if missing
    if (!unit.criticalAllocations) {
      unit.criticalAllocations = this.generateDefaultCriticalAllocations(unit)
    }

    // Initialize armor allocation if missing
    if (!unit.armorAllocation) {
      unit.armorAllocation = this.generateDefaultArmorAllocation(unit)
    }

    // Initialize equipment placements if missing
    if (!unit.equipmentPlacements) {
      unit.equipmentPlacements = []
    }

    // Initialize critical slots if missing
    if (!unit.criticalSlots) {
      unit.criticalSlots = []
    }

    // Initialize fluff data if missing
    if (!unit.fluffData) {
      unit.fluffData = {}
    }

    // Initialize selected quirks if missing
    if (!unit.selectedQuirks) {
      unit.selectedQuirks = []
    }

    // Initialize validation state
    unit.validationState = {
      isValid: false,
      errors: [],
      warnings: []
    }

    return unit
  }

  /**
   * Handle unit updates with validation and performance tracking
   */
  static handleUnitUpdate(
    updates: Partial<EditableUnit>,
    currentState: EditorControllerState,
    options: Partial<EditorControllerOptions> = {}
  ): UnitUpdateResult {
    const opts = { ...this.defaultOptions, ...options }
    const warnings: string[] = []

    try {
      // Merge updates with current unit
      const updatedUnit = this.mergeUnitUpdates(currentState.editor.unit, updates)

      // Update editor metadata
      updatedUnit.editorMetadata = {
        ...updatedUnit.editorMetadata,
        lastModified: new Date(),
        isDirty: true
      }

      // Run validation
      const validationResult = UnitValidationService.validateUnit(updatedUnit, opts.validation)

      // Calculate performance metrics if enabled
      let performanceMetrics: PerformanceMetrics | null = null
      if (opts.performance.enableMetrics) {
        try {
          performanceMetrics = UnitCalculationService.calculatePerformanceMetrics(updatedUnit)
          
          // Add performance warnings
          if (performanceMetrics.warnings.length > 0) {
            warnings.push(...performanceMetrics.warnings)
          }
        } catch (error) {
          warnings.push('Failed to calculate performance metrics')
          console.warn('Performance calculation error:', error)
        }
      }

      return {
        success: true,
        updatedUnit,
        validationResult,
        performanceMetrics,
        warnings
      }

    } catch (error) {
      console.error('Unit update failed:', error)
      
      return {
        success: false,
        updatedUnit: currentState.editor.unit, // Return unchanged unit
        validationResult: currentState.validation,
        performanceMetrics: currentState.performance,
        warnings: [`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  /**
   * Handle tab changes with validation
   */
  static async handleTabChange(
    targetTab: EditorTab,
    currentState: EditorControllerState,
    router: NextRouter,
    options: Partial<EditorControllerOptions> = {}
  ): Promise<{
    success: boolean
    updatedState: EditorControllerState
    message?: string
  }> {
    const opts = { ...this.defaultOptions, ...options }

    try {
      // Attempt tab transition
      const transitionResult = await TabManagerService.handleTabChange(
        targetTab,
        currentState.editor.activeTab,
        router,
        currentState.editor.unit,
        currentState.editor.validationErrors,
        opts.tabManager
      )

      if (!transitionResult.success) {
        return {
          success: false,
          updatedState: currentState,
          message: transitionResult.blockedReason
        }
      }

      // Update tab manager state
      const updatedTabManager = {
        ...currentState.tabManager,
        activeTab: targetTab,
        tabHistory: TabManagerService.updateTabHistory(
          currentState.tabManager.tabHistory,
          targetTab,
          opts.tabManager.maxHistorySize
        )
      }

      // Update editor state
      const updatedEditor = {
        ...currentState.editor,
        activeTab: targetTab
      }

      const updatedState: EditorControllerState = {
        ...currentState,
        editor: updatedEditor,
        tabManager: updatedTabManager
      }

      return {
        success: true,
        updatedState,
        message: `Switched to ${targetTab} tab`
      }

    } catch (error) {
      console.error('Tab change failed:', error)
      return {
        success: false,
        updatedState: currentState,
        message: `Failed to switch tabs: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Start auto-save functionality
   */
  static startAutoSave(
    state: EditorControllerState,
    onSave: (unit: EditableUnit) => Promise<void>,
    options: AutoSaveOptions
  ): NodeJS.Timeout {
    return setInterval(async () => {
      if (state.editor.isDirty && !state.isAutoSaving && options.enabled) {
        await this.performAutoSave(state, onSave, options)
      }
    }, options.interval)
  }

  /**
   * Perform auto-save operation
   */
  static async performAutoSave(
    state: EditorControllerState,
    onSave: (unit: EditableUnit) => Promise<void>,
    options: AutoSaveOptions
  ): Promise<void> {
    if (state.isAutoSaving) return

    state.isAutoSaving = true

    try {
      await onSave(state.editor.unit)
      
      // Update state on successful save
      state.editor.isDirty = false
      state.lastSaved = new Date()
      state.saveRetries = 0

      if (options.onSaveSuccess) {
        options.onSaveSuccess(state.editor.unit)
      }

    } catch (error) {
      state.saveRetries++
      
      console.warn(`Auto-save failed (attempt ${state.saveRetries}/${options.maxRetries}):`, error)
      
      if (options.onSaveError) {
        options.onSaveError(error as Error, state.editor.unit)
      }

      // Stop auto-save if max retries exceeded
      if (state.saveRetries >= options.maxRetries) {
        console.error('Auto-save disabled due to repeated failures')
        state.editor.autoSave = false
      }
    } finally {
      state.isAutoSaving = false
    }
  }

  /**
   * Persist editor state to storage
   */
  static persistState(
    state: EditorControllerState,
    storageKey: string = 'battletech_editor_state'
  ): void {
    try {
      const persistedState = {
        unit: state.editor.unit,
        activeTab: state.editor.activeTab,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }

      localStorage.setItem(storageKey, JSON.stringify(persistedState))
    } catch (error) {
      console.warn('Failed to persist editor state:', error)
    }
  }

  /**
   * Recover editor state from storage
   */
  static recoverState(storageKey: string = 'battletech_editor_state'): StateRecovery {
    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) {
        return { hasRecoverableState: false, recoverySource: 'none' }
      }

      const parsedState = JSON.parse(stored)
      
      // Validate recovered state structure
      if (!parsedState.unit || !parsedState.timestamp) {
        return { hasRecoverableState: false, recoverySource: 'none' }
      }

      return {
        hasRecoverableState: true,
        recoveredUnit: parsedState.unit,
        recoveryTimestamp: new Date(parsedState.timestamp),
        recoverySource: 'localStorage'
      }

    } catch (error) {
      console.warn('Failed to recover editor state:', error)
      return { hasRecoverableState: false, recoverySource: 'none' }
    }
  }

  /**
   * Record editor action for history/undo functionality
   */
  static recordAction(
    state: EditorControllerState,
    action: Omit<EditorAction, 'timestamp'>,
    maxHistoryEntries: number = 50
  ): void {
    const fullAction: EditorAction = {
      ...action,
      timestamp: new Date()
    }

    state.actionHistory.push(fullAction)

    // Trim history if it exceeds max entries
    if (state.actionHistory.length > maxHistoryEntries) {
      state.actionHistory = state.actionHistory.slice(-maxHistoryEntries)
    }
  }

  /**
   * Generate default system components for unit
   */
  private static generateDefaultSystemComponents(unit: EditableUnit): any {
    const mass = unit.mass || 50
    const techBase = unit.tech_base || 'Inner Sphere'

    return {
      engine: {
        type: 'Standard',
        rating: mass * 4 // Default to 4/6/6 movement
      },
      gyro: {
        type: 'Standard'
      },
      cockpit: {
        type: 'Standard'
      },
      structure: {
        type: 'Standard'
      },
      armor: {
        type: 'Standard'
      },
      heatSinks: {
        type: techBase.includes('Clan') ? 'Double (Clan)' : 'Single',
        total: 10,
        engineIntegrated: 10,
        externalRequired: 0
      }
    }
  }

  /**
   * Generate default critical allocations
   */
  private static generateDefaultCriticalAllocations(unit: EditableUnit): any {
    // This would generate basic critical slot allocations
    // Implementation depends on the critical slot system structure
    return {}
  }

  /**
   * Generate default armor allocation
   */
  private static generateDefaultArmorAllocation(unit: EditableUnit): any {
    const locations = ['Head', 'Center Torso', 'Left Torso', 'Right Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg']
    const allocation: any = {}

    locations.forEach(location => {
      allocation[location] = {
        front: 0,
        rear: 0,
        maxArmor: this.getMaxArmorForLocation(location, unit.mass || 50),
        type: { id: 'standard', name: 'Standard' }
      }
    })

    return allocation
  }

  /**
   * Get maximum armor for location based on unit mass
   */
  private static getMaxArmorForLocation(location: string, mass: number): number {
    if (location === 'Head') return 9
    
    // Simplified calculation - would be more complex in real implementation
    const baseArmor = Math.floor(mass * 0.3)
    
    switch (location) {
      case 'Center Torso': return Math.floor(baseArmor * 1.5)
      case 'Left Torso':
      case 'Right Torso': return Math.floor(baseArmor * 1.2)
      case 'Left Arm':
      case 'Right Arm': return Math.floor(baseArmor * 0.8)
      case 'Left Leg':
      case 'Right Leg': return Math.floor(baseArmor * 1.0)
      default: return baseArmor
    }
  }

  /**
   * Merge unit updates with current unit
   */
  private static mergeUnitUpdates(currentUnit: EditableUnit, updates: Partial<EditableUnit>): EditableUnit {
    const merged = { ...currentUnit }

    // Deep merge specific objects
    if (updates.systemComponents) {
      merged.systemComponents = {
        ...merged.systemComponents,
        ...updates.systemComponents
      }
    }

    if (updates.data) {
      merged.data = {
        ...merged.data,
        ...updates.data
      }
    }

    if (updates.armorAllocation) {
      merged.armorAllocation = {
        ...merged.armorAllocation,
        ...updates.armorAllocation
      }
    }

    // Type-safe assignment for other properties
    const remainingUpdates = { ...updates }
    delete remainingUpdates.systemComponents
    delete remainingUpdates.data
    delete remainingUpdates.armorAllocation

    return { ...merged, ...remainingUpdates }
  }

  /**
   * Clean up resources
   */
  static cleanup(timers: { autoSave?: NodeJS.Timeout, updateThrottle?: NodeJS.Timeout }): void {
    if (timers.autoSave) {
      clearInterval(timers.autoSave)
    }
    if (timers.updateThrottle) {
      clearTimeout(timers.updateThrottle)
    }
  }

  /**
   * Get editor statistics for debugging
   */
  static getEditorStatistics(state: EditorControllerState): {
    actionCount: number
    validationErrorCount: number
    validationWarningCount: number
    lastActionTimestamp?: Date
    memoryUsage: string
    performance?: PerformanceMetrics
  } {
    const errors = state.validation.errors.length
    const warnings = state.validation.warnings.length
    const lastAction = state.actionHistory[state.actionHistory.length - 1]

    return {
      actionCount: state.actionHistory.length,
      validationErrorCount: errors,
      validationWarningCount: warnings,
      lastActionTimestamp: lastAction?.timestamp,
      memoryUsage: `${JSON.stringify(state).length} characters`,
      performance: state.performance || undefined
    }
  }
}
