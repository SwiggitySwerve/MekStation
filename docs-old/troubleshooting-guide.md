# Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered when working with the BattleTech customizer refactor. Each section includes problem descriptions, root causes, and step-by-step solutions.

## Common Issues

### 1. Performance Issues

#### Problem: Slow Component Rendering
**Symptoms:**
- Components take longer than 16ms to render
- UI feels sluggish or unresponsive
- Console shows performance warnings

**Root Causes:**
- Large lists without optimization
- Expensive calculations without memoization
- Frequent re-renders without proper memoization
- Missing performance monitoring

**Solutions:**

1. **Add Performance Monitoring:**
```typescript
import { PerformanceMonitor } from '../utils/performance/PerformanceOptimizer';

function SlowComponent() {
  return (
    <PerformanceMonitor componentName="SlowComponent">
      <ExpensiveComponent />
    </PerformanceMonitor>
  );
}
```

2. **Use Memoization:**
```typescript
import { withPerformanceOptimization } from '../utils/performance/PerformanceOptimizer';

const OptimizedComponent = withPerformanceOptimization(SlowComponent, {
  enableMemoization: true,
  debounceDelay: 300
});
```

3. **Implement Lazy Loading for Large Lists:**
```typescript
import { useLazyLoad } from '../utils/performance/PerformanceOptimizer';

function LargeList({ items }) {
  const { visibleItems, loadMore, hasMore } = useLazyLoad(items);
  
  return (
    <div>
      {visibleItems.map(item => <ListItem key={item.id} item={item} />)}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

4. **Use Virtual Scrolling for Very Large Lists:**
```typescript
import { useVirtualScroll } from '../utils/performance/PerformanceOptimizer';

function VeryLargeList({ items }) {
  const virtualScroll = useVirtualScroll(items, {
    itemHeight: 60,
    containerHeight: 400,
    buffer: 5
  });
  
  return (
    <div style={{ height: virtualScroll.totalHeight }}>
      <div style={{ transform: `translateY(${virtualScroll.scrollTop}px)` }}>
        {virtualScroll.visibleItems.map(item => (
          <ListItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
```

#### Problem: Memory Leaks
**Symptoms:**
- Memory usage increases over time
- Application becomes slower after extended use
- Browser crashes or becomes unresponsive

**Root Causes:**
- Caches not cleared on component unmount
- Event listeners not removed
- Large objects not garbage collected
- Missing cleanup in useEffect

**Solutions:**

1. **Clear Caches on Unmount:**
```typescript
import { useCache } from '../utils/performance/PerformanceOptimizer';

function MyComponent() {
  const { get, set, clear } = useCache<string, Data>(100);
  
  useEffect(() => {
    return () => {
      clear(); // Clear cache on unmount
    };
  }, [clear]);
}
```

2. **Clean Up Event Listeners:**
```typescript
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };
  
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

3. **Use Smaller Cache Sizes:**
```typescript
// For memory-constrained environments
const { get, set, clear } = useCache<string, Data>(50); // Smaller cache
```

### 2. State Management Issues

#### Problem: State Not Updating
**Symptoms:**
- UI doesn't reflect state changes
- Components not re-rendering
- State appears stuck or frozen

**Root Causes:**
- Incorrect action dispatching
- Missing action types
- State mutations instead of immutable updates
- Reducer not handling action types

**Solutions:**

1. **Check Action Dispatching:**
```typescript
// Correct way
dispatch({ 
  type: UnitActionType.UPDATE_ENGINE, 
  payload: { type: 'XL', rating: 300 } 
});

// Incorrect way
dispatch({ 
  type: 'UPDATE_ENGINE', // Missing enum
  payload: { type: 'XL', rating: 300 } 
});
```

2. **Ensure Immutable Updates:**
```typescript
// Correct way
return {
  ...state,
  unit: {
    ...state.unit,
    systemComponents: {
      ...state.unit.systemComponents,
      engine: { type: 'XL', rating: 300 }
    }
  }
};

// Incorrect way
state.unit.systemComponents.engine = { type: 'XL', rating: 300 };
return state;
```

3. **Verify Action Types:**
```typescript
// Make sure action type is defined
enum UnitActionType {
  UPDATE_ENGINE = 'UPDATE_ENGINE',
  UPDATE_GYRO = 'UPDATE_GYRO',
  // ... other types
}

// Make sure reducer handles the action
case UnitActionType.UPDATE_ENGINE: {
  // Handle engine update
  return updatedState;
}
```

#### Problem: State Corruption
**Symptoms:**
- Unexpected state values
- Components receiving invalid props
- Application crashes or errors

**Root Causes:**
- Direct state mutations
- Missing validation
- Race conditions
- Invalid action payloads

**Solutions:**

1. **Add State Validation:**
```typescript
function unitReducer(state: UnitState, action: UnitAction): UnitState {
  switch (action.type) {
    case UnitActionType.UPDATE_ENGINE: {
      // Validate input
      if (!isValidEngineType(action.payload.type)) {
        console.error('Invalid engine type:', action.payload.type);
        return state;
      }
      
      if (!isValidEngineRating(action.payload.rating)) {
        console.error('Invalid engine rating:', action.payload.rating);
        return state;
      }
      
      // Process update
      const updates = syncEngineChange(state.unit, action.payload.type, action.payload.rating);
      
      // Validate result
      if (!updates.success) {
        console.error('Engine sync failed:', updates.errors);
        return state;
      }
      
      return {
        ...state,
        unit: updates.unit,
        isDirty: true,
        lastAction: action.type
      };
    }
  }
}
```

2. **Use TypeScript for Type Safety:**
```typescript
type UnitAction = 
  | { type: UnitActionType.UPDATE_ENGINE; payload: { type: EngineType; rating: number } }
  | { type: UnitActionType.UPDATE_GYRO; payload: { type: GyroType } }
  | { type: UnitActionType.SET_UNIT; payload: EditableUnit };
```

### 3. Error Handling Issues

#### Problem: Unhandled Errors
**Symptoms:**
- Application crashes
- White screens
- Console errors without recovery
- User stuck with broken UI

**Root Causes:**
- Missing error boundaries
- Errors not caught at component level
- No fallback UI
- Errors not logged for debugging

**Solutions:**

1. **Add Error Boundaries:**
```typescript
import { ErrorBoundary } from '../components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      fallback={<AppErrorFallback />}
      onError={(error, errorInfo) => {
        console.error('App error:', error, errorInfo);
        // Log to error reporting service
      }}
      maxRetries={3}
    >
      <MainApp />
    </ErrorBoundary>
  );
}
```

2. **Use Higher-Order Components:**
```typescript
import { withErrorBoundary } from '../components/common/ErrorBoundary';

const SafeComponent = withErrorBoundary(RiskyComponent, {
  fallback: <ErrorFallback />,
  maxRetries: 3,
  onError: (error) => console.error('Component error:', error)
});
```

3. **Implement Error Recovery:**
```typescript
import { useErrorBoundary } from '../components/common/ErrorBoundary';

function MyComponent() {
  const { error, resetError } = useErrorBoundary();
  
  if (error) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button onClick={resetError}>Try Again</button>
      </div>
    );
  }
  
  return <RiskyComponent />;
}
```

#### Problem: Error Messages Not User-Friendly
**Symptoms:**
- Technical error messages shown to users
- No guidance on how to fix issues
- Users don't know what went wrong

**Root Causes:**
- Raw error objects displayed
- No error message translation
- Missing user guidance
- No recovery suggestions

**Solutions:**

1. **Create User-Friendly Error Messages:**
```typescript
function ErrorFallback({ error, resetError }) {
  const getErrorMessage = (error) => {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'PERMISSION_ERROR':
        return 'You don\'t have permission to perform this action.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  return (
    <div className="error-fallback">
      <h2>Oops! Something went wrong</h2>
      <p>{getErrorMessage(error)}</p>
      <button onClick={resetError}>Try Again</button>
      <button onClick={() => window.location.reload()}>Reload Page</button>
    </div>
  );
}
```

2. **Add Error Context:**
```typescript
function ErrorBoundary({ children, fallback }) {
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  if (error) {
    return (
      <div className="error-boundary">
        {fallback || (
          <div className="default-error">
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened.</p>
            <button onClick={() => setError(null)}>Try Again</button>
          </div>
        )}
        {process.env.NODE_ENV === 'development' && (
          <details className="error-details">
            <summary>Error Details (Development)</summary>
            <pre>{error.toString()}</pre>
            <pre>{errorInfo.componentStack}</pre>
          </details>
        )}
      </div>
    );
  }

  return children;
}
```

### 4. Form Validation Issues

#### Problem: Validation Not Working
**Symptoms:**
- Invalid data accepted
- No validation feedback
- Forms submit with errors
- Validation errors not displayed

**Root Causes:**
- Missing validation functions
- Validation not called
- Error state not managed
- Validation timing issues

**Solutions:**

1. **Implement Proper Validation:**
```typescript
import { ControlledInput } from '../components/common/ControlledInput';

function MyForm() {
  const [value, setValue] = useState('');
  
  const validateValue = (val: string) => {
    if (!val) {
      return { isValid: false, error: 'This field is required' };
    }
    
    if (val.length < 3) {
      return { isValid: false, error: 'Must be at least 3 characters' };
    }
    
    if (!/^[a-zA-Z]+$/.test(val)) {
      return { isValid: false, error: 'Only letters are allowed' };
    }
    
    return { isValid: true };
  };

  return (
    <ControlledInput
      value={value}
      onChange={setValue}
      validation={validateValue}
      placeholder="Enter value..."
    />
  );
}
```

2. **Use Form State Manager:**
```typescript
import { useFormState } from '../components/common/FormStateManager';

function MyForm() {
  const { state, errors, isDirty, updateField, validate } = useFormState({
    name: '',
    email: '',
    age: 0
  });

  const handleSubmit = () => {
    const validation = validate();
    if (validation.isValid) {
      // Submit form
      console.log('Form is valid:', state);
    } else {
      console.log('Form has errors:', validation.errors);
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
      <button type="submit" disabled={!isDirty}>Submit</button>
    </form>
  );
}
```

#### Problem: Validation Feedback Not Visible
**Symptoms:**
- No visual feedback for validation errors
- Users don't know what's wrong
- Form appears to work but doesn't submit

**Root Causes:**
- Error messages not displayed
- Styling not applied for error states
- Validation timing issues
- Missing error state management

**Solutions:**

1. **Display Error Messages:**
```typescript
function ControlledInput({ value, onChange, validation, error, ...props }) {
  const [localError, setLocalError] = useState('');
  
  const handleChange = (newValue) => {
    onChange(newValue);
    
    if (validation) {
      const result = validation(newValue);
      setLocalError(result.error || '');
    }
  };

  const displayError = error || localError;

  return (
    <div className="input-container">
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className={`input ${displayError ? 'input-error' : ''}`}
        {...props}
      />
      {displayError && (
        <div className="error-message">{displayError}</div>
      )}
    </div>
  );
}
```

2. **Apply Error Styling:**
```css
.input {
  border: 1px solid #ccc;
  padding: 8px;
  border-radius: 4px;
}

.input-error {
  border-color: #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25);
}

.error-message {
  color: #dc3545;
  font-size: 12px;
  margin-top: 4px;
}
```

### 5. Memory Persistence Issues

#### Problem: User Preferences Not Saved
**Symptoms:**
- Component selections reset on page reload
- Tech progression preferences lost
- Equipment placements not remembered
- User has to reconfigure everything

**Root Causes:**
- Memory system not initialized
- Save operations failing
- Storage quota exceeded
- Memory state corrupted

**Solutions:**

1. **Check Memory System Initialization:**
```typescript
import { initializeMemorySystem } from '../utils/memoryPersistence';

function OverviewTab() {
  useEffect(() => {
    // Initialize memory system
    const memoryState = initializeMemorySystem();
    
    if (memoryState) {
      // Apply memory restoration
      const restorationUpdates = applyMemoryRestoration(config, memoryState);
      updateConfiguration(restorationUpdates);
    }
  }, []);
}
```

2. **Handle Save Failures:**
```typescript
function saveMemoryToStorage(memoryState) {
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memoryState));
    console.log('[Memory] Saved memory state to storage');
  } catch (error) {
    console.error('[Memory] Failed to save memory state:', error);
    
    // Try to clear some space
    if (error.name === 'QuotaExceededError') {
      clearOldMemoryData();
      try {
        localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memoryState));
      } catch (retryError) {
        console.error('[Memory] Failed to save after cleanup:', retryError);
      }
    }
  }
}
```

3. **Validate Memory State:**
```typescript
function loadMemoryFromStorage() {
  try {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (stored) {
      const memoryState = JSON.parse(stored);
      
      // Validate memory state structure
      if (isValidMemoryState(memoryState)) {
        console.log('[Memory] Loaded memory state from storage');
        return memoryState;
      } else {
        console.warn('[Memory] Invalid memory state structure, initializing fresh');
        return createDefaultMemoryState();
      }
    }
  } catch (error) {
    console.error('[Memory] Failed to load memory state:', error);
  }
  
  return createDefaultMemoryState();
}
```

### 6. Component Synchronization Issues

#### Problem: Components Not Syncing
**Symptoms:**
- Changes in one tab not reflected in others
- Equipment not appearing in critical slots
- Weight calculations not updating
- Tech progression changes not propagating

**Root Causes:**
- Missing component sync calls
- State updates not triggering re-renders
- Component dependencies not properly set up
- Race conditions in updates

**Solutions:**

1. **Use Component Sync Functions:**
```typescript
import { syncEngineChange } from '../utils/componentSync';

function handleEngineChange(type: EngineType, rating: number) {
  const updates = syncEngineChange(unit, type, rating);
  
  if (updates.success) {
    // Update all related components
    updateConfiguration({
      systemComponents: updates.systemComponents,
      criticalAllocations: updates.criticalAllocations,
      data: updates.data
    });
  } else {
    console.error('Engine sync failed:', updates.errors);
  }
}
```

2. **Ensure Proper State Updates:**
```typescript
function updateConfiguration(config: UnitConfiguration) {
  if (activeTab?.unitManager) {
    // Use immutable update pattern
    const updatedTab = {
      ...activeTab,
      unitManager: activeTab.unitManager.updateConfiguration(config),
      isModified: true,
      modified: new Date()
    };
    
    dispatch({ 
      type: 'UPDATE_TAB', 
      payload: { tabId: activeTab.id, updatedTab } 
    });
    
    // Schedule save
    scheduleSave(activeTab.id);
  }
}
```

3. **Add Cross-Component Validation:**
```typescript
function validateComponentCompatibility(components, techProgression) {
  const errors = [];
  
  // Check engine/gyro compatibility
  if (components.engine.type === 'XL' && components.gyro.type === 'XL') {
    // XL gyro requires XL engine
    if (components.engine.type !== 'XL') {
      errors.push('XL Gyro requires XL Engine');
    }
  }
  
  // Check heat sink compatibility
  if (components.heatSinks.type === 'Double (Clan)' && techProgression.heatsink !== 'Clan') {
    errors.push('Clan Double Heat Sinks require Clan tech base');
  }
  
  return errors;
}
```

## Debug Mode

### Enable Debug Logging

```typescript
// Add to component
const DEBUG = process.env.NODE_ENV === 'development';

function MyComponent() {
  useEffect(() => {
    if (DEBUG) {
      console.log('[Debug] Component mounted:', { props, state });
    }
  }, []);
  
  const handleChange = (value) => {
    if (DEBUG) {
      console.log('[Debug] Value changed:', { oldValue, newValue: value });
    }
    // Handle change
  };
}
```

### Performance Debugging

```typescript
import { PerformanceMonitor } from '../utils/performance/PerformanceOptimizer';

function DebugComponent() {
  return (
    <PerformanceMonitor componentName="DebugComponent">
      <ExpensiveComponent />
    </PerformanceMonitor>
  );
}

// Check console for performance warnings
// [Performance] DebugComponent render time exceeded 16ms: 23.45ms
```

### Error Debugging

```typescript
import { ErrorBoundary } from '../components/common/ErrorBoundary';

function DebugApp() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[Debug] Error caught:', error);
        console.error('[Debug] Error info:', errorInfo);
        
        // Log to error reporting service in production
        if (process.env.NODE_ENV === 'production') {
          logErrorToService(error, errorInfo);
        }
      }}
    >
      <MainApp />
    </ErrorBoundary>
  );
}
```

## Common Error Messages

### TypeScript Errors

**Error:** `Type 'X' is not assignable to type 'Y'`
**Solution:** Check prop types and ensure proper TypeScript interfaces

**Error:** `Property 'X' does not exist on type 'Y'`
**Solution:** Add missing properties to interfaces or check object structure

**Error:** `Cannot find module 'X'`
**Solution:** Check import paths and ensure modules exist

### React Errors

**Error:** `Maximum update depth exceeded`
**Solution:** Check for infinite loops in useEffect or state updates

**Error:** `Cannot read property 'X' of undefined`
**Solution:** Add null checks and default values

**Error:** `Warning: Can't perform a React state update on an unmounted component`
**Solution:** Clean up state updates in useEffect cleanup function

### Performance Errors

**Error:** `[Performance] Component render time exceeded 16ms`
**Solution:** Add memoization, break down large components, use virtual scrolling

**Error:** `Memory usage increasing over time`
**Solution:** Clear caches on unmount, implement proper cleanup

## Getting Help

### 1. Check Documentation
- Review component documentation
- Check integration patterns
- Read best practices

### 2. Enable Debug Mode
- Add debug logging
- Monitor performance metrics
- Check error boundaries

### 3. Common Solutions
- Clear browser cache and localStorage
- Restart development server
- Check for TypeScript errors
- Verify component dependencies

### 4. Report Issues
- Include error messages and stack traces
- Describe steps to reproduce
- Provide component code
- Include browser and environment information

## Conclusion

This troubleshooting guide covers the most common issues encountered when working with the BattleTech customizer refactor. Most problems can be resolved by:

1. **Adding proper error boundaries**
2. **Implementing performance optimizations**
3. **Using TypeScript for type safety**
4. **Following state management patterns**
5. **Adding comprehensive validation**

If you encounter issues not covered in this guide, enable debug mode and check the console for detailed error information. 