# BattleTech Customizer Implementation Task List

## Executive Summary

This document provides a comprehensive analysis of the differences between the documented architecture and the current refactored code, along with specific implementation tasks to align them. The current code has undergone significant restructuring and refactoring, but some key architectural patterns from the documentation need to be properly implemented.

## Current State Analysis

### ✅ What's Already Implemented Correctly

1. **Component Modularization**: The OverviewTabV2 has been properly split into focused components:
   - `TechProgressionPanel.tsx` - Handles tech progression matrix
   - `UnitIdentityPanel.tsx` - Handles tech base and introduction year
   - `TechRatingPanel.tsx` - Handles tech rating display
   - `OverviewSummaryPanel.tsx` - Handles rules level and summary

2. **Memory System Foundation**: Basic memory persistence and tech base memory systems are in place:
   - `techBaseMemory.ts` - Core memory management functions
   - `memoryPersistence.ts` - localStorage persistence layer
   - `componentResolution.ts` - Component resolution logic

3. **State Management**: Basic state management with `useUnit` hook and configuration updates

### ❌ What's Missing or Inconsistent

1. **Memory-First Component Resolution**: The current implementation doesn't fully implement the documented memory-first approach
2. **Proper State Management Patterns**: Missing the documented `useReducer` patterns and action types
3. **Component Synchronization**: Missing the documented component sync patterns
4. **Error Handling**: Missing comprehensive error boundaries and validation
5. **UI Consistency**: Missing proper controlled inputs and validation patterns

## Implementation Task List

### Task 1: Implement Memory-First Component Resolution

**Priority**: Critical  
**Estimated Time**: 4-6 hours  
**Status**: Not Started

#### Current Issue
The `handleTechProgressionChange` function in `OverviewTabV2.tsx` (lines 386-443) doesn't implement the documented memory-first resolution pattern. It only updates tech progression without resolving components.

#### Required Changes

1. **Update `handleTechProgressionChange` function**:
```typescript
// Current implementation (lines 386-443)
const handleTechProgressionChange = (subsystem: keyof TechProgression, newTechBase: 'Inner Sphere' | 'Clan') => {
  // Only updates tech progression, no component resolution
  const newProgression = { ...currentProgression, [subsystem]: newTechBase }
  updateConfiguration({ ...currentConfig, techProgression: newProgression })
}

// Required implementation
const handleTechProgressionChange = useCallback((
  subsystem: keyof TechProgression, 
  newTechBase: TechBase
) => {
  console.log(`[OverviewTab] Tech progression change: ${subsystem} → ${newTechBase}`)
  
  // Get current state from unit manager
  const currentConfig = unit.getConfiguration()
  const oldTechBase = currentConfig.techProgression[subsystem]
  const currentComponent = getCurrentComponentForSubsystem(subsystem, currentConfig)
  
  // Memory-first component resolution
  let componentToApply = currentComponent
  let updatedMemoryState = memoryState
  
  if (memoryState && oldTechBase !== newTechBase) {
    const resolution = validateAndResolveComponentWithMemory(
      currentComponent,
      subsystem as ComponentCategory,
      oldTechBase,
      newTechBase,
      memoryState.techBaseMemory,
      currentConfig.rulesLevel
    )
    
    console.log(`[OverviewTab] Memory resolution: ${resolution.resolutionReason}`)
    console.log(`[OverviewTab] Component change: ${currentComponent} → ${resolution.resolvedComponent}`)
    
    // Update memory state
    updatedMemoryState = updateMemoryState(memoryState, resolution.updatedMemory)
    componentToApply = resolution.resolvedComponent
  }
  
  // Update tech progression
  const newProgression = updateTechProgression(currentConfig.techProgression, subsystem, newTechBase)
  
  // Auto-update tech rating
  const newTechRating = autoUpdateTechRating(currentConfig.introductionYear, newProgression, currentConfig)
  
  // Prepare component configuration update
  let componentConfig = {}
  if (componentToApply !== currentComponent) {
    const configProperty = getConfigPropertyForSubsystem(subsystem)
    if (configProperty) {
      componentConfig = { [configProperty]: componentToApply }
      
      // Special handling for armor tonnage preservation
      if (subsystem === 'armor' && 'armorTonnage' in currentConfig) {
        const currentArmorTonnage = currentConfig.armorTonnage || 0
        const newMaxArmorTonnage = calculateMaxArmorTonnage(currentConfig.tonnage, componentToApply)
        const preservedArmorTonnage = Math.min(currentArmorTonnage, newMaxArmorTonnage)
        componentConfig = { ...componentConfig, armorTonnage: preservedArmorTonnage }
      }
    }
  }
  
  // Apply all changes together
  const finalConfig = { 
    techProgression: newProgression,
    techRating: newTechRating,
    ...componentConfig
  }
  
  // Update unit configuration
  updateConfiguration(finalConfig)
  
  // Update local state
  if (updatedMemoryState !== memoryState) {
    setMemoryState(updatedMemoryState)
    saveMemoryToStorage(updatedMemoryState)
  }
  
  console.log(`[OverviewTab] Tech progression update completed:`, finalConfig)
}, [unit, memoryState, updateConfiguration])
```

2. **Add missing imports**:
```typescript
import { validateAndResolveComponentWithMemory } from '../../utils/techBaseMemory'
import { updateMemoryState } from '../../utils/memoryPersistence'
import { calculateMaxArmorTonnage } from '../../utils/armorAllocation'
```

3. **Update `handleMasterTechBaseChange` function** to implement the documented master tech base flow

#### Validation Steps
- [ ] Test individual subsystem tech progression changes
- [ ] Verify memory restoration works correctly
- [ ] Test component resolution for each subsystem
- [ ] Verify armor tonnage preservation
- [ ] Test tech rating auto-calculation

---

### Task 2: Implement Proper State Management Patterns

**Priority**: High  
**Estimated Time**: 3-4 hours  
**Status**: Not Started

#### Current Issue
The current implementation uses simple `useState` hooks instead of the documented `useReducer` patterns with proper action types.

#### Required Changes

1. **Create Overview Tab Reducer**:
```typescript
// New file: components/overview/overviewTabReducer.ts
interface OverviewTabState {
  techProgression: TechProgression
  introductionYear: number
  rulesLevel: RulesLevel
  techRating: TechRating
  memoryState: ComponentMemoryState | null
  hasInitialized: boolean
  needsMemoryRestoration: boolean
}

type OverviewTabAction = 
  | { type: 'UPDATE_TECH_PROGRESSION'; payload: { subsystem: keyof TechProgression; techBase: TechBase } }
  | { type: 'UPDATE_INTRODUCTION_YEAR'; payload: number }
  | { type: 'UPDATE_RULES_LEVEL'; payload: RulesLevel }
  | { type: 'SET_MEMORY_STATE'; payload: ComponentMemoryState }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_NEEDS_MEMORY_RESTORATION'; payload: boolean }

function overviewTabReducer(state: OverviewTabState, action: OverviewTabAction): OverviewTabState {
  switch (action.type) {
    case 'UPDATE_TECH_PROGRESSION':
      return {
        ...state,
        techProgression: {
          ...state.techProgression,
          [action.payload.subsystem]: action.payload.techBase
        }
      }
    case 'UPDATE_INTRODUCTION_YEAR':
      return {
        ...state,
        introductionYear: action.payload
      }
    case 'UPDATE_RULES_LEVEL':
      return {
        ...state,
        rulesLevel: action.payload
      }
    case 'SET_MEMORY_STATE':
      return {
        ...state,
        memoryState: action.payload
      }
    case 'SET_INITIALIZED':
      return {
        ...state,
        hasInitialized: action.payload
      }
    case 'SET_NEEDS_MEMORY_RESTORATION':
      return {
        ...state,
        needsMemoryRestoration: action.payload
      }
    default:
      return state
  }
}
```

2. **Update OverviewTabV2 to use reducer**:
```typescript
// Replace useState hooks with useReducer
const [state, dispatch] = useReducer(overviewTabReducer, initialState)

// Replace direct state updates with dispatch calls
dispatch({ type: 'UPDATE_TECH_PROGRESSION', payload: { subsystem, techBase: newTechBase } })
dispatch({ type: 'SET_MEMORY_STATE', payload: updatedMemoryState })
```

#### Validation Steps
- [ ] Verify reducer handles all state updates correctly
- [ ] Test state transitions for each action type
- [ ] Verify state persistence works with reducer
- [ ] Test error handling in reducer

---

### Task 3: Implement Component Synchronization

**Priority**: High  
**Estimated Time**: 4-5 hours  
**Status**: Not Started

#### Current Issue
The current implementation doesn't implement the documented component synchronization patterns that handle equipment displacement and slot updates.

#### Required Changes

1. **Create Component Sync Service**:
```typescript
// New file: utils/componentSync.ts
export interface SyncResult {
  success: boolean
  systemComponents?: SystemComponents
  criticalAllocations?: Record<string, CriticalSlot[]>
  displacedEquipment?: EquipmentAllocation[]
  errors?: string[]
}

export function syncEngineChange(
  unit: EditableUnit,
  newEngineType: EngineType,
  newEngineRating: number
): SyncResult {
  // Implement engine change synchronization
  // Handle weight recalculation
  // Handle heat sink integration
  // Handle critical slot updates
  // Handle equipment displacement
}

export function syncGyroChange(
  unit: EditableUnit,
  newGyroType: GyroType
): SyncResult {
  // Implement gyro change synchronization
  // Handle weight recalculation
  // Handle critical slot updates
  // Handle engine compatibility
  // Handle equipment displacement
}

// Similar functions for other components
```

2. **Update Overview Tab to use component sync**:
```typescript
// In handleTechProgressionChange
if (componentToApply !== currentComponent) {
  const syncResult = syncComponentChange(unit, subsystem, componentToApply)
  
  if (syncResult.success) {
    componentConfig = {
      ...componentConfig,
      systemComponents: syncResult.systemComponents,
      criticalAllocations: syncResult.criticalAllocations
    }
    
    // Handle displaced equipment
    if (syncResult.displacedEquipment?.length) {
      // Move equipment to unallocated
      syncResult.displacedEquipment.forEach(equipment => {
        unit.displaceEquipment(equipment.equipmentGroupId)
      })
    }
  } else {
    console.error('Component sync failed:', syncResult.errors)
    return
  }
}
```

#### Validation Steps
- [ ] Test engine change synchronization
- [ ] Test gyro change synchronization
- [ ] Test heat sink change synchronization
- [ ] Test armor change synchronization
- [ ] Verify equipment displacement works correctly
- [ ] Test critical slot updates

---

### Task 4: Implement Error Boundaries and Validation

**Priority**: Medium  
**Estimated Time**: 2-3 hours  
**Status**: Not Started

#### Current Issue
The current implementation lacks comprehensive error handling and validation patterns documented in the architecture.

#### Required Changes

1. **Create Error Boundary Component**:
```typescript
// New file: components/common/ComponentErrorBoundary.tsx
class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error:', error, errorInfo)
    logError(error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

2. **Add Validation Functions**:
```typescript
// New file: utils/validation.ts
export function validateUnitState(unit: EditableUnit): ValidationState {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Validate all components
  if (!unit.systemComponents) {
    errors.push('Missing system components')
  } else {
    const componentValidation = validateSystemComponents(unit.systemComponents)
    errors.push(...componentValidation.errors)
    warnings.push(...componentValidation.warnings)
  }
  
  // Validate critical allocations
  if (unit.criticalAllocations) {
    const allocationValidation = validateCriticalAllocations(unit.criticalAllocations)
    errors.push(...allocationValidation.errors)
    warnings.push(...allocationValidation.warnings)
  }
  
  // Validate tech progression consistency
  if (unit.techProgression) {
    const techValidation = validateTechProgression(unit.techProgression)
    errors.push(...techValidation.errors)
    warnings.push(...techValidation.warnings)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    canRecover: errors.length <= 3
  }
}
```

3. **Update Overview Tab to use validation**:
```typescript
// In handleTechProgressionChange
const validation = validateUnitState(unit)
if (!validation.isValid) {
  console.error('Validation failed:', validation.errors)
  // Show error to user
  return
}
```

#### Validation Steps
- [ ] Test error boundary with simulated errors
- [ ] Test validation functions with various unit states
- [ ] Verify error recovery mechanisms work
- [ ] Test validation error display to users

---

### Task 5: Implement UI Consistency Patterns

**Priority**: Medium  
**Estimated Time**: 2-3 hours  
**Status**: Not Started

#### Current Issue
The current implementation doesn't fully implement the documented controlled input patterns and real-time validation.

#### Required Changes

1. **Create Controlled Input Hook**:
```typescript
// New file: hooks/useControlledInput.ts
function useControlledInput<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  
  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setState(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
    
    // Validate on change
    const validation = validateField(field, value)
    setErrors(prev => ({ ...prev, [field]: validation.error || '' }))
  }, [])
  
  const reset = useCallback(() => {
    setState(initialState)
    setErrors({})
    setIsDirty(false)
  }, [initialState])
  
  return { state, errors, isDirty, updateField, reset }
}
```

2. **Update TechProgressionPanel to use controlled inputs**:
```typescript
// In TechProgressionPanel.tsx
const { state, errors, updateField } = useControlledInput(techProgression)

// Update button handlers to use controlled input
const handleTechBaseChange = (subsystem: keyof TechProgression, techBase: TechBase) => {
  updateField(subsystem, techBase)
  onTechProgressionChange(subsystem, techBase)
}
```

#### Validation Steps
- [ ] Test controlled input validation
- [ ] Verify real-time error display
- [ ] Test form state management
- [ ] Verify input consistency across components

---

### Task 6: Implement Performance Optimizations

**Priority**: Low  
**Estimated Time**: 1-2 hours  
**Status**: Not Started

#### Current Issue
The current implementation doesn't implement the documented performance optimization patterns.

#### Required Changes

1. **Add Caching Strategy**:
```typescript
// New file: utils/performance/cacheManager.ts
export class CacheManager {
  private cache = new Map<string, any>()
  
  get(key: string): any | null {
    return this.cache.get(key)
  }
  
  set(key: string, value: any): void {
    this.cache.set(key, value)
  }
  
  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}
```

2. **Add Debouncing**:
```typescript
// In OverviewTabV2.tsx
const debouncedUpdateConfiguration = useMemo(
  () => debounce(updateConfiguration, 300),
  [updateConfiguration]
)
```

#### Validation Steps
- [ ] Test cache invalidation on tech progression changes
- [ ] Verify debouncing works correctly
- [ ] Test performance improvements
- [ ] Verify memory usage optimization

---

### Task 7: Update Documentation References

**Priority**: Low  
**Estimated Time**: 1 hour  
**Status**: Not Started

#### Current Issue
The documentation references old file paths and implementation patterns that don't match the current refactored code.

#### Required Changes

1. **Update customizer-architecture-analysis.md**:
   - Update file paths to match new structure
   - Update code examples to match new implementation
   - Add references to new components
   - Update debugging checkpoints

2. **Create Implementation Guide**:
   - Document new component structure
   - Provide migration guide from old to new patterns
   - Add troubleshooting section

#### Validation Steps
- [ ] Verify all file paths are correct
- [ ] Test code examples work with current implementation
- [ ] Verify debugging checkpoints are accurate
- [ ] Test migration guide

---

## Implementation Timeline

### Week 1: Core Functionality
- **Day 1-2**: Task 1 (Memory-First Component Resolution)
- **Day 3-4**: Task 2 (State Management Patterns)
- **Day 5**: Task 3 (Component Synchronization) - Part 1

### Week 2: Advanced Features
- **Day 1-2**: Task 3 (Component Synchronization) - Part 2
- **Day 3**: Task 4 (Error Boundaries and Validation)
- **Day 4**: Task 5 (UI Consistency Patterns)
- **Day 5**: Task 6 (Performance Optimizations)

### Week 3: Documentation and Testing
- **Day 1**: Task 7 (Update Documentation References)
- **Day 2-5**: Comprehensive testing and bug fixes

## Risk Assessment

### High Risk Items
1. **Component Synchronization**: Complex logic that could break existing functionality
2. **Memory System**: Critical for user experience, must work reliably
3. **State Management**: Changes affect entire application state

### Mitigation Strategies
1. **Incremental Implementation**: Implement changes in small, testable chunks
2. **Comprehensive Testing**: Test each change thoroughly before proceeding
3. **Fallback Mechanisms**: Maintain ability to revert to previous state
4. **User Feedback**: Gather feedback on changes to ensure they meet requirements

## Success Criteria

### Functional Requirements
- [ ] Memory-first component resolution works correctly
- [ ] All tech progression changes update components appropriately
- [ ] Equipment displacement works without data loss
- [ ] Error handling provides clear feedback to users
- [ ] Performance remains acceptable

### Technical Requirements
- [ ] Code follows documented architectural patterns
- [ ] All components use proper TypeScript types
- [ ] Error boundaries catch and handle errors gracefully
- [ ] State management is consistent and predictable
- [ ] Memory persistence works reliably

### User Experience Requirements
- [ ] Tech progression changes feel responsive
- [ ] Component changes are intuitive and predictable
- [ ] Error messages are clear and actionable
- [ ] No data loss during tech base transitions
- [ ] UI remains consistent across all interactions

## Conclusion

This implementation task list provides a comprehensive roadmap for aligning the current refactored code with the documented architecture. By following this plan, we can ensure that the BattleTech customizer implements all the sophisticated patterns described in the architecture documentation while maintaining the benefits of the recent refactoring.

The key is to implement changes incrementally, with thorough testing at each step, to ensure that the complex interactions between tech progression, component resolution, and state management work correctly and provide a smooth user experience. 