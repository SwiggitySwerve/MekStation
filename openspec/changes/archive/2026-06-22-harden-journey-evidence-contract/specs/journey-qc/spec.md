## MODIFIED Requirements

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
