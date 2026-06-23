## ADDED Requirements

### Requirement: Command-backed tactical projection parity manifest
The tactical map interface SHALL provide a fast command-backed parity manifest that proves the tactical map projection proof surface remains wired to shared movement, combat, terrain, elevation, LOS, overlay, and invalid-reason data.

#### Scenario: Tactical parity manifest validates required surfaces
- **WHEN** the operator runs the tactical projection parity validation command
- **THEN** the command SHALL validate the required tactical QC surfaces for map combat, rules explanation, top-down legibility, movement agreement, combat agreement, and isometric mode
- **AND** each surface SHALL expose its expected claim ID and automated command coverage
- **AND** browser-only tactical visual coverage SHALL remain visible as an explicit boundary rather than disappearing from the manifest

#### Scenario: Tactical parity manifest validates source anchors
- **WHEN** the tactical projection parity command validates source anchors
- **THEN** it SHALL confirm shared projection builder, map data attributes, overlay metadata, status badges, movement parity scenarios, combat parity scenarios, interactive attack agreement, and isometric tests are present
- **AND** missing source anchors SHALL fail validation with a targeted reason

#### Scenario: Tactical parity manifest rejects stale active changes
- **WHEN** a required tactical QC surface names an `activeChangeRefs` entry
- **AND** that OpenSpec change directory no longer exists
- **THEN** the tactical projection parity command SHALL fail and identify the stale reference
