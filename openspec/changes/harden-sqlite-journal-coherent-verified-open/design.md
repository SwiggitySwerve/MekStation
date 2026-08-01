## Context

The archived event-journal foundation added an unwired `openVerifiedSQLiteEventJournal` factory. Its integrity checks are individually sound, but `verifyStorage()` awaits public adapter methods between direct SQLite reads. Each statement therefore runs outside one explicit read transaction, so a second WAL connection can commit after high-water capture and before event/head/receipt checks. The reader may combine two committed states and falsely classify a healthy file as corrupt.

The repository uses `better-sqlite3` over `SQLiteService`, which enables WAL mode. SQLite gives one connection an unchanging view while an explicit read transaction remains active, and `better-sqlite3` transaction callbacks are synchronous. The adapter still borrows its initialized handle and remains absent from production authority.

## Goals / Non-Goals

**Goals:**

- Resolve every verified-open integrity read against one coherent SQLite snapshot.
- Let a different WAL connection commit without making the reader observe a hybrid state.
- Preserve typed fail-closed behavior for actual corruption.
- Prove success, failure, transaction release, and two-connection interleaving deterministically.
- Keep the implementation within one focused recovery seam and its direct tests.

**Non-Goals:**

- Change journal schemas, migrations, write transactions, checkpoints, or connection ownership.
- Introduce production authority, quarantine state, viewer projection, imported baselines, or new dependencies.
- Hold an asynchronous callback open inside a `better-sqlite3` transaction.
- Add a production-only timing or fault-injection hook.

## Decisions

### D1 — Verified open owns one synchronous deferred read transaction

`openVerifiedSQLiteEventJournal` will require an idle borrowed connection, construct the verifying adapter, and execute a synchronous snapshot verifier through `db.transaction(...).deferred()`. The public factory may remain `async` for compatibility, but the transaction callback returns `void` and contains no `await`, promise, timer, I/O, or application callback.

```ts
if (db.inTransaction) failClosed('Verified opening requires an idle handle');
const journal = new VerifyingSQLiteEventJournal<TPayload>(db, now);
db.transaction(() => journal.verifyStorageSnapshot()).deferred();
return journal;
```

`BEGIN DEFERRED` is chosen because verification is read-only and WAL permits a concurrent writer to commit while the reader retains its earlier snapshot. `BEGIN IMMEDIATE` was rejected because it unnecessarily claims the writer slot. Manual `BEGIN`/`COMMIT` was rejected because the driver already owns rollback/release behavior and warns against mixing manual and managed transactions. SQLite snapshot-extension APIs were rejected because an ordinary read transaction already supplies the required in-process snapshot without a new native capability.

### D2 — Recovery uses synchronous storage readers inside the snapshot

The verifying subclass will replace promise-returning recovery calls with private synchronous helpers that query the same high-water, event, head, receipt, entity-reference, and causation tables while the transaction is active. It may reuse the existing protected event hydrator and canonicalizers, but it will not duplicate append logic or widen the public `IEventJournal` interface.

The snapshot verifier will preserve the existing order and invariants:

1. SQLite quick check and foreign-key check.
2. Committed high-water plus unique/max position accounting.
3. Full ordered event hydration, canonical digest verification, and contiguous stream chains.
4. Exact stream-head agreement.
5. Exact command-receipt membership, ranges, principals, and canonical command identity.

All thrown SQLite, schema, canonicalization, or invariant errors leave the managed transaction before the factory returns a typed `SQLiteEventJournalRecoveryError`. The factory never returns a partially verified adapter.

### D3 — Reject pre-existing transactions instead of silently using a savepoint

`better-sqlite3` turns a nested managed transaction into a savepoint. Verified open must own the read-snapshot boundary, so it will reject an already-active borrowed handle before issuing integrity reads. It will not commit or roll back the caller's transaction. This prevents a stale caller-owned snapshot from being mistaken for a newly verified durable state.

### D4 — Prove the race with two real connections and no production hook

The file-backed test will open a reader and writer connection to the same temporary WAL database. It will instrument the reader's known first high-water statement once; immediately after that statement pins/observes the read snapshot, the writer connection commits a complete command batch synchronously. The production verifier receives no timing callback.

The test must prove:

- a commit completed after snapshot capture does not create a hybrid read or false corruption result;
- a fresh verified open after that commit sees the complete post-commit state;
- the same snapshot boundary still rejects genuine corruption;
- `db.inTransaction` is false after factory-owned success and failure, and the writer slot remains usable;
- an already-active caller transaction is rejected without being ended by the factory.

## Risks / Trade-offs

- [Synchronous full-history verification can hold a read snapshot for a long time] → Keep this wave correctness-only, retain the existing full scan, and let the later checkpoint/replay wave own bounded startup optimization.
- [WAL checkpointing can wait behind a long reader] → End the read transaction before returning the adapter and add explicit transaction-release assertions.
- [Statement instrumentation could make the race test brittle] → Match the stable high-water SQL boundary exactly, assert the interleaving fires once, and keep the hook entirely in the test.
- [A nested caller transaction could hide newer commits] → Reject non-idle handles before verification without changing caller-owned state.

## Migration Plan

1. Land this declarative Wave 1.5 change and exact-main receipt.
2. Implement the synchronous snapshot verifier and focused two-connection tests in one sub-500-line PR.
3. Run the durable recovery/conformance lane, complete journal/migration lane, Node/ABI/SQLite checks, typecheck/lint/format, strict OpenSpec/QC, and independent integrity review.
4. Merge with the reviewed head SHA, rerun exact-main recovery proof, then remove the implementation worktree/junction and prune local/remote refs.
5. Only then unblock replay/privacy/adoption implementation waves.

Rollback removes the unwired recovery refactor and tests; it does not delete or rewrite journal rows, migrations, or other persisted state.

## Open Questions

None. Checkpoint-based startup optimization remains owned by `add-replay-schema-and-checkpoint-safety`; production adoption remains owned by the combat and campaign leaves.

## References

- [SQLite transaction isolation](https://www.sqlite.org/isolation.html) documents the stable read snapshot retained while a WAL read transaction is active.
- [`better-sqlite3` transaction API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#transactionfunction---function) documents deferred transactions and the prohibition on asynchronous transaction callbacks.
