# validation-patterns Specification

## Purpose

TBD - created by archiving change implement-phase1-foundation. Update Purpose after archive.

## Requirements

### Requirement: Type Guard Functions

The system SHALL provide type guard functions for runtime validation.

#### Scenario: Entity type guard

- **WHEN** validating unknown data
- **THEN** isEntity() type guard SHALL check for id and name properties
- **AND** return true only if object matches IEntity shape

#### Scenario: Component type guards

- **WHEN** validating component data
- **THEN** isWeightedComponent() SHALL validate weight property
- **AND** isSlottedComponent() SHALL validate criticalSlots property

### Requirement: Validation Result Pattern

Validation functions SHALL return structured results with severity and messages.

#### Scenario: Validation result structure

- **WHEN** validation is performed
- **THEN** result SHALL include isValid boolean
- **AND** result SHALL include array of errors with severity and message

### Requirement: Boundary Validation

Type guards SHALL only be used at system boundaries.

#### Scenario: API response validation

- **WHEN** receiving data from external source
- **THEN** type guards SHALL validate structure
- **AND** internal code SHALL rely on compile-time types

### Requirement: No Double Type Assertions

The codebase SHALL NOT use double type assertions (`as unknown as T` or `as any as T`).

**Rationale**: Double type assertions completely bypass TypeScript's type system, hiding type incompatibilities that should be resolved through proper type design, type guards, or conversion functions.

**Priority**: High

**Note**: Enforcement mechanism shifted from automated ESLint rule to manual code review and developer education. The `no-restricted-syntax` ESLint rule is not supported by oxlint, so this validation pattern now relies on code review processes rather than automated linting.

#### Scenario: Code review enforcement

- **GIVEN** any TypeScript file in the codebase
- **WHEN** it contains `expression as unknown as Type` or `expression as any as Type`
- **THEN** code reviewers SHALL flag the violation during PR review
- **AND** reviewers SHALL suggest using type guards or conversion functions instead
- **AND** the PR SHALL NOT be approved until the violation is resolved

#### Scenario: Approved alternative - Type guards

- **GIVEN** a need to narrow an unknown type
- **WHEN** the type needs runtime verification
- **THEN** developer SHALL use a type guard function (e.g., `isValidType(value)`)
- **AND** the type guard SHALL perform actual runtime checks

#### Scenario: Approved alternative - Conversion functions

- **GIVEN** a need to transform one type to another
- **WHEN** the types are structurally different
- **THEN** developer SHALL create a conversion function that maps properties explicitly
- **AND** the function SHALL have proper input/output types

#### Scenario: Approved alternative - Partial types for mocks

- **GIVEN** a test file needing to mock an interface
- **WHEN** only some properties are needed for the test
- **THEN** developer SHALL use `Partial<Interface>` with single assertion
- **AND** combine with the concrete type: `as Partial<IService> as ServiceClass`

#### Scenario: Approved alternative - jest.MockedFunction

- **GIVEN** a test file mocking a function
- **WHEN** the function needs type-safe mock setup
- **THEN** developer SHALL use `jest.MockedFunction<typeof originalFn>`
- **AND** avoid casting the mock result

### Requirement: Compile-Time Type Safety

Internal code SHALL rely on compile-time type checking rather than runtime assertions for type safety.

**Rationale**: TypeScript's compiler provides comprehensive type checking. Bypassing it with double casts defeats the purpose of using TypeScript.

**Priority**: High

#### Scenario: Trust internal interfaces

- **GIVEN** data returned from an internal service
- **WHEN** the service has proper return types
- **THEN** consuming code SHALL NOT cast the result
- **AND** any type issues SHALL be resolved in the service's type definitions

#### Scenario: Validate at boundaries only

- **GIVEN** data from external sources (API responses, user input, file reads)
- **WHEN** the data enters the system
- **THEN** type guards SHALL validate the structure once at entry
- **AND** downstream code SHALL trust the validated types

---

## Validation Navigation

### Requirement: Per-Tab Validation Counts

The system SHALL provide derived validation state per tab, enabling UI components to display error/warning badges on tab headers.

**Source**: `src/hooks/useValidationNavigation.ts:40-127`

#### Scenario: Compute error counts by tab

- **GIVEN** a UnitValidationState with multiple validation errors across different categories
- **WHEN** useValidationNavigation hook is called
- **THEN** errorsByTab SHALL contain counts for each CustomizerTabId
- **AND** errors SHALL be grouped by category using CATEGORY_TAB_MAP
- **AND** CRITICAL_ERROR and ERROR severities SHALL increment the errors count
- **AND** WARNING severity SHALL increment the warnings count
- **AND** INFO severity SHALL increment the infos count

#### Scenario: Tab with no errors

- **GIVEN** a tab with no validation errors
- **WHEN** getTabCounts(tabId) is called
- **THEN** it SHALL return `{ errors: 0, warnings: 0, infos: 0 }`

#### Scenario: Check if tab has errors

- **GIVEN** errorsByTab computed from validation state
- **WHEN** hasErrorsOnTab(tabId) is called
- **THEN** it SHALL return true if errors > 0
- **AND** it SHALL return false if errors === 0

### Requirement: Navigate to Error

The system SHALL provide navigation helpers to jump to the tab that can resolve a validation error.

**Source**: `src/hooks/useValidationNavigation.ts:93-102`

#### Scenario: Navigate to error's target tab

- **GIVEN** a validation error with category WEIGHT
- **WHEN** navigateToError(error, onTabChange) is called
- **THEN** it SHALL call onTabChange with 'structure' (per CATEGORY_TAB_MAP)

#### Scenario: Get target tab for error

- **GIVEN** a validation error with category SLOTS
- **WHEN** getTargetTabForError(error) is called
- **THEN** it SHALL return 'criticals'

#### Scenario: Get target tab label

- **GIVEN** a validation error with category ARMOR
- **WHEN** getTargetTabLabel(error) is called
- **THEN** it SHALL return 'Armor'

### Requirement: Category-to-Tab Mapping

The system SHALL map validation categories to customizer tabs using a fixed mapping.

**Source**: `src/utils/validation/validationNavigation.ts:28-38`

**Mapping Rationale**:

- WEIGHT → structure (Structure tab controls tonnage and heavy components)
- SLOTS → criticals (Criticals tab handles slot allocation)
- TECH_BASE → structure (Structure tab sets tech base configuration)
- ERA → structure (Structure tab sets year/era)
- CONSTRUCTION → structure (Structure tab handles core construction rules)
- EQUIPMENT → equipment (Equipment tab manages equipment selection)
- MOVEMENT → structure (Structure tab controls engine/jump jets)
- ARMOR → armor (Armor tab handles armor allocation)
- HEAT → equipment (Equipment tab manages heat sinks and weapons)

#### Scenario: Map category to tab

- **GIVEN** ValidationCategory.WEIGHT
- **WHEN** getTabForCategory(category) is called
- **THEN** it SHALL return 'structure'

#### Scenario: Unknown category fallback

- **GIVEN** an unknown validation category
- **WHEN** getTabForCategory(category) is called
- **THEN** it SHALL return 'structure' as default

---

## Validation Toast Notifications

### Requirement: Toast on New Errors

The system SHALL show toast notifications when new critical or error validation issues appear.

**Source**: `src/hooks/useValidationToast.ts:29-110`

#### Scenario: New critical error appears

- **GIVEN** validation state with 0 critical errors
- **WHEN** validation updates to 1 critical error
- **THEN** a toast SHALL be shown with variant 'error'
- **AND** toast message SHALL be the error's message
- **AND** toast duration SHALL be 6000ms
- **AND** toast action button SHALL be labeled "Go to {TabLabel}"
- **AND** clicking action SHALL call onNavigate(tabId)

#### Scenario: New error appears (non-critical)

- **GIVEN** validation state with 0 errors and 0 critical errors
- **WHEN** validation updates to 1 error (severity ERROR)
- **THEN** a toast SHALL be shown with variant 'warning'
- **AND** toast duration SHALL be 4000ms
- **AND** toast action button SHALL navigate to the error's tab

#### Scenario: Error count increases but critical count unchanged

- **GIVEN** validation state with 1 critical error and 2 errors
- **WHEN** validation updates to 1 critical error and 3 errors
- **THEN** a toast SHALL be shown for the new ERROR (not CRITICAL_ERROR)
- **AND** toast variant SHALL be 'warning'

#### Scenario: Toast disabled

- **GIVEN** useValidationToast called with enabled: false
- **WHEN** validation state updates with new errors
- **THEN** no toast SHALL be shown

#### Scenario: No navigation callback

- **GIVEN** useValidationToast called without onNavigate
- **WHEN** a new error appears
- **THEN** toast SHALL be shown without action button

#### Scenario: Initial validation state

- **GIVEN** useValidationToast hook first renders
- **WHEN** validation state has existing errors
- **THEN** no toast SHALL be shown (initialization only)
- **AND** prevCriticalCountRef SHALL be set to current count
- **AND** prevErrorCountRef SHALL be set to current count

---

## Data Model Requirements

### ValidationCountsByTab

Record mapping each CustomizerTabId to its validation counts.

**Source**: `src/utils/validation/validationNavigation.ts:67-70`

```typescript
type ValidationCountsByTab = Record<CustomizerTabId, TabValidationCounts>;
```

### TabValidationCounts

Validation counts for a single tab.

**Source**: `src/utils/validation/validationNavigation.ts:61-65`

```typescript
interface TabValidationCounts {
  readonly errors: number;
  readonly warnings: number;
  readonly infos: number;
}
```

### CATEGORY_TAB_MAP

Fixed mapping from ValidationCategory to CustomizerTabId.

**Source**: `src/utils/validation/validationNavigation.ts:28-38`

```typescript
const CATEGORY_TAB_MAP: Record<ValidationCategory, CustomizerTabId> = {
  [ValidationCategory.WEIGHT]: 'structure',
  [ValidationCategory.SLOTS]: 'criticals',
  [ValidationCategory.TECH_BASE]: 'structure',
  [ValidationCategory.ERA]: 'structure',
  [ValidationCategory.CONSTRUCTION]: 'structure',
  [ValidationCategory.EQUIPMENT]: 'equipment',
  [ValidationCategory.MOVEMENT]: 'structure',
  [ValidationCategory.ARMOR]: 'armor',
  [ValidationCategory.HEAT]: 'equipment',
};
```

### UseValidationNavigationResult

Return type of useValidationNavigation hook.

**Source**: `src/hooks/useValidationNavigation.ts:27-38`

```typescript
interface UseValidationNavigationResult {
  readonly errorsByTab: ValidationCountsByTab;
  readonly getTabCounts: (tabId: CustomizerTabId) => TabValidationCounts;
  readonly navigateToError: (
    error: IUnitValidationError,
    onTabChange: (tabId: CustomizerTabId) => void,
  ) => void;
  readonly getTargetTabForError: (
    error: IUnitValidationError,
  ) => CustomizerTabId;
  readonly getTargetTabLabel: (error: IUnitValidationError) => string;
  readonly hasErrorsOnTab: (tabId: CustomizerTabId) => boolean;
  readonly hasWarningsOnTab: (tabId: CustomizerTabId) => boolean;
}
```

### UseValidationToastOptions

Options for useValidationToast hook.

**Source**: `src/hooks/useValidationToast.ts:24-27`

```typescript
interface UseValidationToastOptions {
  readonly onNavigate?: (tabId: CustomizerTabId) => void;
  readonly enabled?: boolean;
}
```

---

## Non-Goals

This specification does NOT cover:

- **Validation rule implementation**: See unit-validation-framework spec
- **Toast component implementation**: See toast-notifications spec
- **Tab routing logic**: See customizer-tabs spec
- **Validation state computation**: See unit-validation-framework spec
- **Error message formatting**: Handled by validation rules
- **Accessibility announcements**: Handled by toast component
