/**
 * Props for KPI Card component displaying key performance indicators.
 * Shows a metric value with optional comparison and trend visualization.
 *
 * @example
 * const props: IKPICardProps = {
 *   label: 'Win Rate',
 *   value: '80%',
 *   comparison: '+5%',
 *   comparisonDirection: 'up',
 *   trend: [0.75, 0.76, 0.78, 0.80],
 *   onClick: () => console.log('KPI clicked')
 * };
 */
export interface IKPICardProps {
  readonly label: string;
  readonly value: number | string;
  readonly comparison?: string;
  readonly comparisonDirection?: 'up' | 'down' | 'neutral';
  readonly trend?: number[];
  readonly onClick?: () => void;
  readonly className?: string;
}
