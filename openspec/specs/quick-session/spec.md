# quick-session Specification

## Purpose

TBD - created by archiving change add-quick-session-mode. Update Purpose after archive.
## Requirements
### Requirement: Quick Game Entry

The system SHALL provide a quick game mode separate from campaign gameplay.

#### Scenario: Access quick game

- **GIVEN** the user wants to play a quick skirmish
- **WHEN** they navigate to Quick Game
- **THEN** a setup wizard guides them through configuration
- **AND** no campaign context is required

#### Scenario: Quick game setup steps

- **GIVEN** the quick game setup wizard
- **WHEN** progressing through setup
- **THEN** steps include: select units, configure difficulty, generate scenario, confirm
- **AND** each step can be revisited before confirmation

### Requirement: Temporary Unit Instances

The system SHALL create temporary unit instances for quick games that are not persisted.

#### Scenario: Create temporary instance

- **GIVEN** a user selects a vault unit for quick game
- **WHEN** the game starts
- **THEN** a temporary instance is created from the vault design
- **AND** the instance is NOT linked to any campaign
- **AND** the instance is marked as temporary

#### Scenario: Temporary instance scope

- **GIVEN** a temporary unit instance
- **WHEN** the game session ends
- **THEN** the instance is discarded
- **AND** no record is persisted to the database
- **AND** the vault unit remains unchanged

#### Scenario: Damage tracking in session

- **GIVEN** a temporary instance takes damage during the game
- **WHEN** viewing the unit status
- **THEN** current damage is displayed
- **AND** the damage resets if "Play Again" is selected

### Requirement: Session Event Store

The system SHALL track events within a quick game session for replay purposes.

#### Scenario: Events stored in memory

- **GIVEN** a quick game is in progress
- **WHEN** game events occur (movement, attacks, damage)
- **THEN** events are stored in session memory
- **AND** events follow the same structure as campaign events
- **AND** events are NOT persisted to the database

#### Scenario: Session replay

- **GIVEN** a quick game has completed
- **WHEN** the user views the game replay
- **THEN** events can be replayed with the same UI as campaign games
- **AND** the replay is available until the session ends

#### Scenario: Session storage survival

- **GIVEN** an in-progress quick game
- **WHEN** the page is refreshed
- **THEN** the game state is restored from session storage
- **AND** the game can continue from where it left off

#### Scenario: Session end cleanup

- **GIVEN** a quick game session
- **WHEN** the browser tab is closed
- **THEN** all temporary instances are discarded
- **AND** all session events are discarded
- **AND** no persistent state remains

### Requirement: Quick Game Results

The system SHALL display results at the end of a quick game.

#### Scenario: Victory screen

- **GIVEN** a quick game completes
- **WHEN** viewing results
- **THEN** the winner is displayed
- **AND** a summary shows: units destroyed, damage dealt, turns taken
- **AND** options to "Play Again" or "New Game" are available

#### Scenario: Play again with same setup

- **GIVEN** a completed quick game
- **WHEN** the user selects "Play Again"
- **THEN** the same units are used (with fresh damage)
- **AND** the same scenario is used
- **AND** a new game begins immediately

#### Scenario: New game option

- **GIVEN** a completed quick game
- **WHEN** the user selects "New Game"
- **THEN** they return to the setup wizard
- **AND** previous selections are preserved as defaults

### Requirement: Shared Infrastructure

Quick games SHALL share infrastructure with campaign games where appropriate.

#### Scenario: Use scenario generation

- **GIVEN** a quick game setup
- **WHEN** generating a scenario
- **THEN** the same scenario generator used by campaigns is available
- **AND** all scenario templates and modifiers are available

#### Scenario: Use game resolution logic

- **GIVEN** a quick game in progress
- **WHEN** resolving combat and damage
- **THEN** the same game rules and resolution logic are used
- **AND** results are consistent with campaign gameplay

#### Scenario: Use replay viewer

- **GIVEN** a quick game with events
- **WHEN** viewing replay
- **THEN** the same replay viewer used by campaigns is used
- **AND** all replay features (play, pause, step, scrub) are available

### Requirement: CLI Swarm Runner

The quick-session system SHALL provide a CLI swarm runner extension to `scripts/run-simulation.ts` that wires the swarm-harness components (real-pilot-skill simulation, Node-side catalog loader, pluggable AI player, random force/pilot generation, schema-versioned result, per-chassis aggregation) into the existing `BatchRunner` sequential loop.

The CLI SHALL accept a primary input via `--config <path>` to a JSON config file. Individual flags SHALL function as overrides when both are present. The supported flag set SHALL include at minimum:

- `--config <path>` — path to JSON config (primary input)
- `--runs <N>` — override `config.runs`
- `--seed <N>` — override `config.seed`
- `--bv-budget <N>` — override BV budget for both sides
- `--era <name>` — override era filter for both sides
- `--tech-base <IS|Clan|Mixed>` — override tech-base filter
- `--ai-side-a <variant>` — override side A's AI variant name
- `--ai-side-b <variant>` — override side B's AI variant name
- `--pilots <vault|template>` — override pilot generation strategy
- `--pilot-skill-band <green|regular|veteran|elite>` — override template-synthesis skill band
- `--map-radius <N>` — override hex map radius
- `--terrain-biome <name>` — placeholder for Phase-7 biome wiring; current accepted values are `none` (default — current weighted-terrain) and any future biome name; an unknown biome SHALL produce a warning but proceed with default
- `--output <path>` — override output JSON path (default `./swarm-output.json`)

Sequential `BatchRunner.runBatch` SHALL be the only execution path in this change. Worker-thread parallelism SHALL NOT be introduced. A regression guard (lint rule or test assertion) SHALL prevent accidental introduction of `worker_threads` imports in `BatchRunner.ts` until Phase 7 explicitly opts in.

#### Scenario: Config file drives a swarm run

- **GIVEN** `scripts/swarm-configs/duel-3kbv-temperate.json` with `runs: 100`, `seed: 42`, side A and side B each `bvBudget: 3000`, `unitCount: 1`, `aiVariant: 'aggressive'` (A) and `'defensive'` (B), `pilotStrategy: 'template'`, era `3050`, IS tech base, `mapRadius: 12`
- **WHEN** `tsx scripts/run-simulation.ts --config scripts/swarm-configs/duel-3kbv-temperate.json` is invoked
- **THEN** the runner SHALL execute 100 sequential simulations using seeds 42, 43, 44, ..., 141
- **AND** each run SHALL pair a randomly-generated 3000 BV side A force (era 3050 IS) with a 3000 BV side B force
- **AND** each side SHALL be driven by its specified AI variant
- **AND** the output JSON SHALL be written to `./swarm-output.json` (default)

#### Scenario: Flag override beats config

- **GIVEN** the same config file with `runs: 100`
- **AND** the invocation `tsx scripts/run-simulation.ts --config <path> --runs 5`
- **WHEN** the runner executes
- **THEN** exactly 5 simulations SHALL be performed, not 100

#### Scenario: Determinism — same config + seed produces identical output

- **GIVEN** `tsx scripts/run-simulation.ts --config <path> --seed 42 --runs 10` invoked twice in succession
- **WHEN** both invocations complete
- **THEN** the two output JSON files SHALL be byte-identical
- **AND** every per-run `participants` payload SHALL match across the two runs

#### Scenario: Throughput target met for 1,000 runs

- **GIVEN** `tsx scripts/run-simulation.ts --config <small-config> --runs 1000` on a developer machine (M1 / Ryzen-class CPU)
- **WHEN** the run completes
- **THEN** total wall-clock time SHALL be less than 60 seconds
- **AND** the runner SHALL NOT have spawned any `Worker` threads or child processes

#### Scenario: Output JSON validates against schema

- **GIVEN** the output of any swarm run
- **WHEN** the JSON is parsed and validated against the documented `ISimulationRunResult[]` schema
- **THEN** every entry SHALL have `schemaVersion: 2`
- **AND** every entry SHALL carry a `participants` array
- **AND** every entry's existing fields (`outcome`, `turnCount`, etc.) SHALL be preserved

#### Scenario: Worker-threads regression guard

- **GIVEN** the lint config or a dedicated test assertion targeting `src/simulation/runner/BatchRunner.ts`
- **WHEN** a hypothetical patch adds `import { Worker } from 'worker_threads'` to that file
- **THEN** the lint or test SHALL fail with an explicit message naming Phase 7 as the unblock
- **AND** the patch SHALL NOT merge until the Phase-7 worker-thread requirement explicitly opts in

### Requirement: Reproducible Swarm Configurations

`scripts/swarm-configs/` SHALL be a tracked directory containing version-controlled JSON config files that define standard swarm runs (e.g., `duel-3kbv-temperate.json`, `lance-vs-lance-5kbv.json`).

Each config SHALL be self-describing: a single file SHALL fully specify the run without requiring CLI flag overrides for any non-output knob.

#### Scenario: Example config covers full feature surface

- **GIVEN** the committed `scripts/swarm-configs/duel-3kbv-temperate.json`
- **WHEN** the file is opened
- **THEN** it SHALL include keys for `runs`, `seed`, `mapRadius`, `sideA`, `sideB`
- **AND** `sideA` and `sideB` each SHALL include `bvBudget`, `unitCount`, `aiVariant`, `pilotStrategy`
- **AND** the file SHALL be runnable via `tsx scripts/run-simulation.ts --config scripts/swarm-configs/duel-3kbv-temperate.json` with no other flags

#### Scenario: Config schema validation rejects malformed input

- **GIVEN** a swarm config missing the required `seed` field
- **WHEN** the CLI parses the config
- **THEN** the CLI SHALL exit with a non-zero status code
- **AND** the error message SHALL identify the missing field
- **AND** no simulation SHALL run

