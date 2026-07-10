# simulation-system Delta — recover-sim-throughput-regression

## ADDED Requirements

### Requirement: Simulation Throughput Stays Within Budget

The swarm-throughput regression-guard workload (`src/simulation/__tests__/swarm-throughput.test.ts`) SHALL complete within its configured wall-clock budget at both the CI perf-smoke scale and the nightly full-scale, so that a refactor of the movement / pathfinding inner loop that inflates per-run allocation or property-access cost fails as a regression rather than silently degrading simulation throughput.

At the CI perf-smoke scale, the workload SHALL complete `SWARM_THROUGHPUT_RUN_COUNT` sequential runs within `SWARM_THROUGHPUT_TIME_BUDGET_MS` using the values the `perf-smoke-tests` job sets in `.github/workflows/pr-checks.yml`. At the nightly full-scale, the workload SHALL complete the spec'd 1,000-run proof within the `SWARM_THROUGHPUT_TIME_BUDGET_MS` the `full-statistical-proofs` job sets in `.github/workflows/nightly-validation.yml`.

These budgets are the existing regression ceilings and SHALL NOT be widened by a change whose purpose is to recover throughput: a throughput regression SHALL be fixed at its source (allocation, memoization, or static binding), not absorbed by a larger budget.

The runner-level 1,000-run / 60-second throughput target and the worker-thread-freeness guarantee remain owned by the `quick-session` capability's "CLI Swarm Runner" requirement ("Throughput target met for 1,000 runs"). This requirement governs the regression-guard workload and its CI / nightly budget enforcement only, and does not restate the runner target.

**Priority**: High

#### Scenario: Perf-smoke swarm-throughput workload stays within the CI budget

- **GIVEN** the `perf-smoke-tests` job runs `swarm-throughput.test.ts` with `SWARM_THROUGHPUT_RUN_COUNT` and `SWARM_THROUGHPUT_TIME_BUDGET_MS` set to the PR perf-smoke values (25 runs / 15000 ms)
- **WHEN** the workload executes the configured number of sequential simulation runs
- **THEN** the total wall-clock time SHALL be less than `SWARM_THROUGHPUT_TIME_BUDGET_MS`
- **AND** the assertion SHALL fail loudly if a movement / pathfinding regression pushes the per-run cost above the budget

#### Scenario: Nightly full-scale 1,000-run budget is restored and preserved

- **GIVEN** the `full-statistical-proofs` nightly job runs `swarm-throughput.test.ts` with `SWARM_THROUGHPUT_RUN_COUNT=1000`
- **WHEN** the 1,000 sequential runs complete
- **THEN** the total wall-clock time SHALL be less than the nightly `SWARM_THROUGHPUT_TIME_BUDGET_MS` (180000 ms)
- **AND** this budget SHALL remain unchanged by this recovery change (no budget widening)

#### Scenario: Movement / pathfinding refactor must not regress per-run throughput

- **GIVEN** a change that decomposes, extracts, or re-exports symbols consumed by the A* movement inner loop — the step-cost helpers (`getMovementStepCostBreakdown` and its extracted `summarizeMovementTerrain` / `movementElevationStepCost` helpers), the terrain decoder (`terrainFeaturesFromString`), or the `TerrainType` re-export path
- **WHEN** the swarm-throughput workload's per-run cost is measured before and after the change on the same machine
- **THEN** the after per-run cost SHALL NOT exceed the pre-change per-run band
- **AND** any regression SHALL be recovered at its source rather than by widening the budget

#### Scenario: Hot-loop helpers avoid per-hex-step heap allocation

- **GIVEN** the A* neighbor-expansion loop in `findPath` (`src/utils/gameplay/movement/pathfinding.ts`), which evaluates the per-hex step cost for every candidate destination
- **WHEN** the step-cost helpers are invoked per hex per step
- **THEN** the helpers SHALL NOT allocate a fresh per-call options object or per-call result object for each invocation on the hot path
- **AND** `findPath` itself SHALL remain functionally unchanged — its throughput recovers from the reduced allocation / GC pressure of its callees, not from edits to the pathfinder
