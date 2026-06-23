## ADDED Requirements

### Requirement: Command-Backed Time Cascade Preview Proof

The GM cascade preview pipeline SHALL keep a command-backed proof that time-cascade corrections are previewed before commit, preserve public/private projection boundaries, and block automatic approval when manual takeover is required.

#### Scenario: Time preview proof covers public and private projections

- **GIVEN** a GM time-cascade correction for date advancement, travel, repair progression, market refresh, finance upkeep, or external-effect projection
- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL validate anchors proving the preview contains player-visible net effect
- **AND** it SHALL validate anchors proving GM-private reason, default outcome, hidden notes, conflict analysis, and manual takeover notes remain private

#### Scenario: Time preview proof covers blocked approval

- **GIVEN** a time-cascade preview with invalid days, stale base state, unknown destination, or unprojected external effects
- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL validate focused tests proving normal approval appends no intervention record
- **AND** it SHALL validate focused tests proving normal approval appends no action ledger record
