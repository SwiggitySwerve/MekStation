## MODIFIED Requirements

### Requirement: Mech Bay Page

The system SHALL provide a Mech Bay page showing a roster-wide unit-status grid with damage state, repair-ticket count, combat-readiness, and drill-down to each unit's repair detail. Unit metadata SHALL resolve by the roster entry's stable `unitRef` from either the canonical index or saved-custom metadata. A missing or deleted source record SHALL remain visible through cached campaign identity and SHALL NOT be replaced with stock metadata.

#### Scenario: Mech Bay lists every roster unit

- **GIVEN** a campaign roster with several units, some damaged
- **WHEN** the Mech Bay page renders
- **THEN** each roster unit SHALL appear as a row showing its damage state and repair-ticket count
- **AND** each row SHALL provide a drill-down link to that unit's Repair Bay detail

#### Scenario: Saved custom unit resolves after cold reload

- **GIVEN** a campaign roster entry whose `unitRef` is a saved custom-unit API id
- **WHEN** the player cold reloads and opens the Mech Bay
- **THEN** the row SHALL resolve that saved design's name and tonnage from custom metadata
- **AND** Battle Value SHALL be shown when supplied by that source or marked unavailable without borrowing a canonical value
- **AND** the roster-instance `unitId` and source-design `unitRef` SHALL remain unchanged

#### Scenario: Deleted custom source remains honest

- **GIVEN** a campaign roster entry whose saved custom source can no longer be loaded
- **WHEN** the Mech Bay renders
- **THEN** the roster row SHALL remain visible using its cached campaign name
- **AND** source metadata SHALL be marked unavailable
- **AND** no canonical design SHALL be substituted

#### Scenario: Mech Bay empty state

- **GIVEN** a campaign with no roster units
- **WHEN** the Mech Bay page renders
- **THEN** an empty state SHALL be shown rather than an error
