## Why

A rewind resets in-memory viewer delivery numbering but leaves SQLite delivery
and acknowledgement rows behind. Replaying the rebuilt stream collides with
the old delivery primary keys, and monotonic acknowledgement writes retain the
old stream's receipts. Activated-branch recovery already skips restoring these
rows, so stale cursor restoration is not an established defect.

## What Changes

- Delete the affected match's disposable delivery records and acknowledgements
  inside the existing match-tail supersession transaction.
- Preserve superseded authority events, outbox rows and command receipts in
  their existing sibling tables.
- Prove live rewind, cold reopen, acknowledgement reset, rollback, match
  isolation and the coordinated-correction caller's safe replay fallback.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multiplayer-sync`: invalidate viewer resume data atomically when superseding
  match history.

## Impact

No schema migration, epoch, wire shape, event payload or committed fixture
changes. One draft PR. Runtime ownership stays with match-store supersession;
the host's in-memory reset and recovery guard keep their existing behavior.
