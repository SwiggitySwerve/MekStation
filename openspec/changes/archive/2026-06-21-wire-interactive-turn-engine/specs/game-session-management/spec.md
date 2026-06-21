# game-session-management Delta — wire-interactive-turn-engine

## MODIFIED Requirements

### Requirement: Session Publishes Outcome Ready Event

Upon session completion, the `InteractiveSession` SHALL publish a
`CombatOutcomeReady` event on the global event bus carrying the session
id, match id, and derived `ICombatOutcome`. The once-per-session publish
guard (`outcomePublished`) SHALL latch only when at least one subscriber
consumed the event without throwing; a publish in which every subscriber
threw SHALL leave the guard unset so a later finalize attempt can retry,
and every swallowed subscriber exception SHALL be logged. A subscriber
throw SHALL NOT propagate out of the engine.

#### Scenario: Event published on completion

- **GIVEN** an active session that transitions to `Completed`
- **WHEN** the completion handler runs
- **THEN** `CombatOutcomeReady` SHALL be published on the session bus
- **AND** the event payload SHALL include the full `ICombatOutcome`
- **AND** the outcome SHALL also be POSTed to `/api/matches`

#### Scenario: Event idempotent per session

- **GIVEN** a session that has already published `CombatOutcomeReady`
  once and at least one subscriber consumed it without throwing
- **WHEN** any subsequent action on the session attempts another
  publication
- **THEN** no second `CombatOutcomeReady` SHALL be published for the
  same match id

#### Scenario: Throwing subscriber does not latch the guard

- **GIVEN** an active session that transitions to `Completed`
- **AND** the only subscribed listener throws when it receives the event
  (e.g. a localStorage quota error in the campaign store)
- **WHEN** the completion handler publishes `CombatOutcomeReady`
- **THEN** the listener exception SHALL be caught, logged, and SHALL NOT
  propagate out of the engine
- **AND** the session's `outcomePublished` guard SHALL remain `false`
- **AND** a subsequent finalize attempt SHALL be permitted to re-publish
  the outcome.

#### Scenario: Consumed publish latches the guard exactly once

- **GIVEN** an active session that transitions to `Completed`
- **AND** at least one subscribed listener consumes the event without
  throwing
- **WHEN** the completion handler publishes `CombatOutcomeReady`
- **THEN** the session's `outcomePublished` guard SHALL become `true`
- **AND** any later finalize attempt SHALL be a no-op for the same match
  id.

## ADDED Requirements

### Requirement: Match-Log Divergence Is Observable

The `InteractiveSession` SHALL record a tracked match-log divergence flag,
exposed through an accessor, whenever an asynchronous append to the recoverable
match log fails — in addition to the existing divergence telemetry — so recovery
and UI callers can detect that the persisted log no longer matches the in-memory
session instead of discovering the desync only on a failed rebuild. The flag
SHALL default to a healthy (undiverged) state for a session that has had no
failed appends, and a failed append SHALL NOT throw out of the action that
triggered it.

#### Scenario: Failed match-log append flips the divergence flag

- **GIVEN** an interactive session whose match-log persistence is configured to
  reject an `appendEvent` write (test injection / storage failure)
- **WHEN** an action appends an event that triggers a match-log write and the
  write rejects
- **THEN** the session's divergence accessor SHALL report the match log as
  diverged
- **AND** the divergence SHALL also be reported through the existing telemetry
  path
- **AND** the originating action SHALL complete without throwing.

#### Scenario: Healthy session reports no divergence

- **GIVEN** an interactive session that has had no failed match-log appends
- **WHEN** the divergence accessor is read
- **THEN** it SHALL report the match log as healthy / undiverged.
