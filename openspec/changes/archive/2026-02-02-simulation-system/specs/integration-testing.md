# Integration Testing Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-01
**Dependencies**: All simulation components
**Affects**: Quality Assurance, CI/CD

---

## Overview

### Purpose
Validates complete simulation pipeline with comprehensive integration tests, statistical validation over 1000+ games, and performance profiling.

### Scope
**In Scope:**
- Full pipeline integration test
- Statistical validation (win rates, violation rates)
- Reproducibility verification
- Performance profiling
- CLI tool for manual batch runs
- Package.json script integration

**Out of Scope:**
- New feature development
- UI testing
- Network/API testing
- Load testing beyond 1000 games

---

## Requirements

### Requirement: Full Pipeline Validation

The system SHALL validate complete simulation pipeline end-to-end.

**Priority**: Critical

#### Scenario: Run 1000 simulations
**GIVEN** SIMULATION_COUNT=1000
**WHEN** running full test suite
**THEN** all 1000 simulations SHALL complete
**AND** completion time SHALL be <10 minutes
**AND** win rate SHALL be 40-60% for balanced forces
**AND** violation rate SHALL be <5%

#### Scenario: Reproducibility check
**GIVEN** same seed used twice
**WHEN** running simulation
**THEN** both runs SHALL produce identical results
**AND** winner SHALL be same
**AND** final state SHALL be identical

### Requirement: Statistical Validation

The system SHALL validate game balance through statistical analysis.

**Priority**: High

#### Scenario: Win rate distribution
**GIVEN** 1000 simulations with balanced forces
**WHEN** computing win rates
**THEN** player wins SHALL be 40-60%
**AND** opponent wins SHALL be 40-60%
**AND** draws SHALL be <10%

#### Scenario: Violation rate threshold
**GIVEN** 1000 simulations
**WHEN** counting violations
**THEN** critical violations SHALL be <5% of games
**AND** all violations SHALL be reproducible with seed

### Requirement: CLI Tool

The system SHALL provide command-line tool for manual batch runs.

**Priority**: Medium

#### Scenario: CLI execution
**GIVEN** command: node scripts/run-simulation.js --count=10 --seed=12345
**WHEN** executing
**THEN** 10 simulations SHALL run
**AND** console SHALL show progress
**AND** report SHALL be generated in simulation-reports/
**AND** exit code SHALL be 0 on success

---

## Data Model Requirements

```typescript
interface IIntegrationTestResult {
  readonly totalSimulations: number;
  readonly passRate: number; // 0-100
  readonly avgDurationMs: number;
  readonly violationRate: number; // 0-100
  readonly reproducibilityCheck: boolean;
  readonly winRateDistribution: {
    readonly player: number;
    readonly opponent: number;
    readonly draw: number;
  };
}
```

---

## Examples

### Example 1: Integration Test

```typescript
describe('Full Pipeline Integration', () => {
  test('generate → run → collect → report', async () => {
    // Generate scenario
    const generator = new ScenarioGenerator();
    const scenario = generator.generate(config, random);

    // Run simulation
    const runner = new SimulationRunner();
    const result = await runner.run(config);

    // Collect metrics
    const collector = new MetricsCollector();
    collector.recordGame(result);

    // Generate report
    const reportGen = new ReportGenerator();
    const report = reportGen.generate(collector, config);

    // Assertions
    expect(result.winner).not.toBeNull();
    expect(report.summary.total).toBe(1);
  });
});
```

### Example 2: CLI Tool

```bash
# Run 1000 simulations
node scripts/run-simulation.js --count=1000 --seed=12345

# Output:
# Running 1000 simulations...
# Progress: 100/1000 (10%)
# Progress: 200/1000 (20%)
# ...
# Completed 1000 simulations in 8m 32s
# Pass rate: 95%
# Report saved to: simulation-reports/report-2026-02-01T23-00-00.json
```

---

## References

- All simulation specifications
- Jest configuration: jest.config.js
- Package.json scripts

---

## Changelog

### Version 1.0 (2026-02-01)
- Initial specification
- Defined integration test requirements
- Specified CLI tool interface
