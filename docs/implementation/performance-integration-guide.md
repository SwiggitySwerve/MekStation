# Performance Integration Guide

## Overview

This guide explains how to integrate the performance optimization utilities into existing components and new development. The performance system provides memoization, lazy loading, virtual scrolling, caching, and performance monitoring.

## Quick Start

### 1. Basic Performance Monitoring

```typescript
import { PerformanceMonitor } from '../utils/performance/PerformanceOptimizer';

function MyComponent() {
  return (
    <PerformanceMonitor componentName="MyComponent">
      {/* Your component content */}
    </PerformanceMonitor>
  );
}
```

### 2. Component Memoization

```typescript
import { withPerformanceOptimization } from '../utils/performance/PerformanceOptimizer';

function MyComponent(props) {
  // Component logic
}

// Wrap with performance optimization
const OptimizedMyComponent = withPerformanceOptimization(MyComponent, {
  enableMemoization: true,
  debounceDelay: 300
});

export default OptimizedMyComponent;
```

### 3. Debounced Callbacks

```typescript
import { useDebouncedCallback } from '../utils/performance/PerformanceOptimizer';

function MyComponent() {
  const debouncedUpdate = useDebouncedCallback((value) => {
    // Expensive operation
    updateState(value);
  }, 300);

  return (
    <input onChange={(e) => debouncedUpdate(e.target.value)} />
  );
}
```

## Advanced Usage

### 1. Caching with LRU Cache

```typescript
import { useCache } from '../utils/performance/PerformanceOptimizer';

function MyComponent() {
  const { get, set, clear } = useCache<string, ExpensiveData>(100);

  const getExpensiveData = useCallback((key: string) => {
    // Check cache first
    const cached = get(key);
    if (cached) return cached;

    // Calculate expensive data
    const data = calculateExpensiveData(key);
    
    // Cache the result
    set(key, data);
    return data;
  }, [get, set]);

  return (
    <div>
      {getExpensiveData('some-key')}
    </div>
  );
}
```

### 2. Lazy Loading for Large Lists

```typescript
import { useLazyLoad } from '../utils/performance/PerformanceOptimizer';

function LargeList({ items }) {
  const { visibleItems, loadMore, hasMore, isLoading } = useLazyLoad(items, {
    threshold: 0.1,
    rootMargin: '200px'
  });

  return (
    <div>
      {visibleItems.map(item => (
        <ListItem key={item.id} item={item} />
      ))}
      
      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### 3. Virtual Scrolling for Critical Slots

```typescript
import { useVirtualScroll } from '../utils/performance/PerformanceOptimizer';

function CriticalSlotsList({ slots }) {
  const virtualScroll = useVirtualScroll(slots, {
    itemHeight: 60,
    containerHeight: 400,
    buffer: 5
  });

  return (
    <div style={{ height: virtualScroll.totalHeight }}>
      <div style={{ transform: `translateY(${virtualScroll.scrollTop}px)` }}>
        {virtualScroll.visibleItems.map((slot, index) => (
          <CriticalSlot
            key={virtualScroll.startIndex + index}
            slot={slot}
          />
        ))}
      </div>
    </div>
  );
}
```

### 4. Memoized Selectors

```typescript
import { useMemoizedSelector } from '../utils/performance/PerformanceOptimizer';

function MyComponent({ state }) {
  // Memoized selector for expensive calculations
  const expensiveValue = useMemoizedSelector(
    (state) => calculateExpensiveValue(state),
    state,
    (a, b) => a.id === b.id // Custom equality function
  );

  return <div>{expensiveValue}</div>;
}
```

## Integration Patterns

### 1. Equipment Browser Integration

```typescript
// components/equipment/EquipmentBrowserOptimized.tsx
import { 
  withPerformanceOptimization,
  PerformanceMonitor,
  useDebouncedCallback 
} from '../../utils/performance/PerformanceOptimizer';

function EquipmentBrowserBase(props) {
  // Debounce equipment actions
  const debouncedOnAddEquipment = useDebouncedCallback(
    props.onAddEquipment || (() => {}),
    300
  );

  return (
    <PerformanceMonitor componentName="EquipmentBrowser">
      {/* Component content */}
    </PerformanceMonitor>
  );
}

// Wrap with performance optimization
const EquipmentBrowserOptimized = withPerformanceOptimization(
  EquipmentBrowserBase,
  {
    enableMemoization: true,
    enableLazyLoading: true,
    debounceDelay: 300
  }
);
```

### 2. Critical Slots Integration

```typescript
// components/criticalSlots/EnhancedCriticalSlotsDisplay.tsx
import { 
  useOptimizedCriticalSlots,
  PerformanceMonitor 
} from '../../utils/performance/PerformanceOptimizer';

function CriticalSlotsDisplay({ criticalSlots }) {
  const optimizedSlots = useOptimizedCriticalSlots(criticalSlots, {
    itemHeight: 60,
    containerHeight: 400,
    buffer: 5
  });

  return (
    <PerformanceMonitor componentName="CriticalSlots">
      <div>
        {optimizedSlots.visibleItems.map(slot => (
          <CriticalSlot key={slot.id} slot={slot} />
        ))}
      </div>
    </PerformanceMonitor>
  );
}
```

### 3. Form Integration

```typescript
// components/common/ControlledInput.tsx
import { useDebouncedCallback } from '../../utils/performance/PerformanceOptimizer';

function ControlledInput({ value, onChange, validation, ...props }) {
  const debouncedOnChange = useDebouncedCallback(onChange, 300);

  return (
    <input
      value={value}
      onChange={(e) => debouncedOnChange(e.target.value)}
      {...props}
    />
  );
}
```

## Performance Configuration

### Default Configuration

```typescript
const DEFAULT_PERFORMANCE_CONFIG = {
  enableMemoization: true,
  enableLazyLoading: true,
  enableVirtualScrolling: true,
  enableCaching: true,
  debounceDelay: 300,
  cacheSize: 100,
  virtualScrollItemHeight: 60,
  virtualScrollBuffer: 5
};
```

### Custom Configuration

```typescript
const customConfig = {
  enableMemoization: true,
  enableLazyLoading: false, // Disable for small lists
  debounceDelay: 500, // Longer delay for expensive operations
  cacheSize: 50 // Smaller cache for memory-constrained environments
};

const OptimizedComponent = withPerformanceOptimization(
  MyComponent,
  customConfig
);
```

## Best Practices

### 1. When to Use Each Optimization

**Memoization (`enableMemoization: true`)**
- Use for components that re-render frequently with the same props
- Use for expensive calculations that depend on props
- Avoid for components with frequently changing props

**Lazy Loading (`enableLazyLoading: true`)**
- Use for lists with 100+ items
- Use for data that can be loaded incrementally
- Avoid for small lists where overhead isn't worth it

**Virtual Scrolling (`enableVirtualScrolling: true`)**
- Use for lists with 1000+ items
- Use when items have fixed heights
- Avoid for lists with variable height items

**Caching (`enableCaching: true`)**
- Use for expensive calculations that are called repeatedly
- Use for API responses that don't change frequently
- Avoid for data that changes frequently

**Debouncing (`debounceDelay`)**
- Use for user input that triggers expensive operations
- Use for search inputs and filters
- Avoid for immediate feedback requirements

### 2. Performance Monitoring

```typescript
// Monitor component performance
<PerformanceMonitor componentName="MyComponent">
  <MyComponent />
</PerformanceMonitor>

// Check console for performance warnings
// [Performance] MyComponent render time exceeded 16ms: 23.45ms
```

### 3. Memory Management

```typescript
// Clear cache when component unmounts
useEffect(() => {
  return () => {
    cache.clear();
  };
}, [cache]);

// Limit cache size for memory-constrained environments
const { get, set, clear } = useCache<string, Data>(50); // Smaller cache
```

### 4. Error Handling

```typescript
// Wrap performance optimizations in error boundaries
function SafePerformanceWrapper({ children }) {
  return (
    <ErrorBoundary>
      <PerformanceMonitor componentName="SafeWrapper">
        {children}
      </PerformanceMonitor>
    </ErrorBoundary>
  );
}
```

## Migration Guide

### 1. From Regular Components

**Before:**
```typescript
function MyComponent(props) {
  const handleChange = (value) => {
    // Expensive operation
    updateState(value);
  };

  return (
    <input onChange={handleChange} />
  );
}
```

**After:**
```typescript
import { withPerformanceOptimization, useDebouncedCallback } from '../utils/performance/PerformanceOptimizer';

function MyComponent(props) {
  const debouncedHandleChange = useDebouncedCallback((value) => {
    updateState(value);
  }, 300);

  return (
    <input onChange={debouncedHandleChange} />
  );
}

const OptimizedMyComponent = withPerformanceOptimization(MyComponent);
```

### 2. From Large Lists

**Before:**
```typescript
function LargeList({ items }) {
  return (
    <div>
      {items.map(item => (
        <ListItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

**After:**
```typescript
import { useLazyLoad } from '../utils/performance/PerformanceOptimizer';

function LargeList({ items }) {
  const { visibleItems, loadMore, hasMore } = useLazyLoad(items);

  return (
    <div>
      {visibleItems.map(item => (
        <ListItem key={item.id} item={item} />
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

## Troubleshooting

### 1. Performance Warnings

If you see performance warnings in the console:

```typescript
// [Performance] MyComponent render time exceeded 16ms: 23.45ms
```

**Solutions:**
- Add memoization to expensive calculations
- Use `useMemo` for complex JSX
- Break down large components into smaller ones
- Use virtual scrolling for large lists

### 2. Memory Leaks

If you notice memory usage increasing:

**Solutions:**
- Clear caches when components unmount
- Use smaller cache sizes
- Implement proper cleanup in useEffect
- Monitor cache sizes and clear periodically

### 3. Debouncing Issues

If debouncing causes UI lag:

**Solutions:**
- Reduce debounce delay for immediate feedback
- Use immediate updates for critical UI elements
- Combine debouncing with optimistic updates

## Performance Metrics

### 1. Monitoring Metrics

The performance system tracks:

- **Render Time**: Time taken to render component
- **Memory Usage**: Memory allocated by component
- **Component Count**: Number of components rendered
- **Re-render Count**: Number of times component re-rendered

### 2. Benchmarking

```typescript
// Compare performance before and after optimization
console.time('Before optimization');
renderComponent();
console.timeEnd('Before optimization');

console.time('After optimization');
renderOptimizedComponent();
console.timeEnd('After optimization');
```

## Conclusion

The performance optimization system provides a comprehensive set of tools for improving application performance. By following the patterns and best practices outlined in this guide, you can significantly improve the user experience of your BattleTech customizer application.

Remember to:
- Monitor performance metrics regularly
- Use the right optimization for the right use case
- Test performance improvements in real-world scenarios
- Keep performance optimizations maintainable and debuggable 