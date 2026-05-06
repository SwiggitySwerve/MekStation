# Simulation System (delta — retrofit)

## ADDED Requirements

### Requirement: MAX_TURNS Engine Ceiling Set to 100

The simulation engine SHALL enforce a hard turn-count ceiling of 100 turns per simulation run, defined by `MAX_TURNS` in `src/simulation/runner/SimulationRunnerConstants.ts`. The ceiling is applied via `Math.min(config.turnLimit, MAX_TURNS)` in `SimulationRunner.run()`. Lower per-config turn limits MAY override the ceiling downward but MUST NOT raise it above 100.

#### Scenario: Config requesting 200-turn limit clamps to 100

- **GIVEN** an `ISimulationConfig` with `turnLimit: 200`
- **WHEN** `SimulationRunner.run()` executes
- **THEN** the actual run MUST terminate at or before turn 100 regardless of game state

#### Scenario: Zero turn limit defaults to MAX_TURNS

- **GIVEN** an `ISimulationConfig` with `turnLimit: 0` (no explicit limit)
- **WHEN** the runner executes
- **THEN** the run MUST terminate at or before turn 100

#### Scenario: Real catalog 2v2 fights run to natural conclusion

- **GIVEN** a swarm 2v2 encounter with default AI variants and a 50-turn config limit
- **WHEN** the runner executes
- **THEN** the run MUST be ABLE to complete within the 100-turn engine ceiling
- **AND** the run MUST NOT be silently clamped to 10 turns (the prior ceiling that produced 100% Incomplete outcomes for real catalog encounters)

### Requirement: Engine Determinism Contract With Acknowledged Residual Gap

The simulation engine SHALL produce byte-identical event logs for two runs of the same seed AND the same `ISimulationConfig` AND the same injected `D6Roller` for at least the first 10 turns of any combat. Beyond 10 turns the engine MAY exhibit a residual non-determinism of up to 1 event divergence per 300 events. A future change MUST close this residual gap.

The `it.skip`'d test at `src/simulation/__tests__/integration.test.ts:272` ("should produce identical results for same seed") is the canonical canary for the residual gap. It MUST remain skipped until the residual is closed AND MUST be re-enabled (with `.skip` removed) by the change that closes it.

#### Scenario: 10-turn seeded run produces identical logs

- **GIVEN** two `SimulationRunner` instances seeded with `42`
- **AND** identical `STANDARD_LANCE` configs with `turnLimit: 10`
- **AND** identical `SeededD6Roller` rollers
- **WHEN** each runs
- **THEN** `result1.events.length === result2.events.length`
- **AND** `JSON.stringify(result1.events) === JSON.stringify(result2.events)`

#### Scenario: 20-turn STANDARD_LANCE may diverge by ≤1 event per 300

- **GIVEN** two seeded runs of the same `STANDARD_LANCE` config with `turnLimit: 20`
- **WHEN** each completes
- **THEN** `Math.abs(result1.events.length - result2.events.length)` MUST be ≤ Math.ceil(events.length / 300)
- **AND** the test that asserts strict equality MUST remain `.skip`'d until a follow-on change closes the residual
