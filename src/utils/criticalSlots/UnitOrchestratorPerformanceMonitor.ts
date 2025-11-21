/**
 * Unit Orchestrator Performance Monitor
 * 
 * Dedicated performance monitoring service using Decorator pattern
 * Extracted from UnitCriticalManager to separate performance concerns
 * 
 * @patterns Decorator, Observer, Strategy
 */

import { 
  PerformanceMonitor, 
  PerformanceMetrics, 
  PerformanceStatistics,
  OrchestratorResult,
  OrchestratorContext
} from './UnitOrchestratorTypes'

/**
 * Performance Monitor Implementation
 */
export class UnitOrchestratorPerformanceMonitor implements PerformanceMonitor {
  private operations: Map<string, PerformanceOperationEntry> = new Map()
  private metrics: PerformanceMetrics[] = []
  private statistics: PerformanceStatistics
  private config: PerformanceMonitorConfig
  private listeners: PerformanceEventListener[] = []

  constructor(config: PerformanceMonitorConfig = {}) {
    this.config = {
      maxMetricsHistory: 1000,
      warningThresholdMs: 100,
      errorThresholdMs: 500,
      enableMemoryTracking: true,
      enableCpuTracking: false,
      enableDetailedLogging: false,
      ...config
    }

    this.statistics = {
      totalOperations: 0,
      averageDuration: 0,
      slowestOperation: null,
      fastestOperation: null,
      recentOperations: [],
      memoryPeak: 0
    }
  }

  /**
   * Start monitoring an operation
   */
  startOperation(operationName: string): string {
    const operationId = this.generateOperationId(operationName)
    const startTime = this.getHighResolutionTime()
    
    const entry: PerformanceOperationEntry = {
      id: operationId,
      name: operationName,
      startTime,
      endTime: 0,
      duration: 0,
      memoryStart: this.config.enableMemoryTracking ? this.getMemoryUsage() : 0,
      memoryEnd: 0,
      cpuStart: this.config.enableCpuTracking ? this.getCpuUsage() : 0,
      cpuEnd: 0,
      metadata: {}
    }

    this.operations.set(operationId, entry)
    
    if (this.config.enableDetailedLogging) {
      console.log(`[PerformanceMonitor] Started operation: ${operationName} (${operationId})`)
    }

    return operationId
  }

  /**
   * End monitoring an operation
   */
  endOperation(operationId: string): PerformanceMetrics {
    const entry = this.operations.get(operationId)
    if (!entry) {
      throw new Error(`Operation ${operationId} not found`)
    }

    const endTime = this.getHighResolutionTime()
    const duration = endTime - entry.startTime
    
    entry.endTime = endTime
    entry.duration = duration
    entry.memoryEnd = this.config.enableMemoryTracking ? this.getMemoryUsage() : 0
    entry.cpuEnd = this.config.enableCpuTracking ? this.getCpuUsage() : 0

    const metrics: PerformanceMetrics = {
      operationName: entry.name,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration,
      memoryUsage: entry.memoryEnd - entry.memoryStart,
      cpuUsage: entry.cpuEnd - entry.cpuStart,
      cacheHits: entry.metadata.cacheHits || 0,
      cacheMisses: entry.metadata.cacheMisses || 0
    }

    // Store metrics
    this.addMetrics(metrics)

    // Update statistics
    this.updateStatistics(metrics)

    // Check thresholds and notify
    this.checkThresholds(metrics)

    // Clean up
    this.operations.delete(operationId)

    if (this.config.enableDetailedLogging) {
      console.log(`[PerformanceMonitor] Ended operation: ${entry.name} (${duration.toFixed(2)}ms)`)
    }

    return metrics
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  /**
   * Get average metrics
   */
  getAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        operationName: 'average',
        startTime: 0,
        endTime: 0,
        duration: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        cacheHits: 0,
        cacheMisses: 0
      }
    }

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    const totalMemory = this.metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0)
    const totalCpu = this.metrics.reduce((sum, m) => sum + (m.cpuUsage || 0), 0)
    const totalCacheHits = this.metrics.reduce((sum, m) => sum + (m.cacheHits || 0), 0)
    const totalCacheMisses = this.metrics.reduce((sum, m) => sum + (m.cacheMisses || 0), 0)

    return {
      operationName: 'average',
      startTime: 0,
      endTime: 0,
      duration: totalDuration / this.metrics.length,
      memoryUsage: totalMemory / this.metrics.length,
      cpuUsage: totalCpu / this.metrics.length,
      cacheHits: totalCacheHits / this.metrics.length,
      cacheMisses: totalCacheMisses / this.metrics.length
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = []
    this.statistics = {
      totalOperations: 0,
      averageDuration: 0,
      slowestOperation: null,
      fastestOperation: null,
      recentOperations: [],
      memoryPeak: 0
    }
  }

  /**
   * Get performance statistics
   */
  getStatistics(): PerformanceStatistics {
    return { ...this.statistics }
  }

  /**
   * Add performance event listener
   */
  addListener(listener: PerformanceEventListener): void {
    this.listeners.push(listener)
  }

  /**
   * Remove performance event listener
   */
  removeListener(listener: PerformanceEventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener)
  }

  /**
   * Create performance decorator for functions
   */
  createDecorator<T extends any[], R>(
    operationName: string,
    fn: (...args: T) => R
  ): (...args: T) => R {
    return (...args: T): R => {
      const operationId = this.startOperation(operationName)
      
      try {
        const result = fn(...args)
        
        // Handle async functions
        if (result instanceof Promise) {
          return result.then(
            (value) => {
              this.endOperation(operationId)
              return value
            },
            (error) => {
              this.endOperation(operationId)
              throw error
            }
          ) as R
        }
        
        this.endOperation(operationId)
        return result
        
      } catch (error) {
        this.endOperation(operationId)
        throw error
      }
    }
  }

  /**
   * Create performance decorator for async functions
   */
  createAsyncDecorator<T extends any[], R>(
    operationName: string,
    fn: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const operationId = this.startOperation(operationName)
      
      try {
        const result = await fn(...args)
        this.endOperation(operationId)
        return result
        
      } catch (error) {
        this.endOperation(operationId)
        throw error
      }
    }
  }

  /**
   * Create performance decorator for methods
   */
  createMethodDecorator<T extends Record<string, any>>(
    target: T,
    methodName: keyof T,
    operationName?: string
  ): T {
    const originalMethod = target[methodName]
    const finalOperationName = operationName || `${target.constructor.name}.${String(methodName)}`
    
    if (typeof originalMethod !== 'function') {
      throw new Error(`${String(methodName)} is not a method`)
    }

    target[methodName] = this.createDecorator(finalOperationName, originalMethod.bind(target)) as T[keyof T]
    
    return target
  }

  /**
   * Monitor orchestrator result
   */
  monitorResult(operationName: string, result: OrchestratorResult): OrchestratorResult {
    if (result.performanceMetrics) {
      this.addMetrics(result.performanceMetrics)
      this.updateStatistics(result.performanceMetrics)
    }
    
    return result
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): PerformanceReport {
    const recentMetrics = this.metrics.slice(-100) // Last 100 operations
    const operationGroups = this.groupMetricsByOperation(recentMetrics)
    
    return {
      summary: this.statistics,
      operationBreakdown: operationGroups,
      recommendations: this.generateRecommendations(operationGroups),
      alerts: this.generateAlerts(recentMetrics),
      trends: this.analyzeTrends(recentMetrics)
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Generate unique operation ID
   */
  private generateOperationId(operationName: string): string {
    return `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get high resolution time
   */
  private getHighResolutionTime(): number {
    return performance.now()
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024 // MB
    }
    return 0
  }

  /**
   * Get CPU usage (placeholder - would need actual implementation)
   */
  private getCpuUsage(): number {
    // This would require platform-specific implementation
    return 0
  }

  /**
   * Add metrics to collection
   */
  private addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics)
    
    // Limit metrics history
    const maxHistory = this.config.maxMetricsHistory || 1000
    if (this.metrics.length > maxHistory) {
      this.metrics.shift()
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(metrics: PerformanceMetrics): void {
    this.statistics.totalOperations++
    
    // Update average
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    this.statistics.averageDuration = totalDuration / this.metrics.length
    
    // Update slowest/fastest
    if (!this.statistics.slowestOperation || metrics.duration > this.statistics.slowestOperation.duration) {
      this.statistics.slowestOperation = metrics
    }
    
    if (!this.statistics.fastestOperation || metrics.duration < this.statistics.fastestOperation.duration) {
      this.statistics.fastestOperation = metrics
    }
    
    // Update recent operations
    this.statistics.recentOperations = this.metrics.slice(-10)
    
    // Update memory peak
    if (metrics.memoryUsage && metrics.memoryUsage > this.statistics.memoryPeak) {
      this.statistics.memoryPeak = metrics.memoryUsage
    }
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const errorThreshold = this.config.errorThresholdMs || 500
    const warningThreshold = this.config.warningThresholdMs || 100
    
    if (metrics.duration > errorThreshold) {
      const event: PerformanceEvent = {
        type: 'error',
        message: `Operation ${metrics.operationName} exceeded error threshold: ${metrics.duration.toFixed(2)}ms`,
        metrics,
        timestamp: Date.now()
      }
      
      this.notifyListeners(event)
      
      if (this.config.enableDetailedLogging) {
        console.error(`[PerformanceMonitor] ${event.message}`)
      }
      
    } else if (metrics.duration > warningThreshold) {
      const event: PerformanceEvent = {
        type: 'warning',
        message: `Operation ${metrics.operationName} exceeded warning threshold: ${metrics.duration.toFixed(2)}ms`,
        metrics,
        timestamp: Date.now()
      }
      
      this.notifyListeners(event)
      
      if (this.config.enableDetailedLogging) {
        console.warn(`[PerformanceMonitor] ${event.message}`)
      }
    }
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(event: PerformanceEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[PerformanceMonitor] Error in event listener:', error)
      }
    })
  }

  /**
   * Group metrics by operation
   */
  private groupMetricsByOperation(metrics: PerformanceMetrics[]): Map<string, PerformanceMetrics[]> {
    const groups = new Map<string, PerformanceMetrics[]>()
    
    metrics.forEach(metric => {
      const operationName = metric.operationName
      if (!groups.has(operationName)) {
        groups.set(operationName, [])
      }
      const group = groups.get(operationName)
      if (group) {
        group.push(metric)
      }
    })
    
    return groups
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(operationGroups: Map<string, PerformanceMetrics[]>): string[] {
    const recommendations: string[] = []
    
    operationGroups.forEach((metrics, operationName) => {
      if (!metrics || metrics.length === 0) {
        return
      }
      
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
      
      if (avgDuration > (this.config.warningThresholdMs || 100)) {
        recommendations.push(`Consider optimizing ${operationName} (avg: ${avgDuration.toFixed(2)}ms)`)
      }
      
      if (metrics.length > 50) {
        recommendations.push(`${operationName} is called frequently (${metrics.length} times) - consider caching`)
      }
    })
    
    return recommendations
  }

  /**
   * Generate performance alerts
   */
  private generateAlerts(metrics: PerformanceMetrics[]): string[] {
    const alerts: string[] = []
    
    const errorThreshold = this.config.errorThresholdMs || 500
    const slowOperations = metrics.filter(m => m.duration > errorThreshold)
    if (slowOperations.length > 0) {
      alerts.push(`${slowOperations.length} operations exceeded error threshold`)
    }
    
    const memorySpikes = metrics.filter(m => m.memoryUsage && m.memoryUsage > 100) // 100MB
    if (memorySpikes.length > 0) {
      alerts.push(`${memorySpikes.length} operations used excessive memory`)
    }
    
    return alerts
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(metrics: PerformanceMetrics[]): PerformanceTrends {
    if (metrics.length < 10) {
      return {
        durationTrend: 'stable',
        memoryTrend: 'stable',
        operationFrequency: 'stable'
      }
    }
    
    const recentMetrics = metrics.slice(-10)
    const olderMetrics = metrics.slice(-20, -10)
    
    const recentAvg = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
    const olderAvg = olderMetrics.reduce((sum, m) => sum + m.duration, 0) / olderMetrics.length
    
    let durationTrend: 'improving' | 'degrading' | 'stable' = 'stable'
    if (recentAvg > olderAvg * 1.1) {
      durationTrend = 'degrading'
    } else if (recentAvg < olderAvg * 0.9) {
      durationTrend = 'improving'
    }
    
    return {
      durationTrend,
      memoryTrend: 'stable', // Would need more complex analysis
      operationFrequency: 'stable' // Would need more complex analysis
    }
  }
}

// ===== SUPPORTING INTERFACES =====

export interface PerformanceMonitorConfig {
  maxMetricsHistory?: number
  warningThresholdMs?: number
  errorThresholdMs?: number
  enableMemoryTracking?: boolean
  enableCpuTracking?: boolean
  enableDetailedLogging?: boolean
}

export interface PerformanceOperationEntry {
  id: string
  name: string
  startTime: number
  endTime: number
  duration: number
  memoryStart: number
  memoryEnd: number
  cpuStart: number
  cpuEnd: number
  metadata: Record<string, any>
}

export interface PerformanceEvent {
  type: 'warning' | 'error' | 'info'
  message: string
  metrics: PerformanceMetrics
  timestamp: number
}

export interface PerformanceReport {
  summary: PerformanceStatistics
  operationBreakdown: Map<string, PerformanceMetrics[]>
  recommendations: string[]
  alerts: string[]
  trends: PerformanceTrends
}

export interface PerformanceTrends {
  durationTrend: 'improving' | 'degrading' | 'stable'
  memoryTrend: 'improving' | 'degrading' | 'stable'
  operationFrequency: 'increasing' | 'decreasing' | 'stable'
}

export type PerformanceEventListener = (event: PerformanceEvent) => void

/**
 * Factory function for creating performance monitor
 */
export const createPerformanceMonitor = (config?: PerformanceMonitorConfig): PerformanceMonitor => {
  return new UnitOrchestratorPerformanceMonitor(config)
}

/**
 * Default performance monitor configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceMonitorConfig = {
  maxMetricsHistory: 1000,
  warningThresholdMs: 100,
  errorThresholdMs: 500,
  enableMemoryTracking: true,
  enableCpuTracking: false,
  enableDetailedLogging: false
}