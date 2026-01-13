## ADDED Requirements

### Requirement: MTF Format Export

The system SHALL support exporting ISerializedUnit to MegaMekLab .mtf format.

**Rationale**: Enables round-trip validation and compatibility with MegaMek ecosystem for data verification.

**Priority**: High

#### Scenario: MTF export
- **WHEN** exporting to .mtf format
- **THEN** system SHALL generate MegaMekLab-compatible text format
- **AND** system SHALL map canonical equipment IDs to MTF names
- **AND** system SHALL format critical slots per MegaMek conventions
- **AND** system SHALL include all structural component fields

#### Scenario: MTF equipment naming
- **GIVEN** ISerializedUnit with equipment ID "medium-laser"
- **WHEN** exporting to MTF format
- **THEN** equipment SHALL appear as "Medium Laser" in output
- **AND** ammunition SHALL use "IS Ammo" or "Clan Ammo" prefixes as appropriate

#### Scenario: MTF location formatting
- **GIVEN** ISerializedUnit with critical slot assignments
- **WHEN** exporting to MTF format
- **THEN** each location section SHALL list slots in order
- **AND** empty slots SHALL be represented as "-Empty-"
- **AND** location headers SHALL match MegaMek format (e.g., "Left Arm:")
