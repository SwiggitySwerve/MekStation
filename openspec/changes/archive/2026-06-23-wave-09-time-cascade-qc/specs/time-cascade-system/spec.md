## ADDED Requirements

### Requirement: Command-Backed Time Cascade QC Proof

The system SHALL provide a focused command-backed QC validator for GM time-cascade ledger coverage. The validator SHALL prove that the `time` domain and `time-advance` correction family are mapped to the current time-cascade types, implementer, pure preview, projection replay, focused tests, QC registry surface, and OpenSpec requirements.

#### Scenario: Validator proves time-cascade ledger anchors

- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL verify the `time-cascade-gm-ledger` QC registry surface exists under `campaign-economy-progression`
- **AND** it SHALL verify the surface exposes commands for direct validation and focused time-cascade tests
- **AND** it SHALL verify source anchors for time-cascade types, implementer, pure preview, projection replay, and focused tests

#### Scenario: Validator detects stale or missing coverage

- **GIVEN** the time-cascade QC registry surface references a stale active OpenSpec change or a required source anchor is missing
- **WHEN** the time-cascade QC validator runs
- **THEN** validation SHALL fail with a targeted reason naming the missing surface, stale change reference, or missing source-anchor token

#### Scenario: External effect boundary stays explicit

- **WHEN** the time-cascade QC validator runs
- **THEN** it SHALL verify anchors for explicit projected external effects
- **AND** it SHALL verify anchors for manual-takeover conflicts when roster-owned, pilot-recovery, or vault-owned effects are named without projections
