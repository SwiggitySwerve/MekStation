# End-to-End Game Simulation System

## TL;DR

> **Quick Summary**: Build a property-based fuzz testing system that autonomously plays BattleTech tactical games to detect bugs, validate game mechanics, and gather balance data. Uses random scenario generation with seeded RNG for reproducibility.
> 
> **Deliverables**:
> - Random scenario generator with weighted selection (adapted from MekHQ's WeightedTable pattern)
> - Valid move AI engine that exercises all game mechanics
> - Comprehensive invariant checkers for 5 bug categories
> - Jest-integrated simulation runner for 1000+ batch runs
> - Metrics collector (win rates, game length, coverage)
> - Failed scenario snapshots with replay UI integration
> - JSON report generator for detailed analysis
> 
> **Estimated Effort**: Large (multiple weeks)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (Foundation) → Task 2 (AI) → Task 4 (Runner) → Task 6 (Integration)

---

## Context

### Original Request
Build end-to-end simulation scenarios for the campaign-based Civilization-style hex map grid game that can play autonomously to detect bugs in play paths and improve automated decision-making for players.

### Interview Summary
**Key Discussions**:
- Primary goal is bug detection via property-based fuzz testing
- Secondary goal is balance testing (win rates, unit compositions)
- Turn-by-turn tactical simulation (not campaign auto-resolve)
- AI only needs to make valid moves, not smart moves
- Both visual debugging (replay UI) and headless batch modes needed
- Scale: 1000+ simulations for stress testing
- Integration with existing Jest infrastructure (45% coverage baseline)

**Research Findings**:
- **MekStation Architecture**: Event-sourced with `deriveState()`, replay hooks exist, seeded RNG support in combat functions
- **MekHQ Patterns**: WeightedTable for random selection, BehaviorSettings for bot config, @RepeatedTest(1000) for statistical validation
- **Existing Gaps**: No AI decision-making code, `processScenarioResult()` is stubbed, non-seeded Math.random() in some places

### Metis Review
**Identified Gaps** (addressed in plan):
- No move legality validation → Use existing `getValidDestinations()` as foundation
- Non-deterministic randomness → Inject seeded PRNG at simulation entry point
- Heat/ammo effects not enforced → Add to known-limitations.md, exclude from bug reports
- No invariant infrastructure → Build from scratch as core component
- Unclear "bug vs unimplemented feature" → Create known-limitations.md first

---

## Work Objectives

### Core Objective
Build an autonomous game simulation system that generates random scenarios, plays them to completion using valid-move AI, checks invariants after every action, and reports violations with reproducible seeds.

### Concrete Deliverables
- `src/simulation/` module with all simulation components
- `src/simulation/__tests__/` with Jest test suites
- `src/simulation/__snapshots__/failed/` for failed scenario dumps
- JSON reports in `simulation-reports/` directory
- `known-limitations.md` documenting exclusions from bug detection

### Definition of Done
- [x] `bun test src/simulation/` passes with ≥80% coverage (89.56% statements, 92.95% lines)
- [x] 1000 simulations complete in <10 minutes (headless mode) (9.6 seconds actual)
- [x] Failed scenarios reproducible via seed + replay UI (verified with seed 99999)
- [x] JSON reports contain all specified metrics (timestamp, config, summary, metrics, violations, performance)

### Must Have
- Seeded PRNG for 100% reproducible scenarios
- Invariant checkers for all 5 bug categories
- Integration with existing replay player
- Jest-compatible test runner
- JSON report output

### Must NOT Have (Guardrails)
- Smart/tactical AI (no minimax, threat assessment, or positioning heuristics)
- Modifications to existing game engine files in `src/utils/gameplay/`
- New UI dashboard (use existing replay UI only)
- Physical attack implementation (marked as "Future" in codebase)
- Ammo consumption tracking (not implemented in game engine)
- Heat shutdown mechanics (not implemented in game engine)
- Import from `src/components/` in simulation core (keep simulation headless)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Jest with 45% coverage threshold)
- **User wants tests**: TDD for core logic, integration tests for runner
- **Framework**: Jest (existing) + custom simulation runner

### TDD Workflow
Each component follows RED-GREEN-REFACTOR:
1. **RED**: Write failing test describing expected behavior
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up while tests stay green

### Automated Verification (NO USER INTERVENTION)
All acceptance criteria are executable by agents via:
- `bun test` for Jest tests
- `node scripts/run-simulation.js` for simulation runner
- File existence checks for reports/snapshots
- JSON schema validation for outputs

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately) - Foundation:
├── Task 1: Core Infrastructure (seeded RNG, WeightedTable, config types)
├── Task 3: Invariant Checker Framework (pure functions, no game deps)
└── Task 9: Known Limitations Documentation

Wave 2 (After Wave 1) - Game Logic:
├── Task 2: Valid Move AI Engine (depends: 1)
├── Task 5: Metrics Collector (depends: 1, 3)
└── Task 7: JSON Report Generator (depends: 5)

Wave 3 (After Wave 2) - Integration:
├── Task 4: Simulation Runner (depends: 1, 2, 3)
├── Task 6: Snapshot/Replay Integration (depends: 4)
└── Task 8: Random Scenario Generator (depends: 1)

Final:
└── Task 10: Integration Testing & Tuning (depends: all)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 4, 5, 8 | 3, 9 |
| 2 | 1 | 4 | 5, 7 |
| 3 | None | 4, 5 | 1, 9 |
| 4 | 1, 2, 3 | 6, 10 | 8 |
| 5 | 1, 3 | 7, 10 | 2, 8 |
| 6 | 4 | 10 | 7, 8 |
| 7 | 5 | 10 | 6, 8 |
| 8 | 1 | 10 | 4, 5, 6, 7 |
| 9 | None | 3 | 1 |
| 10 | All | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Category/Skills |
|------|-------|-----------------|
| 1 | 1, 3, 9 | `quick` + writing for docs, `unspecified-low` for types |
| 2 | 2, 5, 7 | `unspecified-high` for AI logic |
| 3 | 4, 6, 8 | `unspecified-high` for integration |
| Final | 10 | `deep` for comprehensive testing |

---

## TODOs

### Wave 1 - Foundation

- [x] 1. Core Simulation Infrastructure

  **What to do**:
  - Create `src/simulation/` directory structure
  - Implement `SeededRandom` class that wraps a seeded PRNG (mulberry32 or similar)
  - Implement `WeightedTable<T>` class (adapted from MekHQ pattern)
  - Create `ISimulationConfig` interface with: seed, turnLimit, unitCount, mapRadius
  - Create `ISimulationResult` interface for outcomes
  - Override `Math.random` injection point for simulation context
  - Create `SimulationContext` class that holds seeded random, config, and state

  **Must NOT do**:
  - Import from `src/components/`
  - Modify existing game engine files
  - Add browser-specific APIs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Foundational types and utility classes, straightforward implementation
  - **Skills**: [`git-master`]
    - `git-master`: For atomic commits of new files

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3, 9)
  - **Blocks**: Tasks 2, 4, 5, 8
  - **Blocked By**: None

  **References**:
  
  **Pattern References** (existing code to follow):
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\againstTheBot\WeightedTable.java` - MekHQ's weighted random selection algorithm to adapt
  - `src/lib/combat/acar.ts:distributeDamage()` - Example of injectable random function pattern
  
  **API/Type References** (contracts to implement against):
  - `src/types/gameplay/GameSessionInterfaces.ts:IGameSession` - Game session structure
  - `src/types/gameplay/GameSessionInterfaces.ts:IGameConfig` - Existing config pattern
  
  **External References**:
  - Mulberry32 PRNG: `https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32`

  **Acceptance Criteria**:
  
  ```bash
  # Test seeded random produces same sequence
  bun test src/simulation/__tests__/seededRandom.test.ts
  # Assert: SeededRandom(12345).next() always returns same value
  # Assert: Two instances with same seed produce identical sequences
  
  # Test WeightedTable selection
  bun test src/simulation/__tests__/weightedTable.test.ts
  # Assert: WeightedTable.select() respects weights (statistical validation over 1000 runs)
  # Assert: WeightedTable with seeded random is deterministic
  
  # Verify no browser imports
  grep -r "from.*components" src/simulation/
  # Assert: Exit code 1 (no matches found)
  ```

  **Commit**: YES
  - Message: `feat(simulation): add core infrastructure - SeededRandom, WeightedTable, config types`
  - Files: `src/simulation/core/`, `src/simulation/__tests__/`

---

- [x] 3. Game Invariant Checker Framework

  **What to do**:
  - Create `src/simulation/invariants/` directory
  - Define `IInvariant` interface: `{ name: string, check: (state: IGameState) => IViolation[] }`
  - Define `IViolation` interface: `{ invariant: string, severity: 'critical' | 'warning', message: string, context: object }`
  - Implement invariant checkers as pure functions (no side effects):
    - `checkUnitPositionUniqueness()` - no two units on same hex
    - `checkHeatNonNegative()` - heat ≥ 0
    - `checkArmorBounds()` - armor/structure within 0..max
    - `checkDestroyedUnitsStayDestroyed()` - destroyed units don't resurrect
    - `checkPhaseTransitions()` - phases follow correct order
    - `checkSequenceMonotonicity()` - event sequence numbers increase
    - `checkTurnNonDecreasing()` - turn numbers never decrease
  - Create `InvariantRunner` that runs all invariants and collects violations
  - Implement severity filtering (critical vs warning)

  **Must NOT do**:
  - Modify game engine code to add inline checks
  - Block game progression on violation (log and continue)
  - Import React or UI components

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Pure functions with clear contracts, straightforward logic
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 9)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: None (but Task 9 should complete first to know what to exclude)

  **References**:
  
  **Pattern References**:
  - `src/utils/gameplay/gameState.ts:deriveState()` - How game state is structured
  - `src/types/gameplay/GameSessionInterfaces.ts:IGameState` - State type definition
  
  **API/Type References**:
  - `src/types/gameplay/GameSessionInterfaces.ts:GamePhase` - Phase enum for transition validation
  - `src/types/gameplay/HexGridInterfaces.ts:IUnitPosition` - Position structure for uniqueness check
  
  **Test References**:
  - `src/__tests__/unit/stores/unitState.test.ts` - Test structure patterns

  **Acceptance Criteria**:
  
  ```bash
  # Test all invariant checkers
  bun test src/simulation/__tests__/invariants.test.ts
  # Assert: Each invariant detects its specific violation type
  # Assert: checkUnitPositionUniqueness detects duplicate positions
  # Assert: checkHeatNonNegative detects negative heat
  # Assert: checkArmorBounds detects out-of-range armor values
  # Assert: checkPhaseTransitions detects invalid phase sequences
  
  # Test InvariantRunner collects all violations
  bun test src/simulation/__tests__/invariantRunner.test.ts
  # Assert: Runner calls all registered invariants
  # Assert: Runner filters by severity correctly
  # Assert: Runner returns empty array for valid state
  ```

  **Commit**: YES
  - Message: `feat(simulation): add invariant checker framework with 7 core invariants`
  - Files: `src/simulation/invariants/`

---

- [x] 9. Known Limitations Documentation

  **What to do**:
  - Create `src/simulation/known-limitations.md` documenting what the simulation should NOT report as bugs:
    - Physical attacks (marked "Future" in codebase)
    - Ammo consumption (not tracked)
    - Heat shutdown mechanics (not implemented)
    - Terrain movement cost validation (partial implementation)
    - Specific game rule gaps discovered during exploration
  - Create `src/simulation/core/knownLimitations.ts` with programmatic exclusion list
  - Define `isKnownLimitation(violation: IViolation): boolean` function
  - Document each limitation with:
    - What the limitation is
    - Why it exists (unimplemented vs design decision)
    - When it might be removed (future work reference)

  **Must NOT do**:
  - Report known limitations as bugs
  - Promise to fix limitations as part of this work

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation-focused task
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 3 (conceptually - should know exclusions before building checkers)
  - **Blocked By**: None

  **References**:
  
  **Pattern References**:
  - `src/types/gameplay/GameSessionInterfaces.ts:GamePhase.PhysicalAttack` - Physical attacks marked for future
  - `src/utils/gameplay/movement.ts` - Movement validation (partial)
  
  **External References**:
  - MekHQ's approach to incomplete features

  **Acceptance Criteria**:
  
  ```bash
  # Documentation file exists
  test -f src/simulation/known-limitations.md
  # Assert: Exit code 0
  
  # Programmatic exclusions work
  bun test src/simulation/__tests__/knownLimitations.test.ts
  # Assert: isKnownLimitation returns true for documented limitations
  # Assert: isKnownLimitation returns false for actual bugs
  ```

  **Commit**: YES
  - Message: `docs(simulation): document known limitations and exclusions for bug detection`
  - Files: `src/simulation/known-limitations.md`, `src/simulation/core/knownLimitations.ts`

---

### Wave 2 - Game Logic

- [x] 2. Valid Move AI Engine

  **What to do**:
  - Create `src/simulation/ai/` directory
  - Implement `IBotBehavior` interface (adapted from MekHQ's BehaviorSettings):
    ```typescript
    interface IBotBehavior {
      retreatThreshold: number; // 0-1, health percentage to retreat
      retreatEdge: 'nearest' | 'north' | 'south' | 'east' | 'west' | 'none';
    }
    ```
  - Implement `MoveAI` class:
    - `getValidMoves(unit: IGameUnit, state: IGameState): IMove[]` - enumerate legal moves
    - `selectMove(moves: IMove[], random: SeededRandom): IMove` - randomly select from valid
    - Use existing `getValidDestinations()` from `movement.ts`
  - Implement `AttackAI` class:
    - `getValidTargets(unit: IGameUnit, state: IGameState): IGameUnit[]` - units in range/arc
    - `selectTarget(targets: IGameUnit[], random: SeededRandom): IGameUnit | null` - random selection
    - `selectWeapons(attacker: IGameUnit, target: IGameUnit): IWeapon[]` - all usable weapons
    - Use existing `calculateToHit()` from `toHit.ts` for viability
  - Implement `BotPlayer` class that orchestrates:
    - Movement phase: call MoveAI, create movement event
    - Attack phase: call AttackAI, create attack events
    - Handle "no valid moves" gracefully (pass turn)

  **Must NOT do**:
  - Add tactical intelligence (minimax, threat assessment, positioning)
  - Modify game engine files
  - Implement physical attacks

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core game logic requiring understanding of game mechanics
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:
  
  **Pattern References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\BotForce.java` - MekHQ bot configuration pattern
  - `src/utils/gameplay/movement.ts:getValidDestinations()` - Existing move enumeration
  - `src/utils/gameplay/toHit.ts:calculateToHit()` - Attack viability calculation
  
  **API/Type References**:
  - `src/types/gameplay/GameSessionInterfaces.ts:IGameUnit` - Unit interface
  - `src/types/gameplay/HexGridInterfaces.ts:IHexCoord` - Movement targets
  - `src/types/gameplay/GameSessionInterfaces.ts:IGameEvent` - Event creation

  **Acceptance Criteria**:
  
  ```bash
  # Test MoveAI
  bun test src/simulation/__tests__/moveAI.test.ts
  # Assert: getValidMoves returns only positions within MP
  # Assert: getValidMoves respects facing rules
  # Assert: selectMove with same seed returns same move
  
  # Test AttackAI
  bun test src/simulation/__tests__/attackAI.test.ts
  # Assert: getValidTargets filters by range and arc
  # Assert: selectTarget returns null when no valid targets
  # Assert: selectWeapons excludes weapons without ammo (when tracked)
  
  # Test BotPlayer orchestration
  bun test src/simulation/__tests__/botPlayer.test.ts
  # Assert: BotPlayer generates valid movement events
  # Assert: BotPlayer generates valid attack events
  # Assert: BotPlayer handles no-valid-moves gracefully
  ```

  **Commit**: YES
  - Message: `feat(simulation): add valid move AI engine with MoveAI, AttackAI, BotPlayer`
  - Files: `src/simulation/ai/`

---

- [x] 5. Metrics Collector

  **What to do**:
  - Create `src/simulation/metrics/` directory
  - Define `ISimulationMetrics` interface:
    ```typescript
    interface ISimulationMetrics {
      // Per-game metrics
      seed: number;
      winner: 'player' | 'opponent' | 'draw' | null;
      turns: number;
      durationMs: number;
      violations: IViolation[];
      
      // Unit metrics
      playerUnitsStart: number;
      playerUnitsEnd: number;
      opponentUnitsStart: number;
      opponentUnitsEnd: number;
      totalDamageDealt: { player: number; opponent: number };
    }
    ```
  - Define `IAggregateMetrics` for batch statistics:
    ```typescript
    interface IAggregateMetrics {
      totalGames: number;
      playerWins: number;
      opponentWins: number;
      draws: number;
      avgTurns: number;
      avgDurationMs: number;
      violationsByType: Record<string, number>;
      violationsBySeverity: { critical: number; warning: number };
    }
    ```
  - Implement `MetricsCollector` class:
    - `recordGame(result: ISimulationResult): void` - record single game
    - `getMetrics(): ISimulationMetrics[]` - all recorded games
    - `getAggregate(): IAggregateMetrics` - computed statistics
  - Track code coverage via Jest's coverage tracking (which game events were triggered)

  **Must NOT do**:
  - Add new metric types beyond what's specified
  - Store metrics in browser storage

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Data collection and aggregation, straightforward logic
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 7)
  - **Blocks**: Task 7, 10
  - **Blocked By**: Tasks 1, 3

  **References**:
  
  **Pattern References**:
  - `E:\Projects\mekhq\MekHQ\unittests\mekhq\campaign\autoResolve\ResolverTest.java` - Win/loss tracking pattern
  
  **API/Type References**:
  - `src/simulation/invariants/IViolation` - Violation type (from Task 3)
  - `src/simulation/core/ISimulationResult` - Result type (from Task 1)

  **Acceptance Criteria**:
  
  ```bash
  # Test MetricsCollector
  bun test src/simulation/__tests__/metricsCollector.test.ts
  # Assert: recordGame stores metrics correctly
  # Assert: getAggregate computes correct win rates
  # Assert: getAggregate computes correct averages
  # Assert: violations counted by type and severity
  ```

  **Commit**: YES
  - Message: `feat(simulation): add metrics collector with per-game and aggregate statistics`
  - Files: `src/simulation/metrics/`

---

- [x] 7. JSON Report Generator

  **What to do**:
  - Create `src/simulation/reporting/` directory
  - Define report schema:
    ```typescript
    interface ISimulationReport {
      timestamp: string;
      config: ISimulationConfig;
      summary: {
        total: number;
        passed: number;
        failed: number;
        passRate: number;
      };
      metrics: IAggregateMetrics;
      violations: Array<{
        seed: number;
        type: string;
        severity: string;
        message: string;
        gameState?: object; // Optional for debugging
      }>;
      performance: {
        totalDurationMs: number;
        avgTurnMs: number;
        peakMemoryMB?: number;
      };
      failedSeeds: number[]; // Seeds of games with violations for replay
    }
    ```
  - Implement `ReportGenerator` class:
    - `generate(metrics: MetricsCollector, config: ISimulationConfig): ISimulationReport`
    - `save(report: ISimulationReport, path: string): void`
  - Output to `simulation-reports/report-{timestamp}.json`
  - Pretty-print JSON for human readability

  **Must NOT do**:
  - Create HTML/visual reports (JSON only)
  - Store reports in database

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Data formatting and file I/O, straightforward
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 5) - but depends on Task 5
  - **Blocks**: Task 10
  - **Blocked By**: Task 5

  **References**:
  
  **Pattern References**:
  - `src/simulation/metrics/IAggregateMetrics` - Metrics structure (from Task 5)
  
  **API/Type References**:
  - `src/simulation/core/ISimulationConfig` - Config type (from Task 1)

  **Acceptance Criteria**:
  
  ```bash
  # Test ReportGenerator
  bun test src/simulation/__tests__/reportGenerator.test.ts
  # Assert: generate() produces valid JSON matching schema
  # Assert: save() writes file to correct path
  # Assert: timestamp format is ISO 8601
  
  # Verify report output
  node -e "const r = require('./simulation-reports/test-report.json'); console.log(r.summary.total)"
  # Assert: Outputs a number (report is valid JSON)
  ```

  **Commit**: YES
  - Message: `feat(simulation): add JSON report generator with configurable output`
  - Files: `src/simulation/reporting/`

---

### Wave 3 - Integration

- [x] 4. Simulation Runner (Jest)

  **What to do**:
  - Create `src/simulation/runner/` directory
  - Implement `SimulationRunner` class:
    - `run(config: ISimulationConfig): ISimulationResult` - run single simulation
    - Orchestrates: create scenario → play turns → check invariants → collect metrics
  - Implement `BatchRunner` class:
    - `runBatch(count: number, baseConfig: ISimulationConfig): ISimulationMetrics[]`
    - Sequential execution (Jest handles parallelization at test level)
    - Progress callback for logging
  - Create Jest test suite `src/simulation/__tests__/simulation.test.ts`:
    - Use `test.each` for parameterized tests
    - Support `@RepeatedTest` pattern via `test.concurrent.each`
    - Environment variable for test count: `SIMULATION_COUNT=1000`
    - Timeout configuration for long-running tests
  - Implement turn loop:
    1. Check phase (Initiative → Movement → Attack → Heat → End)
    2. For each unit: call BotPlayer for decisions
    3. Apply events via existing `deriveState()`
    4. Run invariant checks after each event
    5. Check victory conditions
    6. Advance turn
  - Handle timeouts (max 100 turns per game)
  - Handle game completion (victory/defeat/draw)

  **Must NOT do**:
  - Use browser APIs
  - Import React components
  - Implement custom parallelization (let Jest handle it)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core orchestration logic, complex state management
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 8)
  - **Blocks**: Task 6, 10
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  
  **Pattern References**:
  - `E:\Projects\mekhq\MekHQ\unittests\mekhq\campaign\autoResolve\ResolverTest.java` - @RepeatedTest pattern for statistical validation
  - `src/utils/gameplay/gameSession.ts:createGameSession()` - Session creation
  - `src/utils/gameplay/gameState.ts:deriveState()` - State derivation
  
  **API/Type References**:
  - `src/types/gameplay/GameSessionInterfaces.ts:GamePhase` - Phase enum
  - `src/types/gameplay/GameSessionInterfaces.ts:IGameEvent` - Event types
  
  **Test References**:
  - `src/hooks/audit/__tests__/useReplayPlayer.test.ts` - Jest test patterns

  **Acceptance Criteria**:
  
  ```bash
  # Test single simulation
  bun test src/simulation/__tests__/simulationRunner.test.ts
  # Assert: run() completes without throwing
  # Assert: run() returns valid ISimulationResult
  # Assert: Invariants checked after each event
  
  # Test batch runner
  SIMULATION_COUNT=100 bun test src/simulation/__tests__/simulation.test.ts --runInBand
  # Assert: All 100 simulations complete
  # Assert: Total time <60 seconds
  # Assert: Memory usage <500MB
  
  # Performance test (1000 games)
  SIMULATION_COUNT=1000 bun test src/simulation/__tests__/simulation.test.ts --runInBand --testTimeout=600000
  # Assert: Completes within 10 minutes
  # Assert: Reports generated
  ```

  **Commit**: YES
  - Message: `feat(simulation): add simulation runner with Jest integration and batch support`
  - Files: `src/simulation/runner/`, `src/simulation/__tests__/simulation.test.ts`

---

- [x] 6. Snapshot/Replay Integration

  **What to do**:
  - Create `src/simulation/__snapshots__/failed/` directory (gitignored except structure)
  - Implement `SnapshotManager` class:
    - `saveFailedScenario(result: ISimulationResult, violation: IViolation): string` - returns filepath
    - File format: `{seed}_{timestamp}.json`
    - Contents: `{ seed, config, events, violation, finalState }`
  - Integrate with existing replay infrastructure:
    - Saved scenarios loadable via `useReplayPlayer({ events })`
    - Add `loadSnapshot(path: string): IGameSession` utility
  - Create snapshot cleanup script (delete old snapshots)
  - Add `.gitignore` entry for `src/simulation/__snapshots__/failed/*.json`
  - Keep directory structure in git (add `.gitkeep`)

  **Must NOT do**:
  - Build new replay UI
  - Store snapshots in database

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: File I/O and integration, straightforward
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 8)
  - **Blocks**: Task 10
  - **Blocked By**: Task 4

  **References**:
  
  **Pattern References**:
  - `src/hooks/audit/useReplayPlayer.ts` - Existing replay infrastructure
  - `src/hooks/audit/useEventTimeline.ts` - Event loading pattern
  
  **API/Type References**:
  - `src/types/events/BaseEventInterfaces.ts:IBaseEvent` - Event format
  - `src/simulation/runner/ISimulationResult` - Result with events

  **Acceptance Criteria**:
  
  ```bash
  # Test snapshot saving
  bun test src/simulation/__tests__/snapshotManager.test.ts
  # Assert: saveFailedScenario creates file with correct name format
  # Assert: File contains valid JSON with all required fields
  # Assert: loadSnapshot returns valid game session
  
  # Test replay integration
  bun test src/simulation/__tests__/snapshotReplay.test.ts
  # Assert: Loaded snapshot can be passed to useReplayPlayer
  # Assert: deriveState() on loaded events matches saved finalState
  
  # Verify gitignore
  cat .gitignore | grep "simulation/__snapshots__/failed"
  # Assert: Pattern found
  ```

  **Commit**: YES
  - Message: `feat(simulation): add snapshot manager with replay integration`
  - Files: `src/simulation/snapshot/`, `.gitignore` update

---

- [x] 8. Random Scenario Generator

  **What to do**:
  - Create `src/simulation/generator/` directory
  - Implement `ScenarioGenerator` class:
    - `generate(config: ISimulationConfig, random: SeededRandom): IGameSession`
    - Generate map: random radius (5-10 hexes), terrain distribution
    - Generate player forces: 1-4 units, weighted by tonnage class
    - Generate opponent forces: BV-matched to player
    - Random starting positions and facings
  - Use `WeightedTable<T>` for all random selections:
    - Unit tonnage class distribution
    - Terrain type distribution
    - Starting edge selection
  - Create preset configurations:
    - `LIGHT_SKIRMISH`: 2v2, small map
    - `STANDARD_LANCE`: 4v4, medium map
    - `STRESS_TEST`: 4v4, large map, many turns
  - Ensure generated scenarios are valid per `IGameSession` schema

  **Must NOT do**:
  - Implement physical attack scenarios
  - Generate scenarios requiring unimplemented features
  - Generate more than 4v4 initially

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex generation logic with many constraints
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 6)
  - **Blocks**: Task 10
  - **Blocked By**: Task 1

  **References**:
  
  **Pattern References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\againstTheBot\AtBConfiguration.java` - Force composition with weighted tables
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\atb\AtBScenarioFactory.java` - Scenario generation pattern
  - `src/lib/campaign/scenario/opForGeneration.ts` - Existing OpFor BV matching
  
  **API/Type References**:
  - `src/types/gameplay/GameSessionInterfaces.ts:IGameSession` - Session structure
  - `src/types/gameplay/HexGridInterfaces.ts:IHexGrid` - Grid structure
  - `src/types/encounter/EncounterInterfaces.ts` - Encounter configuration

  **Acceptance Criteria**:
  
  ```bash
  # Test scenario generation
  bun test src/simulation/__tests__/scenarioGenerator.test.ts
  # Assert: generate() produces valid IGameSession
  # Assert: Unit count per side matches config (1-4)
  # Assert: Map radius within bounds (5-10)
  # Assert: Same seed produces identical scenarios
  # Assert: Generation time <10ms per scenario
  
  # Test presets
  bun test src/simulation/__tests__/scenarioPresets.test.ts
  # Assert: LIGHT_SKIRMISH creates 2v2 scenario
  # Assert: STANDARD_LANCE creates 4v4 scenario
  # Assert: All presets produce valid sessions
  ```

  **Commit**: YES
  - Message: `feat(simulation): add random scenario generator with weighted selection and presets`
  - Files: `src/simulation/generator/`

---

### Final

- [x] 10. Integration Testing & Tuning

  **What to do**:
  - Create comprehensive integration test: `src/simulation/__tests__/integration.test.ts`
  - Test full pipeline: generate → run → collect metrics → save snapshots → generate report
  - Run statistical validation (1000+ games):
    - Verify win rate distribution (should be ~50% for balanced forces)
    - Verify no systematic violations
    - Verify reproducibility (same seed = same outcome)
  - Performance tuning:
    - Profile simulation bottlenecks
    - Optimize hot paths if needed
    - Target: 1000 games in <10 minutes
  - Create `scripts/run-simulation.js` CLI for manual batch runs:
    - `node scripts/run-simulation.js --count=1000 --seed=12345`
    - Outputs to `simulation-reports/`
  - Update package.json with script: `"simulate": "node scripts/run-simulation.js"`
  - Document usage in README or simulation module docs

  **Must NOT do**:
  - Optimize prematurely (profile first)
  - Add features beyond what's specified

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Comprehensive testing and tuning requires deep understanding
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (final task)
  - **Parallel Group**: Sequential (after all others)
  - **Blocks**: None (final)
  - **Blocked By**: All previous tasks

  **References**:
  
  **Pattern References**:
  - All previous tasks' test files
  - `E:\Projects\mekhq\MekHQ\unittests\mekhq\campaign\autoResolve\ResolverTest.java` - Statistical validation pattern
  
  **Test References**:
  - `jest.config.js` - Jest configuration
  - `package.json` - Scripts section

  **Acceptance Criteria**:
  
  ```bash
  # Run full integration test
  bun test src/simulation/__tests__/integration.test.ts --runInBand
  # Assert: All integration scenarios pass
  # Assert: Metrics collected correctly
  # Assert: Reports generated
  
  # Run 1000-game statistical validation
  SIMULATION_COUNT=1000 bun test src/simulation/__tests__/simulation.test.ts --runInBand --testTimeout=600000
  # Assert: Completes in <10 minutes
  # Assert: Win rate within 40-60% for balanced forces
  # Assert: <5% games have violations
  # Assert: All violations are reproducible with seed
  
  # Test CLI tool
  node scripts/run-simulation.js --count=10 --seed=12345
  # Assert: Exit code 0
  # Assert: Console shows "Completed 10 simulations"
  # Assert: Report file created in simulation-reports/
  
  # Verify reproducibility
  node scripts/run-simulation.js --count=1 --seed=99999 > /tmp/run1.txt
  node scripts/run-simulation.js --count=1 --seed=99999 > /tmp/run2.txt
  diff /tmp/run1.txt /tmp/run2.txt
  # Assert: No differences (deterministic)
  ```

  **Commit**: YES
  - Message: `feat(simulation): add integration tests, CLI runner, and statistical validation`
  - Files: `src/simulation/__tests__/integration.test.ts`, `scripts/run-simulation.js`, `package.json`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(simulation): add core infrastructure` | `src/simulation/core/` | `bun test src/simulation/__tests__/seededRandom.test.ts` |
| 3 | `feat(simulation): add invariant checker framework` | `src/simulation/invariants/` | `bun test src/simulation/__tests__/invariants.test.ts` |
| 9 | `docs(simulation): document known limitations` | `src/simulation/known-limitations.md` | `test -f src/simulation/known-limitations.md` |
| 2 | `feat(simulation): add valid move AI engine` | `src/simulation/ai/` | `bun test src/simulation/__tests__/moveAI.test.ts` |
| 5 | `feat(simulation): add metrics collector` | `src/simulation/metrics/` | `bun test src/simulation/__tests__/metricsCollector.test.ts` |
| 7 | `feat(simulation): add JSON report generator` | `src/simulation/reporting/` | `bun test src/simulation/__tests__/reportGenerator.test.ts` |
| 4 | `feat(simulation): add simulation runner` | `src/simulation/runner/` | `bun test src/simulation/__tests__/simulation.test.ts` |
| 6 | `feat(simulation): add snapshot manager` | `src/simulation/snapshot/` | `bun test src/simulation/__tests__/snapshotManager.test.ts` |
| 8 | `feat(simulation): add scenario generator` | `src/simulation/generator/` | `bun test src/simulation/__tests__/scenarioGenerator.test.ts` |
| 10 | `feat(simulation): add integration tests and CLI` | `scripts/`, `package.json` | `bun test src/simulation/` |

---

## Success Criteria

### Verification Commands
```bash
# All simulation tests pass
bun test src/simulation/ --coverage
# Expected: All tests pass, coverage ≥80%

# 1000 simulations complete in time
SIMULATION_COUNT=1000 bun test src/simulation/__tests__/simulation.test.ts --runInBand --testTimeout=600000
# Expected: Completes in <10 minutes

# CLI works
node scripts/run-simulation.js --count=10 --seed=12345
# Expected: Exit 0, report created

# Replay integration works
# (Load a saved snapshot in browser at /gameplay/games/[id]/replay)
```

### Final Checklist
- [x] All "Must Have" present (Seeded PRNG ✓, Invariant checkers ✓, Replay integration ✓, Jest runner ✓, JSON reports ✓)
- [x] All "Must NOT Have" absent (No smart AI ✓, No game engine mods ✓, No UI dashboard ✓, No physical attacks ✓, No component imports ✓)
- [x] All tests pass (349/349 tests passing across 17 test suites)
- [x] Coverage ≥80% for simulation module (89.56% statements, 92.95% lines)
- [x] 1000 simulations complete in <10 minutes (9.6 seconds actual - 62x faster than target)
- [x] Failed scenarios reproducible via seed (verified with SnapshotManager and seed-based replay)
- [x] JSON reports contain all specified metrics (timestamp, config, summary, metrics, violations, performance, failedSeeds)
