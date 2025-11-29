## ADDED Requirements

### Requirement: Validation Rule Registry
The system SHALL maintain a central registry of all validation rules.

#### Scenario: Rule registration
- **WHEN** registering a validation rule
- **THEN** rule SHALL be added to registry
- **AND** rule SHALL have unique identifier
- **AND** rule SHALL specify category and priority

### Requirement: Weight Validation
The system SHALL validate total and component weights.

#### Scenario: Total weight validation
- **WHEN** validating unit weight
- **THEN** sum of all components MUST equal mech tonnage
- **AND** overweight SHALL produce error
- **AND** underweight SHALL produce warning

### Requirement: Slot Validation
The system SHALL validate critical slot allocation.

#### Scenario: Slot limits
- **WHEN** validating critical slots
- **THEN** total used slots MUST NOT exceed 78
- **AND** per-location limits MUST be respected
- **AND** fixed components MUST be correctly placed

### Requirement: Tech Base Validation
The system SHALL validate tech base compatibility.

#### Scenario: Component compatibility
- **WHEN** validating component tech base
- **THEN** structural components MUST match unit tech base
- **AND** mixed tech units MAY have mixed equipment
- **AND** incompatible combinations SHALL produce error

### Requirement: Era Validation
The system SHALL validate era availability.

#### Scenario: Era restrictions
- **WHEN** validating component availability
- **THEN** introductionYear MUST be <= campaign year
- **AND** extinctionYear (if present) MUST be > campaign year
- **AND** unavailable components SHALL produce error

### Requirement: Validation Orchestration
The system SHALL orchestrate validation execution.

#### Scenario: Validation execution
- **WHEN** running full validation
- **THEN** rules SHALL execute in priority order
- **AND** results SHALL be aggregated
- **AND** all errors and warnings SHALL be reported

