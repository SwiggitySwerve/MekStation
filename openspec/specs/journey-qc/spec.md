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

### Requirement: Deduplicated journey bug packets
The journey QC runner SHALL collapse duplicate bug candidates that describe the same failed journey step and failure cause before writing `bugs.json`, `report.md`, or the bug-extraction diagnostic. Deduplication MUST preserve the highest severity candidate, all unique evidence references, all unique log fingerprints, and the most complete triage packet.

#### Scenario: Failed step produces one canonical bug
- **WHEN** a required `combat-1v1` step fails and the matching error diagnostic also contains triage metadata
- **THEN** `bugs.json` contains one bug candidate for that journey step and failure cause
- **AND** the bug candidate keeps the step failure summary, high severity, related `system.ndjson` fingerprint, and triage packet

#### Scenario: Log-only bug remains reportable
- **WHEN** an error diagnostic has no matching failed step result
- **THEN** the runner keeps a log-derived bug candidate with its log fingerprint and triage metadata when present

### Requirement: Readable journey bug reporter triage
The journey bug reporter SHALL display compact triage context for every bug candidate that includes a triage packet. The reporter output MUST include actor, action, state before summary, state after summary, rule decision, validation result, warning list when present, failure cause when present, next debugging hint when present, and log fingerprints when present.

#### Scenario: Reporter shows failure context without raw log inspection
- **WHEN** the user runs `npm.cmd run qc:journeys:bugs -- --since=latest --min-severity=medium` after an injected combat journey failure
- **THEN** the reporter shows the actor, action, state before summary, state after summary, rule decision, validation status, failure cause, next debugging hint, and log fingerprint for the canonical bug
- **AND** the user does not need to open `system.ndjson` to identify the failed step context

### Requirement: Long Campaign QC Protection Gate
The journey QC system SHALL protect the long-campaign stability lane with a dedicated metadata validator and global verification wiring. The validator MUST confirm that `verify:qc` runs `verify:qc:campaign-long`, that `verify:qc:campaign-long` runs both the metadata validator and the 10-contract, 2-run stability command, that the QC registry exposes a first-class `long-campaign-stability` surface with claim `campaign.long-stability`, that `campaign-long` catalog bounds are 6-10 contracts, that the gameplay UI flow points at the stability command, that validation graph nodes expose the stability and verification commands, and that stale OpenSpec active refs fail validation.

#### Scenario: Global QC includes long-campaign stability
- **WHEN** the operator runs `npm.cmd run verify:qc`
- **THEN** the global QC command runs `npm.cmd run verify:qc:campaign-long`
- **AND** `verify:qc:campaign-long` validates long-campaign metadata before running `qc:campaign-long:stability -- --seed=42 --contracts=10 --runs=2`

#### Scenario: Metadata validator catches orphaned coverage
- **WHEN** `npm.cmd run qc:campaign-long:validate` runs
- **THEN** it fails if the long-campaign registry surface, package script wiring, journey catalog bounds, UI flow command, validation graph nodes, source anchors, or active OpenSpec refs drift away from the long-campaign stability contract

#### Scenario: Catalog contract matches stability command
- **WHEN** the journey catalog is validated for `campaign-long`
- **THEN** the `contracts` parameter declares an integer minimum of 6 and maximum of 10
- **AND** the stability command still rejects values outside that range before claiming stability

### Requirement: Playable command screen E2E journeys
Journey QC SHALL include automated E2E journeys for combat command, campaign starmap logistics, mission readiness roster handoff, Mek stable to customizer return, GM intervention redaction, and campaign persistence reload. The mission-readiness roster handoff journey SHALL verify the deployment-validation surface up to and including the enabled launch control; the verification that encounter materialization actually receives the selected campaign roster SHALL be delivered by the roster materialization handoff trust anchor journey (see "Roster Materialization Handoff Trust Anchor Journey"), which crosses the launch boundary that the readiness/customizer journey stops at.

#### Scenario: Combat command journey validates preview and commit
- **WHEN** the combat command E2E journey runs
- **THEN** it SHALL select a unit, preview movement or attack, assert legal/illegal reasons, commit an action, and verify the committed state/log matches the preview

#### Scenario: Campaign logistics journey validates reload truth
- **WHEN** the campaign logistics E2E journey runs
- **THEN** it SHALL preview travel, commit travel, reload the campaign, and assert persisted location, date, finance, activity, and downstream state match the committed preview

#### Scenario: Readiness and customizer journey validates deployment handoff
- **WHEN** the readiness/customizer E2E journey runs
- **THEN** it SHALL select a mission roster, follow a blocker to stable or customizer, return to readiness, refresh validation, and verify the launch control becomes enabled for the selected campaign roster
- **AND** the verification that encounter materialization receives that selected roster SHALL be delivered by the roster materialization handoff trust anchor journey, which continues through the launch click this journey stops before

#### Scenario: GM redaction journey validates player and GM views
- **WHEN** the GM redaction E2E journey runs
- **THEN** it SHALL commit a GM intervention, assert the GM view shows private rationale and full diff, assert the player view shows only public net effect, and repeat after reload

### Requirement: Capture-Tolerant Walkthrough Steps

The UX walkthrough recorder SHALL provide a capture-tolerant step mode that records a step's screenshot, route, timing, and console/page errors even when the step's action or assertion fails, and MUST NOT rethrow the failure. A journey MUST be able to continue to subsequent steps after a capture-tolerant step records a failure, so a single broken screen does not abort the catalog of every screen after it. A capture-tolerant step that fails MUST mark its status as failed in the journey record so the failure remains visible in the run manifest and review artifacts.

#### Scenario: Soft step records failure and continues

- **GIVEN** a deep-play journey with a capture-tolerant step whose action throws
- **WHEN** the recorder executes that step
- **THEN** the step record SHALL capture a failure screenshot when one is obtainable, the failure message, and any console or page errors
- **AND** the recorder SHALL NOT rethrow, and the journey SHALL proceed to the next step

#### Scenario: Strict step still fails the journey

- **GIVEN** a journey step invoked in the existing strict (non-tolerant) mode whose action throws
- **WHEN** the recorder executes that step
- **THEN** the recorder SHALL record the failure evidence and SHALL rethrow so the strict step still fails the journey as before

### Requirement: Structured Journey Findings

The UX walkthrough recorder SHALL let a journey record structured findings, each with a stable finding id, a severity, a summary, and references to the step indices whose screenshots evidence the finding. Recorded findings MUST be written into the journey record and MUST be aggregated into the run manifest so a reviewer can map an observed blocker to the exact captured screenshots without reading the journey source.

#### Scenario: Finding maps a blocker to its evidence

- **WHEN** a deep-play journey observes a current blocker and records a finding referencing the steps that captured it
- **THEN** the journey record SHALL contain the finding with its id, severity, summary, and evidence step references
- **AND** the run manifest SHALL include that finding in an aggregated findings total

#### Scenario: A clean journey records no findings

- **WHEN** a deep-play journey completes without recording any finding
- **THEN** the journey record SHALL contain an empty findings collection
- **AND** the run manifest findings total for that journey SHALL be zero

### Requirement: Multi-Surface Journey Capture

The UX walkthrough recorder SHALL support capturing more than one browser page within a single journey record. The recorder MUST allow a journey to register additional named surfaces (for example a host client and a guest client), MUST buffer console and page errors per surface, and MUST let a step act on and screenshot a chosen surface. A multi-surface journey MUST produce one interleaved journey record whose step screenshots identify which surface each step captured.

#### Scenario: Two-client journey records both surfaces in one journey

- **GIVEN** a co-op journey with a registered host surface and guest surface
- **WHEN** the journey records host steps and guest steps
- **THEN** the single journey record SHALL contain the interleaved steps
- **AND** each step SHALL identify the surface it captured, and per-surface console/page errors SHALL attach to the steps taken on that surface

### Requirement: Per-Run REVIEW.md Skeleton

The UX walkthrough runner SHALL write a `REVIEW.md` skeleton into each per-run evidence directory alongside `manifest.json` and `index.html`. The skeleton MUST list every journey, its status, its steps, and its recorded findings, and MUST provide review placeholders for a human to complete. The skeleton MUST be generated after the journeys run so it reflects the run that just executed, including partial results when a journey did not finish cleanly.

#### Scenario: REVIEW.md skeleton reflects the run

- **WHEN** `npm run qc:ux-audit` completes a run
- **THEN** the per-run directory SHALL contain `REVIEW.md` listing each journey with its status, steps, and recorded findings
- **AND** each recorded finding SHALL appear in the skeleton with its id, severity, summary, and the screenshots that evidence it

#### Scenario: Skeleton is written even when a journey did not finish cleanly

- **WHEN** a deep-play journey records failures through capture-tolerant steps
- **THEN** the run SHALL still write `REVIEW.md` capturing that journey's partial steps and findings

### Requirement: Single-Player Campaign Deep-Play Journey

Journey QC SHALL include a capture-tolerant single-player campaign deep-play journey in the UX walkthrough audit. The journey SHALL create a campaign through the wizard, accept a contract, launch a mission, attempt manual battle control, walk the auto-resolve path, and sweep the campaign surfaces (missions, dashboard, finances, personnel, forces, mech bay, starmap) ending at Advance Day and a ledger check. The journey MUST record the current battle-handoff and manual-play blockers as findings and MUST NOT hard-assert outcomes that are currently broken.

#### Scenario: SP deep-play journey captures the manual-play attempt

- **WHEN** the single-player campaign deep-play journey reaches the battle surface and attempts unit selection and movement
- **THEN** the journey SHALL capture whatever state results, record a finding for any Initiative soft-lock or unhandled error it encounters, and continue to the auto-resolve path
- **AND** the journey SHALL NOT fail the run when the manual-play control is absent or errors

#### Scenario: SP deep-play journey sweeps campaign surfaces

- **WHEN** the single-player campaign deep-play journey runs after the mission attempt
- **THEN** the journey SHALL capture the missions, dashboard, finances, personnel, forces, mech bay, and starmap surfaces, and the Advance Day and ledger result
- **AND** a surface that crashes or errors SHALL be recorded as a finding rather than aborting the remaining sweep

### Requirement: Two-Client Multiplayer Deep-Play Journey

Journey QC SHALL include a capture-tolerant two-client deep-play journey in the UX walkthrough audit that uses two browser contexts as separate clients. The journey SHALL provision two vault identities, drive a co-op campaign create-and-join flow and the `/multiplayer` 1v1 create-and-join lobby flow, and capture the join outcome and lobby state on both clients. The journey MUST record the connection or handshake outcome as a finding and MUST NOT hard-assert a successful networked session, so it captures either the connected flow or a current failure. The guest read-only ledger observation MUST be hydration-aware: it SHALL wait for the guest player-only ledger view to become visible before reading each redaction sub-fact, and its reload-survival sub-fact SHALL distinguish a slow post-reload mount from a genuine guest-to-GM authority flip by also asserting the GM control-plane surface is absent — so a pre-hydration loading shell is never recorded as a redaction leak.

#### Scenario: Co-op journey captures host and guest join outcome

- **WHEN** the two-client journey creates a co-op campaign on the host client and joins with the room code on the guest client
- **THEN** the journey SHALL capture the host room code and the guest join outcome on both surfaces
- **AND** the journey SHALL record a finding describing the resulting connection state instead of failing the run

#### Scenario: Connected guest sees a read-only GM ledger

- **GIVEN** the two-client co-op journey where the guest client successfully joined the shared campaign
- **WHEN** the guest navigates directly to the campaign GM ledger route (`/gameplay/campaigns/<id>/gm-ledger`)
- **THEN** the journey SHALL capture the guest's ledger view and record a finding for whether it is read-only: public summaries present, no approve or preview controls, no GM-private fields
- **AND** before reading each redaction sub-fact the journey SHALL wait for the guest player-only ledger view to become visible within a bounded wait, so a pre-hydration loading shell (which stamps the same `page-title`) is not mistaken for an authority regression
- **AND** the reload-survival sub-fact SHALL be a conjunction of (a) the guest player-only view reappearing after reload within a bounded wait AND (b) the GM control-plane surface being ABSENT after reload, so a slow guest mount is distinguished from a real guest-to-GM authority flip
- **AND** this guest-ledger check SHALL be guarded on join success and SHALL be skipped (not failed) when the guest did not connect

#### Scenario: 1v1 lobby journey captures both clients

- **WHEN** the two-client journey mints a token and creates a `/multiplayer` match on the host and joins it on the guest
- **THEN** the journey SHALL capture the lobby state on both clients
- **AND** the journey SHALL record a finding when either client does not reach an occupied-seat lobby state

### Requirement: GM Surfaces Deep-Play Journey

Journey QC SHALL include a capture-tolerant GM surfaces deep-play journey in the UX walkthrough audit. The journey SHALL exercise the campaign GM ledger (generate a correction, approve the cascade, and capture the Player Action Log versus GM Ledger redaction split, including a conflict variant that blocks approval, and including a time-cascade correction whose preview is captured expanded to show the per-projected-day ordered summaries) and the `?gm=1` battle GM dock (Advance Phase preview, approve, and capture whether the engine phase actually changes). The journey SHALL record the engine phase before and after a GM tactical approval, SHALL document that GM mode is entered by the `?gm=1` / `?mode=gm` query param (no UI toggle exists), MUST record whether each GM intervention commits to engine or campaign state as a finding, and MUST NOT hard-assert commit behavior that is currently display-only.

#### Scenario: GM ledger journey captures the redaction split

- **WHEN** the GM surfaces journey generates a ledger correction and approves the cascade
- **THEN** the journey SHALL capture the approved result and the Player Action Log versus GM Ledger redaction split
- **AND** the conflict variant SHALL capture the blocked-approval state as evidence

#### Scenario: Time-cascade preview captures per-day summaries

- **WHEN** the GM surfaces journey generates a time-advance correction
- **THEN** the journey SHALL capture the correction preview expanded so the per-projected-day ordered summaries (one summary per projected day plus changed-state references) are visible in the screenshot

#### Scenario: GM battle dock journey records engine phase before and after

- **WHEN** the GM surfaces journey opens the battle with the `?gm=1` param, records the engine phase, previews Advance Phase, and approves it
- **THEN** the journey SHALL capture the surface state and record the engine phase before and after approval
- **AND** the journey SHALL record a finding stating whether the engine phase actually changed versus only the turn-rail display, and SHALL document the query-param entry it used
- **AND** the journey SHALL NOT fail the run when the GM intervention is display-only

### Requirement: Deep-Play Journey Selection

The UX walkthrough audit SHALL keep `qc:ux-audit` as the umbrella command that runs both the shell journeys and the deep-play journeys, and SHALL provide a way to run only the deep-play journeys and to select a single journey. The umbrella command MUST continue to produce one aggregated per-run catalog covering every journey it ran.

#### Scenario: Umbrella runs shell and deep-play journeys

- **WHEN** the user runs `npm run qc:ux-audit`
- **THEN** the run SHALL execute both the shell walkthrough journeys and the deep-play journeys
- **AND** the aggregated manifest and REVIEW.md SHALL cover every journey that ran

#### Scenario: Deep-play journeys run in isolation

- **WHEN** the user runs the deep-play-only command
- **THEN** the run SHALL execute only the deep-play journeys and still write a complete per-run catalog and REVIEW.md

### Requirement: Deep-Play Review Evidence Persistence

The UX walkthrough audit SHALL persist its review-grade text artifacts to version control while excluding its screenshot, video, and rendered-HTML artifacts. Specifically, the per-run `REVIEW.md`, `manifest.json`, and `journeys/*.json` for the `ux-walkthrough` evidence tree, and the `*.md` and `*.json` artifacts for the `playtest` evidence tree, SHALL be committable, while per-journey screenshot directories, videos, and `index.html` SHALL remain ignored. Because git cannot re-include a file whose parent directory is excluded, the ignore policy SHALL both (a) provide a negation ladder that re-includes only the text artifacts and (b) ensure no ancestor catch-all pattern excludes the `.sisyphus` directory itself, and SHALL carry a comment explaining the parent-directory-exclusion rule so the policy is not later collapsed back into a directory-level ignore.

#### Scenario: Review text is committable and screenshots are ignored

- **GIVEN** a completed `qc:ux-audit` run under `.sisyphus/evidence/ux-walkthrough/<runId>/`
- **WHEN** the repository ignore rules are evaluated for that run directory
- **THEN** `REVIEW.md`, `manifest.json`, and files under `journeys/` SHALL NOT be ignored
- **AND** the per-journey screenshot directories, video artifacts, and `index.html` SHALL remain ignored
- **AND** `git status` SHALL list only the review-text artifacts as untracked additions for that run

#### Scenario: Playtest evidence text is committable

- **GIVEN** a playtest evidence directory under `.sisyphus/evidence/playtest/<name>/`
- **WHEN** the repository ignore rules are evaluated
- **THEN** the `*.md` and `*.json` review artifacts SHALL NOT be ignored
- **AND** the screenshots under that directory SHALL remain ignored

#### Scenario: Ignore policy documents the parent-directory rule

- **WHEN** a reader inspects the `.sisyphus` ignore rules
- **THEN** a comment SHALL explain that git cannot re-include a file under an excluded parent directory
- **AND** the policy SHALL keep both the negation ladder and the non-directory-matching catch-all so a future edit does not silently re-hide the review text

### Requirement: Flow-Scoped Walkthrough Invocation
The walkthrough evidence machinery (step recorder, per-run catalog, manifest, index.html contact sheet, REVIEW skeleton) SHALL be invocable for a single named flow with checkpoint granularity via the flow-audit runner, in addition to the all-journeys `qc:ux-audit` umbrella. A flow-scoped run SHALL produce the same per-run catalog contract as the umbrella run, scoped to the selected flow, so downstream review tooling works unchanged.

#### Scenario: Single-flow run produces a standard catalog
- **WHEN** an agent invokes the flow-audit runner for one named flow
- **THEN** the per-run output directory contains the same manifest, per-checkpoint JSON, screenshot, and index.html structures the umbrella `qc:ux-audit` run produces, restricted to that flow

#### Scenario: Umbrella run remains intact
- **WHEN** `qc:ux-audit` is invoked without flow selection
- **THEN** all registered walkthrough journeys still run and aggregate into one catalog, unchanged by the existence of flow-scoped invocation

### Requirement: Interactive Evidence and CI Authority Split
The journey-qc documentation and harness output SHALL state the authority split explicitly: interactive walkthrough and flow-audit catalogs are review evidence for humans and agents, and are never PR-blocking CI gates; assertion-based suites (unit/integration/e2e assertions and headless invariant nets) are the source of permanent authority for CI.

#### Scenario: Authority split is discoverable in run output
- **WHEN** a walkthrough or flow-audit run completes
- **THEN** the generated REVIEW/manifest output identifies itself as review evidence (not a CI gate), so a green evidence run is never mistaken for merge authority

#### Scenario: Graded findings do not block merges
- **WHEN** a walkthrough or flow-audit catalog contains severity-graded findings
- **THEN** those findings inform review and backlog triage but do not flip any PR-blocking check

### Requirement: Seam Trust Anchor Journeys

Journey QC SHALL maintain three named seam trust anchor journeys — recovery rehydration (`e2e/active-session-recovery.spec.ts`), roster materialization handoff (`e2e/seam-roster-materialization-handoff.spec.ts`), and fresh-construction no-instant-defeat (`e2e/seam-fresh-construction-no-instant-defeat.spec.ts`) — as permanent, un-sliced, route-mounted Playwright journeys. Each anchor SHALL enter the application exclusively through a real route mount (`page.goto` against the production route), never through store injection past the seam it guards, and SHALL use hard blocking assertions, never capture-tolerant findings. Scenario packs, headless fast-forward shortcuts, and store-injection fixtures MAY complement the anchors but SHALL NEVER replace them; deleting an anchor, softening one to capture-tolerant mode, or substituting synthetic-entry coverage for one SHALL require an explicit delta to this requirement. Each anchor SHALL be runnable locally through a dedicated `verify:qc` package script at a single worker under the desktop chromium project, SHALL be excluded from the responsive viewport projects via `testIgnore`, SHALL mint unique per-run identifiers for any server-persisted state it creates and delete that state in teardown, and SHALL NOT be added to the required seven-journey scenario catalog (the anchors are Playwright specs, not catalog journeys).

#### Scenario: Anchors are registered and locally runnable
- **WHEN** an operator runs the seam-anchor verify lane (`npm run verify:qc:seam-anchors`)
- **THEN** it SHALL execute the targeted regression jest suites for the guarded seams and all three anchor specs under the chromium project at a single worker

#### Scenario: Anchors are excluded from viewport multiplication
- **WHEN** an operator lists the scheduled tests for any anchor spec (`npx playwright test --list <anchor spec>`)
- **THEN** the anchor's tests SHALL be scheduled only under the desktop chromium project
- **AND** the responsive projects (Mobile Chrome, Tablet Portrait, Tablet Landscape) SHALL NOT schedule any anchor spec
- **AND** anchor specs SHALL NOT carry the `@smoke` tag — the smoke project selects by `grep /@smoke/` on Desktop Chrome, so a tagged anchor would double-schedule and violate the chromium-only clause

#### Scenario: Packs and shortcuts never displace an anchor
- **WHEN** a scenario pack, headless fast-forward path, or store-injection fixture covers surface overlapping a seam trust anchor
- **THEN** the anchor SHALL remain in the suite with its hard assertions intact
- **AND** any proposal to remove or soften an anchor SHALL be expressed as a delta to this requirement, never as a silent spec deletion

#### Scenario: Anchors isolate their persisted state
- **WHEN** an anchor creates campaigns, forces, or encounters through the live API
- **THEN** it SHALL name that state with unique per-run identifiers
- **AND** it SHALL delete the created campaigns, forces, and encounters in teardown so repeated and parallel runs do not collide

#### Scenario: Anchor stability is proven by repetition
- **WHEN** an anchor spec is added or modified
- **THEN** the change SHALL include evidence of three consecutive green local runs of that spec under the desktop chromium project at a single worker

### Requirement: Recovery Rehydration Trust Anchor Journey

Journey QC SHALL include a recovery rehydration trust anchor journey that seeds the browser IndexedDB match log directly — the `mekstation-match-log` database's `matchEvents` and `matches` stores, with a `GameCreated`-first event stream — and then cold-navigates to `/gameplay/games/:id`, so recovery runs through the production recovery factory chain (`recoverInteractiveSession` → `hydrateRecoverableSessionFromMatchLog` → `fromSessionAsync`) with no prior in-memory session state. The seeded roster SHALL mirror at least one canonical `unitRef` across the player and opponent sides under distinct deployed unit ids, so the journey exercises the recovery-side per-instance id aliasing that a fixture with all-distinct `unitRef`s cannot reach. The journey SHALL hard-assert the recovery invariants below and SHALL re-assert them after a page reload.

#### Scenario: Cold route mount recovers the seeded match
- **GIVEN** a seeded IndexedDB match log for match id M and no prior in-memory gameplay store state
- **WHEN** the browser cold-navigates to `/gameplay/games/M`
- **THEN** the gameplay store SHALL report loading complete with no error
- **AND** the recovered session SHALL have id M and active status, and the interactive session SHALL be non-null

#### Scenario: Mirrored canonical refs survive recovery without id collision
- **GIVEN** a seeded roster where the player and opponent sides share at least one canonical `unitRef` under distinct deployed unit ids
- **WHEN** recovery completes
- **THEN** every deployed unit id in the seeded roster SHALL resolve to a non-null movement capability on the recovered interactive session
- **AND** the recovered state SHALL contain exactly the seeded roster's unit count, with no id-collision collapse
- **AND** a bare canonical `unitRef` shared across sides SHALL NOT itself resolve as a deployed unit id

#### Scenario: Recovery does not manufacture a terminal outcome
- **WHEN** recovery of an active seeded match completes
- **THEN** the recovered session's status SHALL be active, not completed
- **AND** the recovered event stream SHALL contain no terminal-outcome event that the seeded log did not already contain

#### Scenario: Reload re-recovers idempotently
- **WHEN** the recovered page is reloaded
- **THEN** every recovery invariant above SHALL hold again on the re-recovered session

#### Scenario: Seeded recovered continuations are deterministic at the route level
- **GIVEN** a seeded match log whose persisted `config.seed` is a finite number (per the game-engine-orchestration "Recovered Session Dice Re-Seeding" contract)
- **WHEN** the match is recovered twice through two independent cold page loads and each recovered session is driven through an identical short continuation
- **THEN** the two continuations' normalized event streams SHALL be equal to each other
- **AND** the assertion SHALL be run-to-run equality only — no roll value, outcome, or uninterrupted-run claim SHALL be pinned

### Requirement: Roster Materialization Handoff Trust Anchor Journey

Journey QC SHALL include a roster materialization handoff trust anchor journey that click-drives the live campaign path — contract acceptance, mission launch briefing, full roster selection, and the launch click — through encounter materialization into the pre-battle route, and hard-asserts the roster-parity invariants of the campaign-combat-loop "Campaign-Linked Encounter Launch" requirement at the route-mounted layer. The journey SHALL use blocking Playwright assertions, not capture-tolerant findings: a roster collapse (fewer rendered units than selected, or zero battle value) SHALL fail the spec.

#### Scenario: Full roster selection reaches pre-battle intact
- **GIVEN** a live campaign with N ready roster units selected in the mission readiness panel
- **WHEN** the launch control is clicked and the browser lands on the encounter pre-battle route
- **THEN** the pre-battle player unit list SHALL render exactly N units
- **AND** the rendered player force battle value SHALL be greater than zero
- **AND** each rendered player unit row SHALL display the pre-battle pilot-assignment indicator, not a crewless row — the pre-battle roster renders an assignment marker rather than pilot names, so pilot identity itself SHALL be verified at the data layer per the "Force assignments verified at the data layer" scenario, not on this DOM
- **AND** these SHALL be hard assertions that fail the spec on violation, not recorded findings

#### Scenario: Force assignments verified at the data layer
- **WHEN** the journey reads the materialized player force through the live API after launch
- **THEN** the player force SHALL contain exactly N unit assignments with N distinct unit ids and their assigned pilots preserved

#### Scenario: Handoff journey cleans up its materialized rows
- **WHEN** the journey completes, whether passing or failing
- **THEN** its created campaign, forces, and encounter SHALL be deleted through the live API in teardown

### Requirement: Fresh Construction No-Instant-Defeat Trust Anchor Journey

Journey QC SHALL include a fresh-construction trust anchor journey that launches a materialized NvN encounter from the pre-battle route with an explicit `?seed=N` query parameter (per the game-engine-orchestration "Single-Player Launch Seed Threading" contract) and hard-asserts, at the route-mounted layer, the campaign-combat-loop "Launched Campaign Sessions Start Battle-Ready" invariants. The materialized player force SHALL field at least two units sharing one canonical `unitRef`, so the per-instance unit-id construction path is provably exercised regardless of opponent selection. The journey SHALL assert no golden traces: same-seed runs are compared to each other, never to pinned literal values.

#### Scenario: Seeded launch constructs a full battle with distinct unit identities
- **GIVEN** a materialized NvN encounter whose player force fields at least two units sharing one canonical `unitRef`
- **WHEN** the pre-battle route is loaded with `?seed=N` and the battle is launched
- **THEN** the mounted battle SHALL expose 2N distinct per-instance unit identities, counted by distinct unit ids rather than DOM node totals

#### Scenario: Initiative advance does not instant-defeat
- **WHEN** the launched battle advances out of Initiative and through at least two further rounds
- **THEN** no terminal outcome (victory, defeat, or draw) SHALL be presented unless justified by combat, withdrawal, or concession events
- **AND** absent such events, both sides SHALL retain at least one alive unit after each advance

#### Scenario: Same seed twice yields equal outcome markers
- **GIVEN** one materialized encounter
- **WHEN** it is launched twice through two independent page loads with the same `?seed=N` and driven through identical advance sequences
- **THEN** the per-round outcome markers observed on each run (phase, status, alive-unit counts per side) SHALL be equal between the two runs
- **AND** no marker SHALL be compared against a pinned literal value

