## ADDED Requirements

### Requirement: No Double Type Assertions
The codebase SHALL NOT use double type assertions (`as unknown as T` or `as any as T`).

**Rationale**: Double type assertions completely bypass TypeScript's type system, hiding type incompatibilities that should be resolved through proper type design, type guards, or conversion functions.

**Priority**: High

#### Scenario: ESLint enforcement
- **GIVEN** any TypeScript file in the codebase
- **WHEN** it contains `expression as unknown as Type` or `expression as any as Type`
- **THEN** ESLint SHALL emit a warning with message explaining the violation
- **AND** the warning SHALL suggest using type guards or conversion functions instead

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

