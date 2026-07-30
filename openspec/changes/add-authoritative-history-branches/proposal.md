## Why

Once linear replay, schema safety, combat/campaign authority, and cross-stream receipts are proven, corrections can preserve prior history instead of deleting or patching it. Branches must remain domain-controlled replacements, not generic Git or CRDT merges.

## What Changes

- Add immutable branch records anchored to a parent branch, base revision, base event identity, and integrity digest.
- Model restore-and-continue, GM rewind, and explicit simulation as new branches; ordinary choices remain linear and ordinary undo uses compensating events.
- Build replacement branches off the active path, verify deterministic projections and affected artifacts, then activate atomically or leave the prior branch authoritative.
- Reject stale-branch commands and gate commands while a candidate branch is rebuilding.
- Merge only by revalidating proposed commands against the current target head and emitting new target events with provenance.
- Expose authorization-filtered branch, supersession, and impact history.

## Non-goals

- Generic three-way state merge, automatic reconciliation, or CRDT semantics for canonical combat/campaign state.
- Deleting or rewriting prior events, receipts, audit facts, or externalized artifacts.
- Content-addressing domain entity identity; hashes identify revisions and integrity, not units, pilots, campaigns, or matches.

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
