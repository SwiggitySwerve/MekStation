/**
 * Represents a detected simulation issue or unexpected behavior.
 * Anomalies are categorized by type and severity for filtering and alerting.
 *
 * @example
 * const heatSuicideAnomaly: IAnomaly = {
 *   id: 'anom-001',
 *   type: 'heat-suicide',
 *   severity: 'warning',
 *   battleId: 'battle-123',
 *   turn: 8,
 *   unitId: 'unit-001',
 *   message: 'Atlas AS7-D generated 35 heat (threshold: 30)',
 *   thresholdUsed: 30,
 *   actualValue: 35,
 *   configKey: 'heatSuicideThreshold',
 *   timestamp: Date.now()
 * };
 */
export interface IAnomaly {
  readonly id: string;
  readonly type: AnomalyType;
  readonly severity: 'critical' | 'warning' | 'info';
  readonly battleId: string;
  readonly turn: number | null;
  readonly unitId: string | null;
  readonly message: string;
  readonly thresholdUsed?: number;
  readonly actualValue?: number;
  readonly configKey?: string;
  readonly snapshot?: Record<string, unknown>;
  readonly timestamp: number;
}

/**
 * Types of anomalies that can be detected during simulation.
 * Organized by category: heat-related, behavior, state, and performance.
 */
export type AnomalyType =
  // Heat-related anomalies
  | 'heat-suicide'
  | 'heat-shutdown'
  // Behavior anomalies
  | 'passive-unit'
  | 'no-progress'
  | 'long-game'
  // State anomalies
  | 'state-cycle'
  | 'invariant-violation'
  // Performance anomalies
  | 'slow-turn'
  | 'memory-spike';
