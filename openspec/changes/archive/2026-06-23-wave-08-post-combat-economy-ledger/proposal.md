# Wave 8: Post-Combat Economy Ledger

## Why

Post-combat, repair, salvage, and base-economy GM corrections already have ledger-backed implementation and focused unit coverage, but the proof is scattered across intervention types, preview/projection helpers, action-ledger tests, and the broad campaign QC surface. The next campaign waves need one fast gate that proves these corrections remain previewed, approved, replayed, redacted, and discoverable before time-cascade and long-campaign work builds on them.

## What Changes

- Add a dedicated campaign ledger QC validator that inspects supported GM campaign intervention domains, correction families, source anchors, focused tests, registry wiring, and stale active-change references.
- Wire the validator into package scripts, aggregate QC, and the campaign economy QC registry surface.
- Update QC documentation so post-combat/base-economy reviews start from the Wave 8 manifest and then drill into focused intervention tests.
- Add OpenSpec deltas that define the command-backed proof boundary for campaign-domain ledger corrections.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `intervention-ledger-abstraction`: Adds the Wave 8 campaign ledger QC proof contract for post-combat, economy, repair, and salvage corrections.
- `gm-cascade-preview`: Adds command-backed preview/redaction/no-mutation proof expectations for campaign corrections.
- `gm-campaign-intervention-boundaries`: Adds the required domain and correction-family coverage matrix for the focused proof.
- `campaign-finances`: Adds proof expectations for funds transaction corrections and merchant reversals.
- `markets-system`: Adds proof expectations for inventory lot corrections tied to base-economy/merchant fixes.
- `repair-maintenance`: Adds proof expectations for repair ticket corrections.

## Non-goals

- Implementing the accumulated time-cascade system; that remains Wave 9.
- Replacing the existing intervention unit tests or long-campaign stability runner.
- Adding new campaign economy behavior beyond command-backed validation and documentation of the existing ledger correction surface.

## Impact

- `scripts/qc/`: new focused campaign ledger validator.
- `scripts/__tests__/`: regression tests for the new validator.
- `package.json`: focused and aggregate QC aliases.
- `docs/qc/mekstation-qc-registry.json` and `docs/qc/mekstation-qc-map.md`: campaign ledger QC routing and evidence.
- `openspec/changes/wave-08-post-combat-economy-ledger/`: proposal, design, tasks, and spec deltas.
