## ADDED Requirements

### Requirement: Referential Integrity

Data references SHALL be validated.

#### Scenario: Component references

- **WHEN** validating unit data
- **THEN** all component references MUST exist in database
- **AND** tech base compatibility MUST be valid
- **AND** era availability MUST be valid

### Requirement: Data Consistency

Data values SHALL be internally consistent.

#### Scenario: Weight consistency

- **WHEN** validating unit data
- **THEN** sum of component weights MUST equal tonnage
- **AND** slot allocations MUST not exceed limits
- **AND** armor values MUST not exceed maximums

### Requirement: Version Compatibility

Data format versions SHALL be handled.

#### Scenario: Version migration

- **WHEN** loading older format data
- **THEN** system SHALL detect version
- **AND** system SHALL apply migrations as needed
- **AND** system SHALL preserve data integrity through migration
