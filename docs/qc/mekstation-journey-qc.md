# MekStation Journey QC

Date: 2026-06-19

Journey QC turns the core player flows into repeatable, configurable command
runs with local evidence. It complements the major-capability QC registry and
scenario catalog.

## Sources

- Journey catalog: `docs/qc/mekstation-journey-scenarios.json`
- QC validation graph: `docs/qc/mekstation-qc-validation-graph.json`
- Logging map: `docs/qc/mekstation-logging-map.json`
- UI flow shell registry: `src/qc/gameplayUiFlowShell.json`
- Evidence root: `.sisyphus/evidence/qc-journeys`

## Commands

```powershell
npm.cmd run qc:journeys:validate
npm.cmd run qc:ui-flow-shell:validate
npm.cmd run qc:ui-flow-shell -- --journey=contract-campaign
npm.cmd run qc:logging:validate
npm.cmd run qc:graph -- --query=mek-build
npm.cmd run qc:journeys -- --journey=all --tier=smoke
npm.cmd run qc:journeys -- --journey=mek-build --dry-run
npm.cmd run qc:journeys -- --journey=combat-1v1 --seed=42 --player-units=1 --opponent-units=1
npm.cmd run qc:journeys -- --journey=combat-4v4 --seed=42 --player-units=4 --opponent-units=4
npm.cmd run qc:journeys -- --journey=campaign-short --contracts=5
npm.cmd run qc:journeys -- --journey=campaign-long --tier=extended --contracts=10
npm.cmd run qc:campaign-long:stability -- --journey=campaign-long --seed=42 --contracts=10 --runs=2
npm.cmd run qc:journeys:bugs -- --since=latest --min-severity=medium
npm.cmd run qc:logs -- --run-id=latest --level=warn,error
npm.cmd run qc:logs -- --run-id=latest --level=warn,error --exclude-probes
npm.cmd run verify:qc:journeys
npm.cmd run verify:qc:ui-flow-shell
npm.cmd run verify:qc:campaign-long
```

`qc:journeys:validate` also checks the gameplay UI flow shell. Each required
journey must have a UI flow entry, every UI flow journey must exist in the
catalog and validation graph, and every route checkpoint must map to a Next.js
page template such as `/gameplay/campaigns/[id]/salvage`.
`qc:ui-flow-shell` prints the player/GM route sequence for a selected journey,
while `qc:ui-flow-shell:validate` checks the dedicated shell contract,
including required checkpoint order for the major journey flows.

## Supported Journeys

| Journey             | Default mode | Primary module | Default proof                                      |
| ------------------- | ------------ | -------------- | -------------------------------------------------- |
| `character-build`   | headless     | roster         | pilot generation and export evidence               |
| `mek-build`         | headless     | construction   | BattleMech construction input and export           |
| `combat-1v1`        | headless     | combat         | encounter, tactical rejection, terminal combat     |
| `combat-4v4`        | headless     | combat         | lance encounter, terminal combat, replay reference |
| `contract-campaign` | headless     | campaign       | contract selection, outcome, economy update        |
| `campaign-short`    | headless     | campaign       | 3 to 5 contract sequence                           |
| `campaign-long`     | headless     | campaign       | 6 to 10 contract sequence plus stability gate      |

## UI Flow Shell

The gameplay hub mounts the UI flow shell from `src/qc/gameplayUiFlowShell.json`.
It maps each supported journey to:

- player-visible launch and inspection routes
- GM review or intervention checkpoints
- the QC command that proves the journey
- placeholder routes such as `:campaignId`, `:missionId`, and `:gameId`

Route placeholders are validation targets, not generated runtime IDs. The
validator normalizes them against the concrete Next.js page templates before
accepting the registry.
The inspector can be filtered with `--journey=<id>` and can emit automation
JSON with `--json`.

## Common Parameters

- `--journey=<id|all>`
- `--tier=smoke|standard|extended`
- `--mode=headless|browser|hybrid`
- `--seed=<number>`
- `--runs=<number>`
- `--run-id=<id>`
- `--evidence-dir=<path>`
- `--dry-run`
- `--continue-on-error`
- `--fail-on-bug-severity=info|medium|high|critical`
- `--require-domain-backed`

Journey-specific parameters include `--pilot-count`,
`--pilot-skill-band`, `--pilot-abilities`, `--unit-type`, `--chassis`,
`--variant`, `--era`, `--unitTechBase`, `--weight-class`, `--player-units`,
`--opponent-units`, `--bv-budget`, `--map-radius`, `--terrain`,
`--turn-limit`, `--contracts`, `--contract-types`, `--outcome-pattern`,
`--start-funds`, `--repair-policy`, `--salvage-policy`,
`--advance-days-between`, and `--campaign-difficulty`.

The runner validates overrides against the selected journey catalog before it
writes trusted evidence. Unknown journey parameters, malformed integers,
ambiguous booleans, unsupported enum values, empty explicit string lists, and
numeric min/max violations fail before `run-plan.json`, `result.json`, or
diagnostic logs are claimed for the run. Failure messages name the journey ID,
parameter name, received value, and expected constraint so a bad command can be
fixed without digging through artifacts.

## Evidence Bundle

Each run writes:

```text
.sisyphus/evidence/qc-journeys/<runId>/
  run-plan.json
  result.json
  stability-manifest.json (long-campaign stability runs)
  system.ndjson
  bugs.json
  report.md
  stdout/runner.log
  stderr/runner.log
  generated/
  artifacts/
```

`latest.json` points bug and log commands at the most recent run.

`qc:campaign-long:stability` wraps the `campaign-long` journey, defaults to
extended tier, 10 contracts, and two repeated attempts, then writes
`stability-manifest.json`. The manifest records normalized artifact digests,
save round-trip checks, execution backing summary, UI flow checkpoints, the
headless/browser boundary, drift entries, and evidence references. Detected
drift adds `campaign.stability_drift_detected` diagnostics and bug candidates
that are visible through `qc:logs` and `qc:journeys:bugs`.

Step results, diagnostic entries, and step artifacts include execution backing
metadata:

- `executionBacking`: backing type such as `synthetic-projection`
- `syntheticBacking`: whether the step is still catalog/synthetic backed
- `executionEvidenceSource`: where the backing evidence came from

Use `--require-domain-backed` when you need the run to fail if selected
required steps are still synthetic/catalog-backed. That strict mode is expected
to fail until a journey step has a real domain, browser, or hybrid adapter.

Structured diagnostic entries also include a stable `fingerprint` and
`metadata.triage` packet for journey steps. The triage packet is intentionally
bounded and includes:

- `actor`
- `action`
- `stateBefore`
- `stateAfter`
- `ruleDecision`
- `validationResult`
- `warnings`
- `failureCause`
- `evidenceRefs`
- `nextDebuggingHint`

Bug candidates copy that packet into `bugs.json` and add `logFingerprints` so a
bug can be traced back to the exact diagnostic entry. Result-derived failures
and matching error diagnostics are deduplicated into one canonical bug packet,
so the report count should reflect issues rather than logging sources.

## Bug And Log Workflow

1. Run the narrow journey first, with explicit seed and parameters.
2. Inspect `report.md` for the human-readable result.
3. Use `qc:journeys:bugs` to list grouped failures by severity and fingerprint.
   Medium-or-higher bugs print actor, action, compact state before/after,
   rule decision, validation result, failure cause, debugging hint, and related
   log fingerprints when available.
4. Use `qc:logs` to filter structured diagnostic entries by level, journey,
   service, event, or step.
5. Add `--exclude-probes` when scanning for non-probe warnings. The
   `api.payload_rejected` warning is an expected negative-control probe; it
   remains warning-level evidence but is classified as `expected-probe` and
   `blocking=false`.
6. Copy a bug packet log fingerprint into
   `npm.cmd run qc:logs -- --run-id=latest --fingerprint=<fingerprint>` when
   you need the exact structured diagnostic that caused or explains the bug.
7. Search `--event=bug.candidate_extracted` when you need the extraction
   diagnostic that records bug count, gated count, severity gate, `bugs.json`,
   and `report.md`.
8. Use `--require-domain-backed` to distinguish real adapter coverage from
   synthetic projection coverage.
9. Rerun the same journey with the same run-plan inputs after a fix.

Known gaps are recorded in journey output and the validation graph. They do not
silently hide unrelated failures.
