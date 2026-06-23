## Why

The long-campaign journey currently proves that a 6-10 contract sequence can be generated and executed once, but it does not prove that the same seed and parameters stay stable across repeated runs, save/load boundaries, or UI-flow handoff evidence. This matters now because the journey runner is becoming the repeatable proof surface for campaign-scale bugs and needs a higher-confidence stability gate before deeper campaign systems build on it.

## What Changes

- Add a long-campaign stability command that runs `campaign-long` with configurable seed, contract count, run count, and evidence location.
- Write a stability manifest that compares deterministic campaign artifacts across repeated attempts and reports unexplained drift.
- Validate save round trips for long-campaign run plan, result, and generated campaign artifacts.
- Link long-campaign stability output to the gameplay UI flow registry so the evidence names the UI checkpoints it covers and the browser lane it does not cover.
- Emit actionable bug evidence when drift, missing artifacts, failed terminal states, or save round-trip mismatches are detected.

## Non-goals

- This change does not convert the long-campaign journey into a full browser automation lane.
- This change does not implement new campaign economy, repair, salvage, market, or time-cascade domain mechanics.
- This change does not remove the current headless-first limitation; it makes that boundary explicit in the stability evidence.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `journey-qc`: Add long-campaign stability, digest, save round-trip, and drift bug packet requirements.
- `ui-flow-shell`: Require the long-campaign flow registry entry to expose stability-gate command linkage and UI checkpoint evidence boundaries.

## Impact

- Affected scripts: `scripts/qc/*`, journey QC tests, and `package.json` command wiring.
- Affected artifacts: `.sisyphus/evidence/qc-journeys/<runId>/stability-manifest.json`, `bugs.json`, `system.ndjson`, and `report.md`.
- Affected specs: `journey-qc` and `ui-flow-shell`.
- Dependencies: no new runtime or package dependencies expected.
