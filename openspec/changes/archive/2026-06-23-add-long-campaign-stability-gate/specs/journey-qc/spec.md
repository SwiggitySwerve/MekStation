## ADDED Requirements

### Requirement: Long Campaign Stability Gate
The journey QC system SHALL provide a dedicated long-campaign stability command that executes `campaign-long` with configurable seed, contract count, run count, run ID, and evidence directory. The command MUST enforce the `campaign-long` journey, MUST default to the extended tier and a 10-contract run, and MUST write a `stability-manifest.json` into the same evidence bundle as the journey run.

#### Scenario: Long campaign stability command completes
- **WHEN** the user runs `npm.cmd run qc:campaign-long:stability -- --seed=42 --contracts=10 --runs=2`
- **THEN** the command executes the `campaign-long` journey with the requested parameters
- **AND** the evidence bundle contains `run-plan.json`, `result.json`, `bugs.json`, `system.ndjson`, `report.md`, and `stability-manifest.json`
- **AND** the manifest records pass status when all attempts reach `campaign-sequence-complete`

#### Scenario: Contract count is bounded to the long campaign range
- **WHEN** the user runs the long-campaign stability command with a contract count below 6 or above 10
- **THEN** the command fails before claiming stability
- **AND** the failure message names the supported 6-10 contract range

### Requirement: Stable Campaign Evidence Digest
The long-campaign stability command SHALL compare deterministic campaign evidence across repeated attempts. The comparison MUST normalize volatile fields, including run ID, timestamps, generated IDs, and attempt numbers, before computing digests. Any unexplained digest mismatch MUST fail the command and MUST be recorded as drift in the stability manifest.

#### Scenario: Repeated attempts are stable
- **WHEN** `campaign-long` runs twice with the same seed and parameters
- **THEN** the manifest records a baseline digest and matching attempt digests for generated campaign sequence, campaign result, and campaign economy artifacts
- **AND** the manifest records no drift entries

#### Scenario: Drift becomes a bug candidate
- **WHEN** repeated `campaign-long` attempts produce different normalized digests for the same artifact role
- **THEN** the command fails
- **AND** `bugs.json` includes a medium-or-higher bug candidate naming the artifact role, affected attempts, digest mismatch, and stability manifest evidence reference

### Requirement: Long Campaign Save Round-Trip Evidence
The long-campaign stability command SHALL validate JSON save/load round trips for the run plan, result, and required campaign artifacts. Each round trip MUST parse the evidence file, serialize and parse it again, and compare canonical normalized digests. Round-trip mismatch or unreadable JSON MUST fail the command and MUST be recorded in the stability manifest.

#### Scenario: Required artifacts survive round trip
- **WHEN** the long-campaign stability command completes successfully
- **THEN** the stability manifest records passing round-trip checks for `run-plan.json`, `result.json`, `generated/campaign-sequence.json`, `artifacts/campaign-result.json`, and `artifacts/campaign-economy.json`

#### Scenario: Broken artifact save is reported
- **WHEN** a required long-campaign artifact cannot be parsed or does not match after canonical round trip
- **THEN** the command fails
- **AND** the stability manifest and `bugs.json` identify the broken artifact path and failure cause

### Requirement: Long Campaign Stability Logging
The long-campaign stability command SHALL write structured diagnostic logs for stability completion, detected drift, save round-trip failures, and UI flow linkage failures. Stability failure logs MUST be queryable through the existing journey log search command and MUST include a triage packet when converted into a bug candidate.

#### Scenario: Stability logs are searchable
- **WHEN** the long-campaign stability command detects drift
- **THEN** `system.ndjson` includes a `campaign.stability_drift_detected` entry
- **AND** `npm.cmd run qc:logs -- --event=campaign.stability_drift_detected` can return the entry from the latest evidence bundle

#### Scenario: Successful stability writes completion log
- **WHEN** the long-campaign stability command completes without drift or save round-trip failures
- **THEN** `system.ndjson` includes a non-blocking `campaign.stability_checked` entry that records the compared artifact roles and run count
