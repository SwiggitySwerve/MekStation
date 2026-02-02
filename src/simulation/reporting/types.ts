import { ISimulationConfig } from '../core/types';
import { IAggregateMetrics } from '../metrics/types';

export interface IReportViolation {
  readonly seed: number;
  readonly turn: number;
  readonly type: string;
  readonly severity: 'critical' | 'warning';
  readonly message: string;
  readonly context?: object;
}

export interface ISimulationReport {
  readonly timestamp: string;
  readonly generatedBy: string;
  readonly config: ISimulationConfig;
  
  readonly summary: {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
    readonly passRate: number;
  };
  
  readonly metrics: IAggregateMetrics;
  
  readonly violations: readonly IReportViolation[];
  readonly violationCount: number;
  
  readonly performance: {
    readonly totalDurationMs: number;
    readonly avgGameMs: number;
    readonly avgTurnMs: number;
    readonly peakMemoryMB?: number;
  };
  
  readonly failedSeeds: readonly number[];
}
