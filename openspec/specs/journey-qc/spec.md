# journey-qc Specification

## Purpose
Defines repeatable journey-level QC for major MekStation user flows, including scenario catalogs, configurable run commands, evidence bundles, bug extraction, log search, validation graph lookup, and explicit known-gap accounting.
## Requirements
### Requirement: Required Journey Scenario Catalog
The system SHALL define a versioned journey scenario catalog for the required player journeys: `character-build`, `mek-build`, `combat-1v1`, `combat-4v4`, `contract-campaign`, `campaign-short`, and `campaign-long`. Each scenario entry MUST declare its supported tiers, execution mode, configurable parameters, required steps, expected terminal state, evidence assertions, and explicit known limitation references when applicable.

#### Scenario: Catalog contains all required journeys
- **WHEN** the journey catalog validator runs
- **THEN** it confirms that all seven required journey IDs are present exactly once

#### Scenario: Catalog exposes BattleMech construction parameters
- **WHEN** the `mek-build` journey is validated
- **THEN** the scenario exposes era, unitTechBase, chassis, variant, weight class, and equipment-selection parameters needed to generate a repeatable BattleMech construction flow

### Requirement: Configurable Journey Command Surface
The system SHALL provide a single journey runner command that can execute one journey or all journeys with configurable major parameters. The command MUST support journey selection, tier, mode, seed, run count, run ID, evidence directory, dry-run, continue-on-error, failure severity gate options, and an opt-in gate that requires non-synthetic execution backing.

#### Scenario: Run one combat journey
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=combat-1v1 --seed=42 --player-units=1 --opponent-units=1`
- **THEN** the runner executes only the `combat-1v1` journey with the requested seed and unit counts

#### Scenario: Dry run produces a plan without execution
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=campaign-short --contracts=5 --dry-run`
- **THEN** the runner writes a resolved run plan and does not execute journey steps

#### Scenario: Strict backing gate rejects synthetic-only journey evidence
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=combat-1v1 --require-domain-backed`
- **THEN** the runner fails any required step that only has synthetic/catalog-backed execution evidence
- **AND** the evidence bundle records the missing non-synthetic backing as bug and log evidence

### Requirement: QC Validation Graph
The system SHALL define a versioned QC validation graph that maps top-level capabilities, main modules, submodules, journey scenarios, validation commands, evidence artifacts, structured diagnostic events, and known gaps. The graph MUST support on-demand lookup of which commands validate a given capability, module, submodule, or journey.

#### Scenario: Graph maps combat journey coverage
- **WHEN** the validation graph is queried for the combat module
- **THEN** it identifies the `combat-1v1` and `combat-4v4` journeys, their runnable commands, produced evidence artifacts, and related structured diagnostic events

#### Scenario: Graph validator rejects orphaned journey
- **WHEN** the validation graph references a journey ID that is not present in the journey scenario catalog
- **THEN** the graph validator fails and names the orphaned journey ID

### Requirement: QC Graph Query Command
The system SHALL provide a local command that queries the QC validation graph by capability, module, submodule, journey, command, or known gap. Query output MUST include matched graph nodes, related validation commands, evidence artifacts, logging events, and gap references.

#### Scenario: Query Mek build validation
- **WHEN** the user queries the QC validation graph for `mek-build`
- **THEN** the command returns the Mek build journey, related construction modules, runnable validation command, produced evidence, and logging events

### Requirement: Deterministic Run Plan Materialization
The system SHALL materialize a run plan before executing journey steps. The run plan MUST include run ID, timestamp, selected journeys, tier, mode, seed, run count, evidence directory, resolved parameters, step list, and expected terminal states. Re-running with the same catalog version, seed, and parameters MUST produce equivalent generated inputs.

#### Scenario: Repeatable campaign input generation
- **WHEN** the user runs the `campaign-short` journey twice with the same seed and parameter set
- **THEN** generated contract order, selected opposing forces, and expected terminal state inputs are equivalent across both run plans

### Requirement: Journey Execution Proves Generated Sequences
The system SHALL verify that generated journey sequences are carried out, not merely generated. Each journey MUST assert the required terminal state and at least one domain or UI evidence point that proves the sequence completed. Each executed step MUST also record its execution backing, whether that backing is synthetic, and the backing evidence source so callers can distinguish catalog-shaped projections from domain-backed or UI-backed execution.

#### Scenario: Combat journey reaches a terminal state
- **WHEN** the `combat-4v4` journey finishes
- **THEN** the result records movement, attack, heat or resolution activity, and a combat terminal state for the generated encounter

#### Scenario: Campaign journey processes contract outcome
- **WHEN** the `contract-campaign` journey finishes
- **THEN** the result records contract selection, combat or outcome resolution, campaign state update, and objective or payment processing evidence

#### Scenario: Step result exposes execution backing
- **WHEN** a journey step writes evidence from a synthetic projection
- **THEN** the step result, structured diagnostic metadata, and generated artifact record `executionBacking` and `syntheticBacking`
- **AND** the run report summarizes synthetic-backed step counts

### Requirement: Journey Evidence Bundle
The system SHALL write each run to `.sisyphus/evidence/qc-journeys/<runId>/` by default. The evidence bundle MUST include `run-plan.json`, `result.json`, `system.ndjson`, `bugs.json`, `report.md`, stdout artifacts, stderr artifacts, generated inputs, and any browser or domain artifacts collected by executed steps. The evidence bundle MUST preserve execution backing metadata for every executed step so downstream bug triage can tell whether evidence came from a synthetic projection, a domain adapter, a browser adapter, or a hybrid adapter.

#### Scenario: Evidence bundle is complete after a failed step
- **WHEN** a journey step fails
- **THEN** the evidence bundle still contains the run plan, partial result, structured diagnostics, captured stdout/stderr, and bug candidates for the failure

#### Scenario: Evidence bundle preserves backing metadata
- **WHEN** a journey run completes
- **THEN** `result.json`, `system.ndjson`, and step artifacts expose the execution backing used for each executed step

### Requirement: Bug Candidate Extraction
The system SHALL extract bug candidates from journey failures, structured logs, Playwright or browser errors, invariant violations, missing terminal states, catalog misses, failed persistence, unprocessed campaign outcomes, fallback warnings, and missing required non-synthetic execution backing. Each bug candidate MUST include severity, journey ID, run ID, step ID when available, fingerprint, summary, evidence references, and affected module.

#### Scenario: Reporter filters medium-or-higher bugs
- **WHEN** the user runs `npm.cmd run qc:journeys:bugs -- --since=latest --min-severity=medium`
- **THEN** the reporter lists only bug candidates from the latest journey evidence whose severity is medium or higher

#### Scenario: Missing required backing becomes a bug
- **WHEN** a strict backing-required run encounters a synthetic-only required step
- **THEN** the bug reporter lists a missing non-synthetic backing candidate for that journey step

### Requirement: Structured Log Search
The system SHALL provide a local log-search command for journey evidence. The command MUST filter structured diagnostic logs by run ID, journey ID, step ID, level, service, event, fingerprint, and time window.

#### Scenario: Search warnings for latest run
- **WHEN** the user runs `npm.cmd run qc:logs -- --run-id=latest --level=warn,error`
- **THEN** the command returns warning and error diagnostic entries from the latest journey evidence

### Requirement: Known Gap Accounting
The system SHALL report unsupported mechanics, non-BattleMech exclusions, or implementation limitations as explicit gaps in journey results. Known gaps MUST NOT suppress failures unless the catalog marks the exact assertion as non-gating and links the gap reference.

#### Scenario: Unsupported mechanic remains visible
- **WHEN** a journey touches an unsupported combat mechanic
- **THEN** the run result records the unsupported mechanic as a gap and preserves any unrelated failed assertions as failures

### Requirement: Bug Triage Packets
The system SHALL include a triage packet on each journey bug candidate. The packet MUST include actor, action, stateBefore, stateAfter, ruleDecision, validationResult, warnings, failureCause, logFingerprints, and nextDebuggingHint fields when the source evidence provides them. The packet MUST use compact summaries and artifact references rather than unbounded domain object dumps.

#### Scenario: Failed journey step produces actionable bug packet
- **WHEN** a journey step fails during `qc:journeys`
- **THEN** `bugs.json` records the failing actor, action, state before/after summary, validation result, failure cause, related log fingerprint, and next debugging hint for that bug
- **AND** the text bug reporter displays the failure cause, action, validation result, and log fingerprint without requiring manual inspection of `system.ndjson`

#### Scenario: Bug reporter remains compatible with older evidence
- **WHEN** the bug reporter reads a bug candidate that does not contain a triage packet
- **THEN** it still lists the bug using the existing summary, fingerprint, and evidence references

### Requirement: Journey UI flow mapping validation
The journey QC validator SHALL verify that every required journey ID is represented by the gameplay UI flow registry and that every UI flow journey ID exists in the journey catalog and validation graph.

#### Scenario: Required journey lacks UI flow
- **WHEN** `npm.cmd run qc:journeys:validate` runs and a required journey ID is missing from the UI flow registry
- **THEN** validation fails and names the missing journey ID

#### Scenario: UI flow references unknown journey
- **WHEN** the UI flow registry references a journey ID that is not present in the journey scenario catalog
- **THEN** validation fails and names the unknown journey ID

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

### Requirement: Catalog-valid journey parameter overrides
The journey runner SHALL validate every provided parameter override against the selected journey catalog definition before writing execution evidence. Validation MUST reject malformed integer, boolean, enum, and string-list values; MUST enforce declared numeric minimum and maximum bounds; and MUST name the journey ID, parameter name, offending value, and expected constraint in the failure message.

#### Scenario: Invalid integer override is rejected
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=campaign-short --contracts=abc`
- **THEN** the command fails before claiming journey execution
- **AND** the failure message names `campaign-short`, `contracts`, `abc`, and the integer requirement

#### Scenario: Out-of-range integer override is rejected
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=campaign-short --contracts=1`
- **THEN** the command fails before claiming journey execution
- **AND** the failure message names `campaign-short`, `contracts`, `1`, and the minimum allowed value

#### Scenario: Invalid enum override is rejected
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=mek-build --unitTechBase=NOT_REAL`
- **THEN** the command fails before claiming journey execution
- **AND** the failure message names `mek-build`, `unitTechBase`, `NOT_REAL`, and the allowed enum values

#### Scenario: Unknown override is rejected
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=mek-build --unitTechBaseTypo=CLAN`
- **THEN** the command fails before claiming journey execution
- **AND** the failure message names `unitTechBaseTypo` as an unknown journey parameter for `mek-build`

#### Scenario: Valid overrides remain evidence inputs
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=mek-build --era=3050 --unitTechBase=CLAN --weight-class=Heavy`
- **THEN** the command succeeds
- **AND** the resolved run plan and generated artifacts record `era` as integer `3050`, `unitTechBase` as `CLAN`, and `weight-class` as `Heavy`
