# Tasks

## 1. Authoring

- [x] 1.1 Author proposal.md
- [x] 1.2 Author design.md
- [x] 1.3 Author quick-session spec delta (Replay Viewer Consumes Persisted NDJSON Files — 5 scenarios)
- [x] 1.4 Author combat-analytics spec delta (Replay State-From-Events Reducer Contract — 7 scenarios)
- [x] 1.5 `npx openspec validate add-replay-viewer-from-ndjson --strict` clean

## 2. State-from-events reducer

- [x] 2.1 Create `src/hooks/replay/useHexMapStateFromEvents.ts` with the `ReplayHexMapState` interface and the `useHexMapStateFromEvents(events, currentSequence)` hook signature
- [x] 2.2 Implement `GameCreated` reducer: seeds `tokens` (one variant-correct `IUnitToken` per unit) and `mapRadius`. Token construction switch on `unit.unitType ?? UnitType.BattleMech`.
- [x] 2.3 Implement `MovementDeclared` reducer: updates `position` to `payload.to` and `facing` to `payload.facing` on the actor token
- [x] 2.4 Implement `DamageApplied` / `LocationDestroyed` / `TransferDamage` reducers: per-unit per-location damage map; flip `isDestroyed` on CT-destroyed
- [x] 2.5 Implement `UnitDestroyed` reducer: set `isDestroyed = true`
- [x] 2.6 Implement `UnitFell` / `UnitStood` reducers: toggle prone tag (best-effort via existing token rendering)
- [x] 2.7 Implement `HeatGenerated` / `HeatDissipated` reducers: track `currentHeat` per unit
- [x] 2.8 Implement `PilotHit` reducer: increment `pilotWounds` per unit
- [x] 2.9 Wrap the walk in `useMemo` keyed on `[events, currentSequence]`
- [x] 2.10 Empty-prefix safety: return `{ tokens: [], hexTerrain: [], mapRadius: 0 }` when no `GameCreated` is present
- [x] 2.11 Create `src/hooks/replay/__tests__/useHexMapStateFromEvents.test.ts` covering all 7 spec scenarios + edge cases (16 tests, all passing)
- [x] 2.12 Add `src/hooks/replay/index.ts` re-exporting the hook + types

## 3. JSONL file loader

- [x] 3.1 Create `src/components/audit/replay/JsonlFileLoader.tsx` with drag-drop drop zone + file picker button
- [x] 3.2 Implement parse pipeline: `FileReader.readAsText` → split on `\n` → strip empties → `JSON.parse` per line → `isGameEvent` per parsed object (extracted as pure `parseNdjsonEvents` helper)
- [x] 3.3 Per-line error reporting: collect `{ line, error }` entries; on any error, do NOT promote events; render the error list
- [x] 3.4 On success: call `onEventsLoaded(events, filename)` callback prop; render `loaded <filename> (N events, turns <min>–<max>)` status pill
- [x] 3.5 "Clear upload" affordance that calls `onClearUpload()` callback; status pill hides
- [x] 3.6 Verify the loader does NOT make any network calls (pure in-browser file processing) — explicit jest test spies on `fetch` + `XMLHttpRequest`
- [x] 3.7 Create `src/components/audit/replay/__tests__/JsonlFileLoader.test.tsx` covering valid drop, malformed JSON line, valid-JSON-not-IGameEvent line, clear-upload, no-network (11 tests, all passing)
- [x] 3.8 Re-export from `src/components/audit/replay/index.ts`

## 4. Replay page wiring

- [x] 4.1 In `src/pages/gameplay/games/[id]/replay.tsx`, add an `uploadedEvents: readonly IGameEvent[] | null` state plus `uploadedFilename` state
- [x] 4.2 Compose dual-source replay player: `dbReplay` (audit-store-backed) + `uploadReplay` (`useSharedReplayPlayer` directly on uploaded events). Active replay surface picked via `isUploadActive`.
- [x] 4.3 Synthesize the audit-event shape from uploaded `IGameEvent`s via `adaptGameEventToBase` so the existing `EventTimeline` + `ReplayEventOverlay` consume both sources without contract change
- [x] 4.4 Mount `<JsonlFileLoader onEventsLoaded={...} onClearUpload={...} uploadedFilename={...} eventCount={...} minTurn={...} maxTurn={...} />` at the top of the left panel
- [x] 4.5 Wire `useHexMapStateFromEvents(events, replay.currentSequence)` and replace the placeholder `<Card>` in the center pane with `<HexMapDisplay tokens={...} hexTerrain={...} radius={...} selectedHex={null} events={events} />` when upload is active
- [x] 4.6 Add a "loaded from file" indicator pill next to the page header when uploaded events are active
- [x] 4.7 Existing replay-page tests stay green; the placeholder branch still renders when no upload is active

## 5. Verification

- [x] 5.1 `npm run typecheck` clean
- [x] 5.2 `npm run lint` clean (43 pre-existing warnings, 0 errors)
- [x] 5.3 `npm test -- --testPathPattern="(useHexMapStateFromEvents|JsonlFileLoader)"` green (27 tests pass)
- [x] 5.4 `npm test` full suite green (931 suites pass, 23521/23521 tests, no regressions)
- [ ] 5.5 Smoke run: launch dev server, navigate to `/gameplay/games/<any>/replay`, drag the latest swarm `.jsonl` from `simulation-reports/games/2026-05-07T05-52-10-802Z/` onto the loader, scrub the timeline through the encounter and verify the hex map updates frame-by-frame (movements visible, kills flip the destroyed flag)
- [x] 5.6 `npx openspec validate add-replay-viewer-from-ndjson --strict` clean

## 6. PR

- [ ] 6.1 Commit on branch `replay-viewer/pr-a1-jsonl-loader`
- [ ] 6.2 Open PR against `main` with title `feat(replay): add JSONL file loader + state-from-events reducer for hex-map replay`
- [ ] 6.3 Wait for CI green
- [ ] 6.4 Merge with `--squash --delete-branch`

## 7. Archive

- [ ] 7.1 After merge, run `npx openspec archive add-replay-viewer-from-ndjson --yes` — clean
- [ ] 7.2 Open archive PR; merge
