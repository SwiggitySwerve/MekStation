/**
 * Event Manager
 * Handles event management, state change notifications, and observer pattern
 * Extracted from UnitCriticalManager.ts for better organization
 */

export type StateChangeCallback = () => void

export interface EventSubscription {
  id: string
  callback: StateChangeCallback
  isActive: boolean
}

export interface EventManagerStats {
  totalSubscribers: number
  activeSubscribers: number
  totalNotifications: number
  lastNotificationTime: Date | null
}

export class EventManager {
  private listeners: Map<string, EventSubscription> = new Map()
  private notificationCount: number = 0
  private lastNotificationTime: Date | null = null
  private static nextSubscriptionId: number = 1

  /**
   * Subscribe to state change events
   */
  subscribe(callback: StateChangeCallback): () => void {
    const subscriptionId = `sub_${EventManager.nextSubscriptionId++}`
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      callback,
      isActive: true
    }
    
    this.listeners.set(subscriptionId, subscription)
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionId)
    }
  }

  /**
   * Unsubscribe from state change events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.listeners.get(subscriptionId)
    if (subscription) {
      subscription.isActive = false
      this.listeners.delete(subscriptionId)
      return true
    }
    return false
  }

  /**
   * Notify all active subscribers of state change
   */
  notifyStateChange(): void {
    this.notificationCount++
    this.lastNotificationTime = new Date()
    
    const activeSubscriptions = Array.from(this.listeners.values()).filter(sub => sub.isActive)
    
    console.log(`[EventManager] Notifying ${activeSubscriptions.length} subscribers of state change`)
    
    activeSubscriptions.forEach(subscription => {
      try {
        subscription.callback()
      } catch (error) {
        console.error(`[EventManager] Error in subscriber ${subscription.id}:`, error)
        // Mark subscription as inactive to prevent future errors
        subscription.isActive = false
      }
    })
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): EventSubscription[] {
    return Array.from(this.listeners.values()).filter(sub => sub.isActive)
  }

  /**
   * Get all subscriptions (including inactive)
   */
  getAllSubscriptions(): EventSubscription[] {
    return Array.from(this.listeners.values())
  }

  /**
   * Clear all subscriptions
   */
  clearAllSubscriptions(): void {
    this.listeners.clear()
    console.log('[EventManager] Cleared all subscriptions')
  }

  /**
   * Get event manager statistics
   */
  getStats(): EventManagerStats {
    const activeSubscriptions = this.getActiveSubscriptions()
    
    return {
      totalSubscribers: this.listeners.size,
      activeSubscribers: activeSubscriptions.length,
      totalNotifications: this.notificationCount,
      lastNotificationTime: this.lastNotificationTime
    }
  }

  /**
   * Check if there are any active subscribers
   */
  hasActiveSubscribers(): boolean {
    return this.getActiveSubscriptions().length > 0
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.listeners.size
  }

  /**
   * Get active subscription count
   */
  getActiveSubscriptionCount(): number {
    return this.getActiveSubscriptions().length
  }

  /**
   * Force cleanup of inactive subscriptions
   */
  cleanupInactiveSubscriptions(): number {
    const beforeCount = this.listeners.size
    const inactiveSubscriptions = Array.from(this.listeners.entries())
      .filter(([_, subscription]) => !subscription.isActive)
    
    inactiveSubscriptions.forEach(([id, _]) => {
      this.listeners.delete(id)
    })
    
    const cleanedCount = beforeCount - this.listeners.size
    if (cleanedCount > 0) {
      console.log(`[EventManager] Cleaned up ${cleanedCount} inactive subscriptions`)
    }
    
    return cleanedCount
  }

  /**
   * Batch notify with error handling
   */
  batchNotify(callbacks: StateChangeCallback[]): void {
    this.notificationCount++
    this.lastNotificationTime = new Date()
    
    console.log(`[EventManager] Batch notifying ${callbacks.length} callbacks`)
    
    callbacks.forEach((callback, index) => {
      try {
        callback()
      } catch (error) {
        console.error(`[EventManager] Error in batch callback ${index}:`, error)
      }
    })
  }

  /**
   * Subscribe with automatic cleanup after first notification
   */
  subscribeOnce(callback: StateChangeCallback): () => void {
    let unsubscribe: (() => void) | null = null
    
    const wrappedCallback = () => {
      try {
        callback()
      } finally {
        if (unsubscribe) {
          unsubscribe()
        }
      }
    }
    
    unsubscribe = this.subscribe(wrappedCallback)
    return unsubscribe
  }

  /**
   * Subscribe with timeout
   */
  subscribeWithTimeout(callback: StateChangeCallback, timeoutMs: number): () => void {
    const timeoutId = setTimeout(() => {
      console.warn(`[EventManager] Subscription timed out after ${timeoutMs}ms`)
    }, timeoutMs)
    
    const wrappedCallback = () => {
      clearTimeout(timeoutId)
      callback()
    }
    
    return this.subscribe(wrappedCallback)
  }
} 