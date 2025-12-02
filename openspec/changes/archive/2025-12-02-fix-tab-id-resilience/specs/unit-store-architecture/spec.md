## MODIFIED Requirements

### Requirement: Store Registry
A registry SHALL manage all active unit store instances.

#### Scenario: Store registration
- **WHEN** a unit store is created
- **THEN** it is added to the registry Map keyed by unit ID

#### Scenario: Store lookup
- **WHEN** a tab becomes active
- **THEN** the registry provides the corresponding store instance

#### Scenario: Store hydration
- **WHEN** application loads with persisted tabs
- **THEN** stores are lazily created from localStorage data as tabs are accessed

#### Scenario: Store hydration with invalid ID
- **WHEN** localStorage contains unit data with missing or invalid UUID
- **THEN** a new valid UUID is generated for the unit
- **AND** a warning is logged indicating ID repair occurred
- **AND** the store is registered with the new valid ID

#### Scenario: Store ID integrity
- **WHEN** a store is created or hydrated
- **THEN** the store ID is validated as a proper UUID format
- **AND** invalid IDs are replaced with generated UUIDs before registration

