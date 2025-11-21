/**
 * Debounced Save Manager - Handles delayed saving to prevent excessive localStorage writes
 * Batches rapid changes and saves after a delay period
 */

export interface SaveCallback<T> {
  (): T
}

export interface SaveHandler<T> {
  (data: T): void
}

export interface DebouncedSaveOptions {
  delay: number
  immediate?: boolean  // Save immediately on critical operations
}

export class DebouncedSaveManager<T> {
  private saveTimeout: NodeJS.Timeout | null = null
  private readonly delay: number
  private readonly saveHandler: SaveHandler<T>
  private pendingSaveData: T | null = null
  private isDestroyed = false

  constructor(saveHandler: SaveHandler<T>, options: DebouncedSaveOptions) {
    this.saveHandler = saveHandler
    this.delay = options.delay
  }

  /**
   * Schedule a save operation with debouncing
   */
  scheduleSave(getDataCallback: SaveCallback<T>): void {
    if (this.isDestroyed) {
      console.warn('[DebouncedSaveManager] Attempted to save after destruction')
      return
    }

    // Get the current data
    try {
      this.pendingSaveData = getDataCallback()
    } catch (error) {
      console.error('[DebouncedSaveManager] Error getting save data:', error)
      return
    }

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }

    // Schedule new save
    this.saveTimeout = setTimeout(() => {
      this.executeSave()
    }, this.delay)

    console.log(`[DebouncedSaveManager] Save scheduled for ${this.delay}ms from now`)
  }

  /**
   * Execute immediate save (bypasses debouncing)
   */
  saveImmediately(getDataCallback: SaveCallback<T>): void {
    if (this.isDestroyed) {
      console.warn('[DebouncedSaveManager] Attempted immediate save after destruction')
      return
    }

    // Cancel any pending debounced save
    this.cancelPendingSave()

    // Get and save data immediately
    try {
      const data = getDataCallback()
      this.saveHandler(data)
      console.log('[DebouncedSaveManager] Immediate save executed')
    } catch (error) {
      console.error('[DebouncedSaveManager] Error during immediate save:', error)
    }
  }

  /**
   * Cancel any pending save operation
   */
  cancelPendingSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
      this.pendingSaveData = null
      console.log('[DebouncedSaveManager] Pending save cancelled')
    }
  }

  /**
   * Check if there's a pending save operation
   */
  hasPendingSave(): boolean {
    return this.saveTimeout !== null
  }

  /**
   * Get the delay setting
   */
  getDelay(): number {
    return this.delay
  }

  /**
   * Execute the pending save operation
   */
  private executeSave(): void {
    if (this.isDestroyed || !this.pendingSaveData) {
      return
    }

    try {
      this.saveHandler(this.pendingSaveData)
      console.log('[DebouncedSaveManager] Debounced save executed')
    } catch (error) {
      console.error('[DebouncedSaveManager] Error during debounced save:', error)
    } finally {
      // Clean up
      this.saveTimeout = null
      this.pendingSaveData = null
    }
  }

  /**
   * Destroy the save manager and cancel any pending operations
   */
  destroy(): void {
    this.cancelPendingSave()
    this.isDestroyed = true
    console.log('[DebouncedSaveManager] Save manager destroyed')
  }

  /**
   * Force execution of any pending save before destruction
   */
  flushAndDestroy(): void {
    if (this.hasPendingSave() && this.pendingSaveData) {
      console.log('[DebouncedSaveManager] Flushing pending save before destruction')
      try {
        this.saveHandler(this.pendingSaveData)
      } catch (error) {
        console.error('[DebouncedSaveManager] Error during flush save:', error)
      }
    }
    this.destroy()
  }
}

/**
 * Multi-tab debounced save manager for handling multiple units
 */
export class MultiTabDebouncedSaveManager {
  private tabSaveManagers: Map<string, DebouncedSaveManager<any>> = new Map()
  private readonly delay: number

  constructor(delay: number = 1000) {
    this.delay = delay
  }

  /**
   * Get or create a save manager for a specific tab
   */
  getTabSaveManager<T>(
    tabId: string, 
    saveHandler: SaveHandler<T>
  ): DebouncedSaveManager<T> {
    let manager = this.tabSaveManagers.get(tabId)
    
    if (!manager) {
      manager = new DebouncedSaveManager(saveHandler, { delay: this.delay })
      this.tabSaveManagers.set(tabId, manager)
      console.log(`[MultiTabDebouncedSaveManager] Created save manager for tab: ${tabId}`)
    }
    
    return manager as DebouncedSaveManager<T>
  }

  /**
   * Remove save manager for a tab (when tab is closed)
   */
  removeTabSaveManager(tabId: string, flush: boolean = true): void {
    const manager = this.tabSaveManagers.get(tabId)
    if (manager) {
      if (flush) {
        manager.flushAndDestroy()
      } else {
        manager.destroy()
      }
      this.tabSaveManagers.delete(tabId)
      console.log(`[MultiTabDebouncedSaveManager] Removed save manager for tab: ${tabId}`)
    }
  }

  /**
   * Schedule save for a specific tab
   */
  scheduleSaveForTab<T>(tabId: string, saveHandler: SaveHandler<T>, getDataCallback: SaveCallback<T>): void {
    const manager = this.getTabSaveManager(tabId, saveHandler)
    manager.scheduleSave(getDataCallback)
  }

  /**
   * Execute immediate save for a specific tab
   */
  saveTabImmediately<T>(tabId: string, saveHandler: SaveHandler<T>, getDataCallback: SaveCallback<T>): void {
    const manager = this.getTabSaveManager(tabId, saveHandler)
    manager.saveImmediately(getDataCallback)
  }

  /**
   * Cancel pending save for a specific tab
   */
  cancelTabSave(tabId: string): void {
    const manager = this.tabSaveManagers.get(tabId)
    if (manager) {
      manager.cancelPendingSave()
    }
  }

  /**
   * Get pending save status for all tabs
   */
  getPendingSaveStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {}
    this.tabSaveManagers.forEach((manager, tabId) => {
      status[tabId] = manager.hasPendingSave()
    })
    return status
  }

  /**
   * Flush all pending saves and destroy all managers
   */
  flushAllAndDestroy(): void {
    console.log('[MultiTabDebouncedSaveManager] Flushing all pending saves and destroying')
    this.tabSaveManagers.forEach((manager, tabId) => {
      manager.flushAndDestroy()
    })
    this.tabSaveManagers.clear()
  }

  /**
   * Get the delay setting
   */
  getDelay(): number {
    return this.delay
  }

  /**
   * Get the number of active tab save managers
   */
  getActiveTabCount(): number {
    return this.tabSaveManagers.size
  }
}

/**
 * Browser event handlers for save flushing
 */
export class SaveManagerBrowserHandlers {
  private static instance: SaveManagerBrowserHandlers | null = null
  private saveManager: MultiTabDebouncedSaveManager | null = null
  private handlersAttached = false

  static getInstance(): SaveManagerBrowserHandlers {
    if (!this.instance) {
      this.instance = new SaveManagerBrowserHandlers()
    }
    return this.instance
  }

  /**
   * Attach the save manager and set up browser event handlers
   */
  attachSaveManager(saveManager: MultiTabDebouncedSaveManager): void {
    this.saveManager = saveManager
    
    if (typeof window !== 'undefined' && !this.handlersAttached) {
      this.setupBrowserHandlers()
      this.handlersAttached = true
    }
  }

  /**
   * Set up browser event handlers to flush saves on critical events
   */
  private setupBrowserHandlers(): void {
    if (typeof window === 'undefined') return

    // Flush saves before page unload
    const handleBeforeUnload = () => {
      if (this.saveManager) {
        console.log('[SaveManagerBrowserHandlers] Page unload detected, flushing saves')
        this.saveManager.flushAllAndDestroy()
      }
    }

    // Flush saves when page becomes hidden (mobile, tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden && this.saveManager) {
        console.log('[SaveManagerBrowserHandlers] Page hidden, flushing saves')
        this.saveManager.flushAllAndDestroy()
      }
    }

    // Attach event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    console.log('[SaveManagerBrowserHandlers] Browser event handlers attached')
  }

  /**
   * Detach save manager and clean up
   */
  detachSaveManager(): void {
    if (this.saveManager) {
      this.saveManager.flushAllAndDestroy()
      this.saveManager = null
    }
  }
}
