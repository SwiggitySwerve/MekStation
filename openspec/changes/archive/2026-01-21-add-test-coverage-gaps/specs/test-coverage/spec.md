## ADDED Requirements

### Requirement: Pilot Store Test Coverage

The pilot store SHALL have comprehensive unit test coverage for all public actions and selectors.

#### Scenario: Store CRUD operations tested

- **WHEN** running pilot store tests
- **THEN** tests SHALL cover fetchPilots, createPilot, updatePilot, deletePilot
- **AND** tests SHALL verify success and error paths
- **AND** tests SHALL verify state updates after each operation

#### Scenario: Store selection and filtering tested

- **WHEN** running pilot store tests
- **THEN** tests SHALL cover selectPilot, setStatusFilter, setTypeFilter, setSearchQuery
- **AND** tests SHALL verify getFilteredPilots with combined filters
- **AND** tests SHALL verify filter state persistence

#### Scenario: Store skill actions tested

- **WHEN** running pilot store tests
- **THEN** tests SHALL cover improveGunnery, improvePiloting, purchaseAbility
- **AND** tests SHALL verify XP deduction
- **AND** tests SHALL verify prerequisite validation

---

### Requirement: Validation Framework Test Coverage

The validation framework SHALL have unit test coverage for registry and orchestrator components.

#### Scenario: Registry operations tested

- **WHEN** running validation registry tests
- **THEN** tests SHALL cover registerRule, registerRules, unregisterRule
- **AND** tests SHALL cover getRule, getRulesByCategory, getCategories
- **AND** tests SHALL verify cache invalidation on rule changes

#### Scenario: Orchestrator operations tested

- **WHEN** running validation orchestrator tests
- **THEN** tests SHALL cover validateUnit with passing and failing rules
- **AND** tests SHALL verify rule filtering by unit type
- **AND** tests SHALL verify priority ordering of rules
- **AND** tests SHALL verify validateCategory for isolated validation

---

### Requirement: Aerospace Validation Implementation

The aerospace validation rules specified in unit-validation-framework SHALL be implemented.

#### Scenario: Aerospace rules registered

- **WHEN** initializing unit validation
- **THEN** VAL-AERO-001 through VAL-AERO-004 SHALL be registered
- **AND** rules SHALL apply to Aerospace category units

#### Scenario: Thrust validation enforced

- **WHEN** validating an Aerospace unit with zero or negative thrust
- **THEN** VAL-AERO-002 SHALL produce CRITICAL_ERROR
- **AND** error message SHALL be "Thrust rating must be positive integer"

#### Scenario: Structural integrity validation enforced

- **WHEN** validating an Aerospace unit with zero or negative SI
- **THEN** VAL-AERO-003 SHALL produce ERROR
- **AND** error message SHALL be "Structural integrity must be positive"

#### Scenario: Fuel capacity validation enforced

- **WHEN** validating an Aerospace unit with negative fuel
- **THEN** VAL-AERO-004 SHALL produce ERROR
- **AND** error message SHALL be "Fuel capacity must be non-negative"

---

### Requirement: Unit Card Print Support

The unit card components SHALL support print media with optimized styles.

#### Scenario: Print media styles applied

- **WHEN** printing a unit card via browser print
- **THEN** card layout SHALL render on standard paper size
- **AND** action buttons SHALL be hidden
- **AND** colors SHALL use high contrast for print

#### Scenario: Page breaks handled

- **WHEN** printing multiple unit cards
- **THEN** page breaks SHALL occur between cards
- **AND** cards SHALL not split across pages
