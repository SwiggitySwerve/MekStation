# Design: Campaign Authority and Synchronization

## Context

Live evidence (2026-08-07 visual audit): campaigns are browser-local — a fresh browser context gets "Campaign not found" on every campaign deep link. The runtime store is Zustand `persist` (`src/stores/campaign/useCampaignStore.ts` → `clientSafeStorage`); the server-side `CampaignPersistenceService` + `/api/campaigns/*` exist but act as an optional save path, not the home. Meanwhile the repo already contains the three hard pieces this design needs: a canonical, hash-chained SQLite event journal (`src/lib/events/journal/` — stream type/id, branch id, stream revision, commit position, canonical command identity, actor/authority columns, `previous_stream_event_digest` → `event_digest` chaining, fsync semantics, recovery), a server-authoritative co-op sync spec (`coop-campaign-sync`: intent → validate → commit → broadcast, host-as-GM, player-safe projections, snapshot hydration), and a WebSocket upgrade path plus vault-identity token minting on the multiplayer surface. The user direction: campaign state lives on the server; a share function creates many shared instances from one source; shared instances know they are not the source; they see the whole history from a less-permissive perspective; the GM sees everything; out-of-scope events are never even delivered.

## Goals / Non-Goals

- Goals: one authoritative home per campaign (source instance on a server); durable append-before-acknowledge so the source never loses state; durable replicas on consuming devices ("each downstream device has its own kind of server"); grants with scope-filtered event delivery (filtering at the source, never client-side hiding); GM full view; late-join backfill of the full in-scope history; tamper-evident streams end to end.
- Non-Goals: CRDT/peer-merge state (explicitly forbidden by `coop-campaign-sync`); multi-master writes; cross-server campaign migration protocols (a future change; the identity model leaves room); vault synchronization (the vault stays personal — `design-vault-campaign-separation-and-maps` governs vault→campaign copies); combat-session transport (the match/mission layer keeps its existing socket protocol).

## Decisions

### D1 — The campaign stream lives in the existing SQLite event journal; no new log technology
Campaign mutations append to the canonical journal with `streamType: 'campaign'`, `streamId: <campaignId>`, `branchId: 'main'` (branching reserved for future what-if forks, matching the journal's existing column). The journal's canonicalizer, command identity, digest chaining, fsync and recovery semantics are reused as-is. Rationale: the journal already implements exactly the "git-tree of tracked changes over time" model (hash-chained, branch-capable, replayable) and is battle-tested by its own suites; a second log would violate simplest-solution and single-source-of-truth. Alternative rejected: bespoke campaign log tables (duplicate infrastructure, no chain verification).

### D2 — Authority metadata on the instance record: `source` or `replica`, never silent
The campaign record gains `authority: { role: 'source' } | { role: 'replica', sourceInstanceId, grantId, scopes, revokedAt? }` plus a stable `instanceId` for every hosting server. Commands execute only where `role === 'source'`; replicas hard-guard local mutation (reusing the mirror append guard) and forward intents. Rationale: the user's requirement that shared instances "know they are not the direct source" must be a stored, surfaced fact, not an inference from connection state.

### D3 — Scope is stamped on every event at emission and is part of the canonical bytes
Event payload envelope gains `scope: 'gm' | 'campaign' | 'team:<id>' | 'player:<participantId>'`, chosen by the emitting domain action (day advance → `campaign`; GM-authored hidden opportunity → `gm`; a lance's private orders → `team:`/`player:`). Because scope is inside the canonicalized payload it is digest-protected; reclassification is a new revelation event referencing the original, never an edit. Rationale: filtering can only be trustworthy if the classification is immutable and the GM can audit it. Alternative rejected: scope lookup tables outside the event (mutable, unauditable, race-prone).

### D4 — Per-grant projection at the source: filter, renumber, re-chain
For each grant the source maintains a projection cursor over the campaign stream. Delivery = events whose scope ∈ grant.scopes, assigned a contiguous per-grant sequence and a per-grant digest chain (`prevGrantDigest` → `grantDigest`, computed over the projected event bytes + grant id). Out-of-scope events are simply absent — no stubs, no gaps in the per-grant numbering, no global positions on the wire — so a consumer cannot count or time withheld activity, yet can verify completeness/integrity of its own stream. GM grants carry the all-scopes set and receive the raw stream (global revisions + original chain). Rationale: per-scope contiguity is the only way to satisfy both "verifiable" and "no leakage" simultaneously.

### D5 — Transport: a campaign sync channel on the existing WS upgrade path, authenticated by grant token
The share function mints a grant token (signed with the existing vault-identity machinery already used by multiplayer). A replica connects to the source's `/api/multiplayer/socket` (campaign channel) presenting `{campaignId, grantId, token, cursor}`; the source streams backfill from the per-grant sequence after `cursor`, then live events. Heartbeat + reconnect follow the existing socket conventions. Rationale: one socket surface, one identity system; the `coop-campaign-sync` transport requirements already bind to this path. Alternative rejected: HTTP polling (loses ordering/latency), new port (packaging complexity).

### D6 — Replica durability: the consuming device's own server persists the scoped stream
The replica device's server process stores received events in its local journal under `streamType: 'campaign-replica'`, `streamId: <campaignId>#<grantId>`, preserving the per-grant chain, and projects UI state from it. Offline: reads work from the local store; mutation intents are disabled (not queued in v1 — a queued-intent inbox is a future extension listed in Open Questions). Browser Zustand persistence remains only as a render cache keyed by `(instanceId, revision)` per campaign-authority. Rationale: this is the user's "each downstream device has its own kind of server," and it makes late-join backfill a one-time cost.

### D7 — Ordering, idempotence, and loss: durable-append-then-broadcast, apply-by-sequence
Source ordering: journal append (fsync) → acknowledge submitter → fan out to grant projections. Replica apply is idempotent by per-grant sequence; duplicates are dropped; out-of-order delivery triggers cursor re-request. A downstream failure can never affect the source stream (one-way data flow). Snapshots (`CampaignSnapshotPublished`, scope-filtered per D4) are an optimization baseline every N events so late joiners avoid unbounded replay; the spec requires them to be equivalent to replaying the scoped stream.

### D8 — Legacy adoption: one-time import of browser-persisted campaigns
On first load after cutover, browser-persisted campaigns are offered for adoption: the client uploads the serialized campaign; the server creates the source instance with a synthetic `campaign-adopted` genesis event (carrying the imported projection digest), and the browser copy is demoted to cache. Unadopted copies remain readable but clearly labeled unshareable/legacy. Rationale: the audit found real campaigns already live in browsers; stranding them would destroy user state — the same "never lose state" principle applied backward.

### D9 — GM view is a grant property, not a hosting property
The GM's full view comes from holding the all-scopes grant. Usually the GM hosts the source, but a GM connecting from another device gets a full-scope replica — same mechanism, no special path. Host-as-GM arbitration from `coop-campaign-sync` is unchanged: commands still commit at the source.

## Risks / Trade-offs

- **Scope misclassification leaks**: a domain action stamping too-wide a scope leaks information permanently (streams are immutable). Mitigation: scope vocabulary is closed; emission sites are enumerated at implementation time with a QC sweep asserting every campaign event constructor names a scope; GM audit surface shows scope per event.
- **Per-grant chains add storage/compute at the source**: one cursor + rolling digest per grant is O(grants) and trivial at tabletop scale (units of grants, not thousands). Accepted.
- **Snapshot/stream equivalence drift**: mitigated by requiring snapshot content to be derived by replaying the scoped stream (the projection function is shared), plus a verification task.
- **Offline replicas cannot act**: accepted for v1 (matches "replicas are source-bound"); queued intents deferred.
- **Adoption imports state without event history**: adopted campaigns begin their chain at the genesis event; pre-adoption history is a single opaque baseline. Accepted and labeled in UI.

## Migration Plan

1. Server-authoritative cutover for new campaigns (creation writes the source instance + genesis event; deep links resolve server-side).
2. Adoption flow for legacy browser campaigns (D8).
3. Grants + share function + replica instantiation (durable replica store, replica identity surfaces).
4. Scoped projection + per-grant chains + scoped snapshot hydration (upgrading the co-op mirror path in place).
5. Cache demotion: Zustand persist keyed by instance/revision, validated against stream head.

## Open Questions

- Queued offline intents from replicas (an inbox the source drains on reconnect) — deferred; requires conflict UX.
- Cross-server source migration (moving a source to another device) — identity model reserves `instanceId` lineage; protocol deferred.
- Whether team scopes need hierarchical containment (`team ⊂ campaign`) or stay flat — flat in v1.
- Branching (`branchId ≠ main`) for GM what-if forks of campaign state — the journal supports it; product design deferred.
