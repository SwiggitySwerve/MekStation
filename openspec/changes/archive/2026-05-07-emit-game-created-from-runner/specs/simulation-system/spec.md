## ADDED Requirements

### Requirement: Runner Emits GameCreated as Seed Event

`SimulationRunner.run(config)` SHALL emit a `GameCreated` event as the first entry in the returned `events` array (`sequence: 0`). The payload SHALL include the full unit roster in `payload.units` and the per-game configuration in `payload.config`. This is the seed event that every downstream consumer of the persisted NDJSON event log relies on (replay viewer state-from-events reducer, future fog-aware client filtering, future scenario-test bootstrap helpers).

The payload SHALL conform to `IGameCreatedPayload`:
- `payload.units` MUST contain one `IGameUnit` entry per slot the runner allocates. The `id` of each entry MUST match the slot id used by `createInitialState` (`player-N` / `opponent-N`). The entry's `side` MUST match the slot's `IUnitGameState.side`.
- `payload.config.mapRadius` MUST equal the input `ISimulationConfig.mapRadius`.
- `payload.config.turnLimit` MUST equal the input `ISimulationConfig.turnLimit`.
- `payload.config.victoryConditions` and `payload.config.optionalRules` MAY be defaulted (`['destruction']` and `[]` respectively) — the runner is single-mode today, so these stay synthetic.

When the runner is constructed with a `UnitHydrationMap`, each entry's `name`, `unitRef`, `pilotRef`, `gunnery`, and `piloting` SHALL be populated from the hydration data. When no hydration is present (synthetic minimal-unit fallback), `name` MAY equal the slot id, `unitRef` and `pilotRef` MAY be synthetic placeholders, and `gunnery` / `piloting` SHALL fall back to the runner's default skill values.

The runner MUST emit `GameCreated` exactly once per `run(config)` invocation, before any turn-phase events.

#### Scenario: First event in a swarm run is GameCreated

- **GIVEN** a SimulationRunner constructed with no hydration map
- **AND** an `ISimulationConfig` with `seed: 42`, `mapRadius: 9`, `turnLimit: 0`, `unitCount: { player: 2, opponent: 2 }`
- **WHEN** `runner.run(config)` returns
- **THEN** `result.events[0].type` SHALL equal `GameEventType.GameCreated`
- **AND** `result.events[0].sequence` SHALL equal `0`
- **AND** `result.events[0].payload.units` SHALL contain exactly 4 entries
- **AND** every subsequent event SHALL have `sequence > 0`

#### Scenario: GameCreated payload reflects roster from initial state

- **GIVEN** a SimulationRunner with `unitCount: { player: 1, opponent: 3 }` and no hydration
- **WHEN** `runner.run(config)` returns
- **THEN** the `GameCreated` payload's `units` array SHALL contain entries with ids `player-1`, `opponent-1`, `opponent-2`, `opponent-3`
- **AND** the entry with `id: 'player-1'` SHALL have `side: GameSide.Player`
- **AND** the entries with ids `opponent-N` SHALL have `side: GameSide.Opponent`
- **AND** the payload's `config.mapRadius` SHALL equal the input `config.mapRadius`

#### Scenario: GameCreated payload reads hydrated unit names when hydration is present

- **GIVEN** a SimulationRunner constructed with a `UnitHydrationMap` containing one entry for `player-1` whose `fullUnit.chassis === 'Atlas'` and `fullUnit.model === 'AS7-D'`
- **AND** an `ISimulationConfig` with `unitCount: { player: 1, opponent: 1 }`
- **WHEN** `runner.run(config)` returns
- **THEN** the `GameCreated` payload's entry for `player-1` SHALL have `name === 'Atlas AS7-D'` (or some canonical concatenation)
- **AND** the entry's `gunnery` and `piloting` SHALL match the hydration data's values when present
