# Combat Analytics (delta)

## ADDED Requirements

### Requirement: MetricsCollector Hydrates From Event Log

`MetricsCollector.recordGame()` at `src/simulation/metrics/MetricsCollector.ts` SHALL parse the typed event log of each `ISimulationRunResult` and populate the previously-stub fields `playerUnitsStart`, `playerUnitsEnd`, `opponentUnitsStart`, `opponentUnitsEnd`, and `totalDamageDealt`. New fields `criticalHitsLanded`, `componentDestroyedCount`, `ammoExplosions`, `shutdowns`, `falls`, and `pilotHits` MUST also populate from event types `CriticalHit`, `ComponentDestroyed`, `AmmoExplosion`, `HeatEffectApplied { effect: 'shutdown' }`, `UnitFell`, and `PilotHit` respectively.

#### Scenario: Atlas-vs-Atlas mirror records non-zero damage

- **GIVEN** a seeded Atlas-vs-Atlas mirror match running for 10 turns
- **WHEN** `MetricsCollector.recordGame()` consumes the result
- **THEN** `metrics.totalDamageDealt` MUST equal the sum of all `DamageApplied.damage` values in the event log
- **AND** `metrics.playerUnitsStart` MUST equal 1
- **AND** `metrics.criticalHitsLanded` MUST equal the count of `CriticalHit` events in the log

#### Scenario: Game with shutdowns records the count

- **GIVEN** a scenario where one unit shuts down twice via heat
- **WHEN** `recordGame()` runs
- **THEN** `metrics.shutdowns` MUST equal 2

### Requirement: Per-Chassis Aggregation Surfaces Combat Fidelity Metrics

`swarmAggregation` at `src/simulation/metrics/swarmAggregation.ts` SHALL extend the per-chassis `chassisMatrix` rollup with combat-fidelity metrics: `criticalsLandedAvg`, `componentsDestroyedAvg`, `ammoExplosionsAvg`, `shutdownsAvg`, and `fallsAvg` per chassis matchup. These rollups MUST be schema-version-gated under `schemaVersion: 2` for backward compatibility with consumers expecting the prior aggregation shape.

#### Scenario: Atlas chassis-matrix entry includes per-unit crit average

- **GIVEN** a 100-run swarm of Atlas-vs-Locust matches with `schemaVersion: 2`
- **WHEN** `aggregateSwarmRuns()` produces the rollup
- **THEN** `chassisMatrix['atlas-as7-d']['locust-lct-1v'].criticalsLandedAvg` MUST equal the mean `criticalHitsLanded` across the 100 runs
- **AND** schemaVersion 1 consumers MUST receive the prior rollup shape unchanged

### Requirement: Event Log Replay Determinism Audit

The combat-fidelity test suite SHALL include a determinism audit that runs the same seeded scenario twice and asserts the resulting event logs are byte-identical. This closes the regression channel that PR #514's `MAX_TURNS=10 → 100` bump exposed (a ~1-event-over-300 divergence on `STANDARD_LANCE` seeded runs).

#### Scenario: Atlas-vs-Atlas mirror with same seed produces identical event logs

- **GIVEN** two fresh `SimulationRunner` instances each seeded with `42`
- **WHEN** each runs the same 10-turn Atlas-vs-Atlas scenario with the same `SeededD6Roller`
- **THEN** `result1.events.length` MUST equal `result2.events.length`
- **AND** `JSON.stringify(result1.events)` MUST equal `JSON.stringify(result2.events)`

#### Scenario: Cross-engine determinism on 200-turn battle

- **GIVEN** the same seeded Atlas-vs-Atlas scenario run for 200 turns (well beyond the masked `MAX_TURNS=10` ceiling)
- **WHEN** the determinism audit compares two reseeded runs
- **THEN** they MUST agree byte-for-byte on the full event log
