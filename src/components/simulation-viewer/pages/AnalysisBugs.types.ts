import type { IViolation } from '@/types/simulation-viewer/IViolation';

export type InvariantStatus = 'pass' | 'fail';

export type Severity = 'critical' | 'warning' | 'info';

export type DetectorType =
  | 'heat-suicide'
  | 'passive-unit'
  | 'no-progress'
  | 'long-game'
  | 'state-cycle';

export type SortDirection = 'asc' | 'desc';

export type ViolationSortKey = 'severity' | 'timestamp';

export interface IInvariant {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: InvariantStatus;
  readonly lastChecked: string;
  readonly failureCount: number;
}

export interface IPageAnomaly {
  readonly id: string;
  readonly detector: DetectorType;
  readonly severity: Severity;
  readonly title: string;
  readonly description: string;
  readonly battleId: string;
  readonly snapshotId: string;
  readonly timestamp: string;
  readonly dismissed: boolean;
}

export interface IThresholds {
  readonly heatSuicide: number;
  readonly passiveUnit: number;
  readonly noProgress: number;
  readonly longGame: number;
  readonly stateCycle: number;
}

export interface IAnalysisBugsProps {
  readonly campaignId: string;
  readonly invariants: IInvariant[];
  readonly anomalies: IPageAnomaly[];
  readonly violations: IViolation[];
  readonly thresholds: IThresholds;
  readonly onThresholdChange?: (detector: string, value: number) => void;
  readonly onDismissAnomaly?: (anomalyId: string) => void;
  readonly onViewSnapshot?: (snapshotId: string) => void;
  readonly onViewBattle?: (battleId: string) => void;
  readonly onConfigureThreshold?: (detector: string) => void;
  readonly onViewInvariant?: (invariantId: string) => void;
}
