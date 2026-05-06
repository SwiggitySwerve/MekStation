# quick-session Spec Delta — Add Encounter Swarm Harness

## ADDED Requirements

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
