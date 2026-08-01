## Why

Verified SQLite journal opening currently checks high-water, events, heads, and command receipts through several independent reads. A second connection can commit between those reads, causing a healthy database to fail closed as if it were corrupt; this unwired Low availability risk needs one explicit pre-adoption owner before replay or production authority work builds on the adapter.

## What Changes

- Require verified opening to inspect one coherent SQLite read snapshot, so it observes either the complete state before a concurrent commit or the complete state after it, never a hybrid.
- Preserve fail-closed rejection for actual integrity, membership, chain, head, receipt, position, or high-water corruption.
- Add deterministic two-connection race coverage and lock/transaction cleanup proof against a real temporary SQLite file.
- Keep the adapter borrowed-handle lifecycle, schema, migrations, command transactions, checkpoint ownership, and production authority wiring unchanged.
- Insert this focused Wave 1.5 prerequisite after the archived foundation and before replay, privacy, combat, or campaign authority adoption.

## Non-goals

- Adopting the journal as combat, campaign, session, mission, or unit authority.
- Adding a writer lock service, broker, workflow engine, PostgreSQL adapter, new dependency, schema migration, or asynchronous SQLite transaction callback.
- Changing initialization, migration, checkpoint, close, quarantine, viewer projection, or imported-baseline ownership.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `event-store`: Strengthen durable verified opening so every integrity read is resolved from one coherent SQLite snapshot while true corruption still fails closed.

## Impact

- Expected implementation seam: `src/lib/events/journal/SQLiteEventJournalRecovery.ts` and its file-backed recovery tests/harness.
- OpenSpec sequencing: active-change ledger plus the entity-history wave map.
- No public API, transport, UI, schema, dependency, or production-authority change.
