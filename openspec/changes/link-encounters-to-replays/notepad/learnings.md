# Learnings — link-encounters-to-replays

Accumulated wisdom across PRs. New entries appended at top.

## [2026-05-08] PR3 outcome — wire EncounterService + Replay Library UI

**Shipped**:
- `IEncounterMeta` interface (`src/types/gameplay/GameSessionInterfaces.ts`) + optional `encounterMeta` slot on `IGameCreatedPayload`. Snapshot semantics — once written, mutations to the encounter row do NOT alter historical replay rows.
- `createGameCreatedEvent` (`src/utils/gameplay/gameEvents/lifecycle.ts`) gains optional `encounterMeta` arg; `createGameSession` (`src/utils/gameplay/gameSessionCore.ts`) threads it through `ICreateGameSessionOptions`.
- `buildEncounterMeta(encounter, rawForceIds?)` helper (`src/services/encounter/encounterToGameSession.ts`) — pure derivation: `<forceName> (<totalBV> BV, <unitCount> units)` for explicit forces; `<forceId> (missing force)` for broken refs (Change A territory); `Generated <faction|era|OpFor> (~<targetBV> BV)` for opForConfig-driven opponents. Falls back to `(missing force)` / `(no opponent)` literals when raw IDs aren't available.
- `EncounterService.launchEncounter` derives meta + passes to `createGameSession`. The `getEncounterWithRawIds` lookup is **resilience-guarded** via a `typeof === 'function'` check so legacy mock repositories (jest fixtures predating the cascade-broken-refs PR) keep working — older tests don't implement that method on their stubs.
- `IInteractiveSessionLinkage.encounterMeta` (`src/engine/InteractiveSession.ts`) — pre-battle launch handlers can now thread the meta into the engine session at construction time. `GameEngine.createInteractiveSession` reuses the typed linkage interface.
- Browser-side persist hook on `src/pages/gameplay/games/[id].tsx`: ref-guarded effect fires once when an encounter session reaches `Completed`, POSTs to `/api/replay-library/encounter`. Uses dynamic `import('@/components/encounter/persistEncounterFromSession')` to keep the persist code off the gameplay-page initial chunk.
- `persistEncounterFromSession` helper (`src/components/encounter/persistEncounterFromSession.ts`) — pure body-derivation + fetch wrapper. Extracted to its own module so unit tests can pin the contract without mounting the full gameplay page. Returns `{ ok, status?, error? }` and **never throws** — network errors surface as `ok: false`.
- ReplayLibraryPage (`src/components/replay-library/ReplayLibraryPage.tsx`): 6th `Encounter` filter button + real metadata strip rendering `encounterName` / `templateType ?? 'Custom'` / `playerForceSummary` vs `opponentSummary`. The PR1 stub case is replaced; `_exhaustive: never` guard still passes.
- Tests: 14 new EncounterService.persist tests + 5 new ReplayLibraryPage tests = 19 new tests across 2 files. Coverage includes body shape, winner derivation (player / opponent / draw / null), missing meta fallback, network-error path, 6-button filter strip count, encounter row metadata strip, "Custom" templateType fallback, source-filter Encounter restriction, click-to-watch routing through `/api/replay-library/encounter/<gameId>`.
- Storybook story: `EncounterOnly` story added showing `encounterEntry` (templateType='duel') + `encounterEntryCustom` (templateType=null). `PopulatedLibrary` extended to include both encounter entries (7 total now).

**Lessons**:
- **`templateType: string | null` on the wire, but typed-enum on fixtures.** `IEncounterMeta.templateType` is `string | null` in the interface (so the lifecycle event-builder doesn't pull in `@/types/encounter`), but the manifest entry's `IEncounterReplayManifestEntry.templateType` is the typed `ScenarioTemplateType | null`. Test fixtures that build manifest entries MUST use `ScenarioTemplateType.Duel` not the string `'duel'` — typecheck catches this immediately. The wire-format intentionally accepts strings so future template types don't break replay round-trips.
- **Mock-repository resilience > test-fixture sweep.** Adding `getEncounterWithRawIds` to `EncounterService` would have broken 3 legacy `EncounterService.test.ts` cases that build mock repositories without that method. Two options: update every fixture (touchy, brittle) or guard the call in the service. Chose the guard — `typeof this.repository.getEncounterWithRawIds === "function"` falls back to `null` and the meta builder uses the hydrated force slots. Guards beat fixtures when the contract is "fail soft."
- **Helper extraction drove test simplicity.** Inlining the persist body-derivation in the gameplay page would have meant either a full-page integration test or skipping the assert entirely. Extracting `persistEncounterFromSession.ts` (with `buildEncounterPersistBody` as its pure-derivation surface) let the test mock just `fetch`, build a minimal `IGameSession` fixture, and assert the body shape directly. The page just `import()`s the helper — no behavior change, all the testability win.
- **Auto-format hook still flags us — `npm run format` between Edit batches.** Same gotcha from PR1 / PR2 notepad: oxfmt's `--write` reformatted single-quote/double-quote alternations between Edit calls. Final `npm run format` after the batch flipped 13 files to canonical; `format:check` then went green.

**Outcome**: 251/251 focused tests pass. Format clean, lint 0 errors (49 warnings, all pre-existing). Storybook builds clean (16.67s). End-to-end loop closed: encounter completion → POST to `/api/replay-library/encounter` → manifest entry → Library page row with `encounterName` + template + summary strings, click-to-watch routes through `/api/replay-library/encounter/<gameId>`.

## [2026-05-08] PR2 outcome — persist pipeline + API route

**Shipped**:
- `src/components/encounter/persistEncounterGame.ts` — mirrors `persistQuickGame.ts`. Exports `IPersistEncounterGameInput`, `IPersistEncounterGameResult`, `buildEncounterManifestEntry`, `stampEncounterReplaySource`, `persistEncounterGame`. Three-gate `shouldPersistToDisk` (Node runtime + cwd-or-NODE_ENV) duplicated per design.md (no shared helper extraction). Writes NDJSON to `simulation-reports/encounter/<gameId>.jsonl`, post-stamps `ReplaySource.Encounter`, appends manifest entry via `appendManifestEntry`.
- `src/pages/api/replay-library/encounter.ts` — POST handler mirroring `quick.ts`. Inline runtime validation for 8 fields (`gameId` regex, `events` array, `winner` enum-or-null, `encounterId` non-empty, `encounterName` string, `templateType` ScenarioTemplateType-or-null, `playerForceSummary` string, `opponentSummary` string). Dedup guard via `readReplayIndex` + id check (Momus blocking gap fix). 405 / 400 / 500 error paths. `VALID_TEMPLATE_TYPES` derived from `Object.values(ScenarioTemplateType)` so the validator picks up new template types automatically.
- Tests: 19 pipeline tests + 21 route tests = 40 new tests across 2 files. Coverage includes happy path, browser env no-op (via `process.versions.node` stub), test env without cwd no-op, replaySource preservation, manifest entry shape, NDJSON round-trip, dedup short-circuit, malformed-index fallthrough, 7 of the 8 BAD_* validation codes.

**Lessons**:
- **Auto-format hook reformats on Write.** Three Write calls each triggered the hook; final `npm run format` after batch flipped 4 files to canonical (mostly `]` placement on multi-line array args). Format-check went green on the second pass — exactly the inherited gotcha from PR1 notepad.
- **Process.versions.node stub trick** for the browser-env test — `Object.defineProperty(process.versions, 'node', { value: undefined, configurable: true })` reliably flips `shouldPersistToDisk` into the no-op branch under jest (jsdom). Restore via `try/finally` so other tests in the same file aren't affected. The quick-game tests don't have this scenario explicitly; encounter tests added it because tasks.md called for the "Browser env" scenario as one of the 6 required cases.
- **`VALID_TEMPLATE_TYPES` derivation off `Object.values(ScenarioTemplateType)`** — gives the route automatic forward-compat with any new template literal added to the enum. No manual sync needed when a sixth template type lands. The validator rejects anything not in the runtime set.
- **`encounterMeta` write-back is PR3 territory** — PR2 writes the manifest entry directly off input fields and does NOT re-stamp `encounterMeta` onto the `GameCreated` payload. PR1's `buildEncounterEntry` in `backfill-scan.ts` reads `encounterMeta` only as a recovery path for files written before the manifest existed (e.g. fresh checkout rebuilding the index). PR3's `EncounterService.launchEncounter` is what stamps `encounterMeta` on the wire so the round-trip closes when the manifest gets rebuilt.
- **No unused-import lint warnings on `IGameEvent` in pipeline module** — kept the explicit `type` re-export from `@/types/gameplay` so the public API surfaces it for consumers who want to type a `readonly IGameEvent[]` argument.

**Watch in PR3**:
- `EncounterService.launchEncounter` MUST stamp `encounterMeta` (with `encounterId`, `encounterName`, `templateType`, `playerForceSummary`, `opponentSummary`) onto the `GameCreated.payload` at session creation. Otherwise a fresh-checkout backfill scan recovers blank encounter rows.
- Persist hook attachment point: wherever the existing campaign-outcome publish hook lives (added by `wire-encounter-to-campaign-round-trip` Wave 5). The hook must build the `IPersistEncounterGameInput` from the accumulated event log + the meta on the `GameCreated` event, then `fetch('/api/replay-library/encounter', { method: 'POST', body: JSON.stringify(input) })`.
- `useRef`+effect double-fire guard required on the browser side (mirror `QuickGameResults` pattern).
- ReplayLibraryPage stub case (line 184-ish, the `ReplaySource.Encounter` branch added in PR1) must be replaced with the real metadata strip rendering `encounterName`, `templateType ?? 'Custom'`, `playerForceSummary` vs `opponentSummary`. Also: `SOURCE_FILTERS` array gains `{ key: ReplaySource.Encounter, label: 'Encounter' }` → 6 buttons total.

## [2026-05-08] PR1 outcome — types + enum + manifest interface

**Shipped**:
- `ReplaySource.Encounter = 'encounter'` (5th variant) in `src/types/gameplay/GameSessionInterfaces.ts`.
- `IEncounterReplayManifestEntry` in `src/replay-library/types.ts` with the 5 source-specific fields (`encounterId`, `encounterName`, `templateType`, `playerForceSummary`, `opponentSummary`); `IReplayManifestEntry` union grew 4 → 5.
- `buildEncounterEntry` builder in `src/replay-library/backfill-scan.ts` reads `GameCreated.payload.encounterMeta` (PR2 will write it).
- Stub `case ReplaySource.Encounter` branch in `ReplayLibraryPage.tsx` to keep the `_exhaustive: never` compile-guard happy until PR3 wires the proper metadata strip.
- Tests: enum-length 4→5, Encounter narrowing, exhaustive-switch coverage, `templateType` accepts every `ScenarioTemplateType` + `null`, route accepts `source=encounter`, backfill round-trip + idempotent re-scan + bare-fixture fallback.

**Lessons**:
- The exhaustiveness `_exhaustive: never = entry` guard in `ReplayLibraryPage.tsx` would have failed compile in PR1 if we'd left the union extension dangling. Added a stub Encounter case (renders just `encounterId`) so PR1 ships clean; PR3 replaces the stub with the real metadata strip.
- The backfill switch had a similar `_exhaustive: never = source` guard. Adding `case ReplaySource.Encounter: return buildEncounterEntry(...)` was mandatory for the partition scan to compile — not optional for "PR2 to wire".
- Auto-format hook reformats files immediately after every Edit. Don't skip `npm run format:check` before commit — even though tests pass and lint is clean, oxfmt may have reflowed import groups (single-quote → single-quote with adjusted line-breaks). Running `npm run format` once after the batch flips everything to canonical.
- Backfill `templateType: meta?.templateType === undefined ? null : meta.templateType` — important: do NOT use `?? null` because that would coerce a real `Custom` (which is the string `'custom'`, truthy) correctly, but a hypothetical `null` written explicitly would be coerced via `??` only on the LHS-undefined check, so the `=== undefined` guard is the safe form. Pinned with a regression test that round-trips `null`.

**Watch in PR2**:
- The manifest entry builder reads `GameCreated.payload.encounterMeta` — PR2's `persistEncounterGame` MUST write `encounterMeta` onto the GameCreated event payload at session creation OR post-stamp it before persisting. Otherwise the round-trip drops to all-empty-strings (the bare-fixture test pins this fallback so a regression here will show as encounters appearing in the Library with blank metadata, not crashing).
- PR2 `persistEncounterGame` should mirror `persistQuickGame` shape line-for-line (per design.md "do NOT extract a shared helper").
- PR3 must replace the stub case in `ReplayLibraryPage.tsx` with the real metadata strip + add an `Encounter` button to `SOURCE_FILTERS`.
