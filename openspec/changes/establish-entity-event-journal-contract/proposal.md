## Why

MekStation has several useful event logs, but they disagree about ordering, identity, durability, retention, and authority. A shared adapter-neutral journal contract is needed before combat, campaigns, synchronization, or branching can converge without another all-at-once rewrite.

## What Changes

- Define one versioned TypeScript event envelope with one owning stream and indexed links to every affected durable entity instance.
- Require atomic expected-revision command batches, gap-free store-assigned stream revisions, stable command receipts, explicit actor/accepting-authority provenance, causal identity, and a bounded store-local cross-stream observation cursor that is not a global domain head.
- Add a SQLite journal adapter and a reusable adapter conformance suite without switching any production aggregate to the new authority yet.
- Preserve existing typed combat and campaign event payloads inside the envelope rather than replacing their reducers.
- Import legacy snapshot-only state only as an honest baseline; do not fabricate historical events.

## Non-goals

- Switching combat or campaign write authority in this wave.
- Adding branches, rewind, checkpoints, workflow orchestration, a broker, CRDT merging, PostgreSQL, or KurrentDB.
- Replacing Zustand, WebSocket transport, existing reducers, or current snapshot read models.

## Dependencies

- This change is the foundational implementation slice of `harden-gm-two-player-campaign-sessions`; the umbrella remains the program-level acceptance contract.
- It has no dependency on another entity-history leaf change and SHALL switch no production authority.
- Before archive/sync, overlapping umbrella deltas SHALL be reconciled through the program wave map so requirements are not duplicated in main specs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-store`: Define the shared journal envelope, entity-reference index, atomic append contract, command receipts, SQLite adapter behavior, and adapter conformance requirements.

## Impact

- Types and schemas under `src/types/events/` and a neutral journal module under `src/services/events/` or `src/lib/events/`.
- Additive SQLite migrations and repository-supported `better-sqlite3` transactions.
- Four focused PR seams for contract/schema, canonicalization, in-memory conformance, and SQLite durability tests.
- No new runtime dependency.
