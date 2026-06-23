# maintenance-code-health Specification

## Purpose
Defines the maintenance code-health gate, scanner evidence, and reviewed warning ledger used to keep stale TODO, file-bloat, near-duplicate, import-health, and design-violation findings accountable without hiding accepted debt.
## Requirements
### Requirement: Maintenance scan evidence

The system SHALL keep the maintenance code-health surface tied to current scanner evidence for stale TODO, file-bloat, near-duplicate, import-health, and design-violation categories. The evidence MUST distinguish the `src` regression gate from the repo-wide advisory/actionable inventory.

#### Scenario: Source gate remains clean

- **WHEN** `npm.cmd run maintain:scan:gate` runs
- **THEN** it SHALL fail on any `src` critical/high regression above `docs/qc/maintenance-baseline.json`
- **AND** the baseline SHALL NOT be raised to accept new critical/high debt

#### Scenario: Repo-wide inventory remains reviewable

- **WHEN** the maintenance ledger validator runs
- **THEN** it SHALL inspect stale TODO, file-bloat, near-duplicate, import-health, and design-violation findings across the repository
- **AND** it SHALL report category counts for the reviewed inventory

### Requirement: Maintenance warning ledger

The system SHALL store reviewed non-`src` maintenance findings in `docs/qc/maintenance-warning-ledger.json`. Each ledger entry MUST include a stable key, category, severity, scope, status, rationale, and either validation evidence or a follow-up reference. Valid statuses are `fixed`, `accepted`, and `follow-up`.

#### Scenario: Every actionable finding is accounted for

- **WHEN** a live repo-wide scanner finding has severity `medium`, `warn`, `high`, or `critical` in a Wave 12 category
- **THEN** the ledger validator SHALL require a matching ledger entry
- **AND** that entry SHALL be marked `fixed`, `accepted`, or `follow-up`

#### Scenario: Informational source findings stay non-gating

- **WHEN** the live `src` scanner output includes advisory `info` findings for file-bloat or near-duplicate categories
- **THEN** the ledger validator SHALL NOT require every informational source finding to be listed
- **AND** the maintenance docs SHALL continue to identify raw inventory as diagnostic evidence

### Requirement: Maintenance ledger validation command

The system SHALL provide a local validation command for the maintenance warning ledger. The command MUST fail when the ledger is malformed, when an actionable live finding is untracked, when a ledger entry references a missing file, or when an entry uses an invalid status.

#### Scenario: Clean ledger passes

- **WHEN** the user runs `npm.cmd run verify:qc:maintenance`
- **THEN** the command SHALL run the `src` maintenance scan gate
- **AND** it SHALL run the maintenance ledger validator
- **AND** it SHALL exit 0 only when both checks pass

#### Scenario: New untracked finding fails

- **WHEN** the maintenance scanner reports a new actionable Wave 12 finding that has no matching ledger entry
- **THEN** the maintenance ledger validator SHALL exit non-zero
- **AND** the failure output SHALL identify the category and file for the untracked finding

### Requirement: QC registry linkage

The maintenance code-health QC surface SHALL link its OpenSpec requirement, ledger artifact, validation commands, and current caveats through the QC registry, QC map, major capability scenarios, and QC validation graph.

#### Scenario: QC lookup exposes maintenance ledger

- **WHEN** a maintainer queries or validates the QC registry for `maintenance-code-health`
- **THEN** the surface SHALL reference the `maintenance-code-health` spec
- **AND** it SHALL list the maintenance warning ledger and validator command as evidence
