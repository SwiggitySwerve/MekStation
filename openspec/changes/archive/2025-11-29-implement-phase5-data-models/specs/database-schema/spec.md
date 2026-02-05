## ADDED Requirements

### Requirement: Equipment Database

The system SHALL maintain equipment database.

#### Scenario: Equipment storage

- **WHEN** storing equipment data
- **THEN** schema SHALL support all equipment properties
- **AND** schema SHALL support filtering and search
- **AND** schema SHALL enforce referential integrity

### Requirement: Unit Templates

The system SHALL support unit template storage.

#### Scenario: Template storage

- **WHEN** storing unit templates
- **THEN** schema SHALL store complete unit configuration
- **AND** schema SHALL support versioning
- **AND** schema SHALL support metadata (source, author)

### Requirement: Query Interface

Database SHALL provide efficient query interface.

#### Scenario: Equipment lookup

- **WHEN** querying equipment
- **THEN** support filtering by type, tech base, era, rules level
- **AND** return complete equipment objects
