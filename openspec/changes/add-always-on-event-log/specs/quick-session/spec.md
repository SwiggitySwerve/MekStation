# quick-session — Delta for add-always-on-event-log

## ADDED Requirements

### Requirement: CLI Swarm Runner Catalog Hydration

The CLI swarm runner at `scripts/run-simulation.ts` SHALL build a `UnitHydrationMap` per simulation run and pass it as the 6th positional constructor argument to `SimulationRunner`. The map's keys SHALL be the runner-internal unit IDs (`player-1`...`player-N` for side A, `opponent-1`...`opponent-N` for side B) and the values SHALL be the result of `hydrateUnitFromFullUnit(fullUnit, runnerInternalId, weaponLookup)` from `src/simulation/runner/UnitHydration.ts`.

The synthetic single-medium-laser fallback at `createMinimalUnitState` MUST NOT be the default for swarm CLI runs. It MAY remain available for direct `SimulationRunner` callers — preset mode (`--preset=lance`) and unit-test fixtures — that intentionally omit the hydration argument.

The `WeaponLookup` SHALL be built once per CLI invocation via `buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES)` and reused across every run in the invocation. It SHALL NOT be rebuilt inside the per-run loop.

#### Scenario: Atlas swarm run produces real-loadout attack events

- **GIVEN** a swarm run where side A is hydrated with `atlas-as7-d` (4× medium laser, 1× AC/20, 1× LRM-20, 1× SRM-6 — 7 mounts total)
- **WHEN** the runner emits the first `attack_declared` event for the Atlas actor
- **THEN** `event.payload.weapons.length` SHALL equal `7`
- **AND** the array SHALL NOT contain only the synthetic ID `player-1-weapon-1`
- **AND** every weapon ID SHALL match an entry in the catalog `WeaponLookup`

#### Scenario: Synthetic-laser fallback is reachable from non-swarm callers

- **GIVEN** a unit-test fixture that constructs `new SimulationRunner(seed)` with no hydration argument
- **WHEN** the runner builds initial state via `createInitialState(config)`
- **THEN** the synthetic single-medium-laser fallback at `createMinimalUnitState` SHALL apply
- **AND** the test SHALL NOT crash with a missing-hydration error
- **AND** the fallback SHALL NOT leak into any path that begins at `scripts/run-simulation.ts`

#### Scenario: WeaponLookup is built once per CLI invocation

- **GIVEN** a CLI run with `--runs 100`
- **WHEN** the swarm executes
- **THEN** `buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES)` SHALL be invoked exactly once before the per-run loop
- **AND** the same `WeaponLookup` reference SHALL be reused for every per-participant `hydrateUnitFromFullUnit` call across the 100 runs

### Requirement: Per-Game Event Log Persistence

Every encounter executed by the CLI swarm runner SHALL persist its full chronological event log to disk in NDJSON format (one `IGameEvent` per line, encoded as JSON, `\n` separator, no trailing newline) at the path `<outputDir>/games/<run-timestamp>/<gameId>.jsonl`. There SHALL NOT be an opt-out flag.

All games executed within a single CLI invocation SHALL share one `<run-timestamp>` directory. The timestamp SHALL be computed once at the start of the invocation and reused.

The swarm output JSON SHALL include an `eventLogDir` field whose value is the absolute path of the per-invocation `<outputDir>/games/<run-timestamp>/` directory.

The events SHALL be written in the order returned by `result.events` (which the runner populates in monotonically-increasing `IGameEvent.sequence` order). The persistence module MUST NOT re-sort, filter, or transform the event payloads.

#### Scenario: Five-run swarm produces five NDJSON files in one timestamped directory

- **GIVEN** the invocation `tsx scripts/run-simulation.ts --config scripts/swarm-configs/duel-3kbv-temperate.json --runs 5 --seed 42`
- **WHEN** the swarm completes
- **THEN** the directory `simulation-reports/games/<run-timestamp>/` SHALL exist and SHALL contain exactly 5 files matching `*.jsonl`
- **AND** each file's basename SHALL equal the corresponding `gameId` from `result.gameId`
- **AND** the swarm output JSON's `eventLogDir` field SHALL point at this directory
- **AND** for each file, the line count SHALL equal the corresponding `result.events.length`

#### Scenario: Persisted events round-trip via JSON.parse

- **GIVEN** a `<gameId>.jsonl` file written by `writeEventLog`
- **WHEN** the file is read and split on `\n`
- **THEN** every line SHALL be a non-empty string parseable by `JSON.parse` into a valid `IGameEvent`
- **AND** the `sequence` field SHALL strictly increase across consecutive lines within the same `gameId`
- **AND** every event's `gameId` SHALL equal the file's basename without the `.jsonl` extension
