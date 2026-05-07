# Add quick-game in-page replay panel powered by useHexMapStateFromEvents

## Why

PR A1 (`add-replay-viewer-from-ndjson`) shipped a drag-drop NDJSON loader + a state-from-events reducer that any consumer can mount over `<HexMapDisplay>`. PR #542 (`emit-game-created-from-runner`) made the headless runner emit `GameCreated` so the reducer's tokens always seed correctly.

The quick-game flow already produces a complete `IGameEvent[]` log per encounter (stored in `useQuickGameSelector(s => s.game.events)`), and the existing `QuickGameResults.tsx` page renders four tabs (Summary / Units / Damage / Timeline). It's the natural home for an integrated replay viewer — users just finished an encounter and the events are in memory; they don't need to drag a file in.

## What

### `QuickGameReplayPanel.tsx` — composed replay panel for the quickgame flow

New file at `src/components/quickgame/QuickGameReplayPanel.tsx`:

- Accepts `events: readonly IGameEvent[]` as a prop (the host `QuickGameResults` passes `game.events` directly).
- Mounts `useSharedReplayPlayer({ gameId, events })` for the scrubber + playback state.
- Mounts `useHexMapStateFromEvents(events, currentSequence)` for the hex-map projection.
- Renders the same composition as the standalone replay page, scoped to the panel:
  - `<HexMapDisplay tokens hexTerrain radius events selectedHex={null} />` in the visible area.
  - `<ReplayTimeline progress markers onSeek currentSequence />` below.
  - `<ReplayControls playbackState canStepBackward canStepForward onPlay onPause onStop onStepForward onStepBackward />` at the bottom.

The panel does NOT add a JsonlFileLoader — events come from the in-memory game store. There's no upload affordance because the encounter is already loaded.

### `QuickGameResults` integration

Modify `src/components/quickgame/QuickGameResults.tsx`:

- Add a fifth tab `'replay'` to the existing `RESULTS_TABS` constant.
- Render `<QuickGameReplayPanel events={game.events} gameId={game.id} />` inside the new tabpanel.
- Keep all existing tabs (Summary / Units / Damage / Timeline) untouched.

### Spec delta

`quick-session` ADD: `Quick-Game Results Page Renders Hex-Map Replay`. Covers:

- The Results page exposes a "Replay" tab.
- The tab mounts a panel that drives the existing `<HexMapDisplay>` from `useHexMapStateFromEvents` over the in-memory `game.events`.
- The panel reuses `useSharedReplayPlayer` for scrubber state — no separate replay state machine.
- Switching between Replay and other tabs preserves existing page state (active tab is remembered; replay player is unmounted/remounted between toggles, which is the simpler scope choice — preserving scrubber position across tab switches is out of scope).

## Impact

- **Affected types**: none.
- **Affected code**:
  - NEW `src/components/quickgame/QuickGameReplayPanel.tsx` (~80-120 LOC)
  - NEW `src/components/quickgame/__tests__/QuickGameReplayPanel.test.tsx` (~80-100 LOC)
  - MODIFY `src/components/quickgame/quickGameResults.helpers.ts` — add `'replay'` to `RESULTS_TABS`
  - MODIFY `src/components/quickgame/QuickGameResults.tsx` — add Replay tabpanel
  - MODIFY `src/components/quickgame/index.ts` — re-export `QuickGameReplayPanel`
- **Affected specs**: `quick-session` (ADDED — 1 requirement, 3 scenarios).
- **Risk**: low — pure composition over already-shipped reducer + player; existing tab behavior unchanged; new tab is additive.

## Out of scope

- Persistence of scrubber position across tab switches (each Replay tab visit starts from sequence 0).
- Animation interpolation between hexes (post-step states only — same as PR A1).
- Key-moment markers on the timeline (PR A3).
- Quick-game uses `useSharedReplayPlayer` not `useReplayPlayer`; no audit-store integration is added.
