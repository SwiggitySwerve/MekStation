/**
 * Configuration for anomaly detection thresholds.
 * Controls sensitivity of anomaly detection and snapshot behavior.
 *
 * @example
 * const thresholds: IAnomalyThresholds = {
 *   heatSuicideThreshold: 30,
 *   passiveUnitTurns: 5,
 *   noProgressTurns: 10,
 *   longGameTurns: 50,
 *   stateCycleRepeats: 3,
 *   autoSnapshot: {
 *     enabled: true,
 *     onCritical: true,
 *     onWarning: false,
 *     onInfo: false
 *   }
 * };
 */
export interface IAnomalyThresholds {
  readonly heatSuicideThreshold: number;
  readonly passiveUnitTurns: number;
  readonly noProgressTurns: number;
  readonly longGameTurns: number;
  readonly stateCycleRepeats: number;
  readonly autoSnapshot: {
    readonly enabled: boolean;
    readonly onCritical: boolean;
    readonly onWarning: boolean;
    readonly onInfo: boolean;
  };
}
