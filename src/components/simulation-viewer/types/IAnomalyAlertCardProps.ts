import type { IAnomaly } from '@/types/simulation-viewer';

/**
 * Props for Anomaly Alert Card component displaying detected simulation issues.
 * Provides actions for viewing snapshots, battles, and configuring thresholds.
 *
 * @example
 * const props: IAnomalyAlertCardProps = {
 *   anomaly: {
 *     id: 'anom-001',
 *     type: 'heat-suicide',
 *     severity: 'warning',
 *     battleId: 'battle-123',
 *     turn: 8,
 *     unitId: 'unit-001',
 *     message: 'Atlas AS7-D generated 35 heat (threshold: 30)',
 *     thresholdUsed: 30,
 *     actualValue: 35,
 *     configKey: 'heatSuicideThreshold',
 *     timestamp: Date.now()
 *   },
 *   onViewSnapshot: (anomaly) => logger.debug('View snapshot'),
 *   onViewBattle: (battleId) => logger.debug('View battle'),
 *   onConfigureThreshold: (configKey) => logger.debug('Configure'),
 *   onDismiss: (anomalyId) => logger.debug('Dismiss')
 * };
 */
export interface IAnomalyAlertCardProps {
  readonly anomaly: IAnomaly;
  readonly onViewSnapshot?: (anomaly: IAnomaly) => void;
  readonly onViewBattle?: (battleId: string) => void;
  readonly onConfigureThreshold?: (configKey: string) => void;
  readonly onDismiss?: (anomalyId: string) => void;
  readonly className?: string;
}
