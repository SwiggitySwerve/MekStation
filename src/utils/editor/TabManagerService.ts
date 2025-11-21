/**
 * Tab Manager Service - Centralized tab management logic for unit editor
 * Handles tab state, URL synchronization, tab validation, and transitions
 * Follows SOLID principles for maintainable and reusable tab management
 */

import { EditorTab, EditableUnit, ValidationError } from '../../types/editor'
import { NextRouter } from 'next/router'

export interface TabDefinition {
  id: EditorTab
  label: string
  description?: string
  isAvailable: boolean
  isEnabled: boolean
  validationErrors: number
  warnings: number
  icon?: string
  shortcut?: string
}

export interface TabTransitionResult {
  success: boolean
  fromTab: EditorTab
  toTab: EditorTab
  blockedReason?: string
  unsavedChanges?: boolean
}

export interface TabManagerState {
  activeTab: EditorTab
  availableTabs: TabDefinition[]
  tabHistory: EditorTab[]
  canNavigateBack: boolean
  canNavigateForward: boolean
}

export interface TabValidationContext {
  requireValidUnit: boolean
  allowIncompleteTransition: boolean
  validateBeforeSwitch: boolean
}

export interface TabManagerOptions {
  enableUrlSync: boolean
  enableTabHistory: boolean
  enableValidation: boolean
  enableKeyboardShortcuts: boolean
  maxHistorySize: number
}

export class TabManagerService {
  private static defaultOptions: TabManagerOptions = {
    enableUrlSync: true,
    enableTabHistory: true,
    enableValidation: true,
    enableKeyboardShortcuts: true,
    maxHistorySize: 10
  }

  private static defaultValidationContext: TabValidationContext = {
    requireValidUnit: false,
    allowIncompleteTransition: true,
    validateBeforeSwitch: false
  }

  // Standard tab definitions for BattleTech Editor
  private static readonly TAB_DEFINITIONS: Array<{
    id: EditorTab
    label: string
    description: string
    requirements?: string[]
    icon?: string
    shortcut?: string
  }> = [
    {
      id: 'structure',
      label: 'Structure',
      description: 'Configure basic unit properties, engine, and systems',
      icon: '🏗️',
      shortcut: '1'
    },
    {
      id: 'equipment',
      label: 'Equipment',
      description: 'Add and configure weapons and equipment',
      requirements: ['structure'],
      icon: '⚔️',
      shortcut: '2'
    },
    {
      id: 'criticals',
      label: 'Criticals',
      description: 'Allocate equipment to critical slot locations',
      requirements: ['structure', 'equipment'],
      icon: '🎯',
      shortcut: '3'
    },
    {
      id: 'fluff',
      label: 'Fluff',
      description: 'Add background information and lore',
      icon: '📖',
      shortcut: '4'
    },
    {
      id: 'quirks',
      label: 'Quirks',
      description: 'Configure unit quirks and special abilities',
      requirements: ['structure'],
      icon: '✨',
      shortcut: '5'
    },
    {
      id: 'preview',
      label: 'Preview',
      description: 'Preview final unit configuration and export',
      requirements: ['structure'],
      icon: '👁️',
      shortcut: '6'
    }
  ]

  /**
   * Initialize tab manager with default tab
   */
  static initializeTabManager(
    router: NextRouter,
    unit?: EditableUnit,
    options: Partial<TabManagerOptions> = {}
  ): TabManagerState {
    const opts = { ...this.defaultOptions, ...options }
    const initialTab = this.getInitialTabFromUrl(router)
    const availableTabs = this.getAvailableTabs(unit, [])

    return {
      activeTab: initialTab,
      availableTabs,
      tabHistory: [initialTab],
      canNavigateBack: false,
      canNavigateForward: false
    }
  }

  /**
   * Get initial tab from URL or default
   */
  static getInitialTabFromUrl(router: NextRouter): EditorTab {
    const tab = router.query.tab
    if (tab && typeof tab === 'string') {
      const validTab = this.TAB_DEFINITIONS.find(t => t.id === tab)
      if (validTab) {
        return tab as EditorTab
      }
    }
    return 'structure' // Default tab
  }

  /**
   * Handle tab change with validation and URL sync
   */
  static async handleTabChange(
    targetTab: EditorTab,
    currentTab: EditorTab,
    router: NextRouter,
    unit: EditableUnit,
    validationErrors: ValidationError[] = [],
    options: Partial<TabManagerOptions> = {},
    validationContext: Partial<TabValidationContext> = {}
  ): Promise<TabTransitionResult> {
    const opts = { ...this.defaultOptions, ...options }
    const ctx = { ...this.defaultValidationContext, ...validationContext }

    // Check if target tab is available
    const availableTabs = this.getAvailableTabs(unit, validationErrors)
    const targetTabDef = availableTabs.find(tab => tab.id === targetTab)
    
    if (!targetTabDef) {
      return {
        success: false,
        fromTab: currentTab,
        toTab: targetTab,
        blockedReason: 'Tab not found'
      }
    }

    if (!targetTabDef.isAvailable) {
      return {
        success: false,
        fromTab: currentTab,
        toTab: targetTab,
        blockedReason: 'Tab not available - check requirements'
      }
    }

    if (!targetTabDef.isEnabled) {
      return {
        success: false,
        fromTab: currentTab,
        toTab: targetTab,
        blockedReason: 'Tab disabled due to validation errors'
      }
    }

    // Validate transition if required
    if (ctx.validateBeforeSwitch) {
      const transitionValidation = this.validateTabTransition(currentTab, targetTab, unit, validationErrors, ctx)
      if (!transitionValidation.success) {
        return transitionValidation
      }
    }

    // Update URL if sync is enabled
    if (opts.enableUrlSync) {
      await this.syncTabWithUrl(targetTab, router)
    }

    return {
      success: true,
      fromTab: currentTab,
      toTab: targetTab
    }
  }

  /**
   * Get available tabs with current status
   */
  static getAvailableTabs(
    unit?: EditableUnit,
    validationErrors: ValidationError[] = []
  ): TabDefinition[] {
    return this.TAB_DEFINITIONS.map(tabDef => {
      const isAvailable = this.checkTabAvailability(tabDef.id, unit)
      const isEnabled = this.checkTabEnabled(tabDef.id, unit, validationErrors)
      const tabErrors = validationErrors.filter(error => this.isErrorRelevantToTab(error, tabDef.id))
      const criticalErrors = tabErrors.filter(error => error.category === 'error').length
      const warnings = tabErrors.filter(error => error.category === 'warning').length

      return {
        id: tabDef.id,
        label: tabDef.label,
        description: tabDef.description,
        isAvailable,
        isEnabled,
        validationErrors: criticalErrors,
        warnings,
        icon: tabDef.icon,
        shortcut: tabDef.shortcut
      }
    })
  }

  /**
   * Check if tab meets availability requirements
   */
  static checkTabAvailability(tabId: EditorTab, unit?: EditableUnit): boolean {
    const tabDef = this.TAB_DEFINITIONS.find(t => t.id === tabId)
    if (!tabDef || !tabDef.requirements) {
      return true // No requirements
    }

    // Check unit-specific requirements
    if (!unit) {
      return false // Unit required but not provided
    }

    for (const requirement of tabDef.requirements) {
      switch (requirement) {
        case 'structure':
          if (!unit.systemComponents || !unit.chassis || !unit.model) {
            return false
          }
          break
        case 'equipment':
          // Equipment tab available once structure is configured
          if (!unit.systemComponents) {
            return false
          }
          break
        default:
          // Unknown requirement - assume not met
          return false
      }
    }

    return true
  }

  /**
   * Check if tab is enabled (not blocked by critical errors)
   */
  static checkTabEnabled(
    tabId: EditorTab,
    unit?: EditableUnit,
    validationErrors: ValidationError[] = []
  ): boolean {
    // Always allow structure tab
    if (tabId === 'structure') {
      return true
    }

    // Check for critical errors that block tab access
    const criticalErrors = validationErrors.filter(error => error.category === 'error')
    const blockingErrors = criticalErrors.filter(error => this.isErrorBlockingForTab(error, tabId))

    return blockingErrors.length === 0
  }

  /**
   * Validate tab transition
   */
  static validateTabTransition(
    fromTab: EditorTab,
    toTab: EditorTab,
    unit: EditableUnit,
    validationErrors: ValidationError[],
    context: TabValidationContext
  ): TabTransitionResult {
    // Check if we're leaving a tab with unsaved critical changes
    if (context.requireValidUnit && fromTab !== toTab) {
      const criticalErrors = validationErrors.filter(error => 
        error.category === 'error' && this.isErrorRelevantToTab(error, fromTab)
      )

      if (criticalErrors.length > 0 && !context.allowIncompleteTransition) {
        return {
          success: false,
          fromTab,
          toTab,
          blockedReason: `Please resolve ${criticalErrors.length} critical error(s) before leaving ${fromTab} tab`,
          unsavedChanges: true
        }
      }
    }

    return {
      success: true,
      fromTab,
      toTab
    }
  }

  /**
   * Sync tab with URL
   */
  static async syncTabWithUrl(tab: EditorTab, router: NextRouter): Promise<void> {
    try {
      await router.push({
        pathname: router.pathname,
        query: { ...router.query, tab }
      }, undefined, { shallow: true })
    } catch (error) {
      console.warn('Failed to sync tab with URL:', error)
    }
  }

  /**
   * Update tab history
   */
  static updateTabHistory(
    currentHistory: EditorTab[],
    newTab: EditorTab,
    maxHistorySize: number = 10
  ): EditorTab[] {
    // Don't add duplicate consecutive entries
    if (currentHistory.length > 0 && currentHistory[currentHistory.length - 1] === newTab) {
      return currentHistory
    }

    const newHistory = [...currentHistory, newTab]
    
    // Trim history if it exceeds max size
    if (newHistory.length > maxHistorySize) {
      return newHistory.slice(-maxHistorySize)
    }
    
    return newHistory
  }

  /**
   * Get next available tab
   */
  static getNextTab(
    currentTab: EditorTab,
    availableTabs: TabDefinition[]
  ): EditorTab | null {
    const currentIndex = this.TAB_DEFINITIONS.findIndex(tab => tab.id === currentTab)
    
    for (let i = currentIndex + 1; i < this.TAB_DEFINITIONS.length; i++) {
      const nextTabId = this.TAB_DEFINITIONS[i].id
      const nextTab = availableTabs.find(tab => tab.id === nextTabId)
      
      if (nextTab && nextTab.isAvailable && nextTab.isEnabled) {
        return nextTabId
      }
    }
    
    return null
  }

  /**
   * Get previous available tab
   */
  static getPreviousTab(
    currentTab: EditorTab,
    availableTabs: TabDefinition[]
  ): EditorTab | null {
    const currentIndex = this.TAB_DEFINITIONS.findIndex(tab => tab.id === currentTab)
    
    for (let i = currentIndex - 1; i >= 0; i--) {
      const prevTabId = this.TAB_DEFINITIONS[i].id
      const prevTab = availableTabs.find(tab => tab.id === prevTabId)
      
      if (prevTab && prevTab.isAvailable && prevTab.isEnabled) {
        return prevTabId
      }
    }
    
    return null
  }

  /**
   * Check if validation error is relevant to specific tab
   */
  private static isErrorRelevantToTab(error: ValidationError, tabId: EditorTab): boolean {
    if (!error.field) return false

    const fieldTabMapping: Record<string, EditorTab[]> = {
      'chassis': ['structure'],
      'model': ['structure'],
      'mass': ['structure'],
      'tech_base': ['structure'],
      'systemComponents': ['structure'],
      'engine': ['structure'],
      'weight': ['structure', 'equipment'],
      'heat': ['structure', 'equipment'],
      'armor': ['structure'],
      'criticals': ['criticals'],
      'equipment': ['equipment', 'criticals']
    }

    const relevantTabs = fieldTabMapping[error.field] || []
    return relevantTabs.includes(tabId)
  }

  /**
   * Check if validation error blocks access to specific tab
   */
  private static isErrorBlockingForTab(error: ValidationError, tabId: EditorTab): boolean {
    // Only critical errors can block tab access
    if (error.category !== 'error') return false

    const blockingRules: Record<string, EditorTab[]> = {
      'missing-chassis': ['equipment', 'criticals', 'preview'],
      'missing-model': ['equipment', 'criticals', 'preview'],
      'invalid-mass': ['equipment', 'criticals', 'preview'],
      'missing-engine': ['equipment', 'criticals'],
      'unit-overweight': ['criticals', 'preview']
    }

    const blockedTabs = blockingRules[error.id] || []
    return blockedTabs.includes(tabId)
  }

  /**
   * Get tab metadata for UI display
   */
  static getTabMetadata(tabId: EditorTab): {
    label: string
    description: string
    icon?: string
    shortcut?: string
  } {
    const tabDef = this.TAB_DEFINITIONS.find(t => t.id === tabId)
    return {
      label: tabDef?.label || tabId,
      description: tabDef?.description || `Configure ${tabId} settings`,
      icon: tabDef?.icon,
      shortcut: tabDef?.shortcut
    }
  }

  /**
   * Handle keyboard shortcuts for tab navigation
   */
  static handleKeyboardShortcut(
    key: string,
    currentTab: EditorTab,
    availableTabs: TabDefinition[]
  ): EditorTab | null {
    // Number keys 1-6 for direct tab access
    const shortcutTab = this.TAB_DEFINITIONS.find(tab => tab.shortcut === key)
    if (shortcutTab) {
      const targetTab = availableTabs.find(tab => tab.id === shortcutTab.id)
      if (targetTab && targetTab.isAvailable && targetTab.isEnabled) {
        return shortcutTab.id
      }
    }

    // Arrow keys for next/previous
    switch (key) {
      case 'ArrowRight':
      case 'Tab':
        return this.getNextTab(currentTab, availableTabs)
      case 'ArrowLeft':
      case 'Shift+Tab':
        return this.getPreviousTab(currentTab, availableTabs)
      default:
        return null
    }
  }

  /**
   * Generate tab transition animation config
   */
  static getTabTransitionConfig(fromTab: EditorTab, toTab: EditorTab): {
    direction: 'forward' | 'backward'
    duration: number
    easing: string
  } {
    const fromIndex = this.TAB_DEFINITIONS.findIndex(tab => tab.id === fromTab)
    const toIndex = this.TAB_DEFINITIONS.findIndex(tab => tab.id === toTab)
    
    return {
      direction: toIndex > fromIndex ? 'forward' : 'backward',
      duration: 300,
      easing: 'ease-in-out'
    }
  }

  /**
   * Get validation summary for tab
   */
  static getTabValidationSummary(
    tabId: EditorTab,
    validationErrors: ValidationError[]
  ): {
    hasErrors: boolean
    hasWarnings: boolean
    errorCount: number
    warningCount: number
    summary: string
  } {
    const relevantErrors = validationErrors.filter(error => this.isErrorRelevantToTab(error, tabId))
    const errors = relevantErrors.filter(error => error.category === 'error')
    const warnings = relevantErrors.filter(error => error.category === 'warning')

    const errorCount = errors.length
    const warningCount = warnings.length
    const hasErrors = errorCount > 0
    const hasWarnings = warningCount > 0

    let summary = 'No issues'
    if (hasErrors && hasWarnings) {
      summary = `${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}`
    } else if (hasErrors) {
      summary = `${errorCount} error${errorCount !== 1 ? 's' : ''}`
    } else if (hasWarnings) {
      summary = `${warningCount} warning${warningCount !== 1 ? 's' : ''}`
    }

    return {
      hasErrors,
      hasWarnings,
      errorCount,
      warningCount,
      summary
    }
  }
}
