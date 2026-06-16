# Change: Persist and Recover In-Progress Interactive Battles

## Why

A refresh, deep-link, or back/forward on an active interactive match destroys a
30+ minute game with a "Failed to Load Game" screen and no warning (audit finding
**C-9**). The root cause is a half-wired persistence loop:

- `loadSessionLogic` throws `"Session not found"` for any session id that is not
  the literal string `'demo'` unless the session is already in memory
  (`src/stores/useGameplayStore.session.ts:113-117`). It never consults any
  durable store.
- The gameplay store is created with a plain `create<GameplayStore>((set, get) => …)`
  and has no `persist` middleware (`src/stores/useGameplayStore.ts:297`), so the
  adopted `InteractiveSession` lives only in JS heap.
- The launch path adopts the live session in memory only via
  `setInteractiveSession(interactiveSession)` and then navigates to
  `/gameplay/games/${session.id}` (`src/components/gameplay/pages/preBattle/usePreBattleLaunch.ts:148,155`).
  After navigation, a reload re-runs `loadSession(id)` against an id the store
  cannot resolve.

The write half of the loop is already present and working: every event is
mirrored to IndexedDB through `InteractiveSession.appendAndPersistEvent` →
`persistMatchLogEvent` → `matchLogStorage.appendEvent`
(`src/engine/InteractiveSession.ts:664-677`), and a client hydration factory
already exists — `InteractiveSession.fromMatchLog(matchId)` →
`hydrateSessionFromMatchLog` reads the log back out of IndexedDB
(`src/engine/InteractiveSession.persistence.ts:20-39`). The audit cites
`MatchRecovery.rebuildSessionFromEvents` (`src/lib/multiplayer/server/MatchRecovery.ts:80-86`)
as the recovery primitive, but that helper is server-only; its client-side
analog — replaying the log into a *live* engine via `InteractiveSession.fromSessionAsync`
— is never reached from the client load path. The only missing link is the
**read/recover** half inside `loadSessionLogic`.

The result is that a persistence layer that already records every move silently
throws away the recorded game on reload because the load path does not read it.

## What Changes

- Wire the existing client match-log hydration into `loadSessionLogic`: for a
  non-`'demo'` id, read the persisted event log (via `getEventsForMatch` /
  `InteractiveSession.fromMatchLog`), rebuild a **live** `InteractiveSession`
  through `fromSessionAsync` (the client analog of the server's
  `rebuildSessionFromEvents`), and adopt it through the existing
  `setInteractiveSessionLogic` path so the recovered match is fully playable —
  not just a static replay.
- Preserve the demo fast-path and produce a precise "match not found / not
  recoverable" error only when no persisted log exists for the id (distinct
  from a corrupt-log error), instead of the current blanket `"Session not found"`.
- Guarantee the launch path records enough to recover before navigation: the
  initial `GameCreated` (and any pre-navigation events) are flushed to the
  match-log store so a hydrate immediately after `router.push` succeeds, and the
  match-log metadata row is upserted with the session id at launch.
- Add a minimum safety net: while an interactive match is the active store
  session and recovery is not yet guaranteed durable, warn the player before an
  unload/navigation that ends the battle (a `beforeunload` guard), so a refresh
  is never silently destructive even on the cold-start edge before the first
  flush.
- Promote the persistence contract from "documented but unwired on the
  single-player/local interactive path" to an executable, behavior-pinned
  requirement: a recover round-trip test that launches an interactive session,
  appends events, simulates a reload (fresh store + IndexedDB-backed match log),
  and asserts the recovered session's `currentState` equals the pre-reload state
  and is drivable.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `game-session-management`: gains an "Interactive Session Recovery on Load"
  behavior governing `loadSessionLogic` — real ids rehydrate from the match log
  into a live, drivable session; unknown ids fail with a precise,
  recoverability-aware error rather than a blanket "Session not found".
- `auto-save-persistence`: gains a "Local Interactive Match Recovery Round-Trip"
  requirement binding the already-wired IndexedDB match-log write side to a
  client read/recover path with a guaranteed-recoverable launch and a
  refresh-loss warning safety net.

## Impact

- `src/stores/useGameplayStore.session.ts` — `loadSessionLogic` reads the match
  log and rebuilds/adopts a live `InteractiveSession`; new recoverability-aware
  error strings.
- `src/stores/useGameplayStore.ts` — load wiring (pass the recover dependency
  through `loadSession`), optional `beforeunload` guard registration tied to an
  active interactive session.
- `src/engine/InteractiveSession.ts` / `src/engine/InteractiveSession.persistence.ts`
  — confirm `fromMatchLog` → `fromSessionAsync` is the client recover entry
  point; expose a single client-facing `recoverInteractiveSession(matchId)`
  helper if one does not already compose cleanly.
- `src/components/gameplay/pages/preBattle/usePreBattleLaunch.ts` — flush the
  initial events + upsert match metadata before `router.push` so the post-nav
  hydrate is guaranteed to find the log.
- `src/lib/p2p/matchLogStorage.ts` — read path (`getEventsForMatch`,
  `getLastSequence`) consumed by the client recover; no schema change.
- New test: `src/stores/__tests__/useGameplayStore.recover.test.ts` (or sibling)
  — launch → append → simulated reload → recover round-trip over a mock
  IndexedDB (`src/__tests__/mocks/storage/MockIndexedDB.ts`).

## Non-goals

- No new persistence layer, store, or façade — the IndexedDB `MatchLogStorage`
  and the `fromMatchLog` / `fromSessionAsync` factories already exist; this
  change wires the existing read path into the client load path only.
- No Zustand `persist` middleware on the whole gameplay store — the event log in
  IndexedDB is the source of truth; persisting derived store slices would create
  a second, drift-prone copy of session state.
- No cross-device / server-store reconnect work — that path is owned by the
  networked `Cross-Device Reconnect Depends On Server Store` requirement and is
  out of scope here (this change covers local/single-player interactive
  recovery on the same device).
- No changes to the server-side `MatchRecovery` recovery sweep or
  `ServerMatchHost` — only the client load path is repaired.
- No combat-resolution or movement-projection delta — does not touch the active
  `add-battlemech-combat-validation-suite` or `fix-tactical-projection-agreement-gaps`
  changes.
