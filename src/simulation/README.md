# Simulation System

Autonomous game simulation for property-based fuzz testing of the MekStation game engine.

## Quick Start

```bash
npm run simulate

npm run simulate:batch

node scripts/run-simulation.ts --count=50 --seed=12345
```

## CLI Usage

```bash
npx tsx scripts/run-simulation.ts [options]

Options:
  --count=N     Number of simulations to run (default: 10)
  --seed=N      Base random seed (default: current timestamp)
  --preset=P    Scenario preset: standard, light, stress (default: standard)
  --output=DIR  Output directory for reports (default: simulation-reports)
  --help, -h    Show this help message

Examples:
  npx tsx scripts/run-simulation.ts --count=100 --seed=12345
  npx tsx scripts/run-simulation.ts --preset=light --count=50
  npx tsx scripts/run-simulation.ts --count=1000 --output=./reports
```

## Architecture

```
src/simulation/
├── core/                    # Core infrastructure
│   ├── SeededRandom.ts      # Mulberry32 PRNG
│   ├── WeightedTable.ts     # Weighted random selection
│   └── types.ts             # ISimulationConfig, ISimulationResult
├── ai/                      # AI decision engine
│   ├── MoveAI.ts            # Movement decisions
│   ├── AttackAI.ts          # Target/weapon selection
│   └── BotPlayer.ts         # Orchestrates AI turns
├── invariants/              # Bug detection
│   ├── checkers.ts          # 7 invariant functions
│   └── InvariantRunner.ts   # Runs registered invariants
├── runner/                  # Simulation execution
│   ├── SimulationRunner.ts  # Single game loop
│   └── BatchRunner.ts       # Batch execution
├── metrics/                 # Statistics collection
│   ├── MetricsCollector.ts  # Records game outcomes
│   └── types.ts             # ISimulationMetrics, IAggregateMetrics
├── reporting/               # Output generation
│   └── ReportGenerator.ts   # JSON report creation
├── snapshot/                # Failure persistence
│   └── SnapshotManager.ts   # Save/load failed scenarios
├── generator/               # Scenario creation
│   ├── ScenarioGenerator.ts # Random scenario generation
│   ├── templates.ts         # Unit templates (Light-Assault)
│   └── presets.ts           # LIGHT_SKIRMISH, STANDARD_LANCE, STRESS_TEST
└── __tests__/               # Test suites
    └── integration.test.ts  # Full pipeline tests
```

### Component Overview

| Component | Purpose |
|-----------|---------|
| **SeededRandom** | Deterministic PRNG (Mulberry32) for reproducible simulations |
| **WeightedTable** | Weighted random selection for unit/terrain generation |
| **BotPlayer** | AI that makes valid moves for both sides |
| **InvariantRunner** | Detects game state violations (bugs) |
| **SimulationRunner** | Executes single game with turn loop |
| **BatchRunner** | Runs multiple simulations sequentially |
| **MetricsCollector** | Tracks win rates, turn counts, violations |
| **ReportGenerator** | Creates JSON reports for analysis |
| **SnapshotManager** | Saves failed scenarios for debugging |
| **ScenarioGenerator** | Creates random valid starting positions |

## Running Tests

```bash
npm test src/simulation/__tests__/integration.test.ts

SIMULATION_COUNT=100 npm test src/simulation/__tests__/integration.test.ts

npm test src/simulation/
```

## Configuration Presets

| Preset | Units | Turns | Map | Use Case |
|--------|-------|-------|-----|----------|
| `light` | 2v2 | 10 | R5 | Quick smoke tests |
| `standard` | 4v4 | 20 | R7 | Normal testing |
| `stress` | 4v4 | 50 | R10 | Load/performance testing |

## Reproducibility

Every simulation is deterministic when given the same seed:

```bash
npx tsx scripts/run-simulation.ts --count=1 --seed=99999 > run1.txt
npx tsx scripts/run-simulation.ts --count=1 --seed=99999 > run2.txt
diff run1.txt run2.txt
```

## Reports

Reports are JSON files saved to `simulation-reports/`:

```json
{
  "timestamp": "2026-02-02T...",
  "generatedBy": "MekStation Simulation System v0.1.0",
  "config": { "seed": 12345, "turnLimit": 20, ... },
  "summary": { "total": 100, "passed": 98, "failed": 2, "passRate": 98.0 },
  "metrics": { "playerWinRate": 52.3, "avgTurns": 8.5, ... },
  "violations": [ ... ],
  "failedSeeds": [12347, 12389]
}
```

## Snapshots

Failed scenarios are saved to `src/simulation/__snapshots__/failed/` for debugging:

```
{seed}_{timestamp}.json
```

Each snapshot contains:
- Seed and configuration
- All game events
- Violations detected
- Timestamp

## Performance Targets

| Metric | Target | Measured |
|--------|--------|----------|
| 100 games | <60s | ~5s |
| Per game | <600ms | ~50ms |
| Scenario gen | <50ms | <5ms |

## Invariant Checks

Currently validated:

1. **Unit Position Uniqueness** - No two units on same hex
2. **Heat Non-Negative** - Heat values >= 0
3. **Armor Bounds** - Armor/structure values >= 0
4. **Destroyed Units Stay Destroyed** - No resurrection
5. **Phase Transitions** - Valid phase order
6. **Sequence Monotonicity** - Event sequences increase
7. **Turn Non-Decreasing** - Turn numbers don't decrease

## Known Limitations

See `known-limitations.md` for documented incomplete features that are excluded from violation reports.

## Development

### Adding New Invariants

```typescript
import { IGameState, IViolation } from './types';

export function checkMyInvariant(
  state: IGameState,
  previousState?: IGameState
): IViolation[] {
  const violations: IViolation[] = [];
  // Check logic here
  return violations;
}
```

Register in `InvariantRunner`:

```typescript
runner.register({
  name: 'my_invariant',
  description: 'What this checks',
  severity: 'critical',
  check: checkMyInvariant,
});
```

### Adding Unit Templates

Edit `generator/templates.ts`:

```typescript
export const UNIT_TEMPLATES: IUnitTemplate[] = [
  {
    name: 'New Mech',
    weight: 50,
    walkMP: 5,
    jumpMP: 3,
    armor: { head: 9, center_torso: 25, ... },
    structure: { head: 3, center_torso: 16, ... },
    weapons: [ ... ],
  },
  // ...
];
```
