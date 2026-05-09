## Why

The Replay Library page lists swarm runs and quick games but **encounter battles are invisible** — when the user launches an encounter from `/gameplay/encounters/[id]`, `EncounterService.launchEncounter()` mints a `gameSessionId` and hands off to the live game session, but **zero events are persisted to disk**. The session ends, the React tree unmounts, the events evaporate. The Replay Library page has no entry for the battle, the user can't replay it, and the discoverability work shipped in PRs #548–#553 stops one click short of "encounter battles are first-class replays."

Quick games already solved the same problem: `persistQuickGame.ts` writes events to `simulation-reports/quick/<gameId>.jsonl` and appends to `replay-index.json`; the missing piece for quick was the API route, shipped in PR #557 (`/api/replay-library/quick`). Encounters need the same shape — a `persistEncounterGame.ts` pipeline + a `POST /api/replay-library/encounter` route — but the manifest needs a new variant because encounter metadata is genuinely different from any of the four existing `ReplaySource` values:

- Not `Swarm` — encounters aren't CLI-driven and don't have `configName`/`seed`/`batchTimestamp`.
- Not `Quick` — encounters have user-configured forces / opForConfig / map / victory conditions, not the hard-coded duel scaffold of QuickGameScenarios.
- Not `PvP` — encounters are PvE single-player.
- Not `Campaign` — encounters can be standalone (no `campaignId` / `contractId` / `scenarioId`) or campaign-bound (the `wire-encounter-to-campaign-round-trip` linkage). Forcing standalone encounters into the campaign variant would either lie (fake campaignId) or bend the campaign manifest schema.

The clean answer is the fifth `ReplaySource.Encounter` variant with its own `IEncounterReplayManifestEntry` carrying `encounterId`, `encounterName`, `templateType`, `playerForceSummary`, and `opponentSummary`. The existing exhaustiveness checks at every consumer site fail compilation as soon as the variant lands, so the rollout naturally surfaces every place that needs an Encounter case.

## What Changes

- **NEW** `ReplaySource.Encounter = 'encounter'` added to the existing enum at `src/types/gameplay/GameSessionInterfaces.ts:291-296` (fifth value).
- **NEW** `IEncounterReplayManifestEntry` member of the `IReplayManifestEntry` discriminated union at `src/replay-library/types.ts`. Source-specific fields: `encounterId: string`, `encounterName: string`, `templateType: ScenarioTemplateType | null`, `playerForceSummary: string`, `opponentSummary: string` (string description like `"Lance: Alpha (4500 BV)"` or `"Generated Lance (~3000 BV)"` to keep manifest entries cheap to render).
- **NEW** filesystem partition: `simulation-reports/encounter/<gameId>.jsonl`. Existing partition layout already requires the directory name to match the enum value; adding the variant adds the partition.
- **NEW** `src/components/encounter/persistEncounterGame.ts` Node-only pipeline that mirrors `persistQuickGame.ts` (same three-gate `shouldPersistToDisk` check, same `replaySource` post-stamp at the boundary, same NDJSON write + `appendManifestEntry` call). Browser builds short-circuit to a no-op via the same Node-runtime gate.
- **NEW** `POST /api/replay-library/encounter` route at `src/pages/api/replay-library/encounter.ts` that mirrors the `quick.ts` route shape (inline runtime validation, no Zod; dedup-guard via `readReplayIndex` + `id` set check; same `IPersistEncounterGameInput` body validation idiom).
- **MODIFIED** `EncounterService.launchEncounter()` (`src/services/encounter/EncounterService.ts:290-367`) now stamps `replaySource: ReplaySource.Encounter` on every event the live session emits, by post-stamping at the runner boundary the same way `SimulationRunner.run()` (PR #551) and `persistQuickGame()` (PR #552) post-stamp at their boundaries. Today the live encounter session writes nothing; this change adds the persist hook on session terminal state.
- **MODIFIED** Replay Library page UI — the source-filter button strip gets a fifth "Encounter" filter; the row renderer adds an `Encounter`-case branch displaying `encounterName` + `templateType` (or "Custom" if null) + `playerForceSummary` vs `opponentSummary`; the exhaustiveness `assertNever(entry)` switch picks up the variant for free.
- **MODIFIED** Replay Library backfill scan (`src/replay-library/backfill-scan.ts`) to walk the new `simulation-reports/encounter/` partition. The scan already covers `simulation-reports/<source>/*.jsonl` for each enum value; adding the variant adds the partition automatically (the scanner iterates `Object.values(ReplaySource)`).
- **MODIFIED** `replay-library` spec — `ReplaySource Enum` requirement updated from "exactly four values" to "exactly five values"; `IReplayManifestEntry Discriminated Union` requirement updated to include the fifth member; `Filesystem Partition Layout` requirement gets an Encounter scenario; `Replay Library Page` requirement gets a fifth-filter scenario.

**OUT OF SCOPE** — Battle reviewing UX inside the encounter detail page (the user can navigate from the Replay Library row); replay deletion/archival (existing follow-on); encounter-specific replay metrics (e.g. salvage-claim summary on the row — would require campaign linkage, defer).

## Capabilities

### Modified Capabilities

- `replay-library` — adds the fifth `ReplaySource` enum value, the fifth manifest variant, the fifth filesystem partition, the fifth list-page filter, and a backfill-scan branch.
- `game-session-management` — adds the persist-on-launch hook in `EncounterService.launchEncounter` so encounter-driven sessions emit and persist event logs the same way swarm and quick games do.

### New Capabilities

None — this change rides existing capabilities.

## Impact

- **Code**: `src/types/gameplay/GameSessionInterfaces.ts` (one-line enum addition), `src/replay-library/types.ts` (new manifest interface + union member), `src/replay-library/backfill-scan.ts` (Encounter case in the per-source scan branch), new `src/components/encounter/persistEncounterGame.ts` (~150 LOC mirroring `persistQuickGame.ts`), new `src/pages/api/replay-library/encounter.ts` (~120 LOC mirroring `quick.ts`), `src/services/encounter/EncounterService.ts` (post-stamp at runner boundary + persist call on terminal state), `src/components/replay-library/ReplayLibraryPage.tsx` (Encounter case in the row-renderer switch + filter button), `src/pages/api/replay-library/[source]/[gameId].ts` (no code change — already iterates `Object.values(ReplaySource)`).
- **Filesystem**: `simulation-reports/encounter/` partition directory; manifest entries with `replaySource: 'encounter'` and `path: 'encounter/<gameId>.jsonl'`.
- **Tests**: `persistEncounterGame.test.ts` (5+ scenarios mirroring `persistQuickGame.test.ts`), `pages/api/replay-library/encounter.test.ts` (route validation + dedup + persist round-trip), `replay-library/backfill-scan.test.ts` (extend to add Encounter partition fixture), `ReplayLibraryPage.test.tsx` (extend filter test + add Encounter row-renderer test), one `EncounterService.persist.test.ts` integration covering "launch → run to terminal state → assert manifest entry present + jsonl on disk."
- **Existing data**: zero impact — there are no existing encounter event logs on disk, so no backfill migration is needed. Future encounter runs persist forward; today's encounters that have already-finished `gameSessionId` rows simply have no replay (acceptable; the user knows pre-cutover battles aren't replayable).
- **Out of scope (this change)**: encounter detail page does NOT add a "Watch latest replay" CTA (covered by the existing Replay Library navigation); encounter row does NOT show salvage / outcome metadata (would require pulling from campaign post-battle processors — separate change); encounter-specific replay deletion remains the same global delete mechanism.
