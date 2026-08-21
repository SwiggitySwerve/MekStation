> SUPERSEDED 2026-08-20 by `design-campaign-authority-and-sync` per the council decision at `openspec/council-decisions/2026-08-20-campaign-journal-reconciliation-and-next-work.md`. Nothing here was implemented under this change. Its content survives absorbed: design D2/D3 imported intact as the surviving change's D10, the cursor doctrine adopted into its rewritten D4, the four spec deltas absorbed into its specs/, and PR groups 1-7 carried as its Group 5. Archived with --skip-specs (no delta merged into living specs from here).

## Why

Co-op campaign events are typed but remain process-local, while campaign snapshots are authoritative and multi-event commands can partially apply. Campaign adoption must make one durable stream authoritative and close the catch-up/live race before long-running shared campaigns rely on it.

## What Changes

- Replace production in-memory campaign event storage with the shared durable journal adapter.
- Commit every accepted campaign command as one expected-revision batch before mutating projections or broadcasting.
- Treat campaign snapshots as materialized projections/checkpoints and import existing campaigns as explicit baseline events.
- Preserve durable instance identity for customized units, pilots, forces, missions, encounters, and sessions through entity references.
- Add a high-water-mark replay/live handshake and durable per-participant acknowledgement cursors.
- Keep compare-and-set snapshot persistence during shadow validation, then cut over each campaign aggregate to exactly one write authority.

## Non-goals

- Adding rewind, generic merge, post-combat outcome receipts, or retroactive correction.
- CRDT-merging campaign funds, ownership, readiness, damage, or chronology.
- Replacing current campaign UI or broad campaign domain behavior.

## Dependencies

- This change is the campaign-authority implementation slice of `harden-gm-two-player-campaign-sessions`.
- It depends on `establish-entity-event-journal-contract`, `add-replay-schema-and-checkpoint-safety`, and the membership/projection/private-audit gates in `add-authority-audit-and-privacy-proof`.
- Cross-stream effects and replacement branches remain later changes; before archive/sync, overlapping umbrella deltas SHALL be reconciled through the program wave map.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-store`: Adopt the shared journal for campaign-owned streams and baseline import.
- `campaign-persistence`: Make snapshots derived materializations with an explicit shadow/cutover/rollback boundary.
- `coop-campaign-sync`: Require durable history, atomic command batches, instance lineage, cursors, and restart recovery.
- `multiplayer-sync`: Add a gap-free campaign catch-up/live handoff and contiguous application acknowledgements.

## Impact

- Campaign host registry, event store, intent/commit pipeline, persistence service, synchronization transport, and entity materialization.
- Additive SQLite migrations and campaign adapter/restart tests.
- Authority evidence must pair UI state with journal rows, snapshot digests, and reload/reconnect proof.
- No new runtime dependency.
