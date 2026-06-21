# auto-save-persistence Delta — persist-and-recover-interactive-battles

## ADDED Requirements

### Requirement: Local Interactive Match Recovery Round-Trip

The auto-save persistence system SHALL provide a complete, executable
recover round-trip for local interactive matches: the already-wired IndexedDB
match-log write side (every event mirrored through
`InteractiveSession.appendAndPersistEvent` → `matchLogStorage.appendEvent`) SHALL
be matched by a client read path that rebuilds a drivable session from the log,
the launch path SHALL guarantee the log is recoverable before navigation, and a
refresh/close of an active interactive match SHALL never lose the match silently.

#### Scenario: Launch persists a recoverable log before navigation

- **GIVEN** an interactive match is launched and the UI is about to navigate to
  `/gameplay/games/<id>`
- **WHEN** the launch handshake completes
- **THEN** the match-log store SHALL contain a non-empty event log for `<id>`
  beginning with `GameCreated`, flushed before navigation
- **AND** a match-metadata row SHALL be upserted for `<id>`
- **AND** a hydrate immediately after navigation SHALL find the log.

#### Scenario: Reload recovers the persisted log into equal state

- **GIVEN** an interactive match that appended movement and attack events, each
  mirrored to the match-log store
- **WHEN** the page is reloaded (a fresh store and a fresh storage handle over the
  same persisted data) and the session is loaded by id
- **THEN** the recovered session's `currentState` SHALL equal the pre-reload
  `currentState`
- **AND** the recovered session SHALL be drivable (it accepts a further move or
  attack), not a read-only replay.

#### Scenario: Refresh-loss warning safety net on an active interactive match

- **GIVEN** an interactive `InteractiveSession` is the active store session and the
  match is not `Completed`
- **WHEN** the player attempts to refresh, close the tab, or navigate away
- **THEN** a `beforeunload` guard SHALL warn the player that leaving interrupts the
  live match
- **AND** the guard SHALL apply even in the narrow window before the first event
  flush or when IndexedDB is unavailable, so the reload is never silently
  destructive
- **AND** the guard SHALL NOT be registered for the demo session, spectator
  playback, a completed match, or when there is no active session.

#### Scenario: Unavailable storage degrades without crashing

- **GIVEN** the match-log store is unavailable (private-mode or quota-blocked)
- **WHEN** an interactive match is launched and then reloaded
- **THEN** the launch SHALL not crash and the match SHALL still run in memory
- **AND** the reload SHALL surface a non-crashing "could not recover" error rather
  than an unhandled rejection
- **AND** the refresh-loss warning SHALL still have protected the player at unload
  time.
