# Tasks: Simulation System Implementation

This document provides a quick reference to the task breakdown. For full details, see `.sisyphus/plans/simulation-system.md`.

## Wave 1 - Foundation (Parallel)

### Task 1: Core Infrastructure

**Files**: `src/simulation/core/`

- SeededRandom class (Mulberry32)
- WeightedTable class
- ISimulationConfig, ISimulationResult types
- SimulationContext class

**Tests**: `seededRandom.test.ts`, `weightedTable.test.ts`
**Agent**: `unspecified-low` + `git-master`
**Blocks**: Tasks 2, 4, 5, 8

---

### Task 3: Invariant Checker Framework

**Files**: `src/simulation/invariants/`

- IInvariant, IViolation interfaces
- 7 invariant checkers (position, heat, armor, destroyed, phase, sequence, turn)
- InvariantRunner class

**Tests**: `invariants.test.ts`, `invariantRunner.test.ts`
**Agent**: `unspecified-low` + `git-master`
**Blocks**: Tasks 4, 5

---

### Task 9: Known Limitations Documentation

**Files**: `src/simulation/known-limitations.md`, `src/simulation/core/knownLimitations.ts`

- Document exclusions (physical attacks, ammo, heat shutdown)
- Programmatic `isKnownLimitation()` function

**Tests**: `knownLimitations.test.ts`
**Agent**: `writing` + `git-master`
**Blocks**: Task 3 (conceptually)

---

## Wave 2 - Game Logic (Parallel after Wave 1)

### Task 2: Valid Move AI Engine

**Files**: `src/simulation/ai/`

- IBotBehavior interface
- MoveAI class (enumerate + select moves)
- AttackAI class (enumerate + select targets/weapons)
- BotPlayer class (orchestrate phases)

**Tests**: `moveAI.test.ts`, `attackAI.test.ts`, `botPlayer.test.ts`
**Agent**: `unspecified-high` + `git-master`
**Blocks**: Task 4
**Depends**: Task 1

---

### Task 5: Metrics Collector

**Files**: `src/simulation/metrics/`

- ISimulationMetrics, IAggregateMetrics interfaces
- MetricsCollector class

**Tests**: `metricsCollector.test.ts`
**Agent**: `unspecified-low` + `git-master`
**Blocks**: Task 7, 10
**Depends**: Tasks 1, 3

---

### Task 7: JSON Report Generator

**Files**: `src/simulation/reporting/`

- ISimulationReport interface
- ReportGenerator class

**Tests**: `reportGenerator.test.ts`
**Agent**: `unspecified-low` + `git-master`
**Blocks**: Task 10
**Depends**: Task 5

---

## Wave 3 - Integration (Parallel after Wave 2)

### Task 4: Simulation Runner (Jest)

**Files**: `src/simulation/runner/`, `src/simulation/__tests__/simulation.test.ts`

- SimulationRunner class (single game)
- BatchRunner class (multiple games)
- TurnLoop class (phase execution)
- Jest test suite with `test.each` pattern

**Tests**: `simulationRunner.test.ts`, `simulation.test.ts`
**Agent**: `unspecified-high` + `git-master`
**Blocks**: Tasks 6, 10
**Depends**: Tasks 1, 2, 3

---

### Task 6: Snapshot/Replay Integration

**Files**: `src/simulation/snapshot/`, `.gitignore`

- SnapshotManager class
- `src/simulation/__snapshots__/failed/` directory
- loadSnapshot() utility

**Tests**: `snapshotManager.test.ts`, `snapshotReplay.test.ts`
**Agent**: `unspecified-low` + `git-master`
**Blocks**: Task 10
**Depends**: Task 4

---

### Task 8: Random Scenario Generator

**Files**: `src/simulation/generator/`

- ScenarioGenerator class
- Preset configurations (LIGHT_SKIRMISH, STANDARD_LANCE, STRESS_TEST)
- Force composition logic

**Tests**: `scenarioGenerator.test.ts`, `scenarioPresets.test.ts`
**Agent**: `unspecified-high` + `git-master`
**Blocks**: Task 10
**Depends**: Task 1

---

## Final

### Task 10: Integration Testing & Tuning

**Files**: `src/simulation/__tests__/integration.test.ts`, `scripts/run-simulation.js`, `package.json`

- Full pipeline integration test
- Statistical validation (1000+ games)
- Performance profiling and tuning
- CLI tool for manual batch runs
- Package.json script: `bun simulate`

**Tests**: `integration.test.ts`
**Agent**: `deep` + `git-master`
**Depends**: All previous tasks

---

## Dependency Graph

```
Wave 1:
  1 (Core) ──┬──> Wave 2
  3 (Invariants) ─┤
  9 (Docs) ───────┘

Wave 2:
  2 (AI) ────┬──> Wave 3
  5 (Metrics) ┤
  7 (Reports) ┘

Wave 3:
  4 (Runner) ──┬──> Final
  6 (Snapshot) ┤
  8 (Generator) ┘

Final:
  10 (Integration)
```

## Commit Strategy

| Task | Commit Message                                      | Verification                                                  |
| ---- | --------------------------------------------------- | ------------------------------------------------------------- |
| 1    | `feat(simulation): add core infrastructure`         | `bun test src/simulation/__tests__/seededRandom.test.ts`      |
| 3    | `feat(simulation): add invariant checker framework` | `bun test src/simulation/__tests__/invariants.test.ts`        |
| 9    | `docs(simulation): document known limitations`      | `test -f src/simulation/known-limitations.md`                 |
| 2    | `feat(simulation): add valid move AI engine`        | `bun test src/simulation/__tests__/moveAI.test.ts`            |
| 5    | `feat(simulation): add metrics collector`           | `bun test src/simulation/__tests__/metricsCollector.test.ts`  |
| 7    | `feat(simulation): add JSON report generator`       | `bun test src/simulation/__tests__/reportGenerator.test.ts`   |
| 4    | `feat(simulation): add simulation runner`           | `bun test src/simulation/__tests__/simulation.test.ts`        |
| 6    | `feat(simulation): add snapshot manager`            | `bun test src/simulation/__tests__/snapshotManager.test.ts`   |
| 8    | `feat(simulation): add scenario generator`          | `bun test src/simulation/__tests__/scenarioGenerator.test.ts` |
| 10   | `feat(simulation): add integration tests and CLI`   | `bun test src/simulation/`                                    |

## Quick Start

```bash
# Execute the plan
/start-work

# Or manually start with Wave 1
cd src/simulation
mkdir -p core invariants __tests__

# Run tests as you build
bun test src/simulation/ --watch
```

## Success Metrics

- [ ] All tests pass: `bun test src/simulation/`
- [ ] Coverage ≥80%: `bun test src/simulation/ --coverage`
- [ ] 1000 simulations in <10min: `SIMULATION_COUNT=1000 bun test src/simulation/__tests__/simulation.test.ts`
- [ ] CLI works: `node scripts/run-simulation.js --count=10`
- [ ] Replay integration: Load snapshot in browser at `/gameplay/games/[id]/replay`
