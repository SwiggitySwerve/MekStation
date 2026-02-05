## ADDED Requirements

### Requirement: Save Format

The system SHALL define JSON save format.

#### Scenario: Save structure

- **WHEN** saving unit to file
- **THEN** format SHALL be valid JSON
- **AND** format SHALL include version identifier
- **AND** format SHALL include complete unit data

### Requirement: Load Validation

Loading SHALL validate data integrity.

#### Scenario: Load validation

- **WHEN** loading unit from file
- **THEN** system SHALL validate JSON structure
- **AND** system SHALL validate data consistency
- **AND** system SHALL handle version migrations

### Requirement: Import/Export

The system SHALL support external format import/export.

#### Scenario: MegaMekLab format

- **WHEN** importing .mtf file
- **THEN** system SHALL parse MegaMekLab format
- **AND** system SHALL convert to internal format
- **AND** system SHALL validate converted data
