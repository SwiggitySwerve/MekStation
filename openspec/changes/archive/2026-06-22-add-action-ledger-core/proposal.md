## Why

The existing GM intervention ledger proves approved GM corrections can be previewed, approved, and redacted, but it does not provide a single append-only stream where normal player actions and GM-specific corrections can be reviewed together. The next combat, economy, and time-cascade waves need that shared action spine before they can safely layer richer interventions on top.

## What Changes

- Add a generic action ledger core for normal actions, approved GM interventions, and system actions.
- Preserve append-only ordering and causality across normal actions and GM corrections.
- Project the same ledger differently for players and owning GMs so GM-private rationale stays private.
- Wire GM cascade approval into the action ledger as an optional sink, without changing existing intervention domain implementers.
- Add tests proving normal action preservation, GM approval append behavior, redaction, and blocked-preview non-append behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `intervention-ledger-abstraction`: Extends the intervention ledger contract with a shared action ledger stream for normal actions and GM-specific intervention actions.

## Impact

- Adds shared action ledger types and implementation under `src/types/interventions` and `src/lib/interventions`.
- Extends GM cascade approval to optionally append a player-safe action ledger record alongside the domain intervention record.
- Updates OpenSpec requirements and focused intervention tests.
- No external dependencies or breaking API changes.

## Non-goals

- Does not implement post-combat, economy, repair, salvage, or time-cascade domain mutation.
- Does not replace the existing campaign event store, combat event stream, or domain reducers.
- Does not add GM UI controls beyond the already existing tactical intervention surfaces.
