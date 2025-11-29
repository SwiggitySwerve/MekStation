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

