## Context

Campaign synchronization derives typed event batches but uses an in-memory store and applies/broadcasts events individually. Snapshot persistence has a useful compare-and-set boundary, while replay then subscribe can miss a live event. This wave adopts the journal for campaign streams after the foundation and replay-safety waves.

## Goals / Non-Goals

**Goals:**

- Durable atomic campaign commands and restart recovery.
- Snapshot parity during migration, then one write authority per campaign.
- Stable instance lineage across customization, force, mission, combat preparation, and later sessions.
- Gap-free catch-up/live synchronization.

**Non-Goals:**

- CRDT merge of transactional state, branch rewind, combat-outcome receipts, or broad campaign UI redesign.

## Decisions

### D1 — Campaign stream owns transactional campaign state

`campaign/<campaignId>` owns funds, roster/force membership, campaign-local unit/pilot instances, chronology, mission lifecycle, and readiness facts. Canonical unit designs remain source references; the durable customized unit instance keeps its own identity and accepted configuration snapshot/reference.

### D2 — Snapshots become materialized projections

The existing campaign snapshot remains readable and is written from committed journal batches during shadow validation. Cutover is per campaign and persists one migration state:

```ts
type CampaignAuthorityMigrationState =
  | "legacy"
  | "shadowing"
  | "journal"
  | "blocked";
```

The cutover marker records the imported source snapshot revision/digest, root branch, baseline event/revision, projector version, deterministic schema/upcaster-pipeline fingerprint, and first journal-authority command if one exists. Legacy `CampaignSnapshotPublished` events remain readable for old logs but become derived checkpoint/materialization output; journal-authoritative campaigns do not append them as mutation authority. There is never dual authority.

Every materialized snapshot binds the same schema-pipeline fingerprint. Recovery MUST discard and rebuild a snapshot before fan-out when its fingerprint differs from the registered replay pipeline, even if its projector version and stored digest still match.

### D3 — Batch commit and digest verification before fan-out

The host validates a stable command ID and expected campaign revision, derives the whole event batch plus expected post-state digest, and atomically appends both. It then applies the committed batch to the campaign projection and compares the applied digest with the committed expected digest before fan-out. Partial funds/roster/personnel commands are impossible.

If the applied digest differs, the host publishes no success, quarantines the process-local projection, and rebuilds it from the durable journal. It never deletes or compensates the committed batch.

### D4 — High-water replay/live handshake

The server establishes a buffered subscription and captures a durable high-water position through one coordinated boundary in which buffering is active before the head is observed. It sends the authorized baseline/tail through that mark, then drains contiguous buffered events above the mark while deduplicating overlap. Clients persist the highest contiguous applied delivery cursor and reject gaps or identity collisions.

Viewer projection occurs before serialization. Zustand stores are disposable client projections and cannot establish ownership or authority.

## Risks / Trade-offs

- [Snapshot and journal disagree during shadowing] → Block cutover, retain the legacy authority, and preserve both evidence digests.
- [Committed projection diverges] → Block fan-out, quarantine the process-local projection, and rebuild from the durable journal without deleting the commit.
- [Large imported baseline obscures older history] → Label it truthfully and never synthesize events that were not recorded.
- [Catch-up buffering grows] → Bound queues and transition a lagging client to resync without blocking healthy clients.
- [Entity IDs drift across layers] → Add explicit entity-reference contract tests through customization, campaign, force, mission, and reload.

## Migration Plan

1. Add durable campaign adapter and atomic batch tests.
2. Import fixture campaigns as explicit baselines.
3. Shadow-project journal events beside snapshots and compare digests.
4. Add replay/live cursor handshake and restart tests.
5. Cut over new campaigns, then eligible existing campaigns individually.
6. Preserve a schema-compatible snapshot reader for rollback.

Rollback stops new campaign command admission and leaves journal history intact. Snapshot-authority rollback is permitted only while the journal head still equals the imported baseline and no journal-authority command has committed. After the first journal-authority command, the system may use a compatible journal reader or enter `blocked`, but it SHALL NOT silently fall back to a legacy snapshot that cannot reproduce the active head.

## Open Questions

None; post-combat cross-stream effects and correction branches remain dependent changes.
