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
The system SHALL provide a single journey runner command that can execute one journey or all journeys with configurable major parameters. The command MUST support journey selection, tier, mode, seed, run count, run ID, evidence directory, dry-run, continue-on-error, and failure severity gate options.

#### Scenario: Run one combat journey
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=combat-1v1 --seed=42 --player-units=1 --opponent-units=1`
- **THEN** the runner executes only the `combat-1v1` journey with the requested seed and unit counts

#### Scenario: Dry run produces a plan without execution
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=campaign-short --contracts=5 --dry-run`
- **THEN** the runner writes a resolved run plan and does not execute journey steps

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
The system SHALL verify that generated journey sequences are carried out, not merely generated. Each journey MUST assert the required terminal state and at least one domain or UI evidence point that proves the sequence completed.

#### Scenario: Combat journey reaches a terminal state
- **WHEN** the `combat-4v4` journey finishes
- **THEN** the result records movement, attack, heat or resolution activity, and a combat terminal state for the generated encounter

#### Scenario: Campaign journey processes contract outcome
- **WHEN** the `contract-campaign` journey finishes
- **THEN** the result records contract selection, combat or outcome resolution, campaign state update, and objective or payment processing evidence

### Requirement: Journey Evidence Bundle
The system SHALL write each run to `.sisyphus/evidence/qc-journeys/<runId>/` by default. The evidence bundle MUST include `run-plan.json`, `result.json`, `system.ndjson`, `bugs.json`, `report.md`, stdout artifacts, stderr artifacts, generated inputs, and any browser or domain artifacts collected by executed steps.

#### Scenario: Evidence bundle is complete after a failed step
- **WHEN** a journey step fails
- **THEN** the evidence bundle still contains the run plan, partial result, structured diagnostics, captured stdout/stderr, and bug candidates for the failure

### Requirement: Bug Candidate Extraction
The system SHALL extract bug candidates from journey failures, structured logs, Playwright or browser errors, invariant violations, missing terminal states, catalog misses, failed persistence, unprocessed campaign outcomes, and fallback warnings. Each bug candidate MUST include severity, journey ID, run ID, step ID when available, fingerprint, summary, evidence references, and affected module.

#### Scenario: Reporter filters medium-or-higher bugs
- **WHEN** the user runs `npm.cmd run qc:journeys:bugs -- --since=latest --min-severity=medium`
- **THEN** the reporter lists only bug candidates from the latest journey evidence whose severity is medium or higher

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
