## Context

The Replay Viewer Bundle (PRs #541–#547, archived 2026-05-07) shipped end-to-end frame-by-frame playback from any swarm `.jsonl`, including a 5th-tab in-page panel for quick games. **Discoverability is now the bottleneck**: 1000+ swarm runs sit on disk under `simulation-reports/games/<ts>/<gameId>.jsonl`, the user can't tell quick games from PvP from campaign without reading filenames, and there is no in-app catalog short of dragging files in.

The `simulation-reports/` directory today contains only swarm CLI output (flat layout). Quick games run in-memory and die with the React tree. PvP runs against `InMemoryMatchStore` (dev-only). Campaign event emission isn't wired yet. Every replay source is on a different lifecycle and persistence trajectory — the architecture must accommodate that asymmetry without coupling them.

The OMO Council convened on this question and ruled **Option C (hybrid)** with three load-bearing clarifications:
1. Discriminator is primary (per K8s GVK + sc2reader's 7-year deprecation lesson)
2. Filesystem partition is secondary (cheap win for per-source lifecycle isolation)
3. Central index is the search primitive

Council synthesis lives inline in the conversation that authored this change; key cited evidence: Kubernetes GVK `kind` field, sc2reader's 7-year string-discriminator deprecation, OpenDota `lobby_type` enum, OpenTelemetry Signal model, Temporal EventType, MekStation's existing `EventCategory` discriminator pattern on every `IGameEvent`.

## Goals / Non-Goals

**Goals:**
- Every event carries a `replaySource: ReplaySource` envelope field that survives schema evolution and serializes cleanly through NDJSON
- Filesystem layout partitions by source so per-source GC, retention, and archival are independent operations
- A single `replay-index.json` is the only thing the Replay Library page reads — no walking the filesystem from the UI
- Quick games persist on completion (today they don't)
- Swarm runs continue to work without behavior change beyond the partition path
- One-time backfill scan covers pre-existing flat `simulation-reports/games/<ts>/*.jsonl` so users keep their history
- PvP and Campaign sources are reserved in the enum and have manifest entry shapes pre-defined so future write paths plug in without spec churn

**Non-Goals:**
- PvP durable persistence — `InMemoryMatchStore` replacement is its own change
- Campaign event emission — campaign mode doesn't emit events yet; that's a separate wiring change
- Replay deletion / archival policy / retention windows — out of scope; users delete files manually for v1
- Multi-machine replay sync (cloud, share-link, etc.) — out of scope
- Replay search by event content (e.g., "find replays where Atlas killed Marauder") — index covers structural metadata only

## Decisions

### Decision 1: Envelope field name is `replaySource`, not `source`
**Choice:** Add `replaySource: ReplaySource` to `IBaseEvent`.
**Rationale:** Several existing event payloads already carry a `source` string (heat events: `"movement"|"weapons"|"dissipation"`; pilot-hit events: `"head_hit"|"ammo_explosion"|...`). An envelope-level `source` would shadow conceptually even though TypeScript wouldn't conflict. `replaySource` is unambiguous at any nesting depth.
**Alternatives considered:** `source` (rejected — naming collision with payload semantics); `originKind` (rejected — opaque); `category` (rejected — already exists as `EventCategory` on `IGameEvent`, would alias).

### Decision 2: `ReplaySource` is an enum, not a string union
**Choice:**
```ts
export enum ReplaySource {
  Swarm = 'swarm',
  Quick = 'quick',
  PvP = 'pvp',
  Campaign = 'campaign',
}
```
**Rationale:** sc2reader's 7-year deprecation pain came from a string discriminator that drifted as new replay sources were added with no exhaustiveness check. An enum forces every consumer to handle every variant or fail compilation. The string values match what's serialized to JSON, keeping NDJSON wire format human-readable.
**Alternatives considered:** string literal union `'swarm'|'quick'|'pvp'|'campaign'` (rejected — TypeScript narrows correctly but doesn't flag missing variants in switch statements without explicit `never` checks; enum + exhaustive switch is the codebase's existing pattern, e.g. `EventCategory`).

### Decision 3: Manifest entry is a discriminated union with one shape per source
**Choice:**
```ts
export interface IReplayManifestEntryBase {
  readonly id: string;             // gameId
  readonly replaySource: ReplaySource;
  readonly path: string;            // relative to simulation-reports/
  readonly createdAt: string;       // ISO timestamp
  readonly turns: number;           // events.length-derived if GameEnded.turns missing
  readonly winner: GameSide | null;
  readonly bvTotal: number;         // sum of unit BVs at GameCreated time
}
export interface ISwarmReplayManifestEntry extends IReplayManifestEntryBase {
  readonly replaySource: ReplaySource.Swarm;
  readonly configName: string;      // swarm config file name
  readonly seed: number;
  readonly batchTimestamp: string;  // groups runs from same `simulation-reports/games/<ts>/` cluster
}
export interface IQuickReplayManifestEntry extends IReplayManifestEntryBase {
  readonly replaySource: ReplaySource.Quick;
  readonly playerSide: GameSide;
  readonly aiVariant: string;
}
export interface IPvPReplayManifestEntry extends IReplayManifestEntryBase {
  readonly replaySource: ReplaySource.PvP;
  readonly opponentName: string;
  readonly matchId: string;
}
export interface ICampaignReplayManifestEntry extends IReplayManifestEntryBase {
  readonly replaySource: ReplaySource.Campaign;
  readonly campaignId: string;
  readonly missionId: string;
  readonly difficulty: string;
}
export type IReplayManifestEntry =
  | ISwarmReplayManifestEntry
  | IQuickReplayManifestEntry
  | IPvPReplayManifestEntry
  | ICampaignReplayManifestEntry;
```
**Rationale:** Each source has source-specific metadata users want to filter on (swarm: configName/seed; quick: aiVariant; pvp: opponent; campaign: mission). Discriminated union lets the UI render a different list-row template per source while sharing the base fields. Per Momus's MUST-RESOLVE: BV is computed at write time and stored on the entry — no lazy recompute on read.
**Alternatives considered:** flat entry with optional fields (rejected — type system can't enforce "swarm entries always have configName"); separate index files per source (rejected — defeats the unified-search goal).

### Decision 4: Filesystem layout is `simulation-reports/{swarm,quick,pvp,campaign}/<gameId>.jsonl`
**Choice:** four sibling directories under `simulation-reports/`. Central `simulation-reports/replay-index.json` next to them.
**Rationale:** Per-source lifecycle isolation (independent GC, retention, archival). Storage debugging is straightforward — `ls simulation-reports/quick/` answers "what quick games do I have?" Replaces today's flat `simulation-reports/games/<ts>/<id>.jsonl` for swarm output. Existing files covered by backfill scan.
**Alternatives considered:** keep flat with `replaySource` field at the start of each NDJSON file's first line (rejected — defeats per-source lifecycle); nest deeper with `simulation-reports/swarm/<batchTimestamp>/<id>.jsonl` (rejected for v1 — backfill becomes more complex; can be added later if swarm volume warrants).

### Decision 5: Index is regenerated on demand, not append-only
**Choice:** `replay-index.json` is regenerated by scanning the four partition directories. Writers append manifest entries during run completion, but the canonical index is rebuilt from disk if missing or stale.
**Rationale:** Keeps the index as a derivable artifact — corruption, stale entries, or hand-edits to the partition dirs all self-heal on next library load. Append-only with no rebuild path would force migration scripts for any layout drift.
**Alternatives considered:** append-only index with version field (rejected — version conflicts on parallel writers); SQLite-backed index (rejected — added dep for marginal win on local-only catalog).

### Decision 6: Quick-game write path goes through the same persistence module as swarm
**Choice:** `eventLogPersistence.ts` (already exists; today only swarm uses it) becomes the single write surface. `QuickGameResults` calls into it on encounter completion. Env-aware IO (Node `fs` for desktop builds; structured-storage equivalent for browser-only builds) abstracted behind one interface.
**Rationale:** One module, one set of tests, one source of truth for the partition path. Quick game and swarm differ only in which `IReplayManifestEntry` shape they emit.
**Alternatives considered:** separate `quickGamePersistence.ts` (rejected — duplicates partition + index-writer logic).

### Decision 7: Backfill scan runs on first library load and is idempotent
**Choice:** When the Replay Library page mounts, it reads `replay-index.json` if present. If absent, it scans `simulation-reports/games/<ts>/<id>.jsonl` (legacy flat) and `simulation-reports/{swarm,quick,pvp,campaign}/` (new partitioned), materializes manifest entries by streaming the first event of each file, and writes the index. Subsequent loads short-circuit on the existing index.
**Rationale:** No destructive migration. Users with 1000+ pre-existing swarm logs see them on first library open. The scan is bounded — one `IGameCreatedPayload` + one `IGameEndedPayload` read per file (or `events.length` derivation if the latter is missing).
**Alternatives considered:** explicit migration script (rejected — adds friction); never backfill, only catalog new runs (rejected — defeats discoverability for the user's existing corpus).

## Risks / Trade-offs

- **[Risk] Quick-game IO env split (Node vs browser).** Today's QuickGameResults runs entirely in-browser. **Mitigation:** abstract write surface behind `IReplayPersistence` interface; ship Node implementation in v1; browser-only builds get a no-op or IndexedDB-backed implementation in a follow-on.
- **[Risk] Backfill scan slow on large corpora.** Reading the first event of 1000+ files takes seconds. **Mitigation:** scan once, cache index; show a progress indicator on first library open. Scan is idempotent so partial completion isn't catastrophic.
- **[Risk] BV computation cost at manifest-write time.** Computing BV from `IGameUnit` data is non-trivial. **Mitigation:** BV is already computed by SimulationRunner before GameCreated emission for swarm; reuse that value. Quick game has BV from unit picker. PvP/campaign defer.
- **[Risk] `replay-index.json` corruption.** Manifest entries get out of sync with files on disk. **Mitigation:** idempotent rebuild path (Decision 5); index is a cache, not authoritative. If a user deletes a `.jsonl` manually, next load self-heals.
- **[Risk] Filesystem layout breaking change for existing tooling.** Anything pointing at `simulation-reports/games/<ts>/` breaks. **Mitigation:** legacy path remains readable by backfill scan. Writers move to partitioned layout. No symlinks (cross-platform pain). Scripts that consume the flat layout get a deprecation note + the new path in PR descriptions.
- **[Trade-off] PvP/Campaign manifest shapes pre-defined but unused in v1.** Risk of getting them wrong before real users arrive. **Mitigation:** the discriminated union design means a PR adding the PvP write path also adds tests against the entry shape; if the shape needs changes, those changes live in that PR not this one.

## Migration Plan

**Phase 1 (this change, single PR-ladder):**
1. Add `ReplaySource` enum + `replaySource` envelope field on `IBaseEvent`. Default value provided by event factories so call-site changes are bounded.
2. Implement `IReplayManifestEntry` discriminated union + index reader/writer in `src/replay-library/`.
3. Switch `eventLogPersistence.ts` to write under `simulation-reports/swarm/<gameId>.jsonl` for swarm runs and emit a `ISwarmReplayManifestEntry` to the index.
4. Add quick-game persistence write path; emit `IQuickReplayManifestEntry`.
5. Implement backfill scan; integrate into Replay Library page mount.
6. Build Replay Library page with list, source filter, click-to-open (reuses existing replay viewer via in-page mount or route).

**Rollback strategy:** the change is additive at the wire format layer (new envelope field with default fallback) and the flat-layout legacy files remain readable. Reverting the PR ladder leaves users with the new partitioned dirs in place but no library page; they can drag files back into the standalone replay viewer as before.

## Open Questions

- **Library page route**: `/replay-library` standalone vs nested under `/gameplay/replays`? Default: standalone, navigable from primary nav. Revisit if frontend nav refactor surfaces.
- **Index file location**: `simulation-reports/replay-index.json` (alongside partition dirs) vs `.replay-index.json` (hidden)? Default: visible; users may want to inspect or hand-edit during debugging.
- **First-class search**: text search over `configName`/`opponentName`/`missionId` is in scope; full-text search over event content is not. If users ask for "find replays with ammo explosions" we revisit with a separate event-content index.
