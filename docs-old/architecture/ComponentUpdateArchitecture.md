# Component Update Architecture

## Overview

This document describes the clean, testable architecture for handling component updates in the BattleTech unit configuration system. The architecture follows SOLID principles and provides a robust, maintainable solution for updating individual components without affecting others.

## Problem Statement

The original implementation had several issues:

1. **Tight Coupling**: UI components directly called UnitCriticalManager methods
2. **Mixed Responsibilities**: Configuration updates were mixed with UI state management
3. **Hard to Test**: Complex state management with side effects made testing difficult
4. **No Separation of Concerns**: Business logic was mixed with UI logic
5. **Configuration Loss**: Changing one component could reset others due to partial updates

## Solution Architecture

### 1. ComponentUpdateService (Business Logic Layer)

**Location**: `services/ComponentUpdateService.ts`

**Responsibility**: Pure business logic for updating individual components

**Key Features**:
- **Single Responsibility**: Only handles component updates
- **Pure Functions**: No side effects, deterministic output
- **Validation**: Built-in configuration validation
- **Change Detection**: Tracks what components actually changed
- **Error Handling**: Returns structured error information

**Interface**:
```typescript
interface ComponentUpdateRequest {
  componentType: 'structure' | 'armor' | 'engine' | 'gyro' | 'heatSink' | 'jumpJet'
  newValue: ComponentConfiguration | string
  currentConfiguration: UnitConfiguration
}

interface ComponentUpdateResult {
  success: boolean
  newConfiguration: UnitConfiguration
  changes: {
    structureChanged: boolean
    armorChanged: boolean
    engineChanged: boolean
    gyroChanged: boolean
    heatSinkChanged: boolean
    jumpJetChanged: boolean
  }
  errors: string[]
  warnings: string[]
}
```

**Usage**:
```typescript
const result = ComponentUpdateService.updateComponent({
  componentType: 'structure',
  newValue: { type: 'Endo Steel', techBase: 'Inner Sphere' },
  currentConfiguration: currentConfig
})
```

### 2. ComponentUpdateAdapter (Adapter Layer)

**Location**: `services/ComponentUpdateAdapter.ts`

**Responsibility**: Translates between UI layer and service layer

**Key Features**:
- **Interface Translation**: Converts UI calls to service requests
- **Logging**: Provides debugging information
- **Type Safety**: Ensures proper parameter types
- **Singleton Pattern**: Single instance for application-wide use

**Interface**:
```typescript
interface ComponentUpdateAdapterInterface {
  updateStructure(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult
  updateArmor(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult
  updateEngine(newValue: string, currentConfig: UnitConfiguration): ComponentUpdateResult
  updateGyro(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult
  updateHeatSink(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult
  updateJumpJet(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult
}
```

### 3. MultiUnitProvider (UI State Management)

**Location**: `components/multiUnit/MultiUnitProvider.tsx`

**Responsibility**: UI state management and coordination

**Key Features**:
- **Error Handling**: Handles service failures gracefully
- **State Updates**: Manages UI state changes
- **Logging**: Provides debugging information
- **Validation**: Only applies successful updates

**Updated Methods**:
```typescript
changeStructure: (structureType: ComponentConfiguration | string) => void
changeArmor: (armorType: ComponentConfiguration | string) => void
changeEngine: (engineType: string) => void
changeGyro: (gyroType: ComponentConfiguration | string) => void
changeHeatSink: (heatSinkType: ComponentConfiguration | string) => void
changeJumpJet: (jumpJetType: ComponentConfiguration | string) => void
```

## SOLID Principles Applied

### 1. Single Responsibility Principle (SRP)

- **ComponentUpdateService**: Only handles component update logic
- **ComponentUpdateAdapter**: Only handles translation between layers
- **MultiUnitProvider**: Only handles UI state management

### 2. Open/Closed Principle (OCP)

- Service is open for extension (new component types) but closed for modification
- Adapter pattern allows new implementations without changing existing code

### 3. Liskov Substitution Principle (LSP)

- All implementations of ComponentUpdateAdapterInterface are interchangeable
- Service methods can be mocked for testing

### 4. Interface Segregation Principle (ISP)

- Clean, focused interfaces for each layer
- No unnecessary dependencies between components

### 5. Dependency Inversion Principle (DIP)

- UI depends on abstractions (adapter interface), not concrete implementations
- Service layer is independent of UI layer

## Testing Strategy

### 1. Unit Tests

**ComponentUpdateService Tests** (`__tests__/services/ComponentUpdateService.test.ts`):
- Tests individual component updates
- Verifies other components are not affected
- Tests validation logic
- Tests change detection
- Tests error handling

**ComponentUpdateAdapter Tests** (`__tests__/services/ComponentUpdateAdapter.test.ts`):
- Tests translation between UI and service layers
- Verifies correct parameter passing
- Tests logging functionality
- Tests return value handling

### 2. Integration Tests

**Component Update Integration Tests** (`__tests__/integration/ComponentUpdateIntegration.test.tsx`):
- Tests complete flow from UI to service
- Verifies MultiUnitProvider integration
- Tests error handling in UI layer
- Tests state preservation

### 3. Test Coverage

- **Service Layer**: 100% coverage of business logic
- **Adapter Layer**: 100% coverage of translation logic
- **UI Layer**: Integration testing with mocked dependencies

## Benefits

### 1. Maintainability

- **Clear Separation**: Each layer has a single, well-defined responsibility
- **Easy Debugging**: Comprehensive logging at each layer
- **Type Safety**: Strong typing prevents runtime errors

### 2. Testability

- **Pure Functions**: Service layer is easily testable
- **Mockable Dependencies**: All dependencies can be mocked
- **Isolated Testing**: Each layer can be tested independently

### 3. Reliability

- **Validation**: Built-in configuration validation
- **Error Handling**: Structured error responses
- **State Preservation**: Other components are not affected by individual updates

### 4. Extensibility

- **New Components**: Easy to add new component types
- **New Validations**: Easy to add new validation rules
- **New Adapters**: Easy to add new UI layer adapters

## Usage Examples

### Basic Component Update

```typescript
// In a UI component
const { changeStructure } = useMultiUnit()

const handleStructureChange = (newStructure: ComponentConfiguration) => {
  changeStructure(newStructure)
}
```

### Error Handling

```typescript
// The service returns structured error information
const result = componentUpdateAdapter.updateStructure(newValue, currentConfig)

if (!result.success) {
  console.error('Update failed:', result.errors)
  // Show error to user
}
```

### Change Detection

```typescript
// The service tells you what actually changed
const result = componentUpdateAdapter.updateStructure(newValue, currentConfig)

if (result.changes.structureChanged) {
  // Structure was actually updated
}
```

## Migration Guide

### From Old Implementation

1. **Replace Direct Calls**: Instead of calling `unitManager.updateConfiguration()` directly, use the new change methods
2. **Update Type Signatures**: Methods now accept both `ComponentConfiguration` and `string` types
3. **Add Error Handling**: Check for `success` flag and handle errors appropriately
4. **Update Tests**: Replace direct service tests with adapter and integration tests

### Example Migration

**Before**:
```typescript
const newConfig = { ...currentConfig, structureType: newStructure }
unitManager.updateConfiguration(newConfig)
```

**After**:
```typescript
const result = componentUpdateAdapter.updateStructure(newStructure, currentConfig)
if (result.success) {
  unitManager.updateConfiguration(result.newConfiguration)
}
```

## Future Enhancements

1. **Async Updates**: Support for asynchronous component updates
2. **Batch Updates**: Support for updating multiple components at once
3. **Undo/Redo**: Integration with undo/redo system
4. **Validation Rules**: Configurable validation rules
5. **Performance Optimization**: Caching and memoization

## Conclusion

This architecture provides a solid foundation for component updates that is:

- **Maintainable**: Clear separation of concerns
- **Testable**: Comprehensive test coverage
- **Reliable**: Built-in validation and error handling
- **Extensible**: Easy to add new features
- **Type Safe**: Strong typing throughout

The architecture follows SOLID principles and provides a robust solution for the complex requirements of BattleTech unit configuration. 