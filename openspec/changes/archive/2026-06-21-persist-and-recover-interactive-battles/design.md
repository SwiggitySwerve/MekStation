# Design: Persist and Recover In-Progress Interactive Battles

## Context

The interactive-battle persistence loop is asymmetric. The **write** half is
complete and exercised on every event:

- `InteractiveSession.appendAndPersistEvent` appends to the in-memory session and
  calls `persistMatchLogEvent`, which fires `matchLogStorage.appendEvent(matchId, event)`
  against the IndexedDB-backed `MatchLogStorage`
  (`src/engine/InteractiveSession.ts:664-677`).
- `MatchLogStorage` batches writes per animation frame, keys records by
  `[matchId, sequence]`, and exposes `getEventsForMatch` / `getLastSequence` /
  `upsertMatchMetadata` (`src/lib/p2p/matchLogStorage.ts`). This satisfies the
  `auto-save-persistence` "Game Event Log Storage" and "Batched Writes"
  requirements.

The **read/recover** half exists as factories but is unreachable from the client
load path:

- `InteractiveSession.fromMatchLog(matchId)` → `hydrateSessionFromMatchLog` reads
  the log and folds it into an `IGameSession` *data shape*
  (`src/engine/InteractiveSession.persistence.ts:20-39`). This is data, not a
  drivable engine instance.
- To get a *drivable* session the log must be replayed into a live engine via
  `InteractiveSession.fromSessionAsync` — exactly what the server does in
  `MatchRecovery.rebuildSessionFromEvents`
  (`src/lib/multiplayer/server/MatchRecovery.ts:80-86`), which composes
  `hydrateGameSessionFromEvents` + `fromSessionAsync`.
- `loadSessionLogic` (`src/stores/useGameplayStore.session.ts:98-124`) does none
  of this: it special-cases `'demo'` and throws `"Session not found"` for every
  other id, never touching the match log.

So the move-by-move record of a 30-minute battle is faithfully written and then
discarded on reload because the load path does not read it. The launch path
(`usePreBattleLaunch.ts:140-156`) adopts the live session in memory and navigates;
the subsequent reload is the failure trigger.

## Decisions

### D1. Recovery source of truth is the IndexedDB match log, replayed into a live engine

`loadSessionLogic(id)` for a non-`'demo'` id SHALL:
1. Read the persisted event log for `id` via the existing client hydration
   (`InteractiveSession.fromMatchLog(id)` / `getEventsForMatch(id)`).
2. If the log is non-empty and begins with `GameCreated`, rebuild a **live**
   `InteractiveSession` by composing the existing factories the same way the
   server recovery does — `fromSessionAsync` over the hydrated session — so the
   recovered match can accept moves/attacks, not only render a static replay.
3. Adopt the recovered live session through the existing
   `setInteractiveSessionLogic` path so the store reaches the exact same shape as
   a freshly-launched match.

**Rationale:** the event log is already the canonical record (event-sourced
architecture, derived state). Reusing the server's proven replay-into-engine
sequence (`fromSessionAsync`) avoids a second recovery codepath and inherits the
`fix-recovered-session-adapted-units` fix (per-unit adapted maps repopulated).
Adopting through `setInteractiveSessionLogic` means the recovered match is
indistinguishable from a launched one.

### D2. No Zustand `persist` middleware; the log is the only durable copy

We do NOT add `persist` to the gameplay store. The store holds *derived* state
(weapons, armor, pilot maps, interactive phase) computed from the session. The
durable source of truth is the event log in IndexedDB; the store rehydrates from
the recovered `InteractiveSession`, which re-derives every slice.

**Rationale (simplest-solution-first):** persisting store slices would create a
second copy of session-derived data that can drift from the event log — the
exact class of bug the event-sourced design avoids. One durable copy, replayed.

### D3. Unknown id fails with a recoverability-aware error, not a blanket string

The load path SHALL distinguish three outcomes for a non-`'demo'` id:
- **Recovered** — log found and replayed; session adopted.
- **Not found** — no persisted log for the id (e.g. a stale/typo deep link):
  surface a precise "match not found or already cleared" error.
- **Corrupt** — a log exists but cannot be rebuilt (missing `GameCreated`,
  malformed): surface a distinct corrupt-log error and DO NOT fall back to demo.

**Rationale:** the current `"Session not found"` conflates "never existed" with
"exists but we never tried to load it", and gives the player no signal. The
match-log divergence reporting (`reportMatchLogDivergence`) already exists for the
corrupt/diverged case and is reused.

### D4. Launch guarantees recoverability before navigation

`usePreBattleLaunch` (interactive mode) SHALL ensure the match log is durable
enough to recover before `router.push`: the initial `GameCreated` (and any
pre-navigation events) are flushed via `flushMatchLogWrites()` and the match
metadata row is upserted with the session id. The IndexedDB write is batched per
animation frame, so without an explicit flush a refresh in the first frame after
navigation could race ahead of the first persisted event.

**Rationale:** closes the cold-start window where the persistence write side has
"fired" but not yet committed when the reload happens.

### D5. `beforeunload` warning is the safety-net floor, not the fix

While an interactive `InteractiveSession` is the active store session, register a
`beforeunload` guard that warns the player a refresh/close interrupts the live
match. This is the minimum-acceptable behavior named in C-9 ("at minimum warn the
player"), and it remains correct even after D1–D4 land — recovery makes the
warning rarely consequential, but it still prevents a silently-destructive reload
in the narrow pre-first-flush window or if IndexedDB is unavailable.

**Rationale:** defense-in-depth. Recovery is the real fix; the warning guarantees
no *silent* loss even when recovery cannot apply (private-mode IndexedDB blocked,
quota exceeded). The `auto-save-persistence` spec already defines a
`beforeunload` warning pattern for `useGameStatePersistence`; this reuses the
established pattern keyed on an active interactive session.

## Open Questions

(none)

## Risks

- **R1 — IndexedDB unavailable (private mode / quota).** `MatchLogStorage` rejects
  with `MatchLogStorageUnavailableError`. Recovery then cannot apply; the load
  path must treat this as "not recoverable" (precise error, no crash) and the D5
  `beforeunload` warning is the only protection. Mitigation: the round-trip test
  includes an unavailable-storage case asserting a graceful, non-crashing error.
- **R2 — Replay/seed determinism.** Recovered sessions re-seed the RNG
  (`fromSession` uses a fixed seed); future *new* dice rolls after recovery use a
  fresh seed, but already-resolved events carry their rolls on payload
  (game-session-management "Rolls Embedded on Randomness-Consuming Events"), so
  derived state is reproduced exactly. Mitigation: assert recovered
  `currentState` deep-equals pre-reload `currentState`.
- **R3 — Metadata/event ordering at launch.** If `upsertMatchMetadata` and the
  first event flush race, a hydrate could see events without metadata. Mitigation:
  D4 flushes events first; recovery keys off events (`getEventsForMatch`), not
  metadata, so metadata is advisory.
- **R4 — Double-adopt on a still-warm store.** If the session is already in memory
  (the existing idempotency guard at `useGameplayStore.session.ts:104-109`),
  recovery must short-circuit before touching IndexedDB. Mitigation: preserve the
  existing in-memory fast-path ahead of the recover branch.
