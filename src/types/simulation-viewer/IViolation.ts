export type ViolationSeverity = 'critical' | 'warning' | 'info';

export interface IViolation {
  readonly id: string;
  readonly type: string;
  readonly severity: ViolationSeverity;
  readonly message: string;
  readonly battleId: string;
  readonly timestamp: string;
}
