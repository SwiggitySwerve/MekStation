# Combat Analytics (delta — retrofit)

## ADDED Requirements

### Requirement: Aggregate Metrics Reconcile Against Current MAX_TURNS

`MetricsCollector.getAggregate()` and `swarmAggregation`'s `averageTurns` / `incompleteGameRate` fields SHALL compute against the current `MAX_TURNS = 100` engine ceiling. Any field whose semantics depend on the ceiling MUST be re-derived if `MAX_TURNS` changes; consumers MUST NOT cache the prior `MAX_TURNS = 10` ceiling-dependent values across releases.

#### Scenario: averageTurns reflects up to 100 turns

- **GIVEN** a 100-run swarm where every game runs to natural completion under 100 turns
- **WHEN** the aggregator computes `averageTurns`
- **THEN** the returned value MUST reflect the actual turn counts (typically 15-50 for real catalog 2v2)
- **AND** the value MUST NOT be silently capped at 10 (the prior ceiling)

#### Scenario: incompleteGameRate accounts for the new ceiling

- **GIVEN** a 100-run swarm with the engine at `MAX_TURNS = 100`
- **WHEN** the aggregator runs
- **THEN** `incompleteGameRate` MUST be 0 if all games concluded under 100 turns
- **AND** the rate MUST NOT report against any prior ceiling (e.g., 10)

### Requirement: Schema Versioning Tracks Aggregation Surface Changes

When the aggregation surface adds or removes fields driven by combat-fidelity work, the `ISimulationRunResult.schemaVersion` MUST bump. Consumers reading older schema versions MUST receive backward-compatible payloads; consumers reading the new schema MAY rely on the added fields.

#### Scenario: schemaVersion 1 consumer receives prior shape

- **GIVEN** a `MetricsCollector` populated from `schemaVersion: 1` simulation results
- **WHEN** the consumer calls `getAggregate()`
- **THEN** the returned `IAggregateMetrics` MUST contain the prior-shape fields only
- **AND** new combat-fidelity fields (e.g., `criticalHitsLanded`, `componentDestroyedCount`) MUST be absent or `undefined`

#### Scenario: schemaVersion 2 consumer receives extended shape

- **GIVEN** a `MetricsCollector` populated from `schemaVersion: 2` simulation results that include `participants[]` and event-derived combat metrics
- **WHEN** the consumer calls `getAggregate()`
- **THEN** the returned aggregate MUST include the schema-version-2 fields with non-undefined values
