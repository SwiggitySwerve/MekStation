/**
 * Unit Event Bus - Decoupled event system for unit state changes
 * Handles observer pattern implementation and event coordination
 * Following SOLID principles - Single Responsibility for event management
 */

export type UnitEventType = 
  | 'configuration_changed'
  | 'equipment_allocated' 
  | 'equipment_removed'
  | 'equipment_moved'
  | 'special_components_updated'
  | 'system_components_changed'
  | 'state_reset'
  | 'state_loaded'
  | 'state_saved'
  | 'validation_changed'
  | 'weight_changed'

export interface UnitEventData {
  eventType: UnitEventType
  timestamp: number
  source?: string
  details?: any
}

export type UnitEventCallback = (data: UnitEventData) => void

export interface IUnitEventBus {
  // Event subscription
  subscribe(event: UnitEventType, callback: UnitEventCallback): () => void
  subscribeToAll(callback: UnitEventCallback): () => void
  
  // Event emission
  emit(event: UnitEventType, details?: any, source?: string): void
  
  // Batch operations
  startBatch(): void
  endBatch(): void
  
  // Debugging and monitoring
  getListenerCount(event?: UnitEventType): number
  getEventHistory(limit?: number): UnitEventData[]
  clearEventHistory(): void
  
  // Cleanup
  removeAllListeners(event?: UnitEventType): void
  destroy(): void
}

export class UnitEventBus implements IUnitEventBus {
  private listeners: Map<UnitEventType, UnitEventCallback[]> = new Map()
  private globalListeners: UnitEventCallback[] = []
  private eventHistory: UnitEventData[] = []
  private maxHistorySize: number = 100
  private batchMode: boolean = false
  private batchedEvents: UnitEventData[] = []

  constructor(options?: { maxHistorySize?: number }) {
    this.maxHistorySize = options?.maxHistorySize || 100
    console.log('[UnitEventBus] Event bus initialized')
  }

  /**
   * Subscribe to specific event type
   */
  subscribe(event: UnitEventType, callback: UnitEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    
    this.listeners.get(event)!.push(callback)
    console.log(`[UnitEventBus] Subscribed to event: ${event}`)
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        const index = eventListeners.indexOf(callback)
        if (index >= 0) {
          eventListeners.splice(index, 1)
          console.log(`[UnitEventBus] Unsubscribed from event: ${event}`)
        }
      }
    }
  }

  /**
   * Subscribe to all events
   */
  subscribeToAll(callback: UnitEventCallback): () => void {
    this.globalListeners.push(callback)
    console.log('[UnitEventBus] Subscribed to all events')
    
    // Return unsubscribe function
    return () => {
      const index = this.globalListeners.indexOf(callback)
      if (index >= 0) {
        this.globalListeners.splice(index, 1)
        console.log('[UnitEventBus] Unsubscribed from all events')
      }
    }
  }

  /**
   * Emit event to subscribers
   */
  emit(event: UnitEventType, details?: any, source?: string): void {
    const eventData: UnitEventData = {
      eventType: event,
      timestamp: Date.now(),
      source: source || 'unknown',
      details
    }

    // Add to history
    this.addToHistory(eventData)

    // If in batch mode, queue the event
    if (this.batchMode) {
      this.batchedEvents.push(eventData)
      return
    }

    // Emit immediately
    this.emitEvent(eventData)
  }

  /**
   * Start batch mode - events will be queued until endBatch() is called
   */
  startBatch(): void {
    this.batchMode = true
    this.batchedEvents = []
    console.log('[UnitEventBus] Started batch mode')
  }

  /**
   * End batch mode and emit all queued events
   */
  endBatch(): void {
    if (!this.batchMode) {
      console.warn('[UnitEventBus] endBatch() called but not in batch mode')
      return
    }

    this.batchMode = false
    console.log(`[UnitEventBus] Ending batch mode, emitting ${this.batchedEvents.length} queued events`)

    // Emit all batched events
    const events = [...this.batchedEvents]
    this.batchedEvents = []
    
    events.forEach(eventData => {
      this.emitEvent(eventData)
    })
  }

  /**
   * Get number of listeners for event type(s)
   */
  getListenerCount(event?: UnitEventType): number {
    if (event) {
      const eventListeners = this.listeners.get(event) || []
      return eventListeners.length + this.globalListeners.length
    } else {
      // Count all listeners
      let total = this.globalListeners.length
      this.listeners.forEach(listeners => {
        total += listeners.length
      })
      return total
    }
  }

  /**
   * Get recent event history
   */
  getEventHistory(limit?: number): UnitEventData[] {
    const historyLimit = limit || this.eventHistory.length
    return this.eventHistory.slice(-historyLimit)
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = []
    console.log('[UnitEventBus] Event history cleared')
  }

  /**
   * Remove all listeners for specific event or all events
   */
  removeAllListeners(event?: UnitEventType): void {
    if (event) {
      this.listeners.delete(event)
      console.log(`[UnitEventBus] Removed all listeners for event: ${event}`)
    } else {
      this.listeners.clear()
      this.globalListeners = []
      console.log('[UnitEventBus] Removed all listeners')
    }
  }

  /**
   * Destroy event bus and clean up all resources
   */
  destroy(): void {
    this.removeAllListeners()
    this.clearEventHistory()
    this.batchedEvents = []
    this.batchMode = false
    console.log('[UnitEventBus] Event bus destroyed')
  }

  /**
   * Actually emit the event to listeners
   */
  private emitEvent(eventData: UnitEventData): void {
    const { eventType } = eventData
    
    // Emit to specific event listeners
    const eventListeners = this.listeners.get(eventType) || []
    eventListeners.forEach(callback => {
      this.safeCallback(callback, eventData, `${eventType} listener`)
    })

    // Emit to global listeners
    this.globalListeners.forEach(callback => {
      this.safeCallback(callback, eventData, 'global listener')
    })

    console.log(`[UnitEventBus] Emitted event: ${eventType} to ${eventListeners.length + this.globalListeners.length} listeners`)
  }

  /**
   * Safely execute callback with error handling
   */
  private safeCallback(callback: UnitEventCallback, eventData: UnitEventData, listenerType: string): void {
    try {
      callback(eventData)
    } catch (error) {
      console.error(`[UnitEventBus] Error in ${listenerType}:`, error)
      console.error('Event data:', eventData)
    }
  }

  /**
   * Add event to history with size management
   */
  private addToHistory(eventData: UnitEventData): void {
    this.eventHistory.push(eventData)
    
    // Trim history if it exceeds max size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * Create a filtered event subscription
   */
  subscribeFiltered(
    eventFilter: (event: UnitEventType, details?: any) => boolean,
    callback: UnitEventCallback
  ): () => void {
    const filteredCallback = (eventData: UnitEventData) => {
      if (eventFilter(eventData.eventType, eventData.details)) {
        callback(eventData)
      }
    }

    return this.subscribeToAll(filteredCallback)
  }

  /**
   * Create a one-time event subscription
   */
  subscribeOnce(event: UnitEventType, callback: UnitEventCallback): () => void {
    let unsubscribe: (() => void) | null = null
    
    const onceCallback = (eventData: UnitEventData) => {
      callback(eventData)
      if (unsubscribe) {
        unsubscribe()
      }
    }

    unsubscribe = this.subscribe(event, onceCallback)
    return unsubscribe
  }

  /**
   * Create a debounced event subscription
   */
  subscribeDebounced(
    event: UnitEventType, 
    callback: UnitEventCallback, 
    delay: number = 100
  ): () => void {
    let timeoutId: NodeJS.Timeout | null = null
    let lastEventData: UnitEventData | null = null

    const debouncedCallback = (eventData: UnitEventData) => {
      lastEventData = eventData
      
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        if (lastEventData) {
          callback(lastEventData)
        }
        timeoutId = null
        lastEventData = null
      }, delay)
    }

    const unsubscribe = this.subscribe(event, debouncedCallback)
    
    // Return enhanced unsubscribe that cleans up timeout
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      unsubscribe()
    }
  }

  /**
   * Get debugging information about the event bus
   */
  getDebugInfo(): {
    totalListeners: number
    eventTypes: string[]
    historySize: number
    batchMode: boolean
    batchedEvents: number
  } {
    return {
      totalListeners: this.getListenerCount(),
      eventTypes: Array.from(this.listeners.keys()),
      historySize: this.eventHistory.length,
      batchMode: this.batchMode,
      batchedEvents: this.batchedEvents.length
    }
  }
}

/**
 * Static event bus instance for global use
 */
let globalEventBus: UnitEventBus | null = null

export function getGlobalEventBus(): UnitEventBus {
  if (!globalEventBus) {
    globalEventBus = new UnitEventBus()
  }
  return globalEventBus
}

export function resetGlobalEventBus(): void {
  if (globalEventBus) {
    globalEventBus.destroy()
  }
  globalEventBus = new UnitEventBus()
}

/**
 * Utility function for React components to use event bus
 */
export function useUnitEvents() {
  const eventBus = getGlobalEventBus()
  
  return {
    subscribe: eventBus.subscribe.bind(eventBus),
    emit: eventBus.emit.bind(eventBus),
    subscribeOnce: eventBus.subscribeOnce.bind(eventBus),
    subscribeDebounced: eventBus.subscribeDebounced.bind(eventBus)
  }
}
