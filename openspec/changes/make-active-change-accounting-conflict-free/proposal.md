## Why

Parallel OpenSpec pull requests append to one active-change ledger, so unrelated
changes conflict and require repeated merges and CI runs. Each change needs its
own accounting file while in-flight legacy additions continue to work.

## What Changes

- Add `openspec/changes/<name>/.ledger.json` as the format for new changes.
- Migrate the current legacy inventory without changing its normalized bytes;
  leave `openspec/active-change-ledger.json` unchanged for compatibility.
- Give both QC readers one format owner. Enforce complete metadata in the CI
  validator and read cited Git-tree metadata in CAMP provenance checks.
- Reject unaccounted changes, stale legacy names, malformed metadata, duplicate
  legacy names and conflicting metadata across formats.

## Capabilities

### New Capabilities

- `openspec-change-accounting`: conflict-free active-change inventory with strict
  metadata validation and compatibility for legacy entries and cited revisions.

### Modified Capabilities

None.

## Impact

Only repository OpenSpec metadata, its two QC readers, their tests and OpenSpec
agent guidance change. Gameplay, replay schemas and application persistence are
outside scope. Root updates the external lane brief after merge.
