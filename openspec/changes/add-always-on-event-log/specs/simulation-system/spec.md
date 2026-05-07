# simulation-system — Delta for add-always-on-event-log

## ADDED Requirements

### Requirement: Event Log Chronological Contract

The `IGameEvent.sequence` field (defined on `IGameEventBase` in `src/types/gameplay/GameSessionInterfaces.ts`) is the canonical chronological key for events emitted by `SimulationRunner`. Within a single `gameId`, sequence numbers SHALL be monotonically increasing across consecutive events in `result.events`. Consumers — including the always-on event-log persistence module at `src/simulation/runner/eventLogPersistence.ts` — MAY rely on this ordering without re-sorting.

The existing `IGameEvent` discriminated-union shape (`IGameEventBase` + per-type `payload`) is the contract for persisted event logs. The persistence module SHALL serialize events with `JSON.stringify(event)` and SHALL NOT add wrapper objects, schema-version fields, or transformation layers above the runtime event shape.

The `gameId` field on every `IGameEvent` MUST be stable for the duration of a single `runner.run(simConfig)` invocation. All events emitted by one run share one `gameId`.

#### Scenario: Sequence numbers strictly increase across a run

- **GIVEN** a single completed `runner.run(simConfig)` invocation that returns `result.events`
- **WHEN** the events are iterated in array order
- **THEN** `events[i+1].sequence` SHALL be strictly greater than `events[i].sequence` for every adjacent pair
- **AND** every event's `gameId` SHALL equal `result.gameId`

#### Scenario: Persisted NDJSON preserves the runtime shape exactly

- **GIVEN** an event emitted by the runner with shape `{ id, gameId, sequence, timestamp, type, turn, phase, payload, ... }`
- **WHEN** the event is serialized via `JSON.stringify(event)`, written as one NDJSON line, then re-parsed via `JSON.parse(line)`
- **THEN** the parsed object SHALL deep-equal the original event
- **AND** no consumer-visible fields SHALL be added, removed, or renamed by the persistence layer
