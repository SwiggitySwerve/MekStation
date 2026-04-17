# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Session Exposes Combat Outcome

Every `IGameSession` SHALL expose a `getOutcome()` method that returns the
derived `ICombatOutcome` once the session is `Completed`. The outcome SHALL
be memoized per session instance so repeated calls return the same object
reference.

#### Scenario: Completed session exposes outcome

- **GIVEN** an `IGameSession` with status `Completed`
- **WHEN** `session.getOutcome()` is called
- **THEN** it SHALL return a valid `ICombatOutcome` with current `version`
- **AND** a second call SHALL return a reference-equal object

#### Scenario: Active session throws on outcome request

- **GIVEN** an `IGameSession` with status `InProgress` or `Setup`
- **WHEN** `session.getOutcome()` is called
- **THEN** `CombatNotCompleteError` SHALL be thrown

### Requirement: Session Persists Outcome

When a session completes, the derived `ICombatOutcome` SHALL be persisted to
the match store alongside the event log. Reloads of the match SHALL restore
the outcome without re-deriving.

#### Scenario: Outcome written on completion

- **GIVEN** a session that has just emitted `GameEnded`
- **WHEN** the match persistence layer handles the event
- **THEN** a POST to `/api/matches` SHALL include `outcome: ICombatOutcome`
- **AND** the stored record SHALL contain the outcome JSON

#### Scenario: Outcome retrieval

- **GIVEN** a persisted match with id M
- **WHEN** `GET /api/matches/M/outcome` is called
- **THEN** the response body SHALL equal the originally persisted outcome
- **AND** the response status SHALL be 200
