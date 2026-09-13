## Why

Once linear replay, schema safety, combat/campaign authority, and cross-stream receipts are proven, corrections can preserve prior history instead of deleting or patching it. Branches must remain domain-controlled replacements, not generic Git or CRDT merges.

## What Changes

- Add immutable branch records anchored to a parent branch, base revision, base event identity, and integrity digest.
- Model restore-and-continue and authorized rewind/correction as new branches; ordinary choices remain linear and ordinary undo uses compensating events.
- Build replacement branches off the effective path, verify deterministic projections and affected artifacts, then activate with an expected-head compare-and-swap or leave the prior branch authoritative.
- Use a durable correction lease to reject commands explicitly while a candidate branch is rebuilding; never queue them invisibly.
- Promote proposed work only by revalidating semantic commands against the current target head and emitting new target events with provenance.
- Expose authorization-filtered branch, supersession, impact, and prior-head history.

## Non-goals

- Generic three-way state merge, automatic reconciliation, or CRDT semantics for canonical combat/campaign state.
- Deleting or rewriting prior events, receipts, audit facts, or externalized artifacts.
- Content-addressing domain entity identity; hashes identify revisions and integrity, not units, pilots, campaigns, or matches.
- Enabling player-authored simulation branches in this change.

## Dependencies

- This change is the branch/correction implementation slice of `harden-gm-two-player-campaign-sessions`.
- It depends on the journal foundation, replay/schema safety, membership/projection/private-audit gates, combat authority, and campaign authority for the corresponding branch seams. The branch storage/port infrastructure may land before combat-journal cutover; PR 1-3 are covered by the September 2 cross-stream predecessor-receipt-only exemption in `tasks.md`. PR 1-3 still retain their own exact-main proof, independent review, and package-specific approval/behavior receipts. The full exact-main cross-stream terminal/archive/prune gate remains required before receipt-consuming PR 4+.
- It is the final entity-history wave; before archive/sync, overlapping umbrella deltas SHALL be reconciled through the program wave map.
- Live Branch PR 3 rewind acceptance follows `adopt-combat-journal-cutover-and-gm-rewind` S1-S4 and its journal correctness/cutover gates. That cutover consumes the branch storage/port seam and does not require this whole change to be complete or archived. Target-scoped effect receipts remain a prerequisite for the campaign replacement and coordinated post-receipt seams.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-store`: Add immutable branch, parent/base, status, activation, and supersession contracts.
- `gm-combat-interventions`: Add authorized replacement-branch rewind, rebuild gating, stale-branch rejection, and atomic activation.
- `gm-campaign-intervention-boundaries`: Add impact-declared campaign replacement branches and post-receipt correction boundaries.
- `campaign-combat-loop`: Add a recoverable higher-version correction saga rather than an impossible cross-store atomic transaction.
- `audit-timeline`: Add authorization-filtered branch lineage, supersession, impact, and prior-head inspection.

## Impact

- Journal branch tables, resolvers, GM correction/rewind commands, campaign rebuild, stale-command handling, audit/history UI, and invalidated artifact tracking.
- Deterministic branch rebuild and activation tests across combat, campaign, visibility, and outcome receipts.
- No new runtime dependency.
