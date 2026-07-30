## MODIFIED Requirements

### Requirement: Local Interactive Match Recovery Round-Trip

The auto-save persistence system SHALL provide a complete, executable recover round-trip for local interactive matches. Every authoritative event appended by an `InteractiveSession` mutation, including launch, phase progression, movement, attacks, AI actions, lifecycle transitions, and future command collaborators, SHALL be mirrored to the IndexedDB match log in sequence order. The client read path SHALL rebuild a drivable session from that complete log, the launch path SHALL guarantee the log is recoverable before navigation, and a refresh or close of an active interactive match SHALL never lose the match silently.

#### Scenario: Launch persists a recoverable log before navigation

- **GIVEN** an interactive match is launched and the UI is about to navigate to `/gameplay/games/<id>`
- **WHEN** the launch handshake completes
- **THEN** the match-log store SHALL contain a non-empty event log for `<id>` beginning with `GameCreated`, flushed before navigation
- **AND** a match-metadata row SHALL be upserted for `<id>`
- **AND** a hydrate immediately after navigation SHALL find the log.

#### Scenario: Authoritative post-launch events are mirrored

- **GIVEN** a launched interactive match whose initial events are present in IndexedDB
- **WHEN** the session commits one or more authoritative phase, movement, attack, AI, or lifecycle events
- **THEN** every newly appended event SHALL be enqueued for the same match id exactly once
- **AND** the persisted event sequence and type order SHALL equal the live session's appended event suffix
- **AND** an event-free session replacement SHALL NOT create a synthetic persistence record.

#### Scenario: Reload recovers the persisted log into equal state

- **GIVEN** an interactive match that progressed through a phase and appended movement or attack events after launch
- **AND** the raw IndexedDB match log contains those events in the same sequence and type order as the live session
- **WHEN** the page is reloaded with a fresh store and a fresh storage handle over the same persisted data and the session is loaded by id
- **THEN** the recovered session's events and `currentState` SHALL equal the pre-reload authoritative session
- **AND** the recovered session SHALL remain in the same phase and activation position
- **AND** the recovered session SHALL be drivable and accept a further legal move or attack, not become a read-only replay.

#### Scenario: Refresh-loss warning safety net on an active interactive match

- **GIVEN** an interactive `InteractiveSession` is the active store session and the match is not `Completed`
- **WHEN** the player attempts to refresh, close the tab, or navigate away
- **THEN** a `beforeunload` guard SHALL warn the player that leaving interrupts the live match
- **AND** the guard SHALL apply even in the narrow window before the first event flush or when IndexedDB is unavailable, so the reload is never silently destructive
- **AND** the guard SHALL NOT be registered for the demo session, spectator playback, a completed match, or when there is no active session.

#### Scenario: Unavailable storage degrades without crashing

- **GIVEN** the match-log store is unavailable due to private-mode or quota blocking
- **WHEN** an authoritative interactive match mutation appends an event
- **THEN** the command SHALL not crash and the match SHALL still run in memory
- **AND** match-log divergence SHALL be surfaced through the existing non-crashing error path
- **AND** a later reload SHALL surface a non-crashing "could not recover" error rather than an unhandled rejection
- **AND** the refresh-loss warning SHALL still have protected the player at unload time.
