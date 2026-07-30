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

The existing campaign snapshot remains readable and is written from committed journal batches during shadow validation. Cutover is per campaign: legacy snapshots are imported as `CampaignImportedBaseline`, then all new semantic commands append to the journal. There is never dual authority.

### D3 — Batch commit before projection and fan-out

The host validates a stable command ID and expected campaign revision, derives the whole event batch, atomically appends it, then applies the committed batch to the campaign projection and viewers. Partial funds/roster/personnel commands are impossible.

### D4 — High-water replay/live handshake

The server captures a durable high-water position, establishes buffering/subscription, sends the authorized baseline/tail through that mark, then drains contiguous buffered events. Clients persist the highest contiguous applied delivery cursor and reject gaps or identity collisions.

Viewer projection occurs before serialization. Zustand stores are disposable client projections and cannot establish ownership or authority.

## Risks / Trade-offs

- [Snapshot and journal disagree during shadowing] → Block cutover, retain the legacy authority, and preserve both evidence digests.
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

Rollback stops new campaign command admission, leaves journal history intact, and returns affected campaigns to a compatible reader only when no ambiguous post-cutover writes exist.

## Open Questions

None; post-combat cross-stream effects and correction branches remain dependent changes.
