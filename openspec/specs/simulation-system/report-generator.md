# Report Generator Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-01
**Dependencies**: Metrics Collector
**Affects**: Analysis, Documentation

---

## Overview

### Purpose
Generates comprehensive JSON reports with simulation results, aggregate metrics, and violation details for analysis and documentation.

### Scope
**In Scope:**
- JSON report schema (ISimulationReport)
- ReportGenerator class
- File output to simulation-reports/
- Pretty-printing for readability
- Timestamp and metadata

**Out of Scope:**
- HTML report generation
- Visualization/charts
- Database storage
- Email notifications

---

## Requirements

### Requirement: Report Schema

The system SHALL generate reports with complete simulation data.

**Priority**: High

#### Scenario: Generate complete report
**GIVEN** completed batch of 100 simulations
**WHEN** calling generate()
**THEN** report SHALL include timestamp, config, summary, metrics, violations, performance, failedSeeds
**AND** summary SHALL include total, passed, failed, passRate
**AND** violations SHALL include seed, type, severity, message for each

---

## Data Model Requirements

```typescript
interface ISimulationReport {
  readonly timestamp: string; // ISO 8601
  readonly config: ISimulationConfig;
  readonly summary: {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
    readonly passRate: number; // 0-100
  };
  readonly metrics: IAggregateMetrics;
  readonly violations: Array<{
    readonly seed: number;
    readonly type: string;
    readonly severity: string;
    readonly message: string;
    readonly gameState?: object; // optional for debugging
  }>;
  readonly performance: {
    readonly totalDurationMs: number;
    readonly avgTurnMs: number;
    readonly peakMemoryMB?: number;
  };
  readonly failedSeeds: number[]; // for reproduction
}

interface IReportGenerator {
  readonly generate: (
    metrics: MetricsCollector,
    config: ISimulationConfig
  ) => ISimulationReport;

  readonly save: (report: ISimulationReport, path: string) => void;
}
```

---

## Examples

### Example: Generate and Save Report

```typescript
const generator = new ReportGenerator();
const report = generator.generate(metricsCollector, config);
generator.save(report, 'simulation-reports/report-2026-02-01T23-00-00.json');

// Report structure:
// {
//   "timestamp": "2026-02-01T23:00:00.000Z",
//   "summary": { "total": 100, "passed": 95, "failed": 5, "passRate": 95 },
//   "metrics": { "playerWins": 48, "opponentWins": 47, "draws": 0, ... },
//   "failedSeeds": [12, 45, 67, 89, 123]
// }
```

---

## References

- Metrics Collector Specification
- Core Infrastructure Specification

---

## Changelog

### Version 1.0 (2026-02-01)
- Initial specification
