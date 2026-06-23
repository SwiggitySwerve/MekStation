## ADDED Requirements

### Requirement: Wave 9 Time Cascade Ledger QC Proof

The intervention ledger abstraction SHALL provide a focused QC validator for Wave 9 time-cascade GM ledger coverage. The validator MUST prove that time-cascade interventions preview, approve, replay, redact, and append through the shared intervention/action ledger contract without mutating campaign state before approval.

#### Scenario: Focused validator covers time domain

- **WHEN** the Wave 9 time-cascade QC validator runs
- **THEN** it SHALL verify registered support for the `time` intervention domain
- **AND** it SHALL verify registered support for the `time-advance` correction family

#### Scenario: Approval proof appends and replays deterministically

- **GIVEN** a ready time-cascade preview
- **WHEN** the validator inspects focused ledger tests
- **THEN** it SHALL verify the intervention ledger appends an approved time-cascade record
- **AND** it SHALL verify the shared action ledger appends a GM intervention action after prior normal actions
- **AND** it SHALL verify replaying stored projected effects derives the same campaign state shown in the preview

#### Scenario: Manual or blocked time preview appends nothing

- **GIVEN** a time-cascade preview that is blocked, stale, unsupported, or requires manual takeover
- **WHEN** the validator inspects focused ledger tests
- **THEN** it SHALL verify approval is blocked
- **AND** it SHALL verify no intervention ledger record or action ledger record is appended
