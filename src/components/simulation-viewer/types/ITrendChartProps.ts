/**
 * Props for Trend Chart component displaying time-series data.
 * Supports multiple time ranges and optional threshold visualization.
 *
 * @example
 * const props: ITrendChartProps = {
 *   data: [
 *     { date: '2026-01-26', value: 1000000 },
 *     { date: '2026-01-27', value: 1020000 }
 *   ],
 *   timeRange: '7d',
 *   timeRangeOptions: ['7d', '30d', '90d'],
 *   onTimeRangeChange: (range) => console.log('Range:', range),
 *   threshold: 900000,
 *   thresholdLabel: 'Minimum Balance',
 *   height: 300
 * };
 */
export interface ITrendChartProps {
  readonly data: ITrendDataPoint[];
  readonly timeRange?: string;
  readonly timeRangeOptions?: string[];
  readonly onTimeRangeChange?: (range: string) => void;
  readonly threshold?: number;
  readonly thresholdLabel?: string;
  readonly height?: number;
  readonly className?: string;
}

/**
 * Single data point in a trend chart.
 *
 * @example
 * const point: ITrendDataPoint = {
 *   date: '2026-01-26',
 *   value: 1000000
 * };
 */
export interface ITrendDataPoint {
  readonly date: string;
  readonly value: number;
}
