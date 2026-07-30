## Context

MekStation currently has a process-local generic event service, per-match gameplay events, a typed in-memory campaign ledger, snapshot-oriented campaign persistence, unit version history, and CRDT-backed vault collaboration. These mechanisms solve different problems but do not share an append, identity, ordering, or retention contract. The foundation must fit the existing TypeScript and `better-sqlite3` stack, remain portable to PostgreSQL, and avoid a second service before scale requires one.

This design implements the `event-store` delta only. Later waves adopt combat and campaign authority.

## Goals / Non-Goals

**Goals:**

- One small TypeScript contract reused by domain-specific event payload unions.
- One physical authoritative event in one owning stream, with indexed entity links for cross-entity history.
- Atomic command batches with expected stream revision and idempotent receipts.
- A conformance suite that every adapter must pass.
- SQLite first, with SQL/data semantics that remain portable to PostgreSQL.

**Non-Goals:**

- A universal reducer, global write head, broker, workflow engine, CRDT merge, or new UI.
- Production authority cutover.
- Branch activation, replay upcasting, checkpoints, or side-effect delivery.

## Decisions

### D1 — Use a portable `IEventJournal`, not the existing singleton

```ts
interface IEventJournal {
  append(input: IAppendEventBatch): Promise<ICommittedEventBatch>;
  readStream(query: IReadStreamQuery): Promise<IStoredEvent[]>;
  readEntityHistory(query: IReadEntityHistoryQuery): Promise<IStoredEvent[]>;
  getCommandReceipt(commandId: string): Promise<ICommandReceipt | null>;
}

interface IStoredEvent<TPayload = unknown> {
  eventId: string;
  streamType: string;
  streamId: string;
  branchId: string;
  streamRevision: number;
  commitPosition: number;
  commandId: string;
  commandIndex: number;
  eventType: string;
  eventVersion: number;
  correlationId: string;
  causationId: string | null;
  actorId: string;
  authorityId: string;
  occurredAt: string;
  recordedAt: string;
  payload: TPayload;
  entityRefs: readonly IEntityEventRef[];
}
```

Domain reducers keep their current payload unions. The envelope owns storage and provenance concerns. This avoids forcing combat, campaign, vault, and audit semantics into one reducer.

### D2 — SQLite is the first adapter; PostgreSQL and KurrentDB are triggers

The SQLite adapter uses one database transaction, `BEGIN IMMEDIATE` where required by the existing driver boundary, unique constraints for event/command identity, and a head row updated with expected revision. SQLite matches the current embedded/Electron/server topology and supports concurrent readers with one writer. PostgreSQL becomes the next adapter only when multiple server processes must write the same aggregate. KurrentDB is reconsidered only when durable subscription fleets, high event throughput, or separate event-store operations justify another service.

Automerge/Yjs remain appropriate for collaborative vault/design documents, not funds, ownership, combat, or campaign chronology. Temporal/DBOS remain possible workflow adjuncts, and Kafka/Redpanda remain possible distribution layers; none owns game history.

### D3 — One owner stream, many immutable entity links

An event is stored once. A link table indexes `(entityType, entityId, eventId, role)` for history queries. Entity identity is a durable domain ID, not a content hash or display name. `commitPosition` orders observations across streams but never serializes unrelated writers; `streamRevision` is the concurrency and replay order inside one stream/branch.

### D4 — Stores assign contiguous revisions atomically

Callers provide `expectedRevision` and an ordered event batch without final revisions. The adapter verifies the head, inserts the receipt, assigns every contiguous revision/commit position, inserts links, and updates the head in one transaction. A retry with the same command identity and identical digest returns the prior receipt; a collision with different content fails.

Zustand remains a UI/read-model layer and never allocates authoritative revisions.

## Risks / Trade-offs

- [Application owns projection and upcast plumbing] → Keep the foundation narrow and add separate conformance/replay waves before authority cutover.
- [SQLite permits only one writer] → Partition concurrency by short transactions now; promote to PostgreSQL when topology requires multi-process writers.
- [Entity links can become high-cardinality] → Index by entity and commit position, keep roles closed/typed, and benchmark representative histories.
- [A generic envelope becomes a dumping ground] → Require one domain owner stream and retain typed domain payload unions.

## Migration Plan

1. Add types, runtime schemas, error taxonomy, and in-memory reference adapter.
2. Add the shared conformance suite.
3. Add additive SQLite tables and adapter behind tests only.
4. Prove atomicity, no-gap ordering, idempotency, entity queries, and restart behavior.
5. Keep all existing production stores authoritative until a later adoption change passes shadow parity.

Rollback removes unused adapter wiring while preserving additive empty tables. No history is deleted.

## Open Questions

- Promote to PostgreSQL when a deployment requires concurrent writers to the same aggregate or server instances cannot share one SQLite file.
- Reconsider KurrentDB only with measured subscription/throughput/operations needs; domain branch and privacy rules remain application-owned either way.
