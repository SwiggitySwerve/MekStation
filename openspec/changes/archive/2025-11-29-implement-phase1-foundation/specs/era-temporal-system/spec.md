## ADDED Requirements

### Requirement: Canonical Era Definitions

The system SHALL define all 8 canonical BattleTech eras with year boundaries.

#### Scenario: Era enumeration

- **WHEN** defining historical eras
- **THEN** system SHALL include: AGE_OF_WAR, STAR_LEAGUE, EARLY_SUCCESSION_WARS, LATE_SUCCESSION_WARS, RENAISSANCE, CLAN_INVASION, CIVIL_WAR, JIHAD, DARK_AGE
- **AND** each era SHALL have start and end years

### Requirement: Temporal Availability Tracking

Components SHALL track introduction and extinction years for era filtering.

#### Scenario: Component availability

- **WHEN** a component has temporal properties
- **THEN** introductionYear MUST be provided
- **AND** extinctionYear MAY be provided
- **AND** extinctionYear MUST be >= introductionYear if present

### Requirement: Era Determination

The system SHALL determine era from year value.

#### Scenario: Year to era mapping

- **WHEN** given a year value
- **THEN** system SHALL return the correct Era
- **AND** boundary years SHALL be consistently handled
