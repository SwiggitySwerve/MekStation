## ADDED Requirements

### Requirement: Event Envelope Replay Source Discriminator

Every `IGameEvent` SHALL carry an optional `replaySource: ReplaySource` field on `IGameEventBase`. The field SHALL be set at emission time by whichever subsystem emits the event (swarm runner sets `Swarm`; quick-game subsystem sets `Quick`; future PvP subsystem sets `PvP`; future campaign emitter sets `Campaign`). The single-chokepoint event builder (`createGameEvent` in `src/simulation/runner/phases/utils.ts`) SHALL accept a `replaySource` argument and write it through to the produced event.

The field SHALL be optional on `IGameEventBase` so legacy NDJSON event streams written before this change replay unchanged.

The field name SHALL be `replaySource` and SHALL NOT be `source` to avoid naming collision with payload-level `source` fields on heat events (`'movement'|'weapons'|'dissipation'`) and pilot-hit events (`'head_hit'|'ammo_explosion'|...`).

#### Scenario: Swarm runner emits events with replaySource=swarm

- **GIVEN** the CLI swarm runner is producing events for a simulation
- **WHEN** any `IGameEvent` is emitted via `createGameEvent`
- **THEN** the resulting event SHALL have `replaySource: ReplaySource.Swarm`

#### Scenario: Quick game emits events with replaySource=quick

- **GIVEN** an in-app quick game session emitting events into the in-process event store
- **WHEN** any `IGameEvent` is appended to the store
- **THEN** the resulting event SHALL have `replaySource: ReplaySource.Quick`

#### Scenario: Legacy event streams replay despite missing replaySource

- **GIVEN** an NDJSON event log written before this change (no `replaySource` field on any event)
- **WHEN** the events are loaded by the replay viewer or the backfill scan
- **THEN** processing SHALL succeed
- **AND** consumers MAY infer `replaySource = ReplaySource.Swarm` for files discovered under the legacy `simulation-reports/games/<ts>/` flat layout

#### Scenario: replaySource serializes through NDJSON round-trip

- **GIVEN** an event with `replaySource: ReplaySource.Quick` that is serialized via `JSON.stringify`
- **WHEN** the resulting line is parsed via `JSON.parse`
- **THEN** the parsed event's `replaySource` field SHALL equal `'quick'`
- **AND** consumers SHALL be able to compare the field against `ReplaySource.Quick` enum value successfully

## MODIFIED Requirements

### Requirement: Base Event Properties

The system SHALL create base event properties with gameId, sequence, timestamp, type, turn, phase, optional actorId, and optional `replaySource: ReplaySource`.

#### Scenario: Create base event with all properties

- **GIVEN** gameId="game-123", sequence=5, type=GameEventType.MovementDeclared, turn=3, phase=GamePhase.Movement, actorId="mech-1", replaySource=ReplaySource.Swarm
- **WHEN** creating a base event
- **THEN** the event SHALL have id (UUID), gameId="game-123", sequence=5, timestamp (ISO 8601), type=MovementDeclared, turn=3, phase=Movement, actorId="mech-1", replaySource=ReplaySource.Swarm

#### Scenario: Create base event without actorId

- **GIVEN** gameId="game-456", sequence=1, type=GameEventType.GameCreated, turn=0, phase=GamePhase.Initiative, replaySource=ReplaySource.Quick
- **WHEN** creating a base event without actorId
- **THEN** the event SHALL have actorId=undefined
- **AND** SHALL have replaySource=ReplaySource.Quick

#### Scenario: Timestamp is ISO 8601 format

- **GIVEN** any event creation
- **WHEN** the event is created
- **THEN** the timestamp SHALL be a valid ISO 8601 string (e.g., "2026-02-12T10:30:00.000Z")

#### Scenario: replaySource is optional for legacy streams

- **GIVEN** an event constructed without specifying replaySource (legacy code path)
- **WHEN** creating a base event
- **THEN** the event SHALL be valid
- **AND** the `replaySource` field SHALL be `undefined` (and SHALL be omitted from `JSON.stringify` output)
