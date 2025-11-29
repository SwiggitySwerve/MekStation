# tech-base-rules-matrix Specification

## Purpose
TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.
## Requirements
### Requirement: Tech Base Restrictions
Component availability SHALL be defined by tech base matrix.

#### Scenario: IS-only components
- **WHEN** component is IS-only
- **THEN** component SHALL not be available for Clan units
- **AND** validation SHALL reject incompatible selection

#### Scenario: Clan-only components
- **WHEN** component is Clan-only
- **THEN** component SHALL not be available for IS units

### Requirement: Matrix Lookup
The system SHALL provide matrix lookup for tech restrictions.

#### Scenario: Compatibility check
- **WHEN** checking component compatibility
- **THEN** lookup tech base matrix
- **AND** return availability status

