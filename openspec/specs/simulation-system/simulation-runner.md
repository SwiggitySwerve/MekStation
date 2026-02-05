# Simulation Runner Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-01
**Dependencies**: Core Infrastructure, Valid Move AI, Invariant Checkers
**Affects**: Integration Tests, CLI Tools

---

## Overview

### Purpose

Orchestrates single and batch simulation execution with Jest integration, turn loop management, and invariant checking after each event.

### Scope

**In Scope:**

- SimulationRunner (single game)
- BatchRunner (multiple games)
- TurnLoop (phase execution)
- Jest test integration
- Progress callbacks
- Timeout handling

**Out of Scope:**

- UI progress display
- Parallel execution (Jest handles)
- Custom test frameworks

### Key Concepts

- **Turn Loop**: Executes phases in order (Initiative → Movement → Attack → Heat → End)
- **Event Application**: Uses existing deriveState() to apply events
- **Invariant Checking**: Runs after each event application
- **Victory Conditions**: Checks after each turn for game end

---

## Requirements

### Requirement: Single Simulation Execution

The system SHALL run complete simulation from start to finish.

**Priority**: Critical

#### Scenario: Complete simulation

**GIVEN** valid ISimulationConfig
**WHEN** calling SimulationRunner.run()
**THEN** simulation SHALL execute until victory or timeout
**AND** result SHALL include all events, final state, violations

#### Scenario: Timeout handling

**GIVEN** simulation exceeding turnLimit
**WHEN** turn limit reached
**THEN** simulation SHALL terminate gracefully
**AND** winner SHALL be null
**AND** result SHALL include all events up to timeout

### Requirement: Turn Loop Execution

The system SHALL execute phases in correct order each turn.

**Priority**: Critical

#### Scenario: Phase sequence

**GIVEN** a turn in progress
**WHEN** executing TurnLoop
**THEN** phases SHALL execute: Initiative → Movement → Attack → Heat → End
**AND** invariants SHALL be checked after each event
**AND** state SHALL be derived after each event

### Requirement: Batch Execution

The system SHALL run multiple simulations sequentially.

**Priority**: High

#### Scenario: Batch run

**GIVEN** BatchRunner with count=100
**WHEN** calling runBatch()
**THEN** 100 simulations SHALL execute sequentially
**AND** each SHALL use incremented seed
**AND** progress callback SHALL be called after each

### Requirement: Jest Integration

The system SHALL integrate with Jest test framework.

**Priority**: High

#### Scenario: Parameterized tests

**GIVEN** SIMULATION_COUNT environment variable
**WHEN** running Jest test suite
**THEN** test.each SHALL run SIMULATION_COUNT iterations
**AND** each SHALL use unique seed
**AND** failures SHALL report seed for reproduction

---

## Data Model Requirements

```typescript
interface ISimulationRunner {
  readonly run: (config: ISimulationConfig) => Promise<ISimulationResult>;
}

interface IBatchRunner {
  readonly runBatch: (
    count: number,
    baseConfig: ISimulationConfig,
    onProgress?: (completed: number, total: number) => void,
  ) => Promise<ISimulationMetrics[]>;
}

interface ITurnLoop {
  readonly executeTurn: (
    state: IGameState,
    botPlayer: IBotPlayer,
    invariants: IInvariantRunner,
  ) => Promise<{
    events: IBaseEvent[];
    violations: IViolation[];
    newState: IGameState;
  }>;
}
```

---

## Examples

### Example: Jest Integration

```typescript
describe('Simulation System', () => {
  const count = parseInt(process.env.SIMULATION_COUNT || '10');

  test.each(Array.from({ length: count }, (_, i) => ({ seed: i + 1 })))(
    'simulation with seed $seed',
    async ({ seed }) => {
      const config: ISimulationConfig = {
        seed,
        turnLimit: 100,
        unitCount: 4,
        mapRadius: 8,
      };

      const runner = new SimulationRunner();
      const result = await runner.run(config);

      expect(result.winner).not.toBeNull();
      expect(
        result.violations.filter((v) => v.severity === 'critical'),
      ).toHaveLength(0);
    },
  );
});
```

---

## References

- Core Infrastructure Specification
- Valid Move AI Specification
- Invariant Checkers Specification

---

## Changelog

### Version 1.0 (2026-02-01)

- Initial specification
