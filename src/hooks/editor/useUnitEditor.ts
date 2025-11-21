/**
 * Unit Editor Hooks - React hooks for unit editor functionality
 * Provides clean React integration for all editor services
 * Follows React hooks best practices with proper state management and memoization
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { EditableUnit, EditorTab, ValidationError } from '../../types/editor'
import { 
  UnitEditorController, 
  EditorControllerState, 
  EditorControllerOptions, 
  UnitUpdateResult,
  AutoSaveOptions 
} from '../../utils/editor/UnitEditorController'
import { 
  UnitCalculationService, 
  PerformanceMetrics, 
  UnitCalculationOptions 
} from '../../utils/editor/UnitCalculationService'
import { 
  UnitValidationService, 
  ValidationResult, 
  ValidationContext 
} from '../../utils/editor/UnitValidationService'
import { 
  TabManagerService, 
  TabDefinition, 
  TabTransitionResult 
} from '../../utils/editor/TabManagerService'

export interface UseUnitEditorOptions {
  enableAutoSave?: boolean
  autoSaveInterval?: number
  enablePersistence?: boolean
  enableKeyboardShortcuts?: boolean
  onSave?: (unit: EditableUnit) => Promise<void>
  onValidationChange?: (validation: ValidationResult) => void
  onTabChange?: (tab: EditorTab) => void
}

export interface UseUnitEditorResult {
  // Current state
  unit: EditableUnit
  activeTab: EditorTab
  validationErrors: ValidationError[]
  isValid: boolean
  isDirty: boolean
  isLoading: boolean
  isAutoSaving: boolean
  
  // Calculated metrics
  performance: PerformanceMetrics | null
  validation: ValidationResult
  availableTabs: TabDefinition[]
  
  // Actions
  updateUnit: (updates: Partial<EditableUnit>) => void
  changeTab: (tab: EditorTab) => Promise<boolean>
  save: () => Promise<void>
  reset: () => void
  
  // Utilities
  getTabValidation: (tab: EditorTab) => { hasErrors: boolean; hasWarnings: boolean; summary: string }
  canNavigateToTab: (tab: EditorTab) => boolean
  getNextAvailableTab: () => EditorTab | null
  getPreviousAvailableTab: () => EditorTab | null
}

/**
 * Main unit editor hook - provides complete editor functionality
 */
export function useUnitEditor(
  initialUnit: EditableUnit,
  options: UseUnitEditorOptions = {}
): UseUnitEditorResult {
  const router = useRouter()
  const controllerOptions = useRef<Partial<EditorControllerOptions>>({
    autoSave: {
      enabled: options.enableAutoSave ?? true,
      interval: options.autoSaveInterval ?? 30000,
      maxRetries: 3,
      onSaveSuccess: options.onSave ? undefined : (unit) => console.log('Auto-saved unit:', unit.chassis, unit.model),
      onSaveError: (error, unit) => console.error('Auto-save failed for unit:', unit.chassis, unit.model, error)
    },
    persistence: {
      enableLocalStorage: options.enablePersistence ?? true,
      storageKey: `battletech_editor_${initialUnit.id}`,
      enableHistory: true,
      maxHistoryEntries: 50
    }
  })

  // Initialize controller state
  const [controllerState, setControllerState] = useState<EditorControllerState>(() =>
    UnitEditorController.initializeController(initialUnit, router, controllerOptions.current)
  )

  // Auto-save timer reference
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  // Initialize auto-save
  useEffect(() => {
    if (options.enableAutoSave && options.onSave) {
      autoSaveTimer.current = UnitEditorController.startAutoSave(
        controllerState,
        options.onSave,
        controllerOptions.current.autoSave!
      )
    }

    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current)
      }
    }
  }, [options.enableAutoSave, options.onSave])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!options.enableKeyboardShortcuts) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const key = event.key
        const targetTab = TabManagerService.handleKeyboardShortcut(
          key,
          controllerState.editor.activeTab,
          controllerState.tabManager.availableTabs
        )

        if (targetTab) {
          event.preventDefault()
          changeTab(targetTab)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [options.enableKeyboardShortcuts, controllerState.editor.activeTab, controllerState.tabManager.availableTabs])

  // Memoized calculations
  const performance = useMemo(() => controllerState.performance, [controllerState.performance])
  const validation = useMemo(() => controllerState.validation, [controllerState.validation])
  const availableTabs = useMemo(() => controllerState.tabManager.availableTabs, [controllerState.tabManager.availableTabs])

  // Update unit function
  const updateUnit = useCallback((updates: Partial<EditableUnit>) => {
    const updateResult = UnitEditorController.handleUnitUpdate(
      updates,
      controllerState,
      controllerOptions.current
    )

    if (updateResult.success) {
      setControllerState(prevState => ({
        ...prevState,
        editor: {
          ...prevState.editor,
          unit: updateResult.updatedUnit,
          isDirty: true,
          validationErrors: [...updateResult.validationResult.errors, ...updateResult.validationResult.warnings]
        },
        validation: updateResult.validationResult,
        performance: updateResult.performanceMetrics
      }))

      // Record action
      UnitEditorController.recordAction(
        controllerState,
        {
          type: 'UNIT_UPDATE',
          payload: { updates, warnings: updateResult.warnings }
        }
      )

      // Notify validation change
      if (options.onValidationChange) {
        options.onValidationChange(updateResult.validationResult)
      }

      // Persist state if enabled
      if (options.enablePersistence) {
        UnitEditorController.persistState(controllerState)
      }
    }
  }, [controllerState, options.onValidationChange, options.enablePersistence])

  // Change tab function
  const changeTab = useCallback(async (tab: EditorTab): Promise<boolean> => {
    const result = await UnitEditorController.handleTabChange(
      tab,
      controllerState,
      router,
      controllerOptions.current
    )

    if (result.success) {
      setControllerState(result.updatedState)

      // Record action
      UnitEditorController.recordAction(
        controllerState,
        {
          type: 'TAB_CHANGE',
          payload: { fromTab: controllerState.editor.activeTab, toTab: tab }
        }
      )

      // Notify tab change
      if (options.onTabChange) {
        options.onTabChange(tab)
      }
    }

    return result.success
  }, [controllerState, router, options.onTabChange])

  // Save function
  const save = useCallback(async () => {
    if (options.onSave) {
      setControllerState(prevState => ({
        ...prevState,
        editor: { ...prevState.editor, isLoading: true }
      }))

      try {
        await options.onSave(controllerState.editor.unit)
        
        setControllerState(prevState => ({
          ...prevState,
          editor: { 
            ...prevState.editor, 
            isDirty: false, 
            isLoading: false 
          },
          lastSaved: new Date()
        }))
      } catch (error) {
        setControllerState(prevState => ({
          ...prevState,
          editor: { ...prevState.editor, isLoading: false }
        }))
        throw error
      }
    }
  }, [options.onSave, controllerState.editor.unit])

  // Reset function
  const reset = useCallback(() => {
    const resetState = UnitEditorController.initializeController(
      initialUnit,
      router,
      controllerOptions.current
    )
    setControllerState(resetState)
  }, [initialUnit, router])

  // Utility functions
  const getTabValidation = useCallback((tab: EditorTab) => 
    TabManagerService.getTabValidationSummary(tab, controllerState.editor.validationErrors),
    [controllerState.editor.validationErrors]
  )

  const canNavigateToTab = useCallback((tab: EditorTab) => {
    const tabDef = availableTabs.find(t => t.id === tab)
    return tabDef ? tabDef.isAvailable && tabDef.isEnabled : false
  }, [availableTabs])

  const getNextAvailableTab = useCallback(() =>
    TabManagerService.getNextTab(controllerState.editor.activeTab, availableTabs),
    [controllerState.editor.activeTab, availableTabs]
  )

  const getPreviousAvailableTab = useCallback(() =>
    TabManagerService.getPreviousTab(controllerState.editor.activeTab, availableTabs),
    [controllerState.editor.activeTab, availableTabs]
  )

  return {
    // Current state
    unit: controllerState.editor.unit,
    activeTab: controllerState.editor.activeTab,
    validationErrors: controllerState.editor.validationErrors,
    isValid: controllerState.validation.isValid,
    isDirty: controllerState.editor.isDirty,
    isLoading: controllerState.editor.isLoading,
    isAutoSaving: controllerState.isAutoSaving,
    
    // Calculated metrics
    performance,
    validation,
    availableTabs,
    
    // Actions
    updateUnit,
    changeTab,
    save,
    reset,
    
    // Utilities
    getTabValidation,
    canNavigateToTab,
    getNextAvailableTab,
    getPreviousAvailableTab
  }
}

/**
 * Hook for unit calculations with memoization
 */
export function useUnitCalculations(
  unit: EditableUnit,
  options: Partial<UnitCalculationOptions> = {}
): {
  performance: PerformanceMetrics | null
  isOverweight: boolean
  isOverheating: boolean
  currentWeight: number
  refreshCalculations: () => void
} {
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const refreshCalculations = useCallback(() => {
    if (isCalculating) return

    setIsCalculating(true)
    
    try {
      const metrics = UnitCalculationService.calculatePerformanceMetrics(unit, options)
      setPerformance(metrics)
    } catch (error) {
      console.error('Calculation error:', error)
      setPerformance(null)
    } finally {
      setIsCalculating(false)
    }
  }, [unit, options, isCalculating])

  // Recalculate when unit changes
  useEffect(() => {
    refreshCalculations()
  }, [unit.mass, unit.systemComponents, unit.data, refreshCalculations])

  const isOverweight = useMemo(() => 
    UnitCalculationService.isOverweight(unit), [unit]
  )

  const isOverheating = useMemo(() => 
    UnitCalculationService.isOverheating(unit), [unit]
  )

  const currentWeight = useMemo(() => 
    UnitCalculationService.quickWeightCalculation(unit), [unit]
  )

  return {
    performance,
    isOverweight,
    isOverheating,
    currentWeight,
    refreshCalculations
  }
}

/**
 * Hook for unit validation with debouncing
 */
export function useUnitValidation(
  unit: EditableUnit,
  context: Partial<ValidationContext> = {},
  debounceMs: number = 300
): {
  validation: ValidationResult
  isValidating: boolean
  validateNow: () => void
} {
  const [validation, setValidation] = useState<ValidationResult>(() =>
    UnitValidationService.validateUnit(unit, context)
  )
  const [isValidating, setIsValidating] = useState(false)
  const validationTimer = useRef<NodeJS.Timeout | null>(null)

  const validateNow = useCallback(() => {
    setIsValidating(true)
    
    try {
      const result = UnitValidationService.validateUnit(unit, context)
      setValidation(result)
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setIsValidating(false)
    }
  }, [unit, context])

  // Debounced validation on unit changes
  useEffect(() => {
    if (validationTimer.current) {
      clearTimeout(validationTimer.current)
    }

    validationTimer.current = setTimeout(() => {
      validateNow()
    }, debounceMs)

    return () => {
      if (validationTimer.current) {
        clearTimeout(validationTimer.current)
      }
    }
  }, [unit, context, debounceMs, validateNow])

  return {
    validation,
    isValidating,
    validateNow
  }
}

/**
 * Hook for tab management
 */
export function useTabManager(
  unit: EditableUnit,
  validationErrors: ValidationError[] = [],
  initialTab: EditorTab = 'structure'
): {
  activeTab: EditorTab
  availableTabs: TabDefinition[]
  changeTab: (tab: EditorTab) => Promise<TabTransitionResult>
  canNavigateTo: (tab: EditorTab) => boolean
  getTabMetadata: (tab: EditorTab) => { label: string; description: string; icon?: string }
  nextTab: EditorTab | null
  previousTab: EditorTab | null
} {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab)

  const availableTabs = useMemo(() =>
    TabManagerService.getAvailableTabs(unit, validationErrors),
    [unit, validationErrors]
  )

  const changeTab = useCallback(async (tab: EditorTab): Promise<TabTransitionResult> => {
    const result = await TabManagerService.handleTabChange(
      tab,
      activeTab,
      router,
      unit,
      validationErrors
    )

    if (result.success) {
      setActiveTab(tab)
    }

    return result
  }, [activeTab, router, unit, validationErrors])

  const canNavigateTo = useCallback((tab: EditorTab) => {
    const tabDef = availableTabs.find(t => t.id === tab)
    return tabDef ? tabDef.isAvailable && tabDef.isEnabled : false
  }, [availableTabs])

  const getTabMetadata = useCallback((tab: EditorTab) =>
    TabManagerService.getTabMetadata(tab),
    []
  )

  const nextTab = useMemo(() =>
    TabManagerService.getNextTab(activeTab, availableTabs),
    [activeTab, availableTabs]
  )

  const previousTab = useMemo(() =>
    TabManagerService.getPreviousTab(activeTab, availableTabs),
    [activeTab, availableTabs]
  )

  return {
    activeTab,
    availableTabs,
    changeTab,
    canNavigateTo,
    getTabMetadata,
    nextTab,
    previousTab
  }
}

/**
 * Hook for auto-save functionality
 */
export function useAutoSave(
  unit: EditableUnit,
  isDirty: boolean,
  onSave: (unit: EditableUnit) => Promise<void>,
  options: Partial<AutoSaveOptions> = {}
): {
  isAutoSaving: boolean
  lastSaved: Date | null
  saveNow: () => Promise<void>
  enable: () => void
  disable: () => void
} {
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [enabled, setEnabled] = useState(options.enabled ?? true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const saveNow = useCallback(async () => {
    if (isAutoSaving) return

    setIsAutoSaving(true)
    try {
      await onSave(unit)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Save failed:', error)
      throw error
    } finally {
      setIsAutoSaving(false)
    }
  }, [unit, onSave, isAutoSaving])

  // Auto-save timer
  useEffect(() => {
    if (!enabled || !isDirty || isAutoSaving) return

    const interval = options.interval ?? 30000
    timerRef.current = setTimeout(() => {
      saveNow().catch(error => {
        console.error('Auto-save failed:', error)
      })
    }, interval)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [enabled, isDirty, isAutoSaving, options.interval, saveNow])

  const enable = useCallback(() => setEnabled(true), [])
  const disable = useCallback(() => setEnabled(false), [])

  return {
    isAutoSaving,
    lastSaved,
    saveNow,
    enable,
    disable
  }
}
