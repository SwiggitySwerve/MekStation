# Tasks — add-quickgame-replay-panel

## 1. Authoring

- [x] 1.1 Author `proposal.md`
- [x] 1.2 Author spec delta for `quick-session` (1 ADDED requirement, 3 scenarios)
- [x] 1.3 Author `tasks.md`
- [x] 1.4 `npx openspec validate add-quickgame-replay-panel --strict` clean

## 2. Implement QuickGameReplayPanel

- [x] 2.1 Create `src/components/quickgame/QuickGameReplayPanel.tsx`
  - Props: `{ events: readonly IGameEvent[]; gameId: string }`
  - Mount `useSharedReplayPlayer({ gameId, events })` for scrubber/playback
  - Mount `useHexMapStateFromEvents(events, currentSequence)` for hex-map projection
  - Render `<HexMapDisplay>` (visible area), `<ReplayTimeline>` (below), `<ReplayControls>` (bottom)
  - Empty-events guard: render a friendly placeholder when `events.length === 0`
  - NO `JsonlFileLoader` — events are in-memory only

## 3. Wire QuickGameResults integration

- [x] 3.1 Modify `src/components/quickgame/quickGameResults.helpers.ts`
  - Extend `ResultsTab` union with `'replay'`
  - Append `{ id: 'replay', label: 'Replay' }` to `RESULTS_TABS`
- [x] 3.2 Modify `src/components/quickgame/QuickGameResults.tsx`
  - Add fifth `<div role="tabpanel" id="tabpanel-replay" ...>` block
  - Render `<QuickGameReplayPanel events={game.events} gameId={game.id} />` inside (conditionally — panel mounts only when active to keep replay state derivation off the critical path of the four other tabs, per spec scenario "panel is unmounted/remounted between tab toggles")
  - Existing four tabpanels remain untouched
- [x] 3.3 Modify `src/components/quickgame/index.ts`
  - Re-export `QuickGameReplayPanel`

## 4. Tests

- [x] 4.1 Create `src/components/quickgame/__tests__/QuickGameReplayPanel.test.tsx`
  - Empty-events guard test (placeholder renders, no HexMapDisplay)
  - Hex-map projection test (HexMapDisplay mounts with 2 tokens, radius 17)
  - Transport controls test (Play/Step Forward/Step Backward render)
  - Step-forward advances playback test
- [x] 4.2 Update `src/components/quickgame/__tests__/QuickGameResults.test.tsx`
  - Tab count assertion: 4 → 5 tabs (now includes Replay)
  - Wrap-from-last test: Timeline → Replay (new last tab)
  - Mock fixture: add minimal payloads to GameStarted/UnitDestroyed/GameEnded so reducer walk doesn't throw when Replay tab mounts

## 5. Verification

- [x] 5.1 `npx tsc --noEmit` clean
- [x] 5.2 `npx oxlint src/components/quickgame/ src/hooks/replay/` — no new errors (1 pre-existing console.warn from #541's lossy-fallback)
- [x] 5.3 `npx jest --testPathPattern="QuickGameReplayPanel|QuickGameResults"` — 25/25 green
- [x] 5.4 `npx openspec validate add-quickgame-replay-panel --strict` clean

## 6. PR

- [ ] 6.1 Commit (`feat(quickgame): add hex-map replay tab to results page`)
- [ ] 6.2 Push branch `replay-viewer/pr-a2-quickgame-panel`
- [ ] 6.3 Open PR targeting `main`
- [ ] 6.4 Wait for CI green
- [ ] 6.5 Merge (squash, delete branch)

## 7. Archive

- [ ] 7.1 `openspec archive add-quickgame-replay-panel`
- [ ] 7.2 Verify `quick-session` source-of-truth spec absorbed the new requirement
