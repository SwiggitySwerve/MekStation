/**
 * Performance Optimizer - Comprehensive performance optimization utilities
 * Implements the documented performance optimization patterns
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react'

// CRITICAL: Performance monitoring utilities
export interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  componentCount: number
  reRenderCount: number
}

export interface PerformanceConfig {
  enableMemoization: boolean
  enableLazyLoading: boolean
  enableVirtualScrolling: boolean
  enableCaching: boolean
  debounceDelay: number
  cacheSize: number
  virtualScrollItemHeight: number
  virtualScrollBuffer: number
}

// CRITICAL: Default performance configuration
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableMemoization: true,
  enableLazyLoading: true,
  enableVirtualScrolling: true,
  enableCaching: true,
  debounceDelay: 300,
  cacheSize: 1000,
  virtualScrollItemHeight: 50,
  virtualScrollBuffer: 5
}

// CRITICAL: Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef(performance.now())
  const metrics = useRef<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
    reRenderCount: 0
  })

  useEffect(() => {
    const startTime = performance.now()
    renderCount.current++

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
                   // CRITICAL: Safe memory usage access
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0
      
      metrics.current = {
        renderTime,
        memoryUsage,
        componentCount: renderCount.current,
        reRenderCount: renderCount.current - 1
      }

      // CRITICAL: Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          memoryUsage: `${(metrics.current.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
          renderCount: renderCount.current
        })
      }
    }
  })

  return metrics.current
}

// CRITICAL: Memoization utilities
export function createMemoizedSelector<T, R>(
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
) {
  let lastState: T | null = null
  let lastResult: R | null = null

  return (state: T): R => {
    if (lastState === state) {
      return lastResult!
    }

    const result = selector(state)
    
    if (equalityFn ? equalityFn(lastResult!, result) : lastResult === result) {
      return lastResult!
    }

    lastState = state
    lastResult = result
    return result
  }
}

// CRITICAL: Hook for memoized selectors
export function useMemoizedSelector<T, R>(
  selector: (state: T) => R,
  state: T,
  equalityFn?: (a: R, b: R) => boolean
): R {
  return useMemo(() => {
    const memoizedSelector = createMemoizedSelector(selector, equalityFn)
    return memoizedSelector(state)
  }, [selector, state, equalityFn])
}

// CRITICAL: Lazy loading utilities
export interface LazyLoadConfig {
  threshold: number
  rootMargin: string
  root: Element | null
}

export function useLazyLoad<T>(
  items: T[],
  config: Partial<LazyLoadConfig> = {}
): {
  visibleItems: T[]
  loadMore: () => void
  hasMore: boolean
  isLoading: boolean
} {
  const [visibleCount, setVisibleCount] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  
  const defaultConfig: LazyLoadConfig = {
    threshold: 0.1,
    rootMargin: '100px',
    root: null,
    ...config
  }

  const loadMore = useCallback(() => {
    if (isLoading || visibleCount >= items.length) return
    
    setIsLoading(true)
    
    // CRITICAL: Simulate loading delay for better UX
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 10, items.length))
      setIsLoading(false)
    }, 100)
  }, [isLoading, visibleCount, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount)
  }, [items, visibleCount])

  const hasMore = visibleCount < items.length

  return {
    visibleItems,
    loadMore,
    hasMore,
    isLoading
  }
}

// CRITICAL: Virtual scrolling utilities
export interface VirtualScrollConfig {
  itemHeight: number
  containerHeight: number
  buffer: number
}

export function useVirtualScroll<T>(
  items: T[],
  config: VirtualScrollConfig
): {
  visibleItems: T[]
  startIndex: number
  endIndex: number
  totalHeight: number
  scrollTop: number
  setScrollTop: (scrollTop: number) => void
} {
  const [scrollTop, setScrollTop] = useState(0)
  const { itemHeight, containerHeight, buffer } = config

  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
  )

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    scrollTop,
    setScrollTop
  }
}

// CRITICAL: Caching utilities
export interface CacheEntry<T> {
  data: T
  timestamp: number
  accessCount: number
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>()
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // CRITICAL: Update access count and timestamp
    entry.accessCount++
    entry.timestamp = Date.now()
    
    // CRITICAL: Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    
    return entry.data
  }

  set(key: K, value: V): void {
    // CRITICAL: Remove least recently used if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      accessCount: 1
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// CRITICAL: Hook for caching
export function useCache<K, V>(maxSize: number = 100) {
  const cacheRef = useRef<LRUCache<K, V> | null>(null)

  if (!cacheRef.current) {
    cacheRef.current = new LRUCache<K, V>(maxSize)
  }

  const get = useCallback((key: K): V | undefined => {
    return cacheRef.current!.get(key)
  }, [])

  const set = useCallback((key: K, value: V): void => {
    cacheRef.current!.set(key, value)
  }, [])

  const clear = useCallback((): void => {
    cacheRef.current!.clear()
  }, [])

  return { get, set, clear, size: cacheRef.current!.size() }
}

// CRITICAL: Debounced updates utility
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay]) as T
}

// CRITICAL: Component memoization wrapper
export function withPerformanceOptimization<P extends object>(
  Component: React.ComponentType<P>,
  config: Partial<PerformanceConfig> = {}
) {
  const mergedConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config }
  
  return React.memo(Component, (prevProps, nextProps) => {
    if (!mergedConfig.enableMemoization) return false
    
    // CRITICAL: Deep comparison for complex props
    return JSON.stringify(prevProps) === JSON.stringify(nextProps)
  })
}

// CRITICAL: Equipment list optimization
export function useOptimizedEquipmentList<T>(
  equipment: T[],
  filterFn?: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number
) {
  // CRITICAL: Memoize filtered and sorted equipment
  const optimizedEquipment = useMemo(() => {
    let result = equipment

    if (filterFn) {
      result = result.filter(filterFn)
    }

    if (sortFn) {
      result = [...result].sort(sortFn)
    }

    return result
  }, [equipment, filterFn, sortFn])

  // CRITICAL: Use lazy loading for large lists
  const lazyLoadConfig = {
    threshold: 0.1,
    rootMargin: '200px'
  }

  const { visibleItems, loadMore, hasMore, isLoading } = useLazyLoad(
    optimizedEquipment,
    lazyLoadConfig
  )

  return {
    equipment: visibleItems,
    loadMore,
    hasMore,
    isLoading,
    totalCount: optimizedEquipment.length
  }
}

// CRITICAL: Critical slots optimization
export function useOptimizedCriticalSlots(
  criticalSlots: any[],
  config: VirtualScrollConfig
) {
  // CRITICAL: Memoize slot calculations
  const slotCalculations = useMemo(() => {
    return criticalSlots.map(slot => ({
      ...slot,
      isEmpty: !slot.content,
      isRemovable: slot.content?.type === 'equipment',
      displayName: slot.getDisplayName?.() || `Slot ${slot.slotIndex + 1}`
    }))
  }, [criticalSlots])

  // CRITICAL: Use virtual scrolling for large slot lists
  const virtualScroll = useVirtualScroll(slotCalculations, config)

  return {
    ...virtualScroll,
    slotCalculations
  }
}

// CRITICAL: Performance monitoring component
export function PerformanceMonitor({ 
  children, 
  componentName,
  config = DEFAULT_PERFORMANCE_CONFIG 
}: {
  children: React.ReactNode
  componentName: string
  config?: PerformanceConfig
}) {
  const metrics = usePerformanceMonitor(componentName)

  // CRITICAL: Log performance warnings
  useEffect(() => {
    if (metrics.renderTime > 16) { // 60fps threshold
      console.warn(`[Performance] ${componentName} render time exceeded 16ms: ${metrics.renderTime.toFixed(2)}ms`)
    }
  }, [metrics.renderTime, componentName])

  return React.createElement(React.Fragment, null, children)
}

// CRITICAL: Performance utilities are already exported individually above 