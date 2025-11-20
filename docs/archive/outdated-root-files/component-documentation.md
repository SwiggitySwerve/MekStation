# Component Documentation

## Overview

This document provides comprehensive documentation for all components and utilities implemented in the BattleTech customizer refactor. Each component includes usage examples, props documentation, and integration patterns.

## Core Components

### 1. MultiUnitProvider

**File:** `components/multiUnit/MultiUnitProvider.tsx`

**Purpose:** Main state provider for multi-tab unit management with reducer pattern.

**Key Features:**
- Immutable state updates with useReducer
- Tab management with create, close, and switch operations
- Automatic state persistence with debouncing
- Memory-aware component resolution
- Error boundaries and recovery

**Usage:**
```typescript
import { MultiUnitProvider } from '../components/multiUnit/MultiUnitProvider';

function App() {
  return (
    <MultiUnitProvider>
      <TabManager />
      <UnitEditor />
    </MultiUnitProvider>
  );
}
```

**Context Value:**
```typescript
interface MultiUnitContextValue {
  // State
  tabs: TabUnit[]
  activeTab: TabUnit | null
  activeTabId: string | null
  
  // Tab management
  createTab: (name?: string, config?: UnitConfiguration) => string
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  
  // Active tab unit operations
  unit: UnitCriticalManager | null
  updateConfiguration: (config: UnitConfiguration) => void
  addEquipmentToUnit: (equipment: EquipmentObject) => void
  removeEquipment: (equipmentGroupId: string) => boolean
  selectEquipment: (equipmentGroupId: string | null) => void
  assignSelectedEquipment: (location: string, slotIndex: number) => boolean
  
  // State indicators
  isConfigLoaded: boolean
  unallocatedEquipment: EquipmentAllocation[]
  selectedEquipmentId: string | null
}
```

### 2. OverviewTabV2

**File:** `components/overview/OverviewTabV2.tsx`

**Purpose:** Tech progression control with memory-aware component resolution.

**Key Features:**
- Memory-first component resolution
- Tech progression matrix with per-subsystem control
- Automatic tech rating calculation
- Armor tonnage preservation
- Memory persistence for user preferences

**Usage:**
```typescript
import { OverviewTabV2 } from '../components/overview/OverviewTabV2';

function UnitEditor() {
  return (
    <div>
      <OverviewTabV2 />
      {/* Other tabs */}
    </div>
  );
}
```

**Tech Progression Interface:**
```typescript
interface TechProgression {
  chassis: 'Inner Sphere' | 'Clan'
  gyro: 'Inner Sphere' | 'Clan'
  engine: 'Inner Sphere' | 'Clan'
  heatsink: 'Inner Sphere' | 'Clan'
  targeting: 'Inner Sphere' | 'Clan'
  myomer: 'Inner Sphere' | 'Clan'
  movement: 'Inner Sphere' | 'Clan'
  armor: 'Inner Sphere' | 'Clan'
}
```

### 3. EnhancedCriticalSlotsDisplay

**File:** `components/criticalSlots/EnhancedCriticalSlotsDisplay.tsx`

**Purpose:** Advanced critical slots management with auto-mode and smart slot updates.

**Key Features:**
- Auto-mode operations (fill, compact, sort, reset)
- Smart slot updates with minimal equipment displacement
- Cross-component validation
- Real-time slot visualization
- Equipment tray management

**Usage:**
```typescript
import { EnhancedCriticalSlotsDisplay } from '../components/criticalSlots/EnhancedCriticalSlotsDisplay';

function CriticalSlotsTab() {
  return (
    <EnhancedCriticalSlotsDisplay />
  );
}
```

**Auto-Mode Configuration:**
```typescript
interface CriticalSlotsToolbarState {
  autoFillUnhittables: boolean
  autoCompact: boolean
  autoSort: boolean
  autoModeEnabled: boolean
}
```

### 4. EquipmentBrowserOptimized

**File:** `components/equipment/EquipmentBrowserOptimized.tsx`

**Purpose:** Performance-optimized equipment browser with filtering and pagination.

**Key Features:**
- Performance monitoring and memoization
- Debounced equipment actions
- Lazy loading for large equipment lists
- Advanced filtering and search
- Pagination controls

**Usage:**
```typescript
import { EquipmentBrowserOptimized } from '../components/equipment/EquipmentBrowserOptimized';

function EquipmentTab() {
  const handleAddEquipment = (equipment) => {
    // Add equipment to unit
  };

  return (
    <EquipmentBrowserOptimized
      onAddEquipment={handleAddEquipment}
      showAddButtons={true}
      initialPageSize={25}
    />
  );
}
```

**Props:**
```typescript
interface EquipmentBrowserProps {
  onAddEquipment?: (equipment: EquipmentObject) => void
  onEquipmentAction?: (action: string, equipment: EquipmentObject) => void
  showAddButtons?: boolean
  actionButtonLabel?: string
  actionButtonIcon?: string
  initialPageSize?: number
  enableKeyboardNavigation?: boolean
  enableAutoRefresh?: boolean
  className?: string
}
```

## Utility Components

### 1. ErrorBoundary

**File:** `components/common/ErrorBoundary.tsx`

**Purpose:** Comprehensive error boundary with recovery mechanisms.

**Key Features:**
- Automatic error recovery with configurable limits
- Error logging and reporting
- User-friendly error messages
- Error persistence for debugging
- Higher-order component and hook support

**Usage:**
```typescript
import { ErrorBoundary, withErrorBoundary, useErrorBoundary } from '../components/common/ErrorBoundary';

// Component wrapper
function MyComponent() {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error, errorInfo) => console.error(error, errorInfo)}
      maxRetries={3}
    >
      <RiskyComponent />
    </ErrorBoundary>
  );
}

// Higher-order component
const SafeComponent = withErrorBoundary(RiskyComponent, {
  fallback: <ErrorFallback />,
  maxRetries: 3
});

// Hook usage
function MyComponent() {
  const { error, resetError } = useErrorBoundary();
  
  if (error) {
    return <ErrorFallback onRetry={resetError} />;
  }
  
  return <RiskyComponent />;
}
```

### 2. ControlledInput

**File:** `components/common/ControlledInput.tsx`

**Purpose:** Controlled input component with real-time validation.

**Key Features:**
- Real-time validation with visual feedback
- Debounced updates
- Dynamic styling based on validation state
- Support for various input types
- Error message display

**Usage:**
```typescript
import { ControlledInput } from '../components/common/ControlledInput';

function MyForm() {
  const [value, setValue] = useState('');
  
  const validateValue = (val: string) => {
    if (val.length < 3) {
      return { isValid: false, error: 'Value must be at least 3 characters' };
    }
    return { isValid: true };
  };

  return (
    <ControlledInput
      value={value}
      onChange={setValue}
      validation={validateValue}
      placeholder="Enter value..."
      className="w-full p-2 border rounded"
    />
  );
}
```

**Props:**
```typescript
interface ControlledInputProps<T = string> {
  value: T
  onChange: (value: T) => void
  validation?: (value: T) => ValidationResult
  debounceDelay?: number
  type?: 'text' | 'number' | 'email' | 'password'
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}
```

### 3. FormStateManager

**File:** `components/common/FormStateManager.tsx`

**Purpose:** Comprehensive form state management with validation.

**Key Features:**
- Reducer-based form state management
- Field-level validation
- Form-level validation
- Dynamic field requirements
- Error aggregation and display

**Usage:**
```typescript
import { FormStateManager, useFormState, withFormState } from '../components/common/FormStateManager';

// Hook usage
function MyForm() {
  const { state, errors, isDirty, updateField, reset, validate } = useFormState({
    name: '',
    email: '',
    age: 0
  });

  const handleSubmit = () => {
    const validation = validate();
    if (validation.isValid) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <ControlledInput
        value={state.name}
        onChange={(value) => updateField('name', value)}
        error={errors.name}
        placeholder="Name"
      />
      <ControlledInput
        value={state.email}
        onChange={(value) => updateField('email', value)}
        error={errors.email}
        placeholder="Email"
      />
      <button type="submit" disabled={!isDirty}>Submit</button>
    </form>
  );
}

// Higher-order component
const FormWithValidation = withFormState(MyForm, {
  initialValues: { name: '', email: '', age: 0 },
  validation: {
    name: (value) => value.length > 0 ? null : 'Name is required',
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email'
  }
});
```

## Performance Utilities

### 1. PerformanceOptimizer

**File:** `utils/performance/PerformanceOptimizer.ts`

**Purpose:** Comprehensive performance optimization utilities.

**Key Features:**
- Performance monitoring with real-time metrics
- Component memoization with React.memo
- LRU caching for expensive calculations
- Lazy loading for large lists
- Virtual scrolling for very large lists
- Debounced callbacks for smooth interactions

**Usage:**
```typescript
import {
  PerformanceMonitor,
  withPerformanceOptimization,
  useCache,
  useLazyLoad,
  useVirtualScroll,
  useDebouncedCallback
} from '../utils/performance/PerformanceOptimizer';

// Performance monitoring
function MyComponent() {
  return (
    <PerformanceMonitor componentName="MyComponent">
      <ExpensiveComponent />
    </PerformanceMonitor>
  );
}

// Component memoization
const OptimizedComponent = withPerformanceOptimization(MyComponent, {
  enableMemoization: true,
  debounceDelay: 300
});

// Caching
function MyComponent() {
  const { get, set, clear } = useCache<string, ExpensiveData>(100);
  
  const getData = useCallback((key: string) => {
    const cached = get(key);
    if (cached) return cached;
    
    const data = calculateExpensiveData(key);
    set(key, data);
    return data;
  }, [get, set]);
}

// Lazy loading
function LargeList({ items }) {
  const { visibleItems, loadMore, hasMore } = useLazyLoad(items, {
    threshold: 0.1,
    rootMargin: '200px'
  });
  
  return (
    <div>
      {visibleItems.map(item => <ListItem key={item.id} item={item} />)}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}

// Virtual scrolling
function CriticalSlotsList({ slots }) {
  const virtualScroll = useVirtualScroll(slots, {
    itemHeight: 60,
    containerHeight: 400,
    buffer: 5
  });
  
  return (
    <div style={{ height: virtualScroll.totalHeight }}>
      <div style={{ transform: `translateY(${virtualScroll.scrollTop}px)` }}>
        {virtualScroll.visibleItems.map(slot => (
          <CriticalSlot key={slot.id} slot={slot} />
        ))}
      </div>
    </div>
  );
}

// Debounced callbacks
function SearchInput() {
  const debouncedSearch = useDebouncedCallback((query: string) => {
    performSearch(query);
  }, 300);
  
  return (
    <input onChange={(e) => debouncedSearch(e.target.value)} />
  );
}
```

## State Management Utilities

### 1. useUnitData

**File:** `hooks/useUnitData.tsx`

**Purpose:** Unified data hook with reducer pattern for unit state management.

**Key Features:**
- Reducer-based state management
- Action-based updates with TypeScript types
- Automatic validation on state changes
- Component synchronization
- Memory persistence

**Usage:**
```typescript
import { useUnitData } from '../hooks/useUnitData';

function MyComponent() {
  const {
    unit,
    updateEngine,
    updateGyro,
    updateStructure,
    updateArmor,
    updateHeatSinks,
    updateTechProgression,
    updateCriticalAllocations,
    isDirty,
    validationState
  } = useUnitData();

  const handleEngineChange = (type: EngineType, rating: number) => {
    updateEngine(type, rating);
  };

  return (
    <div>
      <EngineSelector
        type={unit.systemComponents.engine.type}
        rating={unit.systemComponents.engine.rating}
        onChange={handleEngineChange}
      />
      {validationState.errors.map(error => (
        <div key={error} className="error">{error}</div>
      ))}
    </div>
  );
}
```

**Available Actions:**
```typescript
enum UnitActionType {
  UPDATE_ENGINE = 'UPDATE_ENGINE',
  UPDATE_GYRO = 'UPDATE_GYRO',
  UPDATE_STRUCTURE = 'UPDATE_STRUCTURE',
  UPDATE_ARMOR = 'UPDATE_ARMOR',
  UPDATE_HEAT_SINKS = 'UPDATE_HEAT_SINKS',
  UPDATE_TECH_PROGRESSION = 'UPDATE_TECH_PROGRESSION',
  UPDATE_CRITICAL_ALLOCATIONS = 'UPDATE_CRITICAL_ALLOCATIONS',
  SET_UNIT = 'SET_UNIT',
  RESET_UNIT = 'RESET_UNIT'
}
```

### 2. useEquipmentBrowser

**File:** `hooks/equipment/useEquipmentBrowser.ts`

**Purpose:** Equipment browser hook with filtering, pagination, and performance optimization.

**Key Features:**
- Advanced filtering by category, tech base, and search
- Pagination with configurable page sizes
- Performance optimization with memoization
- Keyboard navigation support
- Auto-refresh capabilities

**Usage:**
```typescript
import { useEquipmentBrowser } from '../hooks/equipment/useEquipmentBrowser';

function EquipmentBrowser() {
  const {
    filters,
    setFilters,
    availableCategories,
    availableTechBases,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedEquipment,
    isLoading,
    setPage,
    setPageSize,
    refresh
  } = useEquipmentBrowser({
    initialPageSize: 25,
    enableKeyboardNavigation: true,
    enableAutoRefresh: false,
    onEquipmentAdd: handleAddEquipment,
    onError: handleError
  });

  return (
    <div>
      <EquipmentFilters
        filters={filters}
        onFiltersChange={setFilters}
        categories={availableCategories}
        techBases={availableTechBases}
      />
      <EquipmentList equipment={paginatedEquipment} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

## Integration Patterns

### 1. Component Integration

**Basic Integration:**
```typescript
// Wrap with error boundary
const SafeComponent = withErrorBoundary(MyComponent, {
  fallback: <ErrorFallback />,
  maxRetries: 3
});

// Add performance optimization
const OptimizedComponent = withPerformanceOptimization(SafeComponent, {
  enableMemoization: true,
  debounceDelay: 300
});

// Add form state management
const FormComponent = withFormState(OptimizedComponent, {
  initialValues: { field1: '', field2: '' },
  validation: {
    field1: (value) => value.length > 0 ? null : 'Required',
    field2: (value) => /^\d+$/.test(value) ? null : 'Must be number'
  }
});
```

### 2. State Management Integration

**Multi-Unit Provider Setup:**
```typescript
function App() {
  return (
    <ErrorBoundary fallback={<AppErrorFallback />}>
      <MultiUnitProvider>
        <PerformanceMonitor componentName="App">
          <TabManager />
          <UnitEditor />
        </PerformanceMonitor>
      </MultiUnitProvider>
    </ErrorBoundary>
  );
}
```

### 3. Performance Integration

**Equipment Browser with Performance:**
```typescript
function EquipmentTab() {
  return (
    <PerformanceMonitor componentName="EquipmentTab">
      <EquipmentBrowserOptimized
        onAddEquipment={handleAddEquipment}
        showAddButtons={true}
        initialPageSize={25}
        enableKeyboardNavigation={true}
      />
    </PerformanceMonitor>
  );
}
```

## Best Practices

### 1. Component Design

- **Use TypeScript**: Strong typing for all props and state
- **Implement Error Boundaries**: Wrap all components with error boundaries
- **Add Performance Monitoring**: Monitor performance for expensive components
- **Use Controlled Inputs**: Implement controlled inputs with validation
- **Memoize Expensive Calculations**: Use useMemo for expensive operations

### 2. State Management

- **Use Reducer Pattern**: For complex state management
- **Immutable Updates**: Always use immutable state updates
- **Action Types**: Define clear action types with TypeScript
- **Validation**: Validate state changes before applying
- **Persistence**: Implement automatic state persistence

### 3. Performance Optimization

- **Monitor Performance**: Use PerformanceMonitor for all components
- **Cache Expensive Operations**: Use LRU cache for repeated calculations
- **Lazy Load Large Lists**: Use lazy loading for lists with 100+ items
- **Virtual Scroll Very Large Lists**: Use virtual scrolling for 1000+ items
- **Debounce User Input**: Use debounced callbacks for user interactions

### 4. Error Handling

- **Comprehensive Error Boundaries**: Implement error boundaries at all levels
- **User-Friendly Messages**: Provide clear error messages to users
- **Error Logging**: Log errors for debugging
- **Recovery Mechanisms**: Implement automatic recovery where possible
- **Error Persistence**: Store errors for debugging

## Troubleshooting

### 1. Common Issues

**Performance Warnings:**
```
[Performance] Component render time exceeded 16ms: 23.45ms
```
**Solution:** Add memoization, break down large components, use virtual scrolling

**Memory Leaks:**
```
Memory usage increasing over time
```
**Solution:** Clear caches on unmount, implement proper cleanup

**TypeScript Errors:**
```
Type 'X' is not assignable to type 'Y'
```
**Solution:** Check prop types, ensure proper TypeScript interfaces

### 2. Debug Mode

Enable debug logging in development:
```typescript
// Add to component
console.log('[Debug] Component render:', { props, state });

// Performance monitoring
<PerformanceMonitor componentName="DebugComponent">
  <MyComponent />
</PerformanceMonitor>
```

### 3. Error Recovery

**Automatic Recovery:**
```typescript
<ErrorBoundary maxRetries={3} onError={handleError}>
  <RiskyComponent />
</ErrorBoundary>
```

**Manual Recovery:**
```typescript
const { error, resetError } = useErrorBoundary();

if (error) {
  return <ErrorFallback onRetry={resetError} />;
}
```

## Conclusion

This component documentation provides a comprehensive guide to all implemented components and utilities in the BattleTech customizer refactor. Each component is designed with:

- **Strong TypeScript typing**
- **Comprehensive error handling**
- **Performance optimization**
- **User-friendly interfaces**
- **Maintainable architecture**

Follow the integration patterns and best practices to ensure consistent, reliable, and performant components throughout the application. 