# Design: Simulation System Architecture

## Overview

This document details the technical design for the autonomous game simulation system.

## Module Structure

```
src/simulation/
├── core/
│   ├── SeededRandom.ts          # Mulberry32 PRNG implementation
│   ├── WeightedTable.ts         # Weighted random selection
│   ├── SimulationContext.ts     # Holds seed, config, state
│   ├── types.ts                 # ISimulationConfig, ISimulationResult
│   └── knownLimitations.ts      # Programmatic exclusion list
│
├── ai/
│   ├── MoveAI.ts                # Movement decision logic
│   ├── AttackAI.ts              # Target selection and weapon allocation
│   ├── BotPlayer.ts             # Orchestrates AI for one side
│   └── BotBehavior.ts           # IBotBehavior interface
│
├── invariants/
│   ├── InvariantRunner.ts       # Runs all invariants, collects violations
│   ├── types.ts                 # IInvariant, IViolation interfaces
│   ├── positionInvariants.ts    # Position uniqueness checker
│   ├── heatInvariants.ts        # Heat bounds checker
│   ├── armorInvariants.ts       # Armor/structure bounds
│   ├── destroyedInvariants.ts   # Destroyed units stay destroyed
│   ├── phaseInvariants.ts       # Phase transition validation
│   ├── sequenceInvariants.ts    # Sequence monotonicity
│   └── turnInvariants.ts        # Turn number validation
│
├── runner/
│   ├── SimulationRunner.ts      # Single simulation orchestration
│   ├── BatchRunner.ts           # Batch execution with progress
│   └── TurnLoop.ts              # Turn phase execution logic
│
├── metrics/
│   ├── MetricsCollector.ts      # Per-game and aggregate metrics
│   └── types.ts                 # ISimulationMetrics, IAggregateMetrics
│
├── snapshot/
│   ├── SnapshotManager.ts       # Save/load failed scenarios
│   └── types.ts                 # Snapshot format
│
├── generator/
│   ├── ScenarioGenerator.ts     # Random scenario creation
│   ├── presets.ts               # LIGHT_SKIRMISH, STANDARD_LANCE
│   └── forceComposition.ts      # Unit selection and BV matching
│
├── reporting/
│   ├── ReportGenerator.ts       # JSON report creation
│   └── types.ts                 # ISimulationReport schema
│
├── __tests__/
│   ├── seededRandom.test.ts
│   ├── weightedTable.test.ts
│   ├── moveAI.test.ts
│   ├── attackAI.test.ts
│   ├── botPlayer.test.ts
│   ├── invariants.test.ts
│   ├── invariantRunner.test.ts
│   ├── simulationRunner.test.ts
│   ├── simulation.test.ts       # Main test suite (1000+ runs)
│   ├── metricsCollector.test.ts
│   ├── reportGenerator.test.ts
│   ├── snapshotManager.test.ts
│   ├── snapshotReplay.test.ts
│   ├── scenarioGenerator.test.ts
│   ├── scenarioPresets.test.ts
│   ├── integration.test.ts      # Full pipeline test
│   └── knownLimitations.test.ts
│
├── __snapshots__/
│   └── failed/                  # Failed scenario dumps (gitignored)
│       └── .gitkeep
│
└── known-limitations.md         # Documentation of exclusions
```

## Core Types

### Configuration
```typescript
interface ISimulationConfig {
  seed: number;              // PRNG seed for reproducibility
  turnLimit: number;         // Max turns before timeout (default: 100)
  unitCount: number;         // Units per side (1-4)
  mapRadius: number;         // Hex map radius (5-10)
  preset?: 'light-skirmish' | 'standard-lance' | 'stress-test';
}
```

### Results
```typescript
interface ISimulationResult {
  seed: number;
  config: ISimulationConfig;
  winner: 'player' | 'opponent' | 'draw' | null;
  turns: number;
  durationMs: number;
  events: IBaseEvent[];      // Full event history
  finalState: IGameState;
  violations: IViolation[];
  metrics: ISimulationMetrics;
}
```

### Invariants
```typescript
interface IInvariant {
  name: string;
  severity: 'critical' | 'warning';
  check: (state: IGameState) => IViolation[];
}

interface IViolation {
  invariant: string;
  severity: 'critical' | 'warning';
  message: string;
  context: {
    turn?: number;
    phase?: GamePhase;
    sequence?: number;
    unitId?: string;
    [key: string]: any;
  };
}
```

### Bot Behavior
```typescript
interface IBotBehavior {
  retreatThreshold: number;  // 0-1, health percentage to retreat
  retreatEdge: 'nearest' | 'north' | 'south' | 'east' | 'west' | 'none';
}
```

## Key Algorithms

### 1. Seeded Random (Mulberry32)

```typescript
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // Utility methods
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  roll2d6(): number {
    return this.nextInt(1, 6) + this.nextInt(1, 6);
  }
}
```

### 2. Weighted Selection

```typescript
class WeightedTable<T> {
  private weights: number[] = [];
  private values: T[] = [];

  add(weight: number, value: T): void {
    this.weights.push(weight);
    this.values.push(value);
  }

  select(random: SeededRandom, rollMod: number = 0): T | null {
    const total = this.weights.reduce((a, b) => a + b, 0);
    let roll = Math.min(
      Math.floor(random.next() * total + total * rollMod + 0.5),
      total - 1
    );
    
    for (let i = 0; i < this.weights.length; i++) {
      if (roll < this.weights[i]) return this.values[i];
      roll -= this.weights[i];
    }
    return null;
  }
}
```

### 3. Turn Loop

```typescript
class TurnLoop {
  async executeTurn(
    state: IGameState,
    botPlayer: BotPlayer,
    invariants: InvariantRunner
  ): Promise<{ events: IBaseEvent[], violations: IViolation[] }> {
    const events: IBaseEvent[] = [];
    const violations: IViolation[] = [];

    // Phase 1: Initiative
    const initiativeEvent = this.rollInitiative(state);
    events.push(initiativeEvent);
    state = deriveState(state, [initiativeEvent], gameReducers);
    violations.push(...invariants.check(state));

    // Phase 2: Movement
    const moveOrder = this.determineMoveOrder(state);
    for (const unitId of moveOrder) {
      const moveEvent = botPlayer.planMovement(unitId, state);
      if (moveEvent) {
        events.push(moveEvent);
        state = deriveState(state, [moveEvent], gameReducers);
        violations.push(...invariants.check(state));
      }
    }

    // Phase 3: Weapon Attacks
    for (const unitId of this.getUnitsInPhase(state, GamePhase.WeaponAttack)) {
      const attackEvents = botPlayer.planAttacks(unitId, state);
      events.push(...attackEvents);
      for (const event of attackEvents) {
        state = deriveState(state, [event], gameReducers);
        violations.push(...invariants.check(state));
      }
    }

    // Phase 4: Heat
    const heatEvent = this.processHeat(state);
    events.push(heatEvent);
    state = deriveState(state, [heatEvent], gameReducers);
    violations.push(...invariants.check(state));

    // Phase 5: End
    const endEvent = this.endTurn(state);
    events.push(endEvent);
    state = deriveState(state, [endEvent], gameReducers);
    violations.push(...invariants.check(state));

    return { events, violations };
  }
}
```

### 4. Valid Move Selection

```typescript
class MoveAI {
  getValidMoves(unit: IGameUnit, state: IGameState): IMove[] {
    // Use existing getValidDestinations from movement.ts
    const destinations = getValidDestinations(
      unit.position.coord,
      unit.movement.walkMP,
      state.hexGrid
    );

    return destinations.map(coord => ({
      unitId: unit.id,
      destination: coord,
      movementType: this.selectMovementType(unit, coord),
      facing: this.selectFacing(coord)
    }));
  }

  selectMove(moves: IMove[], random: SeededRandom): IMove {
    // Random selection from valid moves
    const index = random.nextInt(0, moves.length - 1);
    return moves[index];
  }
}
```

### 5. Invariant Checking

```typescript
class InvariantRunner {
  private invariants: IInvariant[] = [
    positionUniqueness,
    heatNonNegative,
    armorBounds,
    destroyedStayDestroyed,
    phaseTransitions,
    sequenceMonotonicity,
    turnNonDecreasing
  ];

  check(state: IGameState): IViolation[] {
    const violations: IViolation[] = [];
    
    for (const invariant of this.invariants) {
      const result = invariant.check(state);
      violations.push(...result);
    }

    return this.filterKnownLimitations(violations);
  }

  private filterKnownLimitations(violations: IViolation[]): IViolation[] {
    return violations.filter(v => !isKnownLimitation(v));
  }
}
```

## Integration Points

### Jest Integration

```typescript
// src/simulation/__tests__/simulation.test.ts
describe('Simulation System', () => {
  const simulationCount = parseInt(process.env.SIMULATION_COUNT || '10');

  test.each(
    Array.from({ length: simulationCount }, (_, i) => ({ seed: i + 1 }))
  )('simulation with seed $seed', async ({ seed }) => {
    const config: ISimulationConfig = {
      seed,
      turnLimit: 100,
      unitCount: 4,
      mapRadius: 8
    };

    const runner = new SimulationRunner();
    const result = await runner.run(config);

    // Assertions
    expect(result.winner).not.toBeNull();
    expect(result.violations.filter(v => v.severity === 'critical')).toHaveLength(0);
    expect(result.turns).toBeLessThanOrEqual(config.turnLimit);
  });
});
```

### Replay Integration

```typescript
// Load failed scenario in replay UI
function loadFailedScenario(snapshotPath: string) {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  
  // Use existing replay infrastructure
  const { events, config } = snapshot;
  return {
    gameId: `sim-${config.seed}`,
    events,
    initialState: createInitialGameState(config)
  };
}
```

### CLI Integration

```typescript
// scripts/run-simulation.js
const { program } = require('commander');

program
  .option('-c, --count <number>', 'Number of simulations', '100')
  .option('-s, --seed <number>', 'Starting seed', Date.now().toString())
  .option('-o, --output <path>', 'Report output path', 'simulation-reports/')
  .parse();

const options = program.opts();
const runner = new BatchRunner();

const results = await runner.runBatch(
  parseInt(options.count),
  {
    seed: parseInt(options.seed),
    turnLimit: 100,
    unitCount: 4,
    mapRadius: 8
  }
);

const report = reportGenerator.generate(results);
reportGenerator.save(report, options.output);

console.log(`Completed ${results.length} simulations`);
console.log(`Pass rate: ${report.summary.passRate}%`);
```

## Performance Considerations

### Target Metrics
- **Per Turn**: <100ms (including invariant checks)
- **Per Game**: <10s (100 turns)
- **Batch (1000)**: <10 minutes (600s)
- **Memory**: <500MB for batch of 100

### Optimization Strategies
1. **Checkpoint State**: Create snapshots every N turns to speed up replay
2. **Lazy Invariants**: Only check invariants that could be violated by last event
3. **Parallel Jest**: Let Jest run tests in parallel (`--maxWorkers`)
4. **Event Batching**: Apply multiple events before checking invariants (risky)

### Profiling Plan
```bash
# Profile single simulation
node --prof scripts/run-simulation.js --count=1

# Profile batch
node --prof scripts/run-simulation.js --count=100

# Analyze
node --prof-process isolate-*.log > profile.txt
```

## Error Handling

### Categories
1. **Configuration Errors**: Invalid seed, out-of-range parameters
2. **Generation Errors**: Failed to create valid scenario
3. **Runtime Errors**: Crash during simulation
4. **Assertion Errors**: Invariant violation detected

### Strategy
```typescript
try {
  const result = runner.run(config);
} catch (error) {
  if (error instanceof ConfigurationError) {
    // Log and skip
  } else if (error instanceof SimulationError) {
    // Save crash dump with stack trace
    snapshotManager.saveCrash(config, error);
  } else {
    // Unknown error - re-throw
    throw error;
  }
}
```

## Testing Strategy

### Unit Tests (Per Component)
- Test each component in isolation with mocked dependencies
- Use test factories for creating test data
- Coverage target: 80%+

### Integration Tests
- Test full pipeline: generate → run → collect → report
- Use small scenarios (2v2) for speed
- Verify reproducibility with same seed

### Statistical Validation
- Run 1000+ simulations with balanced forces
- Assert win rate within 40-60%
- Assert violation rate <5%
- Assert no systematic biases

### Regression Tests
- Save known-good scenarios
- Re-run after code changes
- Assert outcomes match (deterministic)

## Security Considerations

None - this is an internal testing tool with no external inputs or network access.

## Future Enhancements

### Phase 2 (Not in Initial Scope)
- Smart AI behaviors (aggressive, defensive, balanced)
- Campaign-level simulation
- Multi-game scenarios (back-to-back battles)
- Performance optimization (parallel execution)
- Machine learning from simulation data

### Phase 3 (Research)
- Genetic algorithms for unit composition optimization
- Reinforcement learning for AI training
- Scenario difficulty calibration
- Dynamic balancing recommendations
