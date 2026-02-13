# Utility Patterns Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: validation-patterns
**Affects**: All application modules

---

## Overview

### Purpose

This specification defines shared utility patterns used throughout MekStation for debouncing user input, type-safe runtime validation, and unique identifier generation. These utilities provide foundational infrastructure for performance optimization, type safety, and data integrity.

### Scope

**In Scope:**

- Debounce utility function (cancellable debounced functions)
- React debounce hooks (value debouncing, callback debouncing)
- Type guard functions (8 guards for BattleTech domain types)
- Type assertion functions (3 assertions with error throwing)
- Enum validators (3 validators for TechBase, RulesLevel, Era)
- UUID utilities (generation and validation)

**Out of Scope:**

- Throttle utilities (different timing pattern)
- Memoization utilities (caching pattern)
- Deep equality checks (comparison utilities)
- Custom UUID formats (only standard UUID v4)
- Type guards for non-domain types (use TypeScript built-ins)

### Key Concepts

- **Debouncing**: Delaying function execution until after a specified delay has elapsed since the last invocation, preventing excessive updates during rapid user input
- **Type Guard**: A function that performs runtime type checking and narrows TypeScript types via type predicates
- **Type Assertion**: A function that throws an error if a value does not match the expected type
- **UUID v4**: Universally unique identifier using random generation (RFC 4122)

---

## Requirements

### Requirement: Debounce Utility Function

The system SHALL provide a `debounce<T>()` utility function that creates a debounced version of any function, delaying execution until after a specified delay has elapsed since the last invocation.

**Source**: `src/utils/debounce.ts:33-64`

**Rationale**: Prevents excessive function calls during rapid user input (search queries, validation, API calls), improving performance and reducing server load.

**Priority**: High

#### Scenario: Debounce function execution

**GIVEN** a function `search(query: string)` and delay of 300ms
**WHEN** `debounce(search, 300)` is called
**THEN** the system SHALL return a debounced function with the same signature
**AND** the debounced function SHALL delay execution by 300ms after the last invocation
**AND** the debounced function SHALL cancel pending executions when called again

#### Scenario: Cancel pending execution

**GIVEN** a debounced function with pending execution
**WHEN** `debouncedFn.cancel()` is called
**THEN** the system SHALL clear the pending timeout
**AND** the system SHALL prevent the function from executing

#### Scenario: Preserve function context

**GIVEN** a method `obj.method()` that uses `this` context
**WHEN** `debounce(obj.method, 300)` is called and invoked with `obj` as context
**THEN** the system SHALL preserve the `this` context when executing the debounced function
**AND** the system SHALL pass all arguments to the original function

#### Scenario: Generic typing

**GIVEN** a function with specific parameter and return types
**WHEN** `debounce<T>()` is called with that function
**THEN** the system SHALL preserve the function's type signature
**AND** TypeScript SHALL enforce type safety for parameters and return type

### Requirement: Value Debouncing Hook

The system SHALL provide a `useDebounce<T>()` React hook that debounces a value by delaying updates until after a specified delay has elapsed since the last change.

**Source**: `src/hooks/useDebounce.ts:40-56`

**Rationale**: Prevents excessive re-renders and expensive computations during rapid state changes (search input, slider values, form fields).

**Priority**: High

#### Scenario: Debounce value updates

**GIVEN** a state value that changes rapidly (e.g., search query)
**WHEN** `useDebounce(value, 300)` is called
**THEN** the system SHALL return the debounced value
**AND** the debounced value SHALL only update 300ms after the last value change
**AND** the system SHALL use `useState` and `useEffect` for state management

#### Scenario: Cleanup on unmount

**GIVEN** a component using `useDebounce(value, 300)`
**WHEN** the component unmounts with a pending update
**THEN** the system SHALL clear the pending timeout via `useEffect` cleanup
**AND** the system SHALL prevent state updates after unmount

#### Scenario: Delay change handling

**GIVEN** a debounced value with delay of 300ms
**WHEN** the delay changes to 500ms
**THEN** the system SHALL cancel the pending timeout
**AND** the system SHALL schedule a new timeout with the updated delay

### Requirement: Debounced Callback Hook

The system SHALL provide a `useDebouncedCallback<T>()` React hook that creates a debounced version of a callback function with a stable reference and cancel method.

**Source**: `src/hooks/useDebounce.ts:86-119`

**Rationale**: Provides a stable debounced callback reference that can be safely used in dependency arrays, preventing unnecessary re-renders while supporting callback updates.

**Priority**: High

#### Scenario: Create stable debounced callback

**GIVEN** a callback function `validate(unit: Unit)`
**WHEN** `useDebouncedCallback(validate, 300)` is called
**THEN** the system SHALL return a debounced callback with stable reference
**AND** the debounced callback SHALL have a `cancel()` method
**AND** the system SHALL use `useRef` to maintain stable reference across renders

#### Scenario: Update callback via ref

**GIVEN** a debounced callback created with `useDebouncedCallback(callback, 300)`
**WHEN** the callback function changes
**THEN** the system SHALL update `callbackRef.current` to the new callback
**AND** the system SHALL NOT recreate the debounced function
**AND** the next invocation SHALL use the updated callback

#### Scenario: Update delay

**GIVEN** a debounced callback with delay of 300ms
**WHEN** the delay changes to 500ms
**THEN** the system SHALL cancel the existing debounced function
**AND** the system SHALL create a new debounced function with the updated delay
**AND** the system SHALL preserve the callback ref pattern

#### Scenario: Cleanup on unmount

**GIVEN** a component using `useDebouncedCallback(callback, 300)`
**WHEN** the component unmounts with a pending execution
**THEN** the system SHALL call `debouncedCallback.cancel()` via `useEffect` cleanup
**AND** the system SHALL prevent execution after unmount

### Requirement: Entity Type Guards

The system SHALL provide type guard functions for validating BattleTech domain entities at runtime, enabling safe type narrowing in TypeScript.

**Source**: `src/utils/typeGuards.ts:18-256`

**Rationale**: Enables runtime validation of data from external sources (API responses, user input, database queries) with TypeScript type narrowing.

**Priority**: High

#### Scenario: Validate Entity

**GIVEN** an unknown value
**WHEN** `isEntity(value)` is called
**THEN** the system SHALL return `true` if value has `id: string` and `name: string` properties
**AND** the system SHALL narrow the type to `{ id: string; name: string }`
**AND** the system SHALL return `false` for null, undefined, or objects missing required properties

#### Scenario: Validate WeightedComponent

**GIVEN** an unknown value
**WHEN** `isWeightedComponent(value)` is called
**THEN** the system SHALL return `true` if value has `weight: number` property >= 0
**AND** the system SHALL check that weight is a finite number
**AND** the system SHALL narrow the type to `{ weight: number }`

#### Scenario: Validate SlottedComponent

**GIVEN** an unknown value
**WHEN** `isSlottedComponent(value)` is called
**THEN** the system SHALL return `true` if value has `criticalSlots: number` property >= 0
**AND** the system SHALL check that criticalSlots is a non-negative integer
**AND** the system SHALL narrow the type to `{ criticalSlots: number }`

#### Scenario: Validate PlaceableComponent

**GIVEN** an unknown value
**WHEN** `isPlaceableComponent(value)` is called
**THEN** the system SHALL return `true` if value passes both `isWeightedComponent` and `isSlottedComponent`
**AND** the system SHALL narrow the type to `{ weight: number; criticalSlots: number }`

#### Scenario: Validate TechBaseEntity

**GIVEN** an unknown value
**WHEN** `isTechBaseEntity(value)` is called
**THEN** the system SHALL return `true` if value has valid `techBase: TechBase` and `rulesLevel: RulesLevel` properties
**AND** the system SHALL validate enum values using `Object.values()` inclusion check
**AND** the system SHALL narrow the type to `{ techBase: TechBase; rulesLevel: RulesLevel }`

#### Scenario: Validate TemporalEntity

**GIVEN** an unknown value
**WHEN** `isTemporalEntity(value)` is called
**THEN** the system SHALL return `true` if value has `introductionYear: number` property
**AND** the system SHALL validate optional `extinctionYear: number` if present
**AND** the system SHALL check that extinctionYear >= introductionYear
**AND** the system SHALL narrow the type to `{ introductionYear: number; extinctionYear?: number }`

#### Scenario: Validate ValuedComponent

**GIVEN** an unknown value
**WHEN** `isValuedComponent(value)` is called
**THEN** the system SHALL return `true` if value has `costCBills: number` and `battleValue: number` properties >= 0
**AND** the system SHALL narrow the type to `{ costCBills: number; battleValue: number }`

#### Scenario: Validate DocumentedEntity

**GIVEN** an unknown value
**WHEN** `isDocumentedEntity(value)` is called
**THEN** the system SHALL return `true` if value has optional `sourceBook?: string` and `pageReference?: number` properties
**AND** the system SHALL validate that pageReference is an integer if present
**AND** the system SHALL narrow the type to `{ sourceBook?: string; pageReference?: number }`

### Requirement: Type Assertion Functions

The system SHALL provide assertion functions that throw errors when values do not match expected types, enabling fail-fast validation with optional context messages.

**Source**: `src/utils/typeGuards.ts:217-255`

**Rationale**: Provides clear error messages for invalid data, preventing silent failures and improving debugging.

**Priority**: Medium

#### Scenario: Assert Entity with context

**GIVEN** an unknown value and context string "User input"
**WHEN** `assertEntity(value, "User input")` is called
**AND** value is not a valid Entity
**THEN** the system SHALL throw an Error with message "User input: Value is not a valid Entity"

#### Scenario: Assert WeightedComponent without context

**GIVEN** an unknown value
**WHEN** `assertWeightedComponent(value)` is called
**AND** value is not a valid WeightedComponent
**THEN** the system SHALL throw an Error with message "Value is not a valid WeightedComponent"

#### Scenario: Assert TechBaseEntity success

**GIVEN** a valid TechBaseEntity value
**WHEN** `assertTechBaseEntity(value)` is called
**THEN** the system SHALL NOT throw an error
**AND** TypeScript SHALL narrow the type to `{ techBase: TechBase; rulesLevel: RulesLevel }`

### Requirement: Enum Validators

The system SHALL provide validator functions for checking if string values are valid enum members, enabling safe enum parsing from external sources.

**Source**: `src/utils/typeGuards.ts:196-213`

**Rationale**: Validates enum values from API responses, user input, or database queries before casting to enum types.

**Priority**: Medium

#### Scenario: Validate TechBase enum

**GIVEN** a string value "InnerSphere"
**WHEN** `isValidTechBase(value)` is called
**THEN** the system SHALL return `true` if value is in `Object.values(TechBase)`
**AND** the system SHALL narrow the type to `TechBase`

#### Scenario: Validate RulesLevel enum

**GIVEN** a string value "Standard"
**WHEN** `isValidRulesLevel(value)` is called
**THEN** the system SHALL return `true` if value is in `Object.values(RulesLevel)`
**AND** the system SHALL narrow the type to `RulesLevel`

#### Scenario: Validate Era enum

**GIVEN** a string value "Succession Wars"
**WHEN** `isValidEra(value)` is called
**THEN** the system SHALL return `true` if value is in `Object.values(Era)`
**AND** the system SHALL narrow the type to `Era`

#### Scenario: Invalid enum value

**GIVEN** a string value "InvalidValue"
**WHEN** `isValidTechBase(value)` is called
**THEN** the system SHALL return `false`
**AND** TypeScript SHALL NOT narrow the type

### Requirement: UUID Generation and Validation

The system SHALL provide UUID v4 generation and validation utilities using the `uuid` library, enabling consistent unique identifier management across the application.

**Source**: `src/utils/uuid.ts:1-38`

**Rationale**: Provides consistent UUID generation for unit identification, enabling multi-user support and shareable unit URLs.

**Priority**: High

#### Scenario: Generate UUID v4

**GIVEN** a need for a unique identifier
**WHEN** `generateUUID()` is called
**THEN** the system SHALL return a valid UUID v4 string
**AND** the system SHALL use the `uuid` library's `v4()` function
**AND** the UUID SHALL follow RFC 4122 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)

#### Scenario: Validate UUID format

**GIVEN** a string value
**WHEN** `isValidUUID(value)` is called
**THEN** the system SHALL return `true` if value is a valid UUID format
**AND** the system SHALL use the `uuid` library's `validate()` function
**AND** the system SHALL return `false` for invalid formats

#### Scenario: Generate unit ID

**GIVEN** a need for a unit identifier
**WHEN** `generateUnitId()` is called
**THEN** the system SHALL return a valid UUID v4 string
**AND** the system SHALL use the same format as `generateUUID()`

#### Scenario: Validate unit ID format

**GIVEN** a string value
**WHEN** `isValidUnitId(value)` is called
**THEN** the system SHALL return `true` if value is a valid UUID format
**AND** the system SHALL use the same validation as `isValidUUID()`

---

## Data Model Requirements

### Debounce Function Signature

The implementation MUST provide the following TypeScript function signature:

```typescript
/**
 * Creates a debounced function that delays invoking func until after delay
 * milliseconds have elapsed since the last time the debounced function was invoked.
 *
 * @template T - Function type
 * @param func - The function to debounce
 * @param delay - The number of milliseconds to delay
 * @returns Debounced function with cancel method
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number,
): T & { cancel: () => void };
```

### Debounce Hook Signatures

The implementation MUST provide the following React hook signatures:

```typescript
/**
 * Debounces a value by delaying updates until after the specified delay
 * has elapsed since the last change.
 *
 * @template T - Value type
 * @param value - The value to debounce
 * @param delay - The number of milliseconds to delay (default: 300)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay?: number): T;

/**
 * Creates a debounced version of a callback function that delays execution
 * until after the specified delay has elapsed since the last invocation.
 *
 * @template T - Callback function type
 * @param callback - The callback function to debounce
 * @param delay - The number of milliseconds to delay (default: 300)
 * @returns Debounced callback with stable reference and cancel method
 */
export function useDebouncedCallback<
  T extends (...args: Parameters<T>) => ReturnType<T>,
>(callback: T, delay?: number): T & { cancel: () => void };
```

### Type Guard Signatures

The implementation MUST provide the following type guard function signatures:

```typescript
/**
 * Type guard for Entity (has id and name)
 */
export function isEntity(value: unknown): value is { id: string; name: string };

/**
 * Type guard for WeightedComponent (has weight >= 0)
 */
export function isWeightedComponent(
  value: unknown,
): value is { weight: number };

/**
 * Type guard for SlottedComponent (has criticalSlots >= 0)
 */
export function isSlottedComponent(
  value: unknown,
): value is { criticalSlots: number };

/**
 * Type guard for PlaceableComponent (has weight and criticalSlots)
 */
export function isPlaceableComponent(
  value: unknown,
): value is { weight: number; criticalSlots: number };

/**
 * Type guard for TechBaseEntity (has techBase and rulesLevel)
 */
export function isTechBaseEntity(
  value: unknown,
): value is { techBase: TechBase; rulesLevel: RulesLevel };

/**
 * Type guard for TemporalEntity (has introductionYear and optional extinctionYear)
 */
export function isTemporalEntity(
  value: unknown,
): value is { introductionYear: number; extinctionYear?: number };

/**
 * Type guard for ValuedComponent (has costCBills and battleValue)
 */
export function isValuedComponent(
  value: unknown,
): value is { costCBills: number; battleValue: number };

/**
 * Type guard for DocumentedEntity (has optional sourceBook and pageReference)
 */
export function isDocumentedEntity(
  value: unknown,
): value is { sourceBook?: string; pageReference?: number };
```

### Type Assertion Signatures

The implementation MUST provide the following assertion function signatures:

```typescript
/**
 * Assert that a value is an Entity, throwing if not
 */
export function assertEntity(
  value: unknown,
  context?: string,
): asserts value is { id: string; name: string };

/**
 * Assert that a value is a WeightedComponent, throwing if not
 */
export function assertWeightedComponent(
  value: unknown,
  context?: string,
): asserts value is { weight: number };

/**
 * Assert that a value is a TechBaseEntity, throwing if not
 */
export function assertTechBaseEntity(
  value: unknown,
  context?: string,
): asserts value is { techBase: TechBase; rulesLevel: RulesLevel };
```

### Enum Validator Signatures

The implementation MUST provide the following enum validator signatures:

```typescript
/**
 * Check if a string is a valid TechBase enum value
 */
export function isValidTechBase(value: string): value is TechBase;

/**
 * Check if a string is a valid RulesLevel enum value
 */
export function isValidRulesLevel(value: string): value is RulesLevel;

/**
 * Check if a string is a valid Era enum value
 */
export function isValidEra(value: string): value is Era;
```

### UUID Utility Signatures

The implementation MUST provide the following UUID utility signatures:

```typescript
/**
 * Generate a new UUID v4 for unit identification
 */
export function generateUUID(): string;

/**
 * Validate if a string is a valid UUID
 */
export function isValidUUID(id: string): boolean;

/**
 * Generate a unit ID with UUID format
 */
export function generateUnitId(): string;

/**
 * Check if a unit ID is in valid UUID format
 */
export function isValidUnitId(id: string): boolean;
```

---

## Dependencies

### Depends On

- **validation-patterns**: Type guards are used by validation rules for runtime type checking
- **uuid library**: UUID generation and validation (npm package)

### Used By

- **All application modules**: Debounce utilities used for search, validation, and user input handling
- **Equipment browser**: Debounced search queries
- **Unit customizer**: Debounced validation and calculations
- **API layer**: Type guards for validating API responses
- **Database layer**: Type guards for validating database queries
- **Unit services**: UUID generation for unit identification

---

## Implementation Notes

### Performance Considerations

- **Debounce delay tuning**: Default 300ms is suitable for most user input; adjust based on use case (search: 300ms, validation: 500ms, autosave: 2000ms)
- **Hook memoization**: `useDebouncedCallback` uses `useRef` to maintain stable references, preventing unnecessary re-renders
- **Type guard efficiency**: Type guards perform minimal checks (property existence, type checks) for fast runtime validation

### Edge Cases

- **Debounce with delay 0**: Executes immediately (no debouncing)
- **Debounce cancel on unmount**: Always cleanup pending timeouts to prevent memory leaks
- **Type guard null/undefined**: All type guards return `false` for null/undefined values
- **Enum validator case sensitivity**: Enum validators are case-sensitive (must match exact enum values)
- **UUID format**: Only UUID v4 format is supported (not v1, v3, v5)

### Common Pitfalls

- **Pitfall**: Using debounced callbacks in dependency arrays without stable references
  - **Solution**: Use `useDebouncedCallback` instead of `debounce` in React components

- **Pitfall**: Forgetting to cancel debounced functions on unmount
  - **Solution**: Always call `debouncedFn.cancel()` in `useEffect` cleanup

- **Pitfall**: Using type guards without null checks
  - **Solution**: Type guards handle null/undefined internally; no additional checks needed

- **Pitfall**: Assuming type guards validate all properties
  - **Solution**: Type guards only validate documented properties; use multiple guards for complex types

---

## Examples

### Example 1: Debounced Search Input

**Input**:

```typescript
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

**Processing**:

```typescript
// User types "atlas"
// setQuery('a') → debouncedQuery unchanged (300ms pending)
// setQuery('at') → debouncedQuery unchanged (300ms pending, previous cancelled)
// setQuery('atl') → debouncedQuery unchanged (300ms pending, previous cancelled)
// setQuery('atla') → debouncedQuery unchanged (300ms pending, previous cancelled)
// setQuery('atlas') → debouncedQuery unchanged (300ms pending, previous cancelled)
// [300ms elapses]
// debouncedQuery updates to 'atlas'
// performSearch('atlas') executes
```

**Output**:

```typescript
// Only 1 search performed instead of 5
```

### Example 2: Type Guard Validation

**Input**:

```typescript
const data: unknown = await fetchUnitFromAPI();
```

**Processing**:

```typescript
// Validate entity properties
if (!isEntity(data)) {
  throw new Error('Invalid unit data: missing id or name');
}
// TypeScript now knows: data is { id: string; name: string }

// Validate tech base properties
if (!isTechBaseEntity(data)) {
  throw new Error('Invalid unit data: missing techBase or rulesLevel');
}
// TypeScript now knows: data is { techBase: TechBase; rulesLevel: RulesLevel }

// Validate temporal properties
if (!isTemporalEntity(data)) {
  throw new Error('Invalid unit data: missing introductionYear');
}
// TypeScript now knows: data is { introductionYear: number; extinctionYear?: number }
```

**Output**:

```typescript
// data is now validated and type-safe
const unit: IUnit = data as IUnit;
```

### Example 3: UUID Generation

**Input**:

```typescript
const newUnit = {
  id: generateUnitId(),
  name: 'Atlas AS7-D',
  // ... other properties
};
```

**Processing**:

```typescript
// generateUnitId() calls uuid.v4()
// Returns: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Output**:

```typescript
const newUnit = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  name: 'Atlas AS7-D',
  // ... other properties
};

// Validate before saving
if (!isValidUnitId(newUnit.id)) {
  throw new Error('Invalid unit ID format');
}
```

---

## References

### Official BattleTech Rules

- N/A (utility patterns are implementation-specific)

### Related Documentation

- **TypeScript Handbook**: Type Guards and Differentiating Types
- **React Hooks**: useEffect, useState, useRef
- **RFC 4122**: UUID Specification
- **uuid library**: https://www.npmjs.com/package/uuid

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Documented debounce utility function
- Documented useDebounce and useDebouncedCallback hooks
- Documented 8 type guard functions
- Documented 3 assertion functions
- Documented 3 enum validators
- Documented UUID generation and validation utilities
