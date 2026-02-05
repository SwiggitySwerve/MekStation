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
