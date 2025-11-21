/**
 * Unit Orchestrator State Change Notifier
 * 
 * Dedicated state change notification service using Observer pattern
 * Extracted from UnitCriticalManager to separate observer concerns
 * 
 * @patterns Observer, Strategy, Command
 */

import { 
  StateChangeNotifier, 
  StateChangeListener, 
  StateChangeEvent, 
  StateChangeType,
  UnitState,
  UnitConfiguration
} from './UnitOrchestratorTypes'

/**
 * State Change Notifier Implementation
 */
export class UnitOrchestratorStateNotifier implements StateChangeNotifier {
  private listeners: StateChangeListener[] = []
  private eventQueue: StateChangeEvent[] = []
  private config: StateNotifierConfig
  private isProcessing = false
  private history: StateChangeEvent[] = []
  
  constructor(config: StateNotifierConfig = {}) {
    this.config = {
      enableBatching: false,
      batchIntervalMs: 100,
      maxHistorySize: 1000,
      enableLogging: false,
      enableFiltering: true,
      throttleMs: 50,
      ...config
    }
    
    if (this.config.enableBatching) {
      this.setupBatchProcessing()
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateChangeListener): () => void {
    // Insert listener in priority order (higher priority first)
    const insertIndex = this.listeners.findIndex(l => l.priority < listener.priority)
    if (insertIndex === -1) {
      this.listeners.push(listener)
    } else {
      this.listeners.splice(insertIndex, 0, listener)
    }
    
    if (this.config.enableLogging) {
      console.log(`[StateNotifier] Listener subscribed with priority ${listener.priority}`)
    }
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(listener)
    }
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(listener: StateChangeListener): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
      
      if (this.config.enableLogging) {
        console.log(`[StateNotifier] Listener unsubscribed`)
      }
    }
  }

  /**
   * Notify listeners of state change
   */
  notify(event: StateChangeEvent): void {
    // Add to history
    this.addToHistory(event)
    
    if (this.config.enableBatching) {
      this.eventQueue.push(event)
    } else {
      this.processEvent(event)
    }
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners = []
    this.eventQueue = []
    this.history = []
    
    if (this.config.enableLogging) {
      console.log(`[StateNotifier] All listeners cleared`)
    }
  }

  /**
   * Get listener count
   */
  getListenerCount(): number {
    return this.listeners.length
  }

  /**
   * Get event history
   */
  getEventHistory(): StateChangeEvent[] {
    return [...this.history]
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): StateChangeEvent[] {
    return this.history.slice(-count)
  }

  /**
   * Filter events by type
   */
  filterEventsByType(eventType: StateChangeType): StateChangeEvent[] {
    return this.history.filter(event => event.eventType === eventType)
  }

  /**
   * Create state change event
   */
  createStateChangeEvent(
    eventType: StateChangeType,
    previousState: UnitState,
    newState: UnitState,
    metadata?: Record<string, any>
  ): StateChangeEvent {
    const changedFields = this.detectChangedFields(previousState, newState)
    
    return {
      eventType,
      timestamp: Date.now(),
      previousState,
      newState,
      changedFields,
      metadata
    }
  }

  /**
   * Batch notify multiple events
   */
  batchNotify(events: StateChangeEvent[]): void {
    if (this.config.enableBatching) {
      this.eventQueue.push(...events)
    } else {
      events.forEach(event => this.processEvent(event))
    }
  }

  /**
   * Create configuration change event
   */
  createConfigurationChangeEvent(
    previousConfig: UnitConfiguration,
    newConfig: UnitConfiguration,
    metadata?: Record<string, any>
  ): StateChangeEvent {
    // Create minimal state objects for the event
    const previousState: UnitState = {
      configuration: previousConfig,
      sections: new Map(),
      unallocatedEquipment: [],
      systemAllocations: {
        engine: { centerTorso: [], leftTorso: [], rightTorso: [], totalSlots: 0 },
        gyro: { centerTorso: [], totalSlots: 0 },
        cockpit: { head: [], totalSlots: 0 },
        lifeSupportSensors: { head: [], totalSlots: 0 }
      },
      lastModified: Date.now()
    }
    
    const newState: UnitState = {
      ...previousState,
      configuration: newConfig,
      lastModified: Date.now()
    }
    
    return this.createStateChangeEvent(
      StateChangeType.CONFIGURATION_UPDATED,
      previousState,
      newState,
      metadata
    )
  }

  /**
   * Create equipment allocation event
   */
  createEquipmentAllocationEvent(
    equipmentId: string,
    location: string,
    slot: number,
    metadata?: Record<string, any>
  ): StateChangeEvent {
    // This would need the actual state - simplified for demonstration
    const dummyState: UnitState = {
      configuration: {} as UnitConfiguration,
      sections: new Map(),
      unallocatedEquipment: [],
      systemAllocations: {
        engine: { centerTorso: [], leftTorso: [], rightTorso: [], totalSlots: 0 },
        gyro: { centerTorso: [], totalSlots: 0 },
        cockpit: { head: [], totalSlots: 0 },
        lifeSupportSensors: { head: [], totalSlots: 0 }
      },
      lastModified: Date.now()
    }
    
    return this.createStateChangeEvent(
      StateChangeType.EQUIPMENT_ALLOCATED,
      dummyState,
      dummyState,
      {
        equipmentId,
        location,
        slot,
        ...metadata
      }
    )
  }

  /**
   * Setup throttling for high-frequency events
   */
  setupThrottling(): void {
    if (this.config.throttleMs && this.config.throttleMs > 0) {
      // Implementation would use a throttling mechanism
      // For now, just log that throttling is enabled
      if (this.config.enableLogging) {
        console.log(`[StateNotifier] Throttling enabled: ${this.config.throttleMs}ms`)
      }
    }
  }

  /**
   * Get notification statistics
   */
  getNotificationStatistics(): NotificationStatistics {
    const eventTypeCounts = new Map<StateChangeType, number>()
    
    this.history.forEach(event => {
      const count = eventTypeCounts.get(event.eventType) || 0
      eventTypeCounts.set(event.eventType, count + 1)
    })
    
    return {
      totalNotifications: this.history.length,
      activeListeners: this.listeners.length,
      eventTypeCounts,
      queueSize: this.eventQueue.length,
      isProcessing: this.isProcessing,
      lastEventTime: this.history.length > 0 ? this.history[this.history.length - 1].timestamp : 0
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Process individual event
   */
  private processEvent(event: StateChangeEvent): void {
    if (this.config.enableLogging) {
      console.log(`[StateNotifier] Processing event: ${event.eventType}`)
    }
    
    // Filter listeners that can handle this event type
    const applicableListeners = this.config.enableFiltering
      ? this.listeners.filter(listener => listener.canHandle(event.eventType))
      : this.listeners
    
    // Notify listeners in priority order
    applicableListeners.forEach(listener => {
      try {
        listener.onStateChange(event)
      } catch (error) {
        console.error(`[StateNotifier] Error in listener for ${event.eventType}:`, error)
      }
    })
  }

  /**
   * Setup batch processing
   */
  private setupBatchProcessing(): void {
    setInterval(() => {
      if (this.eventQueue.length > 0 && !this.isProcessing) {
        this.processBatch()
      }
    }, this.config.batchIntervalMs)
  }

  /**
   * Process batch of events
   */
  private processBatch(): void {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return
    }
    
    this.isProcessing = true
    
    const batch = [...this.eventQueue]
    this.eventQueue = []
    
    if (this.config.enableLogging) {
      console.log(`[StateNotifier] Processing batch of ${batch.length} events`)
    }
    
    // Group events by type for efficient processing
    const eventGroups = this.groupEventsByType(batch)
    
    // Process each group
    eventGroups.forEach((events, eventType) => {
      // For batched events, we could merge similar events or process them together
      events.forEach(event => this.processEvent(event))
    })
    
    this.isProcessing = false
  }

  /**
   * Group events by type
   */
  private groupEventsByType(events: StateChangeEvent[]): Map<StateChangeType, StateChangeEvent[]> {
    const groups = new Map<StateChangeType, StateChangeEvent[]>()
    
    events.forEach(event => {
      const eventType = event.eventType
      if (!groups.has(eventType)) {
        groups.set(eventType, [])
      }
      const group = groups.get(eventType)
      if (group) {
        group.push(event)
      }
    })
    
    return groups
  }

  /**
   * Add event to history
   */
  private addToHistory(event: StateChangeEvent): void {
    this.history.push(event)
    
    // Limit history size
    const maxHistory = this.config.maxHistorySize || 1000
    if (this.history.length > maxHistory) {
      this.history.shift()
    }
  }

  /**
   * Detect changed fields between states
   */
  private detectChangedFields(previousState: UnitState, newState: UnitState): string[] {
    const changedFields: string[] = []
    
    // Check configuration changes
    if (previousState.configuration !== newState.configuration) {
      changedFields.push('configuration')
      
      // Check specific configuration fields
      const configFields = ['tonnage', 'engineType', 'engineRating', 'gyroType', 'structureType', 'armorType', 'heatSinkType', 'techBase']
      configFields.forEach(field => {
        if (previousState.configuration[field] !== newState.configuration[field]) {
          changedFields.push(`configuration.${field}`)
        }
      })
    }
    
    // Check sections changes
    if (previousState.sections.size !== newState.sections.size) {
      changedFields.push('sections')
    }
    
    // Check unallocated equipment changes
    if (previousState.unallocatedEquipment.length !== newState.unallocatedEquipment.length) {
      changedFields.push('unallocatedEquipment')
    }
    
    // Check system allocations changes
    if (previousState.systemAllocations !== newState.systemAllocations) {
      changedFields.push('systemAllocations')
    }
    
    return changedFields
  }
}

// ===== SUPPORTING INTERFACES =====

export interface StateNotifierConfig {
  enableBatching?: boolean
  batchIntervalMs?: number
  maxHistorySize?: number
  enableLogging?: boolean
  enableFiltering?: boolean
  throttleMs?: number
}

export interface NotificationStatistics {
  totalNotifications: number
  activeListeners: number
  eventTypeCounts: Map<StateChangeType, number>
  queueSize: number
  isProcessing: boolean
  lastEventTime: number
}

/**
 * Priority-based listener implementation
 */
export class PriorityStateChangeListener implements StateChangeListener {
  constructor(
    private callback: (event: StateChangeEvent) => void,
    private eventTypes: StateChangeType[] = [],
    public priority: number = 0
  ) {}

  onStateChange(event: StateChangeEvent): void {
    this.callback(event)
  }

  canHandle(eventType: StateChangeType): boolean {
    return this.eventTypes.length === 0 || this.eventTypes.includes(eventType)
  }
}

/**
 * Logging state change listener
 */
export class LoggingStateChangeListener implements StateChangeListener {
  public priority = -1000 // Low priority - logs after other listeners

  onStateChange(event: StateChangeEvent): void {
    console.log(`[StateNotifier] State changed: ${event.eventType}`, {
      timestamp: new Date(event.timestamp).toISOString(),
      changedFields: event.changedFields,
      metadata: event.metadata
    })
  }

  canHandle(eventType: StateChangeType): boolean {
    return true // Log all event types
  }
}

/**
 * Filtering state change listener
 */
export class FilteringStateChangeListener implements StateChangeListener {
  constructor(
    private callback: (event: StateChangeEvent) => void,
    private filter: (event: StateChangeEvent) => boolean,
    public priority: number = 0
  ) {}

  onStateChange(event: StateChangeEvent): void {
    if (this.filter(event)) {
      this.callback(event)
    }
  }

  canHandle(eventType: StateChangeType): boolean {
    return true // Filter is applied in onStateChange
  }
}

/**
 * Factory function for creating state notifier
 */
export const createStateNotifier = (config?: StateNotifierConfig): StateChangeNotifier => {
  return new UnitOrchestratorStateNotifier(config)
}

/**
 * Factory function for creating priority listener
 */
export const createPriorityListener = (
  callback: (event: StateChangeEvent) => void,
  eventTypes: StateChangeType[] = [],
  priority: number = 0
): StateChangeListener => {
  return new PriorityStateChangeListener(callback, eventTypes, priority)
}

/**
 * Factory function for creating logging listener
 */
export const createLoggingListener = (): StateChangeListener => {
  return new LoggingStateChangeListener()
}

/**
 * Factory function for creating filtering listener
 */
export const createFilteringListener = (
  callback: (event: StateChangeEvent) => void,
  filter: (event: StateChangeEvent) => boolean,
  priority: number = 0
): StateChangeListener => {
  return new FilteringStateChangeListener(callback, filter, priority)
}

/**
 * Default state notifier configuration
 */
export const DEFAULT_STATE_NOTIFIER_CONFIG: StateNotifierConfig = {
  enableBatching: false,
  batchIntervalMs: 100,
  maxHistorySize: 1000,
  enableLogging: false,
  enableFiltering: true,
  throttleMs: 50
}