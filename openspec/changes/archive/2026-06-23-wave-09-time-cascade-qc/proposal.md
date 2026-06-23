## Why

The time-cascade runtime exists and has focused behavior tests, but future QC needs a fast command-backed way to prove the ledger surface remains mapped to the right implementation, day processors, tests, specs, and player/GM redaction contract. Without that map, accumulated campaign-time regressions can hide behind broad journey tests or stale registry language.

## What Changes

- Add a reusable GM ledger QC core for command-backed surface, source-anchor, stale-change-ref, and registry validation.
- Add a Wave 9 time-cascade QC validator that checks the `time` domain, `time-advance` family, required day processors, campaign roots, source anchors, focused tests, and OpenSpec references.
- Add package scripts and QC map/registry entries so operators can run time-cascade validation directly or as part of the broader `verify:qc` gate.
- Add focused validator tests that fail on missing registry surfaces, stale active change refs, and missing source-anchor tokens.

## Non-goals

- Changing the time-cascade runtime behavior, day-processor business rules, repair durations, market tables, or campaign economy values.
- Building browser controls for time-cascade approval; this slice proves the command and ledger contract the UI can call.
- Expanding external roster or vault-owned recovery mutation beyond the current explicit projected-effect or manual-takeover boundary.

## Capabilities

### Modified Capabilities

- `time-cascade-system`: Adds command-backed QC proof for time-cascade preview, approval, replay, redaction, manual takeover, and external-effect boundaries.
- `day-progression`: Adds command-backed proof that the time-cascade validator covers the day processors and campaign roots used by projected time advancement.
- `intervention-ledger-abstraction`: Adds Wave 9 QC proof for replayable time-cascade action/intervention ledger behavior.
- `gm-cascade-preview`: Adds command-backed preview proof for time-cascade public/private projection and blocked approval.
- `gm-campaign-intervention-boundaries`: Adds a time-cascade QC coverage matrix for the supported `time` domain and `time-advance` correction family.

## Impact

- Scripts under `scripts/qc/` and focused tests under `scripts/__tests__/`.
- Package scripts for QC and verification.
- QC registry and human-readable QC map documentation.
- OpenSpec deltas only; no runtime mutation changes expected.
