## ADDED Requirements

### Requirement: Event Envelope Side Denormalization

Every `IGameEvent` SHALL carry an optional `side: GameSide` field on `IGameEventBase` denormalized from the event's `actorId` at emission time. Consumers (metrics collectors, scenario tests, the readable companion formatter, future UI replay viewers) SHALL be able to filter or display side without separately joining `unitId` to `IGameUnit.side`.

The single-chokepoint event builder (`createGameEvent` in `src/simulation/runner/phases/utils.ts`) SHALL derive `side` from `actorId` using the same prefix rules as `MetricsCollector.sideFromUnitId`:

- `actorId` starting with `'player-'` → `GameSide.Player`
- `actorId` starting with `'opponent-'` → `GameSide.Opponent`
- `actorId` undefined or matching no prefix → `side` field SHALL be omitted (events authored by the system, not a unit, e.g. turn lifecycle)

The field is optional on `IGameEventBase` so legacy NDJSON event streams written before this change replay unchanged.

#### Scenario: Player-prefixed actor produces side=player

- **GIVEN** a `damage_applied` event with `actorId: 'player-1'`
- **WHEN** `createGameEvent` builds the event
- **THEN** the resulting event SHALL have `side: GameSide.Player`

#### Scenario: Opponent-prefixed actor produces side=opponent

- **GIVEN** an `attack_resolved` event with `actorId: 'opponent-2'`
- **WHEN** `createGameEvent` builds the event
- **THEN** the resulting event SHALL have `side: GameSide.Opponent`

#### Scenario: System-authored events (no actorId) omit the side field

- **GIVEN** a `turn_started` event built without an `actorId`
- **WHEN** `createGameEvent` builds the event
- **THEN** the resulting event SHALL NOT have a `side` field (or SHALL have it set to `undefined`)
- **AND** `JSON.stringify` SHALL omit `side` from the serialized line

#### Scenario: Legacy event streams replay despite missing side

- **GIVEN** an NDJSON event log written before this change (no `side` field on any event)
- **WHEN** the events are loaded and processed by `MetricsCollector` or any other consumer
- **THEN** processing SHALL succeed
- **AND** consumers MAY fall back to the legacy `sideFromUnitId(actorId)` derivation

### Requirement: Turn Lifecycle Event Emission Contract

The simulation runner SHALL emit `turn_started`, `turn_ended`, and `phase_changed` events at the boundaries of every turn and phase, in monotonically-increasing `sequence` order. These events SHALL be authored without an `actorId` (system-emitted) and SHALL therefore omit `side` per the Event Envelope Side Denormalization requirement.

#### Scenario: Every turn boundary emits turn_started and turn_ended

- **GIVEN** a simulation that runs N turns
- **WHEN** the event log is collected
- **THEN** there SHALL be exactly N `turn_started` events
- **AND** there SHALL be exactly N `turn_ended` events
- **AND** for each turn t, the `turn_started` event for turn t SHALL precede the `turn_ended` event for turn t in `sequence` order

#### Scenario: Every phase change inside a turn emits phase_changed

- **GIVEN** a turn that traverses Movement → WeaponAttack → PhysicalAttack → PostCombat phases
- **WHEN** the event log for that turn is collected
- **THEN** the events SHALL include at least three `phase_changed` events (one per phase boundary)
- **AND** each `phase_changed.payload.phase` SHALL match the upcoming phase identifier

### Requirement: Initiative Event Emission Contract

The simulation runner SHALL emit an `initiative_rolled` event at the start of every turn that uses dice-based initiative. The event payload SHALL carry the rolled values for each side and the resulting initiative winner.

#### Scenario: Initiative rolled at turn start

- **GIVEN** the runner enters a new turn with dice-based initiative enabled
- **WHEN** the initiative-determination step runs
- **THEN** an `initiative_rolled` event SHALL be emitted before the first phase event of the turn
- **AND** the event payload SHALL carry both sides' rolled values
