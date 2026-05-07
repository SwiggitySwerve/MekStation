## Why

We just shipped the Replay Viewer Bundle (PRs #541–#547) — drag any `.jsonl` into the standalone replay page or open the Quick-Game Replay tab and the battle plays back frame-by-frame on the hex map with timeline markers. But the **discoverability gap is now the limiting factor**: 1000+ swarm runs sit on disk under `simulation-reports/games/.../sim-N.jsonl`, the user can't tell quick games from PvP from campaign without filename archaeology, and there is no in-app way to find a specific replay short of dragging files in by hand.

The user's brief: "I don't want to drag files I want instant integration ability with existing logs." The architectural constraint: "Quick simulator stuff should be separately identifiable from campaign, also kept separately from PvP challenges, etc." The OMO Council ruled Option C (hybrid: discriminator + filesystem partition + central index) with the discriminator as the load-bearing primitive (per K8s GVK + sc2reader's 7-year deprecation lesson) and partition as a cheap secondary win for per-source lifecycle isolation.

## What Changes

- **NEW** `ReplaySource` enum on every `IBaseEvent` (values: `Swarm | Quick | PvP | Campaign`) — discriminator that survives schema evolution
- **NEW** `IReplayManifestEntry` discriminated union — one entry shape per source, written to a central `replay-index.json`
- **NEW** filesystem partition: `simulation-reports/{swarm,quick,pvp,campaign}/<gameId>.jsonl` (replaces today's flat `simulation-reports/games/<ts>/<id>.jsonl`)
- **NEW** Replay Library page — searchable list of all manifest entries, filter by source, click → existing replay viewer (no file drag)
- **NEW** quick-game write path — `QuickGameResults` page persists events on encounter completion (env-aware IO; today the stream lives in memory and dies with the React tree)
- **NEW** swarm-runner write path — `SimulationRunner` writes manifest entry + emits to `simulation-reports/swarm/...` (today writes to `simulation-reports/games/<ts>/...` flat)
- **NEW** index reader/writer + backfill scan for pre-existing `simulation-reports/games/.../*.jsonl` (one-time migration on first library load)
- **NEW** `ReplaySource.PvP` reserved in enum but write path **deferred** — `InMemoryMatchStore` is dev-only; manifest path skipped until durable PvP store lands
- **NEW** `ReplaySource.Campaign` reserved in enum but write path **deferred** — campaign emit isn't wired yet; manifest entry shape pre-defined so campaign mode can plug in without touching the contract

**BREAKING** filesystem layout change for swarm logs (existing logs covered by one-time backfill scan, no data loss).

## Capabilities

### New Capabilities
- `replay-library`: discriminated, searchable catalog of replays from every source — covers the `ReplaySource` enum, `IReplayManifestEntry` discriminated union, central `replay-index.json` reader/writer, backfill scan for legacy flat layout, and the in-app Replay Library page (list + filter + click-to-open)

### Modified Capabilities
- `game-event-system`: adds `source: ReplaySource` field to `IBaseEvent`; existing factories default to the runtime-provided source so call-site changes are bounded
- `quick-session`: adds quick-game persistence write path on `QuickGameResults` mount/finalize (today no write occurs); CLI Swarm Runner partitioning under `simulation-reports/swarm/` (today writes to `simulation-reports/games/<ts>/`)

## Impact

- **Code**: `src/types/gameplay/GameSessionInterfaces.ts` (`IBaseEvent.source`), `src/simulation/runner/eventLogPersistence.ts` (partition path), `src/simulation/runner/SimulationRunner.ts` (write `source: Swarm`), `src/components/quickgame/QuickGameResults.tsx` (write `source: Quick` on completion), new `src/replay-library/` module (manifest types + index reader/writer + backfill), new page route `/replay-library`, modify `src/components/audit/replay/JsonlFileLoader.tsx` to also accept "open from library" path
- **Filesystem**: `simulation-reports/{swarm,quick,pvp,campaign}/` directories; `simulation-reports/replay-index.json` central index file
- **Tests**: per-source write-path round-trip, backfill scan against fixture, manifest entry shape round-trip per discriminant, library page list/filter/open, enum exhaustiveness
- **Existing logs**: pre-existing `simulation-reports/games/<ts>/<id>.jsonl` covered by one-time backfill scan that materializes `IReplayManifestEntry` records; no destructive migration
- **Out of scope (this change)**: PvP durable store, campaign event emission, replay deletion/archival policy, multi-machine replay sync — all named follow-ons
