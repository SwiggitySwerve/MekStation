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
  captureHighWater(): Promise<IJournalHighWater>;
  readCommitted(query: IReadCommittedQuery): Promise<ICommittedReadPage>;
  getCommandReceipt(commandId: string): Promise<ICommandReceipt | null>;
}

interface IJournalHighWater {
  commitPosition: number;
}

interface IReadCommittedQuery {
  afterCommitPosition: number; // non-negative safe integer
  throughCommitPosition: number; // safe integer >= afterCommitPosition
  limit: number; // safe integer in [1, 500]
}

interface ICommittedReadPage {
  events: readonly IStoredEvent[];
  nextAfterCommitPosition: number;
  exhausted: boolean;
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
  actorKind: "human" | "system" | "migration";
  actorId: string;
  authorityType: string;
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

`actorKind` and `actorId` identify the human, admitted server process, or migration principal that initiated the accepted command. `authorityType` and `authorityId` identify the server-owned command-authority instance that performed admission and committed the batch, such as a match host, campaign host, or migration importer. Authority identity is provenance, not a role, membership, owning entity, or authorization token. Append callers receive a resolved server-internal principal; transport/client DTOs never assign the stored actor/authority fields. Later privacy and effect waves define how human membership and admitted system effects mint those principals.

`IEventJournal` is a server-internal/raw persistence boundary. Transport, timeline, replay UI, snapshot, and export code must use a separate authorization and viewer-projection service introduced before production cutover; they may not serialize raw journal rows.

### D2 — SQLite is the first adapter; PostgreSQL and KurrentDB are triggers

The SQLite adapter uses one database transaction, `BEGIN IMMEDIATE` where required by the existing driver boundary, unique constraints for event/command identity, and a head row updated with expected revision. SQLite matches the current embedded/Electron/server topology and supports concurrent readers with one writer. PostgreSQL becomes the next adapter only when multiple server processes must write the same aggregate. KurrentDB is reconsidered only when durable subscription fleets, high event throughput, or separate event-store operations justify another service.

`commitPosition` is a unique monotonically increasing, store-local observation cursor assigned through a deliberately short store-level coordination point. It may contain allocation or rollback gaps and is not an optimistic-lock head, domain chronology, or causal order. `captureHighWater()` returns a boundary only after every transaction that could publish a position at or below that boundary is committed or rolled back. `readCommitted()` requires non-negative safe-integer cursors with `afterCommitPosition <= throughCommitPosition` and a safe-integer limit from 1 through 500. It returns events in ascending position greater than the exclusive prior cursor and no greater than that captured boundary. A non-exhausted page advances to its last returned position; an exhausted page advances to the requested boundary even when numeric gaps exist. A later commit can never appear at or below an already returned boundary. Invalid cursors or limits reject without reading. This small ordering seam is accepted because reliable cross-stream catch-up cannot also be coordination-free. Stream validation and domain decisions remain independent, so the system still has no global domain-authority head.

Automerge/Yjs remain appropriate for collaborative vault/design documents, not funds, ownership, combat, or campaign chronology. Temporal/DBOS remain possible workflow adjuncts, and Kafka/Redpanda remain possible distribution layers; none owns game history.

### D3 — One owner stream, many immutable entity links

An event is stored once. A link table indexes `(entityType, entityId, eventId, role)` for history queries. Entity identity is a durable domain ID, not a content hash or display name. Raw entity-history reads remain server-internal. `commitPosition` orders observations across streams but never becomes a caller-supplied expected head; `streamRevision` is the concurrency and replay order inside one stream/branch.

### D4 — Stores assign contiguous revisions atomically

The expected head is keyed by `(streamType, streamId, branchId)`. Wave 1 supports only a deterministic `root` branch. The empty head is revision 0, the first event is revision 1, and trusted callers provide `expectedBranchId`, `expectedRevision`, a resolved server principal, and an ordered event batch without stored actor/authority fields or final revisions. The adapter verifies the head, inserts the receipt, assigns provenance, contiguous stream revisions, and unique observation positions, inserts links, and updates the head in one transaction. A retry with the same command identity and identical digest returns the prior receipt; a collision with different content fails.

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

1. Add contract types, provenance semantics, runtime schemas, and typed errors.
2. Add canonicalizer v1 plus published byte/digest fixtures.
3. Add the shared conformance suite and in-memory reference adapter.
4. Add additive SQLite tables and adapter behind tests only.
5. Prove atomicity, no-gap stream ordering, bounded observation-cursor safety, idempotency, integrity chaining, entity queries, and restart behavior.
6. Keep all existing production stores authoritative until a later adoption change passes shadow parity.

Rollback removes unused adapter wiring while preserving additive empty tables. No history is deleted.

## Open Questions

- Promote to PostgreSQL when a deployment requires concurrent writers to the same aggregate or server instances cannot share one SQLite file.
- Reconsider KurrentDB only with measured subscription/throughput/operations needs; domain branch and privacy rules remain application-owned either way.
