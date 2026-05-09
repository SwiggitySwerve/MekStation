# Tasks: Link Encounters to Replays

## 1. Types + enum + manifest interface (PR 1)

- [ ] 1.1 Add `Encounter = 'encounter'` as the fifth value in `ReplaySource` at `src/types/gameplay/GameSessionInterfaces.ts:291-296`. Document the addition in the comment block above the enum.
  - Done when: `Object.values(ReplaySource)` returns five strings.
- [ ] 1.2 Add `IEncounterReplayManifestEntry` interface to `src/replay-library/types.ts`:
  ```ts
  export interface IEncounterReplayManifestEntry extends IReplayManifestEntryBase {
    readonly replaySource: ReplaySource.Encounter;
    readonly encounterId: string;
    readonly encounterName: string;
    readonly templateType: ScenarioTemplateType | null;
    readonly playerForceSummary: string;
    readonly opponentSummary: string;
  }
  ```
  Append it to the `IReplayManifestEntry` discriminated union.
  - Done when: typecheck clean; the union has 5 members.
- [ ] 1.3 Update enum-length tests to expect 5 (search for `Object.values(ReplaySource).length` and `Object.values(ReplaySource)` deep-equal-array assertions). Add a "narrows to Encounter" type-level test mirroring the existing per-source narrowing tests.
  - Done when: all enum-length assertions updated; new narrowing test passes.
- [ ] 1.4 Update `RECOGNIZED_REPLAY_SOURCES` consumer at `src/pages/api/replay-library/[source]/[gameId].ts:51-53` — confirm it dynamically uses `Object.values(ReplaySource)` and therefore picks up the variant automatically (no code change expected; verify in the test).
  - Done when: API route unit test asserts `encounter` is a recognized source.
- [ ] 1.5 Update `src/replay-library/backfill-scan.ts` — extend the partition switch with `case 'encounter': return ReplaySource.Encounter`. Update the per-source manifest entry builder to handle the Encounter case by reading `encounterId`, `encounterName`, `templateType`, `playerForceSummary`, `opponentSummary` from the first `GameCreated` event's payload.
  - Done when: a fixture jsonl at `simulation-reports/encounter/<gameId>.jsonl` is correctly read by `scanReplayDirectory` and produces an `IEncounterReplayManifestEntry`.
- [ ] 1.6 Add backfill-scan unit test at `src/replay-library/__tests__/backfill-scan.test.ts` (extend existing) — Encounter fixture round-trip + idempotent re-scan.
  - Done when: test passes; existing scan tests still green.
- [ ] 1.7 Run `npm run typecheck`, `npm run lint`, `npm test` clean.
- [ ] 1.8 Open PR 1, CI green, merge.

## 2. Persist pipeline + API route (PR 2)

- [ ] 2.1 Author `src/components/encounter/persistEncounterGame.ts` mirroring `src/components/quickgame/persistQuickGame.ts`:
  - Export `IPersistEncounterGameInput` containing `gameId`, `events`, `winner` (`'player' | 'opponent' | 'draw' | null`), `encounterId`, `encounterName`, `templateType`, `playerForceSummary`, `opponentSummary`, optional `cwd`.
  - Export `IPersistEncounterGameResult` with `persisted`, `path`, `manifestEntry` (typed as `IEncounterReplayManifestEntry | null`).
  - Implement `shouldPersistToDisk` three-gate (Node runtime + cwd-or-NODE_ENV) — duplicate from `persistQuickGame.ts` per the change brief; do NOT extract a shared helper.
  - Implement `stampEncounterReplaySource(events)` that post-stamps `ReplaySource.Encounter` over events that don't already have a `replaySource` field; preserves explicit values.
  - Implement `buildEncounterManifestEntry(input)`: derives `turns` from `countTurnStartedEvents(events)` (duplicate the helper), `winner` from the input, `bvTotal` from the first `GameCreated.payload.units` summed `.bv` fields, `createdAt` from `new Date().toISOString()`. Returns the typed manifest entry.
  - Implement `persistEncounterGame(input)`: writes `simulation-reports/encounter/<gameId>.jsonl` then calls `appendManifestEntry(manifestEntry, { cwd })`.
  - Done when: file compiles; matches the shape of `persistQuickGame.ts` line-for-line where applicable.
- [ ] 2.2 Add unit tests at `src/components/encounter/__tests__/persistEncounterGame.test.ts` mirroring the 5 quick-game scenarios + 1 Encounter-specific scenario:
  - Happy path with explicit cwd: writes file under tmpdir, manifest entry appended, returns `persisted: true`, manifestEntry has the right discriminator.
  - Browser env (no Node runtime): no-op, returns `persisted: false, manifestEntry: null`.
  - Test env without cwd: no-op (jest-jsdom guard).
  - Explicit non-Encounter `replaySource` preserved on a sample event.
  - Manifest entry shape: `replaySource: 'encounter'`, all source-specific fields populated correctly.
  - Round-trip: written file parses back into an event array with the post-stamped source.
  - Done when: 6 tests pass.
- [ ] 2.3 Author `src/pages/api/replay-library/encounter.ts` POST handler mirroring `quick.ts`:
  - Same `GAME_ID_PATTERN` regex (`^[A-Za-z0-9_-]+$`) — duplicate not import.
  - Same `parseBody` shape returning `{ ok: true, input } | { ok: false, error }` with explicit field-by-field validation: `gameId` (regex), `events` (array), `winner` (null OR one of 'player'/'opponent'/'draw'), `encounterId` (non-empty string), `encounterName` (string), `templateType` (string-of-ScenarioTemplateType OR null), `playerForceSummary` (string), `opponentSummary` (string).
  - Same dedup guard via `readReplayIndex` + id check; on duplicate return `{ persisted: false, alreadyPersisted: true, manifestEntry: <built fresh>, path: 'encounter/<gameId>.jsonl' }`.
  - On non-duplicate, call `persistEncounterGame(input)`, return `{ persisted, alreadyPersisted: false, manifestEntry, path }`.
  - 405 on non-POST; 400 on parse failure; 500 on persistEncounterGame throw.
  - Done when: handler compiles; returns shape matches the quick handler.
- [ ] 2.4 Add API route tests at `src/__tests__/api/replay-library/encounter.test.ts` (NOT `src/pages/api/replay-library/__tests__/...` — existing convention: API route tests live under `src/__tests__/api/`; mirror the sibling at `src/__tests__/api/replay-library/quick.test.ts` from PR #557) mirroring the quick route tests:
  - 200 happy path: POST returns `persisted: true, alreadyPersisted: false`.
  - 200 dedup: POST same gameId twice; second returns `persisted: false, alreadyPersisted: true`.
  - 400 bad gameId: POST with `gameId: 'foo/../bar'` → BAD_GAME_ID.
  - 400 missing encounterId: POST without it → BAD_BODY or specific code.
  - 400 invalid winner: POST with `winner: 'banana'` → BAD_WINNER.
  - 405 on GET.
  - 500 on persist failure: mock `persistEncounterGame` to throw → 500 PERSIST_FAILED.
  - Done when: 7 tests pass.
- [ ] 2.5 Run `npm run typecheck`, `npm run lint`, `npm test` clean.
- [ ] 2.6 Open PR 2, CI green, merge.

## 3. Wire EncounterService + Replay Library UI (PR 3)

- [ ] 3.1 Modify `EncounterService.launchEncounter` (`src/services/encounter/EncounterService.ts:290-367`) to stamp the encounter metadata onto the `GameCreated` event payload at session creation: `encounterId`, `encounterName`, `templateType`, `playerForceSummary`, `opponentSummary`. The metadata SHALL be derived from the encounter row at launch time (snapshot — does not rebuild from forces if forces change later).
  - `playerForceSummary` derivation: when `encounter.playerForce` is non-null, use `"<forceName> (<totalBV> BV, <unitCount> units)"`. When `null` (broken — Change A territory), use `"<forceId> (missing force)"` as the snapshot text.
  - `opponentSummary` derivation: same shape for explicit opponent force; for opForConfig-driven, use `"Generated <type> (~<targetBV> BV)"` or whatever fields the opForConfig has.
  - Done when: launching an encounter produces a session whose first emitted event includes the metadata.
- [ ] 3.2 Add the persist hook to the encounter session terminal-state handler. The exact attachment point is wherever the existing campaign outcome publish hook lives (added by `wire-encounter-to-campaign-round-trip` Wave 5). Sibling call: build the `IPersistEncounterGameInput` from the session's accumulated event log + the encounter metadata stored on the GameCreated event, then `fetch('/api/replay-library/encounter', { method: 'POST', body: JSON.stringify(input) })`.
  - Browser-side (component) concerns: use the same useRef+effect pattern as `QuickGameResults` to guard against double-fire on remount.
  - Done when: a smoke run of an encounter from the UI ends with a manifest entry for the encounter and a `simulation-reports/encounter/<gameId>.jsonl` file.
- [ ] 3.3 Add an integration test at `src/services/encounter/__tests__/EncounterService.persist.test.ts` that mocks the live session and asserts the persist POST fires with the correct body shape on terminal state. Use a spy on `global.fetch` (or the existing test pattern for `/api/replay-library/quick` if one is established).
  - Done when: test asserts `fetch` was called with `/api/replay-library/encounter` and the body has `encounterId`, `encounterName`, `templateType`, `playerForceSummary`, `opponentSummary`, `gameId`, `events`, `winner`.
- [ ] 3.4 Modify `src/components/replay-library/ReplayLibraryPage.tsx`:
  - Append `{ key: ReplaySource.Encounter, label: 'Encounter' }` to the `SOURCE_FILTERS` array.
  - Add the `case ReplaySource.Encounter` branch to the `renderSourceMetadata` switch — render `encounterName`, `templateType ?? 'Custom'`, `playerForceSummary` vs `opponentSummary`. Match the visual treatment of the existing 4 cases.
  - The `assertNever(entry)` exhaustiveness guard now compiles cleanly with the new variant. Verify by manually omitting the case and confirming the typecheck breaks.
  - Done when: rendering a fixture with an Encounter manifest entry shows the expected metadata; filter button strip has 6 buttons (All / Swarm / Quick / PvP / Campaign / Encounter).
- [ ] 3.5 Extend `src/__tests__/pages/replay-library.test.tsx` (NOT `src/components/replay-library/__tests__/...` — the existing Replay Library page tests live at the centralized `src/__tests__/pages/replay-library.test.tsx`; extend that file):
  - Filter button strip count assertion: 6 buttons.
  - Encounter row renders `encounterName`, `templateType`, summary text.
  - Source filter "Encounter" restricts to encounter-only rows.
  - Click-to-watch fetches via `/api/replay-library/encounter/<gameId>` (the existing `[source]/[gameId].ts` route — confirms it accepts `encounter` source).
  - Done when: 4 new test cases pass; existing tests still green.
- [ ] 3.6 Add Storybook story for the Encounter row at `src/components/replay-library/ReplayLibraryPage.stories.tsx` (extend existing): `EncounterOnly` showing only encounter entries with template + summary metadata visible.
  - Done when: storybook builds clean.
- [ ] 3.7 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run storybook:build` clean.
- [ ] 3.8 Open PR 3, CI green, merge.

## 4. End-to-end verification

- [ ] 4.1 Manual smoke: launch an encounter from `/gameplay/encounters/[id]`, play to terminal state (or simulate via dev tools), refresh `/replay-library`, click Encounter filter, confirm the new row appears with `encounterName` + template + force summaries. Click Watch, confirm the replay viewer plays back the events.
- [ ] 4.2 Manual smoke: confirm `simulation-reports/encounter/<gameId>.jsonl` exists with the expected NDJSON content; confirm `simulation-reports/replay-index.json` has a new entry with `replaySource: 'encounter'`.
- [ ] 4.3 Manual smoke: launch the same encounter twice (back-to-back), confirm two distinct manifest entries with two distinct `gameSessionId`s appear in the Library.
- [ ] 4.4 `npx openspec validate link-encounters-to-replays --strict` clean. Output captured for the final report.

## 5. Archive

- [ ] 5.1 PRs 1, 2, 3 merged to main.
- [ ] 5.2 Memory anchor written to `~/.claude/projects/E--Projects-MekStation/memory/project_link_encounters_to_replays.md` with the fifth ReplaySource decision, files touched, lessons.
- [ ] 5.3 `openspec archive link-encounters-to-replays` runs cleanly; deltas merge into `replay-library/spec.md` and `game-session-management/spec.md`.
