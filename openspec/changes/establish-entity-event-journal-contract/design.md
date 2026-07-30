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
  causationEventIds: readonly string[];
  actorId: string;
  authorityId: string;
  occurredAt: string;
  recordedAt: string;
  canonicalizerVersion: number;
  previousStreamEventDigest: string | null;
  eventDigest: string;
  payload: TPayload;
  entityRefs: readonly IEntityEventRef[];
}
```

Domain reducers keep their current payload unions. The envelope owns storage and provenance concerns. This avoids forcing combat, campaign, vault, and audit semantics into one reducer.

`IEventJournal` is a server-internal/raw persistence boundary. Transport, timeline, replay UI, snapshot, and export code must use a separate authorization and viewer-projection service introduced before production cutover; they may not serialize raw journal rows.

### D2 — SQLite is the first adapter; PostgreSQL and KurrentDB are triggers

The SQLite adapter uses one database transaction, `BEGIN IMMEDIATE` where required by the existing driver boundary, unique constraints for event/command identity, and a head row updated with expected revision. SQLite matches the current embedded/Electron/server topology and supports concurrent readers with one writer. PostgreSQL becomes the next adapter only when multiple server processes must write the same aggregate. KurrentDB is reconsidered only when durable subscription fleets, high event throughput, or separate event-store operations justify another service.

`commitPosition` is a unique monotonically increasing observation cursor assigned through a deliberately short store-level coordination point. It may contain allocation or rollback gaps and is not an optimistic-lock head. An adapter must not expose a high-water cursor that can skip an in-flight lower position. This small ordering seam is accepted because a reliable cross-stream catch-up cursor cannot also be coordination-free. Stream validation and domain decisions remain independent.

Automerge/Yjs remain appropriate for collaborative vault/design documents, not funds, ownership, combat, or campaign chronology. Temporal/DBOS remain possible workflow adjuncts, and Kafka/Redpanda remain possible distribution layers; none owns game history.

### D3 — One owner stream, many immutable entity links

An event is stored once. A link table indexes `(entityType, entityId, eventId, role)` for history queries. Entity identity is a durable domain ID, not a content hash or display name. Raw entity-history reads remain server-internal. `commitPosition` orders observations across streams but never becomes a caller-supplied expected head; `streamRevision` is the concurrency and replay order inside one stream/branch.

### D4 — Stores assign contiguous revisions atomically

The expected head is keyed by `(streamType, streamId, branchId)`. Wave 1 supports only a deterministic `root` branch. The empty head is revision 0, the first event is revision 1, and callers provide `expectedBranchId`, `expectedRevision`, and an ordered event batch without final revisions. The adapter verifies the head, inserts the receipt, assigns contiguous stream revisions and unique observation positions, inserts links, and updates the head in one transaction. A retry with the same command identity and identical digest returns the prior receipt; a collision with different content fails.

Zustand remains a UI/read-model layer and never allocates authoritative revisions.

### D5 — Integrity starts with the first stored event

Each stored event carries a server-computed cryptographic digest and the prior event digest within the same `(streamType, streamId, branchId)`. The root branch genesis event uses a null predecessor. A batch computes the chain in command order, and the adapter validates the current head digest before commit. Later replacement branches anchor their first suffix event to an explicitly verified parent/base digest; no later wave may retrofit unverifiable ancestry. Digests prove integrity only and never authenticate or authorize a principal.

Canonicalizer v1 is RFC 8785 JSON Canonicalization Scheme applied to UTF-8 bytes of a digest material object containing every immutable envelope field except `eventDigest`. It includes `canonicalizerVersion` and `previousStreamEventDigest`; preserves payload-array order; sorts the set-like `entityRefs` by `(entityType, entityId, role)` and `causationEventIds` lexicographically before canonicalization; uses RFC 8785 property ordering, JSON string escaping, and ECMAScript finite-number serialization; performs no Unicode normalization; and rejects non-finite numbers, unsupported values, duplicate set entries, or values that cannot be represented by the version. SHA-256 over those bytes is encoded as lowercase hexadecimal. A new canonicalizer version requires new fixtures and never rewrites prior rows.

## Risks / Trade-offs

- [Application owns projection and upcast plumbing] → Keep the foundation narrow and add separate conformance/replay waves before authority cutover.
- [SQLite permits only one writer] → Partition concurrency by short transactions now; promote to PostgreSQL when topology requires multi-process writers.
- [Entity links can become high-cardinality] → Index by entity and commit position, keep roles closed/typed, and benchmark representative histories.
- [Global observation ordering adds coordination] → Keep allocation transactional and minimal, permit gaps, and promote the adapter only with a proven high-water implementation.
- [A generic envelope becomes a dumping ground] → Require one domain owner stream and retain typed domain payload unions.

## Migration Plan

1. Add types, runtime schemas, error taxonomy, and in-memory reference adapter.
2. Add the shared conformance suite.
3. Add additive SQLite tables and adapter behind tests only.
4. Prove atomicity, no-gap stream ordering, observation-cursor safety, idempotency, integrity chaining, entity queries, and restart behavior.
5. Keep all existing production stores authoritative until a later adoption change passes shadow parity.

Rollback removes unused adapter wiring while preserving additive empty tables. No history is deleted.

## Open Questions

- Promote to PostgreSQL when a deployment requires concurrent writers to the same aggregate or server instances cannot share one SQLite file.
- Reconsider KurrentDB only with measured subscription/throughput/operations needs; domain branch and privacy rules remain application-owned either way.
