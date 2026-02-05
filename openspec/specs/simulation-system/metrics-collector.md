# Metrics Collector Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-01
**Dependencies**: Core Infrastructure, Invariant Checkers
**Affects**: Report Generator, Statistical Analysis

---

## Overview

### Purpose

Collects per-game and aggregate metrics from simulation runs for analysis, reporting, and statistical validation.

### Scope

**In Scope:**

- Per-game metrics (ISimulationMetrics)
- Aggregate statistics (IAggregateMetrics)
- Win rate tracking
- Violation counting
- Duration tracking

**Out of Scope:**

- Visualization
- Database storage
- Real-time dashboards

---

## Requirements

### Requirement: Per-Game Metrics Collection

The system SHALL record detailed metrics for each simulation.

**Priority**: Critical

#### Scenario: Complete metrics capture

**GIVEN** completed simulation
**WHEN** recording metrics
**THEN** SHALL capture seed, winner, turns, duration, violations
**AND** SHALL capture unit counts (start/end for each side)
**AND** SHALL capture total damage dealt by each side

### Requirement: Aggregate Statistics

The system SHALL compute statistics across multiple simulations.

**Priority**: High

#### Scenario: Win rate calculation

**GIVEN** 100 simulations with 45 player wins, 50 opponent wins, 5 draws
**WHEN** computing aggregate metrics
**THEN** playerWins SHALL be 45
**AND** opponentWins SHALL be 50
**AND** draws SHALL be 5

---

## Data Model Requirements

```typescript
interface ISimulationMetrics {
  readonly seed: number;
  readonly winner: 'player' | 'opponent' | 'draw' | null;
  readonly turns: number;
  readonly durationMs: number;
  readonly violations: IViolation[];
  readonly playerUnitsStart: number;
  readonly playerUnitsEnd: number;
  readonly opponentUnitsStart: number;
  readonly opponentUnitsEnd: number;
  readonly totalDamageDealt: {
    readonly player: number;
    readonly opponent: number;
  };
}

interface IAggregateMetrics {
  readonly totalGames: number;
  readonly playerWins: number;
  readonly opponentWins: number;
  readonly draws: number;
  readonly avgTurns: number;
  readonly avgDurationMs: number;
  readonly violationsByType: Record<string, number>;
  readonly violationsBySeverity: {
    readonly critical: number;
    readonly warning: number;
  };
}
```

---

## References

- Core Infrastructure Specification
- Invariant Checkers Specification

---

## Changelog

### Version 1.0 (2026-02-01)

- Initial specification
