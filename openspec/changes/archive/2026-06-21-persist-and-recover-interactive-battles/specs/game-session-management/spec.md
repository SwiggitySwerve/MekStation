# game-session-management Delta — persist-and-recover-interactive-battles

## ADDED Requirements

### Requirement: Interactive Session Recovery on Load

The client session loader SHALL rehydrate an in-progress interactive match from
its persisted event log when asked to load a real (non-`'demo'`) session id,
producing a live, drivable `InteractiveSession` rather than failing. Recovery
SHALL replay the persisted log into a live engine via the same
`hydrateGameSessionFromEvents` + `InteractiveSession.fromSessionAsync` sequence
the server-side `MatchRecovery.rebuildSessionFromEvents` uses, and SHALL adopt
the result so the recovered match is indistinguishable from a freshly launched
one. The loader SHALL distinguish "not found" (no persisted log) from "corrupt"
(a log exists but cannot be rebuilt) and SHALL NOT silently fall back to the demo
session on a corrupt log.

#### Scenario: Real id with persisted log recovers a drivable session

- **GIVEN** an interactive match `sess_abc` whose event log was persisted to the
  client match-log store during play
- **AND** a fresh gameplay store with no in-memory session
- **WHEN** `loadSession('sess_abc')` is called
- **THEN** the loader SHALL read the persisted log and rebuild a live
  `InteractiveSession` via `fromSessionAsync`
- **AND** the recovered session SHALL be adopted so `state.interactiveSession` is
  set and `state.error` is `null`
- **AND** the recovered `currentState` (status, turn, phase, board, per-unit
  damage and heat) SHALL equal the state derived by folding the full persisted
  log through `deriveState`
- **AND** the recovered session SHALL accept a subsequent move or attack (it is
  drivable, not a static replay).

#### Scenario: Demo id keeps its existing fast-path

- **GIVEN** a fresh gameplay store
- **WHEN** `loadSession('demo')` is called
- **THEN** the loader SHALL create the demo session as before
- **AND** SHALL NOT consult the match-log store.

#### Scenario: Already-loaded session is idempotent

- **GIVEN** the requested session id is already the in-memory store session
- **WHEN** `loadSession(id)` is called
- **THEN** the loader SHALL short-circuit with `isLoading=false` and `error=null`
- **AND** SHALL NOT read the match-log store or rebuild the session.

#### Scenario: Unknown id surfaces a precise not-found error

- **GIVEN** an id with no persisted event log (e.g. a stale or mistyped deep link)
- **WHEN** `loadSession(id)` is called
- **THEN** `state.error` SHALL be a precise message indicating the match was not
  found or has already been cleared
- **AND** the message SHALL NOT be the legacy blanket `"Session not found"` for a
  log that simply was never tried.

#### Scenario: Corrupt log does not fall back to demo

- **GIVEN** an id whose persisted log is non-empty but cannot be rebuilt (missing
  `GameCreated` or malformed)
- **WHEN** `loadSession(id)` is called
- **THEN** the loader SHALL surface a distinct corrupt-log error
- **AND** SHALL NOT replace the failed load with a demo session.

#### Scenario: IndexedDB unavailable fails gracefully

- **GIVEN** the client match-log store rejects with
  `MatchLogStorageUnavailableError` (e.g. private-mode or quota-blocked storage)
- **WHEN** `loadSession(id)` is called for a real id
- **THEN** the loader SHALL set a non-crashing error indicating the match could
  not be recovered
- **AND** the application SHALL remain usable (no unhandled rejection).
