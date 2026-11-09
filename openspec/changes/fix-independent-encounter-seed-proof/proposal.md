## Why

The seed auto-resolve E2E completes its first encounter, then tries to launch a different session against that Completed row. The terminal lifecycle introduced by #3058 correctly refuses this, while its active same-seed clause and the live launch-seed scenario imply that the completed encounter can be reused. Root's D-11 G5 ruling selects independent fresh encounters for completed auto-resolve comparisons.

## What Changes

- Amend `Explicit Restart and Visible Launch Refusal` in the active `fix-encounter-status-lifecycle` change and synchronize that requirement to `openspec/specs/encounter-system/spec.md`.
- Modify `Single-Player Launch Seed Threading` in `openspec/specs/game-engine-orchestration/spec.md` to distinguish independent completed runs from explicit restarts of Launched encounters.
- Prepare two fresh encounter rows from one battle-input definition before either run, drive independent pre-battle page loads, and compare persisted inputs and winner/turn/event counts.
- Verify the first Completed row and saved history survive the second run unchanged. Preserve the manual same-encounter restart/refusal E2E and lifecycle tests unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `encounter-system`: synchronize the corrected active restart requirement without granting restart authority over Completed encounters.
- `game-engine-orchestration`: clarify the independent-encounter reproducibility acceptance scenario.

## Impact

E2E and OpenSpec only. No runtime, schema, digest, replay format, replay UX, engine, or archived specification changes. Equal fresh gameplay inputs producing different outcomes block this repair and require a product determinism defect report.
