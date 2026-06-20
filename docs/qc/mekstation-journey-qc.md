# MekStation Journey QC

Date: 2026-06-19

Journey QC turns the core player flows into repeatable, configurable command
runs with local evidence. It complements the major-capability QC registry and
scenario catalog.

## Sources

- Journey catalog: `docs/qc/mekstation-journey-scenarios.json`
- QC validation graph: `docs/qc/mekstation-qc-validation-graph.json`
- Logging map: `docs/qc/mekstation-logging-map.json`
- Evidence root: `.sisyphus/evidence/qc-journeys`

## Commands

```powershell
npm.cmd run qc:journeys:validate
npm.cmd run qc:logging:validate
npm.cmd run qc:graph -- --query=mek-build
npm.cmd run qc:journeys -- --journey=all --tier=smoke
npm.cmd run qc:journeys -- --journey=mek-build --dry-run
npm.cmd run qc:journeys -- --journey=combat-1v1 --seed=42 --player-units=1 --opponent-units=1
npm.cmd run qc:journeys -- --journey=combat-4v4 --seed=42 --player-units=4 --opponent-units=4
npm.cmd run qc:journeys -- --journey=campaign-short --contracts=5
npm.cmd run qc:journeys -- --journey=campaign-long --tier=extended --contracts=10
npm.cmd run qc:journeys:bugs -- --since=latest --min-severity=medium
npm.cmd run qc:logs -- --run-id=latest --level=warn,error
npm.cmd run qc:logs -- --run-id=latest --level=warn,error --exclude-probes
npm.cmd run verify:qc:journeys
```

## Supported Journeys

| Journey             | Default mode | Primary module | Default proof                                      |
| ------------------- | ------------ | -------------- | -------------------------------------------------- |
| `character-build`   | headless     | roster         | pilot generation and export evidence               |
| `mek-build`         | headless     | construction   | BattleMech construction input and export           |
| `combat-1v1`        | headless     | combat         | encounter, tactical rejection, terminal combat     |
| `combat-4v4`        | headless     | combat         | lance encounter, terminal combat, replay reference |
| `contract-campaign` | headless     | campaign       | contract selection, outcome, economy update        |
| `campaign-short`    | headless     | campaign       | 3 to 5 contract sequence                           |
| `campaign-long`     | headless     | campaign       | 6 to 10 contract sequence                          |

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

Journey-specific parameters include `--pilot-count`,
`--pilot-skill-band`, `--pilot-abilities`, `--unit-type`, `--chassis`,
`--variant`, `--era`, `--unitTechBase`, `--weight-class`, `--player-units`,
`--opponent-units`, `--bv-budget`, `--map-radius`, `--terrain`,
`--turn-limit`, `--contracts`, `--contract-types`, `--outcome-pattern`,
`--start-funds`, `--repair-policy`, `--salvage-policy`,
`--advance-days-between`, and `--campaign-difficulty`.

## Evidence Bundle

Each run writes:

```text
.sisyphus/evidence/qc-journeys/<runId>/
  run-plan.json
  result.json
  system.ndjson
  bugs.json
  report.md
  stdout/runner.log
  stderr/runner.log
  generated/
  artifacts/
```

`latest.json` points bug and log commands at the most recent run.

## Bug And Log Workflow

1. Run the narrow journey first, with explicit seed and parameters.
2. Inspect `report.md` for the human-readable result.
3. Use `qc:journeys:bugs` to list grouped failures by severity and fingerprint.
4. Use `qc:logs` to filter structured diagnostic entries by level, journey,
   service, event, or step.
5. Add `--exclude-probes` when scanning for non-probe warnings. The
   `api.payload_rejected` warning is an expected negative-control probe; it
   remains warning-level evidence but is classified as `expected-probe` and
   `blocking=false`.
6. Rerun the same journey with the same run-plan inputs after a fix.

Known gaps are recorded in journey output and the validation graph. They do not
silently hide unrelated failures.
