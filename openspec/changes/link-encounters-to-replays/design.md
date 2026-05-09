# Design: Link Encounters to Replays

## Technical approach

Mirror the proven Quick-game persist pattern end-to-end:

```
quick:    QuickGameResults.tsx          → persistQuickGame()      → /api/replay-library/quick      → simulation-reports/quick/<gameId>.jsonl + replay-index.json
encounter: EncounterDetailPage          → persistEncounterGame()  → /api/replay-library/encounter  → simulation-reports/encounter/<gameId>.jsonl + replay-index.json
```

Identical pipeline layout, identical idiom on every layer (boundary post-stamp, three-gate disk guard, dedup-via-manifest-read, NDJSON file + index append). The only meaningfully different decision is the manifest variant — the rest is "swap `Quick` for `Encounter`, swap the source-specific fields."

The wire-up to the live encounter session uses the same boundary-post-stamp pattern: the `InteractiveSession` (or whatever runs after `launchEncounter`) emits events with whatever source the producer originally wrote. At the persistence boundary we post-stamp `replaySource: ReplaySource.Encounter` over any event missing the field, preserving explicit overrides (so a hypothetical future "encounter inside a campaign" call site can stamp `Campaign` and we don't clobber it).

## Architecture decisions

### Decision: Add `ReplaySource.Encounter` instead of overloading `Quick`

**Choice**: New enum variant (fifth value) + new manifest interface (fifth union member).

**Rationale**: Per the change brief: "Encounters do NOT fit any of these cleanly." Overloading `Quick` would mean:

1. Lying about the discriminator — every consumer that switches on `replaySource === ReplaySource.Quick` would suddenly get encounter rows in the Quick branch. The `aiVariant` field on `IQuickReplayManifestEntry` doesn't exist for encounters; we'd either fake `aiVariant: 'encounter-default'` (nonsense) or make the field optional (breaks existing exhaustiveness contracts).
2. Breaking the partition rule. The replay-library spec requires the partition directory to match the enum value (`enum value matches partition directory name` scenario). If encounters wrote to `simulation-reports/quick/`, the directory name no longer matches the discriminator, and the bug is two layers deep (manifest entry says Quick, on-disk file lives in `quick/`, but the user knows they ran an encounter).
3. Silent metadata loss. Encounters have a real `encounterId` + `templateType` + force-summary text that the Library row should render. Forcing those into `aiVariant` mangles them.

The codebase already paid for the cost of "exactly five values" by using the enum-discriminated discriminated-union pattern from sc2reader's lesson — adding a variant is the cheap operation. The exhaustiveness check (`assertNever(entry)` at every `switch (entry.replaySource)`) catches every consumer that needs an `Encounter` case. No silent drift risk.

**Alternatives considered**:

- **Reuse `Campaign`** — campaign-bound encounters have `campaignId`/`contractId`/`scenarioId`; standalone encounters do not. Forcing standalone into `Campaign` requires faking those fields, breaks the `IcampaignReplayManifestEntry.campaignId: string` contract, and conflates two distinct concepts. Rejected.
- **Single `Game` source with a sub-type tag** — collapses the discriminator we worked hard to put in. Rejected.
- **Compute the variant lazily from the events** — slow, requires a stream-read on every Library page render to derive the source. Rejected (the discriminator is supposed to be the cheap O(1) discriminant).

### Decision: `playerForceSummary` / `opponentSummary` as strings, not structured objects

**Choice**: The manifest entry stores the force descriptors as already-rendered strings (e.g. `"Lance Alpha (4500 BV, 4 units)"` for explicit forces or `"Generated Lance (~3000 BV)"` for opForConfig-driven), not as `{ name, totalBV, unitCount }` objects.

**Rationale**: Library rows are list cells. They render text. Storing structured data only adds a layer of formatting on the read path — the Library row can't display the data without a stringifier anyway. Keeping the manifest entries cheap (no nested objects) keeps the index file small and parsing fast. The original force ids are NOT stored on the manifest because the manifest entry is a snapshot — the source forces may have been deleted by the time the user opens the replay (the same "broken force reference" condition Change A repairs). Keeping the manifest self-contained means the Library page can render every row without resolving any external references.

**Alternatives considered**:

- **Store force ids + names** — adds a layer of resolution risk; if the force is deleted the row can't render. We took the lesson from Change A: don't depend on external state for replay metadata.
- **Store full `IForceReference`** — heavier; same problem with stale data.

### Decision: Persist on launch / session-terminal boundary, NOT on encounter status transition

**Choice**: The persist hook fires when the live game session reaches a terminal state (winner / draw / aborted), NOT when `EncounterService.launchEncounter` is called. The launch only mints the `gameSessionId`; the events accumulate during play; at terminal state the persist pipeline runs.

**Rationale**: At launch time there are zero events to write. Events accumulate during play in the existing in-memory event log. The natural persist point is the same as quick games: terminal-state transition. The interactive session already has a "session ended" hook (the same hook that `wire-encounter-to-campaign-round-trip` uses to publish `ICombatOutcome`). We piggyback on it.

**Implementation**: a new `persistEncounterGame()` call inside the InteractiveSession's terminal-state handler. The handler already gathers the final outcome; adding a sibling call to persist the events is the same shape as `persistQuickGame` does in the QuickGameResults effect. Browser-side: this fires from the React component handling the live session view (so the same Node-runtime gate as `persistQuickGame` short-circuits to the API route which does the actual disk write server-side).

**Alternatives considered**:

- **Persist on every event** — orders of magnitude more disk writes; doesn't match the existing pattern.
- **Persist via a cron-style polling job** — added complexity; events live in memory and could be lost on tab close before the cron fires.
- **Persist when the user explicitly hits "Save replay"** — adds a UX surface; the user expectation per the OMO Council "Replay Loop Closure" decision is "automatic, like quick games."

### Decision: API route mirrors `quick.ts` exactly, no shared helper extracted

**Choice**: Author `src/pages/api/replay-library/encounter.ts` as a near-copy of `src/pages/api/replay-library/quick.ts` (already shipped in PR #557). Same dedup logic, same parseBody shape, same `GAME_ID_PATTERN` regex. Do NOT extract a shared helper file.

**Rationale**: Per the change brief: "duplicate it, don't share a generic wrapper." Two near-identical routes with one regex copied and one parseBody pattern copied is 50 lines of duplication; a generic wrapper that accepts a `(input) => persistFn(input)` callback would also be 50 lines of generic plumbing AND require all callers to thread their custom validation through a hook system. The duplication is cheaper. If a third route appears (campaign), revisit.

The convention is also explicit in the existing `quick.ts` source comment: `"Validation pattern mirrors the sibling [source]/[gameId].ts route: inline runtime checks (no Zod — established convention in this directory; future consolidation is a separate sweep)"`. We're consistent with that convention.

**Alternatives considered**:

- **Extract `src/pages/api/replay-library/_shared.ts`** — explicit guideline says no.
- **Single generic `POST /api/replay-library/persist` route with `replaySource` in the body** — flattens the API surface but loses per-source validation specificity (an encounter request with `aiVariant` should error; that's harder to express with a polymorphic handler).

### Decision: Backfill scan picks up Encounter partition automatically

**Choice**: `src/replay-library/backfill-scan.ts` already iterates `Object.values(ReplaySource)` for the partition layout. Adding the variant adds the partition without code change to the scanner. The `inferReplaySource(filePath)` helper in the scanner uses a switch on the partition directory name — we add the `case 'encounter': return ReplaySource.Encounter` line.

**Rationale**: The replay-library spec scenario "Scan covers new partition layout" already covers per-source partition coverage. The scanner is generic over the enum. The only real additions are the type narrowing for building `IEncounterReplayManifestEntry` from a scanned file — that needs the encounter-specific fields, which we derive from the first `GameCreated` event's `payload` (which `EncounterService.launchEncounter` will stamp with `encounterId`, `encounterName`, etc.).

**Alternatives considered**:

- **No scan support; only forward-emit** — leaves the scanner inconsistent across enum values. Bad.

### Decision: No data migration needed

**Choice**: No existing encounter event logs on disk → no migration. Pre-cutover encounters are simply not replayable; users accept this.

**Rationale**: Today the `EncounterService.launchEncounter` writes ZERO events. There is nothing on disk under any partition for encounters. The "Replay Library backfill scan" requirement covers swarm + quick + future variants; adding Encounter to the scan covers any future runs but has nothing to backfill from before the change ships.

## Data flow

**Today (broken):**

```
launchEncounter(E)
   └→ buildGameUnitsFromEncounter(E)
   └→ createGameSession(config, units)  → returns IGameSession with gameSessionId
   └→ encounterRepository.linkGameSession(E.id, session.id)
       (events accumulate in memory during play, never persist)
   └→ session ends → events evaporate → no Replay Library entry
```

**After this change:**

```
launchEncounter(E)
   └→ buildGameUnitsFromEncounter(E)
   └→ createGameSession(config, units)  → returns IGameSession with gameSessionId
   └→ encounterRepository.linkGameSession(E.id, session.id)
       (events accumulate in memory during play, with replaySource: ReplaySource.Encounter post-stamped)
   └→ session terminal state →
       └→ POST /api/replay-library/encounter { gameId, events, encounterId, encounterName, templateType, playerForceSummary, opponentSummary, winner }
            └→ dedup check via readReplayIndex
            └→ persistEncounterGame
                  └→ write simulation-reports/encounter/<gameId>.jsonl
                  └→ appendManifestEntry IEncounterReplayManifestEntry
       └→ Replay Library page picks up the new entry on next mount; filter "Encounter" surfaces it; click → existing replay viewer plays it back.
```

## File changes

- **NEW**: `src/components/encounter/persistEncounterGame.ts`  — Node-only pipeline. Exports `IPersistEncounterGameInput`, `IPersistEncounterGameResult`, `buildEncounterManifestEntry`, `persistEncounterGame`. Mirrors the `persistQuickGame.ts` shape exactly: same `shouldPersistToDisk` three-gate guard duplicated (NOT shared — per the change brief), same boundary post-stamp via `stampEncounterReplaySource`, same NDJSON file write + `appendManifestEntry` call.
- **NEW**: `src/pages/api/replay-library/encounter.ts` — POST handler. Inline runtime validation. Dedup via `readReplayIndex` + id check. Same response shape as `/api/replay-library/quick` (`{ persisted, alreadyPersisted, manifestEntry, path }`).
- **MODIFIED**: `src/types/gameplay/GameSessionInterfaces.ts:291-296` — add fifth enum entry `Encounter = 'encounter'`. Update the `Object.values(ReplaySource)` length-asserting tests to expect five.
- **MODIFIED**: `src/replay-library/types.ts` — add `IEncounterReplayManifestEntry` interface and append it to the `IReplayManifestEntry` union. Source-specific fields: `encounterId: string`, `encounterName: string`, `templateType: ScenarioTemplateType | null`, `playerForceSummary: string`, `opponentSummary: string`.
- **MODIFIED**: `src/replay-library/backfill-scan.ts` — extend the partition switch with `case 'encounter'` returning `ReplaySource.Encounter` AND add the encounter manifest entry builder mirroring the existing per-source builders. The first `GameCreated` event SHALL carry the encounter metadata as part of its payload — `EncounterService.launchEncounter` stamps these.
- **MODIFIED**: `src/services/encounter/EncounterService.ts:290-367` (`launchEncounter`) — at session terminal state, post-stamp `ReplaySource.Encounter` over the event log AND POST to `/api/replay-library/encounter`. Implementation lives at the boundary the InteractiveSession already exposes for outcome publishing — `wire-encounter-to-campaign-round-trip` Wave 5 already added that hook. Plus: include encounter metadata in the `GameCreated` event payload so the backfill scan can recover it.
- **MODIFIED**: `src/components/replay-library/ReplayLibraryPage.tsx` — extend the row-renderer switch with the `case ReplaySource.Encounter` branch (renders `encounterName`, `templateType` label, `playerForceSummary` vs `opponentSummary`). Add the fifth filter button "Encounter" to the `SOURCE_FILTERS` array. The exhaustiveness `assertNever(entry)` switch picks up the variant for free.
- **NO CHANGE**: `src/pages/api/replay-library/[source]/[gameId].ts` — already validates against `RECOGNIZED_REPLAY_SOURCES = new Set(Object.values(ReplaySource))`. Adding the enum value extends the recognized set automatically.

## Test strategy

- **Pipeline** (`src/components/encounter/__tests__/persistEncounterGame.test.ts`) — 5 scenarios mirroring `persistQuickGame.test.ts`:
  - happy path with explicit cwd: writes file, appends manifest entry, returns `persisted: true`
  - browser env (`shouldPersistToDisk` returns false): no file write, returns `persisted: false, manifestEntry: null`
  - test env without cwd: no file write (jest no-op gate)
  - explicit non-Encounter `replaySource` value preserved (post-stamp doesn't clobber existing values)
  - manifest entry shape matches `IEncounterReplayManifestEntry` discriminant + all fields populated correctly
- **API route** (`src/pages/api/replay-library/__tests__/encounter.test.ts`):
  - happy path (POST → 200, persisted: true, manifestEntry returned)
  - dedup (POST same gameId twice → first 200 persisted, second 200 alreadyPersisted)
  - bad gameId (regex mismatch → 400)
  - missing required fields (no `encounterId` → 400)
  - non-POST (GET → 405)
  - persistEncounterGame throws → 500
- **Backfill scan** (`src/replay-library/__tests__/backfill-scan.test.ts`) — extend existing test with one Encounter fixture under `simulation-reports/encounter/<gameId>.jsonl`; assert the scan returns one `IEncounterReplayManifestEntry` with `encounterId`, `encounterName`, etc. populated from the first `GameCreated` event payload.
- **Replay Library page** (`src/components/replay-library/__tests__/ReplayLibraryPage.test.tsx`) — extend existing test:
  - filter set has 5 buttons (All / Swarm / Quick / PvP / Campaign / Encounter) — the change brief says the page gets a 5th filter (Encounter); the existing 4 source filters + All means the button strip goes from 5 to 6
  - row renders `encounterName` + template + force summaries when `replaySource === ReplaySource.Encounter`
  - click-through to viewer works
- **Integration** (`src/services/encounter/__tests__/EncounterService.persist.test.ts`) — high-fidelity test: launch encounter → mock-run to terminal state → assert POST fired to `/api/replay-library/encounter` with the right body shape. Spies on the persistence boundary; doesn't actually run a real game session. The persist call's success is verified separately by the pipeline tests above.
- **Enum value tests** — extend `replay-library/types.test.ts` `Object.values(ReplaySource).length` assertion from 4 → 5 (and update the swarm/quick assertions to NOT assert "exactly four values" — they currently do).

## Test infrastructure

Existing — Jest + jsdom + Node-env switching pattern is established (`persistQuickGame.test.ts` is the canonical example). API route tests use `next-test-api-route-handler` or the existing in-process pattern (whichever `quick.test.ts` uses; mirror).

## Rollout

Single PR or small ladder. The change is small enough (one enum value + one manifest interface + one new pipeline + one new API route + UI tweaks) to ship as ONE PR if Atlas is comfortable. If we ladder:

1. **Tier 1** — types + enum + manifest interface + backfill-scan support. PR #1. Behavior change: zero (no callers yet).
2. **Tier 2** — `persistEncounterGame` pipeline + `/api/replay-library/encounter` route + tests. PR #2. Behavior change: zero (no callers yet — the pipeline is unit-tested, route works in isolation).
3. **Tier 3** — wire `EncounterService.launchEncounter` to fire the persist call on terminal state + ReplayLibraryPage filter+row renderer + UI tests. PR #3. Behavior change: encounter battles now appear in the Replay Library.

Each tier independently passes typecheck/test/build. Tier 3 is the user-visible flip.

## Risk + mitigation

- **Risk**: a fifth `ReplaySource` variant breaks consumers that had been writing exhaustive switches. **Mitigation**: that's the point — the compiler tells us every consumer to update. We list known consumers in advance: `ReplayLibraryPage.tsx` row renderer, the backfill scan, the API route filter set (`RECOGNIZED_REPLAY_SOURCES`). Tests across all of these fail until each `Encounter` case is added.
- **Risk**: encounter session never reaches terminal state (user closes tab). **Mitigation**: same risk as quick games today — events evaporate. Acceptable for v1; the IndexedDB local-buffer follow-on (already named for quick) covers both.
- **Risk**: campaign-bound encounters might "want" to persist as `Campaign` not `Encounter`. **Mitigation**: explicit decision — campaign-bound encounters still emit as Encounter, with the campaign linkage threaded onto the GameCreated event payload. The `Campaign` variant is reserved for future campaign-driven scoring/contract sessions that don't go through `launchEncounter`. If the user wants both views ("show as Encounter" and "show as Campaign"), that's a follow-on feature.
- **Risk**: `templateType: null` (custom encounter without a template) renders awkwardly in the row. **Mitigation**: row renderer falls back to the literal `"Custom"` label when `templateType === null`.

## Open questions

- **Q**: Should the encounter row link directly back to `/gameplay/encounters/[id]` (the source encounter) for context? **A**: Defer. The replay viewer is enough for v1; cross-linking is a UX polish.
- **Q**: Do we need to dedup encounters that have been re-launched (same `encounterId`, different `gameSessionId`)? **A**: NO. Each launch produces a fresh `gameSessionId` which is the manifest `id`. Multiple launches of the same encounter produce multiple distinct replay entries — that's the right behavior; the user can scroll through their attempts.
- **Q**: Should the encounter-name / force-summary text be localized? **A**: Defer. The codebase has no i18n machinery yet; persisting raw text is fine.
